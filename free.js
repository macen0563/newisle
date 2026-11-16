(() => {
  'use strict';

  // Module-scoped flags
  let suppressClick = false;
  let clickBound = false;
  let fitScale = 1; // 小窗口等比缩放系数（仅显示，cv 坐标不变）

  // Quick safety checks
  function hasNT() {
    return window.NT && window.NT.state && typeof window.NT.saveState === 'function';
  }

  function getCurrentDesktop() {
    if (!hasNT()) return null;
    const state = window.NT.state;
    return state.desktops.find(d => d.id === state.activeDesktop) || null;
  }

  function getElements() {
    return {
      gridWrap: document.getElementById('gridWrap'),
      grid: document.getElementById('grid'),
      iconGrid: document.getElementById('iconGrid'),
      freeLayer: document.getElementById('freeLayer')
    };
  }

  // Destroy widgets inside freeLayer
  function destroyFreeLayerWidgets(freeLayer) {
    if (!freeLayer) return;
    const cards = freeLayer.querySelectorAll('.widget-card');
    cards.forEach(card => {
      const kind = card.dataset.kind;
      if (kind && window.WIDGETS && window.WIDGETS[kind] && typeof window.WIDGETS[kind].destroy === 'function') {
        try {
          window.WIDGETS[kind].destroy(card);
        } catch (e) {
          // swallow
        }
      }
    });
  }

  // Rect overlap without inset (for free spot search and grid overlap)
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  // Rect overlap with optional inset (for drag/resize)
  function rectsOverlapInset(a, b, inset = 6) {
    const ax = a.x + inset;
    const ay = a.y + inset;
    const aw = Math.max(0, a.w - 2 * inset);
    const ah = Math.max(0, a.h - 2 * inset);
    const bx = b.x + inset;
    const by = b.y + inset;
    const bw = Math.max(0, b.w - 2 * inset);
    const bh = Math.max(0, b.h - 2 * inset);
    return ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;
  }

  // Find first free spot within layer width, stepping 20px
  function findFreeSpot(w, h, placedRects, layerW) {
    const step = 20;
    const maxX = Math.max(0, layerW - w);
    for (let y = 0; y <= 10000; y += step) {
      for (let x = 0; x <= maxX; x += step) {
        const candidate = { x, y, w, h };
        const overlap = placedRects.some(r => rectsOverlap(candidate, r));
        if (!overlap) {
          return { x, y };
        }
      }
    }
    // fallback (should never be reached)
    return { x: 0, y: 0 };
  }

  // Capture current grid positions into item.cv
  function captureFromGrid() {
    if (!hasNT()) return;
    const state = window.NT.state;
    const desktop = getCurrentDesktop();
    if (!desktop) return;
    const { gridWrap, grid, iconGrid } = getElements();
    if (!gridWrap || !grid || !iconGrid) return;
    const wrapRect = gridWrap.getBoundingClientRect();

    const captureCell = (cell) => {
      const id = cell.dataset.id;
      if (!id) return;
      const item = state.items.find(i => i.id === id && i.desktopId === desktop.id);
      if (!item) return;
      const rect = cell.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      item.cv = {
        x: Math.round((rect.left - wrapRect.left) / 20) * 20,
        y: Math.round((rect.top - wrapRect.top) / 20) * 20,
        w: Math.round(rect.width),
        h: Math.round(rect.height)
      };
    };

    grid.querySelectorAll('.cell-widget').forEach(captureCell);
    iconGrid.querySelectorAll('.cell').forEach(captureCell);
  }

  // Attach drag behavior to a free element
  function attachDrag(el, item) {
    if (!el || !item) return;
    el.addEventListener('pointerdown', (e) => {
      if (window.NT && typeof window.NT.isLocked === 'function' && window.NT.isLocked()) return;
      if (e.target.closest('.free-resize')) return;
      if (e.button !== 0) return;
      const state = window.NT.state;
      const desktop = getCurrentDesktop();
      if (!desktop) return;
      const gridWrap = document.getElementById('gridWrap');
      if (!gridWrap) return;
      if (!item.cv) return;

      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const originalX = item.cv.x;
      const originalY = item.cv.y;
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      let dragging = false;
      let lastX = originalX;
      let lastY = originalY;

      const onMove = (ev) => {
        const dx = ev.clientX - startClientX;
        const dy = ev.clientY - startClientY;
        if (!dragging && Math.hypot(dx, dy) < 5) return;

        if (!dragging) {
          dragging = true;
          el.classList.add('dragging');
        }

        const s = fitScale || 1;
        let newX = originalX + dx / s;
        let newY = originalY + dy / s;
        const settings = state.settings || {};
        if (settings.freeSnap !== false) {
          newX = Math.round(newX / 20) * 20;
          newY = Math.round(newY / 20) * 20;
        }
        const maxX = Math.max(0, gridWrap.clientWidth / s - width);
        const maxY = Math.max(0, gridWrap.clientHeight / s - height);
        newX = Math.min(Math.max(0, newX), maxX);
        newY = Math.min(Math.max(0, newY), maxY);

        lastX = newX;
        lastY = newY;
        el.style.left = newX + 'px';
        el.style.top = newY + 'px';

        if (ev.preventDefault) ev.preventDefault();
      };

      const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);

        if (dragging) {
          el.classList.remove('dragging');
          suppressClick = true;

          const settings = state.settings || {};
          if (settings.freeNoOverlap !== false) {
            const otherRects = state.items
              .filter(i => i.desktopId === desktop.id && i.id !== item.id && i.cv)
              .map(i => i.cv);
            const currentRect = { x: lastX, y: lastY, w: width, h: height };
            const overlap = otherRects.some(r => rectsOverlapInset(currentRect, r));
            if (overlap) {
              // revert position
              el.style.left = originalX + 'px';
              el.style.top = originalY + 'px';
              // do not write back
            } else {
              item.cv.x = lastX;
              item.cv.y = lastY;
              window.NT.saveState();
            }
          } else {
            item.cv.x = lastX;
            item.cv.y = lastY;
            window.NT.saveState();
          }
        }
        // if not dragging, do nothing (click will fire normally)
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
  }

  // Attach resize behavior to a widget's resize handle
  function attachResize(handle, el, item) {
    if (!handle || !el || !item) return;
    handle.addEventListener('pointerdown', (e) => {
      if (window.NT && typeof window.NT.isLocked === 'function' && window.NT.isLocked()) return;
      e.stopPropagation();
      e.preventDefault();
      if (e.button !== 0) return;
      const state = window.NT.state;
      const desktop = getCurrentDesktop();
      if (!desktop) return;
      if (!item.cv) return;

      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const originalW = item.cv.w;
      const originalH = item.cv.h;
      let newW = originalW;
      let newH = originalH;
      let dragging = false;

      const kind = (item.data && item.data.kind) ? item.data.kind : '';
      const minW = (kind === 'datecard') ? 360 : 180;
      const minH = 180;

      const onMove = (ev) => {
        const dx = ev.clientX - startClientX;
        const dy = ev.clientY - startClientY;
        if (!dragging && Math.hypot(dx, dy) < 5) return;
        if (!dragging) {
          dragging = true;
        }

        const s = fitScale || 1;
        let w = Math.max(minW, originalW + dx / s);
        let h = Math.max(minH, originalH + dy / s);
        const settings = state.settings || {};
        if (settings.freeSnap !== false) {
          w = Math.round(w / 20) * 20;
          h = Math.round(h / 20) * 20;
        }
        newW = w;
        newH = h;
        el.style.width = w + 'px';
        el.style.height = h + 'px';

        if (ev.preventDefault) ev.preventDefault();
      };

      const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);

        if (dragging) {
          suppressClick = true;
          const settings = state.settings || {};
          if (settings.freeNoOverlap !== false) {
            const otherRects = state.items
              .filter(i => i.desktopId === desktop.id && i.id !== item.id && i.cv)
              .map(i => i.cv);
            const currentRect = { x: item.cv.x, y: item.cv.y, w: newW, h: newH };
            const overlap = otherRects.some(r => rectsOverlapInset(currentRect, r));
            if (overlap) {
              // revert
              el.style.width = originalW + 'px';
              el.style.height = originalH + 'px';
              // do not write back
            } else {
              item.cv.w = newW;
              item.cv.h = newH;
              window.NT.saveState();
              if (typeof window.NT.rerender === 'function') {
                window.NT.rerender();
              }
            }
          } else {
            item.cv.w = newW;
            item.cv.h = newH;
            window.NT.saveState();
            if (typeof window.NT.rerender === 'function') {
              window.NT.rerender();
            }
          }
        }
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
  }

  // Click handler for freeLayer (capture phase)
  function onClickCapture(e) {
    if (suppressClick) {
      suppressClick = false;
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    const targetEl = e.target.closest('.free-el');
    if (!targetEl) return;
    const id = targetEl.dataset.id;
    if (!id) return;
    const state = window.NT.state;
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    if (item.type === 'icon') {
      if (item.data && item.data.url && typeof window.NT.openUrl === 'function') {
        window.NT.openUrl(item.data.url);
      }
    } else if (item.type === 'folder') {
      if (typeof window.NT.openFolderPop === 'function') {
        window.NT.openFolderPop(item);
      }
    }
    // widget: do nothing (components handle their own clicks)
  }

  function ensureClickBound() {
    if (clickBound) return;
    const { freeLayer } = getElements();
    if (freeLayer) {
      freeLayer.addEventListener('click', onClickCapture, true);
      clickBound = true;
    }
  }

  // Render free layout
  function render() {
    if (!hasNT()) return;
    if (typeof window.NT.buildWidgetCell !== 'function' || typeof window.NT.buildIconCell !== 'function') return;
    const state = window.NT.state;
    const desktop = getCurrentDesktop();
    if (!desktop || desktop.layoutMode !== 'free') return;

    const { gridWrap, grid, iconGrid, freeLayer } = getElements();
    if (!gridWrap || !grid || !iconGrid || !freeLayer) return;

    grid.style.display = 'none';
    iconGrid.style.display = 'none';
    freeLayer.hidden = false;

    destroyFreeLayerWidgets(freeLayer);
    freeLayer.innerHTML = '';

    const items = state.items.filter(i => i.desktopId === desktop.id);

    // Normalize stored positions onto the 20px snap lattice, so an item that
    // was dragged away can always land exactly back on its initial position
    const settings = state.settings || {};
    let normalizedAny = false;
    if (settings.freeSnap !== false) {
      items.forEach(item => {
        if (item.cv && typeof item.cv.x === 'number' && typeof item.cv.y === 'number') {
          const nx = Math.round(item.cv.x / 20) * 20;
          const ny = Math.round(item.cv.y / 20) * 20;
          if (nx !== item.cv.x || ny !== item.cv.y) {
            item.cv.x = nx;
            item.cv.y = ny;
            normalizedAny = true;
          }
        }
      });
    }

    // First pass: collect existing free rects
    const placedRects = [];
    items.forEach(item => {
      if (item.cv && typeof item.cv.x === 'number' && typeof item.cv.y === 'number' &&
          typeof item.cv.w === 'number' && typeof item.cv.h === 'number') {
        placedRects.push({ x: item.cv.x, y: item.cv.y, w: item.cv.w, h: item.cv.h });
      }
    });

    // Second pass: assign missing free rects
    let assignedAny = false;
    const layerW = freeLayer.clientWidth || gridWrap.clientWidth || 1000;
    items.forEach(item => {
      if (!item.cv || typeof item.cv.x !== 'number' || typeof item.cv.y !== 'number' ||
          typeof item.cv.w !== 'number' || typeof item.cv.h !== 'number') {
        const w = item.type === 'widget' ? (item.w * 240 - 60) : 96;
        const h = item.type === 'widget' ? (item.h * 240 - 60) : 118;
        const spot = findFreeSpot(w, h, placedRects, layerW);
        item.cv = { x: spot.x, y: spot.y, w, h };
        placedRects.push({ x: spot.x, y: spot.y, w, h });
        assignedAny = true;
      }
    });

    if (assignedAny || normalizedAny) {
      window.NT.saveState();
    }

    // Render elements
    items.forEach(item => {
      const free = item.cv;
      const wrapper = document.createElement('div');
      wrapper.className = 'free-el';
      wrapper.dataset.id = item.id;
      wrapper.dataset.type = item.type;
      wrapper.style.left = free.x + 'px';
      wrapper.style.top = free.y + 'px';
      wrapper.style.width = free.w + 'px';
      wrapper.style.height = free.h + 'px';

      if (item.type === 'widget') {
        const cell = window.NT.buildWidgetCell(item);
        if (cell) {
          wrapper.appendChild(cell);
          const resize = document.createElement('div');
          resize.className = 'free-resize';
          wrapper.appendChild(resize);
          attachResize(resize, wrapper, item);
        }
      } else {
        const cell = window.NT.buildIconCell(item);
        if (cell) {
          wrapper.appendChild(cell);
        }
      }

      attachDrag(wrapper, item);
      freeLayer.appendChild(wrapper);
    });

    // 小窗口等比缩放兜底：内容总宽超出画布时整层按比例缩小（只影响显示，不改 cv 坐标）
    let maxRight = 0;
    items.forEach(item => {
      if (item.cv) maxRight = Math.max(maxRight, item.cv.x + item.cv.w);
    });
    const layerW2 = freeLayer.clientWidth || gridWrap.clientWidth || 0;
    fitScale = (layerW2 > 0 && maxRight > layerW2) ? (layerW2 / maxRight) : 1;
    freeLayer.style.transformOrigin = '0 0';
    freeLayer.style.transform = fitScale < 1 ? 'scale(' + fitScale + ')' : '';

    // Compute needed height
    let maxBottom = 0;
    items.forEach(item => {
      if (item.cv) {
        const bottom = item.cv.y + item.cv.h;
        if (bottom > maxBottom) maxBottom = bottom;
      }
    });
    gridWrap.style.height = Math.max(maxBottom + 288, 720) + 'px';

    ensureClickBound();
  }

  // Hide free layout and restore grid
  function hide() {
    if (!hasNT()) return;
    const { gridWrap, grid, iconGrid, freeLayer } = getElements();
    if (!gridWrap || !grid || !iconGrid || !freeLayer) return;
    destroyFreeLayerWidgets(freeLayer);
    freeLayer.innerHTML = '';
    freeLayer.hidden = true;
    freeLayer.style.transform = '';
    fitScale = 1;
    grid.style.display = '';
    iconGrid.style.display = '';
    gridWrap.style.height = '';
  }

  // Set layout mode
  function setMode(mode) {
    if (!hasNT()) return;
    const desktop = getCurrentDesktop();
    if (!desktop) return;

    if (mode === 'free' && desktop.layoutMode !== 'free') {
      const state = window.NT.state;
      const items = state.items.filter(i => i.desktopId === desktop.id);
      const needCapture = items.some(i => !i.cv || typeof i.cv.x !== 'number');
      if (needCapture) {
        captureFromGrid();
      }
      desktop.layoutMode = mode;
      window.NT.saveState();
      if (typeof window.NT.rerender === 'function') {
        window.NT.rerender();
      }
    } else {
      desktop.layoutMode = mode;
      window.NT.saveState();
      if (typeof window.NT.rerender === 'function') {
        window.NT.rerender();
      }
    }
  }

  // Return available widget tiers in grid mode
  function tiersFor(kind) {
    switch (kind) {
      case 'weather':
        return [
          { label: '小', w: 1, h: 1 },
          { label: '宽', w: 2, h: 1 }
        ];
      case 'analog':
        return [
          { label: '小', w: 1, h: 1 },
          { label: '大', w: 2, h: 2 }
        ];
      case 'datecard':
        return [
          { label: '标准', w: 2, h: 1 },
          { label: '大', w: 2, h: 2 }
        ];
      default:
        return [
          { label: '标准', w: 1, h: 1 }
        ];
    }
  }

  // Apply new tier in grid mode (used by context menu)
  function applyTier(item, w, h) {
    if (!hasNT()) return;
    if (!item) return;
    const state = window.NT.state;
    const desktop = getCurrentDesktop();
    if (!desktop) return;

    item.w = w;
    item.h = h;

    const otherWidgets = state.items.filter(i =>
      i.desktopId === desktop.id && i.type === 'widget' && i.id !== item.id
    );
    const rectA = { x: item.x, y: item.y, w: item.w, h: item.h };
    const overlap = otherWidgets.some(i => {
      const rectB = { x: i.x, y: i.y, w: i.w, h: i.h };
      return rectsOverlap(rectA, rectB);
    });
    if (overlap) {
      if (typeof window.NT.firstFreeCell === 'function') {
        const p = window.NT.firstFreeCell(w, h);
        if (p) {
          item.x = p.x;
          item.y = p.y;
        }
      }
    }

    if (typeof window.NT.normalizeWidgetRows === 'function') {
      window.NT.normalizeWidgetRows();
    }
    window.NT.saveState();
    if (typeof window.NT.rerender === 'function') {
      window.NT.rerender();
    }
  }

  // Public API
  window.NTFree = {
    isFree: function() { return isFree(); },
    render,
    hide,
    setMode,
    tiersFor,
    applyTier,
    getFitScale: function() { return fitScale; }
  };

  function isFree() {
    const desktop = getCurrentDesktop();
    return desktop && desktop.layoutMode === 'free';
  }
})();