(function () {
  'use strict';

  var W = window.WIDGETS = window.WIDGETS || {};

  function nodrag(el) {
    el.addEventListener('pointerdown', function (e) { e.stopPropagation(); }, true);
  }

  function elt(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function clearTimer(el) {
    if (el.dataset && el.dataset.interval) {
      clearInterval(Number(el.dataset.interval));
      delete el.dataset.interval;
    }
  }

  /* ---------------- 1. 待办事项 ---------------- */

  function renderTodo(el, item) {
    var d = item.data || (item.data = {});
    if (!Array.isArray(d.todos)) d.todos = [{ t: '文字', done: false }];

    clearTimer(el);
    el.innerHTML = '';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.height = '100%';
    el.style.boxSizing = 'border-box';
    el.style.overflow = 'hidden';

    function refresh() {
      NT.saveState();
      renderTodo(el, item);
    }

    var doneN = 0;
    d.todos.forEach(function (t) { if (t.done) doneN++; });

    var head = elt('div', 'w2-title');
    head.appendChild(elt('span', null, '待办事项'));
    head.appendChild(elt('span', null, '已完成 ' + doneN + '/' + d.todos.length));
    el.appendChild(head);

    var list = elt('div', 'w2-todo-list');
    if (!d.todos.length) {
      var empty = elt('div', null, '暂无待办');
      empty.style.color = 'var(--ink-3)';
      empty.style.fontSize = '.85rem';
      empty.style.padding = '8px 2px';
      list.appendChild(empty);
    }

    d.todos.forEach(function (t, i) {
      var row = elt('div', 'w2-todo-row');

      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!t.done;
      nodrag(cb);
      cb.addEventListener('change', function () {
        t.done = cb.checked;
        refresh();
      });

      var span = elt('span', t.done ? 'done' : null, t.t);
      span.style.flex = '1';
      span.style.minWidth = '0';
      span.style.wordBreak = 'break-word';

      var del = elt('button', 'w2-todo-del', '×');
      del.type = 'button';
      nodrag(del);
      del.addEventListener('click', function () {
        d.todos.splice(i, 1);
        refresh();
      });

      row.appendChild(cb);
      row.appendChild(span);
      row.appendChild(del);
      list.appendChild(row);
    });
    el.appendChild(list);

    var addRow = elt('div', 'w2-addrow');
    var inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = '添加待办，回车确认';
    nodrag(inp);

    var addBtn = elt('button', null, '添加');
    addBtn.type = 'button';
    addBtn.style.cssText = 'padding:6px 10px;border-radius:8px;border:1px solid rgba(128,128,140,.35);' +
      'background:rgba(255,255,255,.3);color:var(--ink-1);cursor:pointer;font-size:.85rem;';
    nodrag(addBtn);

    function add() {
      var v = inp.value.trim();
      if (!v) return;
      d.todos.push({ t: v, done: false });
      refresh();
    }
    addBtn.addEventListener('click', add);
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        add();
      }
    });

    addRow.appendChild(inp);
    addRow.appendChild(addBtn);
    el.appendChild(addRow);
  }

  /* ---------------- 2. 笔记 ---------------- */

  function renderNote(el, item) {
    var d = item.data || (item.data = {});
    if (typeof d.text !== 'string') d.text = '';

    el.innerHTML = '';
    el.style.padding = '0';
    el.style.height = '100%';
    el.style.boxSizing = 'border-box';

    var ta = document.createElement('textarea');
    ta.className = 'w2-note';
    ta.placeholder = '写点什么…';
    ta.value = d.text;
    nodrag(ta);
    ta.addEventListener('input', function () {
      d.text = ta.value;
      NT.saveState();
    });

    el.appendChild(ta);
  }

  /* ---------------- 3. 每日一言 ---------------- */

  var QUOTES = [
    '生活不是等待风暴过去，而是学会在雨中起舞。',
    '千里之行，始于足下。 —— 老子',
    '不要因为走得太远，忘记为什么出发。 —— 纪伯伦',
    '既然选择了远方，便只顾风雨兼程。 —— 汪国真',
    '天行健，君子以自强不息。 —— 《周易》',
    '海内存知己，天涯若比邻。 —— 王勃',
    '山重水复疑无路，柳暗花明又一村。 —— 陆游',
    '长风破浪会有时，直挂云帆济沧海。 —— 李白',
    '会当凌绝顶，一览众山小。 —— 杜甫',
    '纸上得来终觉浅，绝知此事要躬行。 —— 陆游',
    '不积跬步，无以至千里。 —— 荀子',
    '愿你出走半生，归来仍是少年。',
    '星光不问赶路人，时光不负有心人。',
    '慢慢来，比较快。',
    '所有的努力，都值得被温柔以待。',
    '种一棵树最好的时间是十年前，其次是现在。',
    '不经一番寒彻骨，怎得梅花扑鼻香。 —— 黄檗禅师',
    '路漫漫其修远兮，吾将上下而求索。 —— 屈原',
    '莫愁前路无知己，天下谁人不识君。 —— 高适',
    '宝剑锋从磨砺出，梅花香自苦寒来。',
    '愿你成为自己的太阳，无需凭借谁的光。',
    '心有猛虎，细嗅蔷薇。 —— 西格弗里德·萨松',
    '行到水穷处，坐看云起时。 —— 王维',
    '少壮不努力，老大徒伤悲。 —— 《长歌行》',
    '凡是过往，皆为序章。 —— 莎士比亚',
    '保持热爱，奔赴山海。'
  ];

  function renderQuote(el, item) {
    var d = item.data || (item.data = {});
    var now = new Date();
    if (typeof d.idx !== 'number' || d.idx < 0 || d.idx >= QUOTES.length) {
      d.idx = (now.getFullYear() * 372 + (now.getMonth() + 1) * 31 + now.getDate()) % QUOTES.length;
    }

    el.innerHTML = '';
    el.style.height = '100%';
    el.style.boxSizing = 'border-box';

    var wrap = elt('div', 'w2-quote-wrap');
    var txt = elt('div', 'w2-quote-text', QUOTES[d.idx]);

    var btn = elt('button', 'w2-quote-btn', '换一句');
    btn.type = 'button';
    nodrag(btn);
    btn.addEventListener('click', function () {
      var i = d.idx;
      if (QUOTES.length > 1) {
        while (i === d.idx) i = Math.floor(Math.random() * QUOTES.length);
      }
      d.idx = i;
      NT.saveState();
      renderQuote(el, item);
    });

    wrap.appendChild(txt);
    wrap.appendChild(btn);
    el.appendChild(wrap);
  }

  /* ---------------- 4. 生日 ---------------- */

  function daysUntil(dateStr) {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var m = parseInt(dateStr.slice(0, 2), 10);
    var dd = parseInt(dateStr.slice(3, 5), 10);
    var target = new Date(today.getFullYear(), m - 1, dd);
    if (target < today) target = new Date(today.getFullYear() + 1, m - 1, dd);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  }

  function openBirthdayModal(el, item, d) {
    var box = NT.openModal('生日', '<div style="font-size:.8rem;color:var(--ink-3);margin-bottom:8px;">每行一个，格式：名字,MM-DD</div>');
    if (!box) return;

    var ta = document.createElement('textarea');
    ta.style.cssText = 'width:100%;height:150px;box-sizing:border-box;padding:8px;border-radius:8px;' +
      'border:1px solid rgba(128,128,140,.35);background:rgba(255,255,255,.25);color:var(--ink-1);' +
      'font-family:inherit;font-size:.9rem;resize:vertical;outline:none;';
    ta.value = d.list.map(function (x) { return (x.name || '') + ',' + (x.date || ''); }).join('\n');
    nodrag(ta);

    var save = document.createElement('button');
    save.type = 'button';
    save.textContent = '保存';
    save.style.cssText = 'margin-top:10px;padding:6px 16px;border-radius:8px;' +
      'border:1px solid rgba(128,128,140,.35);background:rgba(255,255,255,.3);color:var(--ink-1);cursor:pointer;font-size:.9rem;';
    nodrag(save);

    save.addEventListener('click', function () {
      var list = [];
      ta.value.split('\n').forEach(function (line) {
        var parts = line.split(',');
        if (parts.length < 2) return;
        var name = parts[0].trim();
        var date = parts[1].trim();
        if (!name) return;
        if (!/^\d{2}-\d{2}$/.test(date)) return;
        list.push({ name: name, date: date });
      });
      d.list = list;
      NT.saveState();
      NT.rerender();
      NT.closeModal();
    });

    box.appendChild(ta);
    box.appendChild(save);
  }

  function renderBirthday(el, item) {
    var d = item.data || (item.data = {});
    if (!Array.isArray(d.list)) d.list = [{ name: '小明', date: '06-15' }];

    el.innerHTML = '';
    el.style.height = '100%';
    el.style.boxSizing = 'border-box';

    var wrap = elt('div', 'w2-bday');

    var best = null;
    d.list.forEach(function (x) {
      if (!x || typeof x.date !== 'string') return;
      if (!/^\d{2}-\d{2}$/.test(x.date)) return;
      var n = daysUntil(x.date);
      if (!best || n < best.n) best = { n: n, name: x.name || '未命名', date: x.date };
    });

    if (!best) {
      var tip = elt('div', null, '点击添加生日');
      tip.style.color = 'var(--ink-3)';
      tip.style.fontSize = '.9rem';
      wrap.appendChild(tip);
    } else {
      var nameEl = elt('div', null, best.name);
      nameEl.style.fontSize = '1.1rem';
      nameEl.style.fontWeight = '700';

      var daysEl = elt('div', null, best.n === 0 ? '就是今天 🎂' : ('还有 ' + best.n + ' 天'));
      daysEl.style.fontSize = '1.2rem';
      daysEl.style.fontWeight = '600';
      daysEl.style.color = 'var(--ink-1)';

      var dateEl = elt('div', null, best.date);
      dateEl.style.fontSize = '.78rem';
      dateEl.style.color = 'var(--ink-3)';

      wrap.appendChild(nameEl);
      wrap.appendChild(daysEl);
      wrap.appendChild(dateEl);
    }

    el.appendChild(wrap);

    el.onclick = function () {
      openBirthdayModal(el, item, d);
    };
  }

  /* ---------------- 5. 专注时钟 ---------------- */

  var POMO = new WeakMap();

  function renderPomodoro(el, item) {
    var d = item.data || (item.data = {});
    if (typeof d.focusMin !== 'number' || !(d.focusMin > 0)) d.focusMin = 25;

    clearTimer(el);

    var s = POMO.get(el);
    if (!s) {
      s = { mode: 'focus', left: d.focusMin * 60, running: false };
      POMO.set(el, s);
    }

    el.innerHTML = '';
    el.style.height = '100%';
    el.style.boxSizing = 'border-box';

    var wrap = elt('div', 'w2-pomo');

    var modeEl = elt('div', null, '专注');
    modeEl.style.fontSize = '.8rem';
    modeEl.style.color = 'var(--ink-2)';
    modeEl.style.letterSpacing = '.1em';

    var timeEl = elt('div', 'w2-pomo-time', '00:00');

    var btns = elt('div', 'w2-pomo-btns');
    btns.style.display = 'flex';
    btns.style.gap = '8px';

    var startBtn = elt('button', null, '开始');
    startBtn.type = 'button';
    var resetBtn = elt('button', null, '重置');
    resetBtn.type = 'button';
    nodrag(startBtn);
    nodrag(resetBtn);

    btns.appendChild(startBtn);
    btns.appendChild(resetBtn);
    wrap.appendChild(modeEl);
    wrap.appendChild(timeEl);
    wrap.appendChild(btns);
    el.appendChild(wrap);

    function fmt(sec) {
      if (sec < 0) sec = 0;
      var m = Math.floor(sec / 60);
      var ss = sec % 60;
      return (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
    }

    function paint() {
      timeEl.textContent = fmt(s.left);
      modeEl.textContent = s.mode === 'focus' ? '专注' : '休息';
      startBtn.textContent = s.running ? '暂停' : '开始';
    }

    function tick() {
      s.left -= 1;
      if (s.left <= 0) {
        s.mode = s.mode === 'focus' ? 'break' : 'focus';
        s.left = s.mode === 'focus' ? d.focusMin * 60 : 300;
        timeEl.textContent = fmt(s.left);
        modeEl.textContent = '时间到！';
        setTimeout(function () {
          if (POMO.get(el) === s && el.isConnected) paint();
        }, 1000);
        return;
      }
      paint();
    }

    startBtn.addEventListener('click', function () {
      if (s.running) {
        s.running = false;
        clearTimer(el);
      } else {
        s.running = true;
        el.dataset.interval = setInterval(tick, 1000);
      }
      paint();
    });

    resetBtn.addEventListener('click', function () {
      clearTimer(el);
      s.running = false;
      s.mode = 'focus';
      s.left = d.focusMin * 60;
      paint();
    });

    paint();
  }

  /* ---------------- 注册 ---------------- */

function wcTimeText(tz) {
  try {
    return new Intl.DateTimeFormat('zh-CN', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  } catch (e) {
    return '--:--';
  }
}

function wcDateKey(d, tz) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch (e) {
    return '';
  }
}

function wcDayDiffText(tz) {
  var now = new Date();
  var a = wcDateKey(now, tz);
  var b = wcDateKey(now, Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  if (!a || !b) return '';
  if (a === b) return '今天';
  var da = Date.parse(a + 'T00:00:00Z');
  var db = Date.parse(b + 'T00:00:00Z');
  if (isNaN(da) || isNaN(db)) return '';
  var n = Math.round((da - db) / 86400000);
  return n > 0 ? '+' + n + '天' : n + '天';
}

function calcEval(expr) {
  var s = String(expr).replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '');
  if (!s) throw new Error('empty');
  var i = 0;

  function parseExpr() {
    var v = parseTerm();
    while (i < s.length && (s.charAt(i) === '+' || s.charAt(i) === '-')) {
      var op = s.charAt(i);
      i++;
      var r = parseTerm();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }

  function parseTerm() {
    var v = parseFactor();
    while (i < s.length && (s.charAt(i) === '*' || s.charAt(i) === '/')) {
      var op = s.charAt(i);
      i++;
      var r = parseFactor();
      if (op === '*') {
        v = v * r;
      } else {
        if (r === 0) throw new Error('div0');
        v = v / r;
      }
    }
    return v;
  }

  function parseFactor() {
    var c = s.charAt(i);
    if (c === '+') { i++; return parseFactor(); }
    if (c === '-') { i++; return -parseFactor(); }
    if (c === '(') {
      i++;
      var v = parseExpr();
      if (s.charAt(i) !== ')') throw new Error('paren');
      i++;
      return v;
    }
    var st = i;
    while (i < s.length) {
      var ch = s.charAt(i);
      if ((ch >= '0' && ch <= '9') || ch === '.') i++;
      else break;
    }
    if (st === i) throw new Error('num');
    var n = parseFloat(s.slice(st, i));
    if (!isFinite(n)) throw new Error('num');
    return n;
  }

  var res = parseExpr();
  if (i !== s.length) throw new Error('tail');
  if (!isFinite(res)) throw new Error('inf');
  return res;
}

function calcFmt(n) {
  if (typeof n !== 'number' || !isFinite(n)) return '错误';
  if (n === 0) return '0';
  var r = Math.round(n * 1e10) / 1e10;
  var s = String(r);
  if (s.length > 15) s = String(Number(r.toPrecision(12)));
  return s;
}

function ucCats() {
  return {
    '长度': { units: { '米': 1, '千米': 1000, '厘米': 0.01, '英里': 1609.344, '英尺': 0.3048, '英寸': 0.0254 } },
    '重量': { units: { '千克': 1, '克': 0.001, '斤': 0.5, '磅': 0.45359237, '盎司': 0.028349523125 } },
    '温度': { units: { '摄氏': 1, '华氏': 1, '开尔文': 1 } },
    '面积': { units: { '平方米': 1, '平方千米': 1e6, '公顷': 1e4, '亩': 666.6667, '平方英尺': 0.09290304 } }
  };
}

function ucTempToC(u, v) {
  if (u === '华氏') return (v - 32) * 5 / 9;
  if (u === '开尔文') return v - 273.15;
  return v;
}

function ucTempFromC(u, v) {
  if (u === '华氏') return v * 9 / 5 + 32;
  if (u === '开尔文') return v + 273.15;
  return v;
}

function ucConvert(cat, from, to, v) {
  var cats = ucCats();
  var c = cats[cat];
  if (!c) return NaN;
  if (cat === '温度') return ucTempFromC(to, ucTempToC(from, v));
  var u = c.units;
  if (!(from in u) || !(to in u)) return NaN;
  return v * u[from] / u[to];
}

function ucFmt(n) {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  if (n === 0) return '0';
  var s = n.toFixed(6);
  if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

function cdPad2(n) {
  return (n < 10 ? '0' : '') + n;
}

function cdFmtMs(ms) {
  ms = Math.max(0, ms);
  var total = Math.ceil(ms / 1000);
  var h = Math.floor(total / 3600);
  var m = Math.floor((total % 3600) / 60);
  var s = total % 60;
  if (h > 0) return h + ':' + cdPad2(m) + ':' + cdPad2(s);
  return cdPad2(m) + ':' + cdPad2(s);
}

function hbKey(d) {
  var y = d.getFullYear();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

function hbShift(d, n) {
  var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

function hbStreak(days) {
  var today = new Date();
  var i = days[hbKey(today)] ? 0 : -1;
  var n = 0;
  while (days[hbKey(hbShift(today, i))]) {
    n++;
    i--;
  }
  return n;
}


  // ===== 通用带缓存 JSON 请求（fx / news / hot 共用；QT 亦可复用） =====
  var NT_INFO_PREFIX = 'nt_info_';
  
  function ntInfoRead(key) {
    try {
      const raw = localStorage.getItem(NT_INFO_PREFIX + key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj.ts !== 'number' || !('data' in obj)) return null;
      return obj;
    } catch (e) {
      return null;
    }
  }
  
  function ntInfoWrite(key, ts, data) {
    try {
      localStorage.setItem(NT_INFO_PREFIX + key, JSON.stringify({ ts: ts, data: data }));
    } catch (e) {
      // 配额满 / 隐私模式：静默失败，不影响展示
    }
  }
  
  function fetchJsonCached(key, url, ttlMs) {
    const now = Date.now();
    const cached = ntInfoRead(key);
  
    if (cached && (now - cached.ts) < ttlMs) {
      return Promise.resolve({ data: cached.data, stale: false, ts: cached.ts });
    }
  
    let ctrl = null;
    let timer = null;
    try {
      if (typeof AbortController !== 'undefined') {
        ctrl = new AbortController();
        timer = setTimeout(function () {
          try { ctrl.abort(); } catch (e) {}
        }, 8000);
      }
    } catch (e) {
      ctrl = null;
    }
  
    const opts = { method: 'GET', cache: 'no-store' };
    if (ctrl) opts.signal = ctrl.signal;
  
    return fetch(url, opts)
      .then(function (res) {
        if (!res.ok) throw new Error('http ' + res.status);
        return res.json();
      })
      .then(function (json) {
        if (timer) clearTimeout(timer);
        const ts = Date.now();
        ntInfoWrite(key, ts, json);
        return { data: json, stale: false, ts: ts };
      })
      .catch(function () {
        if (timer) clearTimeout(timer);
        const old = ntInfoRead(key);
        if (old) return { data: old.data, stale: true, ts: old.ts };
        throw new Error('offline');
      });
  }

  Object.assign(W, {
    todo: {
      title: '待办事项',
      w: 2,
      h: 2,
      render: renderTodo,
      destroy: function (el) { clearTimer(el); }
    },
    note: {
      title: '笔记',
      w: 2,
      h: 1,
      render: renderNote,
      destroy: function (el) { clearTimer(el); }
    },
    quote: {
      title: '每日一言',
      w: 2,
      h: 1,
      render: renderQuote,
      destroy: function (el) { clearTimer(el); }
    },
    birthday: {
      title: '生日',
      w: 1,
      h: 1,
      render: renderBirthday,
      destroy: function (el) {
        clearTimer(el);
        el.onclick = null;
      }
    },
    pomodoro: {
      title: '专注时钟',
      w: 1,
      h: 1,
      render: renderPomodoro,
      destroy: function (el) {
        clearTimer(el);
        POMO.delete(el);
      }
    },
    worldclock: {
  title: '世界时钟',
  w: 2,
  h: 1,
  render: function (el, item) {
    var data = item.data || (item.data = {});
    if (!Array.isArray(data.cities) || !data.cities.length) {
      data.cities = [
        { name: '北京', tz: 'Asia/Shanghai' },
        { name: '伦敦', tz: 'Europe/London' },
        { name: '纽约', tz: 'America/New_York' },
        { name: '东京', tz: 'Asia/Tokyo' }
      ];
      NT.saveState();
    }
    var cities = data.cities;
    var PRESET = [
      ['北京', 'Asia/Shanghai'],
      ['上海', 'Asia/Shanghai'],
      ['香港', 'Asia/Hong_Kong'],
      ['东京', 'Asia/Tokyo'],
      ['伦敦', 'Europe/London'],
      ['巴黎', 'Europe/Paris'],
      ['纽约', 'America/New_York'],
      ['洛杉矶', 'America/Los_Angeles'],
      ['悉尼', 'Australia/Sydney'],
      ['迪拜', 'Asia/Dubai'],
      ['新加坡', 'Asia/Singapore']
    ];

    function paintView() {
      clearTimer(el);
      el.innerHTML = '';
      el.style.position = 'relative';

      var box = elt('div');
      box.style.cssText = 'display:flex;justify-content:space-around;align-items:center;height:100%;box-sizing:border-box;padding:14px 6px 4px;gap:4px;';
      el.appendChild(box);

      var cells = [];
      cities.slice(0, 4).forEach(function (c) {
        var cell = elt('div');
        cell.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0;flex:1;';
        var nm = elt('div', '', c.name);
        nm.style.cssText = 'font-size:11px;color:#6b7280;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        var tm = elt('div', '', '--:--');
        tm.style.cssText = 'font-size:17px;font-weight:600;font-variant-numeric:tabular-nums;color:#111827;line-height:1.15;';
        var dd = elt('div', '', '');
        dd.style.cssText = 'font-size:10px;color:#9ca3af;white-space:nowrap;';
        cell.appendChild(nm);
        cell.appendChild(tm);
        cell.appendChild(dd);
        box.appendChild(cell);
        cells.push({ tz: c.tz, tm: tm, dd: dd });
      });

      var btn = elt('button', '', '设置');
      btn.style.cssText = 'position:absolute;top:1px;right:2px;border:none;background:transparent;color:#9ca3af;font-size:10px;padding:1px 4px;cursor:pointer;z-index:3;';
      nodrag(btn);
      btn.onclick = function () { paintEdit(); };
      el.appendChild(btn);

      function tick() {
        cells.forEach(function (c) {
          c.tm.textContent = wcTimeText(c.tz);
          c.dd.textContent = wcDayDiffText(c.tz);
        });
      }
      tick();
      el.dataset.interval = setInterval(tick, 20000);
    }

    function paintEdit() {
      clearTimer(el);
      el.innerHTML = '';
      var wrap = elt('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;padding:4px;box-sizing:border-box;height:100%;overflow:auto;font-size:11px;';
      el.appendChild(wrap);

      cities.forEach(function (c, i) {
        var row = elt('div');
        row.style.cssText = 'display:flex;align-items:center;gap:4px;';
        var nm = elt('span', '', c.name + ' ' + c.tz);
        nm.style.cssText = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#374151;';
        var del = elt('button', '', '删除');
        del.style.cssText = 'flex:none;border:none;border-radius:3px;background:#fee2e2;color:#b91c1c;font-size:10px;padding:0 5px;cursor:pointer;';
        nodrag(del);
        del.onclick = function () {
          cities.splice(i, 1);
          data.cities = cities;
          NT.saveState();
          paintEdit();
        };
        row.appendChild(nm);
        row.appendChild(del);
        wrap.appendChild(row);
      });

      if (!cities.length) {
        var empty = elt('div', '', '还没有城市，请添加');
        empty.style.cssText = 'color:#9ca3af;font-size:10px;';
        wrap.appendChild(empty);
      }

      var sel = elt('select');
      sel.style.cssText = 'width:100%;box-sizing:border-box;font-size:11px;';
      nodrag(sel);
      PRESET.forEach(function (p, idx) {
        var o = elt('option', '', p[0]);
        o.value = String(idx);
        sel.appendChild(o);
      });
      wrap.appendChild(sel);

      var tip = elt('div', '', '');
      tip.style.cssText = 'color:#ef4444;min-height:12px;font-size:10px;';

      var row2 = elt('div');
      row2.style.cssText = 'display:flex;gap:4px;align-items:center;';

      var addBtn = elt('button', '', '添加');
      addBtn.style.cssText = 'flex:1;border:1px solid #d1d5db;background:#f9fafb;border-radius:4px;font-size:11px;padding:2px 0;cursor:pointer;color:#374151;';
      nodrag(addBtn);
      addBtn.onclick = function () {
        var p = PRESET[parseInt(sel.value, 10)] || PRESET[0];
        var tz = p[1];
        if (cities.length >= 6) { tip.textContent = '最多 6 个城市'; return; }
        for (var k = 0; k < cities.length; k++) {
          if (cities[k].tz === tz) { tip.textContent = '该城市已存在'; return; }
        }
        cities.push({ name: p[0], tz: tz });
        data.cities = cities;
        NT.saveState();
        paintEdit();
      };

      var doneBtn = elt('button', '', '完成');
      doneBtn.style.cssText = 'flex:1;border:none;background:#3b82f6;color:#fff;border-radius:4px;font-size:11px;padding:2px 0;cursor:pointer;';
      nodrag(doneBtn);
      doneBtn.onclick = function () {
        if (!cities.length) { tip.textContent = '请至少保留一个城市'; return; }
        NT.saveState();
        paintView();
      };

      row2.appendChild(addBtn);
      row2.appendChild(doneBtn);
      wrap.appendChild(row2);
      wrap.appendChild(tip);
    }

    paintView();
  },
  destroy: function (el) {
    clearTimer(el);
  }
}
,
    calc: {
  title: '计算器',
  w: 1,
  h: 1,
  render: function (el, item) {
    el.innerHTML = '';
    var wrap = elt('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;height:100%;box-sizing:border-box;padding:4px;';
    el.appendChild(wrap);

    var screen = elt('div', '', '0');
    screen.style.cssText = 'min-height:22px;padding:2px 6px;text-align:right;font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;overflow:hidden;white-space:nowrap;color:#111827;box-sizing:border-box;';
    wrap.appendChild(screen);

    var grid = elt('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
    grid.style.gridTemplateRows = 'repeat(5, 1fr)';
    grid.style.gap = '3px';
    grid.style.flex = '1';
    grid.style.minHeight = '0';
    wrap.appendChild(grid);

    var expr = '';

    function show() {
      screen.textContent = expr || '0';
    }

    function press(k) {
      if (k === 'C') {
        expr = '';
        show();
        return;
      }
      if (k === '⌫') {
        expr = expr.slice(0, -1);
        show();
        return;
      }
      if (k === '=') {
        if (!expr) return;
        var v;
        try {
          v = calcEval(expr);
        } catch (e) {
          expr = '';
          screen.textContent = '错误';
          return;
        }
        var s = calcFmt(v);
        if (s === '错误') {
          expr = '';
          screen.textContent = '错误';
          return;
        }
        expr = s;
        show();
        return;
      }
      if (expr.length >= 40) return;
      expr += k;
      show();
    }

    var keys = ['C', '⌫', '(', ')', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', '=', '+'];
    keys.forEach(function (k) {
      var b = elt('button', '', k);
      var isEq = k === '=';
      b.style.cssText = 'font-size:11px;line-height:1;padding:0;border:1px solid ' + (isEq ? '#3b82f6' : '#e5e7eb') +
        ';background:' + (isEq ? '#3b82f6' : '#f9fafb') + ';color:' + (isEq ? '#fff' : '#111827') +
        ';border-radius:4px;cursor:pointer;font-family:inherit;';
      nodrag(b);
      b.onclick = function () { press(k); };
      grid.appendChild(b);
    });

    show();
  },
  destroy: function (el) {
    clearTimer(el);
  }
}
,
    unitconv: {
  title: '单位换算',
  w: 1,
  h: 1,
  render: function (el, item) {
    var data = item.data || (item.data = {});
    var cats = ucCats();
    if (!cats[data.cat]) data.cat = '长度';
    if (data.value == null || data.value === '') data.value = '1';
    if (!data.from) data.from = '';
    if (!data.to) data.to = '';

    function paint() {
      el.innerHTML = '';
      var cat = data.cat;
      var units = Object.keys(cats[cat].units);
      if (units.indexOf(data.from) < 0) data.from = units[0];
      if (units.indexOf(data.to) < 0) data.to = units[1] || units[0];

      var wrap = elt('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;padding:4px;box-sizing:border-box;height:100%;font-size:11px;overflow:hidden;';
      el.appendChild(wrap);

      var selCat = elt('select');
      selCat.style.cssText = 'width:100%;box-sizing:border-box;font-size:11px;font-family:inherit;';
      nodrag(selCat);
      Object.keys(cats).forEach(function (k) {
        var o = elt('option', '', k);
        o.value = k;
        selCat.appendChild(o);
      });
      selCat.value = cat;
      selCat.onchange = function () {
        data.cat = selCat.value;
        data.from = '';
        data.to = '';
        NT.saveState();
        paint();
      };
      wrap.appendChild(selCat);

      function makeUnitSel(cur) {
        var s = elt('select');
        s.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;font-size:11px;font-family:inherit;';
        nodrag(s);
        Object.keys(cats[cat].units).forEach(function (u) {
          var o = elt('option', '', u);
          o.value = u;
          s.appendChild(o);
        });
        s.value = cur;
        return s;
      }

      var row1 = elt('div');
      row1.style.cssText = 'display:flex;gap:3px;align-items:center;';

      var inp = elt('input');
      inp.type = 'text';
      inp.setAttribute('inputmode', 'decimal');
      inp.value = data.value;
      inp.style.cssText = 'flex:1;min-width:0;box-sizing:border-box;font-size:11px;font-family:inherit;padding:1px 3px;border:1px solid #d1d5db;border-radius:3px;';
      nodrag(inp);
      var selFrom = makeUnitSel(data.from);
      row1.appendChild(inp);
      row1.appendChild(selFrom);
      wrap.appendChild(row1);

      var row2 = elt('div');
      row2.style.cssText = 'display:flex;gap:3px;align-items:center;';
      var arrow = elt('span', '', '→');
      arrow.style.cssText = 'flex:none;color:#9ca3af;';
      var selTo = makeUnitSel(data.to);
      row2.appendChild(arrow);
      row2.appendChild(selTo);
      wrap.appendChild(row2);

      var outRow = elt('div');
      outRow.style.cssText = 'display:flex;align-items:baseline;gap:4px;margin-top:auto;';
      var eq = elt('span', '', '=');
      eq.style.cssText = 'flex:none;color:#9ca3af;';
      var out = elt('div', '', '');
      out.style.cssText = 'flex:1;min-width:0;font-size:14px;font-weight:600;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      outRow.appendChild(eq);
      outRow.appendChild(out);
      wrap.appendChild(outRow);

      function recalc() {
        var num = parseFloat(String(inp.value).replace(',', '.'));
        if (!isFinite(num)) { out.textContent = '—'; return; }
        out.textContent = ucFmt(ucConvert(data.cat, selFrom.value, selTo.value, num));
      }

      inp.oninput = function () {
        data.value = inp.value;
        NT.saveState();
        recalc();
      };
      selFrom.onchange = function () {
        data.from = selFrom.value;
        NT.saveState();
        recalc();
      };
      selTo.onchange = function () {
        data.to = selTo.value;
        NT.saveState();
        recalc();
      };

      recalc();
    }

    paint();
  },
  destroy: function (el) {
    clearTimer(el);
  }
}
,
    countdown2: {
  title: '倒计时器',
  w: 1,
  h: 1,
  render: function (el, item) {
    var data = item.data || (item.data = {});
    if (typeof data.mins !== 'number' || data.mins <= 0) data.mins = 5;
    if (typeof data.endAt !== 'number') data.endAt = null;
    if (typeof data.pausedLeft !== 'number') data.pausedLeft = null;
    if (typeof data.done !== 'boolean') data.done = false;

    if (data.endAt && data.endAt <= Date.now()) {
      data.endAt = null;
      data.pausedLeft = 0;
      data.done = true;
      NT.saveState();
    }

    el.innerHTML = '';
    var wrap = elt('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 4px;box-sizing:border-box;height:100%;font-size:11px;overflow:hidden;';
    el.appendChild(wrap);

    var big = elt('div', '', '05:00');
    big.style.cssText = 'font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;color:#111827;line-height:1.1;white-space:nowrap;';
    wrap.appendChild(big);

    var status = elt('div', '', '就绪');
    status.style.cssText = 'font-size:10px;color:#9ca3af;min-height:12px;';
    wrap.appendChild(status);

    var btnRow = elt('div');
    btnRow.style.cssText = 'display:flex;gap:4px;';
    wrap.appendChild(btnRow);

    var mainBtn = elt('button', '', '开始');
    mainBtn.style.cssText = 'font-size:11px;padding:2px 10px;border:none;border-radius:4px;background:#3b82f6;color:#fff;cursor:pointer;font-family:inherit;';
    nodrag(mainBtn);
    var resetBtn = elt('button', '', '重置');
    resetBtn.style.cssText = 'font-size:11px;padding:2px 10px;border:1px solid #d1d5db;border-radius:4px;background:#f9fafb;color:#374151;cursor:pointer;font-family:inherit;';
    nodrag(resetBtn);
    btnRow.appendChild(mainBtn);
    btnRow.appendChild(resetBtn);

    var presetRow = elt('div');
    presetRow.style.cssText = 'display:flex;gap:3px;flex-wrap:wrap;justify-content:center;margin-top:auto;';
    wrap.appendChild(presetRow);

    var presetBtns = [];

    function leftMs() {
      if (data.done) return 0;
      if (data.endAt) return Math.max(0, data.endAt - Date.now());
      if (typeof data.pausedLeft === 'number') return Math.max(0, data.pausedLeft);
      return (data.mins || 5) * 60000;
    }

    function update() {
      if (data.done) {
        big.textContent = '时间到';
        big.style.color = '#ef4444';
        status.textContent = '时间到';
        status.style.color = '#ef4444';
      } else {
        big.textContent = cdFmtMs(leftMs());
        big.style.color = '#111827';
        status.style.color = '#9ca3af';
        if (data.endAt) status.textContent = '倒计时中';
        else if (typeof data.pausedLeft === 'number') status.textContent = '已暂停';
        else status.textContent = '就绪';
      }
      mainBtn.textContent = data.endAt ? '暂停' : '开始';
      var locked = !!data.endAt || typeof data.pausedLeft === 'number' || data.done;
      presetBtns.forEach(function (b) {
        b.disabled = locked;
        b.style.opacity = locked ? '0.45' : '1';
        b.style.cursor = locked ? 'default' : 'pointer';
      });
    }

    function finish() {
      data.endAt = null;
      data.pausedLeft = 0;
      data.done = true;
      NT.saveState();
      update();
      var oldBg = el.style.background;
      el.style.background = '#fee2e2';
      setTimeout(function () { el.style.background = oldBg || ''; }, 1000);
      if (typeof window.NTToast === 'function') window.NTToast('倒计时结束');
    }

    [1, 5, 10, 15, 30, 60].forEach(function (m) {
      var b = elt('button', '', m + '分');
      b.style.cssText = 'font-size:9px;padding:0 5px;border:1px solid #d1d5db;background:#f9fafb;border-radius:3px;cursor:pointer;font-family:inherit;color:#374151;';
      nodrag(b);
      b.onclick = function () {
        if (data.endAt || typeof data.pausedLeft === 'number') return;
        data.mins = m;
        data.done = false;
        data.pausedLeft = null;
        data.endAt = null;
        NT.saveState();
        update();
      };
      presetBtns.push(b);
      presetRow.appendChild(b);
    });

    mainBtn.onclick = function () {
      if (data.endAt) {
        data.pausedLeft = Math.max(0, data.endAt - Date.now());
        data.endAt = null;
        NT.saveState();
        update();
        return;
      }
      var left;
      if (data.done) left = (data.mins || 5) * 60000;
      else if (typeof data.pausedLeft === 'number') left = data.pausedLeft;
      else left = (data.mins || 5) * 60000;
      if (!left || left <= 0) left = (data.mins || 5) * 60000;
      data.done = false;
      data.pausedLeft = null;
      data.endAt = Date.now() + left;
      NT.saveState();
      update();
    };

    resetBtn.onclick = function () {
      data.endAt = null;
      data.pausedLeft = null;
      data.done = false;
      NT.saveState();
      update();
    };

    function tick() {
      if (data.endAt) {
        var left = data.endAt - Date.now();
        if (left <= 0) {
          finish();
          return;
        }
        big.textContent = cdFmtMs(left);
        return;
      }
      if (data.done) {
        if (big.textContent !== '时间到') update();
      }
    }

    update();
    el.dataset.interval = setInterval(tick, 250);
  },
  destroy: function (el) {
    clearTimer(el);
  }
}
,
    habit: {
  title: '习惯养成',
  w: 2,
  h: 1,
  render: function (el, item) {
    var data = item.data || (item.data = {});
    if (!data.name) data.name = '喝水';
    if (!data.days || typeof data.days !== 'object') data.days = {};

    el.innerHTML = '';
    var box = elt('div');
    box.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:6px 8px;box-sizing:border-box;height:100%;font-size:12px;overflow:hidden;';
    el.appendChild(box);

    function paint() {
      box.innerHTML = '';
      var today = new Date();
      var todayKey = hbKey(today);

      var top = elt('div');
      top.style.cssText = 'display:flex;align-items:center;gap:6px;';

      var nm = elt('div', '', data.name);
      nm.style.cssText = 'flex:1;min-width:0;font-size:14px;font-weight:600;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

      var renameBtn = elt('button', '', '改名');
      renameBtn.style.cssText = 'flex:none;border:1px solid #d1d5db;background:#f9fafb;border-radius:3px;font-size:10px;padding:0 5px;cursor:pointer;color:#4b5563;font-family:inherit;';
      nodrag(renameBtn);
      renameBtn.onclick = function () {
        var inp = elt('input');
        inp.type = 'text';
        inp.value = data.name;
        inp.style.cssText = 'flex:1;min-width:0;font-size:14px;font-weight:600;box-sizing:border-box;border:1px solid #3b82f6;border-radius:3px;padding:0 4px;font-family:inherit;';
        nodrag(inp);
        top.replaceChild(inp, nm);
        renameBtn.style.display = 'none';
        inp.focus();
        inp.select();
        var finished = false;
        function commit(save) {
          if (finished) return;
          finished = true;
          if (save) {
            var v = inp.value.trim();
            if (v) data.name = v;
            NT.saveState();
          }
          paint();
        }
        inp.onkeydown = function (e) {
          if (e.key === 'Enter') { e.preventDefault(); commit(true); }
          else if (e.key === 'Escape') { e.preventDefault(); commit(false); }
        };
        inp.onblur = function () { commit(true); };
      };

      top.appendChild(nm);
      top.appendChild(renameBtn);
      box.appendChild(top);

      var checked = !!data.days[todayKey];
      var chk = elt('button', '', checked ? '今日已打卡 ✓' : '今日打卡');
      chk.style.cssText = 'font-size:12px;padding:3px 0;border-radius:5px;cursor:pointer;font-family:inherit;border:1px solid ' +
        (checked ? '#3b82f6' : '#d1d5db') + ';background:' + (checked ? '#3b82f6' : '#f9fafb') +
        ';color:' + (checked ? '#fff' : '#374151') + ';';
      nodrag(chk);
      chk.onclick = function () {
        if (data.days[todayKey]) delete data.days[todayKey];
        else data.days[todayKey] = 1;
        NT.saveState();
        paint();
      };
      box.appendChild(chk);

      var st = elt('div', '', '连续打卡 ' + hbStreak(data.days) + ' 天');
      st.style.cssText = 'font-size:11px;color:#6b7280;';
      box.appendChild(st);

      var grid = elt('div');
      grid.style.cssText = 'display:flex;gap:3px;margin-top:auto;';
      var weekChar = ['日', '一', '二', '三', '四', '五', '六'];
      for (var i = 6; i >= 0; i--) {
        var d = hbShift(new Date(), -i);
        var k = hbKey(d);
        var on = !!data.days[k];
        var cell = elt('div');
        cell.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0;';
        var sq = elt('div');
        sq.style.cssText = 'width:100%;aspect-ratio:1;border-radius:3px;background:' + (on ? '#3b82f6' : '#e5e7eb') + ';';
        var lb = elt('div', '', i === 0 ? '今' : weekChar[d.getDay()]);
        lb.style.cssText = 'font-size:9px;color:#9ca3af;line-height:1;';
        cell.appendChild(sq);
        cell.appendChild(lb);
        grid.appendChild(cell);
      }
      box.appendChild(grid);
    }

    paint();
  },
  destroy: function (el) {
    clearTimer(el);
  }
},
    fx: {
      title: '汇率',
      w: 2,
      h: 1,
      render(el, item) {
        const root = el;
        if (!root) return;

        const URL = 'https://api.frankfurter.dev/v1/latest?base=CNY&symbols=USD,EUR,JPY,GBP,HKD';
        // [代码, 中文名, 符号, 换算单位]
        const CURRENCIES = [
          ['USD', '美元', '$', 1],
          ['EUR', '欧元', '€', 1],
          ['JPY', '日元', '¥', 100],
          ['HKD', '港币', 'HK$', 1]
        ];

        const token = (item._fxToken = (item._fxToken || 0) + 1);
        const alive = function () { return item._fxToken === token; };

        function paint(res) {
          root.innerHTML = '';
          const rates = (res.data && res.data.rates) || {};
          const dateStr = (res.data && res.data.date) || '';

          CURRENCIES.forEach(function (cur) {
            const code = cur[0], cn = cur[1], unit = cur[3];
            const row = elt('div', 'nt-fx-row');
            row.appendChild(elt('span', 'nt-fx-name', cn + ' ' + code));

            const r = Number(rates[code]);
            let text = '暂无报价';
            if (isFinite(r) && r > 0) {
              text = unit + ' ' + cn + ' = ' + (unit / r).toFixed(2) + ' 元';
            }
            row.appendChild(elt('span', 'nt-fx-val', text));
            root.appendChild(row);
          });

          let footText = dateStr ? ('数据日期 ' + dateStr) : '';
          if (res.stale) footText = (footText ? footText + ' · ' : '') + '缓存';
          root.appendChild(elt('div', 'nt-fx-foot', footText));
        }

        function fail() {
          root.innerHTML = '';
          const box = elt('div', 'nt-fx-empty', '汇率暂不可用，检查网络后点此重试');
          nodrag(box);
          box.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            load();
          });
          root.appendChild(box);
        }

        function load() {
          root.innerHTML = '';
          root.appendChild(elt('div', 'nt-fx-loading', '加载中…'));
          fetchJsonCached('fx', URL, 6 * 3600 * 1000)
            .then(function (res) {
              if (!alive()) return;
              paint(res);
            })
            .catch(function () {
              if (!alive()) return;
              fail();
            });
        }

        load();
      },
      destroy: function (el) { clearTimer(el); }
    },
    onthisday: {
      title: '历史上的今天',
      w: 2,
      h: 1,
      render(el, item) {
        const root = el;
        if (!root) return;
        root.innerHTML = '';

        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const key = mm + '-' + dd;

        const head = elt('div', 'nt-oth-head');
        head.appendChild(elt('span', 'nt-oth-head-title', '历史上的今天'));
        head.appendChild(elt('span', 'nt-oth-head-date', (now.getMonth() + 1) + '月' + now.getDate() + '日'));
        root.appendChild(head);

        const src = (typeof window !== 'undefined') ? window.NTOnThisDay : null;
        const list = (src && src[key]) ? src[key] : null;

        if (!Array.isArray(list) || !list.length) {
          root.appendChild(elt('div', 'nt-oth-empty', '暂无数据'));
          return;
        }

        const box = elt('div', 'nt-oth-list');
        list.slice(0, 3).forEach(function (ev) {
          const row = elt('div', 'nt-oth-item');
          const y = (ev && ev.y != null) ? String(ev.y) : '';
          row.appendChild(elt('span', 'nt-oth-year', y ? (y + '年') : ''));
          row.appendChild(elt('span', 'nt-oth-text', String((ev && ev.t) || '')));
          box.appendChild(row);
        });
        root.appendChild(box);
      },
      destroy: function (el) { clearTimer(el); }
    },
    news: {
      title: '新闻资讯',
      w: 2,
      h: 1,
      render(el, item) {
        const root = el;
        if (!root) return;

        const DEFAULT_FEEDS = [
          { name: '少数派', url: 'https://sspai.com/feed' },
          { name: '36氪', url: 'https://36kr.com/feed' }
        ];
        const feeds = (item.data && Array.isArray(item.data.feeds) && item.data.feeds.length)
          ? item.data.feeds
          : DEFAULT_FEEDS;

        const token = (item._newsToken = (item._newsToken || 0) + 1);
        const alive = function () { return item._newsToken === token; };

        function fail() {
          root.innerHTML = '';
          const box = elt('div', 'nt-news-empty', '新闻暂不可用，检查网络后点此重试');
          nodrag(box);
          box.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            load();
          });
          root.appendChild(box);
        }

        function draw(results) {
          const rows = [];
          results.forEach(function (r) {
            r.items.forEach(function (it) {
              if (!it || !it.title) return;
              rows.push({
                title: String(it.title),
                link: it.link || '',
                time: Date.parse(it.pubDate || '') || 0,
                source: r.feed.name || ''
              });
            });
          });

          if (!rows.length) { fail(); return; }

          rows.sort(function (a, b) { return b.time - a.time; });
          const top = rows.slice(0, 6);

          root.innerHTML = '';

          top.forEach(function (r) {
            const row = elt('div', 'nt-news-row');
            row.appendChild(elt('span', 'nt-news-src', r.source));
            row.appendChild(elt('span', 'nt-news-title', r.title));
            nodrag(row);
            row.addEventListener('click', function (ev) {
              ev.preventDefault();
              ev.stopPropagation();
              if (r.link) {
                try { window.open(r.link, '_blank', 'noopener'); } catch (e) {}
              }
            });
            root.appendChild(row);
          });

          let anyStale = false;
          let latest = 0;
          results.forEach(function (r) {
            if (r.stale) anyStale = true;
            if (r.ts > latest) latest = r.ts;
          });

          const t = new Date(latest || Date.now());
          const hh = String(t.getHours()).padStart(2, '0');
          const mi = String(t.getMinutes()).padStart(2, '0');
          root.appendChild(elt('div', 'nt-news-foot', '更新 ' + hh + ':' + mi + (anyStale ? ' · 缓存' : '')));
        }

        function load() {
          root.innerHTML = '';
          root.appendChild(elt('div', 'nt-news-loading', '加载中…'));

          const jobs = feeds.map(function (feed) {
            const url = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(feed.url);
            const name = feed.name || feed.url || 'feed';
            return fetchJsonCached('news_' + name, url, 30 * 60 * 1000)
              .then(function (res) {
                const d = res.data;
                const ok = d && d.status === 'ok';
                const list = (ok && Array.isArray(d.items)) ? d.items : [];
                return { feed: feed, items: list, stale: !!res.stale, ts: res.ts || 0 };
              })
              .catch(function () {
                return { feed: feed, items: [], stale: false, ts: 0 };
              });
          });

          Promise.all(jobs).then(function (results) {
            if (!alive()) return;
            draw(results);
          }).catch(function () {
            if (!alive()) return;
            fail();
          });
        }

        load();
      },
      destroy: function (el) { clearTimer(el); }
    },
    hot: {
      title: '热搜榜',
      w: 2,
      h: 1,
      render(el, item) {
        const root = el;
        if (!root) return;
        if (!item.data) item.data = {};

        const DEFAULT_API = 'https://api.vvhan.com/api/hotlist/wbHot';
        const token = (item._hotToken = (item._hotToken || 0) + 1);
        const alive = function () { return item._hotToken === token; };

        function getUrl() {
          const u = (item.data.apiUrl || '').trim();
          return u || DEFAULT_API;
        }

        function parse(json) {
          let arr = null;
          if (json && Array.isArray(json.data)) arr = json.data;
          else if (Array.isArray(json)) arr = json;
          if (!arr) return null;

          const out = [];
          arr.forEach(function (o) {
            if (!o || typeof o !== 'object') return;
            const title = o.title || o.name || '';
            if (!title) return;
            out.push({
              title: String(title),
              hot: (o.hot != null && o.hot !== '') ? String(o.hot) : ''
            });
          });
          return out.slice(0, 8);
        }

        function shell() {
          root.innerHTML = '';

          const head = elt('div', 'nt-hot-head');
          head.appendChild(elt('span', 'nt-hot-head-title', '微博热搜'));

          const btn = elt('button', 'nt-hot-set', '设置');
          btn.type = 'button';
          nodrag(btn);
          btn.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            openEdit();
          });
          head.appendChild(btn);
          root.appendChild(head);

          const body = elt('div', 'nt-hot-body');
          root.appendChild(body);
          return body;
        }

        function drawList(list, stale) {
          const body = shell();

          list.forEach(function (it, i) {
            const row = elt('div', 'nt-hot-row');
            row.appendChild(elt('span', 'nt-hot-idx', String(i + 1)));
            row.appendChild(elt('span', 'nt-hot-name', it.title));
            if (it.hot) row.appendChild(elt('span', 'nt-hot-val', it.hot));

            nodrag(row);
            row.addEventListener('click', function (ev) {
              ev.preventDefault();
              ev.stopPropagation();
              try {
                window.open('https://s.weibo.com/weibo?q=' + encodeURIComponent(it.title), '_blank', 'noopener');
              } catch (e) {}
            });
            body.appendChild(row);
          });

          if (stale) body.appendChild(elt('div', 'nt-hot-foot', '缓存'));
        }

        function fail() {
          const body = shell();
          const box = elt('div', 'nt-hot-empty', '热搜暂不可用（数据源可能已变更），点此重试');
          nodrag(box);
          box.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            load();
          });
          body.appendChild(box);
        }

        function openEdit() {
          root.innerHTML = '';

          const wrap = elt('div', 'nt-hot-edit');

          const input = elt('input', 'nt-hot-input');
          input.type = 'text';
          input.value = item.data.apiUrl || DEFAULT_API;
          input.placeholder = DEFAULT_API;
          nodrag(input);

          const save = elt('button', 'nt-hot-save', '保存');
          save.type = 'button';
          nodrag(save);

          save.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            const v = (input.value || '').trim();
            item.data.apiUrl = v || DEFAULT_API;
            try { NT.saveState(); } catch (e) {}
            load();
          });

          input.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter') {
              ev.preventDefault();
              ev.stopPropagation();
              save.click();
            }
          });

          wrap.appendChild(input);
          wrap.appendChild(save);
          root.appendChild(wrap);

          const tip = elt('div', 'nt-hot-tip', '可填入任意返回 {data:[{title/name, hot}]} 的热榜接口');
          root.appendChild(tip);

          setTimeout(function () {
            try { input.focus(); input.select(); } catch (e) {}
          }, 0);
        }

        function load() {
          const body = shell();
          body.appendChild(elt('div', 'nt-hot-loading', '加载中…'));

          fetchJsonCached('hot', getUrl(), 10 * 60 * 1000)
            .then(function (res) {
              if (!alive()) return;
              const list = parse(res.data);
              if (!list || !list.length) { fail(); return; }
              drawList(list, !!res.stale);
            })
            .catch(function () {
              if (!alive()) return;
              fail();
            });
        }

        load();
      },
      destroy: function (el) { clearTimer(el); }
    }

  });
})();
