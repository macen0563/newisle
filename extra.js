(function () {
  'use strict';

  const ENGINES = {
    bing: ['必应', 'https://www.bing.com/search?q=%s'],
    baidu: ['百度', 'https://www.baidu.com/s?wd=%s'],
    google: ['Google', 'https://www.google.com/search?q=%s'],
    sogou: ['搜狗', 'https://www.sogou.com/web?query=%s'],
    '360': ['360', 'https://www.so.com/s?q=%s'],
    duck: ['DuckDuckGo', 'https://duckduckgo.com/?q=%s'],
    custom: ['自定义', '']
  };

  const ENGINE_ORDER = ['bing', 'baidu', 'google', 'sogou', '360', 'duck', 'custom'];

  function setEngineIcon(key) {
    const img = document.getElementById('engineIcon');
    if (!img) return;
    if (!img.dataset.bound) {
      img.dataset.bound = '1';
      img.addEventListener('error', () => { img.hidden = true; });
    }
    let host = '';
    try {
      const st = window.NT && window.NT.state;
      const tpl = key === 'custom' ? ((st && st.settings.customEngine) || '') : (ENGINES[key] ? ENGINES[key][1] : '');
      if (tpl) host = new URL(tpl.replace('%s', 'x')).hostname;
    } catch (e) { host = ''; }
    if (!host) { img.hidden = true; return; }
    img.hidden = false;
    img.src = 'https://www.google.com/s2/favicons?domain=' + host + '&sz=64';
  }
  const GRADIENTS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'];
  const BUILTIN_WALLPAPERS = [
  { file: 'assets/wallpaper-dawn.jpg',     title: '晨雾（内置壁纸）', cls: 'wp-photo'   },
  { file: 'assets/wallpaper-river.jpg',    title: '河岸（内置壁纸）', cls: 'wp-photo-2' },
  { file: 'assets/wallpaper-mountain.jpg', title: '山地（内置壁纸）', cls: 'wp-photo-3' },
  { file: 'assets/wallpaper-forest.jpg',   title: '森林（内置壁纸）', cls: 'wp-photo-4' },
  { file: 'assets/wallpaper-fog.jpg',      title: '雾海（内置壁纸）', cls: 'wp-photo-5' },
  { file: 'assets/wallpaper-station.jpg',  title: '车站（内置壁纸）', cls: 'wp-photo-6' },
];
  const WIDGET_ORDER = ['analog', 'datecard', 'weather', 'todo', 'note', 'pomodoro', 'birthday', 'quote', 'worldclock', 'calc', 'unitconv', 'countdown2', 'habit', 'fx', 'onthisday', 'news', 'hot'];

  const getState = () => NT.state;
  const saveState = () => NT.saveState();
  const rerender = () => NT.rerender();
  const closeModal = () => NT.closeModal();
  const openModal = (title, html) => NT.openModal(title, html);

  function getNextNewYear() {
    const now = new Date();
    const year = now.getFullYear();
    const afterJan1 = (now.getMonth() > 0) || (now.getMonth() === 0 && now.getDate() > 1);
    return `${afterJan1 ? year + 1 : year}-01-01`;
  }

  function applyAppearance() {
    const s = getState().settings;
    const wrap = document.getElementById('gridWrap');
    if (wrap) {
      wrap.style.maxWidth = { narrow: '780px', standard: '1020px', wide: '1260px' }[s.contentWidth] || '1020px';
      wrap.style.margin = '0 auto';
    }
    const btnAdd = document.getElementById('btnAdd');
    if (btnAdd) btnAdd.style.display = s.hideAdd ? 'none' : '';
  }

  function idbOpen() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('indexedDB unavailable')); return; }
      const openReq = (ver) => {
        let req;
        try { req = ver ? indexedDB.open('nt_media_v1', ver) : indexedDB.open('nt_media_v1'); } catch (e) { reject(e); return; }
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('images')) db.createObjectStore('images');
        };
        req.onsuccess = () => {
          const db = req.result;
          if (db.objectStoreNames.contains('images')) { resolve(db); return; }
          // 库已存在但缺 images 表（异常状态）：关掉后升一版重开补建，避免备份恢复时写不进去
          const nextVer = db.version + 1;
          try { db.close(); } catch (e) {}
          openReq(nextVer);
        };
        req.onerror = () => reject(req.error || new Error('idb open failed'));
      };
      openReq(0);
    });
  }

  async function idbPut(id, str) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      let tx;
      try { tx = db.transaction('images', 'readwrite'); } catch (e) { reject(e); return; }
      try { tx.objectStore('images').put(str, id); } catch (e) { reject(e); return; }
      tx.oncomplete = () => { try { db.close(); } catch (e) {} resolve(true); };
      tx.onerror = () => { try { db.close(); } catch (e) {} reject(tx.error || new Error('idb put failed')); };
      tx.onabort = () => { try { db.close(); } catch (e) {} reject(tx.error || new Error('idb put aborted')); };
    });
  }

  async function idbGet(id) {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      let tx;
      try { tx = db.transaction('images', 'readonly'); } catch (e) { reject(e); return; }
      const req = tx.objectStore('images').get(id);
      req.onsuccess = () => {
        const val = req.result;
        try { db.close(); } catch (e) {}
        resolve(val == null ? null : val);
      };
      req.onerror = () => { try { db.close(); } catch (e) {} reject(req.error || new Error('idb get failed')); };
    });
  }

  function wpIdFor(dataUrl) {
    let h = 5381;
    for (let i = 0; i < dataUrl.length; i += 7) {
      h = ((h << 5) + h + dataUrl.charCodeAt(i)) >>> 0;
    }
    return 'wp_' + h.toString(36) + '_' + dataUrl.length;
  }

  async function storeWallpaperDataUrl(dataUrl) {
    if (typeof dataUrl !== 'string' || dataUrl.indexOf('data:') !== 0) return dataUrl;
    const id = wpIdFor(dataUrl);
    try {
      await idbPut(id, dataUrl);
      return 'idb:' + id;
    } catch (e) {
      return dataUrl;
    }
  }

  function applyWallpaper() {
    const s = getState().settings;
    const wp = s.wallpaper;
    const bg = document.getElementById('bg');
    if (!bg) return;
    // 原「设置图片背景」动作收拢到 setImg，三个分支共用
    const setImg = (src) => {
      bg.className = '';
      bg.style.backgroundImage = `url("${src}")`;
      bg.style.backgroundSize = 'cover';
      bg.style.backgroundPosition = 'center';
    };
    const setGradient = (name) => {
      bg.className = 'wp-' + name;
      bg.style.backgroundImage = '';
    };
    const v = wp.value;
    if (wp.type === 'gradient') {
      setGradient(v);
    } else if (typeof v === 'string' && v.indexOf('idb:') === 0) {
      // 引用 IndexedDB：先按默认渐变兜底，取回后再换成图片
      const ref = v;
      setGradient('g1');
      idbGet(ref.slice(4)).then((dataUrl) => {
        const cur = getState().settings.wallpaper;
        if (dataUrl && cur && cur.value === ref) setImg(dataUrl);
      }).catch(() => {});
    } else if (typeof v === 'string' && v.indexOf('data:') === 0) {
      // 旧数据未迁移：先立即显示，再异步迁到 IndexedDB 并改写状态为引用
      const oldValue = v;
      setImg(oldValue);
      storeWallpaperDataUrl(oldValue).then((ref) => {
        if (typeof ref === 'string' && ref.indexOf('idb:') === 0) {
          const st = getState();
          if (st.settings.wallpaper && st.settings.wallpaper.value === oldValue) {
            st.settings.wallpaper.value = ref;
            saveState();
          }
        }
      }).catch(() => {});
    } else {
      setImg(v);
    }
    bg.style.filter = s.blur ? 'blur(' + s.blur + 'px)' : '';
    bg.style.transform = s.blur ? 'scale(1.08)' : '';
    applyAppearance();
    const dim = document.getElementById('bgDim');
    if (dim) {
      dim.style.background = `rgba(0,0,0,${(s.dim || 0) / 100})`;
    }
    updateWpTheme(wp);
    const grid = document.getElementById('grid');
    if (grid) {
      grid.dataset.iconsize = s.iconSize || 'm';
    }
    const iconGrid = document.getElementById('iconGrid');
    if (iconGrid) {
      iconGrid.dataset.iconsize = s.iconSize || 'm';
    }
  }
function blobToWallpaperDataURL(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        // 提升壁纸压缩上限与质量，并回传压缩后尺寸供 Worker 尺寸重试判断
        const maxDim = 3840;
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w >= h) { h = Math.round(h / w * maxDim); w = maxDim; }
          else { w = Math.round(w / h * maxDim); h = maxDim; }
        }
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve({ dataUrl: cv.toDataURL('image/jpeg', 0.92), width: w, height: h });
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  const GRADIENT_STOPS = {
    g1: ['#f6f0ff', '#e8f4f8'], g2: ['#fef3e8', '#fde9f0'], g3: ['#e8f9f2', '#eef3ff'],
    g4: ['#fff9e6', '#f5e6ff'], g5: ['#e6f6ff', '#f0e6ff'], g6: ['#f5f5f7', '#e6e6f0']
  };
  function hexLum(hex) {
    const n = parseInt(hex.slice(1), 16);
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  }
  function setWpTheme(lum) {
    const s = getState().settings;
    if (s.darkMode === 'dark') { document.body.dataset.wp = 'dark'; return; }
    if (s.darkMode === 'light') { document.body.dataset.wp = 'light'; return; }
    const eff = lum * (1 - (s.dim || 0) / 100 * 0.9);
    document.body.dataset.wp = eff > 0.55 ? 'light' : 'dark';
  }
  function updateWpTheme(wp) {
    if (wp.type === 'gradient') {
      const stops = GRADIENT_STOPS[wp.value] || GRADIENT_STOPS.g1;
      setWpTheme(stops.reduce((a, h) => a + hexLum(h), 0) / stops.length);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = 16; cv.height = 16;
        const cx = cv.getContext('2d');
        cx.drawImage(img, 0, 0, 16, 16);
        const d = cx.getImageData(0, 0, 16, 16).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        setWpTheme(sum / (d.length / 4) / 255);
      } catch (e) {
        document.body.dataset.wp = 'light';
      }
    };
    img.onerror = () => { document.body.dataset.wp = 'light'; };
    if (typeof wp.value === 'string' && wp.value.indexOf('idb:') === 0) {
      idbGet(wp.value.slice(4)).then((d) => { if (d) img.src = d; else document.body.dataset.wp = 'light'; }).catch(() => { document.body.dataset.wp = 'light'; });
    } else {
      img.src = wp.value;
    }
  }

  function fileToIconDataURL(file, cb) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = 128; cv.height = 128;
        const cx = cv.getContext('2d');
        const scale = Math.min(128 / img.width, 128 / img.height);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        cx.drawImage(img, (128 - w) / 2, (128 - h) / 2, w, h);
        cb(cv.toDataURL('image/png'));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderEngineMenu() {
    const menu = document.getElementById('engineMenu');
    if (!menu) return;
    const current = getState().settings.engine || 'bing';
    let html = '';
    for (const key of ENGINE_ORDER) {
      const [label] = ENGINES[key];
      const check = key === current ? ' ✓' : '';
      html += `<button type="button" class="engine-opt" data-engine="${key}">${label}${check}</button>`;
    }
    menu.innerHTML = html;
  }

  function initEngineName() {
    const s = getState().settings;
    const label = ENGINES[s.engine] ? ENGINES[s.engine][0] : ENGINES.bing[0];
    const nameEl = document.getElementById('engineName');
    if (nameEl) nameEl.textContent = label;
    setEngineIcon(s.engine || 'bing');
  }

  function handleAddIcon() {
    const state = getState();
    const modalBd = openModal('添加图标', `
      <div class="modal-form">
        <label>名称</label>
        <input type="text" id="iconName" placeholder="网站名称">
        <label>网址</label>
        <input type="text" id="iconUrl" placeholder="https://example.com">
        <label>自定义图标（可选）</label>
        <input type="file" id="iconFile" accept="image/*">
        <label>从图标库选择</label><div id="iconLibPick"></div>
        <button type="button" id="confirmAddIcon" class="primary-btn">添加</button>
      </div>
    `);
    let pendingIcon = null;
    let pendingLib = null;
    const libPicker = NT.buildIconLibPicker(modalBd.querySelector('#iconLibPick'), null, (slug) => { pendingLib = slug; if (slug) pendingIcon = null; });
    modalBd.querySelector('#iconFile').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (f) fileToIconDataURL(f, (url) => { pendingIcon = url; pendingLib = null; if (libPicker) libPicker.clear(); });
    });
    modalBd.querySelector('#confirmAddIcon').addEventListener('click', () => {
      const nameInput = modalBd.querySelector('#iconName');
      const urlInput = modalBd.querySelector('#iconUrl');
      let name = nameInput.value.trim();
      const url = urlInput.value.trim();
      if (!name) name = '未命名';
      const colorIndex = state.items.length % 6;
      const pos = { x: state.items.filter(i => i.type === 'icon' || i.type === 'folder').length, y: 0 };
      const newItem = {
        id: NT.uid(),
        desktopId: state.activeDesktop,
        type: 'icon',
        x: pos.x,
        y: pos.y,
        w: 1,
        h: 1,
        data: {
          name: name,
          url: url,
          color: NT.PALETTE[colorIndex] || '#5b8def',
          letter: name.charAt(0) || '?',
          ...(pendingIcon ? { customIcon: pendingIcon } : {}),
          ...(!pendingIcon && pendingLib ? { iconLib: pendingLib } : {})
        }
      };
      state.items.push(newItem);
      saveState();
      rerender();
      closeModal();
      document.getElementById('addMenu').hidden = true;
    });
  }

  function handleAddFolder() {
    const state = getState();
    const modalBd = openModal('添加文件夹', `
      <div class="modal-form">
        <label>名称</label>
        <input type="text" id="folderName" placeholder="文件夹名称">
        <button type="button" id="confirmAddFolder" class="primary-btn">添加</button>
      </div>
    `);
    modalBd.querySelector('#confirmAddFolder').addEventListener('click', () => {
      const nameInput = modalBd.querySelector('#folderName');
      let name = nameInput.value.trim();
      if (!name) name = '新建文件夹';
      const pos = { x: state.items.filter(i => i.type === 'icon' || i.type === 'folder').length, y: 0 };
      const newItem = {
        id: NT.uid(),
        desktopId: state.activeDesktop,
        type: 'folder',
        x: pos.x,
        y: pos.y,
        w: 1,
        h: 1,
        data: {
          name: name,
          color: '#ffb020',
          children: []
        }
      };
      state.items.push(newItem);
      saveState();
      rerender();
      closeModal();
      document.getElementById('addMenu').hidden = true;
    });
  }

  function handleAddWidget() {
    const state = getState();
    let html = '<div class="widget-pick-grid">';
    for (const kind of WIDGET_ORDER) {
      const w = window.WIDGETS[kind];
      if (!w) continue;
      html += `<button type="button" class="widget-pick" data-kind="${kind}">
                 <span class="widget-pick-title">${w.title}</span>
                 <span class="widget-pick-size">${w.w}×${w.h}</span>
               </button>`;
    }
    html += '</div>';
    const modalBd = openModal('添加组件', html);
    modalBd.addEventListener('click', (e) => {
      const pick = e.target.closest('.widget-pick');
      if (!pick) return;
      const kind = pick.dataset.kind;
      const w = window.WIDGETS[kind];
      if (!w) return;
      const pos = NT.firstFreeCell(w.w, w.h);
      let data;
      if (kind === 'clock' || kind === 'analog') {
        data = { kind: kind };
      } else if (kind === 'datecard') {
        data = { kind: 'datecard', title: '元旦', date: getNextNewYear() };
      } else if (kind === 'weather') {
        data = { kind: 'weather', city: '北京' };
      }
      else if (kind === 'todo') { data = { kind: 'todo', todos: [] }; }
      else if (kind === 'note') { data = { kind: 'note', text: '' }; }
      else if (kind === 'pomodoro') { data = { kind: 'pomodoro', focusMin: 25 }; }
      else if (kind === 'birthday') { data = { kind: 'birthday', list: [] }; }
      else if (kind === 'quote') { data = { kind: 'quote' }; }
      else if (kind === 'worldclock' || kind === 'calc' || kind === 'unitconv' || kind === 'countdown2' || kind === 'habit') { data = { kind: kind }; }
      const newItem = {
        id: NT.uid(),
        desktopId: state.activeDesktop,
        type: 'widget',
        x: pos.x,
        y: pos.y,
        w: w.w,
        h: w.h,
        data: data
      };
      state.items.push(newItem);
      NT.normalizeWidgetRows();
      saveState();
      rerender();
      closeModal();
      document.getElementById('addMenu').hidden = true;
    });
  }

// 引导已见标记（Quick Tap 版本需整体改名，仅改这一处常量即可）
const OBKEY = 'nt_onboarded_v1';

function maybeShowOnboarding() {
  if (localStorage.getItem(OBKEY)) return;
  // 立刻写入，防止重复弹窗
  localStorage.setItem(OBKEY, '1');

  const modalBody = openModal('欢迎使用', `
    <div class="onboard-wrap">
      <p>选择开始方式，之后随时可以在设置里调整。</p>
      <div class="onboard-actions" style="display:flex;gap:12px;margin-top:16px;justify-content:flex-end;">
        <button type="button" id="obSample" class="primary-btn">使用示例桌面</button>
        <button type="button" id="obBlank">从空白开始</button>
      </div>
    </div>
  `);

  const sampleBtn = modalBody.querySelector('#obSample');
  const blankBtn = modalBody.querySelector('#obBlank');

  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      // 默认桌面本身已预置示例内容，保持原样即可
      closeModal();
    });
  }

  if (blankBtn) {
    blankBtn.addEventListener('click', () => {
      const st = getState();
      const now = Date.now();
      const kept = [];
      for (let i = 0; i < st.items.length; i++) {
        const it = st.items[i];
        if (it.desktopId === st.activeDesktop) {
          st.trash.push(Object.assign({}, it, { deletedAt: now }));
        } else {
          kept.push(it);
        }
      }
      // 原地替换，保持 st.items 引用不变
      st.items.length = 0;
      for (let i = 0; i < kept.length; i++) st.items.push(kept[i]);

      saveState();
      rerender();
      closeModal();
      NTToast('已清空桌面，删除的内容可在设置-回收站恢复');
    });
  }
}

function parseBatchUrls(text) {
  const out = [];
  const seen = new Set();
  const lines = String(text || '').split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 每行只取第一个空白分隔的 token
    const token = line.split(/\s+/)[0];
    if (!token) continue;

    let raw = token;
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw)) raw = 'https://' + raw;

    let u;
    try {
      u = new URL(raw);
    } catch (e) {
      continue;
    }

    if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
    if (u.hostname.indexOf('.') === -1) continue;

    // 规范化为 origin + pathname，去掉尾部 '/'（根路径即只剩 origin）；主机名统一去掉 www. 前缀便于去重
    const bareHost = u.hostname.replace(/^www\./i, '');
    let url = (u.protocol + '//' + bareHost + (u.port ? ':' + u.port : '') + u.pathname).replace(/\/+$/, '');
    if (!url) url = u.origin;

    if (seen.has(url)) continue;
    seen.add(url);

    // name：hostname 去 'www.' 前缀后的第一段，首字母大写
    const host = u.hostname.replace(/^www\./i, '');
    const first = host.split('.')[0] || host;
    const name = first ? (first.charAt(0).toUpperCase() + first.slice(1)) : host;

    out.push({ url: url, name: name });
  }

  return out;
}

function handleBatchAdd() {
  const modalBody = openModal('批量添加网址', `
    <div class="batch-add">
      <p>每行一个网址，最多 20 个。</p>
      <textarea id="batchText" rows="8" style="width:100%;" placeholder="https://example.com"></textarea>
      <div style="margin-top:12px;text-align:right;">
        <button type="button" id="confirmBatchAdd" class="primary-btn">添加</button>
      </div>
    </div>
  `);

  const ta = modalBody.querySelector('#batchText');
  const confirmBtn = modalBody.querySelector('#confirmBatchAdd');
  if (!confirmBtn) return;

  confirmBtn.addEventListener('click', () => {
    const rawText = ta ? ta.value : '';
    const parsed = parseBatchUrls(rawText);

    if (!parsed.length) {
      NTToast('没有识别到有效网址');
      return;
    }

    const OVER_LIMIT = 20;
    const overCount = parsed.length > OVER_LIMIT ? parsed.length - OVER_LIMIT : 0;
    const list = parsed.slice(0, OVER_LIMIT);

    const st = getState();
    const desktopId = st.activeDesktop;

    // 与当前桌面已有图标去重
    const existing = new Set();
    let baseX = 0;
    for (let i = 0; i < st.items.length; i++) {
      const it = st.items[i];
      if (it.desktopId !== desktopId) continue;
      if (it.type === 'icon') {
        baseX++;
        if (it.data && it.data.url) existing.add(String(it.data.url).replace(/\/+$/, ''));
      }
    }

    let added = 0;
    let dupCount = 0;
    const palette = (NT && NT.PALETTE && NT.PALETTE.length) ? NT.PALETTE : ['#6c8cff'];

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (existing.has(item.url)) {
        dupCount++;
        continue;
      }
      existing.add(item.url);

      const letter = (item.name || '?').charAt(0).toUpperCase();
      st.items.push({
        id: NT.uid(),
        desktopId: desktopId,
        type: 'icon',
        x: baseX + added,
        y: 0,
        w: 1,
        h: 1,
        data: {
          name: item.name,
          url: item.url,
          color: palette[(baseX + added) % palette.length],
          letter: letter
        }
      });
      added++;
    }

    saveState();
    rerender();
    closeModal();

    const addMenu = document.getElementById('addMenu');
    if (addMenu) addMenu.hidden = true;

    const totalRaw = rawText.split(/\r?\n/).filter((l) => l.trim()).length;
    const skipped = totalRaw - added - overCount;

    let msg = TT('已添加 ') + added + TT(' 个');
    if (skipped > 0) msg += TT('，跳过 ') + skipped + TT(' 个（无效或重复）');
    if (overCount > 0) msg += TT('，超出上限的 ') + overCount + TT(' 个未添加');
    NTToast(msg);
  });
}

function applySearchStyle() {
  var form = document.getElementById('searchForm');
  if (!form) return;
  var st = getState().settings || {};
  var v = st.searchStyle;
  form.dataset.style = (v === 's' || v === 'l') ? v : 'm';
}

var _minimalTimer = null;

function applyMinimal() {
  var st = getState().settings || {};
  var on = !!st.minimalMode;
  document.body.classList.toggle('minimal', on);
  var layer = document.getElementById('minimalLayer');

  if (on) {
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'minimalLayer';
      layer.innerHTML = '<div class="min-clock">--:--</div><div class="min-date"></div><button type="button" id="minExit">退出极简模式</button>';
      document.body.appendChild(layer);
      var exitBtn = document.getElementById('minExit');
      if (exitBtn) {
        exitBtn.addEventListener('click', function () {
          getState().settings.minimalMode = false;
          saveState();
          applyMinimal();
          rerender();
        });
      }
    }
    var tick = function () {
      var now = new Date();
      var hh = String(now.getHours()).padStart(2, '0');
      var mm = String(now.getMinutes()).padStart(2, '0');
      var clockEl = layer.querySelector('.min-clock');
      var dateEl = layer.querySelector('.min-date');
      if (clockEl) clockEl.textContent = hh + ':' + mm;
      if (dateEl) dateEl.textContent = (now.getMonth() + 1) + '月' + now.getDate() + '日 星期' + ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
    };
    tick();
    if (_minimalTimer) clearInterval(_minimalTimer);
    _minimalTimer = setInterval(tick, 1000);
  } else {
    if (_minimalTimer) { clearInterval(_minimalTimer); _minimalTimer = null; }
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
  }
}

  // ===== 桌面独立壁纸 =====
  let _lastWpRef = null;
  let _deskWpObs = null;

  function getEffectiveWallpaper() {
    const st = getState();
    const desk = (st.desktops || []).find(d => d.id === st.activeDesktop);
    if (desk && desk.wallpaper) return desk.wallpaper;
    return st.settings.wallpaper;
  }

  function setWallpaperEverywhere(wp) {
    const st = getState();
    st.settings.wallpaper = wp;
    const desk = (st.desktops || []).find(d => d.id === st.activeDesktop);
    if (desk) delete desk.wallpaper;
    saveState();
    applyWallpaperPerDesk();
  }


  function applyWallpaperPerDesk() {
    const st = getState();
    const desk = (st.desktops || []).find(d => d.id === st.activeDesktop);
    if (desk && desk.wallpaper) {
      const saved = st.settings.wallpaper;
      st.settings.wallpaper = desk.wallpaper;
      try { applyWallpaper(); } finally {
        if (st.settings.wallpaper !== desk.wallpaper) { desk.wallpaper = st.settings.wallpaper; }
        st.settings.wallpaper = saved;
      }
      saveState();
    } else {
      applyWallpaper();
    }
  }


  // PATCH: desk-watch —— 监听 #dotsNav 子节点变化感知桌面切换
  function initDeskWpWatch() {
    _lastWpRef = getEffectiveWallpaper();
    if (_deskWpObs) return;
    const nav = document.getElementById('dotsNav');
    if (!nav) return;
    _deskWpObs = new MutationObserver(() => {
      const cur = getEffectiveWallpaper();
      if (cur !== _lastWpRef) {
        _lastWpRef = cur;
        applyWallpaperPerDesk();
      }
    });
    _deskWpObs.observe(nav, { childList: true });
  }

  // ===== 壁纸写入分发 =====
  function commitWallpaper(wp) {
    const st = getState();
    const desk = (st.desktops || []).find(d => d.id === st.activeDesktop);
    if (desk && desk.wallpaper) {
      desk.wallpaper = wp;
    } else {
      st.settings.wallpaper = wp;
    }
    saveState();
    applyWallpaperPerDesk();
  }

  // ===== 主题 =====
  function themeSnapshot() {
    const s = getState().settings;
    return {
      wallpaper: JSON.parse(JSON.stringify(s.wallpaper || {})),
      dim: s.dim,
      blur: s.blur,
      darkMode: s.darkMode,
      iconSize: s.iconSize,
      contentWidth: s.contentWidth,
      searchStyle: s.searchStyle
    };
  }

  function applyTheme(id) {
    const st = getState();
    const s = st.settings;
    const t = (s.themes || []).find(x => x.id === id);
    if (!t) return;
    const snap = t.snap || {};

    if (snap.wallpaper) s.wallpaper = JSON.parse(JSON.stringify(snap.wallpaper));
    ['dim', 'blur', 'darkMode', 'iconSize', 'contentWidth', 'searchStyle'].forEach(k => {
      if (snap[k] !== undefined) s[k] = snap[k];
    });
    s.activeThemeId = id;

    // 清除当前桌面的独立壁纸，保证主题效果立即可见
    const desk = (st.desktops || []).find(d => d.id === st.activeDesktop);
    if (desk) delete desk.wallpaper;

    saveState();
    applyWallpaperPerDesk();
    rerender();
    if (typeof window.NTToast === 'function') window.NTToast(TT('已应用主题「') + t.name + TT('」'));
  }

  function saveThemeAs(name) {
    const s = getState().settings;
    if (!Array.isArray(s.themes)) s.themes = [];
    const id = (window.NT && typeof window.NT.uid === 'function')
      ? window.NT.uid()
      : ('theme_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
    const t = { id, name: name, snap: themeSnapshot() };
    s.themes.push(t);
    s.activeThemeId = id;
    saveState();
    return t;
  }

  function deleteTheme(id) {
    const s = getState().settings;
    s.themes = (s.themes || []).filter(t => t.id !== id);
    if (s.activeThemeId === id) s.activeThemeId = null;
    saveState();
  }

  function bindThemeSettings(modalBd) {
    const root = modalBd || document;
    const listEl = root.querySelector('#themeList');
    const nameEl = root.querySelector('#themeName');
    const saveBtn = root.querySelector('#themeSaveBtn');
    const deskWpCheck = root.querySelector('#deskWpCheck');

    const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

    const renderThemeList = () => {
      if (!listEl) return;
      const s = getState().settings;
      const themes = s.themes || [];
      if (!themes.length) {
        listEl.innerHTML = '<div style="opacity:.6;font-size:12px;">暂无主题，先保存一个。</div>';
        return;
      }
      listEl.innerHTML = themes.map(t => {
        const cur = s.activeThemeId === t.id;
        return '<div class="theme-row" data-theme-id="' + esc(t.id) + '" style="display:flex;align-items:center;gap:8px;padding:6px 0;">'
          + '<span style="flex:1;">' + esc(t.name) + (cur ? '（当前）' : '') + '</span>'
          + '<button type="button" data-theme-apply="' + esc(t.id) + '">应用</button>'
          + '<button type="button" data-theme-del="' + esc(t.id) + '">删除</button>'
          + '</div>';
      }).join('');
    };

    renderThemeList();

    if (listEl) {
      listEl.addEventListener('click', (e) => {
        const applyBtn = e.target.closest('[data-theme-apply]');
        if (applyBtn) {
          applyTheme(applyBtn.getAttribute('data-theme-apply'));
          renderThemeList();
          return;
        }
        const delBtn = e.target.closest('[data-theme-del]');
        if (delBtn) {
          deleteTheme(delBtn.getAttribute('data-theme-del'));
          renderThemeList();
        }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const s = getState().settings;
        const n = (s.themes || []).length + 1;
        const raw = nameEl ? String(nameEl.value || '').trim() : '';
        const name = raw || ('主题 ' + n);
        saveThemeAs(name);
        if (typeof openSettings === 'function') openSettings();
      });
    }

    if (deskWpCheck) {
      deskWpCheck.addEventListener('change', () => {
        const st = getState();
        const desk = (st.desktops || []).find(d => d.id === st.activeDesktop);
        if (!desk) return;
        if (deskWpCheck.checked) {
          desk.wallpaper = JSON.parse(JSON.stringify(st.settings.wallpaper || {}));
        } else {
          delete desk.wallpaper;
        }
        saveState();
        _lastWpRef = getEffectiveWallpaper();
        applyWallpaperPerDesk();
      });
    }
  }

  // ===== 桌面切换快捷键 =====
  function initDesktopKeys() {
    if (window._deskKeysBound) return;
    window._deskKeysBound = true;

    document.addEventListener('keydown', function (e) {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (t && t.id === 'searchInput') return;
      if (document.querySelector('#modalRoot .modal')) return;
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

      const st = getState();
      const desks = st.desktops || [];
      if (!desks.length) return;

      let targetId = null;

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const idx = desks.findIndex(d => d.id === st.activeDesktop);
        const base = idx < 0 ? 0 : idx;
        const delta = (e.key === 'ArrowRight') ? 1 : -1;
        const next = (base + delta + desks.length) % desks.length;
        targetId = desks[next].id;
      } else if (/^[1-9]$/.test(e.key)) {
        const i = parseInt(e.key, 10) - 1;
        if (i >= desks.length) return;
        targetId = desks[i].id;
      } else {
        return;
      }

      e.preventDefault();
      if (!targetId || targetId === st.activeDesktop) return;

      st.activeDesktop = targetId;
      saveState();
      rerender();
    });
  }

  // PATCH: init-keys —— 插入 init() 中 bindEvents() 之后
  // initDesktopKeys(); initDeskWpWatch();

// ===== F-5.5 搜索建议 =====
function initSearchSuggest() {
  if (typeof document === 'undefined') return;

  const input = document.getElementById('searchInput');
  if (!input) return;
  const form = document.getElementById('searchForm') || input.form;
  if (!form) return;
  if (document.getElementById('suggestBox')) return; // 已初始化

  const box = document.createElement('div');
  box.id = 'suggestBox';
  box.className = 'suggest-box';
  box.style.position = 'absolute';
  box.style.display = 'none';
  form.appendChild(box);

  let items = [];
  let active = -1;
  let debounceTimer = null;
  let blurTimer = null;
  let seq = 0;

  const enc = encodeURIComponent;

  function getSettings() {
    try { return (typeof getState === 'function' ? getState() : null)?.settings || {}; } catch (e) { return {}; }
  }

  function closeBox() {
    box.style.display = 'none';
    box.innerHTML = '';
    items = [];
    active = -1;
    document.body.classList.remove('suggest-on');
  }

  function pick(i) {
    const word = items[i];
    if (word == null) return;
    if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
    input.value = word;
    closeBox();
    try {
      if (typeof form.requestSubmit === 'function') form.requestSubmit();
      else form.submit();
    } catch (e) {
      try { form.submit(); } catch (e2) {}
    }
  }

  function highlight(i) {
    const rows = box.querySelectorAll('.suggest-item');
    for (let k = 0; k < rows.length; k++) {
      if (k === i) rows[k].classList.add('active');
      else rows[k].classList.remove('active');
    }
    active = i;
  }

  function openBox(list) {
    if (!list || !list.length) { closeBox(); return; }
    items = list;
    active = -1;
    box.innerHTML = '';

    items.forEach(function (word, i) {
      const row = document.createElement('div');
      row.className = 'suggest-item';
      row.textContent = word;
      row.addEventListener('mousedown', function (ev) {
        ev.preventDefault(); // 保住 input 焦点，避免 blur 先关掉
      });
      row.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        pick(i);
      });
      box.appendChild(row);
    });

    box.style.display = 'block';
    document.body.classList.add('suggest-on');
  }

  // 各引擎独立适配（不通用化）
  function suggestUrl(engine, q) {
    switch (engine) {
      case 'bing':
        return 'https://api.bing.com/osjson.aspx?query=' + enc(q);
      case 'google':
        return 'https://suggestqueries.google.com/complete/search?client=firefox&q=' + enc(q);
      case 'baidu':
        return 'https://www.baidu.com/sugrec?prod=pc&wd=' + enc(q);
      case 'duckduckgo':
        return 'https://duckduckgo.com/ac/?q=' + enc(q) + '&type=json';
      default:
        return null; // custom / 360 / 搜狗等：不支持建议
    }
  }

  function normalize(engine, json) {
    const out = [];
    function push(v) {
      if (typeof v !== 'string') return;
      const s = v.trim();
      if (!s) return;
      if (out.indexOf(s) === -1) out.push(s);
    }

    if (engine === 'bing' || engine === 'google') {
      const arr = json && json[1];
      if (Array.isArray(arr)) arr.forEach(push);
    } else if (engine === 'baidu') {
      const g = json && json.g;
      if (Array.isArray(g)) {
        g.forEach(function (o) {
          if (o && typeof o === 'object') push(o.q || o.word || '');
          else if (typeof o === 'string') push(o);
        });
      }
    } else if (engine === 'duckduckgo') {
      if (Array.isArray(json)) {
        json.forEach(function (o) {
          if (typeof o === 'string') push(o);
          else if (o && typeof o === 'object') push(o.phrase || '');
        });
      } else if (json && Array.isArray(json.suggestions)) {
        json.suggestions.forEach(push);
      }
    }

    return out.slice(0, 8);
  }

  function request(q) {
    const s = getSettings();
    const engine = s && s.engine ? s.engine : 'bing';
    const url = suggestUrl(engine, q);
    if (!url) { closeBox(); return; }

    const my = ++seq;
    fetch(url, { method: 'GET' })
      .then(function (res) {
        if (!res.ok) throw new Error('http ' + res.status);
        return res.json();
      })
      .then(function (json) {
        if (my !== seq) return; // 过期响应丢弃
        const list = normalize(engine, json);
        if (!list.length) { closeBox(); return; }
        openBox(list);
      })
      .catch(function () {
        if (my !== seq) return;
        closeBox(); // 失败静默
      });
  }

  input.addEventListener('input', function () {
    const s = getSettings();
    if (!s || s.searchSuggest !== true) { closeBox(); return; }

    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }

    const q = (input.value || '').trim();
    if (q.length < 2) { closeBox(); return; }

    debounceTimer = setTimeout(function () {
      debounceTimer = null;
      request(q);
    }, 350);
  });

  input.addEventListener('keydown', function (ev) {
    if (box.style.display === 'none' || !items.length) return;

    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      highlight((active + 1) % items.length);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      highlight((active - 1 + items.length) % items.length);
    } else if (ev.key === 'Enter') {
      if (active >= 0) {
        ev.preventDefault();
        pick(active);
      } else {
        closeBox(); // 无高亮：走正常提交
      }
    } else if (ev.key === 'Escape') {
      closeBox();
    }
  });

  input.addEventListener('blur', function () {
    if (blurTimer) clearTimeout(blurTimer);
    blurTimer = setTimeout(function () {
      blurTimer = null;
      closeBox();
    }, 150);
  });
}

// PATCH: init-suggest —— 插入 init() 的 bindEvents() 之后
initSearchSuggest();

  function handleAddAction(act) {
    if (act === 'icon') handleAddIcon();
    else if (act === 'folder') handleAddFolder();
    else if (act === 'widget') handleAddWidget();
    else if (act === 'batch') handleBatchAdd();
  }

/* ================== ZIP 备份 / 还原 ================== */
/* 本段需整段插入 extra.js 的 IIFE 内部（与 idbGet / idbPut / getState / saveState 同作用域）。 */

const TT = (s) => (window.NTI18N ? window.NTI18N.t(s) : s);

const ZIPSTR = {
  get zipExportFail() { return TT('生成 ZIP 备份失败'); },
  get zipInvalid() { return TT('无效的 ZIP 备份文件'); },
  get zipNoBackup() { return TT('无效的 ZIP 备份：缺少 backup.json'); },
  get zipTooBig() { return TT('备份文件过大（超过 20MB），已取消导入'); },
  get zipParseFail() { return TT('解析失败，请确认文件格式正确'); },
  zipSkipped: function (n) { return TT('有 ') + n + TT(' 张图片读取失败，未能打包进 ZIP。'); },
  zipPreviewHead: function (d, i) { return TT('备份包含 ') + d + TT(' 个桌面、') + i + TT(' 个元素。'); },
  zipPreviewFiltered: function (n) { return TT('已过滤 ') + n + TT(' 个损坏元素。'); },
  zipPreviewMedia: function (n) { return TT('已恢复 ') + n + TT(' 张图片。'); },
  zipPreviewMissing: function (n) { return TT('有 ') + n + TT(' 张图片在 ZIP 中缺失，恢复后将无法显示。'); },
  get zipConfirmTail() { return TT('导入将覆盖当前数据（已自动创建快照，可在设置中回滚），继续？'); }
};

const ZIP_MAX_IMPORT_BYTES = 20 * 1024 * 1024;
const ZIP_EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};
const B64_DECODE_CHUNK = 4 * 8192;
const B64_ENCODE_CHUNK = 3 * 4096;

/* ---- 与现有 JSON 导入完全一致的校验逻辑 ---- */
function zipValidItem(it) {
  return !!it &&
    typeof it.id === 'string' &&
    typeof it.desktopId === 'string' &&
    (it.type === 'icon' || it.type === 'folder' || it.type === 'widget');
}
function zipOkShape(obj) {
  return !!obj &&
    !!obj.version &&
    Array.isArray(obj.desktops) &&
    obj.desktops.length > 0 &&
    obj.desktops.every(function (d) { return !!d && typeof d.id === 'string'; }) &&
    Array.isArray(obj.items);
}

/* ---- 递归收集 'idb:' 引用 ---- */
function collectMediaRefs(state) {
  const found = new Set();
  const seen = new Set();
  const walk = function (v) {
    if (v == null) return;
    const t = typeof v;
    if (t === 'string') {
      if (v.indexOf('idb:') === 0 && v.length > 4) found.add(v.slice(4));
      return;
    }
    if (t !== 'object') return;
    if (seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) walk(v[i]);
      return;
    }
    const keys = Object.keys(v);
    for (let i = 0; i < keys.length; i++) walk(v[keys[i]]);
  };
  walk(state);
  return Array.from(found);
}

/* ---- data URL <-> bytes ---- */
function mimeFromDataUrl(dataUrl) {
  const s = String(dataUrl == null ? '' : dataUrl);
  if (s.slice(0, 5).toLowerCase() !== 'data:') return '';
  const comma = s.indexOf(',');
  if (comma < 0) return '';
  const meta = s.slice(5, comma);
  const semi = meta.indexOf(';');
  return (semi >= 0 ? meta.slice(0, semi) : meta).trim().toLowerCase();
}

function extFromMime(mime) {
  return ZIP_EXT_BY_MIME[String(mime || '').toLowerCase()] || 'bin';
}

function base64ToBytes(b64) {
  const clean = String(b64 == null ? '' : b64).replace(/\s+/g, '');
  const len = clean.length;
  if (!len) return new Uint8Array(0);
  let pad = 0;
  if (clean.charCodeAt(len - 1) === 61) pad++;
  if (len > 1 && clean.charCodeAt(len - 2) === 61) pad++;
  const out = new Uint8Array(Math.floor(len * 3 / 4) - pad);
  let offset = 0;
  for (let i = 0; i < len; i += B64_DECODE_CHUNK) {
    const part = clean.slice(i, Math.min(i + B64_DECODE_CHUNK, len));
    const bin = atob(part);
    for (let j = 0; j < bin.length; j++) out[offset++] = bin.charCodeAt(j) & 0xFF;
  }
  return out;
}

function bytesToBase64(bytes) {
  let b64 = '';
  for (let i = 0; i < bytes.length; i += B64_ENCODE_CHUNK) {
    const sub = bytes.subarray(i, Math.min(i + B64_ENCODE_CHUNK, bytes.length));
    let bin = '';
    for (let j = 0; j < sub.length; j++) bin += String.fromCharCode(sub[j]);
    b64 += btoa(bin);
  }
  return b64;
}

function dataUrlToBytes(dataUrl) {
  const s = String(dataUrl == null ? '' : dataUrl);
  if (s.slice(0, 5).toLowerCase() !== 'data:') throw new Error('不是 data URL');
  const comma = s.indexOf(',');
  if (comma < 0) throw new Error('data URL 缺少数据段');
  const meta = s.slice(5, comma);
  const payload = s.slice(comma + 1);
  if (/;base64/i.test(meta)) return base64ToBytes(payload);
  return new TextEncoder().encode(decodeURIComponent(payload));
}

function bytesToDataUrl(bytes, mime) {
  const u8 = (bytes instanceof Uint8Array) ? bytes : new Uint8Array(bytes || 0);
  const type = mime || 'application/octet-stream';
  return 'data:' + type + ';base64,' + bytesToBase64(u8);
}

/* ---- 导出 ---- */
function zipDateStamp() {
  const d = new Date();
  const p = function (n) { return n < 10 ? '0' + n : '' + n; };
  return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
}

function zipTriggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  window.setTimeout(function () {
    if (a.parentNode) a.parentNode.removeChild(a);
    URL.revokeObjectURL(url);
  }, 10000);
}

async function exportZipBackup() {
  try {
    const raw = getState();
    const copy = raw ? JSON.parse(JSON.stringify(raw)) : raw;
    if (!copy || typeof copy !== 'object') throw new Error('state 不可用');

    const ids = collectMediaRefs(copy);
    const media = [];
    const mediaFiles = [];
    let skipped = 0;

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      let dataUrl = null;
      try { dataUrl = await idbGet(id); } catch (e) { dataUrl = null; }
      if (!dataUrl || typeof dataUrl !== 'string') { skipped++; continue; }

      let bytes;
      try { bytes = dataUrlToBytes(dataUrl); } catch (e) { skipped++; continue; }

      const mime = mimeFromDataUrl(dataUrl) || 'application/octet-stream';
      const file = 'media/' + id + '.' + extFromMime(mime);
      mediaFiles.push({ name: file, data: bytes });
      media.push({ ref: 'idb:' + id, file: file, mime: mime });
    }

    const manifest = {
      format: 'nt-zip-backup',
      version: 1,
      created: new Date().toISOString(),
      media: media
    };

    const entries = [
      { name: 'backup.json', data: JSON.stringify(copy, null, 2) },
      { name: 'manifest.json', data: JSON.stringify(manifest, null, 2) }
    ].concat(mediaFiles);

    if (!window.NTZip || typeof window.NTZip.create !== 'function') throw new Error('NTZip 未加载');
    const blob = await window.NTZip.create(entries);

    zipTriggerDownload(blob, 'newtab-workbench' + '-backup-' + zipDateStamp() + '.zip');

    if (skipped > 0) alert(ZIPSTR.zipSkipped(skipped));
  } catch (err) {
    if (window.console && console.error) console.error(err);
    alert(ZIPSTR.zipExportFail);
  }
}

/* ---- 导入 ---- */
function zipFindEntry(entries, name) {
  for (let i = 0; i < entries.length; i++) {
    if (entries[i] && entries[i].name === name) return entries[i];
  }
  return null;
}

async function importZipBackup(file, readerResultArrayBuffer) {
  try {
    let entries;
    try {
      if (!window.NTZip || typeof window.NTZip.read !== 'function') throw new Error('NTZip 未加载');
      const blob = new Blob([readerResultArrayBuffer], { type: 'application/zip' });
      entries = await window.NTZip.read(blob);
    } catch (e) {
      alert(ZIPSTR.zipInvalid);
      return;
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      alert(ZIPSTR.zipInvalid);
      return;
    }

    const backupEntry = zipFindEntry(entries, 'backup.json');
    if (!backupEntry) {
      alert(ZIPSTR.zipNoBackup);
      return;
    }

    let obj;
    try {
      obj = JSON.parse(new TextDecoder().decode(backupEntry.bytes));
    } catch (e) {
      alert(ZIPSTR.zipInvalid);
      return;
    }
    if (!zipOkShape(obj)) {
      alert(ZIPSTR.zipInvalid);
      return;
    }

    const originalItems = obj.items;
    const goodItems = originalItems.filter(zipValidItem);
    const filteredCount = originalItems.length - goodItems.length;
    obj.items = goodItems;

    let mediaList = [];
    const manifestEntry = zipFindEntry(entries, 'manifest.json');
    if (manifestEntry) {
      try {
        const mf = JSON.parse(new TextDecoder().decode(manifestEntry.bytes));
        if (mf && Array.isArray(mf.media)) mediaList = mf.media;
      } catch (e) { mediaList = []; }
    }

    if (mediaList.length === 0) {
      const mimeByExt = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
      for (let i = 0; i < entries.length; i++) {
        const nm = entries[i] && entries[i].name;
        const mm = typeof nm === 'string' ? nm.match(/^media\/([^/]+)\.(\w+)$/) : null;
        if (mm) mediaList.push({ ref: 'idb:' + mm[1], file: nm, mime: mimeByExt[mm[2].toLowerCase()] || 'application/octet-stream' });
      }
    }

    let restored = 0;
    let missing = 0;
    for (let i = 0; i < mediaList.length; i++) {
      const m = mediaList[i];
      if (!m || typeof m.ref !== 'string' || m.ref.indexOf('idb:') !== 0) continue;
      if (typeof m.file !== 'string' || !m.file) continue;
      const id = m.ref.slice(4);
      if (!id) continue;
      const entry = zipFindEntry(entries, m.file);
      if (!entry) { missing++; continue; }
      try {
        const mime = (typeof m.mime === 'string' && m.mime) ? m.mime : 'application/octet-stream';
        const dataUrl = bytesToDataUrl(entry.bytes, mime);
        await idbPut(id, dataUrl);
        restored++;
      } catch (e) {
        missing++;
      }
    }

    /* 顺序要求：先把图片写进 IndexedDB，再快照、确认、写 state */
    if (window.NTPlus && typeof window.NTPlus.snapshot === 'function') {
      window.NTPlus.snapshot('导入备份前');
    }

    let msg = ZIPSTR.zipPreviewHead(obj.desktops.length, obj.items.length);
    if (filteredCount > 0) msg += ZIPSTR.zipPreviewFiltered(filteredCount);
    if (restored > 0) msg += ZIPSTR.zipPreviewMedia(restored);
    if (missing > 0) msg += ZIPSTR.zipPreviewMissing(missing);
    msg += ZIPSTR.zipConfirmTail;

    if (!confirm(msg)) return;

    localStorage.setItem('nt_workbench_v2', JSON.stringify(obj));
    location.reload();
  } catch (err) {
    if (window.console && console.error) console.error(err);
    alert(ZIPSTR.zipParseFail);
  }
}

/* ---- 导出按钮：document 级事件委托 ---- */
document.addEventListener('click', function (ev) {
  const target = ev.target;
  if (!target || typeof target.closest !== 'function') return;
  const btn = target.closest('#exportZipBtn');
  if (!btn) return;
  ev.preventDefault();
  exportZipBackup();
});

/* 说明：#importFile 的 ZIP 分流不能写在这里的委托监听中。
   现有 JSON 导入 handler 是直接绑定在 #importFile 上的另一个 change 监听器，
   document 级委托无法阻止它执行（要 removeEventListener 必须持有同一函数引用）。
   因此 ZIP 分流必须写进现有 change handler 的开头，改法见 edits (c)。 */

  function settingsHtml() {
    const state = getState();
    const s = state.settings;
    let swatchHtml = '';
    for (const w of BUILTIN_WALLPAPERS) {
      swatchHtml += `<button type="button" class="wp-swatch ${w.cls}" data-act="wallpaper-photo" data-wp="${w.file}" title="${w.title}"></button>`;
    }
    for (const g of GRADIENTS) {
      swatchHtml += `<button type="button" class="wp-swatch wp-${g}" data-g="${g}" data-act="wallpaper-swatch"></button>`;
    }

    let engineOptions = '';
    for (const key of ENGINE_ORDER) {
      const [label] = ENGINES[key];
      const selected = key === s.engine ? ' selected' : '';
      engineOptions += `<option value="${key}"${selected}>${label}</option>`;
    }

    const trashItems = state.trash || [];
    let trashHtml = '';
    if (trashItems.length === 0) {
      trashHtml = '<div class="trash-empty">回收站为空</div>';
    } else {
      trashHtml = '<ul class="trash-list">';
      for (const item of trashItems) {
        const name = (item.data && item.data.name) || (item.data && item.data.kind) || '元素';
        trashHtml += `<li class="trash-item">
                        <span class="trash-name">${NT.esc(name)}</span>
                        <button type="button" data-act="recover" data-id="${item.id}">恢复</button>
                        <button type="button" data-act="delete-forever" data-id="${item.id}">彻底删除</button>
                      </li>`;
      }
      trashHtml += '</ul>';
    }

    const wpApis = Array.isArray(s.wpApis) ? s.wpApis : [];
    const apiOptions = wpApis.map((a, i) => `<option value="${i}">${a.name}</option>`).join('');
    const rotSrcOptions = [`<option value="">全部图源随机</option>`].concat(wpApis.map(a => `<option value="${a.url}"${s.wpRotate && s.wpRotate.onlyUrl === a.url ? ' selected' : ''}>${a.name}</option>`)).join('');
    const apiListHtml = wpApis.map((a, i) => `<div class="wp-api-item"><span>${a.name}</span><span class="wp-api-url">${a.url}</span><button type="button" data-api-del="${i}">删除</button></div>`).join('');

    const snapHtml = (window.NTPlus ? NTPlus.listSnapshots() : []).map((sn, i) => {
      const d = new Date(sn.ts);
      const t = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      return `<div class="wp-api-item"><span>${t} · ${sn.reason || ''}</span><button type="button" data-snap-rollback="${i}">回滚</button></div>`;
    }).join('') || '<div style="color:var(--ink-3);font-size:.85rem;">暂无快照</div>';
    const customHidden = s.engine === 'custom' ? '' : ' hidden';

    return `
      <div class="set-tabs"><button type="button" class="set-tab active" data-tab="look">外观与壁纸</button><button type="button" class="set-tab" data-tab="desk">桌面与布局</button><button type="button" class="set-tab" data-tab="search">搜索</button><button type="button" class="set-tab" data-tab="data">数据与隐私</button></div>
      <div class="set-panel" data-panel="look">
        <div class="settings-section">
  <h3>语言 / Language</h3>
  <select id="langSel">
    <option value="zh"${s.lang !== 'en' ? ' selected' : ''}>简体中文</option>
    <option value="en"${s.lang === 'en' ? ' selected' : ''}>English</option>
  </select>
</div>
        <div class="settings-section">
          <h3>壁纸</h3>
          <div class="wp-preview" id="wpPreview"><span>当前壁纸</span></div>
          <div class="wp-grid">${swatchHtml}</div>
          <div class="wp-api-row">
            <select id="wpApiSel">${apiOptions}</select>
            <button type="button" id="wpRandomBtn">随机一张</button>
            <button type="button" id="wpApplyBtn" hidden>应用这张</button>
          </div>
          <div class="wp-api-list" id="wpApiList">${apiListHtml}</div>
          <div class="wp-url-row">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="setWpRotate" ${s.wpRotate && s.wpRotate.on ? 'checked' : ''}> 壁纸自动轮换（图源随机，断网时保留当前）</label>
            <select id="setWpRotateEvery">
              <option value="open" ${!s.wpRotate || s.wpRotate.every === 'open' ? 'selected' : ''}>每次打开新标签</option>
              <option value="hour" ${s.wpRotate && s.wpRotate.every === 'hour' ? 'selected' : ''}>每小时</option>
              <option value="day" ${s.wpRotate && s.wpRotate.every === 'day' ? 'selected' : ''}>每天</option>
            </select>
          </div>
          <div class="wp-url-row">
            <label style="flex:1">轮换图源</label>
            <select id="setWpRotateSrc">${rotSrcOptions}</select>
          </div>
          <div class="wp-url-row">
            <input type="text" id="wpApiName" placeholder="新 API 名称">
          </div>
          <div class="wp-url-row">
            <input type="text" id="wpApiUrl" placeholder="新 API 链接（返回图片，或 Bing 每日一图 JSON）">
            <button type="button" id="wpApiAdd">添加</button>
          </div>
          <div class="wp-url-row">
            <input type="text" id="wallpaperUrl" placeholder="输入图片 URL">
            <button type="button" id="applyWallpaperUrl">应用</button>
          </div>
          <div class="wp-file-row">
            <input type="file" id="wallpaperFile" accept="image/*">
          </div>
        </div>
        <div class="settings-section">
          <h3>遮罩浓度</h3>
          <input type="range" id="dimRange" min="0" max="70" value="${s.dim || 0}">
        </div>
        <div class="settings-section">
          <h3>外观</h3>
          <label style="display:block;margin-bottom:6px;">壁纸模糊 <span id="blurVal">${s.blur || 0}</span>px</label>
          <input type="range" id="blurRange" min="0" max="20" value="${s.blur || 0}">
          <label style="display:block;margin:10px 0 6px;">深色模式</label>
          <select id="darkModeSel">
            <option value="auto"${s.darkMode !== 'light' && s.darkMode !== 'dark' ? ' selected' : ''}>跟随壁纸</option>
            <option value="light"${s.darkMode === 'light' ? ' selected' : ''}>浅色卡片</option>
            <option value="dark"${s.darkMode === 'dark' ? ' selected' : ''}>深色卡片</option>
          </select>
        </div>
        <div class="settings-section">
          <h3>主题</h3>
          <div id="themeList"></div>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <input type="text" id="themeName" placeholder="主题名称" style="flex:1;">
            <button type="button" id="themeSaveBtn">保存当前外观为主题</button>
          </div>
          <label class="checkbox-label" style="margin-top:10px;">
            <input type="checkbox" id="deskWpCheck"${(state.desktops.find(d => d.id === state.activeDesktop) || {}).wallpaper ? ' checked' : ''}> 当前桌面使用独立壁纸（在上方壁纸区设置，只影响本桌面）
          </label>
        </div>
      </div>
      <div class="set-panel" data-panel="desk" hidden>
        <div class="settings-section">
          <h3>布局模式（当前桌面）</h3>
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <button type="button" id="layoutGridBtn" class="btn-ghost">网格布局</button>
            <button type="button" id="layoutFreeBtn" class="btn-ghost">自由布局</button>
          </div>
          <label class="checkbox-label">
            <input type="checkbox" id="freeSnapCheck"${s.freeSnap === false ? '' : ' checked'}> 自由布局：拖动吸附
          </label>
          <label class="checkbox-label">
            <input type="checkbox" id="freeNoOverlapCheck"${s.freeNoOverlap === false ? '' : ' checked'}> 自由布局：防重叠
          </label>
          <label style="display:block;margin:10px 0 6px;">内容区宽度</label>
          <select id="contentWidthSel">
            <option value="narrow"${s.contentWidth === 'narrow' ? ' selected' : ''}>窄（3 列）</option>
            <option value="standard"${s.contentWidth !== 'narrow' && s.contentWidth !== 'wide' ? ' selected' : ''}>标准（4 列）</option>
            <option value="wide"${s.contentWidth === 'wide' ? ' selected' : ''}>宽（6 列）</option>
          </select>
          <div style="margin-top:10px;">
            <button type="button" id="tidyBtn">一键整理布局</button>
          </div>
          <label class="checkbox-label" style="margin-top:10px;">
            <input type="checkbox" id="hideAddCheck"${s.hideAdd ? ' checked' : ''}> 隐藏右下角「添加」按钮
          </label>
          <!-- PATCH: settings-html-desk —— 加到 data-panel="desk" 面板第一个 section（布局模式）末尾 -->
          <label class="checkbox-label" style="margin-top:10px;">
            <input type="checkbox" id="minimalCheck"${s.minimalMode ? ' checked' : ''}> 极简模式（只保留时钟与搜索）
          </label>
        </div>
        <div class="settings-section">
          <h3>图标</h3>
          <select id="iconSizeSelect">
            <option value="s"${s.iconSize === 's' ? ' selected' : ''}>小</option>
            <option value="m"${s.iconSize === 'm' ? ' selected' : ''}>中</option>
            <option value="l"${s.iconSize === 'l' ? ' selected' : ''}>大</option>
          </select>
          <label class="checkbox-label">
            <input type="checkbox" id="showLabelsCheck"${s.showLabels ? ' checked' : ''}> 显示名称
          </label>
        </div>
      </div>
      <div class="set-panel" data-panel="search" hidden>
        <div class="settings-section">
          <h3>搜索引擎</h3>
          <select id="engineSelect">${engineOptions}</select>
          <label class="checkbox-label">
            <input type="checkbox" id="searchHistoryCheck"${s.searchHistory === false ? '' : ' checked'}> 保存搜索历史（仅本地，可在搜索框聚焦时查看/清空）
          </label>
          <div id="customEngineWrap"${customHidden}>
            <input type="text" id="customEngine" value="${s.customEngine || ''}" placeholder="搜索 URL，使用 %s 代替关键词">
          </div>
          <label class="checkbox-label">
            <input type="checkbox" id="searchNewTabToggle"> 搜索在新标签页打开
          </label>
          <label class="checkbox-label">
  <input type="checkbox" id="searchSuggestCheck"${s.searchSuggest === true ? 'checked' : ''}> 搜索建议（开启后，输入内容将发送给所选搜索引擎以获取联想词，不会发送搜索历史）
</label>
        </div>
        <!-- PATCH: settings-html-search —— 加到 data-panel="search" 面板「搜索引擎」section 之后 -->
        <div class="settings-section">
          <h3>搜索框样式</h3>
          <label style="display:block;margin-bottom:6px;">大小</label>
          <select id="searchStyleSel">
            <option value="s"${s.searchStyle === 's' ? ' selected' : ''}>紧凑</option>
            <option value="m"${s.searchStyle !== 's' && s.searchStyle !== 'l' ? ' selected' : ''}>标准</option>
            <option value="l"${s.searchStyle === 'l' ? ' selected' : ''}>宽大</option>
          </select>
          <label class="checkbox-label" style="margin-top:10px;">
            <input type="checkbox" id="keepSearchTextCheck"${s.keepSearchText !== false ? ' checked' : ''}> 搜索后保留搜索框内容
          </label>
        </div>
      </div>
      <div class="set-panel" data-panel="data" hidden>
        <div class="settings-section">
          <h3>数据</h3>
          <button type="button" id="exportBtn">导出备份</button><button type="button" id="exportZipBtn">导出 ZIP 备份</button>
          <button type="button" id="bookmarkBtn">导入浏览器书签</button>
          <button type="button" id="importBtn">导入备份</button><input type="file" id="importFile" accept="application/json,.json,.zip" hidden>
          <div class="empty-tip">选择之前导出的备份文件（.json 或 .zip），导入会覆盖当前数据，导入前会自动创建快照，可在下方回滚。</div>
          <button type="button" id="resetBtn">重置</button>
          <div style="margin-top:12px;">
            <button type="button" id="snapCreateBtn">创建快照</button>
            <div id="snapList" style="margin-top:8px;">${snapHtml}</div>
          </div>
        </div>
        <div class="settings-section">
          <h3>回收站</h3>
          <div id="trashList">${trashHtml}</div>
        </div>
      </div>
    `;
  }

  function bindSettingsEvents(modalBd) {
    var searchSuggestCheck = modalBd.querySelector('#searchSuggestCheck');
    if (searchSuggestCheck) {
      searchSuggestCheck.addEventListener('change', function () {
        getState().settings.searchSuggest = this.checked;
        saveState();
      });
    }
    bindThemeSettings(modalBd);
    var searchStyleSel = modalBd.querySelector('#searchStyleSel');
    if (searchStyleSel) {
      searchStyleSel.addEventListener('change', function () {
        getState().settings.searchStyle = this.value;
        saveState();
        applySearchStyle();
      });
    }
    var keepSearchTextCheck = modalBd.querySelector('#keepSearchTextCheck');
    if (keepSearchTextCheck) {
      keepSearchTextCheck.addEventListener('change', function () {
        getState().settings.keepSearchText = this.checked;
        saveState();
      });
    }
    applyMinimal();
    const langSel = modalBd.querySelector('#langSel');
    if (langSel) {
      langSel.addEventListener('change', () => {
        const st = getState();
        st.settings.lang = langSel.value;
        saveState();
        if (window.NTI18N) NTI18N.init(langSel.value);
        rerender();
        openSettings();
      });
    }
    // 设置页标签切换
    const setTabs = modalBd.querySelectorAll('.set-tab');
    const setPanels = modalBd.querySelectorAll('.set-panel');
    setTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        setTabs.forEach((t) => t.classList.toggle('active', t === tab));
        setPanels.forEach((p) => {
          if (p.dataset.panel === target) p.removeAttribute('hidden');
          else p.setAttribute('hidden', '');
        });
      });
    });

    // 搜索在新标签页打开
    const searchNewTabToggle = modalBd.querySelector('#searchNewTabToggle');
    if (searchNewTabToggle) {
      searchNewTabToggle.checked = !!(getState().settings && getState().settings.searchNewTab);
      searchNewTabToggle.addEventListener('change', () => {
        const state = getState();
        state.settings.searchNewTab = searchNewTabToggle.checked;
        saveState();
      });
    }
    // 内置照片壁纸
    modalBd.querySelectorAll('[data-act="wallpaper-photo"]').forEach((el) => {
      el.addEventListener('click', () => {
        commitWallpaper({ type: 'image', value: el.dataset.wp || 'assets/wallpaper-dawn.jpg' });
      });
    });
    // wallpaper swatches
    const swatches = modalBd.querySelectorAll('.wp-swatch[data-g]');
    swatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        const g = swatch.dataset.g;
        const state = getState();
        commitWallpaper({ type: 'gradient', value: g });
      });
    });

    // image url
    const applyUrlBtn = modalBd.querySelector('#applyWallpaperUrl');
    if (applyUrlBtn) {
      applyUrlBtn.addEventListener('click', () => {
        const urlInput = modalBd.querySelector('#wallpaperUrl');
        const url = urlInput.value.trim();
        if (url) {
          const state = getState();
          commitWallpaper({ type: 'image', value: url });
        }
      });
    }

    // local file
    const fileInput = modalBd.querySelector('#wallpaperFile');
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;
const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            // 本地上传同样提升到 3840 与 q0.92，保持与图库壁纸一致
            const maxDim = 3840;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width >= height) {
                height = Math.round((height / width) * maxDim);
                width = maxDim;
              } else {
                width = Math.round((width / height) * maxDim);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
                        const dataURL = canvas.toDataURL('image/jpeg', 0.92);
            // 该回调不一定是 async 函数，用 Promise 链最稳妥
            storeWallpaperDataUrl(dataURL).then((ref) => {
              const state = getState();
              commitWallpaper({ type: 'image', value: ref });
            });
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    // 壁纸预览 + 图库 API 随机换图
    const refreshWpPreview = () => {
      const pv = modalBd.querySelector('#wpPreview');
      if (!pv) return;
      const wp = getState().settings.wallpaper;
      if (wp.type === 'gradient') {
        pv.style.backgroundImage = '';
        pv.className = 'wp-preview wp-' + wp.value;
      } else {
        pv.className = 'wp-preview';
        pv.style.backgroundImage = `url("${wp.value}")`;
      }
      const tag = pv.querySelector('span');
      if (tag) tag.textContent = '当前壁纸';
    };
    refreshWpPreview();
    modalBd.querySelectorAll('[data-act="wallpaper-photo"], .wp-swatch[data-g]').forEach(el => {
      el.addEventListener('click', () => setTimeout(refreshWpPreview, 0));
    });
    const urlApplyBtn = modalBd.querySelector('#applyWallpaperUrl');
    if (urlApplyBtn) urlApplyBtn.addEventListener('click', () => setTimeout(refreshWpPreview, 0));
    const wpFileInput = modalBd.querySelector('#wallpaperFile');
    if (wpFileInput) wpFileInput.addEventListener('change', () => setTimeout(refreshWpPreview, 1200));

    const rotBox = modalBd.querySelector('#setWpRotate');
    if (rotBox) rotBox.addEventListener('change', () => {
      const state = getState();
      state.settings.wpRotate = state.settings.wpRotate || { on: false, every: 'open' };
      state.settings.wpRotate.on = rotBox.checked;
      saveState();
    });
    const rotSel = modalBd.querySelector('#setWpRotateEvery');
    if (rotSel) rotSel.addEventListener('change', () => {
      const state = getState();
      state.settings.wpRotate = state.settings.wpRotate || { on: false, every: 'open' };
      state.settings.wpRotate.every = rotSel.value;
      saveState();
    });
    const rotSrcSel = modalBd.querySelector('#setWpRotateSrc');
    if (rotSrcSel) rotSrcSel.addEventListener('change', () => {
      const state = getState();
      state.settings.wpRotate = state.settings.wpRotate || { on: false, every: 'open' };
      state.settings.wpRotate.onlyUrl = rotSrcSel.value;
      saveState();
    });
    let pendingWp = null;
    const randomBtn = modalBd.querySelector('#wpRandomBtn');
    const applyBtn = modalBd.querySelector('#wpApplyBtn');
    if (randomBtn) {
      randomBtn.addEventListener('click', async () => {
        const state = getState();
        const apis = state.settings.wpApis || [];
        const sel = modalBd.querySelector('#wpApiSel');
        const api = apis[sel ? parseInt(sel.value, 10) : 0];
        const pv = modalBd.querySelector('#wpPreview');
        const tag = pv ? pv.querySelector('span') : null;
        if (!api) { if (tag) tag.textContent = '先添加一个图库 API'; return; }
        randomBtn.disabled = true;
        randomBtn.textContent = '获取中…';
        // 与壁纸自动轮换共用 fetchGalleryImage：直链图片和 JSON（对象/数组/嵌套）统一处理
        const r = await fetchGalleryImage(api);
        if (r && r.dataUrl) {
          pendingWp = r.dataUrl;
          if (pv) {
            pv.className = 'wp-preview';
            pv.style.backgroundImage = `url("${pendingWp}")`;
          }
          if (tag) tag.textContent = '预览（未应用）';
          if (applyBtn) applyBtn.hidden = false;
        } else {
          if (tag) tag.textContent = '获取失败，检查 API 或网络';
        }
        randomBtn.disabled = false;
        randomBtn.textContent = '随机一张';
      });
    }
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        if (!pendingWp) return;
        const dataUrl = pendingWp;
        pendingWp = null;
        storeWallpaperDataUrl(dataUrl).then((ref) => {
          const state = getState();
          commitWallpaper({ type: 'image', value: ref });
          refreshWpPreview();
          applyBtn.hidden = true;
        });
      });
    }
    const apiAddBtn = modalBd.querySelector('#wpApiAdd');
    if (apiAddBtn) {
      apiAddBtn.addEventListener('click', () => {
        const name = modalBd.querySelector('#wpApiName').value.trim();
        const url = modalBd.querySelector('#wpApiUrl').value.trim();
        if (!url) return;
        const state = getState();
        state.settings.wpApis = state.settings.wpApis || [];
        state.settings.wpApis.push({ name: name || '自定义 API', url });
        saveState();
        openSettings();
      });
    }
    modalBd.querySelectorAll('[data-api-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const state = getState();
        (state.settings.wpApis || []).splice(parseInt(btn.dataset.apiDel, 10), 1);
        saveState();
        openSettings();
      });
    });

    // dim range
    const dimRange = modalBd.querySelector('#dimRange');
    if (dimRange) {
      dimRange.addEventListener('input', () => {
        const state = getState();
        state.settings.dim = parseInt(dimRange.value, 10);
        saveState();
        applyWallpaper();
      });
    }

    // engine select
    const engineSelect = modalBd.querySelector('#engineSelect');
    if (engineSelect) {
      engineSelect.addEventListener('change', () => {
        const state = getState();
        state.settings.engine = engineSelect.value;
        saveState();
        const engineNameEl = document.getElementById('engineName');
        if (engineNameEl) {
          engineNameEl.textContent = ENGINES[state.settings.engine] ? ENGINES[state.settings.engine][0] : ENGINES.bing[0];
          setEngineIcon(state.settings.engine);
        }
        const customWrap = modalBd.querySelector('#customEngineWrap');
        if (customWrap) {
          customWrap.hidden = (state.settings.engine !== 'custom');
        }
      });
    }

    // custom engine input
    const customEngineInput = modalBd.querySelector('#customEngine');
    if (customEngineInput) {
      customEngineInput.addEventListener('change', () => {
        const state = getState();
        state.settings.customEngine = customEngineInput.value.trim();
        saveState();
      });
    }

    // icon size
    const iconSizeSelect = modalBd.querySelector('#iconSizeSelect');
    if (iconSizeSelect) {
      iconSizeSelect.addEventListener('change', () => {
        const state = getState();
        state.settings.iconSize = iconSizeSelect.value;
        saveState();
        rerender();
        applyWallpaper();
      });
    }

    // show labels
    const showLabelsCheck = modalBd.querySelector('#showLabelsCheck');
    if (showLabelsCheck) {
      showLabelsCheck.addEventListener('change', () => {
        const state = getState();
        state.settings.showLabels = showLabelsCheck.checked;
        saveState();
        rerender();
        applyWallpaper();
      });
    }

    // 布局模式切换 + 自由布局选项
    const layoutGridBtn = modalBd.querySelector('#layoutGridBtn');
    const layoutFreeBtn = modalBd.querySelector('#layoutFreeBtn');
    const paintModeBtns = () => {
      const st = getState();
      const desk = st.desktops.find(d => d.id === st.activeDesktop);
      const mode = desk && desk.layoutMode === 'free' ? 'free' : 'grid';
      if (layoutGridBtn) layoutGridBtn.style.cssText = mode === 'grid' ? 'background:#4f7cff;color:#fff;border-color:#4f7cff;' : '';
      if (layoutFreeBtn) layoutFreeBtn.style.cssText = mode === 'free' ? 'background:#4f7cff;color:#fff;border-color:#4f7cff;' : '';
    };
    paintModeBtns();
    if (layoutGridBtn) layoutGridBtn.addEventListener('click', () => { if (window.NTFree) { NTFree.setMode('grid'); paintModeBtns(); } });
    if (layoutFreeBtn) layoutFreeBtn.addEventListener('click', () => { if (window.NTFree) { NTFree.setMode('free'); paintModeBtns(); } });
    const freeSnapCheck = modalBd.querySelector('#freeSnapCheck');
    if (freeSnapCheck) freeSnapCheck.addEventListener('change', () => { getState().settings.freeSnap = freeSnapCheck.checked; saveState(); });
    const freeNoOverlapCheck = modalBd.querySelector('#freeNoOverlapCheck');
    if (freeNoOverlapCheck) freeNoOverlapCheck.addEventListener('change', () => { getState().settings.freeNoOverlap = freeNoOverlapCheck.checked; saveState(); });

    const blurRange = modalBd.querySelector('#blurRange');
    if (blurRange) blurRange.addEventListener('input', () => { getState().settings.blur = parseInt(blurRange.value, 10) || 0; const v = modalBd.querySelector('#blurVal'); if (v) v.textContent = blurRange.value; saveState(); applyWallpaper(); });
    const darkModeSel = modalBd.querySelector('#darkModeSel');
    if (darkModeSel) darkModeSel.addEventListener('change', () => { getState().settings.darkMode = darkModeSel.value; saveState(); applyWallpaper(); });
    const searchHistoryCheck = modalBd.querySelector('#searchHistoryCheck');
    if (searchHistoryCheck) searchHistoryCheck.addEventListener('change', () => { getState().settings.searchHistory = searchHistoryCheck.checked; saveState(); });
    const contentWidthSel = modalBd.querySelector('#contentWidthSel');
    if (contentWidthSel) contentWidthSel.addEventListener('change', () => { getState().settings.contentWidth = contentWidthSel.value; saveState(); applyWallpaper(); rerender(); });
    const tidyBtn = modalBd.querySelector('#tidyBtn');
    if (tidyBtn) tidyBtn.addEventListener('click', () => { if (window.NTPlus) { NTPlus.tidyLayout(); } });
    const hideAddCheck = modalBd.querySelector('#hideAddCheck');
    if (hideAddCheck) hideAddCheck.addEventListener('change', () => { getState().settings.hideAdd = hideAddCheck.checked; saveState(); applyWallpaper(); });
    const snapCreateBtn = modalBd.querySelector('#snapCreateBtn');
    if (snapCreateBtn) snapCreateBtn.addEventListener('click', () => { if (window.NTPlus && NTPlus.snapshot('手动快照')) { closeModal(); openSettings(); } });
    modalBd.querySelectorAll('[data-snap-rollback]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm(TT('回滚到这份快照？当前数据会先自动存一份快照。'))) {
          if (window.NTPlus) NTPlus.rollback(parseInt(btn.dataset.snapRollback, 10));
        }
      });
    });

    // export
    const bookmarkBtn = modalBd.querySelector('#bookmarkBtn');
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', () => {
        if (window.NTDialogs && NTDialogs.openBookmarkImport) NTDialogs.openBookmarkImport();
      });
    }
    const exportBtn = modalBd.querySelector('#exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        const state = getState();
        const copy = JSON.parse(JSON.stringify(state));
        const wp = copy && copy.settings && copy.settings.wallpaper;
        if (wp && typeof wp.value === 'string' && wp.value.indexOf('idb:') === 0) {
          try {
            const dataUrl = await idbGet(wp.value.slice(4));
            if (dataUrl) wp.value = dataUrl;
          } catch (e) {}
        }
        const dataStr = JSON.stringify(copy, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'workbench-backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    // import
    const importFile = modalBd.querySelector('#importFile');
    if (importFile) {
      const importBtn = modalBd.querySelector('#importBtn');
      if (importBtn) importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', () => {
        const file = importFile.files[0];
        if (!file) return;
        // ZIP 备份分流：必须先于 JSON 流程处理
        if (/\.zip$/i.test(file.name) || /zip/i.test(file.type || '')) {
          if (file.size > 20 * 1024 * 1024) { alert(ZIPSTR.zipTooBig); return; }
          file.arrayBuffer()
            .then(function (buf) { return importZipBackup(file, buf); })
            .catch(function () { alert(ZIPSTR.zipParseFail); });
          return;
        }
        if (file.size > 20 * 1024 * 1024) { alert(TT('备份文件过大（超过 20MB），已取消导入')); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const obj = JSON.parse(e.target.result);
            const validItem = (it) => it && typeof it.id === 'string' && typeof it.desktopId === 'string' && (it.type === 'icon' || it.type === 'folder' || it.type === 'widget');
            const okShape = obj && typeof obj === 'object' && obj.version && Array.isArray(obj.desktops) && obj.desktops.length > 0 && obj.desktops.every((d) => d && typeof d.id === 'string') && Array.isArray(obj.items);
            if (!okShape) { alert(TT('无效的备份文件：结构不完整')); return; }
            const dropped = obj.items.filter((it) => !validItem(it)).length;
            obj.items = obj.items.filter(validItem);
            if (window.NTPlus) NTPlus.snapshot('导入备份前');
            let preview = TT('备份包含 ') + obj.desktops.length + TT(' 个桌面、') + obj.items.length + TT(' 个元素。');
            if (dropped > 0) preview += TT('已过滤 ') + dropped + TT(' 个损坏元素。');
            preview += TT('导入将覆盖当前数据（已自动创建快照，可在设置中回滚），继续？');
            if (confirm(preview)) {
              localStorage.setItem('nt_workbench_v2', JSON.stringify(obj));
              location.reload();
            }
          } catch (err) {
            alert(TT('解析失败，请确认文件格式正确'));
          }
        };
        reader.readAsText(file);
      });

    }

    // reset
    const resetBtn = modalBd.querySelector('#resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm(TT('确定要重置所有数据吗？此操作不可撤销！'))) {
          if (window.NTPlus) NTPlus.snapshot('重置前');
          localStorage.removeItem('nt_workbench_v2');
          location.reload();
        }
      });
    }

    // trash actions via event delegation on modalBd
    modalBd.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act="recover"], [data-act="delete-forever"]');
      if (!btn) return;
      const act = btn.dataset.act;
      const id = btn.dataset.id;
      const state = getState();
      const trash = state.trash || [];
      const index = trash.findIndex(item => item.id === id);
      if (index === -1) return;
      const [item] = trash.splice(index, 1);
      if (act === 'recover') {
        // check desktop exists
        const desktopExists = state.desktops.some(d => d.id === item.desktopId);
        if (!desktopExists) {
          item.desktopId = state.activeDesktop;
        }
        if (item.type === 'widget') {
          const pos = NT.firstFreeCell(item.w, item.h);
          item.x = pos.x;
          item.y = pos.y;
          state.items.push(item);
          NT.normalizeWidgetRows();
        } else {
          item.x = state.items.filter(i => i.type === 'icon' || i.type === 'folder').length;
          item.y = 0;
          state.items.push(item);
        }
        saveState();
        rerender();
        openSettings();
      } else if (act === 'delete-forever') {
        saveState();
        rerender();
        openSettings();
      }
    });
  }

  function openSettings() {
    closeModal();
    const st = getState();
    if (!Array.isArray(st.settings.wpApis)) {
      st.settings.wpApis = [
        { name: 'picsum 随机图库', url: 'https://picsum.photos/2560/1440' },
        { name: 'Bing 每日一图', url: 'https://bing.biturl.top/?resolution=1920&format=json&index=0&mkt=zh-CN' }
      ];
      saveState();
    }
    const modalBd = openModal('设置', settingsHtml());
    bindSettingsEvents(modalBd);
  }

  // Bind static events
  function bindEvents() {
    const engineBtn = document.getElementById('engineBtn');
    const engineMenu = document.getElementById('engineMenu');
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const addBtn = document.getElementById('btnAdd');
    const addMenu = document.getElementById('addMenu');
    const btnSettings = document.getElementById('btnSettings');

    if (engineBtn) {
      engineBtn.addEventListener('click', () => {
        if (engineMenu) {
          engineMenu.hidden = !engineMenu.hidden;
        }
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (window.NT && typeof NT.isLocked === 'function' && NT.isLocked()) {
          window.alert(TT('当前桌面已锁定，请先在底部圆点菜单中解锁'));
          return;
        }
        if (addMenu) {
          addMenu.hidden = !addMenu.hidden;
        }
      });
    }

    if (btnSettings) {
      btnSettings.addEventListener('click', openSettings);
    }

    // Search form submit
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = searchInput ? searchInput.value.trim() : '';
        if (!q) return;
        const state = getState();
        let engine = state.settings.engine || 'bing';
        let template = ENGINES[engine] ? ENGINES[engine][1] : ENGINES.bing[1];
        if (engine === 'custom') {
          template = state.settings.customEngine || ENGINES.bing[1];
        }
        if (!template) template = ENGINES.bing[1];
        const url = template.replace('%s', encodeURIComponent(q));
        if (state.settings.searchNewTab) {
          window.open(url, '_blank');
          if (searchInput) searchInput.blur();
        } else {
          location.href = url;
        }
        if (getState().settings.keepSearchText === false) {
          var _si = document.getElementById('searchInput');
          if (_si) { _si.value = ''; _si.blur(); }
        }
      });
    }

    // Alt+Arrow cycle engines
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
          e.preventDefault();
          const state = getState();
          const current = state.settings.engine || 'bing';
          const currentIndex = ENGINE_ORDER.indexOf(current);
          const step = e.key === 'ArrowRight' ? 1 : -1;
          const nextIndex = currentIndex === -1 ? 0 : (currentIndex + step + ENGINE_ORDER.length) % ENGINE_ORDER.length;
          const nextEngine = ENGINE_ORDER[nextIndex];
          state.settings.engine = nextEngine;
          saveState();
          const engineNameEl = document.getElementById('engineName');
          if (engineNameEl) {
            engineNameEl.textContent = ENGINES[nextEngine][0];
          setEngineIcon(nextEngine);
          }
          renderEngineMenu();
        }
      });
    }

    // Document click to close menus and handle options
    document.addEventListener('click', (e) => {
      // Close engine menu if outside
      if (engineMenu && !e.target.closest('#engineBtn') && !e.target.closest('#engineMenu')) {
        engineMenu.hidden = true;
      }
      // Close add menu if outside
      if (addMenu && !e.target.closest('#btnAdd') && !e.target.closest('#addMenu')) {
        addMenu.hidden = true;
      }

      // Engine option click (delegated)
      const engineOpt = e.target.closest('.engine-opt');
      if (engineOpt) {
        const engine = engineOpt.dataset.engine;
        if (engine && ENGINES[engine]) {
          const state = getState();
          state.settings.engine = engine;
          saveState();
          const engineNameEl = document.getElementById('engineName');
          if (engineNameEl) {
            engineNameEl.textContent = ENGINES[engine][0];
          setEngineIcon(engine);
          }
          if (engineMenu) engineMenu.hidden = true;
        }
        return;
      }

      // Add option click (delegated)
      const addOpt = e.target.closest('.add-opt');
      if (addOpt) {
        const act = addOpt.dataset.act;
        if (act) {
          handleAddAction(act);
          if (addMenu) addMenu.hidden = true;
        }
      }
    });
  }

  // 从任意 JSON 里提取图片地址候选：支持顶层对象 / 数组 / 常见嵌套容器，
  // 字段优先级 hdurl > source_url > image > imgurl > url > src 等；
  // media_type 不是 image 的条目（如 APOD 当天是视频）跳过。
  function extractImageCandidates(root, baseUrl) {
    const out = [];
    const seen = new Set();
    const FIELDS = ['hdurl', 'source_url', 'jetpack_featured_media_url', 'image', 'imgurl', 'img', 'pic', 'cover', 'thumbnail', 'url', 'src'];
    function push(u) {
      if (typeof u !== 'string' || !u) return;
      let abs = u;
      if (!/^https?:\/\//i.test(u)) {
        try { abs = new URL(u, baseUrl).href; } catch (e) { return; }
      }
      if (!seen.has(abs)) { seen.add(abs); out.push(abs); }
    }
    function visit(node, depth) {
      if (!node || depth > 4 || out.length > 40) return;
      if (Array.isArray(node)) { node.forEach(n => visit(n, depth + 1)); return; }
      if (typeof node !== 'object') return;
      if (node.media_type && node.media_type !== 'image') return;
      for (const f of FIELDS) push(node[f]);
      for (const k of ['images', 'data', 'results', 'items', 'list', 'photos', '_embedded']) visit(node[k], depth + 1);
    }
    visit(root, 0);
    return out;
  }

async function fetchGalleryImage(api) {
    try {
      const isWorkerGallery = api.url.includes('workers.dev') && !api.url.endsWith('/today');
      const maxAttempts = isWorkerGallery ? 4 : 1;
      let firstOk = null;
      // Worker 图库按压缩后尺寸重试，最多 4 次，并保留首张成功图兜底
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const res = await fetch(api.url);
          if (!res.ok) continue;

          const contentType = (res.headers.get('content-type') || '').toLowerCase();

          if (contentType.startsWith('image/')) {
            const blob = await res.blob();
            const data = await blobToWallpaperDataURL(blob);
            const result = { dataUrl: data.dataUrl, src: api.url };
            if (!isWorkerGallery) return result;
            if (data.width >= 2560 && data.width > data.height) return result;
            if (!firstOk) firstOk = result;
            continue;
          }

          // 不是图片直链就按 JSON 解析（有些接口 JSON 却不带 json 的 content-type）
          let j = null;
          try { j = await res.json(); } catch (e) { j = null; }
          if (!j) continue;

          const cands = extractImageCandidates(j, api.url);
          // 顶层是数组（如 NASA APOD 列表）时打乱候选，随机一张才有变化
          if (Array.isArray(j) && cands.length > 1) {
            for (let i = cands.length - 1; i > 0; i--) {
              const k = Math.floor(Math.random() * (i + 1));
              const t = cands[i]; cands[i] = cands[k]; cands[k] = t;
            }
          }
          // 逐个候选尝试：要求返回的真是图片，拿到 HTML 页/坏链就换下一个
          for (const src of cands.slice(0, 8)) {
            try {
              const imgRes = await fetch(src);
              if (!imgRes.ok) continue;
              const ict = (imgRes.headers.get('content-type') || '').toLowerCase();
              if (ict && !ict.startsWith('image/')) continue;
              const blob = await imgRes.blob();
              if (blob.type && !blob.type.startsWith('image/')) continue;
              const data = await blobToWallpaperDataURL(blob).catch(() => null);
              if (!data) continue;
              const result = { dataUrl: data.dataUrl, src };
              if (!isWorkerGallery) return result;
              if (data.width >= 2560 && data.width > data.height) return result;
              if (!firstOk) firstOk = result;
              break; // 当前 Worker 图不达标，丢弃并重新请求 api.url
            } catch (e) { /* 换下一个候选 */ }
          }
        } catch (e) {
          continue;
        }
      }
      return isWorkerGallery ? firstOk : null;
    } catch (e) {
      return null;
    }
  }

  async function maybeRotateWallpaper() {
    try {
      const st = getState();
      const s = st.settings;

      if (!s.wpRotate || !s.wpRotate.on) return;

      const every = s.wpRotate.every;
      const now = Date.now();
      const last = s.wpRotateLast || 0;

      if (every === 'hour' && now - last < 3600000) return;
      if (every === 'day' && now - last < 86400000) return;
      if (every !== 'open' && every !== 'hour' && every !== 'day') return;

      const apis = Array.isArray(s.wpApis) ? s.wpApis : [];
      if (apis.length === 0) return;
      const onlyUrl = s.wpRotate && s.wpRotate.onlyUrl;
      const matchedApis = onlyUrl ? apis.filter(a => a && a.url === onlyUrl) : [];
      const pool = matchedApis.length > 0 ? matchedApis : apis;

      const firstIndex = Math.floor(Math.random() * pool.length);
      let res = await fetchGalleryImage(pool[firstIndex]);
      if (!res) return;

      if (pool.length > 1 && res.src && res.src === s.wpRotateSrc) {
        let secondIndex = firstIndex;
        while (secondIndex === firstIndex) {
          secondIndex = Math.floor(Math.random() * pool.length);
        }

        const secondRes = await fetchGalleryImage(pool[secondIndex]);
        if (secondRes && secondRes.src && secondRes.src !== s.wpRotateSrc) {
          res = secondRes;
        }
      }

      {
        const _desk = (getState().desktops || []).find(d => d.id === getState().activeDesktop);
        if (_desk && _desk.wallpaper) return; // 当前桌面用独立壁纸时不自动轮换
      }
      s.wallpaper = { type: 'image', value: await storeWallpaperDataUrl(res.dataUrl) };
      s.wpRotateLast = Date.now();
      s.wpRotateSrc = res.src || '';

      saveState();
      applyWallpaper();
    } catch (e) {
      return;
    }
  }

  // Initialize
  function init() {
    applyWallpaper();
    maybeRotateWallpaper();
    if (window.NTPlus) { NTPlus.initSearchHistory(); NTPlus.purgeTrash(); }
    renderEngineMenu();
    initEngineName();
    bindEvents();
    if (window.NTI18N) NTI18N.init(getState().settings.lang || 'zh');
    maybeShowOnboarding();
    applySearchStyle();
    applyMinimal();
    initDesktopKeys();
    initDeskWpWatch();
    applyWallpaperPerDesk();
  }

  // core.js 在 DOMContentLoaded 时才 loadState，extra 必须等 NT.state 就绪。
  // core 的监听器注册得更早、会先执行，所以这里也挂 DOMContentLoaded 即可；
  // 若脚本执行时核心状态已就绪（如动态加载），直接 init。
  const boot = () => { if (window.NT && NT.state) init(); };
  if (document.readyState === 'loading' || !(window.NT && NT.state)) {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    init();
  }
})();
