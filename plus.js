(function () {
  'use strict';

  var SNAPS_KEY = 'nt_workbench_v2_snaps';
  var MAIN_KEY = 'nt_workbench_v2';
  var HIST_KEY = 'nt_workbench_v2_history';
  var MAX_SNAPS = 3;
  var MAX_HIST = 50;
  var TRASH_TTL = 30 * 24 * 3600 * 1000;

  var searchInited = false;

  /* ---------------- 通用工具 ---------------- */

  function deepCopy(o) {
    return JSON.parse(JSON.stringify(o === undefined ? null : o));
  }

  function getState() {
    return (window.NT && window.NT.state) ? window.NT.state : null;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function removeEl(el) {
    if (!el) return;
    if (el.parentNode) el.parentNode.removeChild(el);
    else if (typeof el.remove === 'function') el.remove();
  }

  /* ---------------- 1) 快照 ---------------- */

  function readSnaps() {
    try {
      var raw = localStorage.getItem(SNAPS_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeSnaps(arr) {
    localStorage.setItem(SNAPS_KEY, JSON.stringify(arr));
  }

  function snapshot(reason) {
    var st = getState();
    if (!st) return false;

    var copy;
    try {
      copy = deepCopy(st);
    } catch (e) {
      return false;
    }

    var arr = readSnaps();
    arr.unshift({
      ts: Date.now(),
      reason: reason == null ? '' : String(reason),
      state: copy
    });
    while (arr.length > MAX_SNAPS) arr.pop();

    try {
      writeSnaps(arr);
      return true;
    } catch (e1) {
      // 配额不足：删掉最旧一份再试一次
      try {
        arr.pop();
        writeSnaps(arr);
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  function listSnapshots() {
    return readSnaps().map(function (s) {
      return { ts: s && s.ts, reason: s && s.reason };
    });
  }

  function rollback(index) {
    var arr = readSnaps();
    var i = Number(index);
    if (!Array.isArray(arr) || !isFinite(i) || i < 0 || i >= arr.length) return false;

    var snap = arr[i];
    if (!snap || !snap.state) return false;

    var json;
    try {
      json = JSON.stringify(snap.state);
    } catch (e) {
      return false;
    }
    if (!json) return false;

    snapshot('回滚前自动快照');

    try {
      localStorage.setItem(MAIN_KEY, json);
    } catch (e) {
      return false;
    }

    try {
      location.reload();
    } catch (e) { /* ignore */ }

    return true;
  }

  /* ---------------- 2) 一键整理 ---------------- */

  function tidyLayout() {
    var NT = window.NT;
    var st = getState();
    if (!NT || !st) return;

    var desk = st.activeDesktop;
    var items = Array.isArray(st.items) ? st.items : (st.items = []);

    // widgets：按 (y, x) 阅读顺序重新分配空位
    var widgets = items.filter(function (it) {
      return it && it.desktopId === desk && it.type === 'widget';
    });

    widgets.sort(function (a, b) {
      var ay = typeof a.y === 'number' ? a.y : 0;
      var by = typeof b.y === 'number' ? b.y : 0;
      if (ay !== by) return ay - by;
      var ax = typeof a.x === 'number' ? a.x : 0;
      var bx = typeof b.x === 'number' ? b.x : 0;
      return ax - bx;
    });

    // 先把坐标挪到负区，避免占用冲突
    widgets.forEach(function (w, i) {
      w.x = -1000 - i;
      if (typeof w.y !== 'number') w.y = 0;
    });

    widgets.forEach(function (w) {
      var ww = typeof w.w === 'number' ? w.w : 1;
      var hh = typeof w.h === 'number' ? w.h : 1;
      var cell = null;
      try {
        cell = NT.firstFreeCell(ww, hh);
      } catch (e) {
        cell = null;
      }
      if (cell && typeof cell.x === 'number' && typeof cell.y === 'number') {
        w.x = cell.x;
        w.y = cell.y;
      }
    });

    // icons / folders：按 x 归一化为 0,1,2…
    normalizeIcons(desk);

    try { NT.saveState(); } catch (e) { /* ignore */ }
    try { NT.rerender(); } catch (e) { /* ignore */ }
  }

  function normalizeIcons(deskId) {
    var st = getState();
    if (!st) return;
    var desk = deskId == null ? st.activeDesktop : deskId;
    var items = Array.isArray(st.items) ? st.items : [];
    var list = items.filter(function (it) {
      return it && it.desktopId === desk && (it.type === 'icon' || it.type === 'folder');
    });
    list.sort(function (a, b) {
      var ax = typeof a.x === 'number' ? a.x : 0;
      var bx = typeof b.x === 'number' ? b.x : 0;
      return ax - bx;
    });
    list.forEach(function (it, i) { it.x = i; });
  }

  /* ---------------- 3) 搜索历史 ---------------- */

  function readHistory() {
    try {
      var raw = localStorage.getItem(HIST_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (s) { return typeof s === 'string' && s.length; });
    } catch (e) {
      return [];
    }
  }

  function writeHistory(arr) {
    try {
      localStorage.setItem(HIST_KEY, JSON.stringify(arr.slice(0, MAX_HIST)));
    } catch (e) { /* 静默 */ }
  }

  function historyEnabled() {
    var st = getState();
    return !(st && st.settings && st.settings.searchHistory === false);
  }

  function hideHistory() {
    removeEl(document.getElementById('historyPop'));
  }

  function showHistoryPanel(list) {
    hideHistory();
    var form0 = document.getElementById('searchForm');
    var wrap = form0 || document.getElementById('searchWrap');
    if (!wrap) return;
    if (window.getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';

    var panel = document.createElement('div');
    panel.id = 'historyPop';
    panel.style.cssText =
      'position:absolute;left:0;right:0;top:calc(100% + 8px);z-index:80;' +
      'border-radius:14px;padding:6px;background:rgba(255,255,255,.85);' +
      '-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);' +
      'box-shadow:0 12px 32px rgba(31,38,80,.20);color:#2b3446;font-size:14px;';

    list.forEach(function (value) {
      var row = document.createElement('div');
      row.style.cssText =
        'padding:7px 10px;border-radius:8px;cursor:pointer;' +
        'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      row.textContent = value;
      row.title = value;
      row.addEventListener('click', function () {
        var input = document.getElementById('searchInput');
        var form = document.getElementById('searchForm');
        hideHistory();
        if (input) input.value = value;
        if (form) {
          if (typeof form.requestSubmit === 'function') {
            try { form.requestSubmit(); } catch (e) { form.submit(); }
          } else {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          }
        }
      });
      panel.appendChild(row);
    });

    var clear = document.createElement('div');
    clear.style.cssText =
      'padding:7px 10px;border-radius:8px;cursor:pointer;text-align:center;' +
      'margin-top:4px;color:#7183a8;border-top:1px solid rgba(31,38,80,.08);';
    clear.textContent = '清空历史';
    clear.addEventListener('click', function () {
      writeHistory([]);
      hideHistory();
    });
    panel.appendChild(clear);

    wrap.appendChild(panel);
  }

  function onSearchSubmit() {
    hideHistory();

    var input = document.getElementById('searchInput');
    var v = input ? String(input.value == null ? '' : input.value).trim() : '';
    if (!v) return;
    if (!historyEnabled()) return;

    var list = readHistory().filter(function (x) { return x !== v; });
    list.unshift(v);
    writeHistory(list);
  }

  function onSearchFocus() {
    if (!historyEnabled()) {
      hideHistory();
      return;
    }
    var list = readHistory();
    if (!list.length) {
      hideHistory();
      return;
    }
    showHistoryPanel(list);
  }

  function onDocPointerDown(e) {
    var pop = document.getElementById('historyPop');
    if (!pop) return;
    var t = e.target;
    if (pop === t || (pop.contains && pop.contains(t))) return;
    var input = document.getElementById('searchInput');
    if (input && (input === t || (input.contains && input.contains(t)))) return;
    hideHistory();
  }

  function onDocKeyDown(e) {
    if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) hideHistory();
  }

  var histActive = -1;

  function getHistItems(pop) {
    if (!pop) return [];
    // 历史条目是带 title 的行 div（末尾的「清空历史」行没有 title，排除）
    return Array.prototype.slice.call(pop.children).filter(function (el) { return !!el.title; });
  }

  function setHistActive(items, idx) {
    for (var i = 0; i < items.length; i++) {
      if (i === idx) items[i].classList.add('hist-active');
      else items[i].classList.remove('hist-active');
    }
  }

  function bindHistoryKeys() {
    var input = document.getElementById('searchInput');
    if (!input || input.__histKeysBound) return;
    input.__histKeysBound = true;

    input.addEventListener('keydown', function (e) {
      var pop = document.getElementById('historyPop');
      if (!pop || pop.hidden || !pop.parentNode) {
        histActive = -1;
        return;
      }
      var key = e.key;
      if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Escape' && key !== 'Enter') return;

      var items = getHistItems(pop);

      if (key === 'ArrowDown') {
        if (!items.length) return;
        e.preventDefault();
        histActive = Math.min(histActive + 1, items.length - 1);
        if (histActive < 0) histActive = 0;
        setHistActive(items, histActive);
        return;
      }

      if (key === 'ArrowUp') {
        if (!items.length) return;
        e.preventDefault();
        histActive = Math.max(histActive - 1, 0);
        setHistActive(items, histActive);
        return;
      }

      if (key === 'Enter') {
        if (histActive >= 0 && items[histActive]) {
          var el = items[histActive];
          var q = el.getAttribute('data-q');
          if (q == null || q === '') q = String(el.textContent || '').trim();
          input.value = q;
          hideHistory();
          histActive = -1;
        }
        return;
      }

      if (key === 'Escape') {
        hideHistory();
        histActive = -1;
        return;
      }
    });
  }

  function initSearchHistory() {
    if (searchInited) return;

    var form = document.getElementById('searchForm');
    var input = document.getElementById('searchInput');
    if (!form || !input) return;

    searchInited = true;
    bindHistoryKeys();

    var wrap = document.getElementById('searchWrap');
    if (wrap) {
      var pos = '';
      try {
        pos = window.getComputedStyle(wrap).position;
      } catch (e) {
        pos = '';
      }
      if (!pos || pos === 'static') wrap.style.position = 'relative';
    }

    form.addEventListener('submit', onSearchSubmit, true);
    input.addEventListener('focus', onSearchFocus);
    document.addEventListener('pointerdown', onDocPointerDown, true);
    document.addEventListener('keydown', onDocKeyDown, true);
  }

  /* ---------------- 4) 清理回收站 ---------------- */

  function purgeTrash() {
    var NT = window.NT;
    var st = getState();
    if (!NT || !st || !Array.isArray(st.trash)) return 0;

    var now = Date.now();
    var before = st.trash.length;

    st.trash = st.trash.filter(function (it) {
      if (!it) return false;
      var d = it.deletedAt;
      if (typeof d !== 'number' || !isFinite(d)) return true; // 无时间戳的保留
      return (now - d) <= TRASH_TTL;
    });

    var removed = before - st.trash.length;
    if (removed > 0) {
      try { NT.saveState(); } catch (e) { /* ignore */ }
    }
    return removed;
  }

  /* ---------------- 5) 删除文件夹 ---------------- */

  function removeItem(item) {
    var st = getState();
    if (!st || !Array.isArray(st.items)) return;
    var idx = st.items.indexOf(item);
    if (idx >= 0) st.items.splice(idx, 1);
  }

  function finishMutation() {
    var NT = window.NT;
    if (!NT) return;
    try { NT.saveState(); } catch (e) { /* ignore */ }
    try { NT.rerender(); } catch (e) { /* ignore */ }
    try { NT.closeModal(); } catch (e) { /* ignore */ }
  }

  function childToItem(ch, parent) {
    var NT = window.NT;
    if (ch && ch.isFolder) {
      return {
        id: NT.uid(),
        desktopId: parent.desktopId,
        type: 'folder',
        x: 9999,
        y: 0,
        data: {
          name: ch.name || '文件夹',
          children: deepCopy(Array.isArray(ch.children) ? ch.children : [])
        }
      };
    }
    return {
      id: NT.uid(),
      desktopId: parent.desktopId,
      type: 'icon',
      x: 9999,
      y: 0,
      data: {
        name: ch && ch.name ? ch.name : '',
        url: ch && ch.url ? ch.url : '',
        color: ch ? ch.color : undefined,
        customIcon: ch ? ch.customIcon : undefined
      }
    };
  }

  function doRestoreChildren(item, children) {
    var NT = window.NT;
    var st = getState();
    if (!NT || !st) return;

    var items = Array.isArray(st.items) ? st.items : (st.items = []);

    children.forEach(function (ch) {
      if (!ch) return;
      items.push(childToItem(ch, item));
    });

    removeItem(item);
    normalizeIcons(item.desktopId);
    finishMutation();
  }

  function doTrashFolder(item) {
    var NT = window.NT;
    var st = getState();
    if (!NT || !st) return;

    var trash = Array.isArray(st.trash) ? st.trash : (st.trash = []);
    var copy;
    try {
      copy = deepCopy(item);
    } catch (e) {
      copy = item;
    }
    copy.deletedAt = Date.now();

    removeItem(item);
    trash.push(copy);
    normalizeIcons(item.desktopId);
    finishMutation();
  }

  function deleteFolder(item) {
    var NT = window.NT;
    if (!NT || !item || item.type !== 'folder') return false;

    var children = (item.data && Array.isArray(item.data.children)) ? item.data.children : [];
    if (!children.length) return false;

    var name = (item.data && item.data.name) ? String(item.data.name) : '未命名文件夹';

    var btnBase = 'padding:8px 14px;border-radius:10px;border:none;cursor:pointer;font-size:14px;';
    var html =
      '<div style="color:#2b3446;font-size:14px;line-height:1.65;">' +
        '<p style="margin:0 0 8px;">文件夹「<b>' + esc(name) + '</b>」中有 <b>' + children.length + '</b> 个子项。</p>' +
        '<p style="margin:0 0 18px;color:#7183a8;">请选择处理方式：</p>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
          '<button type="button" data-act="delete" style="' + btnBase + 'background:#eef1f8;color:#5a6a8c;">一起删除</button>' +
          '<button type="button" data-act="restore" style="' + btnBase + 'background:#4c7dff;color:#fff;">图标回到桌面</button>' +
        '</div>' +
      '</div>';

    var box = NT.openModal('删除文件夹', html);
    if (!box) return false;

    var restoreBtn = box.querySelector ? box.querySelector('[data-act="restore"]') : null;
    var deleteBtn = box.querySelector ? box.querySelector('[data-act="delete"]') : null;

    if (restoreBtn) {
      restoreBtn.addEventListener('click', function () {
        doRestoreChildren(item, children);
      });
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        doTrashFolder(item);
      });
    }

    return true;
  }

  /* ---------------- 导出 ---------------- */

  window.NTPlus = {
    snapshot: snapshot,
    listSnapshots: listSnapshots,
    rollback: rollback,
    tidyLayout: tidyLayout,
    initSearchHistory: initSearchHistory,
    purgeTrash: purgeTrash,
    deleteFolder: deleteFolder
  };
})();
