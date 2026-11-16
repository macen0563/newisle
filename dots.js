(function () {
  'use strict';

  var bound = false;

  function getNav() {
    return document.getElementById('dotsNav');
  }

  function getState() {
    return window.NT && window.NT.state ? window.NT.state : null;
  }

  function findDesk(id) {
    var st = getState();
    if (!st || !Array.isArray(st.desktops)) return null;
    for (var i = 0; i < st.desktops.length; i++) {
      if (st.desktops[i] && st.desktops[i].id === id) return st.desktops[i];
    }
    return null;
  }

  function safeSave() {
    try {
      if (window.NT && typeof window.NT.saveState === 'function') window.NT.saveState();
    } catch (e) {}
  }

  function safeRerender() {
    try {
      if (window.NT && typeof window.NT.rerender === 'function') window.NT.rerender();
    } catch (e) {}
  }

  function dialogs() {
    return window.NTDialogs || null;
  }

  function onDotClick(id) {
    var st = getState();
    if (!st) return;
    if (!id) return;
    if (st.activeDesktop === id) return;
    st.activeDesktop = id;
    safeSave();
    safeRerender();
  }

  function onAddClick() {
    var d = dialogs();
    if (d && typeof d.openAddDesktop === 'function') {
      try { d.openAddDesktop(); } catch (e) {}
    }
  }

  function handleContextAction(act, id) {
    var st = getState();
    if (!st) return;
    var desk = findDesk(id);
    if (!desk) return;

    if (act === 'rename') {
      var d = dialogs();
      if (d && typeof d.openRenameDesktop === 'function') {
        try { d.openRenameDesktop(id); } catch (e) {}
      }
      return;
    }

    if (act === 'default') {
      if (!st.settings) st.settings = {};
      if (st.settings.defaultDesktopId === id) {
        delete st.settings.defaultDesktopId;
      } else {
        st.settings.defaultDesktopId = id;
      }
      safeSave();
      render();
      return;
    }

    if (act === 'lock') {
      desk.locked = !desk.locked;
      safeSave();
      safeRerender();
      return;
    }

    if (act === 'delete') {
      if (!Array.isArray(st.desktops) || st.desktops.length <= 1) return;
      var dl = dialogs();
      if (dl && typeof dl.deleteDesktop === 'function') {
        try { dl.deleteDesktop(id); } catch (e) {}
      }
      return;
    }
  }

  function openDotMenu(e, id) {
    var st = getState();
    if (!st) return;
    var desk = findDesk(id);
    if (!desk) return;

    var isDefault = !!(st.settings && st.settings.defaultDesktopId === id);

    var options = [
      { act: 'rename', label: '重命名' },
      { act: 'default', label: isDefault ? '取消默认桌面' : '设为默认桌面' },
      { act: 'lock', label: desk.locked ? '解锁桌面' : '锁定桌面' }
    ];

    if (Array.isArray(st.desktops) && st.desktops.length > 1) {
      options.push({ act: 'delete', label: '删除桌面' });
    }

    if (!window.NT || typeof window.NT.showCtxMenu !== 'function') return;

    try {
      window.NT.showCtxMenu(e.clientX, e.clientY, options, function (act) {
        try {
          handleContextAction(act, id);
        } catch (err) {}
      });
    } catch (err) {}
  }

  function bind(nav) {
    if (bound) return;
    bound = true;

    nav.addEventListener('click', function (e) {
      try {
        var addBtn = e.target && e.target.closest ? e.target.closest('.dot-add') : null;
        if (addBtn) {
          onAddClick();
          return;
        }
        var dot = e.target && e.target.closest ? e.target.closest('.dot') : null;
        if (dot) {
          onDotClick(dot.dataset ? dot.dataset.id : dot.getAttribute('data-id'));
        }
      } catch (err) {}
    });

    nav.addEventListener('contextmenu', function (e) {
      try {
        var dot = e.target && e.target.closest ? e.target.closest('.dot') : null;
        if (!dot) return;
        e.preventDefault();
        openDotMenu(e, dot.dataset ? dot.dataset.id : dot.getAttribute('data-id'));
      } catch (err) {
        e.preventDefault();
      }
    });
  }

  function render() {
    if (!window.NT) return;
    var nav = getNav();
    if (!nav) return;

    var st = getState();
    if (!st) return;

    bind(nav);

    while (nav.firstChild) nav.removeChild(nav.firstChild);

    var desktops = Array.isArray(st.desktops) ? st.desktops : [];
    var defaultId = st.settings ? st.settings.defaultDesktopId : undefined;

    for (var i = 0; i < desktops.length; i++) {
      var d = desktops[i];
      if (!d) continue;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dot';
      btn.dataset.id = d.id;
      if (d.id === st.activeDesktop) btn.classList.add('active');

      var title = d.name == null ? '' : String(d.name);
      if (d.locked) title += '（已锁定）';
      if (defaultId === d.id) title += '（默认）';
      btn.title = title;

      nav.appendChild(btn);
    }

    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'dot-add';
    addBtn.textContent = '+';
    addBtn.title = '新建桌面';
    nav.appendChild(addBtn);
  }

  window.NTDots = { render: render };
})();