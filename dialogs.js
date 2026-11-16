(function () {
  'use strict';

  const NT = window.NT;
  if (!NT) return;

  function toast(msg) {
    if (typeof window.NTToast === 'function') {
      window.NTToast(msg);
    } else {
      alert(msg);
    }
  }

  function fileToIconDataURL(file, cb) {
    // SVG 是矢量，直接存原始 data URL，不走画布栅格化
    if (file && (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name || ''))) {
      const r2 = new FileReader();
      r2.onload = (e) => cb(e.target.result);
      r2.readAsDataURL(file);
      return;
    }
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

  function openAddDesktop() {
    const body = document.createElement('div');
    body.innerHTML = `
      <form id="dlg-add-desktop-form" class="dlg-form">
        <div class="field">
          <label>名称</label>
          <input type="text" id="dlg-add-name" class="input" value="新桌面" />
        </div>
        <div class="field">
          <label>图标</label>
          <input type="text" id="dlg-add-icon" class="input" value="📁" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-ghost" id="dlg-add-cancel">取消</button>
          <button type="submit" class="btn">确定</button>
        </div>
      </form>
    `;
    const modalBody = NT.openModal('添加桌面', body);
    const form = modalBody.querySelector('#dlg-add-desktop-form');
    const nameInput = modalBody.querySelector('#dlg-add-name');
    const iconInput = modalBody.querySelector('#dlg-add-icon');

    modalBody.querySelector('#dlg-add-cancel').addEventListener('click', () => NT.closeModal());

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInput.value.trim() || '新桌面';
      const icon = iconInput.value.trim() || '📁';
      const newDesktop = {
        id: NT.uid(),
        name: name,
        icon: icon,
        layoutMode: 'grid'
      };
      NT.state.desktops.push(newDesktop);
      NT.saveState();
      NT.rerender();
      NT.closeModal();
    });
  }

  function openRenameDesktop(desktopId) {
    const desktop = NT.state.desktops.find(d => d.id === desktopId);
    if (!desktop) return;
    const body = document.createElement('div');
    body.innerHTML = `
      <form id="dlg-rename-desktop-form" class="dlg-form">
        <div class="field">
          <label>名称</label>
          <input type="text" id="dlg-rename-name" class="input" value="${NT.esc(desktop.name)}" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-ghost" id="dlg-rename-cancel">取消</button>
          <button type="submit" class="btn">确定</button>
        </div>
      </form>
    `;
    const modalBody = NT.openModal('重命名桌面', body);
    const form = modalBody.querySelector('#dlg-rename-desktop-form');
    const nameInput = modalBody.querySelector('#dlg-rename-name');

    modalBody.querySelector('#dlg-rename-cancel').addEventListener('click', () => NT.closeModal());

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const newName = nameInput.value.trim();
      if (newName) {
        desktop.name = newName;
        NT.saveState();
        NT.rerender();
      }
      NT.closeModal();
    });
  }

  function deleteDesktop(desktopId) {
    const state = NT.state;
    if (state.desktops.length <= 1) {
      toast('至少保留一个桌面');
      return;
    }
    const desktopIndex = state.desktops.findIndex(d => d.id === desktopId);
    if (desktopIndex === -1) return;

    // 将该桌面的所有 items 移入回收站
    const desktopItems = state.items.filter(i => i.desktopId === desktopId);
    desktopItems.forEach(item => NT.moveToTrash(item));

    // 删除桌面
    state.desktops.splice(desktopIndex, 1);

    // 如果 activeDesktop 被删，切换到第一个
    if (state.activeDesktop === desktopId) {
      state.activeDesktop = state.desktops[0].id;
    }
    NT.saveState();
    NT.rerender();
  }

  function openEditIcon(item) {
    const data = item.data || { name: '', url: '', color: NT.PALETTE[0], letter: '' };
    const body = document.createElement('div');
    body.innerHTML = `
      <form id="dlg-edit-icon-form" class="dlg-form">
        <div class="field">
          <label>名称</label>
          <input type="text" id="dlg-icon-name" class="input" value="${NT.esc(data.name || '')}" />
        </div>
        <div class="field">
          <label>网址</label>
          <input type="text" id="dlg-icon-url" class="input" value="${NT.esc(data.url || '')}" />
        </div>
        <div class="field">
          <label>颜色</label>
          <div class="color-dots" id="dlg-icon-colors">
            ${NT.PALETTE.map(color => `<button type="button" class="color-dot${color === data.color ? ' sel' : ''}" data-color="${color}" style="background:${color}"></button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label>自定义图标</label>
          <input type="file" id="dlg-icon-file" accept="image/*" />
          ${data.customIcon ? '<button type="button" class="btn-ghost" id="dlg-icon-clear" style="margin-top:6px;">清除自定义图标</button>' : ''}
          <div style="font-size:12px;color:#8e8e94;margin-top:4px;">上传后优先于网站 logo 显示，且不带背景色</div>
        </div>
        <div class="field">
          <label>从图标库选择</label>
          <div id="dlg-icon-lib"></div>
          <div style="font-size:12px;color:#8e8e94;margin-top:4px;">选了库图标后优先于网站 logo 显示；与自定义上传二选一，再次点击已选图标可取消</div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-ghost" id="dlg-icon-cancel">取消</button>
          <button type="submit" class="btn">保存</button>
        </div>
      </form>
    `;
    const modalBody = NT.openModal('编辑图标', body);
    const form = modalBody.querySelector('#dlg-edit-icon-form');
    const nameInput = modalBody.querySelector('#dlg-icon-name');
    const urlInput = modalBody.querySelector('#dlg-icon-url');
    const colorDots = modalBody.querySelectorAll('.color-dot');

    modalBody.querySelector('#dlg-icon-cancel').addEventListener('click', () => NT.closeModal());

    let pendingIcon = data.customIcon || null;
    let pendingLib = data.iconLib || null;
    const libPicker = NT.buildIconLibPicker(modalBody.querySelector('#dlg-icon-lib'), pendingLib, (slug) => { pendingLib = slug; if (slug) pendingIcon = null; });
    const fileInput = modalBody.querySelector('#dlg-icon-file');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const f = e.target.files[0];
        if (f) fileToIconDataURL(f, (url) => { pendingIcon = url; pendingLib = null; if (libPicker) libPicker.clear(); });
      });
    }
    const clearBtn = modalBody.querySelector('#dlg-icon-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => { pendingIcon = null; clearBtn.remove(); });
    }

    colorDots.forEach(dot => {
      dot.addEventListener('click', () => {
        colorDots.forEach(d => d.classList.remove('sel'));
        dot.classList.add('sel');
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      const url = urlInput.value.trim();
      const selectedColor = modalBody.querySelector('.color-dot.sel')?.dataset.color || NT.PALETTE[0];
      if (name) {
        item.data = {
          name: name,
          url: url,
          color: selectedColor,
          letter: name.charAt(0).toUpperCase(),
          ...(pendingIcon ? { customIcon: pendingIcon } : {}),
          ...(!pendingIcon && pendingLib ? { iconLib: pendingLib } : {})
        };
        NT.saveState();
        NT.rerender();
      }
      NT.closeModal();
    });
  }

  function openEditFolder(item) {
    const data = item.data || { name: '', color: NT.PALETTE[0], children: [] };
    const children = [...(data.children || [])];
    let childAddCounter = 0;

    const body = document.createElement('div');
    body.innerHTML = `
      <form id="dlg-edit-folder-form" class="dlg-form">
        <div class="field">
          <label>名称</label>
          <input type="text" id="dlg-folder-name" class="input" value="${NT.esc(data.name || '')}" />
        </div>
        <div class="field">
          <label>子项</label>
          <div id="dlg-folder-children" class="children-list"></div>
        </div>
        <div class="field add-child-form">
          <div class="add-child-inputs">
            <input type="text" id="dlg-child-name" class="input" placeholder="名称" />
            <input type="text" id="dlg-child-url" class="input" placeholder="网址" />
          </div>
          <button type="button" class="btn-ghost" id="dlg-child-add">添加子项</button>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-ghost" id="dlg-folder-cancel">取消</button>
          <button type="submit" class="btn">保存</button>
        </div>
      </form>
    `;
    const modalBody = NT.openModal('编辑文件夹', body);
    const form = modalBody.querySelector('#dlg-edit-folder-form');
    const nameInput = modalBody.querySelector('#dlg-folder-name');
    const childrenList = modalBody.querySelector('#dlg-folder-children');
    const childNameInput = modalBody.querySelector('#dlg-child-name');
    const childUrlInput = modalBody.querySelector('#dlg-child-url');
    const addChildBtn = modalBody.querySelector('#dlg-child-add');
    const cancelBtn = modalBody.querySelector('#dlg-folder-cancel');

    function renderChildren() {
      if (children.length === 0) {
        childrenList.innerHTML = '<div class="empty-tip">暂无子项</div>';
        return;
      }
      childrenList.innerHTML = children.map((child, index) => `
        <div class="child-row" data-index="${index}">
          <span class="child-name">${child.isFolder ? '📁 ' : ''}${NT.esc(child.name)}</span>
          <button type="button" class="btn-ghost child-delete" data-index="${index}">删除</button>
        </div>
      `).join('');
      childrenList.querySelectorAll('.child-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.index, 10);
          children.splice(idx, 1);
          renderChildren();
        });
      });
    }
    renderChildren();

    addChildBtn.addEventListener('click', () => {
      const name = childNameInput.value.trim();
      const url = childUrlInput.value.trim();
      if (!name) return;
      const color = NT.PALETTE[children.length % NT.PALETTE.length];
      children.push({
        name: name,
        url: url,
        color: color,
        letter: name.charAt(0).toUpperCase()
      });
      childNameInput.value = '';
      childUrlInput.value = '';
      renderChildren();
    });

    cancelBtn.addEventListener('click', () => NT.closeModal());

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const folderName = nameInput.value.trim();
      if (folderName) {
        item.data = {
          name: folderName,
          color: data.color || NT.PALETTE[0],
          children: children
        };
        NT.saveState();
        NT.rerender();
      }
      NT.closeModal();
    });
  }

  document.addEventListener('contextmenu', function (e) {
    // 桌面按钮
    const deskBtn = e.target.closest('.desk-btn');
    if (deskBtn) {
      e.preventDefault();
      const desktopId = deskBtn.dataset.id;
      NT.showCtxMenu(e.clientX, e.clientY, [
        { act: 'rename', label: '重命名' },
        { act: 'delete', label: '删除桌面' }
      ], (act) => {
        if (act === 'rename') {
          openRenameDesktop(desktopId);
        } else if (act === 'delete') {
          deleteDesktop(desktopId);
        }
      });
      return;
    }

    // 图标/文件夹/组件格子
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const itemId = cell.dataset.id;
    if (!itemId) return;
    const item = NT.findItem(itemId);
    if (!item) return;

    e.preventDefault();

    let options = [];
    if (item.type === 'icon') {
      options = [
        { act: 'edit', label: '编辑' },
        { act: 'duplicate', label: '复制' },
        { act: 'copylink', label: '复制链接' },
        { act: 'delete', label: '删除' }
      ];
    } else if (item.type === 'folder') {
      options = [
        { act: 'edit', label: '编辑' },
        { act: 'duplicate', label: '复制' },
        { act: 'delete', label: '删除' }
      ];
    } else if (item.type === 'widget') {
      options = [];
      if (item.data && item.data.kind === 'analog') {
        options.push({ act: 'style', label: item.data.style === 'digital' ? '切换为表盘样式' : '切换为数字样式' });
      }
      if (window.NTFree && !NTFree.isFree() && item.data) {
        NTFree.tiersFor(item.data.kind).forEach((t, i) => {
          if (t.w !== item.w || t.h !== item.h) {
            options.push({ act: 'tier' + i, label: '尺寸 · ' + t.label + ' ' + t.w + '×' + t.h });
          }
        });
      }
      options.push({ act: 'delete', label: '删除' });
    }

    (NT.state.desktops || []).forEach((d) => {
      if (d.id !== item.desktopId && !d.locked) {
        options.push({ act: 'todesk:' + d.id, label: '显示到「' + d.name + '」' });
      }
    });

    if (options.length === 0) return;

    // 桌面锁定：只保留复制链接，其余菜单不弹
    if (typeof NT.isLocked === 'function' && NT.isLocked()) {
      options = options.filter(o => o.act === 'copylink');
      if (!options.length) return;
    }
    NT.showCtxMenu(e.clientX, e.clientY, options, (act) => {
      if (act === 'duplicate') {
        NT.duplicateItem(item);
      } else if (act && act.indexOf('todesk:') === 0) {
        NT.addToDesktop(item, act.slice(7));
      } else if (act === 'copylink') {
        const url = (item.data && item.data.url) || '';
        if (url) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => toast('链接已复制'), () => toast('复制失败'));
          } else {
            const ta = document.createElement('textarea');
            ta.value = url; document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); toast('链接已复制'); } catch (err) { toast('复制失败'); }
            ta.remove();
          }
        }
      } else if (act && act.indexOf('tier') === 0 && window.NTFree && item.data) {
        const t = NTFree.tiersFor(item.data.kind)[parseInt(act.slice(4), 10)];
        if (t) NTFree.applyTier(item, t.w, t.h);
      } else if (act === 'delete') {
        if (item.type === 'folder' && window.NTPlus && NTPlus.deleteFolder(item)) {
          // 文件夹删除由 NTPlus 弹窗二选一处理
        } else {
          NT.moveToTrash(item);
          NT.saveState();
          NT.rerender();
        }
      } else if (act === 'style') {
        item.data = item.data || {};
        item.data.style = item.data.style === 'digital' ? 'dial' : 'digital';
        NT.saveState();
        NT.rerender();
      } else if (act === 'edit') {
        if (item.type === 'icon') {
          openEditIcon(item);
        } else if (item.type === 'folder') {
          openEditFolder(item);
        }
      }
    });
  });

function openBookmarkImport() {
  NT.openModal(
    '导入浏览器书签',
    '<div class="bm-dialog">' +
      '<p class="bm-desc">导入后会在当前桌面生成一个文件夹。</p>' +
      '<div class="bm-row"><button type="button" id="bmApiBtn" class="btn">从浏览器读取书签</button></div>' +
      '<div class="bm-row">' +
        '<label class="bm-file-label" for="bmFile">或导入书签 HTML 文件</label>' +
        '<input type="file" id="bmFile" accept=".html,.htm">' +
      '</div>' +
      '<div class="bm-row"><select id="bmFolderSel" hidden></select></div>' +
      '<div id="bmInfo" class="bm-info"></div>' +
      '<div class="bm-row"><button type="button" id="bmImport" class="btn primary" disabled>导入为文件夹</button></div>' +
    '</div>'
  );

  const apiBtn = document.getElementById('bmApiBtn');
  const fileInput = document.getElementById('bmFile');
  const sel = document.getElementById('bmFolderSel');
  const info = document.getElementById('bmInfo');
  const importBtn = document.getElementById('bmImport');

  let pendingName = '';
  let pendingChildren = [];
  const MAX_URLS = 200;
  const seenUrls = new Set();
  let urlCount = 0;

  function getTreeAsync(api) {
    try {
      const p = api.bookmarks.getTree();
      if (p && typeof p.then === 'function') return p;
    } catch (e) {}
    return new Promise((res) => {
      try {
        api.bookmarks.getTree(res);
      } catch (e) {
        res([]);
      }
    });
  }

  function countUrls(node) {
    let c = 0;
    (function rec(n) {
      if (!n) return;
      if (n.url) c++;
      if (Array.isArray(n.children)) n.children.forEach(rec);
    })(node);
    return c;
  }

  function walk(nodes, path, out) {
    (Array.isArray(nodes) ? nodes : []).forEach((n) => {
      if (!n || !Array.isArray(n.children)) return;
      const title = n.title || '未命名文件夹';
      const full = path ? path + ' / ' + title : title;
      out.push({ path: full, node: n });
      walk(n.children, full, out);
    });
    return out;
  }

  function resetBudget() {
    seenUrls.clear();
    urlCount = 0;
  }

  function addUrl(name, url) {
    if (!url || seenUrls.has(url) || urlCount >= MAX_URLS) return null;
    seenUrls.add(url);
    urlCount++;
    return { name: name || url, url };
  }

  function flat(node, out) {
    out = out || [];
    if (!node) return out;
    if (node.url) {
      const it = addUrl(node.title, node.url);
      if (it) out.push(it);
      return out;
    }
    (Array.isArray(node.children) ? node.children : []).forEach((c) => flat(c, out));
    return out;
  }

  function buildChildren(node) {
    resetBudget();
    const res = [];
    (Array.isArray(node && node.children) ? node.children : []).forEach((c) => {
      if (!c) return;
      if (c.url) {
        const it = addUrl(c.title, c.url);
        if (it) res.push(it);
      } else if (Array.isArray(c.children)) {
        res.push({
          name: c.title || '文件夹',
          isFolder: true,
          children: flat(c, [])
        });
      }
    });
    return res;
  }

  function applyPending(folder) {
    if (!folder) return;
    const parts = String(folder.path || '').split(' / ');
    pendingName = parts[parts.length - 1] || '书签';
    pendingChildren = buildChildren(folder.node);
    info.textContent = '将导入 ' + pendingChildren.length + ' 个书签（含子文件夹）';
    importBtn.disabled = pendingChildren.length === 0;
  }

  let folderList = [];

  apiBtn.addEventListener('click', async () => {
    const api =
      typeof chrome !== 'undefined' && (chrome.bookmarks || (chrome.permissions && chrome.permissions.request))
        ? chrome
        : typeof browser !== 'undefined' && (browser.bookmarks || (browser.permissions && browser.permissions.request))
        ? browser
        : null;

    if (!api) {
      info.textContent = '当前环境不支持直接读取，请用书签文件导入';
      return;
    }

    // bookmarks 是可选权限：授权前 chrome.bookmarks 不存在，必须先申请权限再读取
    if (!api.bookmarks && api.permissions && api.permissions.request) {
      info.textContent = '正在请求书签读取权限…';
      let granted = false;
      try { granted = await api.permissions.request({ permissions: ['bookmarks'] }); } catch (e) {}
      if (granted !== true && api.permissions.contains) {
        try { granted = await api.permissions.contains({ permissions: ['bookmarks'] }); } catch (e) {}
      }
      if (!granted || !api.bookmarks) {
        info.textContent = '未获得书签读取权限，请用书签文件导入';
        return;
      }
    }

    info.textContent = '正在读取书签…';
    let tree = [];
    try {
      tree = await getTreeAsync(api);
    } catch (e) {
      tree = [];
    }

    folderList = walk(tree, '', []).filter((f) => countUrls(f.node) > 0);

    if (!folderList.length) {
      sel.hidden = true;
      info.textContent = '没有读取到可导入的书签';
      pendingChildren = [];
      importBtn.disabled = true;
      return;
    }

    sel.innerHTML = '';
    folderList.forEach((f, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = f.path + '（' + countUrls(f.node) + ' 个书签）';
      sel.appendChild(opt);
    });
    sel.hidden = false;

    sel.onchange = () => {
      applyPending(folderList[Number(sel.value)]);
    };

    applyPending(folderList[0]);
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      let doc = null;
      try {
        doc = new DOMParser().parseFromString(String(reader.result || ''), 'text/html');
      } catch (e) {
        info.textContent = '文件解析失败';
        return;
      }

      const anchors = doc.querySelectorAll('a[href]');
      const localSeen = new Set();
      const arr = [];

      for (let i = 0; i < anchors.length; i++) {
        const a = anchors[i];
        const href = (a.getAttribute('href') || '').trim();
        if (!/^http/i.test(href)) continue;
        if (localSeen.has(href)) continue;
        localSeen.add(href);
        arr.push({ name: (a.textContent || '').trim() || href, url: href });
        if (arr.length >= MAX_URLS) break;
      }

      if (!arr.length) {
        pendingChildren = [];
        importBtn.disabled = true;
        info.textContent = '没有找到可导入的书签';
        return;
      }

      pendingName = '导入的书签';
      pendingChildren = arr;
      info.textContent = '将导入 ' + arr.length + ' 个书签';
      importBtn.disabled = false;
    };
    reader.readAsText(file);
  });

  importBtn.addEventListener('click', () => {
    if (!pendingChildren || !pendingChildren.length) return;
    const item = NT.importBookmarkFolder(pendingName, pendingChildren);
    if (item) {
      NT.closeModal();
      toast('已导入 ' + pendingChildren.length + ' 个书签到文件夹「' + pendingName + '」');
    }
  });
}

  window.NTDialogs = {
    openAddDesktop,
    openBookmarkImport,
    openRenameDesktop,
    deleteDesktop
  };
})();
