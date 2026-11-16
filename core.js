(function () {
  'use strict';

  const UNIT = 180;
  const GAP = 60;
  const PITCH = 240;
  const PALETTE = ['#4f7cff', '#ff7a59', '#22b573', '#ffb020', '#9b6bff', '#ff5c8a'];
  const STORAGE_KEY = 'nt_workbench_v2';

  let state = null;
  let suppressClick = false;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function clampX(x) { return Math.max(0, x); }
  function clampY(y) { return Math.max(0, y); }

  function createDefaultState() {
    const items = [];
    // desktops
    const desktops = [
      { id: 'd1', name: '主页', icon: '🏠', layoutMode: 'grid' }
    ];

    // d1 widgets（WeTab 尺度：单位 180、间距 60）
    items.push({
      id: uid(),
      desktopId: 'd1',
      type: 'widget',
      x: 1,
      y: 0,
      w: 2,
      h: 1,
      data: { kind: 'datecard', title: '元旦', date: '2027-01-01' }
    });
    items.push({
      id: uid(),
      desktopId: 'd1',
      type: 'widget',
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      data: { kind: 'weather', city: '北京' }
    });
    items.push({
      id: uid(),
      desktopId: 'd1',
      type: 'widget',
      x: 3,
      y: 0,
      w: 1,
      h: 1,
      data: { kind: 'analog' }
    });

    // d1 folder（大卡形态）
    items.push({
      id: uid(),
      desktopId: 'd1',
      type: 'folder',
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      data: {
        name: '常用',
        color: PALETTE[2],
        children: [
          { name: '百度', url: 'https://www.baidu.com', color: PALETTE[3], letter: '百' },
          { name: '哔哩哔哩', url: 'https://www.bilibili.com', color: PALETTE[4], letter: '哔' }
        ]
      }
    });

    // d1 icons
    items.push({
      id: uid(),
      desktopId: 'd1',
      type: 'icon',
      x: 1,
      y: 0,
      w: 1,
      h: 1,
      data: { name: '必应', url: 'https://www.bing.com', color: PALETTE[0], letter: '必' }
    });
    items.push({
      id: uid(),
      desktopId: 'd1',
      type: 'icon',
      x: 2,
      y: 0,
      w: 1,
      h: 1,
      data: { name: '知乎', url: 'https://www.zhihu.com', color: PALETTE[1], letter: '知' }
    });

    return {
      version: 14,
      settings: {
        engine: 'bing',
        customEngine: '',
        wallpaper: { type: 'image', value: 'assets/wallpaper-dawn.jpg' },
        dim: 30,
        iconSize: 'm',
        showLabels: true,
        wpApis: defaultWpApis(),
        wpRotate: { on: false, every: 'open' }, wpRotateLast: 0, wpRotateSrc: '',
        lang: 'zh',
      },
      desktops,
      activeDesktop: 'd1',
      items,
      dock: [
        { name: '百度', url: 'https://www.baidu.com' },
        { name: '哔哩哔哩', url: 'https://www.bilibili.com' },
        { name: '微博', url: 'https://weibo.com' },
        { name: '知乎', url: 'https://www.zhihu.com' },
        { name: 'GitHub', url: 'https://github.com' }
      ],
      trash: []
    };
  }

  function migrateState() {
    // 版本闸门：v10 起已支持多桌面，旧「单主页合并」只适用于 v10 之前的旧数据结构，
    // 否则每次 loadState() 都会把用户的多桌面合并成一个，导致刷新即丢失布局。
    if (state.version >= 10) return;
    // 单主页：把多余桌面的元素合并进第一个桌面，并统一命名为「主页」
    if (Array.isArray(state.desktops) && state.desktops.length > 1) {
      const home = state.desktops[0];
      const otherIds = state.desktops.slice(1).map(d => d.id);
      state.items.forEach(it => {
        if (otherIds.includes(it.desktopId)) {
          it.desktopId = home.id;
          const pos = freeCellFor(home.id, it.w, it.h, it);
          it.x = pos.x; it.y = pos.y;
        }
      });
      (state.trash || []).forEach(it => { if (otherIds.includes(it.desktopId)) it.desktopId = home.id; });
      state.desktops = [home];
      state.activeDesktop = home.id;
    }
    if (state.desktops && state.desktops[0]) {
      state.desktops[0].name = '主页';
      state.desktops[0].icon = '🏠';
    }
  }

  function freeCellFor(desktopId, w, h, selfItem) {
    const items = state.items.filter(i => i.desktopId === desktopId && i !== selfItem);
    for (let y = 0; y < 200; y++) {
      for (let x = 0; x < 200; x++) {
        const cand = { x, y, w, h };
        if (!items.some(i => overlap(i, cand))) return { x, y };
      }
    }
    return { x: 0, y: 0 };
  }

  function migrateV3() {
    // WeTab 尺度迁移：组件改为标准尺寸，并按原顺序重新排布避免重叠
    const CANON = { clock: [1, 1], calendar: [1, 1], weather: [2, 1], countdown: [2, 1] };
    state.items.forEach(it => {
      if (it.type === 'widget' && it.data && CANON[it.data.kind]) {
        it.w = CANON[it.data.kind][0];
        it.h = CANON[it.data.kind][1];
      }
    });
    const targetId = state.activeDesktop;
    const mine = state.items.filter(i => i.desktopId === targetId);
    state.items = state.items.filter(i => i.desktopId !== targetId);
    mine.forEach(it => {
      const pos = freeCellFor(targetId, it.w, it.h, it);
      it.x = pos.x; it.y = pos.y;
      state.items.push(it);
    });
    if (!Array.isArray(state.dock)) {
      state.dock = [
        { name: '百度', url: 'https://www.baidu.com' },
        { name: '哔哩哔哩', url: 'https://www.bilibili.com' },
        { name: '微博', url: 'https://weibo.com' },
        { name: '知乎', url: 'https://www.zhihu.com' },
        { name: 'GitHub', url: 'https://github.com' }
      ];
    }
    state.version = 3;
  }

  function defaultWpApis() {
    return [
      { name: 'picsum 随机图库', url: 'https://picsum.photos/2560/1440' },
      { name: 'Bing 每日一图', url: 'https://bing.biturl.top/?resolution=1920&format=json&index=0&mkt=zh-CN' }
    ];
  }

  function migrateV4() {
    // 混合栅格：图标/文件夹改用顺序坐标（保持原视觉顺序）
    const seq = state.items
      .filter(i => i.type === 'icon' || i.type === 'folder')
      .sort((a, b) => (a.y - b.y) || (a.x - b.x));
    seq.forEach((it, idx) => { it.x = idx; it.y = 0; });
    normalizeWidgetRows();
    if (!state.settings) state.settings = {};
    if (!Array.isArray(state.settings.wpApis)) {
      state.settings.wpApis = defaultWpApis();
    if (!state.settings.wpRotate) state.settings.wpRotate = { on: false, every: 'open' };
    }
    state.version = 4;
  }

  function migrateV5() {
    // 日历 + 纪念日合并为一张「日历纪念日」卡
    const deskIds = [...new Set(state.items.map(i => i.desktopId))];
    deskIds.forEach(deskId => {
      const cds = state.items.filter(i => i.desktopId === deskId && i.type === 'widget' && i.data.kind === 'countdown');
      const cals = state.items.filter(i => i.desktopId === deskId && i.type === 'widget' && i.data.kind === 'calendar');
      if (!cds.length && !cals.length) return;
      const base = cds[0] || cals[0];
      const merged = {
        id: base.id,
        desktopId: deskId,
        type: 'widget',
        x: base.x,
        y: base.y,
        w: 2,
        h: 1,
        data: {
          kind: 'datecard',
          title: (cds[0] && cds[0].data.title) || '元旦',
          date: (cds[0] && cds[0].data.date) || ((new Date().getFullYear() + 1) + '-01-01')
        }
      };
      const dropIds = new Set([...cds, ...cals].map(i => i.id));
      state.items = state.items.filter(i => !dropIds.has(i.id));
      cds.slice(1).forEach(cd => {
        state.items.push({
          id: cd.id, desktopId: deskId, type: 'widget', x: cd.x, y: cd.y, w: 2, h: 1,
          data: { kind: 'datecard', title: cd.data.title || '元旦', date: cd.data.date || merged.data.date }
        });
      });
      state.items.push(merged);
    });
    resequenceIcons();
    normalizeWidgetRows();
    state.version = 5;
  }

  function migrateV6() {
    // 按画板布局：天气变 1×1 方卡；模拟时钟独立成卡；行内顺序 天气 → 日历纪念日 → 时钟
    const deskIds = [...new Set(state.items.map(i => i.desktopId))];
    deskIds.forEach(deskId => {
      const widgets = state.items.filter(i => i.desktopId === deskId && i.type === 'widget');
      widgets.forEach(w => { if (w.data.kind === 'weather') { w.w = 1; w.h = 1; } });
      const dc = widgets.find(w => w.data.kind === 'datecard');
      let analog = widgets.find(w => w.data.kind === 'analog');
      if (dc && !analog) {
        analog = { id: uid(), desktopId: deskId, type: 'widget', x: dc.x + 2, y: dc.y, w: 1, h: 1, data: { kind: 'analog' } };
        state.items.push(analog);
        widgets.push(analog);
      }
      const order = k => k === 'weather' ? 0 : k === 'datecard' ? 1 : k === 'analog' ? 2 : 3;
      const rows = {};
      widgets.forEach(w => { (rows[w.y] = rows[w.y] || []).push(w); });
      Object.values(rows).forEach(row => {
        const minX = Math.min(...row.map(w => w.x));
        row.sort((a, b) => (order(a.data.kind) - order(b.data.kind)) || (a.x - b.x));
        let cx = minX;
        row.forEach(w => { w.x = cx; cx += w.w; });
      });
    });
    resequenceIcons();
    normalizeWidgetRows();
    state.version = 6;
  }

  // v7：旧「数字时钟」组件并入时钟组件的数字样式
  function migrateV7() {
    state.items.forEach((it) => {
      if (it.type === 'widget' && it.data && it.data.kind === 'clock') {
        it.data.kind = 'analog';
        it.data.style = 'digital';
      }
    });
    state.version = 7;
  }

  // v8：Bing 每日一图官方接口无跨域许可，默认条目换成镜像源，旧地址自动替换
  function migrateV8() {
    if (Array.isArray(state.settings.wpApis)) {
      state.settings.wpApis.forEach((a) => {
        if (a && /HPImageArchive/i.test(a.url || '')) {
          a.url = 'https://bing.biturl.top/?resolution=1920&format=json&index=0&mkt=zh-CN';
        }
      });
    }
    state.version = 8;
  }

  // v9：桌面增加布局模式（grid/free），自由位置存 item.free，首次切换时按网格生成
  function migrateV9() {
    (state.desktops || []).forEach((d) => { if (!d.layoutMode) d.layoutMode = 'grid'; });
    state.version = 9;
  }

  // v11：PRD 补齐——外观（模糊/深色模式）、搜索历史、内容区宽度、隐藏添加入口等设置默认值
  function migrateV11() {
    const st = state.settings || (state.settings = {});
    if (st.blur === undefined) st.blur = 0;
    if (st.darkMode === undefined) st.darkMode = 'auto';
    if (st.searchHistory === undefined) st.searchHistory = true;
    if (st.hideAdd === undefined) st.hideAdd = false;
    if (st.contentWidth === undefined) st.contentWidth = 'standard';
    state.version = 11;
  }

  // v12：picsum 默认图源升到 2560×1440，旧默认地址自动替换（用户改过的地址不动）
  function migrateV12() {
    if (Array.isArray(state.settings.wpApis)) {
      state.settings.wpApis.forEach((a) => {
        if (a && a.url === 'https://picsum.photos/1920/1080') {
          a.url = 'https://picsum.photos/2560/1440';
        }
      });
    }
    state.version = 12;
  }

  // v10：校验默认桌面有效性（桌面被删后清掉失效的 defaultDesktopId）
  function migrateV10() {
    if (state.settings && state.settings.defaultDesktopId &&
        !(state.desktops || []).some(d => d.id === state.settings.defaultDesktopId)) {
      delete state.settings.defaultDesktopId;
    }
    state.version = 10;
  }

  function isDesktopLocked() {
    const desk = state.desktops.find(d => d.id === state.activeDesktop);
    return !!(desk && desk.locked);
  }

  function cloneData(o) {
    if (o === undefined || o === null) return {};
    try {
      return JSON.parse(JSON.stringify(o));
    } catch (e) {
      return {};
    }
  }

  function ensureEntities() {
    if (!state.entities || typeof state.entities !== 'object' || Array.isArray(state.entities)) {
      state.entities = {};
    }
    var all = (state.items || []).concat(state.trash || []);
    for (var i = 0; i < all.length; i++) {
      var it = all[i];
      if (!it) continue;
      if (!it.entityId) {
        it.entityId = uid();
        state.entities[it.entityId] = { type: it.type, data: cloneData(it.data) };
      } else if (!state.entities[it.entityId]) {
        state.entities[it.entityId] = { type: it.type, data: cloneData(it.data) };
      }
    }
  }

  function pullEntities() {
    if (!state.entities || typeof state.entities !== 'object') return;
    var all = (state.items || []).concat(state.trash || []);
    for (var i = 0; i < all.length; i++) {
      var it = all[i];
      if (!it || !it.entityId) continue;
      var ent = state.entities[it.entityId];
      if (ent) it.data = cloneData(ent.data);
    }
  }

  function pushEntities() {
    ensureEntities();
    var items = state.items || [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || !it.entityId) continue;
      if (it.desktopId !== state.activeDesktop) continue;
      if (!state.entities[it.entityId]) {
        state.entities[it.entityId] = { type: it.type, data: cloneData(it.data) };
      }
      state.entities[it.entityId].data = cloneData(it.data);
    }

    var used = {};
    var all = items.concat(state.trash || []);
    for (var j = 0; j < all.length; j++) {
      if (all[j] && all[j].entityId) used[all[j].entityId] = true;
    }
    var keys = Object.keys(state.entities);
    for (var k = 0; k < keys.length; k++) {
      if (!used[keys[k]]) delete state.entities[keys[k]];
    }
  }

  function migrateV13() {
    ensureEntities();
    state.version = 13;
  }

  // v14：统一画布——自由位置从 item.free 迁到 item.cv（free 保留作回滚）
  function migrateV14() {
    if (window.NTLayout) {
      NTLayout.migrateCv(state.items || []);
      NTLayout.migrateCv(state.trash || []);
    } else {
      (state.items || []).concat(state.trash || []).forEach((it) => {
        if (it && it.free && !it.cv) it.cv = { x: it.free.x, y: it.free.y, w: it.free.w, h: it.free.h };
      });
    }
    state.version = 14;
  }

  function addToDesktop(item, desktopId) {
    if (!item || !item.entityId) return false;

    var target = null;
    var desktops = state.desktops || [];
    for (var i = 0; i < desktops.length; i++) {
      if (desktops[i] && desktops[i].id === desktopId) { target = desktops[i]; break; }
    }
    if (!target || target.locked) return false;

    var items = state.items || [];
    for (var j = 0; j < items.length; j++) {
      if (items[j] && items[j].desktopId === desktopId && items[j].entityId === item.entityId) {
        alert((window.NTI18N ? NTI18N.t('「') : '「') + target.name + (window.NTI18N ? NTI18N.t('」上已经有这个内容了') : '」上已经有这个内容了'));
        return false;
      }
    }

    ensureEntities();
    var ent = state.entities[item.entityId];
    var srcData = ent ? cloneData(ent.data) : cloneData(item.data);
    var w = item.w === undefined ? 1 : item.w;
    var h = item.h === undefined ? 1 : item.h;
    var isFree = target.layoutMode === 'free';

    var p = {
      id: uid(),
      entityId: item.entityId,
      desktopId: desktopId,
      type: item.type,
      w: w,
      h: h,
      data: srcData
    };

    if (item.type === 'widget') {
      if (isFree) {
        p.cv = { x: 60, y: 60, w: w * 240 - 60, h: h * 240 - 60 };
        p.x = 0;
        p.y = 0;
      } else {
        var cell = freeCellFor(desktopId, w, h, null);
        p.x = cell && cell.x !== undefined ? cell.x : 0;
        p.y = cell && cell.y !== undefined ? cell.y : 0;
      }
    } else {
      var n = 0;
      for (var m = 0; m < items.length; m++) {
        if (items[m] && items[m].desktopId === desktopId && items[m].type !== 'widget') n++;
      }
      p.x = n;
      p.y = 0;
      if (isFree) p.cv = { x: 60, y: 132, w: 96, h: 116 };
    }

    state.items.push(p);
    saveState();
    rerender();
    return true;
  }

  function importBookmarkFolder(name, children) {
    if (isDesktopLocked()) {
      alert(window.NTI18N ? NTI18N.t('当前桌面已锁定，请先在底部圆点菜单中解锁') : '当前桌面已锁定，请先在底部圆点菜单中解锁');
      return null;
    }
    if (!Array.isArray(children) || children.length === 0) return null;

    const used = state.items.filter(
      (it) => it.desktopId === state.activeDesktop && it.type !== 'widget'
    ).length;

    const item = {
      id: uid(),
      desktopId: state.activeDesktop,
      type: 'folder',
      x: used,
      y: 0,
      w: 1,
      h: 1,
      data: { name: name || '书签', children }
    };

    state.items.push(item);
    saveState();
    rerender();
    return item;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        state = JSON.parse(raw);
        if (!state.version || state.version < 2) {
          state = createDefaultState();
        } else {
          migrateState();
          if (state.version === 2) migrateV3();
          if (state.version === 3) migrateV4();
          if (state.version === 4) migrateV5();
          if (state.version === 5) migrateV6();
          if (state.version === 6) migrateV7();
          if (state.version === 7) migrateV8();
          if (state.version === 8) migrateV9();
          if (state.version === 9) migrateV10();
          if (state.version === 10) migrateV11();
          if (state.version === 11) migrateV12();
          if (state.version === 12) migrateV13();
          if (state.version === 13) migrateV14();
        }
      } else {
        state = createDefaultState();
      }
    } catch (e) {
      state = createDefaultState();
    }
    ensureEntities();
    // 启动默认桌面（圆点菜单里设定；无设定则保持上次桌面）
    if (state.settings && state.settings.defaultDesktopId &&
        state.desktops.some(d => d.id === state.settings.defaultDesktopId)) {
      state.activeDesktop = state.settings.defaultDesktopId;
    }
    saveState();
  }

  let saveWarned = false;

  function showSaveToast() {
    if (document.getElementById('saveToast')) return;
    const el = document.createElement('div');
    el.id = 'saveToast';
    el.textContent = '存储空间不足，本次修改未能保存，请到设置中清理快照或换一张小一点的壁纸';
    el.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:28px',
      'transform:translateX(-50%)',
      'z-index:9999',
      'background:rgba(20,20,25,.92)',
      'color:#fff',
      'padding:10px 16px',
      'border-radius:10px',
      'font-size:13px',
      'max-width:86vw',
      'text-align:center'
    ].join(';');
    document.body.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 5000);
  }

  function saveState() {
    pushEntities();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return;
    } catch (e) {
      // 空间不足：先丢掉快照腾地方，再试一次
      try {
        localStorage.removeItem(STORAGE_KEY + '_snaps');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return;
      } catch (e2) {
        if (!saveWarned) {
          saveWarned = true;
          showSaveToast();
        }
      }
    }
  }

  function faviconUrl(url) {
    try {
      const u = new URL(/^https?:\/\//i.test(url) ? url : 'https://' + url);
      return 'https://www.google.com/s2/favicons?domain=' + u.hostname + '&sz=128';
    } catch (e) { return ''; }
  }

  function faviconFallbackUrl(url) {
    try {
      const u = new URL(/^https?:\/\//i.test(url) ? url : 'https://' + url);
      return 'https://icons.duckduckgo.com/ip3/' + u.hostname + '.ico';
    } catch (e) { return ''; }
  }

  // 给 img 挂双源加载：主源失败自动切备用源，再失败才回调 onFail
  function loadFaviconImg(img, url, onFail) {
    const src = faviconUrl(url || '');
    const backup = faviconFallbackUrl(url || '');
    if (!src) { onFail(); return; }
    img.addEventListener('error', function handler() {
      if (img.src !== backup && backup) {
        img.src = backup;
      } else {
        img.removeEventListener('error', handler);
        onFail();
      }
    });
    img.src = src;
  }

  // 图标块内容：优先网站 logo（favicon），加载失败回退首字
  function fillTileIcon(ic, data) {
    const letter = document.createElement('span');
    letter.className = 'tile-letter';
    letter.textContent = data.letter || (data.name || '?').charAt(0);
    ic.appendChild(letter);
    if (data.iconLib && window.ICONLIB && ICONLIB[data.iconLib]) {
      const entry = ICONLIB[data.iconLib];
      const wrap = document.createElement('span');
      wrap.className = 'tile-lib';
      wrap.innerHTML = `<svg viewBox="0 0 24 24"><path fill="#${entry[2]}" d="${entry[3]}"/></svg>`;
      letter.remove();
      ic.classList.add('has-lib');
      ic.appendChild(wrap);
      return;
    }
    if (data.customIcon) {
      const img = document.createElement('img');
      img.className = 'tile-img';
      img.alt = '';
      img.draggable = false;
      img.addEventListener('load', () => {
        if (img.naturalWidth > 1) { letter.remove(); ic.classList.add('has-logo'); }
        else img.remove();
      });
      img.addEventListener('error', () => img.remove());
      img.src = data.customIcon;
      ic.appendChild(img);
      return;
    }
    if (data.url) {
      const img = document.createElement('img');
      img.className = 'tile-img';
      img.alt = '';
      img.draggable = false;
      img.addEventListener('load', () => {
        if (img.naturalWidth > 1) { letter.remove(); ic.classList.add('has-logo'); }
        else img.remove();
      });
      ic.appendChild(img);
      loadFaviconImg(img, data.url, () => img.remove());
    }
  }

  // 内置图标库文案（i18n key 风格，便于日后双语迁移）
  const LIBSTR = {
    fromLib: '从图标库选择',
    searchPh: '搜索图标名称…',
    catAll: '全部',
    catCn: '中文常用',
    catGlobal: '全球常用',
    catTool: '工具效率',
    libHint: '选了库图标后优先于网站 logo 显示；与自定义上传二选一，再次点击已选图标可取消'
  };

  // 内置图标库选图器：渲染进 root，返回 { getSlug, clear }
  function buildIconLibPicker(root, initialSlug, onPick) {
    if (!window.ICONLIB) return { getSlug: () => null, clear: () => {} };
    let selected = initialSlug || null;
    let cat = 'all';
    let query = '';

    root.innerHTML = '';

    const search = document.createElement('input');
    search.type = 'text';
    search.className = 'input iconlib-search';
    search.placeholder = LIBSTR.searchPh;
    root.appendChild(search);

    const cats = document.createElement('div');
    cats.className = 'iconlib-cats';
    const catDefs = [
      ['all', LIBSTR.catAll],
      ['cn', LIBSTR.catCn],
      ['global', LIBSTR.catGlobal],
      ['tool', LIBSTR.catTool]
    ];
    const catBtns = {};
    catDefs.forEach(([key, label]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      if (key === cat) btn.classList.add('sel');
      btn.addEventListener('click', () => {
        cat = key;
        Object.keys(catBtns).forEach(k => catBtns[k].classList.toggle('sel', k === cat));
        renderGrid();
      });
      catBtns[key] = btn;
      cats.appendChild(btn);
    });
    root.appendChild(cats);

    const grid = document.createElement('div');
    grid.className = 'iconlib-grid';
    root.appendChild(grid);

    const slugs = Object.keys(ICONLIB);

    function glyphHTML(slug) {
      const entry = ICONLIB[slug];
      return `<svg viewBox="0 0 24 24"><path fill="#${entry[2]}" d="${entry[3]}"/></svg>`;
    }

    function renderGrid() {
      grid.innerHTML = '';
      const q = query.trim().toLowerCase();
      slugs.forEach(slug => {
        const entry = ICONLIB[slug];
        const name = entry[0];
        if (cat !== 'all' && entry[1] !== cat) return;
        if (q && !(String(name).toLowerCase().indexOf(q) >= 0 || slug.toLowerCase().indexOf(q) >= 0)) return;

        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'iconlib-cell' + (slug === selected ? ' sel' : '');

        const glyph = document.createElement('span');
        glyph.className = 'iconlib-glyph';
        glyph.innerHTML = glyphHTML(slug);

        const label = document.createElement('span');
        label.className = 'iconlib-name';
        label.textContent = name;

        cell.appendChild(glyph);
        cell.appendChild(label);
        cell.addEventListener('click', () => {
          selected = (selected === slug) ? null : slug;
          renderGrid();
          if (onPick) onPick(selected);
        });
        grid.appendChild(cell);
      });
    }

    search.addEventListener('input', () => {
      query = search.value || '';
      renderGrid();
    });

    renderGrid();

    return {
      getSlug: () => selected,
      clear: () => { selected = null; renderGrid(); }
    };
  }

  function findItem(id) {
    return state.items.find(item => item.id === id);
  }

  function moveToTrash(item) {
    const index = state.items.indexOf(item);
    if (index !== -1) {
      state.items.splice(index, 1);
      state.trash.push({ ...item, deletedAt: Date.now() });
      if (item.type === 'widget') normalizeWidgetRows();
      if (item.type === 'icon' || item.type === 'folder') resequenceIcons();
      saveState();
    }
  }

  function openUrl(url) {
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    window.open(url, '_blank');
  }

  function overlap(a, b) {
    return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  }

  function firstFreeCell(w, h) {
    const desktopItems = state.items.filter(item => item.desktopId === state.activeDesktop && item.type === 'widget');
    for (let y = 0; ; y++) {
      for (let x = 0; ; x++) {
        let maxCols = { narrow: 3, standard: 4, wide: 6 }[state.settings.contentWidth] || 4;
        const wrapEl0 = document.getElementById('gridWrap');
        if (wrapEl0 && wrapEl0.clientWidth) maxCols = Math.min(maxCols, Math.max(1, Math.floor((wrapEl0.clientWidth + GAP) / PITCH)));
        if (x + w > maxCols) break;
        const candidate = { x, y, w, h };
        const occupied = desktopItems.some(item => overlap(item, candidate));
        if (!occupied) {
          return { x, y };
        }
        // avoid infinite loop, but grid is infinite, so break after some reasonable limit?
        if (x > 100) break;
      }
      if (y > 100) break;
    }
    // fallback
    return { x: 0, y: 0 };
  }

  function renderSidebar() {
    const desktopList = document.getElementById('desktopList');
    if (!desktopList) return;
    desktopList.innerHTML = '';
    state.desktops.forEach(desk => {
      const btn = document.createElement('button');
      btn.className = 'desk-btn';
      btn.dataset.id = desk.id;
      if (desk.id === state.activeDesktop) btn.classList.add('active');
      btn.innerHTML = `<span class="desk-ic">${desk.icon}</span><span class="desk-name">${desk.name}</span>`;
      btn.addEventListener('click', () => {
        if (state.activeDesktop !== desk.id) {
          state.activeDesktop = desk.id;
          saveState();
          rerender();
        }
      });
      desktopList.appendChild(btn);
    });
  }

  // 组件行居中：删/加组件后，把每一行的组件当作一组居中
  function normalizeWidgetRows() {
    const widgets = state.items.filter(i => i.desktopId === state.activeDesktop && i.type === 'widget');
    if (!widgets.length) return;
    let cols = 0;
    widgets.forEach(i => { cols = Math.max(cols, i.x + i.w); });
    const rows = {};
    widgets.forEach(i => { (rows[i.y] = rows[i.y] || []).push(i); });
    Object.values(rows).forEach(row => {
      const minX = Math.min(...row.map(i => i.x));
      const span = Math.max(...row.map(i => i.x + i.w)) - minX;
      const delta = Math.floor((cols - span) / 2) - minX;
      if (delta !== 0) row.forEach(i => { i.x += delta; });
    });
  }

  function iconSeqItems() {
    return state.items
      .filter(i => i.desktopId === state.activeDesktop && (i.type === 'icon' || i.type === 'folder'))
      .sort((a, b) => (a.x - b.x) || (a.y - b.y));
  }

  function resequenceIcons() {
    iconSeqItems().forEach((it, idx) => { it.x = idx; it.y = 0; });
  }

  function moveIconToFolder(itemId, folderId) {
    const item = findItem(itemId);
    const folder = findItem(folderId);
    if (!item || !folder || item.type !== 'icon' || folder.type !== 'folder') return false;
    folder.data.children = folder.data.children || [];
    folder.data.children.push({ ...item.data });
    state.items.splice(state.items.indexOf(item), 1);
    resequenceIcons();
    saveState();
    return true;
  }

  // 路径解析：path=[] 指文件夹根，path=[i] 指其第 i 个子文件夹（仅一级嵌套）
  function folderContainer(folder, path) {
    if (!folder || folder.type !== 'folder') return null;
    if (!path || !path.length) return folder.data;
    const sub = (folder.data.children || [])[path[0]];
    if (!sub || !sub.isFolder) return null;
    sub.children = sub.children || [];
    return sub;
  }

  function moveIconToFolderPath(itemId, folderId, path) {
    const item = findItem(itemId);
    const folder = findItem(folderId);
    if (!item || item.type !== 'icon') return false;
    const box = folderContainer(folder, path);
    if (!box) return false;
    box.children = box.children || [];
    box.children.push({ ...item.data });
    state.items.splice(state.items.indexOf(item), 1);
    resequenceIcons();
    saveState();
    return true;
  }

  function moveChildOutOf(folderId, path, childIdx) {
    const folder = findItem(folderId);
    const box = folderContainer(folder, path);
    if (!box) return false;
    const children = box.children || [];
    if (childIdx < 0 || childIdx >= children.length) return false;
    const child = children.splice(childIdx, 1)[0];
    const seq = iconSeqItems();
    if (child.isFolder) {
      state.items.push({
        id: uid(), desktopId: state.activeDesktop, type: 'folder',
        x: seq.length, y: 0, w: 1, h: 1,
        data: { name: child.name || '文件夹', children: child.children || [] }
      });
    } else {
      state.items.push({
        id: uid(), desktopId: state.activeDesktop, type: 'icon',
        x: seq.length, y: 0, w: 1, h: 1,
        data: { ...child }
      });
    }
    saveState();
    return true;
  }

  // 拖图标压图标：生成一个包含两者的新文件夹，落在目标图标的位置
  function createFolderFromIcons(dragId, targetId) {
    const drag = findItem(dragId);
    const target = findItem(targetId);
    if (!drag || !target || drag.type !== 'icon' || target.type !== 'icon' || drag.id === target.id) return false;
    const folder = {
      id: uid(), desktopId: state.activeDesktop, type: 'folder',
      x: target.x, y: 0, w: 1, h: 1,
      data: { name: '文件夹', children: [{ ...target.data }, { ...drag.data }] }
    };
    state.items.splice(state.items.indexOf(drag), 1);
    state.items.splice(state.items.indexOf(target), 1, folder);
    resequenceIcons();
    saveState();
    return folder;
  }

  // 复制一个元素（右键菜单）：图标/文件夹在序列里紧随其后，组件放第一个空格
  function duplicateItem(item) {
    if (!item) return null;
    const copy = JSON.parse(JSON.stringify(item));
    copy.id = uid();
    if (copy.type === 'widget') {
      const p = firstFreeCell(copy.w, copy.h);
      copy.x = p.x; copy.y = p.y;
      delete copy.free;
      delete copy.cv;
      state.items.push(copy);
      normalizeWidgetRows();
    } else {
      const seq = iconSeqItems();
      const at = seq.findIndex(i => i.id === item.id);
      state.items.push(copy);
      const seq2 = iconSeqItems().filter(i => i.id !== copy.id);
      seq2.splice(at + 1, 0, copy);
      seq2.forEach((x, idx) => { x.x = idx; x.y = 0; });
      if (copy.cv) { copy.cv = { ...copy.cv, x: copy.cv.x + 24, y: copy.cv.y + 24 }; }
    }
    saveState();
    rerender();
    return copy;
  }

  function moveChildOut(folderId, childIdx) {
    const folder = findItem(folderId);
    if (!folder || folder.type !== 'folder') return false;
    const children = folder.data.children || [];
    if (childIdx < 0 || childIdx >= children.length) return false;
    const child = children.splice(childIdx, 1)[0];
    const seq = iconSeqItems();
    state.items.push({
      id: uid(),
      desktopId: state.activeDesktop,
      type: 'icon',
      x: seq.length,
      y: 0,
      w: 1,
      h: 1,
      data: { ...child }
    });
    saveState();
    return true;
  }

  // 构建组件格子（不带几何样式，网格/自由布局共用）
  function buildWidgetCell(item) {
    const cell = document.createElement('div');
    cell.className = 'cell cell-widget';
    cell.dataset.id = item.id;
    cell.dataset.type = item.type;
    const card = document.createElement('div');
    card.className = 'widget-card';
    card.dataset.kind = item.data.kind;
    if (window.WIDGETS && window.WIDGETS[item.data.kind] && typeof window.WIDGETS[item.data.kind].render === 'function') {
      window.WIDGETS[item.data.kind].render(card, item);
    } else {
      card.textContent = '未知组件';
    }
    cell.appendChild(card);
    if (state.settings.showLabels) {
      const label = document.createElement('div');
      label.className = 'cell-label';
      label.textContent = (window.WIDGETS && window.WIDGETS[item.data.kind] && window.WIDGETS[item.data.kind].title) || item.data.kind;
      cell.appendChild(label);
    }
    return cell;
  }

  // 文件夹迷你宫格（文件夹格子与弹窗子文件夹共用）
  function fillFolderMini(ic, children) {
    const mini = document.createElement('div');
    mini.className = 'mini-grid';
    for (let i = 0; i < Math.min(4, children.length); i++) {
      const c = children[i];
      const chip = document.createElement('span');
      if (c.isFolder) {
        chip.style.backgroundColor = '#8a93a6';
      } else if (c.url) {
        const img = document.createElement('img');
        img.alt = '';
        img.draggable = false;
        chip.appendChild(img);
        img.addEventListener('load', () => { if (img.naturalWidth > 1) chip.style.backgroundColor = 'transparent'; });
        loadFaviconImg(img, c.url, () => { img.remove(); chip.style.backgroundColor = c.color || '#ccc'; });
      } else {
        chip.style.backgroundColor = c.color || '#ccc';
      }
      mini.appendChild(chip);
    }
    ic.appendChild(mini);
  }

  // 构建图标/文件夹格子（不带几何样式，网格/自由布局共用）
  function buildIconCell(item) {
    const cell = document.createElement('div');
    cell.className = 'cell ' + (item.type === 'icon' ? 'cell-icon' : 'cell-folder');
    cell.dataset.id = item.id;
    cell.dataset.type = item.type;
    const tile = document.createElement('div');
    tile.className = 'tile';
    const ic = document.createElement('div');
    ic.className = 'tile-ic';
    if (item.type === 'icon') {
      fillTileIcon(ic, item.data);
    } else {
      fillFolderMini(ic, item.data.children || []);
    }
    tile.appendChild(ic);
    cell.appendChild(tile);
    if (state.settings.showLabels) {
      const label = document.createElement('div');
      label.className = 'cell-label';
      label.textContent = item.data.name;
      cell.appendChild(label);
    }
    return cell;
  }

  function renderGrid() {
    const grid = document.getElementById('grid');
    // destroy old widgets
    grid.querySelectorAll('.widget-card').forEach(el => {
      const kind = el.dataset.kind;
      if (kind && window.WIDGETS && window.WIDGETS[kind] && typeof window.WIDGETS[kind].destroy === 'function') {
        window.WIDGETS[kind].destroy(el);
      }
    });
    grid.innerHTML = '';

    const widgets = state.items.filter(item => item.desktopId === state.activeDesktop && item.type === 'widget');
    // v14 响应式：窗口变窄时用布局引擎重排（仅影响渲染，不改 item.x/y，窗口变宽自动恢复）
    let placed = null;
    if (window.NTLayout) {
      const wrapEl = document.getElementById('gridWrap');
      const res = NTLayout.computeAuto(
        state.items.filter(i => i.desktopId === state.activeDesktop),
        { unit: UNIT, gap: GAP, pitch: PITCH, iconCellW: 96, iconCellH: 118,
          canvasW: (wrapEl && wrapEl.clientWidth) || 1020,
          maxWidgetCols: { narrow: 3, standard: 4, wide: 6 }[state.settings.contentWidth] || 4 });
      placed = res.rects;
    }
    const unitPos = (item) => {
      if (placed && placed[item.id]) return { x: Math.round(placed[item.id].x / PITCH), y: Math.round(placed[item.id].y / PITCH) };
      return { x: item.x, y: item.y };
    };
    let maxRight = 0;
    let maxBottom = 0;
    widgets.forEach(item => {
      const p = unitPos(item);
      maxRight = Math.max(maxRight, p.x + item.w);
      maxBottom = Math.max(maxBottom, p.y + item.h);
    });
    grid.style.width = maxRight ? (maxRight * PITCH - GAP) + 'px' : '';
    grid.style.height = maxBottom ? (maxBottom * PITCH - GAP) + 'px' : '0px';
    widgets.forEach(item => {
      const cell = buildWidgetCell(item);
      const p = unitPos(item);
      cell.style.left = (p.x * PITCH) + 'px';
      cell.style.top = (p.y * PITCH) + 'px';
      cell.style.width = (item.w * UNIT + (item.w - 1) * GAP) + 'px';
      cell.style.height = (item.h * UNIT + (item.h - 1) * GAP) + 'px';
      grid.appendChild(cell);
    });
    renderIconGrid();
  }

  function renderIconGrid() {
    const wrap = document.getElementById('iconGrid');
    if (!wrap) return;
    wrap.innerHTML = '';
    iconSeqItems().forEach(item => {
      wrap.appendChild(buildIconCell(item));
    });
  }

  function renderDock() {
    const dock = document.getElementById('dock');
    if (!dock) return;
    dock.innerHTML = '';
    (state.dock || []).forEach((entry, idx) => {
      const btn = document.createElement('button');
      btn.className = 'dock-item';
      const ic = document.createElement('div');
      ic.className = 'tile-ic dock-ic';
      fillTileIcon(ic, { name: entry.name, url: entry.url, letter: (entry.name || '?').charAt(0) });
      btn.appendChild(ic);
      const label = document.createElement('div');
      label.className = 'dock-label';
      label.textContent = entry.name;
      btn.appendChild(label);
      btn.addEventListener('click', () => openUrl(entry.url));
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showCtxMenu(e.clientX, e.clientY, [{ act: 'del', label: '删除快捷方式' }], (act) => {
          if (act === 'del') {
            state.dock.splice(idx, 1);
            saveState();
            renderDock();
          }
        });
      });
      dock.appendChild(btn);
    });
  }

  function rerender() {
    pullEntities();
    renderSidebar();
    if (window.NTDots) NTDots.render();
    if (window.NTFree && NTFree.isFree()) {
      NTFree.render();
    } else {
      if (window.NTFree) NTFree.hide();
      renderGrid();
    }
    renderDock();
  }

  function openModal(title, bodyHTML) {
    const modalRoot = document.getElementById('modalRoot');
    modalRoot.innerHTML = `
      <div class="modal-mask">
        <div class="modal">
          <div class="modal-hd">
            <span>${title}</span>
            <button class="modal-close">✕</button>
          </div>
          <div class="modal-bd"></div>
        </div>
      </div>
    `;
    const bd = modalRoot.querySelector('.modal-bd');
    if (typeof bodyHTML === 'string') {
      bd.innerHTML = bodyHTML;
    } else if (bodyHTML) {
      bd.appendChild(bodyHTML);
    }
    const mask = modalRoot.querySelector('.modal-mask');
    const closeBtn = modalRoot.querySelector('.modal-close');
    closeBtn.addEventListener('click', closeModal);
    mask.addEventListener('click', (e) => {
      if (e.target === mask) closeModal();
    });
    return bd;
  }

  function closeModal() {
    document.getElementById('modalRoot').innerHTML = '';
  }

  function showCtxMenu(x, y, opts, onPick) {
    const ctxMenu = document.getElementById('ctxMenu');
    ctxMenu.innerHTML = '';
    opts.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'ctx-opt';
      btn.dataset.act = opt.act;
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        hideCtxMenu();
        if (onPick) onPick(opt.act);
      });
      ctxMenu.appendChild(btn);
    });
    ctxMenu.style.left = x + 'px';
    ctxMenu.style.top = y + 'px';
    ctxMenu.hidden = false;
  }

  function hideCtxMenu() {
    const ctxMenu = document.getElementById('ctxMenu');
    ctxMenu.hidden = true;
    ctxMenu.innerHTML = '';
  }

  let popFolderId = null;
  let popPath = [];

  function openFolderPop(item, path) {
    const folderPop = document.getElementById('folderPop');
    const folderGrid = folderPop.querySelector('.folder-grid');
    folderGrid.innerHTML = '';
    const box0 = folderContainer(item, path && item.id === popFolderId ? path : []);
    const titleEl = folderPop.querySelector('.folder-pop-title');
    if (titleEl) titleEl.textContent = (path && path.length && box0 ? (box0.name || '文件夹') : (item.data.name || '文件夹'));
    let backBtn = folderPop.querySelector('.pop-back');
    if (path && path.length) {
      if (!backBtn) {
        backBtn = document.createElement('button');
        backBtn.className = 'pop-back';
        backBtn.textContent = '‹';
        backBtn.title = '返回上级';
        backBtn.addEventListener('click', () => { const f = findItem(popFolderId); if (f) openFolderPop(f, []); });
        const header = folderPop.querySelector('.folder-pop-header');
        if (header) header.insertBefore(backBtn, header.firstChild);
      }
      backBtn.hidden = false;
    } else if (backBtn) backBtn.hidden = true;
    if (item.id !== popFolderId) path = [];
    popFolderId = item.id;
    popPath = path || [];
    const box = folderContainer(item, popPath);
    const children = (box && box.children) || [];
    children.forEach((child, idx) => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.dataset.idx = String(idx);
      const ic = document.createElement('div');
      ic.className = 'tile-ic';
      if (child.isFolder) fillFolderMini(ic, child.children || []);
      else fillTileIcon(ic, child);
      tile.appendChild(ic);
      if (state.settings.showLabels) {
        const label = document.createElement('div');
        label.className = 'cell-label';
        label.textContent = child.name;
        tile.appendChild(label);
      }
      tile.addEventListener('click', () => {
        if (suppressClick) { suppressClick = false; return; }
        if (child.isFolder) { suppressPopClose = true; openFolderPop(item, [idx]); return; }
        openUrl(child.url);
        folderPop.hidden = true;
      });
      folderGrid.appendChild(tile);
    });
    folderPop.hidden = false;
  }

  function closeFolderPop() {
    const folderPop = document.getElementById('folderPop');
    folderPop.hidden = true;
    folderPop.querySelector('.folder-grid').innerHTML = '';
    popFolderId = null;
    popPath = [];
  }

  // Drag and drop
  let suppressPopClose = false;

  function reorderIcon(itemId, targetId, after) {
    const seq = iconSeqItems();
    const from = seq.findIndex(i => i.id === itemId);
    if (from === -1) return;
    const [it] = seq.splice(from, 1);
    let to = seq.findIndex(i => i.id === targetId);
    if (to === -1) seq.push(it);
    else { if (after) to += 1; seq.splice(to, 0, it); }
    seq.forEach((x, idx) => { x.x = idx; x.y = 0; });
    saveState();
  }

  function reorderIconToEnd(itemId) {
    const seq = iconSeqItems();
    const from = seq.findIndex(i => i.id === itemId);
    if (from === -1 || from === seq.length - 1) return;
    const [it] = seq.splice(from, 1);
    seq.push(it);
    seq.forEach((x, idx) => { x.x = idx; x.y = 0; });
    saveState();
  }

  function attachDragEvents() {
    const grid = document.getElementById('grid');
    const iconGrid = document.getElementById('iconGrid');
    const folderPop = document.getElementById('folderPop');

    // ---- 组件拖动（大格内移动/交换） ----
    let dragItem = null;
    let startX, startY, origX, origY, isDragging = false;

    grid.addEventListener('pointerdown', (e) => {
      if (isDesktopLocked()) return;
      const cell = e.target.closest('.cell');
      if (!cell) return;
      const id = cell.dataset.id;
      const item = findItem(id);
      if (!item) return;

      dragItem = item;
      startX = e.clientX;
      startY = e.clientY;
      origX = cell.offsetLeft;
      origY = cell.offsetTop;
      isDragging = false;

      const onPointerMove = (ev) => {
        if (!dragItem) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
          isDragging = true;
          cell.classList.add('dragging');
          cell.style.zIndex = 1000;
        }
        if (isDragging) {
          cell.style.transform = `translate(${dx}px, ${dy}px)`;
        }
      };

      const onPointerUp = (ev) => {
        if (!dragItem) return;
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);

        if (isDragging) {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          const newX = clampX(Math.round((origX + dx) / PITCH));
          const newY = clampY(Math.round((origY + dy) / PITCH));

          const candidates = state.items.filter(
            other => other.id !== item.id && other.desktopId === item.desktopId && other.type === 'widget'
          );
          const candidate = { x: newX, y: newY, w: item.w, h: item.h };
          const collided = candidates.find(other => overlap(other, candidate));
          if (collided) {
            const tempX = item.x;
            const tempY = item.y;
            item.x = collided.x;
            item.y = collided.y;
            collided.x = tempX;
            collided.y = tempY;
          } else {
            item.x = newX;
            item.y = newY;
          }
          suppressClick = true;
          saveState();
          rerender();
        }

        cell.classList.remove('dragging');
        cell.style.transform = '';
        cell.style.zIndex = '';
        dragItem = null;
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    });

    // ---- 图标区拖动：排序 / 拖进文件夹 ----
    iconGrid.addEventListener('pointerdown', (e) => {
      if (isDesktopLocked()) return;
      const cell = e.target.closest('.cell');
      if (!cell) return;
      const item = findItem(cell.dataset.id);
      if (!item) return;
      const sx = e.clientX, sy = e.clientY;
      let dragging = false;

      const onMove = (ev) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!dragging && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
          dragging = true;
          cell.classList.add('dragging');
          cell.style.zIndex = 1000;
        }
        if (dragging) {
          cell.style.transform = `translate(${dx}px, ${dy}px)`;
          const under = document.elementFromPoint(ev.clientX, ev.clientY);
          const folderCell = under && under.closest ? under.closest('#iconGrid .cell-folder') : null;
          let mergeCell = null;
          const iconCell = under && under.closest ? under.closest('#iconGrid .cell-icon') : null;
          if (iconCell && iconCell !== cell && item.type === 'icon') {
            const r = iconCell.getBoundingClientRect();
            if (Math.abs(ev.clientX - (r.left + r.width / 2)) < r.width * 0.3 &&
                Math.abs(ev.clientY - (r.top + r.height / 2)) < r.height * 0.3) mergeCell = iconCell;
          }
          iconGrid.querySelectorAll('.cell.drop-target').forEach(c => { if (c !== folderCell && c !== mergeCell) c.classList.remove('drop-target'); });
          if (folderCell && folderCell !== cell && item.type === 'icon') folderCell.classList.add('drop-target');
          if (mergeCell) mergeCell.classList.add('drop-target');
        }
      };

      const onUp = (ev) => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        cell.classList.remove('dragging');
        cell.style.transform = '';
        cell.style.zIndex = '';
        iconGrid.querySelectorAll('.cell.drop-target').forEach(c => c.classList.remove('drop-target'));
        if (!dragging) return;
        suppressClick = true;
        const under = document.elementFromPoint(ev.clientX, ev.clientY);
        if (item.type === 'icon' && popFolderId && !folderPop.hidden && under && folderPop.contains(under)) {
          let dropPath = popPath;
          const popTile = under.closest ? under.closest('#folderPop .tile') : null;
          if (popTile && popPath.length === 0) {
            const f0 = findItem(popFolderId);
            const c0 = f0 && (f0.data.children || [])[parseInt(popTile.dataset.idx, 10)];
            if (c0 && c0.isFolder) dropPath = [parseInt(popTile.dataset.idx, 10)];
          }
          if (moveIconToFolderPath(item.id, popFolderId, dropPath)) {
            suppressPopClose = true;
            rerender();
            const folder = findItem(popFolderId);
            if (folder) openFolderPop(folder, dropPath);
          }
          return;
        }
        const targetCell = under && under.closest ? under.closest('#iconGrid .cell') : null;
        if (targetCell && targetCell !== cell) {
          const targetItem = findItem(targetCell.dataset.id);
          if (targetItem && targetItem.type === 'folder' && item.type === 'icon') {
            moveIconToFolder(item.id, targetItem.id);
            rerender();
            return;
          }
          if (targetItem) {
            const rect = targetCell.getBoundingClientRect();
            const inCenter = Math.abs(ev.clientX - (rect.left + rect.width / 2)) < rect.width * 0.3 &&
                             Math.abs(ev.clientY - (rect.top + rect.height / 2)) < rect.height * 0.3;
            if (inCenter && item.type === 'icon' && targetItem.type === 'icon') {
              const nf = createFolderFromIcons(item.id, targetItem.id);
              if (nf) { rerender(); return; }
            }
            reorderIcon(item.id, targetItem.id, ev.clientX > rect.left + rect.width / 2);
            rerender();
            return;
          }
        }
        if (under && under.closest && under.closest('#iconGrid')) {
          reorderIconToEnd(item.id);
          rerender();
        }
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });

    // ---- 文件夹内图标拖出 ----
    folderPop.addEventListener('pointerdown', (e) => {
      if (isDesktopLocked()) return;
      const tile = e.target.closest('.tile');
      if (!tile || !popFolderId) return;
      const idx = parseInt(tile.dataset.idx, 10);
      if (isNaN(idx)) return;
      const sx = e.clientX, sy = e.clientY;
      let dragging = false;

      const onMove = (ev) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!dragging && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
          dragging = true;
          tile.classList.add('dragging');
          tile.style.zIndex = 1000;
          tile.style.position = 'relative';
        }
        if (dragging) tile.style.transform = `translate(${dx}px, ${dy}px)`;
      };

      const onUp = (ev) => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        tile.classList.remove('dragging');
        tile.style.transform = '';
        tile.style.zIndex = '';
        if (!dragging) return;
        suppressClick = true;
        const folder = findItem(popFolderId);
        if (!folder) return;
        const box = folderContainer(folder, popPath);
        if (!box) return;
        const popRect = folderPop.getBoundingClientRect();
        const outside = ev.clientX < popRect.left || ev.clientX > popRect.right || ev.clientY < popRect.top || ev.clientY > popRect.bottom;
        if (outside) {
          // 拖出到页面：子文件夹整体变成顶层文件夹，普通子项变成图标
          if (moveChildOutOf(popFolderId, popPath, idx)) {
            suppressPopClose = true;
            rerender();
            const f2 = findItem(popFolderId);
            const b2 = f2 && folderContainer(f2, popPath);
            if (b2 && (b2.children || []).length) openFolderPop(f2, popPath);
            else if (popPath.length && f2) openFolderPop(f2, []);
            else closeFolderPop();
          }
          return;
        }
        // 落在弹窗内另一个 tile 上（仅根级）：并入子文件夹 / 两图标生成子文件夹
        const under = document.elementFromPoint(ev.clientX, ev.clientY);
        const targetTile = under && under.closest ? under.closest('#folderPop .tile') : null;
        if (targetTile && targetTile !== tile && popPath.length === 0) {
          const tIdx = parseInt(targetTile.dataset.idx, 10);
          const children = box.children || [];
          const draggedChild = children[idx];
          const targetChild = children[tIdx];
          if (!isNaN(tIdx) && draggedChild && targetChild) {
            if (targetChild.isFolder && !draggedChild.isFolder) {
              targetChild.children = targetChild.children || [];
              targetChild.children.push(draggedChild);
              children.splice(idx, 1);
              saveState();
              suppressPopClose = true;
              rerender();
              openFolderPop(folder, popPath);
            } else if (!targetChild.isFolder && !draggedChild.isFolder) {
              const sub = { name: '文件夹', isFolder: true, children: [targetChild, draggedChild] };
              children.splice(Math.max(idx, tIdx), 1);
              children.splice(Math.min(idx, tIdx), 1, sub);
              saveState();
              suppressPopClose = true;
              rerender();
              openFolderPop(folder, popPath);
            }
          }
        }
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });
  }

  function attachGlobalClickEvents() {
    const grid = document.getElementById('grid');
    const onCellClick = (e) => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      const cell = e.target.closest('.cell');
      if (!cell) return;
      const id = cell.dataset.id;
      const item = findItem(id);
      if (!item) return;
      if (item.type === 'icon') {
        openUrl(item.data.url);
      } else if (item.type === 'folder') {
        openFolderPop(item);
      }
      // widget click handled by widget itself
    };
    grid.addEventListener('click', onCellClick);
    const iconGrid = document.getElementById('iconGrid');
    if (iconGrid) iconGrid.addEventListener('click', onCellClick);
  }

  function init() {
    loadState();
    rerender();
    attachDragEvents();
    const folderCloseBtn = document.querySelector('[data-close-folder]');
    if (folderCloseBtn) folderCloseBtn.addEventListener('click', closeFolderPop);
    // 图标区禁用浏览器原生拖拽（logo 图片会抢走拖动，导致文件夹拖拽失效）
    document.addEventListener('dragstart', (e) => {
      if (e.target && e.target.closest && e.target.closest('#grid, #iconGrid, #folderPop')) e.preventDefault();
    });
    attachGlobalClickEvents();
    // 新的一次按下意味着上一次拖动的收尾 click 已过去，清掉残留的点击抑制，避免下一次点击被吞
    document.addEventListener('pointerdown', () => { suppressClick = false; }, true);

    document.getElementById('btnAddDesktop')?.addEventListener('click', () => {
      if (window.NTDialogs && typeof window.NTDialogs.openAddDesktop === 'function') {
        window.NTDialogs.openAddDesktop();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        closeFolderPop();
        hideCtxMenu();
      }
    });

    let rzTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(rzTimer);
      rzTimer = setTimeout(() => {
        rerender();
      }, 150);
    });
    document.addEventListener('click', (e) => {
      if (suppressPopClose) {
        suppressPopClose = false;
        return;
      }
      const folderPop = document.getElementById('folderPop');
      if (!folderPop.hidden && !folderPop.contains(e.target) && !e.target.closest('.cell')) {
        closeFolderPop();
      }
    });

    // 右键菜单：点到菜单外（左键）就关掉
    document.addEventListener('click', (e) => {
      if (e.button !== 0) return;
      const ctxMenu = document.getElementById('ctxMenu');
      if (ctxMenu && !ctxMenu.hidden && !ctxMenu.contains(e.target)) {
        hideCtxMenu();
      }
    });
  }

  window.NTToast = function (msg) {
    var old = document.getElementById('ntToast');
    if (old) old.remove();
    var el = document.createElement('div');
    el.id = 'ntToast';
    el.textContent = msg;
    el.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:9999;background:rgba(20,20,25,.92);color:#fff;padding:9px 16px;border-radius:10px;font-size:13px;max-width:86vw;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.25)';
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2200);
  };

  function escHtml(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  window.NT = {
    get state() { return state; },
    saveState,
    esc: escHtml,
    rerender,
    openModal,
    closeModal,
    showCtxMenu,
    hideCtxMenu,
    uid,
    firstFreeCell,
    openUrl,
    findItem,
    moveToTrash,
    normalizeWidgetRows,
    moveIconToFolder,
    moveChildOut,
    moveIconToFolderPath,
    moveChildOutOf,
    createFolderFromIcons,
    duplicateItem,
    addToDesktop,
    importBookmarkFolder,
    isLocked: isDesktopLocked,
    buildWidgetCell,
    buildIconCell,
    buildIconLibPicker,
    t: (s) => (window.NTI18N ? NTI18N.t(s) : s),
    openFolderPop,
    closeFolderPop,
    PALETTE,
    UNIT,
    GAP,
    PITCH
  };

  document.addEventListener('DOMContentLoaded', init);
})();
