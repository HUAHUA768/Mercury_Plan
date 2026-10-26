/* ============================================================
   水星计划 · 原型
   纯前端、无依赖，数据保存在本机 localStorage
   ============================================================ */
(function () {
  'use strict';

  // ---------- 基础工具 ----------
  const KEY = 'mercury.plan.v1';
  const DOW = ['日', '一', '二', '三', '四', '五', '六'];
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = s => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const shift = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const TODAY = startOfDay(new Date());
  const TODAY_K = iso(TODAY);
  const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 86400000);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uid = p => p + Math.random().toString(36).slice(2, 8);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const sum = arr => arr.reduce((a, b) => a + b, 0);

  function fmtMD(k) { const d = parse(k); return `${d.getMonth() + 1}月${d.getDate()}日`; }
  function fmtMDW(k) { const d = parse(k); return `${d.getMonth() + 1}月${d.getDate()}日 周${DOW[d.getDay()]}`; }
  function fmtShort(k) { const d = parse(k); return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`; }
  function fmtFull(k) { const d = parse(k); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; }
  function relLabel(k) {
    const diff = diffDays(k, TODAY_K);
    if (diff === 0) return '今天';
    if (diff === 1) return '明天';
    if (diff === 2) return '后天';
    if (diff === -1) return '昨天';
    if (diff === -2) return '前天';
    if (diff > 0 && diff < 7) return `周${DOW[parse(k).getDay()]}`;
    if (diff < 0) {
      const n = -diff;
      if (n < 30) return `${n} 天前`;
      if (n < 365) return `${Math.max(1, Math.round(n / 30))} 个月前`;
      return `${Math.max(1, Math.round(n / 365))} 年前`;
    }
    return fmtMD(k);
  }
  function nowHM() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  function timeLabel(t) { return t || '全天'; }

  // ---------- 图标 ----------
  const I = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.2v2M12 19.8v2M2.2 12h2M19.8 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/>',
    cal: '<rect x="3" y="4.6" width="18" height="16" rx="3"/><path d="M8 2.6v4M16 2.6v4M3 9.6h18"/><path d="M8.6 14.2l2 2 4-4.2"/>',
    target: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none"/>',
    layers: '<path d="M12 3l8.5 4.6L12 12.2 3.5 7.6 12 3z"/><path d="M3.5 12.6L12 17.2l8.5-4.6"/><path d="M3.5 17L12 21.6 20.5 17"/>',
    repeat: '<path d="M17 2.6l3 3-3 3"/><path d="M20 5.6H8.2a4.2 4.2 0 00-4.2 4.2v1"/><path d="M7 21.4l-3-3 3-3"/><path d="M4 18.4h11.8a4.2 4.2 0 004.2-4.2v-1"/>',
    star: '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.7l6.1-.9L12 3.2z"/>',
    pen: '<path d="M4 20l4.2-1L18.7 8.5a2.1 2.1 0 000-3l-.2-.2a2.1 2.1 0 00-3 0L5 15.8 4 20z"/><path d="M14.5 6.5l3 3"/>',
    trophy: '<path d="M7 3.6h10v5a5 5 0 01-10 0v-5z"/><path d="M7 5.6H4v1.4a3 3 0 003 3M17 5.6h3v1.4a3 3 0 01-3 3"/><path d="M12 13.6V17M8.5 20.4h7"/>',
    search: '<circle cx="11" cy="11" r="6.4"/><path d="M16 16l4.4 4.4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chevL: '<path d="M14.6 6l-6 6 6 6"/>',
    chevR: '<path d="M9.4 6l6 6-6 6"/>',
    chevD: '<path d="M6 9.4l6 6 6-6"/>',
    check: '<path d="M4.6 12.6l4.4 4.4L19.4 5.6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    flame: '<path d="M12 2.8c3.4 4 5.4 6.6 5.4 9.6a5.4 5.4 0 11-10.8 0c0-1.4.6-2.7 1.6-4 .4 1.3 1.2 2.1 2.2 2.4C9.6 8.8 10.4 5.6 12 2.8z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.9v2.3M12 18.8v2.3M2.9 12h2.3M18.8 12h2.3M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6"/>',
    db: '<ellipse cx="12" cy="5.6" rx="7.4" ry="3"/><path d="M4.6 5.6v12.8c0 1.66 3.3 3 7.4 3s7.4-1.34 7.4-3V5.6"/><path d="M4.6 12c0 1.66 3.3 3 7.4 3s7.4-1.34 7.4-3"/>',
    droplet: '<path d="M12 3.2s5.4 6.2 5.4 9.7a5.4 5.4 0 11-10.8 0C6.6 9.4 12 3.2 12 3.2z"/>',
    book: '<path d="M4 4.6A2.6 2.6 0 016.6 2H20v17.4H6.6A2.6 2.6 0 004 22V4.6z"/><path d="M4 19.4A2.6 2.6 0 016.6 16.8H20"/>',
    run: '<circle cx="15.2" cy="4.6" r="1.9"/><path d="M9 21l2.4-5.2 3-1.8-2-4-2.8 1L7 14"/><path d="M14.4 14l2.4 3 .6 4"/>',
    moon: '<path d="M20 14.6A8.1 8.1 0 019.4 4a8.5 8.5 0 1010.6 10.6z"/>',
    coffee: '<path d="M4.5 8h11.6v4.6a4.8 4.8 0 01-4.8 4.8H9.3a4.8 4.8 0 01-4.8-4.8V8z"/><path d="M16.1 9.2h2.2a2.4 2.4 0 010 4.8h-2.2"/><path d="M4.5 21h13"/>',
    phone: '<rect x="6.4" y="2.6" width="11.2" height="18.8" rx="2.8"/><path d="M10.8 18.4h2.4"/>',
    zap: '<path d="M13.2 2L4.6 13.4H11l-1 8.6 8.8-12h-6.4L13.2 2z"/>',
    inbox: '<path d="M3.6 13.4L6.4 4.6h11.2l2.8 8.8v5.2a1.8 1.8 0 01-1.8 1.8H5.4a1.8 1.8 0 01-1.8-1.8v-5.2z"/><path d="M3.6 13.4h4l1.4 2.4h6l1.4-2.4h4"/>',
    arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    trash: '<path d="M4 6.6h16"/><path d="M9.4 6.6V4.7c0-.6.5-1.1 1.1-1.1h3c.6 0 1.1.5 1.1 1.1v1.9"/><path d="M6.2 6.6l.9 12.6c.06.9.8 1.6 1.7 1.6h6.4c.9 0 1.64-.7 1.7-1.6l.9-12.6"/><path d="M10.2 10.4v6.6M13.8 10.4v6.6"/>',
    restore: '<path d="M3.4 11.6l8.6-7.4 8.6 7.4"/><path d="M5.9 10.2v9.2h12.2v-9.2"/><path d="M12 20.2v-6M9.4 16.4l2.6-2.6 2.6 2.6"/>'
  };
  function icon(name, size) {
    return `<svg viewBox="0 0 24 24" width="${size || 18}" height="${size || 18}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${I[name] || ''}</svg>`;
  }

  // ---------- 种子数据 ----------
  function backfill(n, fn) {
    const out = {};
    for (let i = n; i >= 0; i--) {
      const d = shift(TODAY, -i);
      const v = fn(i, d);
      if (v != null) out[iso(d)] = v;
    }
    return out;
  }

  function seed() {
    const k = TODAY_K;
    const y1 = iso(shift(TODAY, -1));
    const t1 = iso(shift(TODAY, 1));
    const m3 = iso(shift(TODAY, -3));
    const m9 = iso(shift(TODAY, -9));
    const m30 = iso(shift(TODAY, -30));
    const ly = iso(shift(TODAY, -365));

    const projects = [
      { id: 'p1', name: '水星计划 · Windows 版', color: '#E9A33C', status: 'ing', progress: 34, next: '完成登录页原型', due: iso(shift(TODAY, 67)), note: '把这套原型变成真正能用的桌面软件。' },
      { id: 'p2', name: '书房改造', color: '#7BA7D9', status: 'ing', progress: 62, next: '量窗帘尺寸', due: iso(shift(TODAY, 26)), note: '书桌、书架已就位，剩下软装。' },
      { id: 'p5', name: '家庭相册数字化', color: '#C9A876', status: 'ing', progress: 8, next: '扫描第一批底片', due: iso(shift(TODAY, 120)), note: '从外公的旧相册开始。' },
      { id: 'p3', name: '个人作品集重构', color: '#A08BE0', status: 'pause', progress: 18, next: '整理 2024 年作品', due: null, note: '等水星计划告一段落再继续。' },
      { id: 'p4', name: '年度胶片摄影集', color: '#6FBF9B', status: 'done', progress: 100, next: null, due: iso(shift(TODAY, -25)), note: '印了 60 页，送了三本给朋友。' }
    ];

    const goals = [
      { id: 'g1', parentId: null, title: '今年读完 24 本书', type: 'goal', status: 'doing', due: '2026-12-31', note: '平均每月两本，允许跳读。' },
      { id: 'g11', parentId: 'g1', title: '每晚阅读 30 分钟', type: 'action', status: 'done' },
      { id: 'g12', parentId: 'g1', title: '读完《设计中的设计》', type: 'sub', status: 'doing', due: iso(shift(TODAY, 14)) },
      { id: 'g121', parentId: 'g12', title: '读完第 1–3 章', type: 'action', status: 'done' },
      { id: 'g122', parentId: 'g12', title: '读完第 4–6 章', type: 'action', status: 'doing', progress: 40 },
      { id: 'g13', parentId: 'g1', title: '每季度写一篇读书笔记', type: 'sub', status: 'doing' },
      { id: 'g131', parentId: 'g13', title: 'Q1 读书笔记', type: 'action', status: 'done' },
      { id: 'g132', parentId: 'g13', title: 'Q2 读书笔记', type: 'action', status: 'done' },
      { id: 'g133', parentId: 'g13', title: 'Q3 读书笔记', type: 'action', status: 'doing', progress: 60 },

      { id: 'g2', parentId: null, title: '上线水星计划 1.0', type: 'goal', status: 'doing', due: '2026-12-31', note: '先做对十个模块，再谈其它。' },
      { id: 'g21', parentId: 'g2', title: '完成信息架构与原型', type: 'action', status: 'done' },
      { id: 'g22', parentId: 'g2', title: '做完 8 个核心模块', type: 'sub', status: 'doing', due: iso(shift(TODAY, 45)) },
      { id: 'g221', parentId: 'g22', title: '日程待办', type: 'action', status: 'done' },
      { id: 'g222', parentId: 'g22', title: '当日总览', type: 'action', status: 'doing', progress: 50 },
      { id: 'g223', parentId: 'g22', title: '习惯打卡：周视图与补卡', type: 'action', status: 'doing', progress: 30 },
      { id: 'g23', parentId: 'g2', title: '邀请 20 位内测用户', type: 'action', status: 'todo' },

      { id: 'g3', parentId: null, title: '体重回到 70kg', type: 'goal', status: 'doing', due: iso(shift(TODAY, 150)) },
      { id: 'g31', parentId: 'g3', title: '每周运动 3 次', type: 'action', status: 'doing', progress: 55 },
      { id: 'g32', parentId: 'g3', title: '戒掉含糖饮料', type: 'action', status: 'doing', progress: 40 }
    ];

    const habits = [
      {
        id: 'h1', kind: 'build', name: '早起 6:30', icon: 'sun', target: 1, unit: '次', note: '醒来先拉开窗帘。',
        records: backfill(40, i => (i >= 1 && i <= 6) ? 1 : (i % 9 === 0 ? 1 : null))
      },
      {
        id: 'h2', kind: 'build', name: '阅读 30 分钟', icon: 'book', target: 1, unit: '次', note: '纸质书，睡前不看手机。',
        records: backfill(45, i => (i <= 23 ? 1 : (i % 5 === 0 ? 1 : null)))
      },
      {
        id: 'h3', kind: 'build', name: '喝水 8 杯', icon: 'droplet', target: 8, unit: '杯', note: '',
        records: backfill(30, i => (i === 0 ? 3 : (i <= 12 ? 8 : null)))
      },
      {
        id: 'h4', kind: 'build', name: '冥想 10 分钟', icon: 'moon', target: 1, unit: '次', note: '',
        records: backfill(20, i => (i % 3 === 1 ? 1 : null))
      },
      {
        id: 'h5', kind: 'build', name: '运动 30 分钟', icon: 'run', target: 1, unit: '次', note: '',
        records: backfill(21, (i, d) => ([1, 3, 5].indexOf((d.getDay() + 6) % 7) >= 0 ? 1 : null))
      },
      {
        id: 'h6', kind: 'build', name: '记账', icon: 'pen', target: 1, unit: '次', note: '',
        records: backfill(60, () => 1)
      },
      {
        id: 'q1', kind: 'quit', name: '刷短视频', icon: 'phone', lastRelapse: iso(shift(TODAY, -12)), best: 31, total: 88,
        note: '起床后和睡前最容易破。'
      },
      {
        id: 'q2', kind: 'quit', name: '含糖饮料', icon: 'coffee', lastRelapse: iso(shift(TODAY, -4)), best: 21, total: 40,
        note: ''
      },
      {
        id: 'q3', kind: 'quit', name: '熬夜刷手机', icon: 'zap', lastRelapse: iso(shift(TODAY, -2)), best: 15, total: 26,
        note: ''
      }
    ];

    const tasks = [
      { id: 't1', title: '站会：同步本周进度', date: k, time: '09:00', done: true, p: 'high', projectId: 'p1' },
      { id: 't2', title: '写周报', date: k, time: '10:30', done: true, p: 'high' },
      { id: 't3', title: '回复设计稿评论', date: k, time: '11:00', done: true, p: 'normal', projectId: 'p1' },
      { id: 't4', title: '和设计师对稿', date: k, time: '14:00', done: false, p: 'high', projectId: 'p1' },
      { id: 't5', title: '整理下载文件夹', date: k, time: '16:30', done: false, p: 'normal' },
      { id: 't6', title: '读 30 页《设计中的设计》', date: k, time: '20:00', done: false, p: 'normal', goalId: 'g122' },
      { id: 't7', title: '买猫粮', date: k, time: '', done: false, p: 'normal' },
      { id: 't8', title: '预约牙医', date: t1, time: '10:00', done: false, p: 'normal' },
      { id: 't9', title: '提交报销单', date: t1, time: '15:00', done: false, p: 'high' },
      { id: 't10', title: '晨跑 5 公里', date: t1, time: '07:30', done: false, p: 'normal' },
      { id: 't11', title: '修好旧键盘', date: y1, time: '', done: true, p: 'normal' },
      { id: 't12', title: '交水电费', date: y1, time: '', done: false, p: 'normal' },
      { id: 't13', title: '整理书架', date: m3, time: '', done: true, p: 'normal' }
    ];

    const trivia = [
      { id: 'n1', date: k, time: '08:12', text: '路上看到一只三花猫蹲在电动车上，怎么叫都不走。', tag: '随手' },
      { id: 'n2', date: k, time: '12:05', text: '午饭和同事去吃了牛肉面，排队二十分钟。' },
      { id: 'n3', date: k, time: '14:32', text: '楼下咖啡店换了新豆子，酸味比之前明显。', tag: '咖啡' },
      { id: 'n4', date: k, time: '16:10', text: '把旧键盘修好了，换了三个轴。', tag: '动手' },
      { id: 'n5', date: y1, time: '09:40', text: '早高峰地铁居然有座。' },
      { id: 'n6', date: y1, time: '21:15', text: '试着用平底锅烤了欧包，底部有点糊。', tag: '做饭' },
      { id: 'n7', date: m3, time: '18:20', text: '把阳台的绿萝分了三盆出来。', tag: '动手' },
      { id: 'n8', date: m9, time: '11:02', text: '第一次一个人去看电影，比想象中自在。' },
      { id: 'n9', date: m30, time: '22:40', text: '凌晨的雨声很大，睡得很好。' },
      { id: 'n10', date: ly, time: '15:00', text: '去年今天在旧书店淘到一本 1987 年的画册。', tag: '书' },
      { id: 'n11', date: ly, time: '19:30', text: '和朋友在河边走了很久，聊到未来。' }
    ];

    const wishes = [
      { id: 'w1', name: '富士 X100VI 相机', price: 12990, want: 5, status: 'done', date: iso(shift(TODAY, -115)), note: '银色机身，配了一条皮背带。' },
      { id: 'w2', name: 'Herman Miller Aeron 椅子', price: 8900, want: 5, status: 'want', note: '每天坐十个小时，值得。' },
      { id: 'w3', name: '去冰岛看一次极光', price: 28000, want: 5, status: 'want', note: '计划 2027 年 2 月。' },
      { id: 'w4', name: '学冲黑白胶片', price: 1200, want: 4, status: 'want', note: '先上完暗房课。' },
      { id: 'w5', name: '一台 3D 打印机', price: 2499, want: 3, status: 'want', note: '' },
      { id: 'w6', name: '换一副降噪耳机', price: 1999, want: 2, status: 'want', note: '' }
    ];

    const achievements = [
      { id: 'a1', title: '完成《年度胶片摄影集》', date: iso(shift(TODAY, -25)), source: '项目', note: '印了 60 页，送了三本给朋友。' },
      { id: 'a2', title: '连续阅读 100 天', date: iso(shift(TODAY, -71)), source: '习惯', note: '从三分钟热度到每天睡前半小时。' },
      { id: 'a3', title: '实现心愿：富士 X100VI', date: iso(shift(TODAY, -115)), source: '心愿', note: '存了七个月。' },
      { id: 'a4', title: '完成书房的第一步：书架装好', date: iso(shift(TODAY, -158)), source: '手动', note: '一个人装到凌晨一点，但很值。' },
      { id: 'a5', title: '跑完第一个 10 公里', date: iso(shift(TODAY, -222)), source: '手动', note: '' },
      { id: 'a6', title: '2025 年度回顾：读完 18 本书', date: iso(shift(TODAY, -298)), source: '手动', note: '' }
    ];

    return {
      v: 1,
      meta: { demo: true, seedDate: k },
      tasks, projects, goals, habits, wishes, trivia, achievements, trash: [],
      ui: {
        route: 'today', cursor: k, taskView: 'day', habitTab: 'build',
        goalId: 'g22', expanded: { g1: false, g2: true, g22: true, g12: true, g13: true, g3: true },
        focusDone: {}, calMonth: null, triviaDay: k
      }
    };
  }

  // ---------- 状态 ----------
  let S;
  try {
    if (location.search.indexOf('reset') >= 0) localStorage.removeItem(KEY);
    const raw = localStorage.getItem(KEY);
    S = raw ? JSON.parse(raw) : null;
    if (S && S.meta && S.meta.demo && S.meta.seedDate !== TODAY_K) S = null;
    if (S && !S.tasks) S = null;
  } catch (e) { S = null; }
  if (!S) S = seed();

  // 旧版本（没有回收站）的数据升级一下，不丢东西
  if (!Array.isArray(S.trash)) S.trash = [];
  if (S.v !== 2) { S.v = 2; }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 无痕模式等场景忽略 */ }
  }

  const BACKUP_FORMAT = 'mercury-plan-backup';
  const BACKUP_VERSION = 1;
  const BACKUP_ARRAYS = ['tasks', 'projects', 'goals', 'habits', 'wishes', 'trivia', 'achievements', 'trash'];

  function createBackup() {
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      app: '水星计划',
      data: clone(S),
      theme: currentThemeId()
    };
  }

  async function exportBackup() {
    try {
      const invoke = window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke;
      if (!invoke) throw new Error('桌面文件功能不可用，请重新构建应用');
      const path = await invoke('export_backup', {
        content: JSON.stringify(createBackup(), null, 2),
        defaultName: `水星计划备份-${TODAY_K}.json`
      });
      if (!path) return;
      openExportSuccess(path);
    } catch (e) {
      toast(`导出失败：${esc(e && e.message ? e.message : '无法写入文件')}`);
    }
  }

  function openExportSuccess(path) {
    openModal(`<div class="modal export-success" style="position:relative">
      <h3>备份导出成功</h3>
      <div class="m-sub">文件已导出到：</div>
      <div class="export-path">${esc(path)}</div>
      <div class="modal-foot">
        <button class="btn btn-amber" data-act="export-success-ok">确定</button>
      </div>
    </div>`);
    document.getElementById('modalLayer').onclick = () => {};
    setTimeout(() => {
      const button = document.querySelector('#modalLayer [data-act="export-success-ok"]');
      if (button) button.focus();
    }, 45);
  }

  function validateBackup(payload) {
    if (!payload || payload.format !== BACKUP_FORMAT || payload.version !== BACKUP_VERSION) {
      throw new Error('不是受支持的水星计划备份文件');
    }
    if (!payload.data || typeof payload.data !== 'object') {
      throw new Error('备份缺少数据主体');
    }
    BACKUP_ARRAYS.forEach(key => {
      if (!Array.isArray(payload.data[key])) throw new Error(`备份数据不完整：缺少 ${key}`);
    });
    if (!payload.data.ui || typeof payload.data.ui !== 'object') {
      throw new Error('备份缺少界面状态');
    }
    if (payload.theme != null && !THEMES.some(t => t.id === payload.theme)) {
      throw new Error('备份中的主题设置无效');
    }
  }

  async function importBackup() {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      const payload = await new Promise((resolve, reject) => {
        input.onchange = () => {
          const file = input.files && input.files[0];
          if (!file) { resolve(null); return; }
          const reader = new FileReader();
          reader.onload = () => {
            try { resolve(JSON.parse(String(reader.result))); }
            catch (error) { reject(error); }
          };
          reader.onerror = () => reject(reader.error || new Error('文件无法读取'));
          reader.readAsText(file, 'utf-8');
        };
        input.click();
      });
      if (!payload) return;
      validateBackup(payload);
      const imported = clone(payload.data);
      askConfirm({
        title: '导入备份并覆盖当前数据？',
        detail: `将替换当前全部数据（${imported.tasks.length} 条待办、${imported.projects.length} 个项目）。此操作不可自动撤销，请确认你已准备好这份备份。`,
        okText: '覆盖并导入',
        onOk: () => {
          S = imported;
          S.meta = { ...(S.meta || {}), demo: false, importedAt: new Date().toISOString() };
          if (!Array.isArray(S.trash)) S.trash = [];
          if (payload.theme) applyTheme(payload.theme);
          save();
          closeModal();
          render(true);
          toast('备份已导入');
        }
      });
    } catch (e) {
      toast(`导入失败：${esc(e && e.message ? e.message : '文件无法读取或格式无效')}`);
    }
  }

  // ---------- 主题 ----------
  const THEME_KEY = 'mercury.theme';
  const THEMES = [
    { id: 'graphite', name: '石墨夜面', hint: '深色 · 琥珀', swatch: '#12171C', accent: '#E9A33C' },
    { id: 'day', name: '白日', hint: '亮色 · 藏青', swatch: '#FFFFFF', accent: '#2B62D6' },
    { id: 'ink', name: '纸间墨香', hint: '宣纸 · 朱砂 · 宋体', swatch: '#FAF5EC', accent: '#B5482B' },
    { id: 'cyber', name: '赛博霓虹', hint: '深夜 · 青与洋红', swatch: '#0B0F1C', accent: '#22E1F5' },
    { id: 'forest', name: '森林静默', hint: '墨绿 · 苔青', swatch: '#111B15', accent: '#8FCB74' }
  ];

  function themeById(id) { return THEMES.find(t => t.id === id) || THEMES[0]; }

  function applyTheme(id, persist) {
    const t = themeById(id);
    const el = document.documentElement;
    if (t.id === 'graphite') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', t.id);
    try { el.style.colorScheme = (t.id === 'day' || t.id === 'ink') ? 'light' : 'dark'; } catch (e) { }
    if (persist !== false) { try { localStorage.setItem(THEME_KEY, t.id); } catch (e) { } }
    return t;
  }

  function currentThemeId() {
    try { return themeById(localStorage.getItem(THEME_KEY)).id; } catch (e) { return 'graphite'; }
  }

  // 删除都走这里：进回收站 → 可撤销 → 设置里还能「恢复删除」
  const TRASH_LIMIT = 40;
  const clone = o => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
  const KIND_LABEL = { task: '待办', trivia: '琐事', goal: '目标', project: '项目', habit: '习惯', wish: '心愿', achievement: '成就' };

  // 记下「这个节点在树里的位置」，形如 [{ title: '根目标' }, { title: '子目标' }, ...]
  // 用标题而不是 id，是因为删除后 id 就已失效，恢复时要靠路径一层层找回来
  function goalPathSnap(id) {
    return goalPath(id).slice(0, -1).map(g => ({ title: g.title }));
  }

  function pushTrash(entry) {
    entry.at = Date.now();
    S.trash.unshift(entry);
    if (S.trash.length > TRASH_LIMIT) S.trash.length = TRASH_LIMIT;
  }

  function undoTrash(id) {
    const entry = S.trash.find(x => x.id === id);
    if (!entry) return false;
    S.trash.splice(S.trash.indexOf(entry), 1);
    const fn = undoMap[entry.kind];
    if (fn) fn(entry);
    save();
    return true;
  }

  // 通用：按原位置插回（没有记录位置时就追加）
  function putBack(arr, item, idx) {
    if (arr.some(x => x.id === item.id)) return;
    if (typeof idx === 'number') arr.splice(Math.min(idx, arr.length), 0, item);
    else arr.push(item);
  }

  // 回收站里每条记录的恢复动作
  const undoMap = {
    task: e => {
      if (e.bulk) {
        // 批量清理：按原来的位置一条条插回去，顺序不变
        e.items.tasks.forEach((t, i) => {
          if (S.tasks.some(x => x.id === t.id)) return;
          const at = typeof e.idxs[i] === 'number' ? Math.min(e.idxs[i], S.tasks.length) : S.tasks.length;
          S.tasks.splice(at, 0, t);
        });
        return;
      }
      const one = e.items.tasks[0];
      if (S.tasks.some(x => x.id === one.id)) return;
      if (typeof e.idx === 'number') S.tasks.splice(Math.min(e.idx, S.tasks.length), 0, one);
      else S.tasks.push(one);
    },
    trivia: e => {
      if (typeof e.idx === 'number') S.trivia.splice(Math.min(e.idx, S.trivia.length), 0, e.items.trivia[0]);
      else S.trivia.push(e.items.trivia[0]);
    },
    wish: e => putBack(S.wishes, e.items.wishes[0], e.idx),
    achievement: e => putBack(S.achievements, e.items.achievements[0], e.idx),
    habit: e => putBack(S.habits, e.items.habits[0], e.idx),
    project: e => {
      putBack(S.projects, e.items.projects[0], e.idx);
      const p = e.items.projects[0];
      (e.items.unlinked || []).forEach(link => {
        const t = S.tasks.find(x => x.title === link.title);
        if (t) t.projectId = p.id;
      });
    },
    goal: e => {
      const list = e.items.goals || [];
      if (!list.length) return;
      const root = list[0];
      const path = e.path || [];
      let parentId = null;
      if (path.length) {
        let cur = S.goals.find(g => !g.parentId && g.title === path[0].title);
        for (let i = 1; i < path.length && cur; i++) {
          cur = S.goals.find(g => g.parentId === cur.id && g.title === path[i].title);
        }
        if (!cur) return; // 上级目标也没了，这条就先留在回收站里
        parentId = cur.id;
      }
      const ids = list.map(g => g.id);
      if (S.goals.some(g => ids.indexOf(g.id) >= 0)) return;
      // 重新映射 id：避免和现有数据撞车，父子关系也要重新指一遍
      const idMap = {};
      list.forEach(g => { idMap[g.id] = uid(g.parentId ? 'g' : 'g'); });
      list.forEach(g => {
        const copy = clone(g);
        copy.id = idMap[g.id];
        copy.parentId = g.parentId && idMap[g.parentId] ? idMap[g.parentId] : (g === root ? parentId : null);
        S.goals.push(copy);
        if (childrenOf(copy.id).length) S.ui.expanded[copy.id] = true;
      });
      (e.items.unlinked || []).forEach(link => {
        const t = S.tasks.find(x => x.title === link.title && !x.goalId);
        if (t) t.goalId = idMap[link.goalId] || null;
      });
      S.ui.goalId = idMap[root.id];
    }
  };

  function delTask(id) {
    const t = S.tasks.find(x => x.id === id);
    if (!t) return;
    const entry = { id: uid('r'), kind: 'task', title: t.title, count: 1, meta: t.date, idx: S.tasks.indexOf(t), items: { tasks: [t] } };
    S.tasks.splice(entry.idx, 1);
    pushTrash(entry);
    save(); render(false);
    toast(`已删除待办 <b>${esc(t.title)}</b>`, '撤销', () => { undoTrash(entry.id); render(false); toast('已撤销删除'); });
  }

  function delTrivia(id) {
    const n = S.trivia.find(x => x.id === id);
    if (!n) return;
    const entry = { id: uid('r'), kind: 'trivia', title: n.text, count: 1, meta: n.date, idx: S.trivia.indexOf(n), items: { trivia: [n] } };
    S.trivia.splice(entry.idx, 1);
    pushTrash(entry);
    save(); render(false);
    toast('已删除 1 条琐事', '撤销', () => { undoTrash(entry.id); render(false); toast('已撤销删除'); });
  }

  function delWish(id) {
    const w = S.wishes.find(x => x.id === id);
    if (!w) return;
    const entry = { id: uid('r'), kind: 'wish', title: w.name, count: 1, idx: S.wishes.indexOf(w), items: { wishes: [w] } };
    S.wishes.splice(entry.idx, 1);
    pushTrash(entry);
    save(); render(false);
    toast(`已删除心愿 <b>${esc(w.name)}</b>`, '撤销', () => { undoTrash(entry.id); render(false); toast('已撤销删除'); });
  }

  function delAch(id) {
    const a = S.achievements.find(x => x.id === id);
    if (!a) return;
    const entry = { id: uid('r'), kind: 'achievement', title: a.title, count: 1, meta: a.date, idx: S.achievements.indexOf(a), items: { achievements: [a] } };
    S.achievements.splice(entry.idx, 1);
    pushTrash(entry);
    save(); render(false);
    toast('已删除成就记录', '撤销', () => { undoTrash(entry.id); render(false); toast('已撤销'); });
  }

  // 目标：连同所有子孙一起删；由它排出来的待办保留，只解除关联
  function delGoal(id) {
    const g = goalById(id);
    if (!g) return;
    const subtree = [];
    (function walk(x) { subtree.push(x); childrenOf(x.id).forEach(walk); })(g);
    const ids = subtree.map(x => x.id);
    const linked = S.tasks.filter(t => t.goalId && ids.indexOf(t.goalId) >= 0);
    const path = goalPathSnap(id);
    const anchor = id;
    S.goals = S.goals.filter(x => ids.indexOf(x.id) < 0);
    linked.forEach(t => { delete t.goalId; });
    ids.forEach(x => { delete S.ui.expanded[x]; });
    S.ui.goalId = g.parentId || (childrenOf(null)[0] || {}).id || null;

    const entry = {
      id: uid('r'), kind: 'goal', title: g.title, count: subtree.length, path,
      items: {
        goals: subtree,
        unlinked: linked.map(t => ({ title: t.title, goalId: t.goalId, date: t.date }))
      }
    };
    pushTrash(entry);
    save(); render(false);
    toast(`已删除目标 <b>${esc(g.title)}</b>${subtree.length > 1 ? `，含 ${subtree.length - 1} 个子项` : ''}`,
      '撤销', () => { undoTrash(entry.id); render(false); toast('已撤销删除'); });
  }

  // 删掉一个子项时，先记下它相对父项的路径，撤销时才能挂回原处
  function delGoalChild(pid, childId) {
    if (!goalById(childId)) return;
    delGoal(childId);
    const entry = S.trash[0];
    const parent = goalById(pid);
    if (entry && parent) entry.path = goalPath(pid).map(x => ({ title: x.title }));
  }

  function delProject(id) {
    const p = projById(id);
    if (!p) return;
    const linked = S.tasks.filter(t => t.projectId === id);
    const entry = { id: uid('r'), kind: 'project', title: p.name, count: 1, idx: S.projects.indexOf(p), items: { projects: [p], unlinked: linked.map(t => ({ title: t.title, note: t })) } };
    S.projects.splice(entry.idx, 1);
    linked.forEach(t => { delete t.projectId; });
    pushTrash(entry);
    save(); render(false);
    toast(`已删除项目 <b>${esc(p.name)}</b>`, '撤销', () => { undoTrash(entry.id); render(false); toast('已撤销'); });
  }

  function delHabit(id) {
    const hb = habitById(id);
    if (!hb) return;
    const entry = { id: uid('r'), kind: 'habit', title: hb.name, count: 1, idx: S.habits.indexOf(hb), items: { habits: [hb] } };
    S.habits.splice(entry.idx, 1);
    pushTrash(entry);
    save(); render(false);
    toast(`已删除习惯 <b>${esc(hb.name)}</b>`, '撤销', () => { undoTrash(entry.id); render(false); toast('已撤销'); });
  }

  // ---------- 派生数据 ----------
  const projById = id => S.projects.find(p => p.id === id);
  const goalById = id => S.goals.find(g => g.id === id);
  const habitById = id => S.habits.find(h => h.id === id);

  function tasksOn(k) {
    return S.tasks.filter(t => t.date === k).sort((a, b) => {
      if (!a.time && b.time) return -1;
      if (a.time && !b.time) return 1;
      return (a.time || '').localeCompare(b.time || '');
    });
  }
  function overdueTasks() {
    return S.tasks.filter(t => !t.done && t.date < TODAY_K)
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  function habitCount(h, k) { return h.records[k] || 0; }
  function habitDone(h, k) { return habitCount(h, k) >= (h.target || 1); }
  function habitStreak(h) {
    let d = new Date(TODAY);
    if (!habitDone(h, TODAY_K)) d = shift(d, -1);
    let n = 0, guard = 0;
    while (habitDone(h, iso(d)) && guard < 800) { n++; d = shift(d, -1); guard++; }
    return n;
  }
  function quitStreak(h) { return Math.max(0, diffDays(TODAY_K, h.lastRelapse)); }
  function longestStreak(h) {
    const days = Object.keys(h.records).filter(k => habitDone(h, k)).sort();
    let best = 0, cur = 0, prev = null;
    days.forEach(k => {
      cur = (prev && diffDays(k, prev) === 1) ? cur + 1 : 1;
      if (cur > best) best = cur;
      prev = k;
    });
    return best;
  }

  function childrenOf(id) { return S.goals.filter(g => g.parentId === id); }
  function goalProgress(g) {
    const kids = childrenOf(g.id);
    if (!kids.length) {
      if (g.status === 'done') return 100;
      if (g.status === 'doing') return g.progress != null ? g.progress : 50;
      return 0;
    }
    return Math.round(sum(kids.map(goalProgress)) / kids.length);
  }
  function goalLeaves(id, out) {
    out = out || [];
    const kids = childrenOf(id);
    if (!kids.length) { out.push(goalById(id)); return out; }
    kids.forEach(k => goalLeaves(k.id, out));
    return out;
  }
  function goalPath(id) {
    const path = [];
    let g = goalById(id), guard = 0;
    while (g && guard < 10) { path.unshift(g); g = g.parentId ? goalById(g.parentId) : null; guard++; }
    return path;
  }

  function statsOn(k) {
    const ts = tasksOn(k);
    const builds = S.habits.filter(h => h.kind === 'build');
    return {
      taskTotal: ts.length,
      taskDone: ts.filter(t => t.done).length,
      habitTotal: builds.length,
      habitDone: builds.filter(h => habitDone(h, k)).length,
      notes: S.trivia.filter(t => t.date === k).length
    };
  }
  function dayPct(k) {
    const st = statsOn(k);
    const total = st.taskTotal + st.habitTotal;
    if (!total) return 0;
    return Math.round((st.taskDone + st.habitDone) / total * 100);
  }
  function focusItems() {
    const out = [];
    S.projects.filter(p => p.status === 'ing' && p.next).slice(0, 2).forEach(p => {
      out.push({ kind: 'project', id: p.id, title: p.next, meta: p.name + ' · 下一步', color: p.color });
    });
    const leaf = S.goals.find(g => g.type === 'action' && g.status === 'doing' && !childrenOf(g.id).length && g.id !== 'g223');
    if (leaf) {
      const root = goalPath(leaf.id)[0];
      out.push({ kind: 'goal', id: leaf.id, title: leaf.title, meta: root.title + ' · 行动', color: '#A08BE0' });
    }
    return out.slice(0, 3);
  }
  function heatCells(h) {
    const dow = (TODAY.getDay() + 6) % 7;
    const start = shift(TODAY, -(19 * 7 + dow));
    const cells = [];
    for (let i = 0; i < 140; i++) {
      const d = shift(start, i);
      const c = h.records[iso(d)] || 0;
      cells.push({ k: iso(d), c, future: d > TODAY });
    }
    return cells;
  }
  function weekCells(h) {
    const cells = [];
    for (let i = 6; i >= 0; i--) {
      const d = shift(TODAY, -i);
      cells.push({ k: iso(d), d, count: habitCount(h, iso(d)), done: habitDone(h, iso(d)), future: false });
    }
    return cells;
  }
  function lastYearOn(k) {
    const d = parse(k);
    const ly = iso(new Date(d.getFullYear() - 1, d.getMonth(), d.getDate()));
    const items = [];
    S.trivia.filter(t => t.date === ly).forEach(t => items.push({ year: ly.slice(0, 4), kind: '琐事', text: t.text }));
    S.achievements.filter(a => a.date === ly).forEach(a => items.push({ year: ly.slice(0, 4), kind: '成就', text: a.title }));
    return items;
  }

  // ---------- 渲染骨架 ----------
  const NAV = [
    { group: '每日', items: [{ id: 'today', label: '今日总览', icon: 'sun' }] },
    { group: '规划', items: [{ id: 'tasks', label: '日程待办', icon: 'cal' }, { id: 'goals', label: '目标拆解', icon: 'target' }, { id: 'projects', label: '我的项目', icon: 'layers' }] },
    { group: '记录', items: [{ id: 'habits', label: '习惯', icon: 'repeat' }, { id: 'wishes', label: '心愿清单', icon: 'star' }, { id: 'trivia', label: '琐事记录', icon: 'pen' }, { id: 'achievements', label: '成就', icon: 'trophy' }] }
  ];

  function navExtra(id) {
    const k = S.ui.cursor;
    if (id === 'today' || id === 'tasks') {
      const st = statsOn(k);
      const left = st.taskTotal - st.taskDone;
      return left > 0 ? String(left) : '';
    }
    if (id === 'habits') {
      const builds = S.habits.filter(h => h.kind === 'build');
      const left = builds.filter(h => !habitDone(h, TODAY_K)).length;
      return left > 0 ? String(left) : '';
    }
    if (id === 'wishes') {
      const n = S.wishes.filter(w => w.status === 'want').length;
      return n ? String(n) : '';
    }
    return '';
  }

  function sidebarHTML() {
    let h = `<div class="brand">
      <div class="brand-mark"></div>
      <div><div class="brand-name">水星计划</div><div class="brand-sub">MERCURY</div></div>
    </div><nav class="nav">`;
    NAV.forEach(g => {
      h += `<div class="nav-label">${g.group}</div>`;
      g.items.forEach(it => {
        const extra = navExtra(it.id);
        h += `<div class="nav-item ${S.ui.route === it.id ? 'active' : ''}" data-act="nav" data-route="${it.id}">
          ${icon(it.icon)}<span>${it.label}</span>${extra ? `<span class="nav-extra">${extra}</span>` : ''}
        </div>`;
      });
    });
    h += `</nav><div class="side-foot"><span class="save-state"><i class="live-dot"></i>本地存储</span>
      <button class="icon-btn" data-act="settings" title="设置">${icon('settings', 16)}</button></div>`;
    return h;
  }

  function topbarHTML() {
    const isToday = S.ui.cursor === TODAY_K;
    return `<div class="datenav">
      <button class="icon-btn" data-act="prev-day" title="前一天">${icon('chevL', 17)}</button>
      <div class="d-label">${fmtMD(S.ui.cursor)}<span class="dow">周${DOW[parse(S.ui.cursor).getDay()]}</span></div>
      <button class="icon-btn" data-act="next-day" title="后一天">${icon('chevR', 17)}</button>
      ${isToday ? '' : `<button class="pill-today" data-act="goto-today">回到今天</button>`}
    </div>
    <div class="top-right">
      <button class="search-btn" data-act="palette">${icon('search', 15)} 搜索或跳转 <span class="kbd">Ctrl K</span></button>
      <button class="btn btn-amber" data-act="capture">${icon('plus', 15)} 记录</button>
    </div>`;
  }

  function statusHTML() {
    const st = statsOn(S.ui.cursor);
    const quit = S.habits.filter(h => h.kind === 'quit').sort((a, b) => quitStreak(b) - quitStreak(a))[0];
    return `<div class="stat"><b>${st.taskDone}/${st.taskTotal}</b> 待办</div>
      <span class="dot-sep"></span>
      <div class="stat"><b>${st.habitDone}/${st.habitTotal}</b> 习惯</div>
      <span class="dot-sep"></span>
      <div class="stat">戒除连续 <b>${quit ? quitStreak(quit) : 0}</b> 天</div>
      <span class="dot-sep"></span>
      <div class="stat"><b>${st.notes}</b> 条琐事</div>
      <div class="sb-right">
        <span class="sb-local"><i></i>数据保存在本机</span>
        <button class="btn sm" data-act="summary">今日小结</button>
      </div>`;
  }

  function render(resetScroll) {
    document.getElementById('sidebar').innerHTML = sidebarHTML();
    document.getElementById('topbar').innerHTML = topbarHTML();
    const view = document.getElementById('view');
    const top = resetScroll ? 0 : view.scrollTop;
    view.innerHTML = renderRoute();
    view.scrollTop = top;
    document.getElementById('statusbar').innerHTML = statusHTML();
  }

  function go(route) {
    S.ui.route = route;
    save();
    render(true);
  }

  // ---------- 通用片段 ----------
  const STATUS = {
    done: { label: '已完成', color: '#6FBF9B' },
    doing: { label: '进行中', color: '#E9A33C' },
    todo: { label: '未开始', color: '#5F6B77' },
    pause: { label: '搁置', color: '#C9B183' }
  };
  const PROJECT_STATUS = { ing: '进行中', pause: '搁置', done: '已完成' };

  function ringLabel(pct, size) {
    const r = (size - 7) / 2, c = 2 * Math.PI * r;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="4"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#E9A33C" stroke-width="4" stroke-linecap="round"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct / 100)).toFixed(1)}"
        transform="rotate(-90 ${size / 2} ${size / 2})"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" fill="#E9EDF1"
        font-size="${Math.round(size * 0.2)}" font-weight="600" font-family="Segoe UI, sans-serif">${pct}%</text>
    </svg>`;
  }

  function stars(n) {
    let s = '';
    for (let i = 1; i <= 5; i++) s += `<span class="${i <= n ? 'on' : 'off'}">★</span>`;
    return `<span class="stars">${s}</span>`;
  }

  function ringSVG(pct, size, stroke) {
    const r = (size - 7) / 2, c = 2 * Math.PI * r;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="${stroke || 3.5}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#E9A33C" stroke-width="${stroke || 3.5}" stroke-linecap="round"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct / 100)).toFixed(1)}"
        transform="rotate(-90 ${size / 2} ${size / 2})" style="transition:stroke-dashoffset .35s ease"/>
    </svg>`;
  }

  function renderRoute() {
    switch (S.ui.route) {
      case 'tasks': return viewTasks();
      case 'goals': return viewGoals();
      case 'projects': return viewProjects();
      case 'habits': return viewHabits();
      case 'wishes': return viewWishes();
      case 'trivia': return viewTrivia();
      case 'achievements': return viewAchievements();
      default: return viewToday();
    }
  }

  // ---------- 今日总览 ----------
  function viewToday() {
    const k = S.ui.cursor;
    const isT = k === TODAY_K;
    const ts = tasksOn(k);
    const st = statsOn(k);
    const pct = dayPct(k);
    const builds = S.habits.filter(h => h.kind === 'build');
    const quits = S.habits.filter(h => h.kind === 'quit').sort((a, b) => quitStreak(b) - quitStreak(a));
    const notes = S.trivia.filter(t => t.date === k).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const focus = focusItems();
    const mem = lastYearOn(k);
    const hr = new Date().getHours();
    const greet = hr < 5 ? '夜深了' : hr < 9 ? '早上好' : hr < 12 ? '上午好' : hr < 14 ? '中午好' : hr < 18 ? '下午好' : '晚上好';

    let h = `<div class="today-hero">
      <div>
        <div class="greeting">${isT ? greet : fmtMD(k) + ' 那天'}</div>
        <div class="greeting-sub">
          <span>${fmtMDW(k)}</span><span class="dot-sep"></span>
          <span>待办 ${st.taskDone}/${st.taskTotal}</span><span class="dot-sep"></span>
          <span>习惯 ${st.habitDone}/${st.habitTotal}</span>
        </div>
      </div>
      <div class="ring-wrap">
        <div class="ring-txt"><b>${pct}%</b>完成度</div>
        ${ringSVG(pct, 52)}
      </div>
    </div>`;

    h += `<div class="today-grid"><div class="col">`;

    // 日程
    h += `<section class="card">
      <div class="card-head">
        <span class="card-title">${isT ? '今日日程' : '当日日程'}</span>
        <span class="card-count"><b>${st.taskDone}</b>/${st.taskTotal}</span>
      </div>
      <div class="task-list">`;
    if (!ts.length) {
      h += `<div class="card-empty">这一天还没有安排。<br>在下面写一件今天想做的事。</div>`;
    } else {
      ts.forEach(t => {
        h += `<div class="task ${t.done ? 'done' : ''}" data-act="toggle-task" data-id="${t.id}">
          <span class="check">${icon('check', 11)}</span>
          <span class="time">${timeLabel(t.time)}</span>
          <span class="t-title">${esc(t.title)}</span>
          <button class="row-x" data-act="task-del" data-id="${t.id}" title="删除这条待办">${icon('trash', 26)}</button>
        </div>`;
      });
    }
    h += `</div>
      <div class="addline">
        <span class="plus">＋</span>
        <input id="quickTask" placeholder="添加任务，回车保存" autocomplete="off">
      </div>
    </section>`;

    // 琐事
    h += `<section class="card">
      <div class="card-head">
        <span class="card-title">${isT ? '今日琐事' : '当日琐事'}</span>
        <span class="card-count">${notes.length} 条</span>
      </div>
      <div class="note-input">
        <span class="plus">＋</span>
        <input id="quickNote" placeholder="随手记一件小事" autocomplete="off">
        <button class="send" data-act="save-note" title="保存">${icon('arrowUp', 15)}</button>
      </div>
      <div class="notes">`;
    if (!notes.length) {
      h += `<div class="card-empty">今天还没有记录。<br>一句话就够，不用有标题。</div>`;
    } else {
      notes.slice(-5).forEach(n => {
        h += `<div class="note">
          <span class="n-time">${n.time || ''}</span>
          <span class="n-text">${esc(n.text)}${n.tag ? `<span class="tag">#${esc(n.tag)}</span>` : ''}</span>
          <button class="row-x" data-act="note-del" data-id="${n.id}" title="删除这条琐事">${icon('trash', 26)}</button>
        </div>`;
      });
    }
    if (notes.length > 5) {
      h += `<div class="note-more"><button class="link-btn" data-act="goto-notes">还有 ${notes.length - 5} 条，去琐事记录查看 →</button></div>`;
    }
    h += `</div></section></div><div class="col">`;

    // 焦点
    h += `<section class="card">
      <div class="card-head">
        <span class="card-title">今日焦点</span>
        <span class="card-count">来自项目和目标</span>
      </div>`;
    if (!focus.length) {
      h += `<div class="card-empty">给进行中的项目写一个「下一步」。</div>`;
    } else {
      focus.forEach(f => {
        const key = `${TODAY_K}:${f.kind}:${f.id}`;
        const on = !!S.ui.focusDone[key];
        h += `<div class="focus-item ${on ? 'done' : ''}" data-act="open-focus" data-kind="${f.kind}" data-id="${f.id}">
          <span class="focus-check ${on ? 'on' : ''}" data-act="focus-done" data-key="${key}">${icon('check', 11)}</span>
          <div style="min-width:0">
            <div class="fi-title">${esc(f.title)}</div>
            <div class="fi-meta"><i class="pdot" style="background:${f.color}"></i>${esc(f.meta)}</div>
          </div>
        </div>`;
      });
    }
    h += `</section>`;

    // 习惯
    h += `<section class="card">
      <div class="card-head">
        <span class="card-title">今日习惯</span>
        <span class="card-count"><b>${st.habitDone}</b>/${st.habitTotal}</span>
      </div>
      <div class="habit-grid">`;
    builds.forEach(hb => { h += habitChip(hb, k); });
    h += `</div></section></div><div class="col">`;

    // 戒除
    h += `<section class="card">
      <div class="card-head">
        <span class="card-title">戒除中</span>
        <span class="card-count">${quits.length} 项</span>
      </div>`;
    quits.slice(0, 2).forEach(q => { h += quitMini(q); });
    h += `</section>`;

    // 那年今日
    if (mem.length) {
      h += `<section class="card">
        <div class="card-head"><span class="card-title">那年今日</span><span class="card-count">${mem.length} 条</span></div>`;
      mem.slice(0, 3).forEach(m => {
        h += `<div class="mem-item">
          <span class="mem-year">${m.year}</span>
          <span class="mem-text">${esc(m.text)}<span class="mem-kind">${m.kind}</span></span>
        </div>`;
      });
      h += `</section>`;
    }

    h += `</div></div>`;
    return h;
  }

  function habitChip(hb, k) {
    const c = habitCount(hb, k), done = habitDone(hb, k);
    return `<button class="habit-chip ${done ? 'on' : ''}" data-act="habit-chip" data-id="${hb.id}" data-date="${k}"
      title="${hb.target > 1 ? '点击 +1，右键 -1' : '点击打卡'}">
      <span class="hstate">${icon('check', 10)}</span>
      <span class="hname">${esc(hb.name)}</span>
      ${hb.target > 1 ? `<span class="hcount">${c}/${hb.target}</span>` : ''}
    </button>`;
  }

  function quitMini(q) {
    return `<div class="quit-item">
      <div class="quit-top"><span class="qname">${esc(q.name)}</span><span class="qbadge">戒除中</span></div>
      <div class="quit-days"><b>${quitStreak(q)}</b><span>天</span></div>
      <div class="quit-meta">最长 ${q.best} 天 · 累计 ${q.total} 天</div>
      <button class="btn btn-danger sm" data-act="relapse" data-id="${q.id}">我破戒了</button>
    </div>`;
  }

  // ---------- 日程待办 ----------
  function viewTasks() {
    const k = S.ui.cursor;
    const ts = tasksOn(k);
    const st = statsOn(k);
    const od = overdueTasks();
    const doneAll = S.tasks.filter(t => t.done);
    const isDay = S.ui.taskView !== 'list';

    let h = `<div class="page-head">
      <div>
        <h1 class="page-title">日程待办</h1>
        <div class="page-sub"><span>${fmtMDW(k)}</span><span class="dot-sep"></span><span>${st.taskDone}/${st.taskTotal} 已完成</span></div>
      </div>
      <div class="page-actions">
        ${doneAll.length ? `<button class="btn btn-ghost" data-act="clean-done">${icon('trash', 14)} 清理已完成 ${doneAll.length}</button>` : ''}
        <div class="seg">
          <button class="${isDay ? 'on' : ''}" data-act="task-view" data-view="day">日视图</button>
          <button class="${isDay ? '' : 'on'}" data-act="task-view" data-view="list">清单</button>
        </div>
      </div>
    </div>`;

    h += `<div class="addbar">
      <span class="plus">${icon('plus', 16)}</span>
      <input id="taskAdd" placeholder="添加任务：明天 15:00 交周报 !高 @水星计划" autocomplete="off">
      <span class="hint">Enter 保存 · ! 高优先级 · @ 项目</span>
    </div>`;

    if (od.length) {
      h += `<div class="banner">${icon('flame', 15)} 有 ${od.length} 项逾期未完成
        <button class="btn sm" data-act="postpone-all">顺延到今天</button></div>`;
    }

    if (isDay) {
      const anytime = ts.filter(t => !t.time);
      const timed = ts.filter(t => t.time);
      if (!ts.length) {
        h += `<div class="card card-empty" style="padding:46px">这一天还是空的。<br>上面写一行，回车就有了。</div>`;
      } else {
        h += `<section class="card" style="padding:14px 16px">`;
        if (anytime.length) {
          h += `<div class="task-group"><div class="task-group-title">全天<span>${anytime.length}</span></div>`;
          anytime.forEach(t => { h += taskListRow(t, false, true); });
          h += `</div>`;
        }
        timed.forEach(t => {
          h += `<div class="timeline-row">
            <div class="tl-hour">${t.time}</div>
            <div class="tl-body">${taskListRow(t, false, true)}</div>
          </div>`;
        });
        h += `</section>`;
      }
    } else {
      const groups = [
        { label: '已逾期', showDate: true, items: S.tasks.filter(t => !t.done && t.date < TODAY_K).sort((a, b) => a.date.localeCompare(b.date)) },
        { label: '今天', showDate: false, items: S.tasks.filter(t => !t.done && t.date === TODAY_K) },
        { label: '明天', showDate: false, items: S.tasks.filter(t => !t.done && t.date === iso(shift(TODAY, 1))) },
        { label: '以后', showDate: true, items: S.tasks.filter(t => !t.done && t.date > iso(shift(TODAY, 1))) },
        { label: '已完成', showDate: true, items: S.tasks.filter(t => t.done).sort((a, b) => b.date.localeCompare(a.date)) }
      ];
      h += `<section class="card" style="padding:8px 10px">`;
      groups.forEach(g => {
        if (!g.items.length) return;
        h += `<div class="task-group"><div class="task-group-title">${g.label}<span>${g.items.length}</span></div>`;
        g.items.forEach(t => { h += taskListRow(t, g.showDate, false); });
        h += `</div>`;
      });
      if (!S.tasks.length) h += `<div class="card-empty" style="padding:38px">还没有任何待办。</div>`;
      h += `</section>`;
    }
    return h;
  }

  function taskListRow(t, showDate, hideTime) {
    const p = t.projectId ? projById(t.projectId) : null;
    const g = t.goalId ? goalById(t.goalId) : null;
    const when = [showDate ? fmtShort(t.date) : '', (!hideTime && t.time) ? t.time : ''].filter(Boolean).join(' · ');
    return `<div class="task-row ${t.done ? 'done' : ''}" data-act="toggle-task" data-id="${t.id}">
      <span class="check ${t.done ? 'on' : ''}" style="${t.done ? 'background:var(--amber);border-color:var(--amber)' : ''}">${icon('check', 11)}</span>
      <span class="t-title">${esc(t.title)}</span>
      <span class="t-meta">
        ${t.date < TODAY_K && !t.done ? '<span class="chip" style="color:#E8A59A;border-color:rgba(224,124,110,.2)">逾期</span>' : ''}
        ${p ? `<span class="chip"><i class="pdot" style="background:${p.color}"></i>${esc(p.name)}</span>` : ''}
        ${g ? `<span class="chip">${esc(g.title)}</span>` : ''}
        ${when ? `<span class="mono nowrap">${when}</span>` : ''}
      </span>
      <button class="row-x" data-act="task-del" data-id="${t.id}" title="删除这条待办">${icon('trash', 26)}</button>
    </div>`;
  }

  // ---------- 目标拆解 ----------
  function viewGoals() {
    const root = goalById(S.ui.goalId) || S.goals.find(g => !g.parentId);
    const path = root ? goalPath(root.id) : [];
    const pct = root ? goalProgress(root) : 0;
    const kids = root ? childrenOf(root.id) : [];
    const leaves = root ? goalLeaves(root.id) : [];
    const doneLeaves = leaves.filter(x => x.status === 'done').length;

    let h = `<div class="page-head">
      <div>
        <h1 class="page-title">目标拆解</h1>
        <div class="page-sub"><span>${S.goals.filter(g => !g.parentId).length} 个目标</span><span class="dot-sep"></span><span>拆到能直接做的下一步</span></div>
      </div>
      <div class="page-actions"><button class="btn" data-act="goal-new">${icon('plus', 14)} 新目标</button></div>
    </div>`;

    h += `<div class="goals-layout"><section class="card" style="padding:10px">
      <div class="tree">`;
    S.goals.filter(g => !g.parentId).forEach(g => { h += treeRows(g, 0); });
    h += `</div></section>`;

    h += `<section class="card detail">`;
    if (!root) {
      h += `<div class="card-empty">还没有目标。</div>`;
    } else {
      h += `<div class="crumb">${path.map((p, i) => (i ? '<span>/</span>' : '') + `<span>${esc(p.title)}</span>`).join('')}</div>
        <h2>${esc(root.title)}</h2>
        <div class="detail-meta">
          <span class="chip">${root.type === 'goal' ? '目标' : root.type === 'sub' ? '子目标' : '行动'}</span>
          <span class="chip" style="color:${STATUS[root.status].color}">${STATUS[root.status].label}</span>
          ${root.due ? `<span class="chip">截至 ${fmtMD(root.due)}</span>` : ''}
        </div>
        <div class="flex gap8" style="align-items:center;gap:14px;margin-bottom:14px">
          ${ringLabel(pct, 64)}
          <div>
            <div style="font-size:13px;color:var(--text-2)">${leaves.length} 个行动 · 已完成 ${doneLeaves} 个</div>
            <div class="muted" style="font-size:10.5px;margin-top:3px">由子项完成度自动汇总</div>
          </div>
        </div>`;
      if (root.note) h += `<div class="muted" style="font-size:12px;line-height:1.7;margin-bottom:12px">${esc(root.note)}</div>`;
      h += `<div class="kv"><span class="k">直接子项</span><span class="v">${kids.length}</span></div>
        <div class="kv"><span class="k">所属目标</span><span class="v">${path[0] ? esc(path[0].title) : '—'}</span></div>
        <div class="kv"><span class="k">关联项目</span><span class="v">${path.some(x => x.id === 'g2') ? '水星计划 · Windows 版' : '—'}</span></div>`;

      h += `<div class="mt14" style="display:flex;gap:8px">
        <button class="btn btn-amber" data-act="goal-schedule" data-id="${root.id}">${icon('cal', 14)} 排进今天</button>
        <button class="btn" data-act="goal-done" data-id="${root.id}">${root.status === 'done' ? '重新打开' : '标记完成'}</button>
        <button class="btn btn-danger" data-act="goal-del" data-id="${root.id}">${icon('trash', 14)} 删除</button>
      </div>`;

      if (kids.length) {
        h += `<div class="drawer-section mt14" style="margin-bottom:0"><h4>子项</h4><div class="sub-tree">`;
        kids.forEach(c => {
          h += `<div class="sub-row" data-act="goal-select" data-id="${c.id}">
            <span class="tree-dot" style="background:${STATUS[c.status].color}"></span>
            <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.title)}</span>
            <span class="tree-pct">${goalProgress(c)}%</span>
            <button class="btn sm" data-act="goal-schedule" data-id="${c.id}">排期</button>
            <button class="row-x" data-act="goal-del" data-id="${c.id}" data-parent="${root.id}" title="删除这个子项">${icon('trash', 26)}</button>
          </div>`;
        });
        h += `</div></div>`;
      }
    }
    h += `</section></div>`;
    return h;
  }

  function treeRows(g, depth) {
    const kids = childrenOf(g.id);
    const open = !!S.ui.expanded[g.id];
    const pct = goalProgress(g);
    let h = `<div class="tree-row ${S.ui.goalId === g.id ? 'sel' : ''}" data-act="goal-select" data-id="${g.id}" style="padding-left:${9 + depth * 17}px">
      <span class="tree-caret ${open ? 'open' : ''}" data-act="goal-toggle" data-id="${g.id}">${kids.length ? icon('chevR', 12) : ''}</span>
      <span class="tree-dot" style="background:${STATUS[g.status].color}"></span>
      <span class="tree-name">${esc(g.title)}</span>
      <span class="tree-progress"><span class="mini-bar"><i style="width:${pct}%"></i></span><span class="tree-pct">${pct}%</span></span>
      <button class="row-x" data-act="goal-del" data-id="${g.id}" data-parent="${g.parentId || ''}" title="删除${g.parentId ? '这个子项' : '这个目标'}">${icon('trash', 12)}</button>
    </div>`;
    if (open && kids.length) kids.forEach(k => { h += treeRows(k, depth + 1); });
    return h;
  }

  // ---------- 项目 ----------
  function viewProjects() {
    const list = S.projects.slice().sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0));
    const active = S.projects.filter(p => p.status === 'ing').length;
    let h = `<div class="page-head">
      <div>
        <h1 class="page-title">我的项目</h1>
        <div class="page-sub"><span>${active} 个进行中</span><span class="dot-sep"></span><span>每个项目都要有一个「下一步」</span></div>
      </div>
      <div class="page-actions"><button class="btn" data-act="project-new">${icon('plus', 14)} 新项目</button></div>
    </div>`;

    h += `<div class="grid-cards">`;
    list.forEach(p => {
      const stCls = p.status === 'ing' ? 'ing' : p.status === 'pause' ? 'pause' : 'done';
      h += `<article class="pcard" data-act="open-project" data-id="${p.id}">
        <button class="card-x" data-act="project-del" data-id="${p.id}" title="删除这个项目">${icon('trash', 26)}</button>
        <div class="pcard-top">
          <span class="pdot-lg" style="background:${p.color};color:${p.color}"></span>
          <span class="status ${stCls}">${PROJECT_STATUS[p.status]}</span>
        </div>
        <h3>${esc(p.name)}</h3>
        <div class="pnext">${p.next ? `<span>下一步</span><b>${esc(p.next)}</b>` : '<span>—</span>'}</div>
        <div class="pbar"><i style="width:${p.progress}%;background:${p.color}"></i></div>
        <div class="pfoot"><span><b>${p.progress}%</b></span><span>${p.due ? '截止 ' + fmtShort(p.due) : '无截止'}</span></div>
      </article>`;
    });
    h += `</div>`;
    return h;
  }

  // ---------- 习惯 ----------
  function viewHabits() {
    const tab = S.ui.habitTab;
    const builds = S.habits.filter(h => h.kind === 'build');
    const quits = S.habits.filter(h => h.kind === 'quit');
    const doneToday = builds.filter(h => habitDone(h, TODAY_K)).length;

    let h = `<div class="page-head">
      <div>
        <h1 class="page-title">习惯</h1>
        <div class="page-sub"><span>今天 ${doneToday}/${builds.length} 项已打卡</span><span class="dot-sep"></span><span>${quits.length} 项正在戒除</span></div>
      </div>
      <div class="page-actions"><button class="btn btn-amber" data-act="habit-new">${icon('plus', 14)} 新习惯</button></div>
    </div>`;

    h += `<div class="habit-page-head">
      <div class="seg">
        <button class="${tab === 'build' ? 'on' : ''}" data-act="habit-tab" data-tab="build">养成 ${builds.length}</button>
        <button class="${tab !== 'build' ? 'on' : ''}" data-act="habit-tab" data-tab="quit">戒除 ${quits.length}</button>
      </div>
      <span class="muted" style="font-size:11px">点格子可以补卡 · 点名称看统计</span>
    </div>`;

    if (tab === 'build') {
      h += `<div class="habit-rows">`;
      builds.forEach(hb => {
        const done = habitDone(hb, TODAY_K);
        const c = habitCount(hb, TODAY_K);
        const streak = habitStreak(hb);
        h += `<div class="hrow">
          <div class="hrow-name" data-act="open-habit" data-id="${hb.id}">
            <span class="h-ico">${icon(hb.icon, 14)}</span>
            <div style="min-width:0"><h3>${esc(hb.name)}</h3><p>${done ? '今天已完成' : c > 0 ? `今天 ${c}/${hb.target}` : '今天还没开始'}</p></div>
          </div>
          <div class="week">`;
        weekCells(hb).forEach(cell => {
          const full = cell.done, part = !full && cell.count > 0;
          h += `<span class="wcell ${full ? 'on' : ''} ${part ? 'part' : ''} ${cell.k === TODAY_K ? 'today' : ''}"
            data-act="habit-cell" data-id="${hb.id}" data-date="${cell.k}" title="${fmtMDW(cell.k)} · ${cell.count}/${hb.target}">
            ${icon('check', 9)}</span>`;
        });
        h += `</div>
          <div class="streak-cell"><b>${streak}</b>天连续</div>
          <div class="hrow-action">`;
        if (hb.target > 1) {
          h += `<div class="counter">
            <button class="step-btn" data-act="habit-dec" data-id="${hb.id}" data-date="${TODAY_K}">−</button>
            <b>${c}</b><span>/${hb.target}</span>
            <button class="step-btn" data-act="habit-inc" data-id="${hb.id}" data-date="${TODAY_K}">＋</button>
          </div>`;
        } else {
          h += `<button class="btn ${done ? '' : 'btn-amber'}" data-act="habit-toggle" data-id="${hb.id}">${done ? '已完成' : '打卡'}</button>`;
        }
        h += `</div>
          <div class="hrow-x"><button class="row-x" data-act="habit-del" data-id="${hb.id}" title="删除这个习惯">${icon('trash', 26)}</button></div>
        </div>`;
      });
      h += `</div>`;
      if (!builds.length) h += `<div class="card card-empty" style="padding:40px">还没有要养成的习惯。</div>`;
    } else {
      h += `<div class="quit-grid">`;
      quits.forEach(q => {
        h += `<article class="qcard">
          <button class="card-x" data-act="habit-del" data-id="${q.id}" title="删除这个习惯">${icon('trash', 26)}</button>
          <h3>${esc(q.name)}</h3>
          <div class="muted" style="font-size:10.5px">${q.note ? esc(q.note) : '保持住'}</div>
          <div class="qbig"><b>${quitStreak(q)}</b><span>天</span></div>
          <div class="qmeta">最长 ${q.best} 天 · 累计 ${q.total} 天</div>
          <div class="flex gap8">
            <button class="btn btn-danger" data-act="relapse" data-id="${q.id}">我破戒了</button>
            <button class="btn" data-act="open-habit" data-id="${q.id}">查看记录</button>
          </div>
        </article>`;
      });
      h += `</div>`;
      if (!quits.length) h += `<div class="card card-empty" style="padding:40px">还没有要戒除的习惯。</div>`;
    }
    return h;
  }

  // ---------- 心愿 ----------
  function viewWishes() {
    const want = S.wishes.filter(w => w.status === 'want').sort((a, b) => b.want - a.want);
    const done = S.wishes.filter(w => w.status === 'done');
    let h = `<div class="page-head">
      <div>
        <h1 class="page-title">心愿清单</h1>
        <div class="page-sub"><span>${want.length} 个想要</span><span class="dot-sep"></span><span>${done.length} 个已实现</span><span class="dot-sep"></span><span>合计 ¥${sum(want.map(w => w.price || 0)).toLocaleString()}</span></div>
      </div>
      <div class="page-actions"><button class="btn" data-act="wish-new">${icon('plus', 14)} 新心愿</button></div>
    </div>`;

    h += `<div class="grid-cards">`;
    want.forEach(w => {
      h += `<article class="wish-card">
        <button class="card-x" data-act="wish-del" data-id="${w.id}" title="删除这个心愿">${icon('trash', 26)}</button>
        <div class="wish-top">
          ${stars(w.want)}
          <span class="chip">想要</span>
        </div>
        <h3>${esc(w.name)}</h3>
        ${w.price ? `<div class="wish-price mono">¥${w.price.toLocaleString()}</div>` : ''}
        <div class="wish-note">${esc(w.note || '')}</div>
        <div class="wish-foot">
          <button class="btn sm" data-act="wish-done" data-id="${w.id}">标记已实现</button>
        </div>
      </article>`;
    });
    h += `</div>`;

    if (done.length) {
      h += `<div class="page-sub" style="margin:24px 0 10px;color:var(--text-3)">已实现 · ${done.length}</div><div class="grid-cards">`;
      done.forEach(w => {
        h += `<article class="wish-card is-done">
          <button class="card-x" data-act="wish-del" data-id="${w.id}" title="删除这个心愿">${icon('trash', 26)}</button>
          <div class="wish-top">${stars(w.want)}<span class="chip">已实现</span></div>
          <h3>${esc(w.name)}</h3>
          ${w.price ? `<div class="wish-price mono">¥${w.price.toLocaleString()}</div>` : ''}
          <div class="wish-note">${esc(w.note || '')}</div>
          <div class="wish-foot"><span class="muted" style="font-size:10.5px">${w.date ? fmtMD(w.date) + ' 实现' : ''}</span></div>
        </article>`;
      });
      h += `</div>`;
    }
    return h;
  }

  // ---------- 琐事 ----------
  function viewTrivia() {
    const sel = S.ui.triviaDay || S.ui.cursor;
    const month = S.ui.calMonth || sel.slice(0, 7);
    const [yy, mm] = month.split('-').map(Number);
    const first = new Date(yy, mm - 1, 1);
    const daysInMonth = new Date(yy, mm, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const counts = {};
    S.trivia.forEach(t => { counts[t.date] = (counts[t.date] || 0) + 1; });

    let h = `<div class="page-head">
      <div>
        <h1 class="page-title">琐事记录</h1>
        <div class="page-sub"><span>${S.trivia.length} 条记录</span><span class="dot-sep"></span><span>按日期回看某天做过的小事</span></div>
      </div>
    </div>`;

    h += `<div class="trivia-layout"><section class="card mini-cal">
      <div class="cal-head">
        <button class="icon-btn" data-act="cal-prev">${icon('chevL', 15)}</button>
        <span class="cal-title">${yy} 年 ${mm} 月</span>
        <button class="icon-btn" data-act="cal-next">${icon('chevR', 15)}</button>
      </div>
      <div class="cal-grid">`;
    ['一', '二', '三', '四', '五', '六', '日'].forEach(d => { h += `<div class="cal-dow">${d}</div>`; });
    for (let i = 0; i < offset; i++) h += `<div class="cal-day dim"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${yy}-${pad(mm)}-${pad(d)}`;
      const cls = [key === sel ? 'sel' : '', key === TODAY_K ? 'today' : ''].join(' ');
      h += `<div class="cal-day ${cls}" data-act="cal-day" data-date="${key}">${d}${counts[key] ? '<i class="cal-dot"></i>' : ''}</div>`;
    }
    h += `</div>
      <div class="hr"></div>
      <div class="muted" style="font-size:10.5px;line-height:1.7">带点的日子有记录。<br>点一天，右边会定位到那天。</div>
    </section>`;

    h += `<section>`;
    h += `<div class="addbar" style="margin-bottom:16px">
      <span class="plus">${icon('pen', 15)}</span>
      <input id="triviaAdd" data-date="${sel}" placeholder="记下 ${fmtMD(sel)} 做的一件小事，回车保存" autocomplete="off">
    </div>`;

    const sorted = S.trivia.slice().sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
    const groups = [];
    sorted.forEach(t => {
      let g = groups.find(x => x.date === t.date);
      if (!g) { g = { date: t.date, items: [] }; groups.push(g); }
      g.items.push(t);
    });

    h += `<div class="trivia-list">`;
    groups.forEach(g => {
      const otherYear = g.date.slice(0, 4) !== TODAY_K.slice(0, 4);
      const sameDayLastYear = otherYear && g.date.slice(5) === TODAY_K.slice(5);
      const title = otherYear ? fmtFull(g.date) : fmtMDW(g.date);
      const rel = sameDayLastYear ? '去年今天' : relLabel(g.date);
      h += `<div class="trivia-day ${g.date === sel ? 'sel-day' : ''}" id="day-${g.date}" style="${g.date === sel ? 'background:rgba(233,163,60,.04);border-radius:10px;padding:8px 10px' : ''}">
        <div class="trivia-day-title"><b>${title}</b><span>${rel}</span><span>·</span><span>${g.items.length} 条</span></div>`;
      g.items.sort((a, b) => (a.time || '').localeCompare(b.time || '')).forEach(t => {
        h += `<div class="trivia-row">
          <span class="tr-time">${t.time || ''}</span>
          <span class="tr-text">${esc(t.text)}${t.tag ? `<span class="tag">#${esc(t.tag)}</span>` : ''}</span>
          <button class="row-x" data-act="note-del" data-id="${t.id}" title="删除这条琐事">${icon('trash', 26)}</button>
        </div>`;
      });
      h += `</div>`;
    });
    if (!groups.length) h += `<div class="card card-empty" style="padding:40px">还没有记录。</div>`;
    h += `</div></section></div>`;
    return h;
  }

  // ---------- 成就 ----------
  function viewAchievements() {
    const year = TODAY_K.slice(0, 4);
    const thisYear = S.achievements.filter(a => a.date.slice(0, 4) === year);
    const sorted = S.achievements.slice().sort((a, b) => b.date.localeCompare(a.date));
    const groups = [];
    sorted.forEach(a => {
      const key = a.date.slice(0, 4) + '年' + Number(a.date.slice(5, 7)) + '月';
      let g = groups.find(x => x.key === key);
      if (!g) { g = { key, items: [] }; groups.push(g); }
      g.items.push(a);
    });

    let h = `<div class="page-head">
      <div>
        <h1 class="page-title">成就</h1>
        <div class="page-sub"><span>做成的事，值得被记下来</span></div>
      </div>
      <div class="page-actions"><button class="btn btn-amber" data-act="ach-new">${icon('plus', 14)} 记录一件</button></div>
    </div>`;

    h += `<div class="ach-hero">
      <div class="ach-stat"><b>${thisYear.length}</b><span>今年做成的事</span></div>
      <div class="ach-stat"><b>${S.achievements.length}</b><span>累计记录</span></div>
      <div class="ach-stat"><b>${sorted[0] ? fmtMD(sorted[0].date) : '—'}</b><span>最近一次</span></div>
    </div>`;

    h += `<div class="tl">`;
    groups.forEach(g => {
      h += `<div class="tl-month">${g.key}</div>`;
      g.items.forEach(a => {
        h += `<div class="tl-item">
          <span class="tl-dot"></span>
          <h3>${esc(a.title)}</h3>
          <div class="tl-meta"><span>${fmtFull(a.date)}</span><span class="chip">${esc(a.source)}</span></div>
          ${a.note ? `<div class="tl-note">${esc(a.note)}</div>` : ''}
          <button class="row-x tl-x" data-act="ach-del" data-id="${a.id}" title="删除这条成就">${icon('trash', 26)}</button>
        </div>`;
      });
    });
    h += `</div>`;
    return h;
  }

  // ---------- Toast ----------
  // 记录最近一条带「撤销」的 toast，Ctrl Z 可以直接吃到它
  let lastUndo = null;

  function toast(msg, actionLabel, fn) {
    const wrap = document.getElementById('toastWrap');
    const el = document.createElement('div');
    el.className = 'toast';
    const span = document.createElement('span');
    span.innerHTML = msg;
    el.appendChild(span);
    const record = { el, fn };
    if (actionLabel) {
      const b = document.createElement('button');
      b.textContent = actionLabel;
      b.addEventListener('click', () => { if (fn) fn(); el.remove(); if (lastUndo && lastUndo.el === el) lastUndo = null; });
      el.appendChild(b);
      lastUndo = record;
    }
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .25s';
      el.style.opacity = '0';
      setTimeout(() => {
        el.remove();
        if (lastUndo && lastUndo.el === el) lastUndo = null;
      }, 260);
    }, 4200);
    while (wrap.children.length > 3) wrap.firstElementChild.remove();
  }

  function undoLast() {
    if (!lastUndo || !document.body.contains(lastUndo.el)) { lastUndo = null; return false; }
    const { el, fn } = lastUndo;
    if (fn) fn();
    el.remove();
    lastUndo = null;
    return true;
  }

  // ---------- 抽屉 ----------
  function openDrawer(html) {
    const d = document.getElementById('drawer');
    d.innerHTML = html;
    d.classList.add('open');
    document.getElementById('overlay').classList.add('show');
  }
  function closeDrawer() {
    document.getElementById('drawer').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
  }

  function drawerHabit(id) {
    const hb = habitById(id);
    if (!hb) return;
    const isQuit = hb.kind === 'quit';
    const streak = isQuit ? quitStreak(hb) : habitStreak(hb);
    const cells = isQuit ? null : heatCells(hb);
    let rate = 0, total = 0, best = 0;
    if (!isQuit) {
      for (let i = 0; i < 30; i++) {
        const k = iso(shift(TODAY, -i));
        if (habitDone(hb, k)) rate++;
      }
      rate = Math.round(rate / 30 * 100);
      total = Object.values(hb.records).reduce((a, b) => a + b, 0);
      Object.keys(hb.records).forEach(k => { if (habitDone(hb, k)) best++; });
    }

    let h = `<div class="drawer-head">
      <div class="dh-main">
        <div class="dh-kicker">${isQuit ? '戒除习惯' : '养成习惯'}</div>
        <h2>${esc(hb.name)}</h2>
      </div>
      <button class="icon-btn" data-act="drawer-close">${icon('x', 16)}</button>
    </div><div class="drawer-body">`;

    h += `<div class="flex" style="align-items:flex-end;gap:8px;margin-bottom:2px">
      <span class="mono" style="font-size:40px;font-weight:600;letter-spacing:-.04em;line-height:1;color:#F0C88C">${streak}</span>
      <span class="muted" style="font-size:12px;padding-bottom:5px">天连续</span>
    </div>`;
    h += `<div class="muted" style="font-size:11px;margin-bottom:16px">${isQuit ? '最长 ' + hb.best + ' 天 · 累计 ' + hb.total + ' 天' : '今天 ' + habitCount(hb, TODAY_K) + '/' + hb.target + ' · ' + (habitDone(hb, TODAY_K) ? '已完成' : '还没完成')}</div>`;

    if (!isQuit) {
      h += `<div class="drawer-section"><h4>最近 20 周</h4>
        <div class="heat">`;
      cells.forEach(c => {
        const lv = c.c === 0 ? '' : hb.target > 1 ? 'l' + clamp(Math.ceil(c.c / hb.target * 3), 1, 3) : 'l3';
        h += `<span class="hcell ${lv} ${c.future ? 'future' : ''}" title="${c.k} · ${c.c}"></span>`;
      });
      h += `</div><div class="heat-foot"><span>20 周前</span><span>今天</span></div></div>`;

      h += `<div class="drawer-section">
        <div class="kv"><span class="k">近 30 天完成率</span><span class="v">${rate}%</span></div>
        <div class="kv"><span class="k">最长连续</span><span class="v">${longestStreak(hb)} 天</span></div>
        <div class="kv"><span class="k">累计打卡</span><span class="v">${total} 次</span></div>
        <div class="kv" style="border:0"><span class="k">每天目标</span><span class="v">${hb.target} ${hb.unit || '次'}</span></div>
      </div>`;

      h += `<div class="drawer-section"><h4>最近 7 天</h4>`;
      weekCells(hb).slice().reverse().forEach(c => {
        h += `<div class="flex" style="justify-content:space-between;padding:6px 0;font-size:12px;color:var(--text-2)">
          <span>${fmtMDW(c.k)}</span>
          <span style="color:${c.done ? 'var(--amber-2)' : 'var(--text-3)'}">${c.count ? c.count + '/' + hb.target : '未打卡'}</span>
        </div>`;
      });
      h += `</div>`;
    } else {
      h += `<div class="drawer-section">
        <div class="kv"><span class="k">最长纪录</span><span class="v">${hb.best} 天</span></div>
        <div class="kv"><span class="k">累计戒除</span><span class="v">${hb.total} 天</span></div>
        <div class="kv" style="border:0"><span class="k">上次破戒</span><span class="v">${hb.lastRelapse ? fmtMD(hb.lastRelapse) : '—'}</span></div>
      </div>
      <div class="drawer-section">
        <button class="btn btn-danger" data-act="relapse" data-id="${hb.id}">我破戒了</button>
        <div class="muted" style="font-size:10.5px;margin-top:8px;line-height:1.7">连续天数会归零，但最长纪录和累计天数会保留。</div>
      </div>`;
    }

    if (hb.note) h += `<div class="drawer-section"><h4>备注</h4><div class="muted" style="font-size:12px;line-height:1.7">${esc(hb.note)}</div></div>`;
    h += `<div class="drawer-section" style="margin-bottom:0">
      <button class="btn btn-danger" data-act="habit-del" data-id="${hb.id}">${icon('trash', 14)} 删除这个习惯</button>
    </div>`;
    h += `</div>`;
    openDrawer(h);
  }

  function drawerProject(id) {
    const p = projById(id);
    if (!p) return;
    const tasks = S.tasks.filter(t => t.projectId === id).sort((a, b) => a.date.localeCompare(b.date));
    const done = tasks.filter(t => t.done).length;
    let h = `<div class="drawer-head">
      <div class="dh-main">
        <div class="dh-kicker">项目 · ${PROJECT_STATUS[p.status]}</div>
        <h2>${esc(p.name)}</h2>
      </div>
      <button class="icon-btn" data-act="drawer-close">${icon('x', 16)}</button>
    </div><div class="drawer-body">`;

    h += `<div class="pbar" style="margin:2px 0 8px"><i style="width:${p.progress}%;background:${p.color}"></i></div>
      <div class="flex" style="justify-content:space-between;font-size:11px;color:var(--text-3);margin-bottom:18px">
        <span>进度 ${p.progress}%</span><span>${p.due ? '截止 ' + fmtFull(p.due) : '无截止日期'}</span>
      </div>`;

    if (p.next) {
      h += `<div class="drawer-section"><h4>下一步</h4>
        <div style="padding:11px 12px;border-radius:10px;background:rgba(233,163,60,.06);border:1px solid rgba(233,163,60,.16);font-size:13px;color:var(--text)">${esc(p.next)}</div>
      </div>`;
    }
    if (p.note) h += `<div class="drawer-section"><h4>项目说明</h4><div class="muted" style="font-size:12px;line-height:1.75">${esc(p.note)}</div></div>`;

    h += `<div class="drawer-section"><h4>关联任务 · ${done}/${tasks.length}</h4>`;
    if (!tasks.length) h += `<div class="muted" style="font-size:11.5px">还没有关联任务。</div>`;
    tasks.forEach(t => {
      h += `<div style="display:flex;align-items:center;gap:9px;padding:6px 0;font-size:12.5px;color:${t.done ? 'var(--text-3)' : 'var(--text-2)'}">
        <span class="check ${t.done ? 'on' : ''}" style="width:15px;height:15px;${t.done ? 'background:var(--amber);border-color:var(--amber)' : ''}">${icon('check', 9)}</span>
        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}</span>
        <span class="muted" style="font-size:10.5px">${fmtShort(t.date)}</span>
      </div>`;
    });
    h += `</div>`;

    h += `<div class="drawer-section" style="display:flex;gap:8px">
      <button class="btn btn-amber" data-act="project-next" data-id="${p.id}">把下一步排进今天</button>
      <button class="btn btn-danger" data-act="project-del" data-id="${p.id}">${icon('trash', 14)} 删除项目</button>
    </div></div>`;
    openDrawer(h);
  }

  // ---------- 弹层 ----------
  function openModal(html) {
    const layer = document.getElementById('modalLayer');
    layer.innerHTML = html;
    layer.hidden = false;
    layer.onclick = e => { if (e.target === layer) closeModal(); };
    const inp = layer.querySelector('input,textarea');
    if (inp) setTimeout(() => inp.focus(), 40);
  }
  function closeModal() {
    const l = document.getElementById('modalLayer');
    l.hidden = true;
    l.innerHTML = '';
  }
  function modalShell(title, sub, body, foot) {
    return `<div class="modal" style="position:relative">
      <button class="icon-btn modal-close" data-act="m-close">${icon('x', 16)}</button>
      <h3>${title}</h3>${sub ? `<div class="m-sub">${sub}</div>` : '<div style="height:12px"></div>'}
      ${body}
      <div class="modal-foot">${foot}</div>
    </div>`;
  }

  // 二次确认：危险操作统一走这里
  let pendingConfirm = null;
  function askConfirm(opt) {
    const p = opt || {};
    pendingConfirm = p.onOk || null;
    const body = `<div class="confirm-body">
      <div class="confirm-ico ${p.danger === false ? 'safe' : ''}">${icon(p.danger === false ? 'check' : 'trash', 18)}</div>
      <div class="confirm-text">
        <div class="confirm-title">${esc(p.title || '确定要删除吗？')}</div>
        ${p.detail ? `<div class="confirm-detail">${p.detail}</div>` : ''}
      </div>
    </div>`;
    openModal(modalShell(p.heading || '删除确认', '',
      body,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn ${p.danger === false ? 'btn-amber' : 'btn-danger'}" data-act="confirm-ok">${esc(p.okText || '删除')}</button>`));
    // 让主按钮拿到焦点，键盘 Enter 直接确认
    setTimeout(() => {
      const btn = document.querySelector('#modalLayer [data-act="confirm-ok"]');
      if (btn) btn.focus();
    }, 45);
  }

  function openTrash() {
    const list = S.trash || [];
    let body = '';
    if (!list.length) {
      body = `<div class="trash-empty">回收站是空的。<br>删除的待办、目标、项目都会先放到这里，随时能捡回来。</div>`;
    } else {
      body = `<div class="trash-list">${list.map(e => {
        const when = (() => {
          const d = new Date(e.at || Date.now());
          const same = iso(d) === TODAY_K;
          return `${same ? '今天' : fmtMD(iso(d))} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        })();
        const hint = e.kind === 'goal' && e.count > 1 ? `含 ${e.count} 个子项` : (e.meta && e.meta.length === 10 ? fmtMD(e.meta) : '');
        return `<div class="trash-row">
          <span class="trash-kind">${KIND_LABEL[e.kind] || '其他'}</span>
          <div class="trash-main">
            <div class="trash-title">${esc(e.title)}</div>
            <div class="trash-meta">${when}${hint ? ' · ' + hint : ''}</div>
          </div>
          <button class="btn sm" data-act="trash-restore" data-id="${e.id}">${icon('restore', 13)} 恢复</button>
        </div>`;
      }).join('')}</div>`;
    }
    openModal(modalShell('回收站', list.length ? `最近删除的 ${list.length} 条记录，最多保留 40 条。` : '这里会留着被删掉的内容。',
      body,
      `<button class="btn btn-ghost" data-act="m-close">关闭</button>
       ${list.length ? `<button class="btn btn-danger" data-act="trash-ask-clear">清空回收站</button>` : ''}`));
  }

  function openCapture() {
    openModal(modalShell('记录', '写下来，选一个去处。',
      `<textarea class="input" id="capText" rows="3" placeholder="例：今天终于把书架装好了"></textarea>
       <div class="muted" style="font-size:10.5px;margin-top:8px;line-height:1.7">待办会进入今天的日程；琐事带时间戳；成就会进入成就墙。</div>`,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn" data-act="cap-save" data-kind="trivia">记为琐事</button>
       <button class="btn" data-act="cap-save" data-kind="task">记为待办</button>
       <button class="btn btn-amber" data-act="cap-save" data-kind="ach">记为成就</button>`));
  }

  function openSummary() {
    const st = statsOn(TODAY_K);
    const q = S.habits.filter(x => x.kind === 'quit').sort((a, b) => quitStreak(b) - quitStreak(a))[0];
    openModal(modalShell('今日小结', fmtMDW(TODAY_K) + ' · 给今天画个句号',
      `<div class="flex" style="gap:22px;margin-bottom:16px">
        <div><div class="mono" style="font-size:21px;font-weight:600">${st.taskDone}<span class="muted" style="font-size:12px;font-weight:400">/${st.taskTotal}</span></div><div class="muted" style="font-size:10.5px">待办</div></div>
        <div><div class="mono" style="font-size:21px;font-weight:600">${st.habitDone}<span class="muted" style="font-size:12px;font-weight:400">/${st.habitTotal}</span></div><div class="muted" style="font-size:10.5px">习惯</div></div>
        <div><div class="mono" style="font-size:21px;font-weight:600">${q ? quitStreak(q) : 0}</div><div class="muted" style="font-size:10.5px">天戒除</div></div>
        <div><div class="mono" style="font-size:21px;font-weight:600">${st.notes}</div><div class="muted" style="font-size:10.5px">条琐事</div></div>
      </div>
      <textarea class="input" id="sumText" rows="3" placeholder="用一句话总结今天，比如：慢，但往前了一点。"></textarea>`,
      `<button class="btn btn-ghost" data-act="m-close">先不写</button>
       <button class="btn btn-amber" data-act="summary-save">保存到琐事</button>`));
  }

  function openRelapse(id) {
    const q = habitById(id);
    if (!q) return;
    const s = quitStreak(q);
    openModal(modalShell('确定要记一次破戒吗？', `「${esc(q.name)}」已经连续 ${s} 天。`,
      `<div class="muted" style="font-size:12px;line-height:1.75;margin-bottom:12px">连续天数会归零，但最长纪录 ${q.best} 天和累计 ${q.total} 天会保留。诚实记录比保持连胜更重要。</div>
       <input class="input" id="relReason" placeholder="可选：发生了什么（只给自己看）">`,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn btn-danger" data-act="relapse-confirm" data-id="${q.id}">确认破戒</button>`));
  }

  function openNewHabit() {
    openModal(modalShell('新习惯', '养成的习惯每天打勾，戒除的习惯只记连续天数。',
      `<div class="field"><label>名称</label><input class="input" id="nhName" placeholder="例：早起 6:30"></div>
       <div class="field"><label>类型</label>
         <select class="input" id="nhKind"><option value="build">养成 · 每天要做</option><option value="quit">戒除 · 每天不要做</option></select>
       </div>
       <div class="field"><label>每天目标次数（喝水这类量化习惯填 8，普通习惯填 1）</label><input class="input" id="nhTarget" type="number" min="1" max="99" value="1"></div>`,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn btn-amber" data-act="habit-create">创建</button>`));
  }

  function openNewWish() {
    openModal(modalShell('新心愿', '想要的东西，不丢人。',
      `<div class="field"><label>名称</label><input class="input" id="nwName" placeholder="例：一台 3D 打印机"></div>
       <div class="field"><label>预算（可留空）</label><input class="input" id="nwPrice" type="number" min="0" placeholder="2499"></div>
       <div class="field"><label>想要程度</label>
         <select class="input" id="nwWant"><option value="5">★★★★★ 想到睡不着</option><option value="4">★★★★ 很想要</option><option value="3" selected>★★★ 想要</option><option value="2">★★ 有点想</option><option value="1">★ 随缘</option></select>
       </div>`,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn btn-amber" data-act="wish-create">加入清单</button>`));
  }

  function openNewAch() {
    openModal(modalShell('记录一件做成的事', '不用是大事。',
      `<div class="field"><label>做成了什么</label><input class="input" id="naTitle" placeholder="例：第一次一个人去看电影"></div>
       <div class="field"><label>日期</label><input class="input" id="naDate" type="date" value="${TODAY_K}"></div>
       <div class="field"><label>想说的话（可选）</label><textarea class="input" id="naNote" rows="2"></textarea></div>`,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn btn-amber" data-act="ach-create">记下来</button>`));
  }

  function openNewGoal() {
    openModal(modalShell('新目标', '先写目标，之后在目标树里一层层拆。',
      `<div class="field"><label>目标</label><input class="input" id="ngTitle" placeholder="例：今年读完 24 本书"></div>`,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn btn-amber" data-act="goal-create">创建</button>`));
  }

  function openNewProject() {
    openModal(modalShell('新项目', '有交付物、有结束点的一件事。',
      `<div class="field"><label>项目名</label><input class="input" id="npName" placeholder="例：书房改造"></div>
       <div class="field"><label>下一步（可以之后补）</label><input class="input" id="npNext" placeholder="例：量窗帘尺寸"></div>`,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn btn-amber" data-act="project-create">创建</button>`));
  }

  function openSettings() {
    const n = (S.trash || []).length;
    const cur = currentThemeId();
    const themeOpts = THEMES.map(t => `<button class="theme-opt ${t.id === cur ? 'on' : ''}" data-act="theme-set" data-theme="${t.id}">
      <span class="theme-swatch" style="background:${t.swatch}"><i style="background:${t.accent}"></i></span>
      <span class="theme-name"><b>${t.name}</b><span>${t.hint}</span></span>
    </button>`).join('');

    openModal(modalShell('设置', '原型阶段 · 数据只保存在这台电脑上。',
      `<div class="set-label">外观主题</div>
       <div class="theme-grid">${themeOpts}</div>
       <div class="kv"><span class="k">存储方式</span><span class="v">本地 · localStorage</span></div>
       <div class="set-actions">
         <button class="btn" data-act="backup-export">${icon('arrowUp', 14)}导出备份</button>
         <button class="btn" data-act="backup-import">${icon('restore', 14)}导入备份</button>
       </div>
       <div class="muted backup-hint">备份包含全部用户数据和当前主题；导入会覆盖现有数据。</div>
       <button class="set-row" data-act="trash-open">
         <span class="set-row-main">${icon('trash', 15)}<span>回收站</span></span>
         <span class="set-row-side">${n ? n + ' 条可恢复' : '空'}${icon('chevR', 14)}</span>
       </button>
       <div class="hr"></div>
       <div class="muted" style="font-size:11px;line-height:1.7">这是用于确认交互的原型，数据仅用于演示。正式版会换成本地数据库并自动备份。<br>删除操作都有撤销：按 <span class="kbd">Ctrl Z</span>，或者到回收站里恢复。</div>`,
      `<button class="btn btn-danger" data-act="reset-ask">重置演示数据</button>
       <button class="btn" data-act="m-close">关闭</button>`));
  }

  // ---------- 命令面板 ----------
  let palSel = 0;
  let palItems = [];

  function openPalette() {
    const routes = [];
    NAV.forEach(g => g.items.forEach(it => routes.push({ label: it.label, icon: it.icon, hint: '跳转', run: () => go(it.id) })));
    palItems = routes.concat([
      { label: '快速记录', icon: 'pen', hint: 'Ctrl Shift Space', run: openCapture },
      { label: '今日小结', icon: 'check', hint: '', run: openSummary },
      { label: '新建任务', icon: 'plus', hint: '', run: () => { go('tasks'); setTimeout(() => { const el = document.getElementById('taskAdd'); if (el) el.focus(); }, 40); } },
      { label: '新建习惯', icon: 'repeat', hint: '', run: openNewHabit }
    ]);
    palSel = 0;
    const layer = document.getElementById('modalLayer');
    layer.hidden = false;
    layer.innerHTML = `<div class="palette">
      <input id="palInput" placeholder="搜索页面或命令…" autocomplete="off">
      <div class="pal-list" id="palList"></div>
    </div>`;
    layer.onclick = e => { if (e.target === layer) { closeModal(); } };
    document.getElementById('palInput').addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      palItems = palItems.filter(() => true);
      renderPalList(q);
    });
    renderPalList('');
    setTimeout(() => { const el = document.getElementById('palInput'); if (el) el.focus(); }, 40);
  }

  const PAL_ALL = () => {
    const routes = [];
    NAV.forEach(g => g.items.forEach(it => routes.push({ label: it.label, icon: it.icon, hint: '跳转', run: () => go(it.id) })));
    return routes.concat([
      { label: '快速记录', icon: 'pen', hint: 'Ctrl Shift Space', run: openCapture },
      { label: '今日小结', icon: 'check', hint: '', run: openSummary },
      { label: '新建任务', icon: 'plus', hint: '', run: () => { go('tasks'); setTimeout(() => { const el = document.getElementById('taskAdd'); if (el) el.focus(); }, 40); } },
      { label: '新建习惯', icon: 'repeat', hint: '', run: openNewHabit },
      { label: '回收站', icon: 'trash', hint: '恢复删除', run: openTrash }
    ]);
  };

  function renderPalList(q) {
    const all = PAL_ALL();
    const list = q ? all.filter(it => it.label.toLowerCase().indexOf(q) >= 0) : all;
    palItems = list;
    if (palSel >= list.length) palSel = Math.max(0, list.length - 1);
    const box = document.getElementById('palList');
    if (!box) return;
    if (!list.length) { box.innerHTML = `<div class="pal-empty">没有匹配的命令</div>`; return; }
    box.innerHTML = list.map((it, i) => `<div class="pal-item ${i === palSel ? 'sel' : ''}" data-act="pal-run" data-idx="${i}">
      ${icon(it.icon, 15)}<span>${it.label}</span><span class="pal-hint">${it.hint || ''}</span>
    </div>`).join('');
  }

  // ---------- 行为 ----------
  function parseTask(raw, base) {
    let text = ' ' + raw.trim();
    let date = base, time = null, p = 'normal', projectId = null;
    const tm = text.match(/\s([01]?\d|2[0-3]):([0-5]\d)/);
    if (tm) { time = pad(tm[1]) + ':' + tm[2]; text = text.replace(tm[0], ' '); }
    const dm = text.match(/(今天|明天|后天|大后天)/);
    if (dm) {
      const n = { 今天: 0, 明天: 1, 后天: 2, 大后天: 3 }[dm[1]];
      date = iso(shift(parse(base), n));
      text = text.replace(dm[1], ' ');
    }
    const pm = text.match(/\s!(高|中|低)/);
    if (pm) { p = pm[1] === '高' ? 'high' : pm[1] === '低' ? 'low' : 'normal'; text = text.replace(pm[0], ' '); }
    const am = text.match(/\s@([^\s#!]+)/);
    if (am) {
      const pr = S.projects.find(x => x.name.indexOf(am[1]) >= 0 || am[1].indexOf(x.name) >= 0);
      if (pr) projectId = pr.id;
      text = text.replace(am[0], ' ');
    }
    return { text: text.replace(/\s+/g, ' ').trim(), date, time, p, projectId };
  }

  function addTask(raw, base) {
    const d = parseTask(raw, base || S.ui.cursor);
    if (!d.text) return false;
    S.tasks.push({ id: uid('t'), title: d.text, date: d.date, time: d.time, done: false, p: d.p, projectId: d.projectId });
    save();
    return true;
  }

  function addNote(text, date, tag) {
    if (!text.trim()) return false;
    S.trivia.push({ id: uid('n'), date: date || S.ui.cursor, time: nowHM(), text: text.trim(), tag: tag || '' });
    save();
    return true;
  }

  function toggleTask(id) {
    const t = S.tasks.find(x => x.id === id);
    if (!t) return;
    t.done = !t.done;
    save();
    render(false);
    if (t.done) {
      toast(`已完成 <b>${esc(t.title)}</b>`, '撤销', () => { t.done = false; save(); render(false); });
    }
  }

  function setHabit(h, date, n, silent) {
    if (date > TODAY_K) return;
    const max = (h.target || 1);
    n = clamp(n, 0, max);
    if (n <= 0) delete h.records[date]; else h.records[date] = n;
    save();
    if (!silent) {
      const st = habitStreak(h);
      if ([7, 30, 100, 365].indexOf(st) >= 0) {
        const title = `连续 ${st} 天 · ${h.name}`;
        if (!S.achievements.some(a => a.title === title)) {
          S.achievements.push({ id: uid('a'), title, date: TODAY_K, source: '习惯', note: '' });
          save();
          toast(`里程碑：<b>${esc(h.name)} 连续 ${st} 天</b>，已记入成就`);
          return;
        }
      }
      if (date !== TODAY_K) toast(`已补卡 <b>${fmtMDW(date)}</b>`);
    }
  }

  function completeGoal(id) {
    const g = goalById(id);
    if (!g) return;
    g.status = g.status === 'done' ? 'doing' : 'done';
    save();
    render(false);
    if (g.status === 'done') {
      toast(`目标达成 <b>${esc(g.title)}</b>`, '记入成就', () => {
        S.achievements.push({ id: uid('a'), title: `达成目标：${g.title}`, date: TODAY_K, source: '目标', note: '' });
        save(); render(false); toast('已记入成就');
      });
    }
  }

  function scheduleGoal(id) {
    const g = goalById(id);
    if (!g) return;
    S.tasks.push({ id: uid('t'), title: g.title, date: TODAY_K, time: '', done: false, p: 'normal', goalId: g.id });
    save();
    render(false);
    toast(`已排进今天：<b>${esc(g.title)}</b>`, '去日程', () => go('tasks'));
  }

  function shiftCursor(n) {
    S.ui.cursor = iso(shift(parse(S.ui.cursor), n));
    if (S.ui.route === 'trivia') S.ui.triviaDay = S.ui.cursor;
    save();
    render(true);
  }

  function changeMonth(n) {
    const base = S.ui.calMonth || (S.ui.triviaDay || S.ui.cursor).slice(0, 7);
    const d = new Date(Number(base.slice(0, 4)), Number(base.slice(5, 7)) - 1 + n, 1);
    S.ui.calMonth = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    save();
    render(false);
  }

  // ---------- 事件 ----------
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    const id = el.dataset.id;

    switch (act) {
      case 'nav': go(el.dataset.route); break;
      case 'prev-day': shiftCursor(-1); break;
      case 'next-day': shiftCursor(1); break;
      case 'goto-today':
        S.ui.cursor = TODAY_K;
        if (S.ui.route === 'trivia') S.ui.triviaDay = TODAY_K;
        save(); render(true); break;

      case 'palette': openPalette(); break;
      case 'capture': openCapture(); break;
      case 'summary': openSummary(); break;
      case 'settings': openSettings(); break;
      case 'backup-export': exportBackup(); break;
      case 'backup-import': importBackup(); break;
      case 'export-success-ok': closeModal(); break;

      case 'toggle-task': toggleTask(id); break;
      case 'task-del': {
        const t = S.tasks.find(x => x.id === id);
        if (!t) break;
        askConfirm({
          title: `删除待办「${t.title}」？`,
          detail: `${fmtMDW(t.date)}${t.time ? ' ' + t.time : ''} · 删掉后可以从回收站恢复`,
          okText: '删除',
          onOk: () => delTask(id)
        });
        break;
      }
      case 'note-del': delTrivia(id); break;
      case 'goto-notes': go('trivia'); break;
      case 'clean-done': {
        const list = S.tasks.filter(t => t.done);
        if (!list.length) break;
        askConfirm({
          title: `清理 ${list.length} 条已完成的待办？`,
          detail: '它们会一起进回收站，可以整条撤销。',
          okText: `清理 ${list.length} 条`,
          onOk: () => {
            const items = list.slice();
            const idxs = items.map(t => S.tasks.indexOf(t));
            S.tasks = S.tasks.filter(t => !t.done);
            const entry = { id: uid('r'), kind: 'task', title: `已完成的待办 ${items.length} 条`, count: items.length, items: { tasks: items }, idxs, bulk: true };
            pushTrash(entry);
            save(); render(false);
            toast(`已清理 <b>${items.length}</b> 条已完成的待办`, '撤销', () => { undoTrash(entry.id); render(false); toast('已撤销删除'); });
          }
        });
        break;
      }

      case 'save-note': {
        const inp = document.getElementById('quickNote');
        if (inp && addNote(inp.value, S.ui.cursor)) {
          render(false);
          const el = document.getElementById('quickNote');
          if (el) el.focus();
        }
        break;
      }

      case 'task-view':
        S.ui.taskView = el.dataset.view; save(); render(false); break;

      case 'postpone-all': {
        const od = overdueTasks();
        od.forEach(t => { t.date = TODAY_K; });
        save(); render(false);
        toast(`已顺延 <b>${od.length}</b> 项到今天`);
        break;
      }

      case 'habit-chip': {
        const hb = habitById(id);
        if (!hb) break;
        const date = el.dataset.date;
        if (hb.target > 1) setHabit(hb, date, habitCount(hb, date) + 1);
        else setHabit(hb, date, habitCount(hb, date) > 0 ? 0 : 1);
        render(false);
        break;
      }
      case 'habit-toggle': {
        const hb = habitById(id);
        setHabit(hb, TODAY_K, habitDone(hb, TODAY_K) ? 0 : 1);
        render(false); break;
      }
      case 'habit-inc': {
        const hb = habitById(id);
        setHabit(hb, el.dataset.date || TODAY_K, habitCount(hb, el.dataset.date || TODAY_K) + 1);
        render(false); break;
      }
      case 'habit-dec': {
        const hb = habitById(id);
        setHabit(hb, el.dataset.date || TODAY_K, habitCount(hb, el.dataset.date || TODAY_K) - 1);
        render(false); break;
      }
      case 'habit-cell': {
        const hb = habitById(id);
        const date = el.dataset.date;
        if (date > TODAY_K) break;
        setHabit(hb, date, habitCount(hb, date) > 0 ? 0 : (hb.target || 1));
        render(false); break;
      }
      case 'habit-tab':
        S.ui.habitTab = el.dataset.tab; save(); render(false); break;
      case 'habit-new': openNewHabit(); break;
      case 'open-habit': drawerHabit(id); break;
      case 'habit-del': {
        const hb = habitById(id);
        if (!hb) break;
        const recs = hb.kind === 'quit' ? hb.total : Object.keys(hb.records || {}).length;
        askConfirm({
          title: `删除习惯「${hb.name}」？`,
          detail: hb.kind === 'quit'
            ? `累计 ${hb.total} 天、最长 ${hb.best} 天的纪录会一起删除，删掉后可以在回收站恢复。`
            : (recs ? `已经攒了 ${recs} 天的打卡记录，删掉后可以在回收站恢复。` : '删掉后可以在回收站恢复。'),
          okText: '删除习惯',
          onOk: () => delHabit(id)
        });
        break;
      }

      case 'relapse': openRelapse(id); break;
      case 'relapse-confirm': {
        const q = habitById(id);
        if (q) {
          const s = quitStreak(q);
          q.best = Math.max(q.best, s);
          q.total += s;
          q.lastRelapse = TODAY_K;
          save();
        }
        closeModal(); closeDrawer(); render(false);
        toast('已记录一次破戒。连续归零，纪录保留。');
        break;
      }

      case 'focus-done': {
        const key = el.dataset.key;
        S.ui.focusDone[key] = !S.ui.focusDone[key];
        save(); render(false);
        if (S.ui.focusDone[key]) toast('已标记为今天推进过');
        break;
      }
      case 'open-focus': {
        if (el.dataset.kind === 'project') drawerProject(el.dataset.id);
        else { S.ui.goalId = el.dataset.id; go('goals'); }
        break;
      }

      case 'goal-select':
        S.ui.goalId = id;
        save(); render(false); break;
      case 'goal-toggle': {
        const gid = id;
        S.ui.expanded[gid] = !S.ui.expanded[gid];
        save(); render(false); break;
      }
      case 'goal-schedule': scheduleGoal(id); break;
      case 'goal-done': completeGoal(id); break;
      case 'goal-new': openNewGoal(); break;
      case 'goal-del': {
        const g = goalById(id);
        if (!g) break;
        const kids = childrenOf(id).length;
        const total = goalLeaves(id).length;
        askConfirm({
          title: `删除${g.parentId ? '子项' : '目标'}「${g.title}」？`,
          detail: kids
            ? `它下面还有 ${kids} 个直接子项、共 ${total} 个最小行动，会一起删除。由它排出的待办会保留，只是不再关联。`
            : '删除后可以在回收站恢复。',
          okText: '删除',
          onOk: () => {
            const parent = el.dataset.parent;
            if (parent) delGoalChild(parent, id); else delGoal(id);
          }
        });
        break;
      }

      case 'open-project': drawerProject(id); break;
      case 'project-new': openNewProject(); break;
      case 'project-del': {
        const p = projById(id);
        if (!p) break;
        const linked = S.tasks.filter(t => t.projectId === id).length;
        askConfirm({
          title: `删除项目「${p.name}」？`,
          detail: (linked ? `关联的 ${linked} 条待办会保留，只是不再挂在这个项目下。` : '') + '删除后可以在回收站恢复。',
          okText: '删除项目',
          onOk: () => { closeDrawer(); delProject(id); }
        });
        break;
      }
      case 'project-next': {
        const p = projById(id);
        if (p && p.next) {
          S.tasks.push({ id: uid('t'), title: p.next, date: TODAY_K, time: '', done: false, p: 'normal', projectId: p.id });
          save(); render(false);
          toast(`已排进今天：<b>${esc(p.next)}</b>`);
        }
        break;
      }

      case 'wish-new': openNewWish(); break;
      case 'wish-done': {
        const w = S.wishes.find(x => x.id === id);
        if (w) {
          w.status = 'done'; w.date = TODAY_K;
          S.achievements.push({ id: uid('a'), title: `实现心愿：${w.name}`, date: TODAY_K, source: '心愿', note: '' });
          save(); render(false);
          toast(`心愿实现：<b>${esc(w.name)}</b>，已记入成就`);
        }
        break;
      }
      case 'ach-new': openNewAch(); break;
      case 'wish-del': {
        const w = S.wishes.find(x => x.id === id);
        if (!w) break;
        askConfirm({
          title: `删除心愿「${w.name}」？`,
          detail: w.status === 'done' ? '已记录的实现时间会一起删除，回收站里可以恢复。' : '如果只是想暂时放下，删掉也没关系，回收站里能找回来。',
          okText: '删除心愿',
          onOk: () => delWish(id)
        });
        break;
      }
      case 'ach-del': {
        const a = S.achievements.find(x => x.id === id);
        if (!a) break;
        askConfirm({
          title: `删除这条成就？`,
          detail: `「${a.title}」 · 回收站里可以恢复`,
          okText: '删除',
          onOk: () => delAch(id)
        });
        break;
      }

      case 'cal-prev': changeMonth(-1); break;
      case 'cal-next': changeMonth(1); break;
      case 'cal-day': {
        S.ui.triviaDay = el.dataset.date;
        S.ui.cursor = el.dataset.date;
        S.ui.calMonth = el.dataset.date.slice(0, 7);
        save(); render(true);
        break;
      }

      case 'm-close': closeModal(); break;
      case 'drawer-close': closeDrawer(); break;

      case 'cap-save': {
        const ta = document.getElementById('capText');
        const txt = ta ? ta.value.trim() : '';
        if (!txt) { closeModal(); break; }
        if (el.dataset.kind === 'task') {
          S.tasks.push({ id: uid('t'), title: txt, date: TODAY_K, time: '', done: false, p: 'normal' });
          save(); closeModal(); render(false); toast('已加入今天的日程');
        } else if (el.dataset.kind === 'ach') {
          S.achievements.push({ id: uid('a'), title: txt, date: TODAY_K, source: '手动', note: '' });
          save(); closeModal(); render(false); toast('已记入成就');
        } else {
          S.trivia.push({ id: uid('n'), date: TODAY_K, time: nowHM(), text: txt, tag: '' });
          save(); closeModal(); render(false); toast('已记下');
        }
        break;
      }
      case 'summary-save': {
        const ta = document.getElementById('sumText');
        const txt = ta ? ta.value.trim() : '';
        if (txt) { S.trivia.push({ id: uid('n'), date: TODAY_K, time: nowHM(), text: txt, tag: '小结' }); save(); }
        closeModal(); render(false); toast('今天收工。');
        break;
      }

      case 'habit-create': {
        const name = (document.getElementById('nhName') || {}).value || '';
        if (!name.trim()) break;
        const kind = (document.getElementById('nhKind') || {}).value || 'build';
        const target = Number((document.getElementById('nhTarget') || {}).value || 1) || 1;
        S.habits.push(kind === 'quit'
          ? { id: uid('q'), kind: 'quit', name: name.trim(), icon: 'flame', lastRelapse: TODAY_K, best: 0, total: 0, note: '' }
          : { id: uid('h'), kind: 'build', name: name.trim(), icon: 'target', target: clamp(target, 1, 99), unit: '次', note: '', records: {} });
        save(); closeModal(); render(false);
        toast(`已创建习惯 <b>${esc(name.trim())}</b>`);
        break;
      }
      case 'wish-create': {
        const name = (document.getElementById('nwName') || {}).value || '';
        if (!name.trim()) break;
        const price = Number((document.getElementById('nwPrice') || {}).value || 0);
        const want = Number((document.getElementById('nwWant') || {}).value || 3);
        S.wishes.push({ id: uid('w'), name: name.trim(), price, want, status: 'want', note: '' });
        save(); closeModal(); render(false); toast('已加入心愿清单');
        break;
      }
      case 'ach-create': {
        const title = (document.getElementById('naTitle') || {}).value || '';
        if (!title.trim()) break;
        const date = (document.getElementById('naDate') || {}).value || TODAY_K;
        const note = (document.getElementById('naNote') || {}).value || '';
        S.achievements.push({ id: uid('a'), title: title.trim(), date, source: '手动', note: note.trim() });
        save(); closeModal(); render(false); toast('记下了。');
        break;
      }
      case 'goal-create': {
        const title = (document.getElementById('ngTitle') || {}).value || '';
        if (!title.trim()) break;
        const gid = uid('g');
        S.goals.push({ id: gid, parentId: null, title: title.trim(), type: 'goal', status: 'todo', note: '' });
        S.ui.goalId = gid;
        save(); closeModal(); render(false); toast('目标已创建，接下来把它拆开。');
        break;
      }
      case 'project-create': {
        const name = (document.getElementById('npName') || {}).value || '';
        if (!name.trim()) break;
        const next = (document.getElementById('npNext') || {}).value || '';
        S.projects.push({ id: uid('p'), name: name.trim(), color: '#E9A33C', status: 'ing', progress: 0, next: next.trim(), due: null, note: '' });
        save(); closeModal(); render(false); toast('项目已创建');
        break;
      }
      case 'reset-ask':
        askConfirm({
          title: '重置演示数据？',
          detail: '当前所有内容会被清空，回到最初的样子。这一步不能撤销。',
          okText: '确认重置',
          onOk: () => { try { localStorage.removeItem(KEY); } catch (err) { } location.reload(); }
        });
        break;

      case 'confirm-ok': {
        const fn = pendingConfirm;
        pendingConfirm = null;
        closeModal();
        if (fn) setTimeout(fn, 30);
        break;
      }
      case 'trash-open': openTrash(); break;
      case 'theme-set': {
        const t = applyTheme(el.dataset.theme);
        // 换主题不影响数据，只更新选中态，不关弹窗
        document.querySelectorAll('#modalLayer .theme-opt').forEach(b => {
          b.classList.toggle('on', b.dataset.theme === t.id);
        });
        toast(`主题已切换为 <b>${t.name}</b>`);
        break;
      }
      case 'trash-restore': {
        const entry = S.trash.find(x => x.id === id);
        if (!entry) break;
        undoTrash(id);
        render(false);
        toast(`已恢复 <b>${esc(entry.title)}</b>`);
        if ((S.trash || []).length) setTimeout(openTrash, 320); else closeModal();
        break;
      }
      case 'trash-ask-clear':
        askConfirm({
          title: '清空回收站？',
          detail: `${S.trash.length} 条记录会被永久删除，删除后无法恢复。`,
          okText: '永久删除',
          onOk: () => { S.trash = []; save(); closeModal(); render(false); toast('回收站已清空'); }
        });
        break;

      case 'pal-run': {
        const idx = Number(el.dataset.idx);
        const item = palItems[idx];
        closeModal();
        if (item) setTimeout(item.run, 30);
        break;
      }
    }
  });

  // 右键：量化习惯减一
  document.addEventListener('contextmenu', function (e) {
    const chip = e.target.closest('[data-act="habit-chip"]');
    if (!chip) return;
    e.preventDefault();
    const hb = habitById(chip.dataset.id);
    if (!hb || hb.target < 2) return;
    setHabit(hb, chip.dataset.date, habitCount(hb, chip.dataset.date) - 1, true);
    render(false);
  });

  document.getElementById('overlay').addEventListener('click', closeDrawer);

  // 输入框回车
  document.addEventListener('keydown', function (e) {
    const tag = e.target.tagName;
    if (e.key === 'Enter' && tag === 'INPUT' && !e.shiftKey) {
      const id = e.target.id;
      if (id === 'quickTask' || id === 'taskAdd') {
        if (addTask(e.target.value, S.ui.cursor)) {
          render(false);
          const el = document.getElementById(id);
          if (el) el.focus();
        }
        e.preventDefault();
      } else if (id === 'quickNote' || id === 'triviaAdd') {
        const date = id === 'triviaAdd' ? e.target.dataset.date : S.ui.cursor;
        if (addNote(e.target.value, date)) {
          render(false);
          const el = document.getElementById(id);
          if (el) el.focus();
        }
        e.preventDefault();
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault(); openPalette(); return;
    }
    // Ctrl Z：撤销刚才的删除（只在焦点不在输入框时接管）
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;
      if (!inField && !document.getElementById('modalLayer').hidden) {
        // 弹层里交给浏览器默认行为
      } else if (!inField && undoLast()) {
        e.preventDefault(); return;
      }
    }
    // Delete / Backspace：删掉当前选中的待办行或目标行（行本身要能用键盘聚焦）
    if ((e.key === 'Delete' || e.key === 'Backspace') && tag !== 'INPUT' && tag !== 'TEXTAREA' && !e.target.isContentEditable) {
      const row = e.target.closest ? e.target.closest('[data-act="task-del"], [data-act="note-del"], [data-act="goal-del"]') : null;
      if (row) { e.preventDefault(); row.click(); return; }
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'Space') {
      e.preventDefault(); openCapture(); return;
    }
    if (e.key === 'Escape') {
      const layer = document.getElementById('modalLayer');
      if (!layer.hidden) { closeModal(); return; }
      closeDrawer();
      return;
    }
    const isPal = document.getElementById('palInput');
    if (isPal && document.activeElement === isPal) {
      if (e.key === 'ArrowDown') { e.preventDefault(); palSel = Math.min(palSel + 1, palItems.length - 1); renderPalList(document.getElementById('palInput').value.trim().toLowerCase()); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); palSel = Math.max(palSel - 1, 0); renderPalList(document.getElementById('palInput').value.trim().toLowerCase()); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const item = palItems[palSel];
        closeModal();
        if (item) setTimeout(item.run, 30);
      }
    }
  });

  // 启动
  applyTheme(currentThemeId(), false);
  const qs = new URLSearchParams(location.search);
  if (qs.get('anim') === 'off') document.documentElement.classList.add('no-anim');
  if (qs.get('theme')) applyTheme(qs.get('theme'));
  if (qs.get('route')) S.ui.route = qs.get('route');
  if (qs.get('view')) S.ui.taskView = qs.get('view');
  if (qs.get('tab')) S.ui.habitTab = qs.get('tab');
  render(true);
  if (qs.get('open')) {
    const parts = qs.get('open').split(':');
    setTimeout(() => {
      if (parts[0] === 'habit') drawerHabit(parts[1]);
      if (parts[0] === 'project') drawerProject(parts[1]);
    }, 60);
  }
  if (qs.get('modal') === 'summary') setTimeout(openSummary, 60);
  if (qs.get('modal') === 'capture') setTimeout(openCapture, 60);


})();
