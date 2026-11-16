(function (global, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (global) global.NTLayout = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var SNAP = 20;

  function num(v, d) {
    return (typeof v === 'number' && v === v) ? v : d; // 过滤 NaN / 非数字
  }

  function snap20(v) {
    return Math.round(num(v, 0) / SNAP) * SNAP;
  }

  function rectOf(cx, cy, w, h, unit, gap, pitch) {
    return {
      x: cx * pitch,
      y: cy * pitch,
      w: w * unit + (w - 1) * gap,
      h: h * unit + (h - 1) * gap
    };
  }

  function hit(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  function collide(r, placed) {
    for (var i = 0; i < placed.length; i++) if (hit(r, placed[i])) return true;
    return false;
  }

  function maxBottom(rects) {
    var bottom = 0;
    for (var i = 0; i < rects.length; i++) {
      if (rects[i].y + rects[i].h > bottom) bottom = rects[i].y + rects[i].h;
    }
    return bottom;
  }

  // 单位格扫描找第一个放得下的位置，行上限 200
  function firstFit(w, h, cols, placed, unit, gap, pitch) {
    var maxCx = Math.max(0, cols - w); // 宽度超列数时退化为 cx = 0
    for (var cy = 0; cy <= 200; cy++) {
      for (var cx = 0; cx <= maxCx; cx++) {
        var r = rectOf(cx, cy, w, h, unit, gap, pitch);
        if (!collide(r, placed)) return r;
      }
    }
    // 极端兜底：追加到已放置内容下方
    return {
      x: 0,
      y: maxBottom(placed),
      w: w * unit + (w - 1) * gap,
      h: h * unit + (h - 1) * gap
    };
  }

  function computeAuto(items, opts) {
    var list = Array.isArray(items) ? items : [];
    var o = opts || {};
    var unit = num(o.unit, 180);
    var gap = num(o.gap, 60);
    var pitch = num(o.pitch, 240);
    var cellW = num(o.iconCellW, 96);
    var cellH = num(o.iconCellH, 118);
    var canvasW = num(o.canvasW, 0);
    var maxCols = num(o.maxWidgetCols, Infinity);
    var cols = Math.min(maxCols, Math.max(1, Math.floor((canvasW + gap) / pitch)));

    var widgets = [];
    var icons = [];
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (!it || it.id === null || it.id === undefined) continue;
      if (it.type === 'widget') widgets.push({ item: it, idx: i });
      else icons.push(it); // icon/folder 保持输入顺序
    }

    // 按 (y, x) 升序，稳定排序
    widgets.sort(function (a, b) {
      var ay = num(a.item.y, 0), by = num(b.item.y, 0);
      if (ay !== by) return ay - by;
      var ax = num(a.item.x, 0), bx = num(b.item.x, 0);
      if (ax !== bx) return ax - bx;
      return a.idx - b.idx;
    });

    var rects = {};
    var placed = [];
    for (var k = 0; k < widgets.length; k++) {
      var item = widgets[k].item;
      var w = Math.max(1, num(item.w, 1));
      var h = Math.max(1, num(item.h, 1));
      var gx = num(item.x, 0);
      var gy = num(item.y, 0);
      var r = rectOf(gx, gy, w, h, unit, gap, pitch);
      // 期望位置合法且不重叠时逐像素保留（主路径），否则走 first-fit
      if (!(gx + w <= cols) || collide(r, placed)) {
        r = firstFit(w, h, cols, placed, unit, gap, pitch);
      }
      placed.push(r);
      rects[item.id] = r;
    }

    var widgetBottom = maxBottom(placed);
    var startY = placed.length ? widgetBottom + gap : 0;
    var colsI = Math.max(1, Math.floor(canvasW / cellW));

    for (var j = 0; j < icons.length; j++) {
      rects[icons[j].id] = {
        x: (j % colsI) * cellW,
        y: startY + Math.floor(j / colsI) * cellH,
        w: cellW,
        h: cellH
      };
    }

    var height = 0;
    for (var id in rects) {
      if (Object.prototype.hasOwnProperty.call(rects, id)) {
        var rr = rects[id];
        if (rr.y + rr.h > height) height = rr.y + rr.h;
      }
    }
    return { rects: rects, height: height };
  }

  function copy(o) {
    var r = {};
    for (var k in o) {
      if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k];
    }
    return r;
  }

  function migrateCv(items) {
    if (!Array.isArray(items)) return 0;
    var n = 0;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || it.free === null || it.free === undefined) continue;
      if (it.cv !== null && it.cv !== undefined) continue; // 已有 cv 不覆盖
      it.cv = copy(it.free); // 浅拷贝，保留 free
      n++;
    }
    return n;
  }

  return { snap20: snap20, computeAuto: computeAuto, migrateCv: migrateCv };
});
