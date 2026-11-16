/* holidays.js — 法定节假日与调休数据（本地年度数据，按 ChatGPT 评审建议的版本化结构）
 * 数据来源见各年度 source 字段（国务院办公厅通知）。覆盖 2025-2026；无数据的年份不猜测、返回 null。
 */
window.NTHolidays = (function () {
  var DATA = {
 "2025": {
  "year": 2025,
  "source": "国务院办公厅关于2025年部分节假日安排的通知（国办发明电〔2024〕12号）",
  "days": {
   "2025-01-01": "holiday",
   "2025-01-28": "holiday",
   "2025-01-29": "holiday",
   "2025-01-30": "holiday",
   "2025-01-31": "holiday",
   "2025-02-01": "holiday",
   "2025-02-02": "holiday",
   "2025-02-03": "holiday",
   "2025-02-04": "holiday",
   "2025-04-04": "holiday",
   "2025-04-05": "holiday",
   "2025-04-06": "holiday",
   "2025-05-01": "holiday",
   "2025-05-02": "holiday",
   "2025-05-03": "holiday",
   "2025-05-04": "holiday",
   "2025-05-05": "holiday",
   "2025-05-31": "holiday",
   "2025-06-01": "holiday",
   "2025-06-02": "holiday",
   "2025-10-01": "holiday",
   "2025-10-02": "holiday",
   "2025-10-03": "holiday",
   "2025-10-04": "holiday",
   "2025-10-05": "holiday",
   "2025-10-06": "holiday",
   "2025-10-07": "holiday",
   "2025-10-08": "holiday",
   "2025-01-26": "workday",
   "2025-02-08": "workday",
   "2025-04-27": "workday",
   "2025-09-28": "workday",
   "2025-10-11": "workday"
  }
 },
 "2026": {
  "year": 2026,
  "source": "国务院办公厅关于2026年部分节假日安排的通知（国办发明电〔2025〕7号）",
  "days": {
   "2026-01-01": "holiday",
   "2026-01-02": "holiday",
   "2026-01-03": "holiday",
   "2026-02-15": "holiday",
   "2026-02-16": "holiday",
   "2026-02-17": "holiday",
   "2026-02-18": "holiday",
   "2026-02-19": "holiday",
   "2026-02-20": "holiday",
   "2026-02-21": "holiday",
   "2026-02-22": "holiday",
   "2026-02-23": "holiday",
   "2026-04-04": "holiday",
   "2026-04-05": "holiday",
   "2026-04-06": "holiday",
   "2026-05-01": "holiday",
   "2026-05-02": "holiday",
   "2026-05-03": "holiday",
   "2026-05-04": "holiday",
   "2026-05-05": "holiday",
   "2026-06-19": "holiday",
   "2026-06-20": "holiday",
   "2026-06-21": "holiday",
   "2026-09-25": "holiday",
   "2026-09-26": "holiday",
   "2026-09-27": "holiday",
   "2026-10-01": "holiday",
   "2026-10-02": "holiday",
   "2026-10-03": "holiday",
   "2026-10-04": "holiday",
   "2026-10-05": "holiday",
   "2026-10-06": "holiday",
   "2026-10-07": "holiday",
   "2026-01-04": "workday",
   "2026-02-14": "workday",
   "2026-02-28": "workday",
   "2026-05-09": "workday",
   "2026-09-20": "workday",
   "2026-10-10": "workday"
  }
 }
};
  function key(y, m, d) {
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
  }
  return {
    /* 返回 'holiday' | 'workday' | null（null = 无特殊安排或该年无数据） */
    dayType: function (date) {
      var rec = DATA[date.getFullYear()];
      if (!rec) return null;
      return rec.days[key(date.getFullYear(), date.getMonth() + 1, date.getDate())] || null;
    },
    hasYear: function (y) { return !!DATA[y]; },
    source: function (y) { return DATA[y] ? DATA[y].source : null; }
  };
})();
