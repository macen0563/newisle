window.WIDGETS = (function() {
  const UNIT = 180, GAP = 60, PITCH = 240; // not used but keep consistency
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // 节气：太阳视黄经计算（低精度天文算法 + 线性插值求交点时刻，精确到本地日期）
  // 经验教训：网传「寿星公式」的 C 值数组在本文件初版里月份配对是错的，已弃用。
  const JIEQI_NAMES = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'];
  const JIEQI_LONS = [285, 300, 315, 330, 345, 0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270];
  function sunLongitude(dateUtcNoon) {
    const d = dateUtcNoon.getTime() / 86400000 - 10957.5; // 距 2000-01-01.5 的天数
    const g = (((357.529 + 0.98560028 * d) % 360) + 360) % 360;
    const q = (((280.459 + 0.98564736 * d) % 360) + 360) % 360;
    const gr = g * Math.PI / 180;
    const L = q + 1.915 * Math.sin(gr) + 0.020 * Math.sin(2 * gr);
    return ((L % 360) + 360) % 360;
  }
  function angDiff(from, to) {
    let t = to - from;
    if (t < -180) t += 360;
    if (t > 180) t -= 360;
    return t;
  }
  function jieqiNear(date) {
    const m = date.getMonth();
    const idxs = [m * 2, m * 2 + 1];
    for (const idx of idxs) {
      const target = JIEQI_LONS[idx];
      let prevDate = new Date(Date.UTC(date.getFullYear(), m, 1, 12));
      let prevLon = sunLongitude(prevDate);
      for (let k = 1; k <= 34; k++) {
        const curDate = new Date(prevDate.getTime() + 86400000);
        const curLon = sunLongitude(curDate);
        const step = angDiff(prevLon, curLon);
        const need = angDiff(prevLon, target);
        if (need >= 0 && need <= step && step > 0) {
          const instant = new Date(prevDate.getTime() + (need / step) * 86400000);
          if (instant.getFullYear() === date.getFullYear() && instant.getMonth() === date.getMonth() && instant.getDate() === date.getDate()) {
            return JIEQI_NAMES[idx];
          }
          break;
        }
        prevDate = curDate;
        prevLon = curLon;
      }
    }
    return '';
  }

  // 今天状态行：节气 + 法定节假日/调休（holidays.js 的年度官方数据）
  function todayStatusText(now) {
    const parts = [];
    const jq = jieqiNear(now);
    if (jq) parts.push('今日' + jq);
    if (window.NTHolidays) {
      const t = NTHolidays.dayType(now);
      if (t === 'holiday') parts.push('假期中 🎉');
      else if (t === 'workday') parts.push('今日调休上班');
    }
    return parts.join(' · ');
  }

  const CITIES = {
    '北京': {lat: 39.90, lon: 116.40},
    '上海': {lat: 31.23, lon: 121.47},
    '广州': {lat: 23.13, lon: 113.26},
    '深圳': {lat: 22.54, lon: 114.06},
    '杭州': {lat: 30.27, lon: 120.15},
    '成都': {lat: 30.67, lon: 104.06}
  };
  
  const WEATHER_CODES = {
    0: {text: '晴', emoji: '☀️'},
    1: {text: '多云', emoji: '⛅'},
    2: {text: '多云', emoji: '⛅'},
    3: {text: '阴', emoji: '☁️'},
    45: {text: '雾', emoji: '🌫️'},
    48: {text: '雾', emoji: '🌫️'},
    51: {text: '毛毛雨', emoji: '🌦️'},
    53: {text: '毛毛雨', emoji: '🌦️'},
    55: {text: '毛毛雨', emoji: '🌦️'},
    56: {text: '冻雨', emoji: '🌧️'},
    57: {text: '冻雨', emoji: '🌧️'},
    61: {text: '雨', emoji: '🌧️'},
    63: {text: '雨', emoji: '🌧️'},
    65: {text: '大雨', emoji: '🌧️'},
    66: {text: '冻雨', emoji: '🌧️'},
    67: {text: '冻雨', emoji: '🌧️'},
    71: {text: '雪', emoji: '❄️'},
    73: {text: '雪', emoji: '❄️'},
    75: {text: '大雪', emoji: '❄️'},
    77: {text: '雪', emoji: '❄️'},
    80: {text: '阵雨', emoji: '🌦️'},
    81: {text: '阵雨', emoji: '🌦️'},
    82: {text: '强阵雨', emoji: '🌧️'},
    85: {text: '阵雪', emoji: '🌨️'},
    86: {text: '阵雪', emoji: '🌨️'},
    95: {text: '雷阵雨', emoji: '⛈️'},
    96: {text: '雷阵雨', emoji: '⛈️'},
    99: {text: '雷阵雨', emoji: '⛈️'}
  };
  
  function weatherDesc(code) {
    return WEATHER_CODES[code] || {text: '未知', emoji: '🌡️'};
  }
  
  function getWeatherCache(city) {
    const raw = localStorage.getItem('nt2_weather');
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return data[city] || null;
    } catch (e) {
      return null;
    }
  }
  
  function setWeatherCache(city, entry) {
    const raw = localStorage.getItem('nt2_weather');
    let obj = {};
    try { if (raw) obj = JSON.parse(raw); } catch (e) {}
    obj[city] = entry;
    localStorage.setItem('nt2_weather', JSON.stringify(obj));
  }
  
  async function fetchWeatherByCoords(lat, lon, cityName, force) {
    const now = Date.now();
    if (!force) {
      const cached = getWeatherCache(cityName);
      if (cached) {
        if (cached.error && now - cached.ts < 120000) return { error: true };
        if (cached.payload && now - cached.ts < 1800000) return { payload: cached.payload };
      }
    }
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${Number(lat).toFixed(2)}&longitude=${Number(lon).toFixed(2)}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`;
      const res = await fetch(url);
      const json = await res.json();
      let hours = [];
      try {
        const hTimes = (json.hourly && json.hourly.time) || [];
        const hTemps = (json.hourly && json.hourly.temperature_2m) || [];
        const hCodes = (json.hourly && json.hourly.weather_code) || [];
        const curHour = json.current && json.current.time ? String(json.current.time).slice(0, 13) : '';
        let start = curHour ? hTimes.findIndex((t) => String(t).slice(0, 13) >= curHour) : 0;
        if (start < 0) start = 0;
        hours = hTimes.slice(start, start + 24).map((t, i) => ({
          h: String(t).slice(11, 16),
          temp: Math.round(hTemps[start + i]),
          code: hCodes[start + i]
        }));
      } catch (e) {
        hours = [];
      }
      let days = [];
      try {
        const dTimes = (json.daily && json.daily.time) || [];
        const dCodes = (json.daily && json.daily.weather_code) || [];
        const dMax = (json.daily && json.daily.temperature_2m_max) || [];
        const dMin = (json.daily && json.daily.temperature_2m_min) || [];
        const wNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        days = dTimes.map((d, i) => ({
          label: i === 0 ? '今天' : wNames[new Date(d + 'T00:00:00').getDay()],
          code: dCodes[i],
          high: Math.round(dMax[i]),
          low: Math.round(dMin[i])
        }));
      } catch (e) {
        days = [];
      }
      const payload = {
        temp: Math.round(json.current.temperature_2m),
        code: json.current.weather_code,
        high: Math.round(json.daily.temperature_2m_max[0]),
        low: Math.round(json.daily.temperature_2m_min[0]),
        city: cityName,
        time: Date.now(),
        hours: hours,
        days: days
      };
      setWeatherCache(cityName, { ts: Date.now(), payload });
      return { payload };
    } catch (e) {
      var oldEntry = getWeatherCache(cityName);
      if (oldEntry && oldEntry.payload) return { payload: oldEntry.payload, stale: true };
      setWeatherCache(cityName, { ts: Date.now(), error: true });
      return { error: true };
    }
  }
  async function fetchWeather(city, force) {
    const coords = CITIES[city];
    if (!coords) return { error: true };
    return fetchWeatherByCoords(coords.lat, coords.lon, city, force);
  }

  async function reverseCityName(lat, lon) {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`);
      const json = await res.json();
      let name = json.city || json.locality || json.principalSubdivision || '';
      if (name && name.slice(-1) === '市') name = name.slice(0, -1);
      return name || '当前位置';
    } catch (e) {
      return '当前位置';
    }
  }

  function openCityModal(item, onSave) {
    const current = item.data.city || '北京';
    const autoChecked = !!item.data.autoLoc;
    const cityList = Object.keys(CITIES).map(name =>
      `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;">
        <input type="radio" name="cityChoice" value="${name}"${name === current ? ' checked' : ''}>
        <span>${name}</span>
      </label>`
    ).join('');
    const content = NT.openModal('选择城市', `
      <label class="wx-autoloc" style="display:flex;align-items:flex-start;gap:8px;padding:4px 0 10px;cursor:pointer;font-size:0.85rem;">
        <input type="checkbox" class="wx-autoloc-box"${autoChecked ? ' checked' : ''} style="margin-top:2px;">
        <span>自动定位（使用浏览器定位，定位失败时用下方城市）</span>
      </label>
      <div class="wx-city-list" style="font-size:0.85rem;">${cityList}</div>
      <button class="wx-city-save" style="margin-top:12px;width:100%;padding:8px;border:none;border-radius:8px;background:#0a84ff;color:#fff;font-size:0.85rem;cursor:pointer;">保存</button>
    `);
    const box = content.querySelector('.wx-autoloc-box');
    const saveBtn = content.querySelector('.wx-city-save');
    saveBtn.addEventListener('click', () => {
      item.data.autoLoc = box.checked;
      const picked = content.querySelector('input[name="cityChoice"]:checked');
      if (picked) item.data.city = picked.value;
      if (item.data.autoLoc) delete item.data.loc;
      if (onSave) onSave();
      NT.saveState();
      NT.rerender();
      NT.closeModal();
    });
  }

  function resolveCountdownDate(data) {
    const now = new Date();
    const ty = now.getFullYear();
    const tm = now.getMonth(); // 0 = 一月
    const td = now.getDate();
    const pad = n => String(n).padStart(2, '0');
    const nextNewYear = () => {
      // 今天正好是 1 月 1 日就返回今天，否则若已过元旦则取明年
      const year = (tm === 0 && td === 1) ? ty : ((tm > 0 || td > 1) ? ty + 1 : ty);
      return year + '-01-01';
    };
    if (data && data.title === '元旦' && (!data.date || /^\d{4}-01-01$/.test(data.date))) {
      return nextNewYear();
    }
    if (data && data.date) return data.date;
    return nextNewYear();
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }
  
  function todayDateObj() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function lunarText(now) {
    if (window.NTI18N && NTI18N.lang() === 'en') {
      try { return new Intl.DateTimeFormat('en-US-u-ca-chinese', { month: 'long', day: 'numeric' }).format(now); } catch (e) { /* fall through */ }
    }
    try {
      const dayNum = parseInt(new Intl.DateTimeFormat('zh-Hans-CN-u-ca-chinese', { day: 'numeric' }).format(now), 10);
      const monthStr = new Intl.DateTimeFormat('zh-Hans-CN-u-ca-chinese', { month: 'long' }).format(now);
      const dayNames = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
      if (dayNum >= 1 && dayNum <= 30) return monthStr + dayNames[dayNum - 1];
    } catch (e) { /* ignore */ }
    return '';
  }

  function analogClockSvg(size) {
    let ticks = '';
    for (let i = 0; i < 12; i++) {
      const a = i * 30 * Math.PI / 180;
      const x1 = 60 + 52 * Math.sin(a), y1 = 60 - 52 * Math.cos(a);
      const x2 = 60 + 57 * Math.sin(a), y2 = 60 - 57 * Math.cos(a);
      ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="currentColor" stroke-opacity="${i % 3 === 0 ? '0.55' : '0.3'}" stroke-width="${i % 3 === 0 ? 2.4 : 1.2}"/>`;
    }
    const nums = [[60, 22, '12'], [98, 60, '3'], [60, 98, '6'], [22, 60, '9']]
      .map(([nx, ny, nt]) => `<text x="${nx}" y="${ny}" font-size="13" font-weight="600" fill="currentColor" text-anchor="middle" dominant-baseline="central">${nt}</text>`).join('');
    return `
      <svg class="analog-clock" width="${size}" height="${size}" viewBox="0 0 120 120" style="flex:none;color:var(--ink-1);">
        <circle cx="60" cy="60" r="58" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.5"/>
        ${ticks}
        ${nums}
        <line class="hand-h" x1="60" y1="60" x2="60" y2="32" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
        <line class="hand-m" x1="60" y1="60" x2="60" y2="20" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
        <line class="hand-s" x1="60" y1="66" x2="60" y2="16" stroke="#eb2e2e" stroke-width="1.2" stroke-linecap="round"/>
        <circle cx="60" cy="60" r="3.4" fill="currentColor"/>
      </svg>`;
  }

  function startAnalogClock(el) {
    const handH = el.querySelector('.hand-h');
    const handM = el.querySelector('.hand-m');
    const handS = el.querySelector('.hand-s');
    const tick = () => {
      const d = new Date();
      const sec = d.getSeconds() + d.getMilliseconds() / 1000;
      const m = d.getMinutes() + sec / 60;
      const h = (d.getHours() % 12) + m / 60;
      if (handH) handH.setAttribute('transform', `rotate(${(h * 30).toFixed(2)} 60 60)`);
      if (handM) handM.setAttribute('transform', `rotate(${(m * 6).toFixed(2)} 60 60)`);
      if (handS) handS.setAttribute('transform', `rotate(${(sec * 6).toFixed(2)} 60 60)`);
    };
    tick();
    return setInterval(tick, 1000);
  }

  function openCountdownEdit(item, title, dateStr) {
    const modalBody = NT.openModal('编辑纪念日', `
      <div style="margin-bottom:8px;">
        <label style="display:block;margin-bottom:4px;">标题</label>
        <input type="text" id="cd-title" value="${title}" style="width:100%;padding:6px;">
      </div>
      <div>
        <label style="display:block;margin-bottom:4px;">日期</label>
        <input type="date" id="cd-date" value="${dateStr}" style="width:100%;padding:6px;">
      </div>
    `);
    const btn = document.createElement('button');
    btn.textContent = '保存';
    btn.style.marginTop = '12px';
    btn.style.width = '100%';
    modalBody.appendChild(btn);
    btn.addEventListener('click', () => {
      const newTitle = modalBody.querySelector('#cd-title').value.trim();
      const newDate = modalBody.querySelector('#cd-date').value;
      if (newTitle && newDate) {
        item.data.title = newTitle;
        item.data.date = newDate;
        NT.saveState();
        NT.rerender();
        NT.closeModal();
      }
    });
  }
  
  return {
    clock: {
      title: '数字时钟',
      w: 1,
      h: 1,
      render(el, item) {
        const update = () => {
          const d = new Date();
          const timeStr = pad(d.getHours()) + ':' + pad(d.getMinutes());
          const dateStr = (d.getMonth() + 1) + '月' + d.getDate() + '日 星期' + weekDays[d.getDay()];
          el.innerHTML = `
            <div style="height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;color:var(--ink-1);">
              <div style="font-size:2.5rem;font-weight:600;line-height:1;">${timeStr}</div>
              <div style="font-size:0.9rem;margin-top:8px;opacity:0.7;">${dateStr}</div>
            </div>
          `;
        };
        update();
        const id = setInterval(update, 1000);
        el.dataset.interval = String(id);
      },
      destroy(el) {
        if (el.dataset.interval) {
          clearInterval(parseInt(el.dataset.interval));
          delete el.dataset.interval;
        }
      }
    },
    
    calendar: {
      title: '日历',
      w: 1,
      h: 1,
      render(el, item) {
        const now = new Date();
        const day = now.getDate();
        const wk = '星期' + weekDays[now.getDay()];
        let lunar = '';
        try {
          const dayNum = parseInt(new Intl.DateTimeFormat('zh-Hans-CN-u-ca-chinese', { day: 'numeric' }).format(now), 10);
          const monthStr = new Intl.DateTimeFormat('zh-Hans-CN-u-ca-chinese', { month: 'long' }).format(now);
          const dayNames = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
          if (dayNum >= 1 && dayNum <= 30) lunar = monthStr + dayNames[dayNum - 1];
        } catch (e) { lunar = ''; }
        el.innerHTML = `
          <div style="height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;color:var(--ink-1);">
            <div style="font-size:3.6rem;font-weight:700;line-height:1;color:#eb2e2e;">${day}</div>
            <div style="font-size:1rem;margin-top:8px;">${wk}</div>
            <div style="font-size:0.82rem;color:var(--ink-2);margin-top:5px;">${now.getFullYear()}年${now.getMonth() + 1}月${day}日</div>
            ${lunar ? `<div style="font-size:0.82rem;color:var(--ink-3);margin-top:2px;">${window.NTI18N && NTI18N.lang() === 'en' ? 'Lunar ' : '农历'}${lunar}</div>` : ''}
            ${todayStatusText(now) ? `<div style="font-size:0.82rem;color:#d97706;margin-top:2px;">${todayStatusText(now)}</div>` : ''}
          </div>
        `;
      },
      destroy(el) {}
    },
    
    weather: {
      title: '天气',
      w: 1,
      h: 1,
      render(el, item) {
        const self = this;
        let lastPayload = null;
        const renderWeather = (payload, stale) => {
          lastPayload = payload;
          const d = weatherDesc(payload.code);
          const t = new Date(payload.time);
          const hh = String(t.getHours()).padStart(2, '0');
          const mm = String(t.getMinutes()).padStart(2, '0');
          el.innerHTML = `<div class="weather-inner" style="height:100%;box-sizing:border-box;padding:var(--wx-pad,12px 16px);overflow:hidden;display:flex;flex-direction:column;color:var(--ink-1);">
            <div class="weather-city" style="display:flex;align-items:center;justify-content:space-between;font-size:var(--wx-city,1rem);line-height:1.3;font-weight:600;">
              <span>${NT.esc(payload.city)}</span>
              <span class="weather-gear" style="cursor:pointer;opacity:0.7;">⚙</span>
            </div>
            <div class="weather-temp" style="font-size:var(--wx-temp,2.6rem);line-height:1;margin-top:6px;font-weight:600;">${payload.temp}°</div>
            <div class="weather-desc" style="font-size:var(--wx-desc,1rem);line-height:1.3;margin-top:6px;">${d.emoji} ${d.text}</div>
            <div class="weather-today" style="margin-top:auto;font-size:var(--wx-today,0.82rem);line-height:1.3;color:var(--ink-2);">今日 ${payload.high}° / ${payload.low}°</div>
            <div class="weather-time" style="font-size:var(--wx-upd,0.68rem);line-height:1.3;margin-top:2px;color:var(--ink-3);">更新 ${hh}:${mm}${stale ? ' · 缓存' : ''}</div>
          </div>`;
          requestAnimationFrame(() => {
            const wrap = el.querySelector('.wx-wrap');
            if (wrap && el.clientHeight && el.clientHeight < 170) wrap.classList.add('wx-compact');
          });
        };
        const renderLoading = (text = '加载中…') => {
          el.innerHTML = `<div class="weather-inner" style="height:100%;box-sizing:border-box;padding:12px 16px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:0.86rem;line-height:1.3;opacity:0.7;">${text}</div>`;
        };
        const renderError = () => {
          el.innerHTML = `<div class="weather-inner" style="height:100%;box-sizing:border-box;padding:12px 16px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:0.86rem;line-height:1.3;opacity:0.7;">天气暂不可用 · 点击重试</div>`;
        };
        function forecastHtml(p) {
          p = p || {};
          const parts = [];
          const curInfo = weatherDesc(p.code);
          parts.push(
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">' +
              '<div style="flex:1;min-width:0;font-size:14px;font-weight:600;color:var(--ink-1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + NT.esc(p.city || '') + '</div>' +
              '<div style="font-size:30px;font-weight:700;line-height:1;color:var(--ink-1);">' + (p.temp != null ? p.temp + '°' : '--') + '</div>' +
              '<div style="font-size:13px;color:var(--ink-2);white-space:nowrap;">' + (curInfo ? curInfo.emoji + ' ' + NT.esc(curInfo.text) : '') + '</div>' +
            '</div>'
          );

          const hours = Array.isArray(p.hours) ? p.hours : [];
          const days = Array.isArray(p.days) ? p.days : [];

          if (hours.length) {
            parts.push('<div style="font-size:12px;color:var(--ink-3);margin:12px 0 6px;">逐小时</div>');
            let row = '<div style="display:flex;gap:2px;overflow-x:auto;padding-bottom:4px;">';
            hours.forEach((h, i) => {
              const info = weatherDesc(h.code);
              row += '<div style="flex:0 0 auto;text-align:center;padding:6px 8px;">' +
                '<div style="font-size:11px;color:var(--ink-3);white-space:nowrap;">' + (i === 0 ? '现在' : NT.esc(String(h.h || '').slice(0, 5))) + '</div>' +
                '<div style="font-size:16px;line-height:1.5;">' + (info ? info.emoji : '') + '</div>' +
                '<div style="font-size:12px;color:var(--ink-1);">' + Math.round(h.temp) + '°</div>' +
              '</div>';
            });
            row += '</div>';
            parts.push(row);
          }

          if (days.length) {
            let weekMin = Infinity, weekMax = -Infinity;
            days.forEach((d) => {
              const lo = Number(d.low), hi = Number(d.high);
              if (isFinite(lo) && lo < weekMin) weekMin = lo;
              if (isFinite(hi) && hi > weekMax) weekMax = hi;
            });
            if (!isFinite(weekMin)) weekMin = 0;
            if (!isFinite(weekMax)) weekMax = 0;
            const span = weekMax - weekMin;

            parts.push('<div style="font-size:12px;color:var(--ink-3);margin:14px 0 6px;">7 天</div>');
            let list = '';
            days.forEach((d) => {
              const info = weatherDesc(d.code);
              let leftPct = 0, widthPct = 100;
              if (span > 0) {
                leftPct = ((Number(d.low) - weekMin) / span) * 100;
                widthPct = ((Number(d.high) - Number(d.low)) / span) * 100;
              }
              list += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;color:var(--ink-1);">' +
                '<div style="width:44px;flex:0 0 44px;color:var(--ink-2);">' + NT.esc(d.label || '') + '</div>' +
                '<div style="flex:0 0 auto;min-width:64px;color:var(--ink-2);white-space:nowrap;">' + (info ? info.emoji + ' ' + NT.esc(info.text) : '') + '</div>' +
                '<div style="flex:0 0 auto;white-space:nowrap;color:var(--ink-2);">' + Math.round(d.low) + '° ~ ' + Math.round(d.high) + '°</div>' +
                '<div style="flex:1;min-width:24px;height:6px;border-radius:999px;background:rgba(127,140,160,.25);position:relative;overflow:hidden;">' +
                  '<div style="position:absolute;top:0;height:6px;border-radius:999px;background:linear-gradient(90deg,#57a8ff,#ffb35c);left:' + leftPct.toFixed(1) + '%;width:' + widthPct.toFixed(1) + '%;"></div>' +
                '</div>' +
              '</div>';
            });
            parts.push(list);
          }

          if (!hours.length && !days.length) {
            parts.push('<div style="font-size:13px;color:var(--ink-3);padding:14px 0;">暂无预报数据，点右上角刷新获取</div>');
          }

          return parts.join('');
        }

        const openForecast = () => {
          const bd = NT.openModal('天气预报', '<div class="fc-body">' + forecastHtml(lastPayload || {}) + '</div><div style="text-align:right;margin-top:10px;"><button type="button" class="btn fc-refresh">刷新</button></div>');
          const btn = bd.querySelector('.fc-refresh');
          if (btn) btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.textContent = '刷新中…';
            await load(true);
            const body = bd.querySelector('.fc-body');
            if (body) body.innerHTML = forecastHtml(lastPayload || {});
            btn.disabled = false;
            btn.textContent = '刷新';
          });
        };
        const requestLoc = () => new Promise((resolve) => {
          if (!navigator.geolocation) { resolve(false); return; }
          navigator.geolocation.getCurrentPosition(async (pos) => {
            const lat = Number(pos.coords.latitude.toFixed(4));
            const lon = Number(pos.coords.longitude.toFixed(4));
            const name = await reverseCityName(lat, lon);
            item.data.loc = { lat, lon, name, ts: Date.now() };
            NT.saveState();
            resolve(true);
          }, () => {
            resolve(false);
          }, { timeout: 8000, maximumAge: 3600000 });
        });
        const refreshLoc = () => requestLoc().then((ok) => {
          if (ok) NT.rerender();
        });
        const load = async (force) => {
          if (item.data.autoLoc && item.data.loc) {
            const loc = item.data.loc;
            if (!loc.ts || Date.now() - loc.ts > 21600000) {
              if (!self._lastLocTry || Date.now() - self._lastLocTry > 60000) {
                self._lastLocTry = Date.now();
                refreshLoc();
              }
            }
            const r = await fetchWeatherByCoords(loc.lat, loc.lon, loc.name, force);
            if (r && r.payload) { renderWeather(r.payload, r.stale); return; }
          } else if (item.data.autoLoc && !item.data.loc) {
            renderLoading('定位中…');
            const ok = await requestLoc();
            if (ok && item.data.loc) {
              const loc = item.data.loc;
              const r = await fetchWeatherByCoords(loc.lat, loc.lon, loc.name, force);
              if (r && r.payload) { renderWeather(r.payload); return; }
            }
          }
          const res = await fetchWeather(item.data.city || '北京', force);
          if (res && res.payload) renderWeather(res.payload, res.stale);
          else renderError();
        };
        el.addEventListener('click', (e) => {
          if (e.target.closest && e.target.closest('.weather-gear')) return;
          if (lastPayload) openForecast();
          else load(true);
        });
        el.addEventListener('click', (e) => {
          if (e.target.closest && e.target.closest('.weather-gear')) {
            e.stopPropagation();
            openCityModal(item, () => {});
          }
        });
        load(false);
      },
      destroy(el) {}
    },
    
    countdown: {
      title: '纪念日',
      w: 2,
      h: 1,
      render(el, item) {
        const title = item.data?.title || '元旦';
        const dateStr = resolveCountdownDate(item.data);
        const target = new Date(dateStr + 'T00:00:00');
        const today = todayDateObj();
        const diffDays = Math.round((target - today) / 86400000);
        const absDays = Math.abs(diffDays);
        const bigText = diffDays === 0 ? '今天' : absDays.toLocaleString('en-US');
        const subText = diffDays === 0 ? '就是今天' : (diffDays > 0 ? '还有' : '已经');
        const dateText = `${target.getFullYear()}年${target.getMonth() + 1}月${target.getDate()}日`;

        let ticks = '';
        for (let i = 0; i < 12; i++) {
          const a = i * 30 * Math.PI / 180;
          const x1 = 60 + 52 * Math.sin(a), y1 = 60 - 52 * Math.cos(a);
          const x2 = 60 + 57 * Math.sin(a), y2 = 60 - 57 * Math.cos(a);
          ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="currentColor" stroke-opacity="0.35" stroke-width="${i % 3 === 0 ? 2.4 : 1.2}"/>`;
        }
        el.innerHTML = `
          <div style="height:100%;width:100%;display:flex;align-items:center;padding:18px 22px;box-sizing:border-box;color:var(--ink-1);cursor:pointer;text-align:left;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:0.92rem;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
              <div style="margin-top:10px;line-height:1;">
                <span style="font-size:2.9rem;font-weight:700;">${bigText}</span>
                ${diffDays !== 0 ? '<span style="font-size:1rem;color:var(--ink-2);margin-left:5px;">天</span>' : ''}
              </div>
              <div style="font-size:0.85rem;color:var(--ink-3);margin-top:10px;">${subText} · ${dateText}</div>
            </div>
            <svg class="analog-clock" width="128" height="128" viewBox="0 0 120 120" style="flex:none;">
              <circle cx="60" cy="60" r="58" fill="currentColor" fill-opacity="0.07" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.5"/>
              ${ticks}
              <line class="hand-h" x1="60" y1="60" x2="60" y2="32" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
              <line class="hand-m" x1="60" y1="60" x2="60" y2="20" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
              <line class="hand-s" x1="60" y1="66" x2="60" y2="16" stroke="#eb2e2e" stroke-width="1.2" stroke-linecap="round"/>
              <circle cx="60" cy="60" r="3.4" fill="currentColor"/>
            </svg>
          </div>
        `;
        const handH = el.querySelector('.hand-h');
        const handM = el.querySelector('.hand-m');
        const handS = el.querySelector('.hand-s');
        const tick = () => {
          const d = new Date();
          const s = d.getSeconds() + d.getMilliseconds() / 1000;
          const m = d.getMinutes() + s / 60;
          const h = (d.getHours() % 12) + m / 60;
          if (handH) handH.setAttribute('transform', `rotate(${(h * 30).toFixed(2)} 60 60)`);
          if (handM) handM.setAttribute('transform', `rotate(${(m * 6).toFixed(2)} 60 60)`);
          if (handS) handS.setAttribute('transform', `rotate(${(s * 6).toFixed(2)} 60 60)`);
        };
        tick();
        const id = setInterval(tick, 1000);
        el.dataset.interval = String(id);

        el.addEventListener('click', () => {
          const modalBody = NT.openModal('编辑纪念日', `
            <div style="margin-bottom:8px;">
              <label style="display:block;margin-bottom:4px;">标题</label>
              <input type="text" id="cd-title" value="${title}" style="width:100%;padding:6px;">
            </div>
            <div>
              <label style="display:block;margin-bottom:4px;">日期</label>
              <input type="date" id="cd-date" value="${dateStr}" style="width:100%;padding:6px;">
            </div>
          `);
          const btn = document.createElement('button');
          btn.textContent = '保存';
          btn.style.marginTop = '12px';
          btn.style.width = '100%';
          modalBody.appendChild(btn);
          btn.addEventListener('click', () => {
            const newTitle = modalBody.querySelector('#cd-title').value.trim();
            const newDate = modalBody.querySelector('#cd-date').value;
            if (newTitle && newDate) {
              item.data.title = newTitle;
              item.data.date = newDate;
              NT.saveState();
              NT.rerender();
              NT.closeModal();
            }
          });
        });
      },
      destroy(el) {
        if (el.dataset.interval) {
          clearInterval(parseInt(el.dataset.interval));
          delete el.dataset.interval;
        }
      }
    },

    datecard: {
      title: '日历纪念日',
      w: 2,
      h: 1,
      render(el, item) {
        const now = new Date();
        const day = now.getDate();
        const wk = '星期' + weekDays[now.getDay()];
        const lunar = lunarText(now);
        const statusText = todayStatusText(now);
        const title = item.data?.title || '元旦';
        const dateStr = resolveCountdownDate(item.data);
        const target = new Date(dateStr + 'T00:00:00');
        const diffDays = Math.round((target - todayDateObj()) / 86400000);
        const absDays = Math.abs(diffDays);
        const bigText = diffDays === 0 ? '今天' : absDays.toLocaleString('en-US');
        const subText = diffDays === 0 ? '就是今天' : (diffDays > 0 ? '还有' : '已经');
        const dateText = `${target.getFullYear()}年${target.getMonth() + 1}月${target.getDate()}日`;
        el.innerHTML = `
          <div style="height:100%;width:100%;display:flex;align-items:center;padding:16px 20px;box-sizing:border-box;color:var(--ink-1);">
            <div style="flex:1;text-align:center;min-width:0;">
              <div style="font-size:3.1rem;font-weight:700;line-height:1;color:#eb2e2e;">${day}</div>
              <div style="font-size:0.92rem;margin-top:7px;">${wk}</div>
              <div style="font-size:0.78rem;color:var(--ink-3);margin-top:3px;">${lunar ? (window.NTI18N && NTI18N.lang() === 'en' ? 'Lunar ' : '农历') + lunar : now.getFullYear() + '年' + (now.getMonth() + 1) + '月'}</div>
              ${statusText ? `<div style="font-size:0.78rem;color:#d97706;margin-top:3px;">${statusText}</div>` : ''}
            </div>
            <div style="flex:none;width:1px;align-self:stretch;margin:6px 0;background:rgba(120,120,128,.25);"></div>
            <div class="dc-count" title="点击编辑纪念日" style="flex:1;min-width:0;padding-left:30px;cursor:pointer;text-align:left;">
              <div style="font-size:0.92rem;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">距离${title}</div>
              <div style="margin-top:8px;line-height:1;">
                <span style="font-size:2.6rem;font-weight:700;">${bigText}</span>
                ${diffDays !== 0 ? '<span style="font-size:0.95rem;color:var(--ink-2);margin-left:5px;">天</span>' : ''}
              </div>
              <div style="font-size:0.8rem;color:var(--ink-3);margin-top:9px;white-space:nowrap;">${subText} · ${dateText}</div>
            </div>
          </div>
        `;
        el.querySelector('.dc-count').addEventListener('click', () => openCountdownEdit(item, title, dateStr));
      },
      destroy(el) {}
    },

    analog: {
      title: '时钟',
      w: 1,
      h: 1,
      render(el, item) {
        if (item.data && item.data.style === 'digital') {
          const update = () => {
            const d = new Date();
            const timeStr = pad(d.getHours()) + ':' + pad(d.getMinutes());
            const dateStr = (d.getMonth() + 1) + '月' + d.getDate() + '日 星期' + weekDays[d.getDay()];
            el.innerHTML = `
              <div style="height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;color:var(--ink-1);">
                <div style="font-size:2.5rem;font-weight:600;line-height:1;">${timeStr}</div>
                <div style="font-size:0.9rem;margin-top:8px;opacity:0.7;">${dateStr}</div>
              </div>
            `;
          };
          update();
          const id = setInterval(update, 1000);
          el.dataset.interval = String(id);
          return;
        }
        el.innerHTML = `<div style="height:100%;width:100%;display:flex;align-items:center;justify-content:center;">${analogClockSvg(128)}</div>`;
        const id = startAnalogClock(el);
        el.dataset.interval = String(id);
      },
      destroy(el) {
        if (el.dataset.interval) {
          clearInterval(parseInt(el.dataset.interval));
          delete el.dataset.interval;
        }
      }
    }
  };
})();
