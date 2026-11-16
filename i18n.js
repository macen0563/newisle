/* i18n.js — 轻量国际化（原生 JS，无依赖）
 * 词典以「中文原句」为 key：NTI18N_EN = { '中文原句': 'English', ... }（485 条）
 * NTI18N.t(s)：代码内字符串（alert/confirm/拼接文案）按 key 精确翻译，缺失时回退中文原句。
 * DOM 翻译：英文模式下由 MutationObserver 驱动，把渲染出的文本节点与
 * title/placeholder/aria-label 属性按词典整句/短语翻译，用户内容区跳过；
 * 切回中文时按记录恢复原文。调用方在拿到 settings.lang 后调用 NTI18N.init(lang)。
 */
const NTI18N_EN = {
 " 个": "",
 " 个书签": " bookmarks",
 " 个书签到文件夹「": " bookmarks to folder “",
 " 个书签（含子文件夹）": " bookmarks (including subfolders)",
 " 个书签）": " bookmarks)",
 " 个元素。": " elements.",
 " 个损坏元素。": " corrupted items.",
 " 个未添加": " over the limit were not added",
 " 个桌面、": " desktops,",
 " 个（无效或重复）": " (invalid or duplicate)",
 " 分": " min",
 " 天": " days",
 " 张图片。": " images.",
 " 张图片在 ZIP 中缺失，恢复后将无法显示。": " images are missing from the ZIP and will not display after restore.",
 " 张图片读取失败，未能打包进 ZIP。": " images failed to read and were not packed into the ZIP.",
 "7 天": "7 days",
 "Bing 每日一图": "Bing Image of the Day",
 "ZIP 中使用了不支持的压缩方式：": "Unsupported compression method in ZIP:",
 "ZIP 结构损坏（中央目录签名错误）": "ZIP structure corrupted (central directory signature error)",
 "ZIP 结构损坏（中央目录越界）": "Corrupted ZIP structure (central directory out of bounds)",
 "ZIP 结构损坏（中央目录项越界）": "Corrupted ZIP structure (central directory entry out of bounds)",
 "ZIP 结构损坏（文件名越界）": "Corrupted ZIP structure (filename out of bounds)",
 "ZIP 结构损坏（本地文件头签名错误）": "ZIP structure corrupted (local file header signature error)",
 "ZIP 结构损坏（本地文件头越界）": "ZIP structure corrupted (local file header out of bounds)",
 "ZIP 结构损坏（条目数据越界）": "Corrupted ZIP structure (entry data out of bounds)",
 "picsum 随机图库": "picsum random gallery",
 "· 缓存": "· Cache",
 "「": "“",
 "」": "”",
 "」上已经有这个内容了": "” already has this content",
 "」中有": "” contains ",
 "一": "Mon",
 "一起删除": "Delete everything",
 "一键整理布局": "Auto-arrange layout",
 "三": "Wed",
 "三十": "30th",
 "上传后优先于网站 logo 显示，且不带背景色": "After upload, it displays instead of the website logo and has no background color.",
 "上午": "AM",
 "上海": "Shanghai",
 "下午": "PM",
 "不是有效的 ZIP 文件（太小）": "Not a valid ZIP file (too small)",
 "不是有效的 ZIP 文件（找不到中央目录结束记录）": "Not a valid ZIP file (end of central directory record not found)",
 "专注": "Focus",
 "专注时钟": "Focus Clock",
 "世界时钟": "World Clock",
 "东京": "Tokyo",
 "个书签": "bookmarks",
 "个书签（含子文件夹）": "bookmarks (including subfolders)",
 "个书签）": "bookmarks)",
 "个子项。": " child items.",
 "个未添加": "not added",
 "个（无效或重复）": "(invalid or duplicate)",
 "中午": "Noon",
 "中文常用": "Popular in China",
 "主页": "Home",
 "主题": "Theme",
 "主题 ": "Theme ",
 "习惯养成": "Habit Building",
 "书签": "Bookmarks",
 "二": "Tue",
 "二十": "20th",
 "五": "Fri",
 "亩": "mu",
 "今": "Today",
 "今天": "Today",
 "今日": "Today",
 "今日已打卡 ✓": "Checked in today ✓",
 "今日打卡": "Check in today",
 "今日调休上班": "Make-up workday today",
 "从图标库选择": "Choose from icon library",
 "从浏览器读取书签": "Read bookmarks from browser",
 "从空白开始": "Start from blank",
 "休息": "Break",
 "伦敦": "London",
 "使用示例桌面": "Use sample desktop",
 "保存": "Save",
 "保存当前外观为主题": "Save current appearance as theme",
 "保存搜索历史（仅本地，可在搜索框聚焦时查看/清空）": "Save search history (local only; view/clear it when the search box is focused)",
 "倒计时中": "Counting Down",
 "倒计时器": "Countdown Timer",
 "倒计时结束": "Countdown ended",
 "假期中 🎉": "On vacation 🎉",
 "元": "Yuan",
 "元旦": "New Year's Day",
 "克": "g",
 "全球常用": "Global Popular",
 "全部": "All",
 "全部图源随机": "Random from all sources",
 "轮换图源": "Rotation source",
 "公顷": "ha",
 "六": "Sat",
 "内容区宽度": "Content area width",
 "写点什么…": "Write something…",
 "农历": "Lunar",
 "冬至": "Winter Solstice",
 "冻雨": "Freezing rain",
 "凌晨": "Early morning",
 "分": "min",
 "分钟": "Minute",
 "切换为数字样式": "Switch to digital style",
 "切换为表盘样式": "Switch to clock face",
 "切换搜索引擎": "Switch search engine",
 "创建快照": "Create Snapshot",
 "初一": "1st",
 "初七": "7th",
 "初三": "3rd",
 "初九": "9th",
 "初二": "2nd",
 "初五": "5th",
 "初八": "8th",
 "初六": "6th",
 "初十": "10th",
 "初四": "4th",
 "删除": "Delete",
 "删除快捷方式": "Delete shortcut",
 "删除桌面": "Delete Desktop",
 "刷新": "Refresh",
 "刷新中…": "Refreshing…",
 "加载中…": "Loading…",
 "北京": "Beijing",
 "十一": "11th",
 "十七": "17th",
 "十三": "13th",
 "十九": "19th",
 "十二": "12th",
 "十五": "15th",
 "十八": "18th",
 "十六": "16th",
 "十四": "14th",
 "千克": "kg",
 "千米": "km",
 "华氏": "Fahrenheit",
 "单位换算": "Unit Conversion",
 "历史上的今天": "Today in history",
 "厘米": "cm",
 "取消": "Cancel",
 "取消默认桌面": "Unset default desktop",
 "可填入任意返回 {data:[{title/name, hot}]} 的热榜接口": "Enter any trending-list API that returns {data:[{title/name, hot}]}",
 "名称": "Name",
 "周一": "Mon",
 "周三": "Wed",
 "周二": "Tue",
 "周五": "Fri",
 "周六": "Sat",
 "周四": "Thu",
 "周日": "Sun",
 "哔哩哔哩": "Bilibili",
 "喝水": "Drink water",
 "四": "Thu",
 "回收站": "Trash",
 "回收站为空": "Trash is empty",
 "回滚": "Rollback",
 "回滚到这份快照？当前数据会先自动存一份快照。": "Roll back to this snapshot? Your current data will be saved as a snapshot first.",
 "图标": "Icon",
 "图标回到桌面": "Return icon to desktop",
 "壁纸": "Wallpaper",
 "壁纸模糊": "Wallpaper Blur",
 "壁纸自动轮换（图源随机，断网时保留当前）": "Auto-rotate wallpapers (random image source; keep current when offline)",
 "处暑": "End of Heat",
 "备份包含 ": "Backup includes ",
 "备份文件过大（超过 20MB），已取消导入": "Backup file is too large (over 20MB). Import cancelled.",
 "复制": "Copy",
 "复制失败": "Copy Failed",
 "复制链接": "Copy Link",
 "夏至": "Summer Solstice",
 "外观": "Appearance",
 "外观与壁纸": "Appearance & Wallpaper",
 "多云": "Cloudy",
 "大": "Large",
 "大寒": "Major Cold",
 "大小": "Size",
 "大暑": "Major Heat",
 "大雨": "Heavy rain",
 "大雪": "Major Snow",
 "天": "days",
 "天气": "Weather",
 "天气暂不可用 · 点击重试": "Weather unavailable · Tap to retry",
 "天气预报": "Weather Forecast",
 "子项": "Child items",
 "存储空间不足，本次修改未能保存，请到设置中清理快照或换一张小一点的壁纸": "Not enough storage; this change was not saved. Clear snapshots in Settings or choose a smaller wallpaper.",
 "完成": "Done",
 "定位中…": "Locating…",
 "宽大": "Wide",
 "宽（6 列）": "Wide (6 columns)",
 "寒露": "Cold Dew",
 "导入为文件夹": "Import as folder",
 "导入后会在当前桌面生成一个文件夹。": "A folder will be created on the current desktop after import.",
 "导入备份": "Import Backup",
 "导入备份前": "Before backup import",
 "导入将覆盖当前数据（已自动创建快照，可在设置中回滚），继续？": "Importing will overwrite current data (a snapshot was created automatically; you can roll back in Settings). Continue?",
 "导入浏览器书签": "Import browser bookmarks",
 "导入的书签": "Imported bookmarks",
 "导出 ZIP 备份": "Export ZIP backup",
 "导出备份": "Export Backup",
 "将导入": "Will import",
 "将导入 ": "Will import ",
 "小": "Small",
 "小寒": "Minor Cold",
 "小时": "Hour",
 "小暑": "Minor Heat",
 "小满": "Grain Buds",
 "小雪": "Minor Snow",
 "就是今天": "It's Today",
 "就是今天 🎂": "It's today 🎂",
 "就绪": "Ready",
 "尺寸 ·": "Size ·",
 "尺寸 · ": "Size · ",
 "山地（内置壁纸）": "Mountains (built-in)",
 "工具效率": "Tools & Productivity",
 "已完成": "Completed",
 "已完成 ": "Completed ",
 "已导入": "Imported",
 "已导入 ": "Imported ",
 "已应用主题「": "Applied theme “",
 "已恢复 ": "Restored ",
 "已暂停": "Paused",
 "已添加": "Added",
 "已添加 ": "Added ",
 "已清空桌面，删除的内容可在设置-回收站恢复": "Desktop cleared. Deleted items can be restored in Settings > Trash.",
 "已经": "Passed",
 "已过滤 ": "Filtered out ",
 "巴黎": "Paris",
 "布局模式（当前桌面）": "Layout mode (current desktop)",
 "常用": "Common",
 "平方千米": "sq km",
 "平方米": "m²",
 "平方英尺": "sq ft",
 "年": "Year",
 "广州": "Guangzhou",
 "应用": "Apply",
 "应用这张": "Apply This",
 "廿一": "21st",
 "廿七": "27th",
 "廿三": "23rd",
 "廿九": "29th",
 "廿二": "22nd",
 "廿五": "25th",
 "廿八": "28th",
 "廿六": "26th",
 "廿四": "24th",
 "开始": "Start",
 "开尔文": "Kelvin",
 "强阵雨": "Heavy Showers",
 "当前位置": "Current Location",
 "当前壁纸": "Current Wallpaper",
 "当前桌面使用独立壁纸（在上方壁纸区设置，只影响本桌面）": "Current desktop uses a separate wallpaper (set it in the wallpaper area above; affects only this desktop)",
 "当前桌面已锁定，请先在底部圆点菜单中解锁": "Current desktop is locked. Unlock it from the bottom dot menu first.",
 "当前浏览器不支持 deflate-raw 解压（DecompressionStream 不可用），无法读取压缩的 ZIP 条目": "This browser does not support deflate-raw decompression (DecompressionStream unavailable); compressed ZIP entries cannot be read.",
 "当前环境不支持直接读取，请用书签文件导入": "Direct reading is not supported in this environment. Please import using a bookmarks file.",
 "彻底删除": "Delete Permanently",
 "待办事项": "To-Dos",
 "微博": "Weibo",
 "微博热搜": "Weibo Trending",
 "必应": "Bing",
 "恢复": "Restore",
 "悉尼": "Sydney",
 "惊蛰": "Awakening of Insects",
 "成都": "Chengdu",
 "或导入书签 HTML 文件": "Or import a bookmarks HTML file",
 "手动快照": "Manual snapshot",
 "批量添加": "Bulk Add",
 "批量添加网址": "Add URLs in bulk",
 "换一句": "New quote",
 "搜狗": "Sogou",
 "搜索": "Search",
 "搜索后保留搜索框内容": "Keep search text after search",
 "搜索图标名称…": "Search icon name…",
 "搜索在新标签页打开": "Open search in new tab",
 "搜索建议（开启后，输入内容将发送给所选搜索引擎以获取联想词，不会发送搜索历史）": "Search suggestions (when enabled, input is sent to the selected search engine for suggestions; search history is not sent)",
 "搜索引擎": "Search Engine",
 "搜索框样式": "Search box style",
 "摄氏": "Celsius",
 "改名": "Rename",
 "数字时钟": "Digital Clock",
 "数据": "Data",
 "数据与隐私": "Data & Privacy",
 "数据日期": "Data Date",
 "数据日期 ": "Data date: ",
 "文件夹": "Folder",
 "文件夹「": "Folder “",
 "文件夹内容": "Folder contents",
 "文件夹名称": "Folder name",
 "文件解析失败": "File parsing failed",
 "文字": "Text",
 "斤": "jin",
 "新加坡": "Singapore",
 "新建文件夹": "New folder",
 "新建桌面": "New Desktop",
 "新标签页工作台": "New tab workspace",
 "新屿 NewIsle": "NewIsle",
 "新桌面": "New Desktop",
 "新闻暂不可用，检查网络后点此重试": "News unavailable. Check network and tap to retry.",
 "新闻资讯": "News",
 "无效的 ZIP 备份文件": "Invalid ZIP backup file",
 "无效的 ZIP 备份：缺少 backup.json": "Invalid ZIP backup: backup.json missing",
 "无效的备份文件：结构不完整": "Invalid backup file: incomplete structure.",
 "日": "Sun",
 "日元": "JPY",
 "日历": "Calendar",
 "日历纪念日": "Calendar & Anniversary",
 "日期": "Date",
 "时钟": "Clock",
 "时间到": "Time's up",
 "时间到！": "Time's up!",
 "明天": "Tomorrow",
 "星期": "Week",
 "星期一": "Monday",
 "星期三": "Wednesday",
 "星期二": "Tuesday",
 "星期五": "Friday",
 "星期六": "Saturday",
 "星期四": "Thursday",
 "星期天": "Sunday",
 "星期日": "Sunday",
 "春分": "Spring Equinox",
 "昨天": "Yesterday",
 "显示到「": "Show on “",
 "显示名称": "Display Name",
 "晚上": "Evening",
 "晨雾（内置壁纸）": "Morning Mist (built-in)",
 "晴": "Sunny",
 "暂停": "Pause",
 "暂无主题，先保存一个。": "No themes yet. Save one first.",
 "暂无子项": "No child items",
 "暂无待办": "No To-Dos",
 "暂无快照": "No Snapshots",
 "暂无报价": "No Quotes",
 "暂无数据": "No Data",
 "暂无预报数据，点右上角刷新获取": "No forecast data. Tap refresh in the top right.",
 "更新": "Update",
 "更新 ": "Updated ",
 "更新 :": "Updated:",
 "最多 6 个城市": "Up to 6 cities",
 "月": "Month",
 "有 ": "",
 "未命名": "Untitled",
 "未命名文件夹": "Untitled folder",
 "未知": "Unknown",
 "未知组件": "Unknown Widget",
 "未获得书签读取权限，请用书签文件导入": "Bookmark read permission not granted. Please import using a bookmarks file.",
 "杭州": "Hangzhou",
 "极简模式（只保留时钟与搜索）": "Minimal mode (clock and search only)",
 "标准": "Standard",
 "标准（4 列）": "Standard (4 columns)",
 "标题": "Title",
 "桌面与布局": "Desktop & Layout",
 "森林（内置壁纸）": "Forest (built-in)",
 "欢迎使用": "Welcome",
 "欧元": "EUR",
 "正在请求书签读取权限…": "Requesting bookmark access…",
 "正在读取书签…": "Reading bookmarks…",
 "每天": "Daily",
 "每小时": "Hourly",
 "每日一言": "Daily Quote",
 "每次打开新标签": "Each new tab",
 "每行一个网址，最多 20 个。": "One URL per line, up to 20.",
 "每行一个，格式：名字,MM-DD": "One per line, format: Name,MM-DD",
 "毛毛雨": "Drizzle",
 "汇率": "Exchange Rates",
 "汇率暂不可用，检查网络后点此重试": "Exchange rates unavailable. Check network and tap to retry.",
 "没有找到可导入的书签": "No importable bookmarks found",
 "没有识别到有效网址": "No valid URLs detected",
 "没有读取到可导入的书签": "No importable bookmarks were read",
 "河岸（内置壁纸）": "Riverbank (built-in)",
 "洛杉矶": "Los Angeles",
 "浅色卡片": "Light Card",
 "深圳": "Shenzhen",
 "深色卡片": "Dark Card",
 "深色模式": "Dark Mode",
 "添加": "Add",
 "添加图标": "Add Icon",
 "添加子项": "Add child item",
 "添加待办，回车确认": "Add to-do, Enter to confirm",
 "添加文件夹": "Add folder",
 "添加桌面": "Add Desktop",
 "添加组件": "Add Widget",
 "清明": "Qingming",
 "清除自定义图标": "Clear custom icon",
 "温度": "Temperature",
 "港币": "HKD",
 "点击添加生日": "Click to add birthday",
 "点击编辑纪念日": "Click to edit anniversary",
 "热搜暂不可用（数据源可能已变更），点此重试": "Trending searches are temporarily unavailable (data source may have changed). Tap to retry.",
 "热搜榜": "Trending",
 "现在": "Now",
 "生成 ZIP 备份失败": "Failed to create ZIP backup",
 "生日": "Birthday",
 "白露": "White Dew",
 "百度": "Baidu",
 "盎司": "Ounce",
 "知乎": "Zhihu",
 "确定": "OK",
 "确定要重置所有数据吗？此操作不可撤销！": "Reset all data? This cannot be undone!",
 "磅": "lb",
 "秋分": "Autumn Equinox",
 "秒": "sec",
 "窄（3 列）": "Narrow (3 columns)",
 "立冬": "Beginning of Winter",
 "立夏": "Beginning of Summer",
 "立春": "Beginning of Spring",
 "立秋": "Beginning of Autumn",
 "笔记": "Notes",
 "简体中文": "Simplified Chinese",
 "米": "m",
 "紧凑": "Compact",
 "纪念日": "Anniversary",
 "纽约": "New York",
 "组件": "Widgets",
 "缓存": "Cache",
 "编辑": "Edit",
 "编辑图标": "Edit Icon",
 "编辑文件夹": "Edit folder",
 "编辑纪念日": "Edit anniversary",
 "网址": "URL",
 "网格布局": "Grid Layout",
 "网站名称": "Site Name",
 "美元": "USD",
 "自动定位（使用浏览器定位，定位失败时用下方城市）": "Auto-locate (use browser location; if it fails, use the city below)",
 "自定义": "Custom",
 "自定义图标": "Custom icon",
 "自定义图标（可选）": "Custom icon (optional)",
 "自由布局": "Free Layout",
 "自由布局：拖动吸附": "Free layout: snap on drag",
 "自由布局：防重叠": "Free layout: prevent overlap",
 "至少保留一个桌面": "Keep at least one desktop",
 "芒种": "Grain in Ear",
 "英寸": "Inch",
 "英尺": "Foot",
 "英里": "Mile",
 "解压 ZIP 条目失败": "Failed to extract ZIP entry",
 "解压 ZIP 条目失败（数据可能已损坏）": "Failed to extract ZIP entry (data may be corrupted)",
 "解析失败，请确认文件格式正确": "Parsing failed. Please check the file format.",
 "解锁桌面": "Unlock Desktop",
 "计算器": "Calculator",
 "设为默认桌面": "Set as default desktop",
 "设置": "Settings",
 "该城市已存在": "City already exists",
 "语言 / Language": "Language",
 "请至少保留一个城市": "Keep at least one city",
 "请选择处理方式：": "Choose how to handle:",
 "谷雨": "Grain Rain",
 "距离": "Distance",
 "跟随壁纸": "Follow Wallpaper",
 "车站（内置壁纸）": "Grand Station (built-in)",
 "输入搜索内容": "Enter search text",
 "返回上级": "Back",
 "还有": "Coming up",
 "还有 ": "Remaining ",
 "还没有城市，请添加": "No cities yet. Add one.",
 "连续打卡": "Streak",
 "连续打卡 ": "Check-in streak ",
 "迪拜": "Dubai",
 "退出极简模式": "Exit minimal mode",
 "选了库图标后优先于网站 logo 显示；与自定义上传二选一，再次点击已选图标可取消": "Selected library icon takes priority over the website logo; choose either this or a custom upload. Tap the selected icon again to cancel.",
 "选择之前导出的备份文件（.json 或 .zip），导入会覆盖当前数据，导入前会自动创建快照，可在下方回滚。": "Select a previously exported backup file (.json or .zip). Importing will overwrite current data; a snapshot is created automatically before import and can be rolled back below.",
 "选择城市": "Select City",
 "选择开始方式，之后随时可以在设置里调整。": "Choose how to start; you can adjust this anytime in Settings.",
 "逐小时": "Hourly",
 "遮罩浓度": "Overlay Opacity",
 "重命名": "Rename",
 "重命名桌面": "Rename desktop",
 "重置": "Reset",
 "重置前": "Before reset",
 "重量": "Weight",
 "链接已复制": "Link copied",
 "锁定桌面": "Lock Desktop",
 "错误": "Error",
 "长度": "Length",
 "阴": "Overcast",
 "阵雨": "Showers",
 "阵雪": "Snow Showers",
 "随机一张": "Random image",
 "隐藏右下角「添加」按钮": "Hide the “Add” button in the bottom right",
 "雨": "Rain",
 "雨水": "Rain Water",
 "雪": "Snow",
 "雷阵雨": "Thunderstorms",
 "雾": "Fog",
 "雾海（内置壁纸）": "Sea of Fog (built-in)",
 "霜降": "Frost Descent",
 "面积": "Area",
 "颜色": "Color",
 "香港": "Hong Kong",
 "（已锁定）": "(Locked)",
 "（当前）": "(Current)",
 "（默认）": "(Default)",
 "，超出上限的": ", exceeding the limit",
 "，超出上限的 ": "; ",
 "，跳过": ", Skip",
 "，跳过 ": ", skipped "
};

(function () {
  'use strict';

  /* ---------- 词典 ---------- */
  var DICT = {};
  try {
    if (typeof NTI18N_EN !== 'undefined' && NTI18N_EN) DICT = NTI18N_EN;
  } catch (e) { DICT = {}; }

  function dictHas(k) {
    return Object.prototype.hasOwnProperty.call(DICT, k);
  }

  /* ---------- 状态 ---------- */
  var cur = 'zh';
  var observer = null;
  var started = false;
  var applying = false;

  var ATTRS = ['title', 'placeholder', 'aria-label'];
  var SKIP_SELECTOR = '.cell-label, .w2-quote-text, .trash-name, [data-no-i18n], .w2-todo-row > span, .nt-news-title, .nt-hot-name, .nt-oth-text';
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1 };
  var SHOW_ELEMENT = 1, SHOW_TEXT = 4;
  var FILTER_ACCEPT = 1, FILTER_REJECT = 2, FILTER_SKIP = 3;
  var CJK_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;

  var textRecords = new WeakMap();   // textNode -> {orig, trans}
  var attrRecords = new WeakMap();   // el -> { title: {orig, trans}, ... }
  var touchedText = new Set();
  var touchedAttr = new Set();

  var phraseCache = new Map();
  var phraseKeys = null;

  function getPhraseKeys() {
    if (phraseKeys) return phraseKeys;
    var keys = [];
    for (var k in DICT) {
      if (!Object.prototype.hasOwnProperty.call(DICT, k)) continue;
      if (k.length >= 2 && DICT[k] !== '') keys.push(k);
    }
    keys.sort(function (a, b) { return b.length - a.length; });
    phraseKeys = keys;
    return keys;
  }

  function hasDoc() {
    return typeof document !== 'undefined' && document;
  }

  /* ---------- 文本翻译 ---------- */
  function phraseTranslate(core) {
    var s = String(core)
      .replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/g, '$1/$2/$3')
      .replace(/(\d{1,2})月(\d{1,2})日/g, '$1/$2')
      .replace(/(\d{4})年(\d{1,2})月/g, '$1/$2')
      .replace(/(\d{4})年/g, '$1')
      .replace(/(\d+)天/g, '$1 days');
    var keys = getPhraseKeys();
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (s.indexOf(k) === -1) continue;
      var v = DICT[k];
      if (typeof v !== 'string') continue;
      s = s.split(k).join(v);   // 不用 replace，避免 $ 模式
    }
    return s;
  }

  function translateText(str) {
    if (typeof str !== 'string' || str === '') return str;
    var mLead = str.match(/^\s*/);
    var mTrail = str.match(/\s*$/);
    var lead = mLead ? mLead[0] : '';
    var trail = mTrail ? mTrail[0] : '';
    var core = str.slice(lead.length, str.length - trail.length);
    if (!core) return str;

    if (dictHas(core)) return lead + DICT[core] + trail;
    if (!CJK_RE.test(core)) return str;

    var out = phraseCache.get(core);
    if (out === undefined) {
      out = phraseTranslate(core);
      phraseCache.set(core, out);
    }
    return lead + out + trail;
  }

  /* ---------- 跳过规则 ---------- */
  function shouldSkipTextNode(node) {
    var p = node && node.parentNode;
    if (!p || p.nodeType !== 1) return false;
    if (SKIP_TAGS[p.nodeName]) return true;
    if (p.closest && p.closest(SKIP_SELECTOR)) return true;
    return false;
  }

  function attrAllowed(el, name) {
    if (!el || el.nodeType !== 1) return false;
    if (el.closest && el.closest(SKIP_SELECTOR)) {
      var tag = el.nodeName;
      var isField = (tag === 'INPUT' || tag === 'TEXTAREA') && name === 'placeholder';
      if (!isField) return false;
    }
    return true;
  }

  /* ---------- 翻译单个节点 / 属性 ---------- */
  function translateTextNode(node) {
    if (!node || node.nodeType !== 3) return;
    var rec = textRecords.get(node);
    var val = node.nodeValue;
    if (rec && val === rec.trans) return;   // 是我们写的，跳过
    var orig = val;
    var trans = translateText(orig);
    textRecords.set(node, { orig: orig, trans: trans });
    touchedText.add(node);
    if (trans !== orig) node.nodeValue = trans;
  }

  function translateAttr(el, name) {
    if (!el || el.nodeType !== 1 || !el.getAttribute) return;
    var val = el.getAttribute(name);
    if (val == null || val === '') return;
    var store = attrRecords.get(el);
    if (!store) { store = {}; attrRecords.set(el, store); }
    var rec = store[name];
    if (rec && val === rec.trans) return;
    var orig = val;
    var trans = translateText(orig);
    store[name] = { orig: orig, trans: trans };
    touchedAttr.add(el);
    if (trans !== orig) el.setAttribute(name, trans);
  }

  function translateElementAttrs(el) {
    if (!el || el.nodeType !== 1) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var name = ATTRS[i];
      if (!el.hasAttribute(name)) continue;
      if (!attrAllowed(el, name)) continue;
      translateAttr(el, name);
    }
  }

  /* ---------- 遍历子树 ---------- */
  function walkFilter(node) {
    if (node.nodeType === 1) {
      var tag = node.nodeName;
      if (tag === 'SCRIPT' || tag === 'STYLE') return FILTER_REJECT;
      if (node.matches && node.matches(SKIP_SELECTOR)) return FILTER_REJECT;
      return FILTER_ACCEPT;
    }
    if (node.nodeType === 3) {
      var p = node.parentNode;
      if (p && p.nodeType === 1 && p.nodeName === 'INPUT') return FILTER_SKIP;
      return FILTER_ACCEPT;
    }
    return FILTER_SKIP;
  }

  function translateTree(root) {
    if (!root || !hasDoc()) return;
    if (root.nodeType === 3) {
      if (!shouldSkipTextNode(root)) translateTextNode(root);
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) {
      if (root.matches && root.matches(SKIP_SELECTOR)) return;
      translateElementAttrs(root);
    }

    var walker;
    try {
      walker = document.createTreeWalker(root, SHOW_ELEMENT | SHOW_TEXT, walkFilter, false);
    } catch (e) { return; }

    var n = walker.nextNode();
    while (n) {
      if (n.nodeType === 3) { if (!shouldSkipTextNode(n)) translateTextNode(n); }
      else translateElementAttrs(n);
      n = walker.nextNode();
    }
  }

  /* ---------- 恢复 ---------- */
  function restoreAll() {
    if (hasDoc()) {
      applying = true;
      try {
        touchedText.forEach(function (node) {
          var rec = textRecords.get(node);
          if (rec && node.nodeValue !== rec.orig) node.nodeValue = rec.orig;
        });
        touchedAttr.forEach(function (el) {
          var store = attrRecords.get(el);
          if (!store) return;
          for (var i = 0; i < ATTRS.length; i++) {
            var name = ATTRS[i];
            var rec = store[name];
            if (!rec) continue;
            if (rec.trans !== rec.orig && el.getAttribute(name) === rec.trans) {
              el.setAttribute(name, rec.orig);
            }
          }
        });
      } finally {
        applying = false;
      }
    }
    touchedText = new Set();
    touchedAttr = new Set();
    textRecords = new WeakMap();
    attrRecords = new WeakMap();
    phraseCache = new Map();
  }

  /* ---------- Observer ---------- */
  function onMutations(records) {
    if (cur !== 'en' || applying || !hasDoc()) return;
    applying = true;
    try {
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (r.type === 'characterData') {
          if (r.target && !shouldSkipTextNode(r.target)) translateTextNode(r.target);
        } else if (r.type === 'attributes') {
          var el = r.target;
          var name = r.attributeName;
          if (el && el.nodeType === 1 && ATTRS.indexOf(name) !== -1 && attrAllowed(el, name)) {
            translateAttr(el, name);
          }
        } else if (r.type === 'childList') {
          for (var j = 0; j < r.addedNodes.length; j++) {
            translateTree(r.addedNodes[j]);
          }
        }
      }
    } finally {
      applying = false;
    }
  }

  function startObserver() {
    if (started || !hasDoc() || typeof MutationObserver === 'undefined') return;
    var target = document.documentElement || document;
    if (!target) return;
    started = true;
    observer = new MutationObserver(onMutations);
    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS
    });
  }

  function stopObserver() {
    if (observer) {
      try { observer.disconnect(); } catch (e) {}
      observer = null;
    }
    started = false;
  }

  /* ---------- 首翻 ---------- */
  function firstPass() {
    if (!hasDoc() || cur !== 'en') return;
    var root = document.documentElement || document.body;
    if (!root) return;
    applying = true;
    try { translateTree(root); } finally { applying = false; }
  }

  /* ---------- 对外 ---------- */
  function init(lang) {
    var next = (lang === 'en') ? 'en' : 'zh';
    var prev = cur;
    cur = next;

    if (hasDoc() && document.documentElement) {
      document.documentElement.lang = (next === 'en') ? 'en' : 'zh-CN';
    }

    if (!hasDoc()) return;

    if (next === 'en') {
      if (document.body) {
        firstPass();
      } else {
        document.addEventListener('DOMContentLoaded', function () {
          if (cur !== 'en') return;
          firstPass();
          startObserver();
        }, { once: true });
      }
      startObserver();
    } else if (prev === 'en') {
      stopObserver();
      restoreAll();
    }
  }

  function t(s) {
    if (cur !== 'en') return s;
    if (typeof s !== 'string') return s;
    if (dictHas(s)) return DICT[s];
    return s;
  }

  function lang() { return cur; }

  window.NTI18N = { init: init, t: t, lang: lang };
})();
