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
    note: '<path d="M6 3.2h8.2L19 7.9v12.9H6z"/><path d="M14 3.4v4.7h4.8"/><path d="M9 12.2h6M9 15.7h4"/>',
    eye: '<path d="M2.6 12S6 6.4 12 6.4 21.4 12 21.4 12 18 17.6 12 17.6 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="2.8"/>',
    run: '<circle cx="15.2" cy="4.6" r="1.9"/><path d="M9 21l2.4-5.2 3-1.8-2-4-2.8 1L7 14"/><path d="M14.4 14l2.4 3 .6 4"/>',
    moon: '<path d="M20 14.6A8.1 8.1 0 019.4 4a8.5 8.5 0 1010.6 10.6z"/>',
    coffee: '<path d="M4.5 8h11.6v4.6a4.8 4.8 0 01-4.8 4.8H9.3a4.8 4.8 0 01-4.8-4.8V8z"/><path d="M16.1 9.2h2.2a2.4 2.4 0 010 4.8h-2.2"/><path d="M4.5 21h13"/>',
    phone: '<rect x="6.4" y="2.6" width="11.2" height="18.8" rx="2.8"/><path d="M10.8 18.4h2.4"/>',
    zap: '<path d="M13.2 2L4.6 13.4H11l-1 8.6 8.8-12h-6.4L13.2 2z"/>',
    inbox: '<path d="M3.6 13.4L6.4 4.6h11.2l2.8 8.8v5.2a1.8 1.8 0 01-1.8 1.8H5.4a1.8 1.8 0 01-1.8-1.8v-5.2z"/><path d="M3.6 13.4h4l1.4 2.4h6l1.4-2.4h4"/>',
    cycle: '<path d="M20.4 11.2a8.6 8.6 0 00-14.9-4.3L3 9.4"/><path d="M3.6 12.8a8.6 8.6 0 0014.9 4.3L21 14.6"/><path d="M3 5.2v4.2h4.2"/><path d="M21 18.8v-4.2h-4.2"/>',
    leaf: '<path d="M4.4 19.6C4 12.4 9.2 6.4 20 4.4c.6 8.6-4.6 14.6-11 15"/><path d="M4.4 19.6c2.4-3.5 5.7-5.5 9.1-6.3"/>',
    scissors: '<circle cx="6" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><path d="M20 4L8.4 15.6"/><path d="M20 20L8.4 8.4"/>',
    clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.2V12l3.4 2"/>',
    arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    heart: '<path d="M12 20.2C7.4 16.9 4.2 13.9 4.2 10.5 4.2 8 6.1 6.2 8.4 6.2c1.4 0 2.7.7 3.6 1.9.9-1.2 2.2-1.9 3.6-1.9 2.3 0 4.2 1.8 4.2 4.3 0 3.4-3.2 6.4-7.8 9.7z"/>',
    camera: '<path d="M4.2 8.2h2.9l1.5-2.4h6.8l1.5 2.4h2.9a1.3 1.3 0 011.3 1.3v8a1.3 1.3 0 01-1.3 1.3H4.2a1.3 1.3 0 01-1.3-1.3v-8a1.3 1.3 0 011.3-1.3z"/><circle cx="12" cy="13.6" r="3.3"/>',
    music: '<path d="M9 18.2V5.8l11-2.2v12.6"/><circle cx="6.6" cy="18.2" r="2.4"/><circle cx="17.6" cy="16.2" r="2.4"/>',
    trash: '<path d="M4 6.6h16"/><path d="M9.4 6.6V4.7c0-.6.5-1.1 1.1-1.1h3c.6 0 1.1.5 1.1 1.1v1.9"/><path d="M6.2 6.6l.9 12.6c.06.9.8 1.6 1.7 1.6h6.4c.9 0 1.64-.7 1.7-1.6l.9-12.6"/><path d="M10.2 10.4v6.6M13.8 10.4v6.6"/>',
    restore: '<path d="M3.4 11.6l8.6-7.4 8.6 7.4"/><path d="M5.9 10.2v9.2h12.2v-9.2"/><path d="M12 20.2v-6M9.4 16.4l2.6-2.6 2.6 2.6"/>',
    syncRing: '<path d="M20.6 12a8.6 8.6 0 11-3.1-6.6"/><path d="M17.6 2.4v3.8h-3.8"/>',
    cloudCheck: '<path d="M7.2 18h9.4a3.6 3.6 0 00.5-7.2 5.2 5.2 0 00-9.9-1.3A3.7 3.7 0 007.2 18z"/><path d="M9.9 13.9l1.9 1.9 3.4-3.5"/>'
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
      { id: 'w1', name: '富士 X100VI 相机', price: 12990, want: 5, status: 'done', date: iso(shift(TODAY, -115)), note: '银色机身，配了一条皮背带。',
        items: [{ id: 'wi1', title: '去线下店摸一下手感', done: true }, { id: 'wi2', title: '存够 13000', done: true }, { id: 'wi3', title: '配皮背带', done: true }] },
      { id: 'w2', name: 'Herman Miller Aeron 椅子', price: 8900, want: 5, status: 'want', note: '每天坐十个小时，值得。',
        items: [{ id: 'wi4', title: '线下试坐 A/B/C 三种尺寸', done: true }, { id: 'wi5', title: '等双十一比价', done: false }] },
      { id: 'w3', name: '去冰岛看一次极光', price: 28000, want: 5, status: 'want', note: '计划 2027 年 2 月。',
        items: [{ id: 'wi6', title: '办申根签证', done: false }, { id: 'wi7', title: '查 2 月极光概率与路线', done: false }, { id: 'wi8', title: '攒够预算', done: false }] },
      { id: 'w4', name: '学冲黑白胶片', price: 1200, want: 4, status: 'want', note: '先上完暗房课。', items: [] },
      { id: 'w5', name: '一台 3D 打印机', price: 2499, want: 3, status: 'want', note: '', items: [] },
      { id: 'w6', name: '换一副降噪耳机', price: 1999, want: 2, status: 'want', note: '', items: [] }
    ];

    // 日常记录：一件事反复做，每次追加一条「哪天做的 + 预计下次」
    const routines = [
      {
        id: 'rt1', name: '洗浴巾', icon: 'droplet', cycleDays: 14, note: '两条轮换，攒够一周一起洗。',
        logs: [
          { id: 'rl1', date: iso(shift(TODAY, -30)), next: iso(shift(TODAY, -16)), note: '' },
          { id: 'rl2', date: iso(shift(TODAY, -16)), next: iso(shift(TODAY, 2)), note: '顺便把浴袍也洗了' }
        ]
      },
      {
        id: 'rt2', name: '换床单被套', icon: 'moon', cycleDays: 21, note: '',
        logs: [
          { id: 'rl3', date: iso(shift(TODAY, -66)), next: null, note: '' },
          { id: 'rl4', date: iso(shift(TODAY, -45)), next: null, note: '' },
          { id: 'rl5', date: iso(shift(TODAY, -24)), next: null, note: '晒了一下午，有太阳味' }
        ]
      },
      {
        id: 'rt3', name: '给猫剪指甲', icon: 'scissors', cycleDays: 30, note: '只剪前爪，后爪它不让碰。',
        logs: [
          { id: 'rl6', date: iso(shift(TODAY, -62)), next: null, note: '' },
          { id: 'rl7', date: iso(shift(TODAY, -31)), next: null, note: '这次意外地配合' }
        ]
      },
      {
        id: 'rt4', name: '给绿萝浇水', icon: 'leaf', cycleDays: 7, note: '土干透了再浇，别浇半截。',
        logs: [
          { id: 'rl8', date: iso(shift(TODAY, -21)), next: null, note: '' },
          { id: 'rl9', date: iso(shift(TODAY, -14)), next: null, note: '' },
          { id: 'rl10', date: iso(shift(TODAY, -7)), next: null, note: '顺便分了一盆出来' }
        ]
      },
      {
        id: 'rt5', name: '清洗咖啡机', icon: 'coffee', cycleDays: 30, note: '',
        logs: [
          { id: 'rl11', date: iso(shift(TODAY, -58)), next: null, note: '' },
          { id: 'rl12', date: iso(shift(TODAY, -29)), next: null, note: '换了滤芯' }
        ]
      },
      {
        id: 'rt6', name: '备份手机照片', icon: 'db', cycleDays: null, note: '想起来就做一次，不设周期。',
        logs: [
          { id: 'rl13', date: iso(shift(TODAY, -120)), next: null, note: '' },
          { id: 'rl14', date: iso(shift(TODAY, -35)), next: null, note: '导了 8GB' }
        ]
      }
    ];

    // 兴趣爱好：喜欢的事留个位置，每次投入就记一笔
    const hobbies = [
      {
        id: 'hb1', name: '胶片摄影', icon: 'camera', tag: '摄影', level: 5, note: '拍完的卷攒到十二卷再一起冲。',
        logs: [
          { id: 'hg1', date: iso(shift(TODAY, -3)), minutes: 90, note: '在老城区扫街，拍了两卷。' },
          { id: 'hg2', date: iso(shift(TODAY, -18)), minutes: 45, note: '给爸妈拍了半卷人像。' },
          { id: 'hg3', date: iso(shift(TODAY, -41)), minutes: 60, note: '' }
        ]
      },
      {
        id: 'hb2', name: '烘焙', icon: 'coffee', tag: '厨房', level: 4, note: '欧包和司康目前比较稳。',
        logs: [
          { id: 'hg4', date: iso(shift(TODAY, -2)), minutes: 120, note: '试了全麦欧包，裂口很漂亮。' },
          { id: 'hg5', date: iso(shift(TODAY, -15)), minutes: 90, note: '' }
        ]
      },
      {
        id: 'hb3', name: '夜跑 5 公里', icon: 'run', tag: '运动', level: 3, note: '',
        logs: [
          { id: 'hg6', date: iso(shift(TODAY, -1)), minutes: 32, note: '配速稳住了，很舒服。' },
          { id: 'hg7', date: iso(shift(TODAY, -5)), minutes: 35, note: '' },
          { id: 'hg8', date: iso(shift(TODAY, -9)), minutes: 34, note: '' }
        ]
      },
      {
        id: 'hb4', name: '钢笔字', icon: 'pen', tag: '手写', level: 3, note: '临的是《灵飞经》。',
        logs: [
          { id: 'hg9', date: iso(shift(TODAY, -6)), minutes: 25, note: '今天写竖钩顺手。' }
        ]
      }
    ];

    // 备忘录：一篇一篇写，用 Markdown 排版
    const ago = h => new Date(Date.now() - h * 3600000).toISOString();
    const memos = [
      {
        id: 'mn1', title: '水星计划 · 下一步', created: ago(52), updated: ago(2),
        content: [
          '# 水星计划 · 下一步',
          '',
          '把这套原型变成真正能用的桌面软件。**先把十个模块做对**，再谈别的。',
          '',
          '## 这周要做的',
          '',
          '- [x] 信息架构定稿',
          '- [x] 日程待办模块',
          '- [ ] 备忘录模块（Markdown 渲染）',
          '- [ ] 回收站统一入口',
          '',
          '## 记一下',
          '',
          '> 慢一点没关系，别停。',
          '',
          '| 模块 | 状态 | 备注 |',
          '| --- | --- | --- |',
          '| 今日总览 | 进行中 | 还差完成度展示 |',
          '| 备忘录 | 刚建 | 支持 Markdown |',
          '',
          '快捷键 `Ctrl K` 跳转，`Ctrl Shift Space` 快速记录。'
        ].join('\n')
      },
      {
        id: 'mn2', title: '书房改造 · 待买清单', created: ago(120), updated: ago(26),
        content: [
          '# 书房改造',
          '',
          '书桌、书架已经就位，剩下软装。',
          '',
          '## 待买',
          '',
          '1. 遮光窗帘（米色，量好再下单）',
          '2. 一盏落地灯',
          '3. 桌面收纳盒 ×2',
          '',
          '## 尺寸',
          '',
          '- 窗户：宽 168 cm，高 210 cm',
          '- 书桌：140 × 70 cm',
          '',
          '> 周六上午量窗帘，下午去建材市场。'
        ].join('\n')
      },
      {
        id: 'mn3', title: '读书笔记：《设计中的设计》', created: ago(300), updated: ago(70),
        content: [
          '# 《设计中的设计》',
          '',
          '原研哉 著 · 读完第 6 章',
          '',
          '## 摘抄',
          '',
          '> 设计不是一种技能，而是捕捉事物本质的感觉能力。',
          '',
          '## 想法',
          '',
          '- 「空」不是没有，是留出接纳的可能',
          '- 信息建筑：把复杂的东西重新排列，而不是删掉',
          '',
          '下一步：读第 7 章，顺手写一篇 300 字的短评。'
        ].join('\n')
      }
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
      tasks, projects, goals, habits, wishes, trivia, achievements, routines, hobbies, memos, trash: [],
      ui: {
        route: 'today', cursor: k, taskView: 'day', habitTab: 'build', routineTab: 'all',
        goalId: 'g22', expanded: { g1: false, g2: true, g22: true, g12: true, g13: true, g3: true },
        focusDone: {}, calMonth: null, triviaDay: k, memoId: 'mn1'
      }
    };
  }

  // 空数据：清空本机后按云端内容重建（?empty=1 时用），不带演示数据
  function emptyState() {
    return {
      v: 2,
      meta: { tomb: {}, ut: 0 },
      tasks: [], projects: [], goals: [], habits: [], wishes: [], trivia: [], achievements: [],
      routines: [], hobbies: [], memos: [], trash: [],
      ui: {
        route: 'today', cursor: TODAY_K, taskView: 'day', habitTab: 'build', routineTab: 'all',
        goalId: null, expanded: {}, focusDone: {}, calMonth: null, triviaDay: TODAY_K, memoId: null
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
  if (!S) S = location.search.indexOf('empty') >= 0 ? emptyState() : seed();

  // 旧版本（没有回收站 / 没有日常记录）的数据升级一下，不丢东西
  if (!Array.isArray(S.trash)) S.trash = [];
  if (!Array.isArray(S.routines)) S.routines = [];
  if (!Array.isArray(S.hobbies)) S.hobbies = [];
  if (!Array.isArray(S.memos)) S.memos = [];
  S.routines.forEach(r => { if (!Array.isArray(r.logs)) r.logs = []; });
  S.hobbies.forEach(h => { if (!Array.isArray(h.logs)) h.logs = []; });
  S.wishes.forEach(w => { if (!Array.isArray(w.items)) w.items = []; });
  if (!S.ui) S.ui = {};
  if (!S.ui.routineTab) S.ui.routineTab = 'all';
  if (S.v !== 2) { S.v = 2; }

  // ---------- 多设备同步：每条记录的修改时间 ----------
  // 每条记录带一个 ut（修改时间戳），内存里带墓碑 tomb，合并时按条目取新、按墓碑删旧。
  const SYNC_COLLECTIONS = ['tasks', 'projects', 'goals', 'habits', 'wishes', 'trivia', 'achievements', 'routines', 'hobbies', 'memos', 'trash'];

  if (!S.meta || typeof S.meta !== 'object') S.meta = {};
  if (!S.meta.tomb || typeof S.meta.tomb !== 'object') S.meta.tomb = {};
  if (!S.meta.deviceId) S.meta.deviceId = 'dev-' + Math.random().toString(36).slice(2, 10);

  let maxSeenUt = 0;
  (function scanMaxUt() {
    SYNC_COLLECTIONS.forEach(coll => (S[coll] || []).forEach(it => {
      if (it && Number(it.ut) > maxSeenUt) maxSeenUt = Number(it.ut);
    }));
    Object.keys(S.meta.tomb).forEach(k => { if (Number(S.meta.tomb[k]) > maxSeenUt) maxSeenUt = Number(S.meta.tomb[k]); });
  })();

  function nextUt() {
    const t = Math.max(Date.now(), maxSeenUt + 1);
    maxSeenUt = t;
    return t;
  }

  function itemSig(item) {
    const o = {};
    Object.keys(item).forEach(k => { if (k !== 'ut') o[k] = item[k]; });
    return JSON.stringify(o);
  }

  function indexState(state) {
    const map = {};
    SYNC_COLLECTIONS.forEach(coll => {
      (state[coll] || []).forEach(it => {
        if (!it || it.id == null) return;
        map[coll + ':' + it.id] = itemSig(it);
      });
    });
    return map;
  }

  // 老数据没有 ut，升级时统一补一个基准时间，之后每次改动只更新被改的那几条
  (function stampLegacy() {
    const t = nextUt();
    let stamped = false;
    SYNC_COLLECTIONS.forEach(coll => (S[coll] || []).forEach(it => {
      if (it && it.ut == null) { it.ut = t; stamped = true; }
    }));
    if (stamped) { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 忽略 */ } }
  })();

  let syncBase = indexState(S);

  // 保存时对比上一次落盘的快照，找出新增/修改/删除并打时间戳与墓碑
  function stampChanges() {
    const prev = syncBase;
    const next = indexState(S);
    const t = nextUt();
    let changed = false;
    SYNC_COLLECTIONS.forEach(coll => (S[coll] || []).forEach(it => {
      if (!it || it.id == null) return;
      const key = coll + ':' + it.id;
      if (!prev || prev[key] !== next[key]) { it.ut = t; changed = true; }
    }));
    if (prev) {
      Object.keys(prev).forEach(key => {
        if (!next[key] && !S.meta.tomb[key]) { S.meta.tomb[key] = t; changed = true; }
      });
    }
    syncBase = next;
    if (changed) onLocalChange();
  }

  function onLocalChange() {
    S.meta.ut = nextUt();
    // 用户第一次真正改动后就不再是演示数据，也不再每天重置
    if (S.meta.demo) { S.meta.demo = false; S.meta.seedDate = null; }
    scheduleAutoSync();
  }

  function save() {
    try { stampChanges(); } catch (e) { /* 同步标记失败不影响保存 */ }
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 无痕模式等场景忽略 */ }
  }

  const BACKUP_FORMAT = 'mercury-plan-backup';
  const BACKUP_VERSION = 1;
  const BACKUP_ARRAYS = ['tasks', 'projects', 'goals', 'habits', 'wishes', 'trivia', 'achievements', 'routines', 'hobbies', 'memos', 'trash'];

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
      // 老备份里没有日常记录 / 兴趣爱好，补成空数组，别让校验把人拦在门外
      if (payload.data && !Array.isArray(payload.data.routines)) payload.data.routines = [];
      if (payload.data && !Array.isArray(payload.data.hobbies)) payload.data.hobbies = [];
      if (payload.data && !Array.isArray(payload.data.memos)) payload.data.memos = [];
      validateBackup(payload);
      const imported = clone(payload.data);
      imported.routines.forEach(r => { if (!Array.isArray(r.logs)) r.logs = []; });
      imported.hobbies.forEach(h => { if (!Array.isArray(h.logs)) h.logs = []; });
      askConfirm({
        title: '导入备份并覆盖当前数据？',
        detail: `将替换当前全部数据（${imported.tasks.length} 条待办、${imported.projects.length} 个项目、${imported.routines.length} 个日常事项）。此操作不可自动撤销，请确认你已准备好这份备份。`,
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

  // ---------- 坚果云云备份（WebDAV） ----------
  const CLOUD_SERVER = 'https://dav.jianguoyun.com/dav/';
  const CLOUD_FOLDER = 'MercuryPlan';
  const CLOUD_CFG_KEY = 'mercury.webdav';

  function cloudCfg() {
    try { return JSON.parse(localStorage.getItem(CLOUD_CFG_KEY)) || {}; } catch (e) { return {}; }
  }

  function saveCloudCfg(cfg) {
    try { localStorage.setItem(CLOUD_CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* 忽略 */ }
  }

  function tauriInvoke(cmd, args) {
    const invoke = window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke;
    if (!invoke) return Promise.reject(new Error('桌面功能不可用，请重新构建应用'));
    return invoke(cmd, args);
  }

  // 测试用：清空本机数据。opt.empty=true → 以空数据重启，让自动同步从云端整份拉回；
  // 否则重载成演示数据，并关掉自动同步（不关的话几秒后云端数据又会被合并回来）。
  // 账号、主题、云端文件都不动。
  function wipeLocal(opt) {
    const o = opt || {};
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(SYNC_MARK_KEY);
      localStorage.removeItem(SYNC_BEFORE_KEY);
      localStorage.removeItem('mercury.sync.at');
    } catch (e) { /* 忽略 */ }
    const cfg = cloudCfg();
    cfg.autoSync = o.empty ? true : false;
    delete cfg.lastSyncError;
    saveCloudCfg(cfg);
    if (o.empty) location.href = location.pathname + '?empty=1';
    else location.reload();
  }

  function readCloudInputs() {
    const cfg = cloudCfg();
    const uEl = document.getElementById('jdUser');
    const pEl = document.getElementById('jdPass');
    if (uEl) cfg.user = uEl.value.trim();
    if (pEl && pEl.value) cfg.pass = pEl.value; // 留空表示沿用已保存的密码
    if (!cfg.user) throw new Error('请先填写坚果云账号（注册邮箱）');
    if (!cfg.pass) throw new Error('请先填写坚果云应用密码（在坚果云「安全选项」里生成）');
    saveCloudCfg(cfg);
    return cfg;
  }

  function cloudBusy(btnId, busy, text) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = busy;
    if (busy) {
      btn.dataset.orig = btn.innerHTML;
      btn.innerHTML = esc(text || '处理中…');
    } else if (btn.dataset.orig) {
      btn.innerHTML = btn.dataset.orig;
    }
  }

  function cloudFail(e, prefix) {
    // Tauri 的 invoke 失败时把 Rust 的 Err(String) 原样抛过来，可能是字符串
    const msg = typeof e === 'string' ? e : (e && e.message) || '未知错误';
    toast(`${prefix}：${esc(msg)}`);
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function fmtCloudTime(iso) {
    if (!iso) return '从未备份';
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function fmtCloudSize(n) {
    if (!n) return '';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  async function cloudTest() {
    let cfg;
    try { cfg = readCloudInputs(); } catch (e) { toast(esc(e.message)); return; }
    cloudBusy('jdTest', true, '连接中…');
    try {
      await tauriInvoke('webdav_test', { server: CLOUD_SERVER, username: cfg.user, password: cfg.pass, folder: CLOUD_FOLDER });
      toast('坚果云连接成功');
    } catch (e) {
      cloudFail(e, '连接失败');
    } finally {
      cloudBusy('jdTest', false);
    }
  }

  async function cloudBackup() {
    let cfg;
    try { cfg = readCloudInputs(); } catch (e) { toast(esc(e.message)); return; }
    cloudBusy('jdBackup', true, '上传中…');
    try {
      const now = new Date();
      const name = `mercury-plan-backup-${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}.json`;
      const content = JSON.stringify(createBackup(), null, 2);
      const base = { server: CLOUD_SERVER, username: cfg.user, password: cfg.pass, folder: CLOUD_FOLDER };
      await tauriInvoke('webdav_upload', { ...base, filename: name, content });
      try {
        await tauriInvoke('webdav_upload', { ...base, filename: 'latest.json', content });
      } catch (e) { /* latest.json 只是固定入口，失败不影响本次备份 */ }
      cfg.lastBackupAt = now.toISOString();
      saveCloudCfg(cfg);
      const el = document.getElementById('jdLast');
      if (el) el.textContent = `上次云备份：${fmtCloudTime(cfg.lastBackupAt)}`;
      toast(`已备份到坚果云 <b>${esc(name.replace('mercury-plan-backup-', '').replace('.json', ''))}</b>`);
    } catch (e) {
      cloudFail(e, '云备份失败');
    } finally {
      cloudBusy('jdBackup', false);
    }
  }

  // 坚果云 PROPFIND 返回的是 RFC1123（Thu, 06 Nov 2026 05:08:24 GMT），转成本地时间
  function fmtDavTime(s) {
    if (!s) return '';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function cloudNameToTime(name) {
    const m = name.match(/^mercury-plan-backup-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.json$/);
    if (!m) return '';
    return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}`;
  }

  async function cloudList() {
    let cfg;
    try { cfg = readCloudInputs(); } catch (e) { toast(esc(e.message)); return; }
    cloudBusy('jdList', true, '读取中…');
    let files;
    try {
      files = await tauriInvoke('webdav_list', { server: CLOUD_SERVER, username: cfg.user, password: cfg.pass, folder: CLOUD_FOLDER });
    } catch (e) {
      cloudBusy('jdList', false);
      cloudFail(e, '读取云端备份失败');
      return;
    }
    cloudBusy('jdList', false);
    files = (files || []).sort((a, b) => (a.name < b.name ? 1 : -1));
    const rows = files.map(f => {
      const t = cloudNameToTime(f.name);
      const isSync = f.name === 'sync.json';
      const label = t || (isSync ? 'sync.json（实时同步文件）' : (f.name === 'latest.json' ? '最新一份（固定入口）' : esc(f.name)));
      const meta = [esc(fmtCloudSize(f.size)), fmtDavTime(f.modified) ? `${isSync ? '更新于' : ''}${fmtDavTime(f.modified)}`.trim() : ''].filter(Boolean).join(' · ');
      return `<div class="cloud-row">
        <span class="cloud-name"><b>${label}</b><span>${meta}</span></span>
        <span class="cloud-ops">
          <button class="btn sm" data-act="jd-merge" data-id="${esc(f.name)}">合并</button>
          <button class="btn sm" data-act="jd-restore" data-id="${esc(f.name)}">覆盖</button>
          <button class="btn sm" data-act="jd-del" data-id="${esc(f.name)}">删除</button>
        </span>
      </div>`;
    }).join('');
    openModal(modalShell('坚果云云端备份', `/${CLOUD_FOLDER} · 共 ${files.length} 份备份`,
      rows || '<div class="muted backup-hint">云端还没有备份，回到设置点「备份到坚果云」创建第一份。</div>',
      '<button class="btn" data-act="settings">返回设置</button><button class="btn btn-amber" data-act="m-close">关闭</button>'));
  }

  async function cloudRestore(file) {
    const cfg = cloudCfg();
    try {
      const raw = await tauriInvoke('webdav_download', { server: CLOUD_SERVER, username: cfg.user, password: cfg.pass, folder: CLOUD_FOLDER, filename: file });
      const payload = JSON.parse(raw);
      // 老备份补齐字段，和本地导入保持一致
      if (payload.data && !Array.isArray(payload.data.routines)) payload.data.routines = [];
      if (payload.data && !Array.isArray(payload.data.hobbies)) payload.data.hobbies = [];
      if (payload.data && !Array.isArray(payload.data.memos)) payload.data.memos = [];
      validateBackup(payload);
      const imported = clone(payload.data);
      imported.routines.forEach(r => { if (!Array.isArray(r.logs)) r.logs = []; });
      imported.hobbies.forEach(h => { if (!Array.isArray(h.logs)) h.logs = []; });
      askConfirm({
        title: '从坚果云恢复备份？',
        detail: `将用云端备份（${fmtCloudTime(payload.exportedAt)}）覆盖当前全部数据（${imported.tasks.length} 条待办、${imported.projects.length} 个项目）。此操作不可自动撤销。`,
        okText: '覆盖并恢复',
        onOk: () => {
          S = imported;
          S.meta = { ...(S.meta || {}), demo: false, importedAt: new Date().toISOString() };
          if (!Array.isArray(S.trash)) S.trash = [];
          if (payload.theme) applyTheme(payload.theme);
          save();
          closeModal();
          render(true);
          toast('云端备份已恢复');
        }
      });
    } catch (e) {
      cloudFail(e, '恢复失败');
    }
  }

  function cloudDelete(file) {
    const cfg = cloudCfg();
    askConfirm({
      title: `删除云端备份「${file}」？`,
      detail: '只删除坚果云上的这份备份文件，不影响本机数据。',
      okText: '删除',
      onOk: async () => {
        try {
          await tauriInvoke('webdav_delete', { server: CLOUD_SERVER, username: cfg.user, password: cfg.pass, folder: CLOUD_FOLDER, filename: file });
          toast('云端备份已删除');
          cloudList();
        } catch (e) {
          cloudFail(e, '删除失败');
        }
      }
    });
  }

  // ---------- 多设备同步（按条目合并，不覆盖整包） ----------
  const SYNC_FILE = 'sync.json';
  const SYNC_FORMAT = 'mercury-plan-sync';
  const SYNC_BEFORE_KEY = 'mercury.sync.before';
  const SYNC_GAP = 20000;        // 两次自动同步之间的最小间隔
  const SYNC_DEBOUNCE = 6000;    // 改动停下多久后自动上传
  // 墓碑容差：另一台设备把已删条目重新打了时间戳（ut 比墓碑稍微新一点）时，
  // 不能当成「更新」收回来，否则这条会永远删不掉。墓碑后 10 分钟内一律按删除处理。
  const TOMB_GRACE = 10 * 60 * 1000;
  let syncTimer = null;
  let syncReady = false;
  let syncing = false;
  let syncPending = false;
  let syncLoopTimer = null;
  let lastCatchUpAt = 0;
  let catchUpInstalled = false;

  function autoSyncOn() {
    const cfg = cloudCfg();
    return cfg.autoSync !== false && !!cfg.user && !!cfg.pass;
  }

  function errText(e) { return typeof e === 'string' ? e : (e && e.message) || ''; }

  function syncParams() {
    const cfg = cloudCfg();
    if (!cfg.user) throw new Error('请先填写坚果云账号（注册邮箱）');
    if (!cfg.pass) throw new Error('请先填写坚果云应用密码');
    return { cfg, base: { server: CLOUD_SERVER, username: cfg.user, password: cfg.pass, folder: CLOUD_FOLDER } };
  }

  function pruneTomb(tomb) {
    const limit = Date.now() - 180 * 86400000;
    const out = {};
    Object.keys(tomb || {}).forEach(k => { if (Number(tomb[k]) >= limit) out[k] = tomb[k]; });
    return out;
  }

  // 习惯打卡取两边较多次数，日常记录按 id 并集，避免整条覆盖时丢掉另一台设备的记录
  function unionCounts(a, b) {
    const out = { ...(b || {}) };
    Object.keys(a || {}).forEach(k => {
      out[k] = Math.max(Number(a[k]) || 0, Number(out[k]) || 0);
    });
    return out;
  }

  function unionById(a, b) {
    const list = Array.isArray(b) ? b.slice() : [];
    const seen = new Set(list.map(x => x && x.id));
    (Array.isArray(a) ? a : []).forEach(x => { if (x && !seen.has(x.id)) { seen.add(x.id); list.push(x); } });
    return list;
  }

  function mergeItem(coll, local, remote) {
    const lu = Number(local.ut) || 0;
    const ru = Number(remote.ut) || 0;
    const pick = lu > ru ? local : (ru > lu ? remote : local);
    if (coll === 'habits') return { ...pick, checks: unionCounts(local.checks, remote.checks) };
    if (coll === 'routines') return { ...pick, logs: unionById(local.logs, remote.logs) };
    if (coll === 'wishes') return { ...pick, items: unionById(local.items, remote.items) };
    if (coll === 'hobbies') return { ...pick, logs: unionById(local.logs, remote.logs) };
    return pick;
  }

  // 合并两份数据：同 id 取 ut 新的，各自独有的条目都保留，墓碑时间晚于记录则视为删除
  function mergeStates(localS, remoteS) {
    const stats = { added: 0, updated: 0, deleted: 0, bumped: 0 };
    const tomb = { ...((localS.meta && localS.meta.tomb) || {}) };
    const rTomb = (remoteS && remoteS.meta && remoteS.meta.tomb) || {};
    Object.keys(rTomb).forEach(k => { if (!tomb[k] || rTomb[k] > tomb[k]) tomb[k] = rTomb[k]; });

    const removedHere = []; // 本机有、被远端墓碑删掉的条目

    const out = {};
    SYNC_COLLECTIONS.forEach(coll => {
      const lmap = new Map();
      const rmap = new Map();
      (localS[coll] || []).forEach(it => { if (it && it.id != null) lmap.set(it.id, it); });
      (((remoteS && remoteS[coll]) || [])).forEach(it => { if (it && it.id != null) rmap.set(it.id, it); });
      const ids = new Set([...lmap.keys(), ...rmap.keys()]);
      const list = [];
      ids.forEach(id => {
        const l = lmap.get(id);
        const r = rmap.get(id);
        let item;
        if (l && r) {
          item = mergeItem(coll, l, r);
          if (itemSig(l) !== itemSig(r)) stats.updated++;
        } else if (l) {
          item = l;
        } else {
          item = r;
          stats.added++;
        }
        const t = tomb[coll + ':' + id] || 0;
        const ut = Number(item.ut) || 0;
        if (t && (t >= ut || (ut - t <= TOMB_GRACE && !item.rv))) {
          stats.deleted++;
          // 墓碑推进到条目之后：否则对方每次同步都把这条当「更新」送回来，永远删不干净
          const nx = Math.max(t, ut + 1);
          if (nx > t) { tomb[coll + ':' + id] = nx; stats.bumped++; }
          if (l && coll !== 'trash') removedHere.push({ coll, item });
          return;
        }
        list.push(item);
      });
      out[coll] = list;
    });

    // 被远端删掉的内容在回收站留一条，误删还能捡回来
    if (removedHere.length) {
      const have = new Set();
      (out.trash || []).forEach(e => trashSourceKeys(e).forEach(k => have.add(k)));
      const extra = [];
      removedHere.forEach(x => {
        const key = x.coll + ':' + x.item.id;
        if (have.has(key)) return;   // 已经有同一内容的回收站记录
        have.add(key);
        const it = x.item;
        extra.push({
          id: 'rt-' + x.coll + '-' + it.id,   // 固定 id，保证反复同步不会重复入站
          kind: TRASH_KIND[x.coll] || x.coll,
          title: it.title || it.text || it.name || '未命名',
          count: 1,
          meta: it.date || it.time || '',
          at: Date.now(),
          ut: nextUt(),
          items: { [x.coll]: [it] }
        });
      });
      if (extra.length) out.trash = extra.concat(out.trash || []);
    }

    // 同一条内容只留一条回收站记录（优先留手动删除的那条）
    if (Array.isArray(out.trash) && out.trash.length) {
      const realKeys = new Set();
      out.trash.forEach(e => {
        if (!/^rt-/.test(String(e.id))) trashSourceKeys(e).forEach(k => realKeys.add(k));
      });
      out.trash = out.trash.filter(e =>
        !/^rt-/.test(String(e.id)) || !trashSourceKeys(e).some(k => realKeys.has(k)));
    }

    out.v = localS.v;
    out.ui = localS.ui;
    out.meta = { ...(localS.meta || {}), tomb: pruneTomb(tomb) };
    const lu = Number(localS.meta && localS.meta.ut) || 0;
    const ru = Number(remoteS && remoteS.meta && remoteS.meta.ut) || 0;
    out.meta.ut = Math.max(lu, ru);
    // 让本机后续产生的 ut 高于已知墓碑，恢复/编辑才能真正盖过删除
    Object.keys(out.meta.tomb).forEach(k => {
      const v = Number(out.meta.tomb[k]) || 0;
      if (v > maxSeenUt) maxSeenUt = v;
    });
    return { state: out, stats };
  }

  function dataSig(state) {
    return JSON.stringify(SYNC_COLLECTIONS.map(c => (state[c] || []).map(itemSig)));
  }

  // 重绘时避开正在输入的框，防止同步把光标顶掉
  function safeRender(left) {
    const remain = left == null ? 6 : left;
    const ae = document.activeElement;
    const editing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
    if (editing && remain > 0) { setTimeout(() => safeRender(remain - 1), 1500); return; }
    render(true);
  }

  function syncPayload() {
    return {
      format: SYNC_FORMAT,
      version: 1,
      app: '水星计划',
      updatedAt: new Date().toISOString(),
      deviceId: S.meta.deviceId,
      data: S
    };
  }

  // ---------- 同步状态标记：记录「哪条内容已经传上云」 ----------
  const SYNC_MARK_KEY = 'mercury.sync.marks';
  let lastFailAt = 0;

  function loadMarks() {
    try { return JSON.parse(localStorage.getItem(SYNC_MARK_KEY) || '{}') || {}; } catch (e) { return {}; }
  }

  function markAllSynced(state) {
    const marks = {};
    SYNC_COLLECTIONS.forEach(coll => (state[coll] || []).forEach(it => {
      if (it && it.id != null) marks[coll + ':' + it.id] = Number(it.ut) || 0;
    }));
    marks.__at = Date.now();
    try { localStorage.setItem(SYNC_MARK_KEY, JSON.stringify(marks)); } catch (e) { /* 忽略 */ }
  }

  function isSynced(coll, item) {
    if (!item || item.id == null) return false;
    const marks = loadMarks();
    return (Number(marks[coll + ':' + item.id]) || 0) >= (Number(item.ut) || 0);
  }

  // 列表里的同步状态：待上传转圈，已上传显示云勾；没配账号就不显示
  function syncMark(coll, item) {
    const cfg = cloudCfg();
    if (!cfg.user || !cfg.pass) return '';
    if (isSynced(coll, item)) {
      return `<span class="sync-mark done" title="已同步到云端">${icon('cloudCheck', 11)}</span>`;
    }
    return `<span class="sync-mark pending" title="等待同步到云端">${icon('syncRing', 11)}</span>`;
  }

  // 自动同步失败时也给个提示，同一分钟内只提示一次
  function syncFailNote(e) {
    const now = Date.now();
    if (now - lastFailAt < 60000) return;
    lastFailAt = now;
    toast(`<b>云端同步失败</b>：${esc(errText(e) || '未知错误')}`);
  }

  function syncStatusText(cfg) {
    if (cfg.lastSyncError) return `上次同步失败：${cfg.lastSyncError.msg}`;
    return `上次同步：${fmtCloudTime(cfg.lastSyncAt)}`;
  }

  function updateSyncLabels() {
    const cfg = cloudCfg();
    const a = document.getElementById('jdSyncLast');
    if (a) a.textContent = syncStatusText(cfg);
    const b = document.getElementById('jdAutoState');
    if (b) b.textContent = cfg.autoSync === false ? '已关闭' : '已开启';
    const c = document.getElementById('jdLast');
    if (c) c.textContent = `上次云备份：${fmtCloudTime(cfg.lastBackupAt)}`;
    updateSyncBadge();
  }

  // 拉取云端 → 与本机按条目合并 → 写回本机 → 把合并结果传回云端
  async function syncNow(opts) {
    const o = opts || {};
    if (o.silent && S.meta && S.meta.demo) return null; // 演示数据不上传
    let cfg, base;
    try { ({ cfg, base } = syncParams()); } catch (e) { if (!o.silent) toast(esc(e.message)); return null; }
    if (syncing) { syncPending = true; return null; }
    syncing = true;
    const btn = document.getElementById(o.btnId || 'jdSync');
    if (btn) { btn.disabled = true; btn.dataset.orig = btn.innerHTML; btn.innerHTML = esc('同步中…'); }

    let result = null;
    try {
      let remote = null;
      let first = false;
      try {
        const raw = await tauriInvoke('webdav_download', { ...base, filename: SYNC_FILE });
        const payload = JSON.parse(raw);
        if (payload && payload.format === SYNC_FORMAT && payload.data) remote = payload.data;
      } catch (e) {
        if (/不存在|404/.test(errText(e))) first = true;
        else throw e;
      }

      let stats = { added: 0, updated: 0, deleted: 0 };
      let touched = false;
      if (remote) {
        const merged = mergeStates(S, remote);
        stats = merged.stats;
        // bumped：墓碑被推进了（对方把已删条目当成更新送回来），必须落盘并上传，否则对方会一直送
        touched = merged.stats.bumped > 0 || dataSig(merged.state) !== dataSig(S);
        if (touched) {
          try { localStorage.setItem(SYNC_BEFORE_KEY, JSON.stringify(S)); } catch (e) { /* 存不下就算了 */ }
          S = merged.state;
          syncBase = indexState(S);
          try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 忽略 */ }
        }
      }

      // 本机没有待上传、合并也没带来变化时不必重复上传，省掉一次云端写
      const needUpload = first || !remote || touched || pendingSyncCount() > 0;
      if (needUpload) {
        await tauriInvoke('webdav_upload', { ...base, filename: SYNC_FILE, content: JSON.stringify(syncPayload()) });
        markAllSynced(S);
      }
      cfg.lastSyncAt = new Date().toISOString();
      delete cfg.lastSyncError;
      saveCloudCfg(cfg);
      try { localStorage.setItem('mercury.sync.at', String(Date.now())); } catch (e) { /* 忽略 */ }
      if (touched || S.ui.route === 'memos') safeRender();
      updateSyncLabels();
      result = stats;

      if (!o.silent) {
        const parts = [];
        if (stats.added) parts.push(`补入 ${stats.added} 条`);
        if (stats.deleted) parts.push(`删除 ${stats.deleted} 条`);
        if (stats.updated) parts.push(`更新 ${stats.updated} 条`);
        if (parts.length) toast(`已同步 · ${parts.join('，')}`);
        else toast(first ? '已创建云端同步库' : '两端已经一致');
      }
    } catch (e) {
      if (!o.silent) cloudFail(e, '同步失败');
      else { console.warn('[sync]', e); syncFailNote(e); }
      try {
        const c = cloudCfg();
        c.lastSyncError = { at: Date.now(), msg: errText(e) || '未知错误' };
        saveCloudCfg(c);
      } catch (err) { /* 忽略 */ }
      updateSyncLabels();
    } finally {
      syncing = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.orig || '同步云端';
        delete btn.dataset.orig;
      }
      if (syncPending) { syncPending = false; scheduleAutoSync(3000); }
    }
    return result;
  }

  function scheduleAutoSync(delay) {
    if (!syncReady || !autoSyncOn()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      if (syncing) { syncPending = true; return; }
      const last = Number(localStorage.getItem('mercury.sync.at') || 0);
      const wait = SYNC_GAP - (Date.now() - last);
      if (wait > 0) { scheduleAutoSync(wait + 500); return; }
      if (S.meta && S.meta.demo) return; // 演示数据不上传
      syncNow({ silent: true });
    }, delay == null ? SYNC_DEBOUNCE : delay);
  }

  // 兜底轮询：可见时 60 秒、隐藏时 3 分钟。
  // 注意：这里只用 visibilityState 决定「间隔」，绝不用它决定「拉不拉」——
  // Windows 的 WebView2 在窗口被遮挡时会长期停在 hidden，拿它做开关会彻底停止拉取。
  function startSyncLoop() {
    clearTimeout(syncLoopTimer);
    const step = () => {
      const hidden = document.visibilityState === 'hidden';
      syncLoopTimer = setTimeout(() => {
        if (autoSyncOn()) syncNow({ silent: true });
        step();
      }, hidden ? 180000 : 60000);
    };
    step();
  }

  // 窗口被遮挡/最小化时定时器会被节流，回到前台时补一次
  function catchUpSync() {
    if (!autoSyncOn() || syncing) return;
    const now = Date.now();
    if (now - lastCatchUpAt < 45000) return;      // 防止连续点击反复请求
    const last = Number(localStorage.getItem('mercury.sync.at') || 0);
    if (now - last < 60000) return;               // 刚同步过，不必再拉
    lastCatchUpAt = now;
    syncNow({ silent: true });
  }

  function installCatchUp() {
    if (catchUpInstalled) return;
    catchUpInstalled = true;
    ['focus', 'pointerdown', 'keydown'].forEach(ev =>
      window.addEventListener(ev, catchUpSync, { passive: true }));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') catchUpSync();
    });
  }

  function toggleAutoSync() {
    const cfg = cloudCfg();
    cfg.autoSync = cfg.autoSync === false;
    saveCloudCfg(cfg);
    updateSyncLabels();
    toast(cfg.autoSync === false ? '已关闭自动同步' : '已开启自动同步，改动后会自动上传');
    if (cfg.autoSync !== false) { scheduleAutoSync(2000); installCatchUp(); }
  }

  // 手动挑一份云端备份与当前数据合并（不覆盖本机独有的内容）
  async function cloudMerge(file) {
    let cfg, base;
    try { ({ cfg, base } = syncParams()); } catch (e) { toast(esc(e.message)); return; }
    let payload;
    try {
      const raw = await tauriInvoke('webdav_download', { ...base, filename: file });
      payload = JSON.parse(raw);
    } catch (e) {
      cloudFail(e, '读取云端备份失败');
      return;
    }
    const remote = payload && payload.data ? payload.data : payload;
    if (!remote || typeof remote !== 'object' || !Array.isArray(remote.tasks)) { toast('这份云端文件无法合并'); return; }
    const merged = mergeStates(S, remote);
    const st = merged.stats;
    askConfirm({
      title: '合并云端备份到本机？',
      heading: '同步确认',
      danger: false,
      detail: `按条目合并：云端独有 ${st.added} 条会补进本机，本机独有的一条不丢，同一内容以较新的改动为准。合并结果会同时写回云端。`,
      okText: '合并',
      onOk: () => {
        const touched = dataSig(merged.state) !== dataSig(S);
        try { localStorage.setItem(SYNC_BEFORE_KEY, JSON.stringify(S)); } catch (e) { /* 忽略 */ }
        S = merged.state;
        syncBase = indexState(S);
        save();
        closeModal();
        safeRender();
        toast(touched ? `已合并 · 补入 ${st.added} 条` : '本机已包含云端全部内容');
        syncNow({ silent: true });
      }
    });
  }

  function openCloudHelp() {
    openModal(modalShell('获取坚果云应用密码', '应用密码不是登录密码，是专门给第三方应用用的一串独立密码。',
      `<ol class="help-steps">
        <li>用浏览器打开 <b>www.jianguoyun.com</b>，登录你的坚果云账号</li>
        <li>点右上角的<b>账号名</b>，选择「<b>账户信息</b>」</li>
        <li>切换到「<b>安全选项</b>」标签页</li>
        <li>找到「<b>第三方应用管理</b>」，点「<b>添加应用密码</b>」</li>
        <li>名称随便填一个（比如「水星计划」），点「<b>生成密码</b>」</li>
        <li>复制生成的那串随机密码（<b>只显示这一次</b>，记得复制）</li>
        <li>回到本应用「设置 → 坚果云云备份」：账号填注册邮箱，密码粘贴刚复制的那串，点「测试连接」</li>
      </ol>
      <div class="muted backup-hint">提示：应用密码可以随时在「安全选项」里删除重建，不影响坚果云登录密码。如果忘了应用密码，删掉重新生成一个即可。</div>`,
      '<button class="btn btn-amber" data-act="m-close">知道了</button>'));
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
  const KIND_LABEL = { task: '待办', trivia: '琐事', goal: '目标', project: '项目', habit: '习惯', wish: '心愿', achievement: '成就', routine: '日常', hobby: '兴趣', memo: '备忘录' };

  // 一条回收站记录涉及哪些原始条目，形如 ['tasks:t1', 'goals:g3']
  function trashSourceKeys(entry) {
    const items = (entry && entry.items) || {};
    const keys = [];
    Object.keys(items).forEach(k => {
      if (k === 'unlinked' || k === 'count') return;
      (Array.isArray(items[k]) ? items[k] : []).forEach(x => {
        if (x && x.id != null) keys.push(k + ':' + x.id);
      });
    });
    return keys;
  }

  // 集合名 → 回收站的 kind 值，必须与 KIND_LABEL / undoMap 的键一致
  const TRASH_KIND = {
    tasks: 'task', projects: 'project', goals: 'goal', habits: 'habit', wishes: 'wish',
    trivia: 'trivia', achievements: 'achievement', routines: 'routine', hobbies: 'hobby', memos: 'memo'
  };

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
    // 恢复出来的条目要清掉自己的墓碑，并把 ut 推到墓碑之后，否则会被墓碑（包括别的设备的）再删一次
    trashSourceKeys(entry).forEach(k => {
      const cut = k.indexOf(':');
      const coll = k.slice(0, cut);
      const iid = k.slice(cut + 1);
      delete S.meta.tomb[k];
      const it = (S[coll] || []).find(x => x && String(x.id) === iid);
      if (it) { it.ut = nextUt(); it.rv = 1; }
    });
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
    routine: e => putBack(S.routines, e.items.routines[0], e.idx),
    hobby: e => putBack(S.hobbies, e.items.hobbies[0], e.idx),
    memo: e => putBack(S.memos, e.items.memos[0], e.idx),
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

  function delMemo(id) {
    const m = S.memos.find(x => x.id === id);
    if (!m) return;
    const entry = { id: uid('r'), kind: 'memo', title: m.title || '未命名笔记', count: 1, meta: (m.updated || '').slice(0, 10), idx: S.memos.indexOf(m), items: { memos: [m] } };
    S.memos.splice(entry.idx, 1);
    pushTrash(entry);
    if (S.ui.memoId === id) S.ui.memoId = (S.memos[0] || {}).id || null;
    save(); render(false);
    toast('已删除笔记', '撤销', () => { undoTrash(entry.id); render(false); toast('已撤销删除'); });
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

  function delRoutine(id) {
    const r = routineById(id);
    if (!r) return;
    const n = (r.logs || []).length;
    const entry = { id: uid('r'), kind: 'routine', title: r.name, count: 1, idx: S.routines.indexOf(r), items: { routines: [r] } };
    S.routines.splice(entry.idx, 1);
    pushTrash(entry);
    closeDrawer();
    save(); render(false);
    toast(`已删除日常事项 <b>${esc(r.name)}</b>${n ? `，含 ${n} 条记录` : ''}`, '撤销', () => { undoTrash(entry.id); render(false); toast('已撤销删除'); });
  }

  // 单条兴趣记录不进回收站，直接用 toast 撤销
  function delHobbyLog(rid, logId) {
    const hb = hobbyById(rid);
    if (!hb) return;
    const idx = (hb.logs || []).findIndex(l => l.id === logId);
    if (idx < 0) return;
    const log = hb.logs[idx];
    hb.logs.splice(idx, 1);
    save(); render(false);
    if (drawerOpen()) drawerHobby(rid);
    toast('已删除 1 条记录', '撤销', () => {
      const again = hobbyById(rid);
      if (!again) return;
      again.logs.splice(Math.min(idx, again.logs.length), 0, log);
      save(); render(false);
      if (drawerOpen()) drawerHobby(rid);
      toast('已撤销删除');
    });
  }

  function delHobby(id) {
    const hb = hobbyById(id);
    if (!hb) return;
    const n = (hb.logs || []).length;
    const entry = { id: uid('r'), kind: 'hobby', title: hb.name, count: 1, idx: S.hobbies.indexOf(hb), items: { hobbies: [hb] } };
    S.hobbies.splice(entry.idx, 1);
    pushTrash(entry);
    closeDrawer();
    save(); render(false);
    toast(`已删除爱好 <b>${esc(hb.name)}</b>${n ? `，含 ${n} 条记录` : ''}`, '撤销', () => { undoTrash(entry.id); render(false); toast('已撤销删除'); });
  }

  // 单条记录不进回收站，直接用 toast 撤销，避免回收站被零碎记录塞满
  function delRoutineLog(rid, logId) {
    const r = routineById(rid);
    if (!r) return;
    const idx = (r.logs || []).findIndex(l => l.id === logId);
    if (idx < 0) return;
    const log = r.logs[idx];
    r.logs.splice(idx, 1);
    save(); render(false);
    if (drawerOpen()) drawerRoutine(rid);
    toast('已删除 1 条记录', '撤销', () => {
      const again = routineById(rid);
      if (!again) return;
      again.logs.splice(Math.min(idx, again.logs.length), 0, log);
      save(); render(false);
      if (drawerOpen()) drawerRoutine(rid);
      toast('已撤销删除');
    });
  }

  // ---------- 派生数据 ----------
  const projById = id => S.projects.find(p => p.id === id);
  const goalById = id => S.goals.find(g => g.id === id);
  const habitById = id => S.habits.find(h => h.id === id);
  const routineById = id => S.routines.find(r => r.id === id);
  const hobbyById = id => S.hobbies.find(h => h.id === id);

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

  // ---------- 日常记录：派生数据 ----------
  // 记录按日期倒序，第 0 条就是最近一次
  function routineLogs(r) {
    return (r.logs || []).slice().sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
  }
  function routineLast(r) { return routineLogs(r)[0] || null; }

  // 下次该做：优先用上一次记录里填的「预计下次」，没有就按周期推，再没有就是没安排
  function routineNext(r) {
    const last = routineLast(r);
    if (!last) return null;
    if (last.next) return last.next;
    if (r.cycleDays) return iso(shift(parse(last.date), Number(r.cycleDays)));
    return null;
  }
  function routineAvgGap(r) {
    const ds = routineLogs(r).map(l => l.date).reverse(); // 升序
    if (ds.length < 2) return null;
    let t = 0;
    for (let i = 1; i < ds.length; i++) t += diffDays(ds[i], ds[i - 1]);
    return Math.round(t / (ds.length - 1));
  }
  function routineDue(r) {
    const next = routineNext(r);
    if (!next) return { next: null, days: null, state: 'none' };
    const days = diffDays(next, TODAY_K);
    const state = days < 0 ? 'over' : days === 0 ? 'today' : days <= 7 ? 'soon' : 'later';
    return { next, days, state };
  }
  const DUE_RANK = { over: 0, today: 1, soon: 2, later: 3, none: 4 };
  function routineSorted() {
    return S.routines.slice().sort((a, b) => {
      const da = routineDue(a), db = routineDue(b);
      const ra = DUE_RANK[da.state], rb = DUE_RANK[db.state];
      if (ra !== rb) return ra - rb;
      if (da.next && db.next) return da.next.localeCompare(db.next);
      return a.name.localeCompare(b.name, 'zh');
    });
  }
  // 到期（含今天）与临近 7 天的都算「该做了」
  function routinesDue(withinDays) {
    return routineSorted().filter(r => {
      const d = routineDue(r);
      return d.next && d.days <= (withinDays || 0);
    });
  }

  // ---------- 渲染骨架 ----------
  const NAV = [
    { group: '每日', items: [{ id: 'today', label: '今日总览', icon: 'sun' }] },
    { group: '规划', items: [{ id: 'tasks', label: '日程待办', icon: 'cal' }, { id: 'goals', label: '目标拆解', icon: 'target' }, { id: 'projects', label: '我的项目', icon: 'layers' }] },
    { group: '记录', items: [{ id: 'routines', label: '日常记录', icon: 'cycle' }, { id: 'habits', label: '习惯', icon: 'repeat' }, { id: 'hobbies', label: '兴趣爱好', icon: 'heart' }, { id: 'wishes', label: '心愿清单', icon: 'star' }, { id: 'memos', label: '备忘录', icon: 'note' }, { id: 'trivia', label: '琐事记录', icon: 'pen' }, { id: 'achievements', label: '成就', icon: 'trophy' }] }
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
    if (id === 'routines') {
      const n = routinesDue(0).length;
      return n ? String(n) : '';
    }
    if (id === 'memos') return S.memos.length ? String(S.memos.length) : '';
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

  function pendingSyncCount() {
    const cfg = cloudCfg();
    if (!cfg.user || !cfg.pass) return -1; // 没配账号 = 没开启
    const marks = loadMarks();
    let n = 0;
    SYNC_COLLECTIONS.forEach(coll => (S[coll] || []).forEach(it => {
      if (!it || it.id == null) return;
      if ((Number(marks[coll + ':' + it.id]) || 0) < (Number(it.ut) || 0)) n++;
    }));
    return n;
  }

  // 状态栏右侧的同步提示：只在同步结束后局部刷新，不整页重绘
  function syncBadge() {
    const pend = pendingSyncCount();
    const cfg = cloudCfg();
    if (pend < 0) return { cls: '', text: '数据保存在本机' };
    if (cfg.lastSyncError) return { cls: 'err', text: '云端同步失败' };
    return pend ? { cls: 'warn', text: `${pend} 条待上传` } : { cls: 'ok', text: '云端已同步' };
  }

  function updateSyncBadge() {
    const el = document.querySelector('#statusbar .sb-local');
    if (!el) return;
    const b = syncBadge();
    el.className = 'sb-local' + (b.cls ? ' ' + b.cls : '');
    el.title = b.text;
    el.innerHTML = `<i></i>${esc(b.text)}`;
  }

  function statusHTML() {
    const st = statsOn(S.ui.cursor);
    const quit = S.habits.filter(h => h.kind === 'quit').sort((a, b) => quitStreak(b) - quitStreak(a))[0];
    const badge = syncBadge();
    return `<div class="stat"><b>${st.taskDone}/${st.taskTotal}</b> 待办</div>
      <span class="dot-sep"></span>
      <div class="stat"><b>${st.habitDone}/${st.habitTotal}</b> 习惯</div>
      <span class="dot-sep"></span>
      <div class="stat">戒除连续 <b>${quit ? quitStreak(quit) : 0}</b> 天</div>
      <span class="dot-sep"></span>
      <div class="stat"><b>${st.notes}</b> 条琐事</div>
      <div class="sb-right">
        <span class="sb-local ${badge.cls}" title="${esc(badge.text)}"><i></i>${esc(badge.text)}</span>
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
      case 'routines': return viewRoutines();
      case 'hobbies': return viewHobbies();
      case 'habits': return viewHabits();
      case 'wishes': return viewWishes();
      case 'trivia': return viewTrivia();
      case 'memos': return viewMemos();
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

    // 日常记录：近一周该做的
    if (S.routines.length) {
      const pend = routinesDue(7);
      h += `<section class="card">
        <div class="card-head">
          <span class="card-title">日常该做了</span>
          <span class="card-count">${pend.length ? pend.length + ' 项' : '都做过了'}</span>
        </div>`;
      if (!pend.length) {
        h += `<div class="card-empty">近一周没有到期的日常事项。</div>`;
      } else {
        pend.slice(0, 3).forEach(r => {
          const d = routineDue(r);
          const last = routineLast(r);
          const when = d.state === 'over' ? `逾期 ${-d.days} 天` : d.state === 'today' ? '就是今天' : `${d.days} 天后`;
          h += `<div class="routine-mini ${d.state}">
            <span class="rm-ico">${icon(r.icon || 'cycle', 13)}</span>
            <div class="rm-main" data-act="open-routine" data-id="${r.id}">
              <div class="rm-name">${esc(r.name)}</div>
              <div class="rm-meta">${when}${last ? ' · 上次 ' + fmtShort(last.date) : ''}</div>
            </div>
            <button class="btn sm" data-act="routine-log" data-id="${r.id}">记一次</button>
          </div>`;
        });
        if (pend.length > 3) {
          h += `<div class="note-more"><button class="link-btn" data-act="goto-routines">还有 ${pend.length - 3} 项，去日常记录查看 →</button></div>`;
        }
      }
      h += `</section>`;
    }

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

      h += `<div class="mt14" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-amber" data-act="goal-add" data-id="${root.id}">${icon('plus', 14)} 添加子项</button>
        <button class="btn" data-act="goal-schedule" data-id="${root.id}">${icon('cal', 14)} 排进今天</button>
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
        h += `</div>
          <button class="btn sm" style="margin-top:8px" data-act="goal-add" data-id="${root.id}">${icon('plus', 12)} 再拆一层</button>
        </div>`;
      } else {
        h += `<div class="drawer-section mt14" style="margin-bottom:0">
          <h4>子项</h4>
          <div class="muted" style="font-size:11px;margin:6px 0 10px">还没拆。把它拆成几个能直接做的子目标或行动。</div>
          <button class="btn sm btn-amber" data-act="goal-add" data-id="${root.id}">${icon('plus', 12)} 添加子项</button>
        </div>`;
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
        <div class="pnext">${p.next ? `<span>下一步</span><b>${esc(p.next)}</b>` : '<span class="muted">还没有下一步</span>'}<button class="pnext-edit" data-act="project-next-edit" data-id="${p.id}" title="${p.next ? '修改下一步' : '写一个下一步'}">${p.next ? icon('pen', 12) : icon('plus', 12)}</button></div>
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
  // 心愿下面还可以拆子项：拆到能马上动手那一步
  function wishSubsHtml(w) {
    const items = w.items || [];
    let h = '';
    if (items.length) {
      const doneN = items.filter(i => i.done).length;
      h += `<div class="wish-items">
        <div class="wish-items-head"><span>子项</span><span class="mono">${doneN}/${items.length}</span></div>`;
      items.forEach(it => {
        h += `<div class="wish-item${it.done ? ' on' : ''}" data-act="wish-item-toggle" data-id="${w.id}" data-iid="${it.id}" title="${it.done ? '取消勾选' : '标记这一步做完'}">
          <span class="check${it.done ? ' on' : ''}" style="width:14px;height:14px${it.done ? ';background:var(--amber);border-color:var(--amber)' : ''}">${icon('check', 9)}</span>
          <span class="wish-item-t">${esc(it.title)}</span>
          <button class="wish-item-x" data-act="wish-item-del" data-id="${w.id}" data-iid="${it.id}" title="删掉这一步">${icon('x', 12)}</button>
        </div>`;
      });
      h += `</div>`;
    }
    h += `<div class="wish-add">
      <input class="input wish-add-input" id="wi-${w.id}" placeholder="${items.length ? '再加一步…' : '拆一步，例：办签证'}">
      <button class="btn sm" data-act="wish-item-add" data-id="${w.id}" title="添加子项">${icon('plus', 12)}</button>
    </div>`;
    return h;
  }

  function viewWishes() {
    const want = S.wishes.filter(w => w.status === 'want').sort((a, b) => b.want - a.want);
    const done = S.wishes.filter(w => w.status === 'done');
    const allItems = S.wishes.reduce((n, w) => n + (w.items || []).length, 0);
    let h = `<div class="page-head">
      <div>
        <h1 class="page-title">心愿清单</h1>
        <div class="page-sub"><span>${want.length} 个想要</span><span class="dot-sep"></span><span>${done.length} 个已实现</span><span class="dot-sep"></span><span>${allItems} 个待办子项</span><span class="dot-sep"></span><span>合计 ¥${sum(want.map(w => w.price || 0)).toLocaleString()}</span></div>
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
        ${wishSubsHtml(w)}
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
          ${wishSubsHtml(w)}
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

  // ---------- 备忘录 ----------
  // 一个够用的小 Markdown 渲染器：标题、列表、待办、引用、代码、表格、分割线、常用行内样式
  function mdInline(src) {
    let s = esc(src);
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (m, c) => {
      codes.push(`<code>${c}</code>`);
      return `\u0001${codes.length - 1}\u0001`;
    });
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, url) =>
      /^(https?:|data:image\/)/i.test(url) ? `<img src="${url}" alt="${alt}" loading="lazy">` : m);
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) =>
      /^(https?:|mailto:|#|\/)/i.test(url) ? `<a href="${url}" target="_blank" rel="noreferrer">${txt}</a>` : m);
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    s = s.replace(/==([^=]+)==/g, '<mark>$1</mark>');
    s = s.replace(/\u0001(\d+)\u0001/g, (m, i) => codes[Number(i)] || '');
    return s;
  }

  const MD_BLOCK = /^\s*(```|#{1,6}\s|>|[-*+]\s|\d+[.)]\s|([-*_])\s*(\2\s*){2,}\s*$|\|)/;

  function mdCells(row) {
    return row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  }

  function mdToHTML(src) {
    const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }

      const fence = line.match(/^\s*```(\w*)\s*$/);
      if (fence) {
        const buf = [];
        i++;
        while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push(`<pre class="md-pre"><code>${esc(buf.join('\n'))}</code></pre>`);
        continue;
      }

      const hm = line.match(/^\s*(#{1,6})\s+(.*?)\s*#*\s*$/);
      if (hm) {
        const lv = hm[1].length;
        out.push(`<h${lv}>${mdInline(hm[2])}</h${lv}>`);
        i++;
        continue;
      }

      if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) { out.push('<hr>'); i++; continue; }

      if (/^\s*\|/.test(line) && i + 1 < lines.length && /^[\s:|-]+$/.test(lines[i + 1]) && lines[i + 1].indexOf('-') >= 0) {
        const head = mdCells(line);
        const aligns = mdCells(lines[i + 1]).map(c =>
          /^:-+:$/.test(c) ? 'center' : /^-+:$/.test(c) ? 'right' : 'left');
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(mdCells(lines[i])); i++; }
        const th = head.map((c, x) => `<th style="text-align:${aligns[x] || 'left'}">${mdInline(c)}</th>`).join('');
        const tb = rows.map(r => `<tr>${r.map((c, x) => `<td style="text-align:${aligns[x] || 'left'}">${mdInline(c)}</td>`).join('')}</tr>`).join('');
        out.push(`<div class="md-table"><table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>`);
        continue;
      }

      if (/^\s*>/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        out.push(`<blockquote>${mdToHTML(buf.join('\n'))}</blockquote>`);
        continue;
      }

      if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
        const baseIndent = line.match(/^\s*/)[0].length;
        const ordered = /^\s*\d+[.)]\s+/.test(line);
        const items = [];
        while (i < lines.length) {
          const m = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
          if (!m) {
            if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) {
              items[items.length - 1].text += ' ' + lines[i].trim();
              i++;
              continue;
            }
            break;
          }
          if (m[1].length < baseIndent) break;
          items.push({ level: Math.min(2, Math.floor((m[1].length - baseIndent) / 2)), text: m[3] });
          i++;
        }
        const lis = items.map(it => {
          const pad = it.level ? ` style="margin-left:${it.level * 18}px"` : '';
          const task = it.text.match(/^\[( |x|X)\]\s+(.*)$/);
          if (task) {
            return `<li class="md-task${task[1] === ' ' ? '' : ' done'}"${pad}><span class="md-box"></span><span>${mdInline(task[2])}</span></li>`;
          }
          return `<li${pad}>${mdInline(it.text)}</li>`;
        }).join('');
        out.push(ordered ? `<ol>${lis}</ol>` : `<ul>${lis}</ul>`);
        continue;
      }

      const buf = [];
      while (i < lines.length && lines[i].trim() && !MD_BLOCK.test(lines[i])) { buf.push(lines[i]); i++; }
      out.push(`<p>${buf.map(mdInline).join('<br>')}</p>`);
    }
    return out.join('\n');
  }

  function memoById(id) { return S.memos.find(m => m.id === id); }

  function memoTime(v) {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    const k = iso(d);
    const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (k === TODAY_K) return `今天 ${hm}`;
    if (k === iso(shift(TODAY, -1))) return `昨天 ${hm}`;
    const y = d.getFullYear() === TODAY.getFullYear() ? '' : d.getFullYear() + '年';
    return `${y}${d.getMonth() + 1}月${d.getDate()}日`;
  }

  function memoExcerpt(s) {
    return String(s || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_`~|]/g, ' ')
      .replace(/^\s*[-+]\s*/gm, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 64);
  }

  function memoWords(s) { return String(s || '').replace(/\s/g, '').length; }

  function viewMemos() {
    const list = S.memos.slice().sort((a, b) => String(b.updated || '').localeCompare(String(a.updated || '')));
    if (list.length && !list.some(m => m.id === S.ui.memoId)) S.ui.memoId = list[0].id;
    const cur = list.find(m => m.id === S.ui.memoId) || null;

    let h = `<div class="page-head">
      <div>
        <h1 class="page-title">备忘录</h1>
        <div class="page-sub"><span>${list.length} 篇笔记</span><span class="dot-sep"></span><span>用 Markdown 写，右边即时排版</span></div>
      </div>
      <div class="page-actions"><button class="btn btn-amber" data-act="memo-new">${icon('plus', 14)} 新建笔记</button></div>
    </div>`;

    if (!list.length) {
      return h + `<div class="card card-empty" style="padding:64px 20px">
        <div style="margin-bottom:10px;color:var(--text-3)">${icon('note', 26)}</div>
        还没有笔记。<br>点右上角「新建笔记」，第一行写 <b># 标题</b> 就能开始。
      </div>`;
    }

    h += `<div class="memo-layout"><section class="card memo-side"><div class="memo-list">`;
    list.forEach(m => {
      h += `<div class="memo-item ${cur && m.id === cur.id ? 'on' : ''}" data-act="memo-open" data-id="${m.id}">
        <h4>${esc(m.title || '未命名笔记')}</h4>
        <p>${esc(memoExcerpt(m.content)) || '空笔记'}</p>
        <div class="m-foot"><span class="m-time">${memoTime(m.updated)}</span>${syncMark('memos', m)}</div>
      </div>`;
    });
    h += `</div></section>`;

    h += `<section class="card memo-paper">
      <div class="memo-doc-head">
        <div style="min-width:0">
          <h2>${esc(cur.title || '未命名笔记')}</h2>
          <div class="memo-meta"><span>${memoTime(cur.updated)}</span><span class="dot-sep"></span><span>${memoWords(cur.content)} 字</span>${syncMark('memos', cur)}</div>
        </div>
        <div class="memo-ops">
          <button class="btn sm" data-act="memo-edit" data-id="${cur.id}">${icon('pen', 13)} 编辑</button>
          <button class="btn sm" data-act="memo-del" data-id="${cur.id}" title="删除这篇笔记">${icon('trash', 13)}</button>
        </div>
      </div>
      <article class="md-body">${mdToHTML(cur.content) || '<p class="muted">这篇还是空的，点「编辑」写点什么。</p>'}</article>
    </section></div>`;
    return h;
  }

  function openMemoEditor(id) {
    const m = id ? memoById(id) : null;
    openModal(`<div class="modal memo-modal" style="position:relative">
      <button class="icon-btn modal-close" data-act="m-close">${icon('x', 16)}</button>
      <h3>${m ? '编辑笔记' : '新建笔记'}</h3>
      <div class="m-sub">支持 Markdown：# 标题、- 列表、- [ ] 待办、&gt; 引用、\`代码\`、| 表格 |</div>
      <input class="input" id="memoTitle" placeholder="笔记标题" value="${esc(m ? m.title : '')}" autocomplete="off">
      <div class="memo-edit-split">
        <textarea class="input mono" id="memoBody" spellcheck="false" placeholder="# 从这里开始写…">${esc(m ? m.content : '')}</textarea>
        <div class="memo-preview md-body" id="memoPreview"></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-act="m-close">取消</button>
        <button class="btn btn-amber" data-act="memo-save" data-id="${m ? m.id : ''}">${m ? '保存' : '创建'}</button>
      </div>
    </div>`);
    const body = document.getElementById('memoBody');
    const prev = document.getElementById('memoPreview');
    const paint = () => {
      prev.innerHTML = mdToHTML(body.value) || '<p class="memo-ph">左边写，这里实时预览。</p>';
    };
    body.addEventListener('input', paint);
    body.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const btn = document.querySelector('#modalLayer [data-act="memo-save"]');
        if (btn) btn.click();
      }
    });
    paint();
  }

  // ---------- 日常记录 ----------
  // 到期状态 → 徽标文案；d.state: over / today / soon / later / none
  function nextBadge(d, hasLog) {
    if (d.state === 'over') return `<span class="nbadge over">${icon('clock', 11)}逾期 ${-d.days} 天</span>`;
    if (d.state === 'today') return `<span class="nbadge today">今天该做</span>`;
    if (d.state === 'soon') return `<span class="nbadge soon">${d.days} 天后</span>`;
    if (d.state === 'later') return `<span class="nbadge later">${fmtMD(d.next)}</span>`;
    return `<span class="nbadge none">${hasLog ? '没定下次' : '还没做过'}</span>`;
  }

  function routineRow(r) {
    const logs = routineLogs(r);
    const last = logs[0] || null;
    const d = routineDue(r);
    const gap = routineAvgGap(r);
    const urgent = d.state === 'over' || d.state === 'today';
    const sub = last
      ? `上次 ${fmtMD(last.date)} · ${relLabel(last.date)}${gap ? ' · 平均 ' + gap + ' 天一次' : ''}`
      : '还没记录过，做完点右边「记一次」';
    return `<div class="rrow ${d.state}">
      <div class="rrow-main" data-act="open-routine" data-id="${r.id}">
        <span class="r-ico">${icon(r.icon || 'cycle', 14)}</span>
        <div style="min-width:0">
          <h3>${esc(r.name)}</h3>
          <p>${sub}</p>
        </div>
      </div>
      <div class="rrow-next">${nextBadge(d, !!last)}</div>
      <div class="rrow-count"><b>${logs.length}</b>次</div>
      <div class="rrow-act">
        <button class="btn sm ${urgent ? 'btn-amber' : ''}" data-act="routine-log" data-id="${r.id}">记一次</button>
      </div>
      <div class="rrow-x"><button class="row-x" data-act="routine-del" data-id="${r.id}" title="删除这个事项">${icon('trash', 26)}</button></div>
    </div>`;
  }

  function viewRoutines() {
    const tab = S.ui.routineTab || 'all';
    const all = routineSorted();
    const due = all.filter(r => { const d = routineDue(r); return d.next && d.days <= 0; });
    const logs = sum(all.map(r => (r.logs || []).length));
    const list = tab === 'due' ? due : all;

    let h = `<div class="page-head">
      <div>
        <h1 class="page-title">日常记录</h1>
        <div class="page-sub">
          <span>${all.length} 个事项</span><span class="dot-sep"></span>
          <span>${logs} 条记录</span><span class="dot-sep"></span>
          <span>${due.length} 项该做了</span>
        </div>
      </div>
      <div class="page-actions"><button class="btn btn-amber" data-act="routine-new">${icon('plus', 14)} 新事项</button></div>
    </div>`;

    h += `<div class="habit-page-head">
      <div class="seg">
        <button class="${tab === 'all' ? 'on' : ''}" data-act="routine-tab" data-tab="all">全部 ${all.length}</button>
        <button class="${tab === 'due' ? 'on' : ''}" data-act="routine-tab" data-tab="due">该做了 ${due.length}</button>
      </div>
      <span class="muted" style="font-size:11px">重复做的事，每做一次就「记一次」 · 点名称看全部记录</span>
    </div>`;

    if (!list.length) {
      h += `<div class="card card-empty" style="padding:44px">
        ${tab === 'due' ? '都做过了，没有到期的事项。' : '还没有日常事项。<br>洗浴巾、换床单、给猫剪指甲……这类隔一阵就要做一次的事都适合放在这里。'}
      </div>`;
      return h;
    }

    h += `<div class="routine-list">`;
    list.forEach(r => { h += routineRow(r); });
    h += `</div>`;
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
          <button class="row-x tl-x tl-edit" data-act="ach-edit" data-id="${a.id}" title="编辑这条成就">${icon('pen', 26)}</button>
          <button class="row-x tl-x" data-act="ach-del" data-id="${a.id}" title="删除这条成就">${icon('trash', 26)}</button>
        </div>`;
      });
    });
    h += `</div>`;
    return h;
  }

  // ---------- 兴趣爱好 ----------
  function hobbyLogs(h) {
    return (h.logs || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  }
  function hobbyStats(h) {
    const logs = hobbyLogs(h);
    const month = TODAY_K.slice(0, 7);
    return {
      total: logs.length,
      thisMonth: logs.filter(l => l.date.slice(0, 7) === month).length,
      minutes: sum(logs.map(l => l.minutes || 0)),
      last: logs[0] || null
    };
  }

  function viewHobbies() {
    const list = S.hobbies;
    const month = TODAY_K.slice(0, 7);
    const monthTimes = sum(list.map(x => (x.logs || []).filter(l => l.date.slice(0, 7) === month).length));
    const totalTimes = sum(list.map(x => (x.logs || []).length));
    const totalMin = sum(list.map(x => hobbyStats(x).minutes));

    let h = `<div class="page-head">
      <div>
        <h1 class="page-title">兴趣爱好</h1>
        <div class="page-sub">
          <span>${list.length} 个爱好</span><span class="dot-sep"></span>
          <span>本月投入 ${monthTimes} 次</span><span class="dot-sep"></span>
          <span>累计 ${totalTimes} 条记录${totalMin ? ` · 约 ${Math.round(totalMin / 60)} 小时` : ''}</span>
        </div>
      </div>
      <div class="page-actions"><button class="btn btn-amber" data-act="hobby-new">${icon('plus', 14)} 新爱好</button></div>
    </div>`;

    if (!list.length) {
      h += `<div class="card card-empty" style="padding:44px">
        还没有记录爱好。<br>摄影、烘焙、夜跑、写点什么……喜欢的事都值得留个位置。
      </div>`;
      return h;
    }

    h += `<div class="grid-cards">`;
    list.forEach(hb => {
      const st = hobbyStats(hb);
      h += `<article class="hobby-card">
        <button class="card-x" data-act="hobby-del" data-id="${hb.id}" title="删除这个爱好">${icon('trash', 26)}</button>
        <div class="hobby-top">
          <span class="hobby-ico">${icon(hb.icon || 'heart', 15)}</span>
          ${hb.tag ? `<span class="chip">${esc(hb.tag)}</span>` : ''}
        </div>
        <h3 data-act="open-hobby" data-id="${hb.id}">${esc(hb.name)}</h3>
        ${stars(hb.level || 3)}
        ${hb.note ? `<div class="hobby-note">${esc(hb.note)}</div>` : ''}
        <div class="hobby-meta">累计 <b>${st.total}</b> 次${st.thisMonth ? ` · 本月 ${st.thisMonth} 次` : ''}${st.last ? ` · 最近 ${relLabel(st.last.date)}` : ''}</div>
        <div class="hobby-foot">
          <button class="btn sm btn-amber" data-act="hobby-log" data-id="${hb.id}">记一笔</button>
          <button class="btn sm" data-act="open-hobby" data-id="${hb.id}">全部记录</button>
        </div>
      </article>`;
    });
    h += `</div>`;
    return h;
  }

  function drawerHobby(id) {
    const hb = hobbyById(id);
    if (!hb) return;
    const logs = hobbyLogs(hb);
    const st = hobbyStats(hb);

    let h = `<div class="drawer-head">
      <div class="dh-main">
        <div class="dh-kicker">兴趣爱好${hb.tag ? ' · ' + esc(hb.tag) : ''}</div>
        <h2>${esc(hb.name)}</h2>
      </div>
      <button class="icon-btn" data-act="drawer-close">${icon('x', 16)}</button>
    </div><div class="drawer-body">`;

    h += `<div class="flex" style="align-items:flex-end;gap:8px;margin-bottom:2px">
      <span class="mono" style="font-size:40px;font-weight:600;letter-spacing:-.04em;line-height:1;color:#F0C88C">${st.total}</span>
      <span class="muted" style="font-size:12px;padding-bottom:5px">次投入${st.minutes ? ` · 约 ${Math.round(st.minutes / 60)} 小时` : ''}</span>
    </div>
    <div class="muted" style="font-size:11px;margin-bottom:16px">${st.last ? `最近一次 ${fmtFull(st.last.date)} · ${relLabel(st.last.date)}` : '还没记过，玩完顺手记一笔。'}</div>`;

    h += `<div class="drawer-section" style="display:flex;gap:8px">
      <button class="btn btn-amber" data-act="hobby-log" data-id="${hb.id}">${icon('plus', 14)} 记一笔</button>
      <button class="btn btn-danger" data-act="hobby-del" data-id="${hb.id}">${icon('trash', 14)} 删除这个爱好</button>
    </div>`;

    if (hb.note) h += `<div class="drawer-section"><h4>备注</h4><div class="muted" style="font-size:12px;line-height:1.7">${esc(hb.note)}</div></div>`;

    h += `<div class="drawer-section"><h4>全部记录 · ${logs.length}</h4>`;
    if (!logs.length) {
      h += `<div class="muted" style="font-size:11.5px">还没有记录。点上面「记一笔」，写下哪天玩的、花了多久。</div>`;
    } else {
      logs.forEach(l => {
        h += `<div class="log-row">
          <div class="log-main">
            <div class="log-date">${fmtMDW(l.date)}<span>${relLabel(l.date)}${l.minutes ? ` · ${l.minutes} 分钟` : ''}</span></div>
            ${l.note ? `<div class="log-note">${esc(l.note)}</div>` : ''}
          </div>
          <button class="row-x" data-act="hobby-log-del" data-id="${l.id}" data-rid="${hb.id}" title="删除这条记录">${icon('trash', 26)}</button>
        </div>`;
      });
    }
    h += `</div></div>`;
    openDrawer(h);
  }

  function openNewHobby() {
    const iconOpts = [['heart', '心形'], ['camera', '相机'], ['book', '书'], ['run', '跑步'], ['coffee', '咖啡'], ['pen', '笔'], ['leaf', '植物'], ['music', '音乐'], ['moon', '夜晚'], ['zap', '能量']]
      .map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
    openModal(modalShell('新爱好', '喜欢的事，留个位置，玩完顺手记一笔。',
      `<div class="field"><label>名称</label><input class="input" id="hoName" placeholder="例：胶片摄影"></div>
       <div class="field"><label>分类（可选）</label><input class="input" id="hoTag" placeholder="例：摄影 / 运动 / 厨房"></div>
       <div class="field"><label>图标</label><select class="input" id="hoIcon">${iconOpts}</select></div>
       <div class="field"><label>热爱程度</label>
         <select class="input" id="hoLevel"><option value="5">★★★★★ 生活支柱</option><option value="4">★★★★ 很热爱</option><option value="3" selected>★★★ 喜欢</option><option value="2">★★ 有点兴趣</option><option value="1">★ 随缘玩玩</option></select>
       </div>
       <div class="field"><label>备注（可选）</label><input class="input" id="hoNote" placeholder="例：拍完的卷攒到十二卷再一起冲"></div>`,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn btn-amber" data-act="hobby-create">创建</button>`));
  }

  function openHobbyLog(id) {
    const hb = hobbyById(id);
    if (!hb) return;
    openModal(modalShell(`记一笔 · ${esc(hb.name)}`, '玩的时候开心就好，回头补一条记录就行。',
      `<div class="log-target">${icon(hb.icon || 'heart', 15)}<b>${esc(hb.name)}</b><span>累计 ${(hb.logs || []).length} 次</span></div>
       <div class="field"><label>哪天玩的（必填）</label><input class="input" id="hlDate" type="date" value="${TODAY_K}" max="${TODAY_K}"></div>
       <div class="field"><label>花了多久（可选，分钟）</label><input class="input" id="hlMinutes" type="number" min="1" max="1440" placeholder="例：90"></div>
       <div class="field"><label>想说的话（可选）</label><input class="input" id="hlNote" placeholder="例：老城区扫街，拍了两卷"></div>`,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn btn-amber" data-act="hobby-log-save" data-id="${hb.id}">记下来</button>`));
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
      <button class="icon-btn" data-act="habit-edit" data-id="${hb.id}" title="编辑这个习惯">${icon('pen', 16)}</button>
      <button class="icon-btn" data-act="drawer-close" title="关闭">${icon('x', 16)}</button>
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
      <div class="flex gap8">
        <button class="btn" data-act="habit-edit" data-id="${hb.id}">${icon('pen', 13)} 编辑</button>
        <button class="btn btn-danger" data-act="habit-del" data-id="${hb.id}">${icon('trash', 14)} 删除这个习惯</button>
      </div>
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

    h += `<div class="drawer-section"><h4>下一步</h4>`;
    if (p.next) {
      h += `<div style="padding:11px 12px;border-radius:10px;background:rgba(233,163,60,.06);border:1px solid rgba(233,163,60,.16);font-size:13px;color:var(--text)">${esc(p.next)}</div>`;
    } else {
      h += `<div class="muted" style="font-size:12px;margin-bottom:8px">还没有下一步，写一个能直接动手的小事。</div>`;
    }
    h += `<button class="btn sm" data-act="project-next-edit" data-id="${p.id}">${p.next ? icon('pen', 12) + ' 修改' : icon('plus', 12) + ' 写一个下一步'}</button></div>`;
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
      ${p.next ? `<button class="btn btn-amber" data-act="project-next" data-id="${p.id}">把下一步排进今天</button>` : ''}
      <button class="btn btn-danger" data-act="project-del" data-id="${p.id}">${icon('trash', 14)} 删除项目</button>
    </div></div>`;
    openDrawer(h);
  }

  function drawerOpen() {
    return document.getElementById('drawer').classList.contains('open');
  }

  function drawerRoutine(id) {
    const r = routineById(id);
    if (!r) return;
    const logs = routineLogs(r);
    const last = logs[0] || null;
    const d = routineDue(r);
    const gap = routineAvgGap(r);
    const urgent = d.state === 'over' || d.state === 'today';

    let nextLine;
    if (d.state === 'over') nextLine = `<span style="color:var(--red-text)">预计下次 ${fmtMD(d.next)}，已经逾期 ${-d.days} 天</span>`;
    else if (d.state === 'today') nextLine = `<span style="color:var(--amber-2)">预计下次就是今天</span>`;
    else if (d.next) nextLine = `预计下次 ${fmtMDW(d.next)} · 还有 ${d.days} 天`;
    else nextLine = '还没定下次，做完时可以在弹窗里填一个。';

    let h = `<div class="drawer-head">
      <div class="dh-main">
        <div class="dh-kicker">日常记录${r.cycleDays ? ' · 约 ' + r.cycleDays + ' 天一次' : ' · 不设周期'}</div>
        <h2>${esc(r.name)}</h2>
      </div>
      <button class="icon-btn" data-act="drawer-close">${icon('x', 16)}</button>
    </div><div class="drawer-body">`;

    h += `<div class="flex" style="align-items:flex-end;gap:8px;margin-bottom:2px">
      <span class="mono" style="font-size:40px;font-weight:600;letter-spacing:-.04em;line-height:1;color:#F0C88C">${last ? diffDays(TODAY_K, last.date) : '—'}</span>
      <span class="muted" style="font-size:12px;padding-bottom:5px">${last ? '天前做过' : '还没记录'}</span>
    </div>
    <div class="muted" style="font-size:11px;margin-bottom:16px">${nextLine}</div>`;

    h += `<div class="drawer-section">
      <div class="kv"><span class="k">累计次数</span><span class="v">${logs.length} 次</span></div>
      <div class="kv"><span class="k">平均间隔</span><span class="v">${gap ? gap + ' 天' : '还看不出来'}</span></div>
      <div class="kv"><span class="k">上次</span><span class="v">${last ? fmtFull(last.date) : '—'}</span></div>
      <div class="kv" style="border:0"><span class="k">预计下次</span><span class="v">${d.next ? fmtFull(d.next) : '没填'}</span></div>
    </div>`;

    h += `<div class="drawer-section" style="display:flex;gap:8px">
      <button class="btn ${urgent ? 'btn-amber' : ''}" data-act="routine-log" data-id="${r.id}">${icon('plus', 14)} 记一次</button>
      <button class="btn btn-danger" data-act="routine-del" data-id="${r.id}">${icon('trash', 14)} 删除这个事项</button>
    </div>`;

    if (r.note) h += `<div class="drawer-section"><h4>备注</h4><div class="muted" style="font-size:12px;line-height:1.7">${esc(r.note)}</div></div>`;

    h += `<div class="drawer-section"><h4>全部记录 · ${logs.length}</h4>`;
    if (!logs.length) {
      h += `<div class="muted" style="font-size:11.5px">还没有记录。点上面「记一次」，写下哪天做的。</div>`;
    } else {
      logs.forEach(l => {
        h += `<div class="log-row">
          <div class="log-main">
            <div class="log-date">${fmtMDW(l.date)}<span>${relLabel(l.date)}</span></div>
            ${l.note ? `<div class="log-note">${esc(l.note)}</div>` : ''}
            ${l.next ? `<div class="log-next">当时说下次 ${fmtMD(l.next)}</div>` : ''}
          </div>
          <button class="row-x" data-act="routine-log-del" data-id="${l.id}" data-rid="${r.id}" title="删除这条记录">${icon('trash', 26)}</button>
        </div>`;
      });
    }
    h += `</div></div>`;
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

  function openHabitEditor(id) {
    const hb = habitById(id);
    if (!hb) return;
    const isQuit = hb.kind === 'quit';
    openModal(modalShell('编辑习惯', isQuit ? '可以改名字和备注。养成 / 戒除的类型不能改，要换类型只能删掉重建。' : '改名字、每天目标次数或备注。已经打过的卡不会丢。',
      `<div class="field"><label>名称</label><input class="input" id="ehName" value="${esc(hb.name)}" placeholder="例：早起 6:30"></div>
       ${isQuit ? '' : `<div class="field"><label>每天目标次数（喝水这类量化习惯填 8，普通习惯填 1）</label><input class="input" id="ehTarget" type="number" min="1" max="99" value="${hb.target || 1}"></div>`}
       <div class="field"><label>备注（可选）</label><textarea class="input" id="ehNote" rows="2" placeholder="为什么想养成 / 戒掉它">${esc(hb.note || '')}</textarea></div>`,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn btn-amber" data-act="habit-save" data-id="${hb.id}">保存</button>`));
  }

  function openNewWish() {
    openModal(modalShell('新心愿', '想要的东西，不丢人。可以先拆成几步，做不到的时候也知道下一步做什么。',
      `<div class="field"><label>名称</label><input class="input" id="nwName" placeholder="例：一台 3D 打印机"></div>
       <div class="field"><label>预算（可留空）</label><input class="input" id="nwPrice" type="number" min="0" placeholder="2499"></div>
       <div class="field"><label>想要程度</label>
         <select class="input" id="nwWant"><option value="5">★★★★★ 想到睡不着</option><option value="4">★★★★ 很想要</option><option value="3" selected>★★★ 想要</option><option value="2">★★ 有点想</option><option value="1">★ 随缘</option></select>
       </div>
       <div class="field"><label>拆成几步（可选，一行一步）</label><textarea class="input" id="nwSteps" rows="3" placeholder="例：查评测&#10;看线下有没有现货&#10;攒够钱"></textarea></div>`,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn btn-amber" data-act="wish-create">加入清单</button>`));
  }

  function openNewRoutine() {
    openModal(modalShell('新日常事项', '隔一阵就要做一次的事，比如洗浴巾、换床单、给猫剪指甲。',
      `<div class="field"><label>事项名称</label><input class="input" id="nrName" placeholder="例：洗浴巾"></div>
       <div class="field"><label>大概多久一次（可选，填了会自动推算下次）</label><input class="input" id="nrCycle" type="number" min="1" max="365" placeholder="例：14"></div>
       <div class="field"><label>备注（可选）</label><textarea class="input" id="nrNote" rows="2" placeholder="例：两条轮换，攒够一周一起洗"></textarea></div>`,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn btn-amber" data-act="routine-create">创建</button>`));
  }

  // 记一次：哪天做的必填，预计下次可选
  function openRoutineLog(id) {
    const r = routineById(id);
    if (!r) return;
    const last = routineLast(r);
    const suggest = last
      ? (r.cycleDays ? iso(shift(parse(last.date), Number(r.cycleDays))) : '')
      : '';
    // 建议值不会早于今天，免得一记完就是逾期
    const fixed = suggest && suggest < TODAY_K ? TODAY_K : suggest;
    const quick = [7, 14, 30].map(n => `<button class="btn sm" data-act="routine-quick-next" data-days="${n}">+${n} 天</button>`).join('');
    const cycleBtn = r.cycleDays ? `<button class="btn sm" data-act="routine-quick-next" data-days="${r.cycleDays}">按周期 ${r.cycleDays} 天</button>` : '';

    openModal(modalShell(`记一次 · ${esc(r.name)}`, '哪天做的必填；预计下次可以留空，之后再补。',
      `<div class="log-target">${icon(r.icon || 'cycle', 15)}<b>${esc(r.name)}</b><span>${last ? '上次 ' + fmtMD(last.date) : '第一次记录'}</span></div>
       <div class="field"><label>哪天做的（必填）</label><input class="input" id="rlDate" type="date" value="${TODAY_K}" max="${TODAY_K}"></div>
       <div class="field">
         <label>预计下次什么时候（可选）</label>
         <input class="input" id="rlNext" type="date" value="${fixed}">
         <div class="quick-row">${quick}${cycleBtn}<button class="btn sm btn-ghost" data-act="routine-quick-next" data-days="0">清空</button></div>
       </div>
       <div class="field"><label>想说的话（可选）</label><input class="input" id="rlNote" placeholder="例：顺便把浴袍也洗了"></div>`,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn btn-amber" data-act="routine-log-save" data-id="${r.id}">记下来</button>`));
  }

  function openNewAch() {
    openModal(modalShell('记录一件做成的事', '不用是大事。',
      `<div class="field"><label>做成了什么</label><input class="input" id="naTitle" placeholder="例：第一次一个人去看电影"></div>
       <div class="field"><label>日期</label><input class="input" id="naDate" type="date" value="${TODAY_K}"></div>
       <div class="field"><label>想说的话（可选）</label><textarea class="input" id="naNote" rows="2"></textarea></div>`,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn btn-amber" data-act="ach-create">记下来</button>`));
  }

  function openEditAch(id) {
    const a = S.achievements.find(x => x.id === id);
    if (!a) return;
    openModal(modalShell('编辑这条成就', '改成你想记住的样子。',
      `<div class="field"><label>做成了什么</label><input class="input" id="naTitle" value="${esc(a.title)}"></div>
       <div class="field"><label>日期</label><input class="input" id="naDate" type="date" value="${a.date}"></div>
       <div class="field"><label>想说的话（可选）</label><textarea class="input" id="naNote" rows="2">${esc(a.note || '')}</textarea></div>`,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn btn-amber" data-act="ach-save" data-id="${a.id}">保存</button>`));
  }

  function openNewGoal() {
    openModal(modalShell('新目标', '先写目标，之后在目标树里一层层拆。',
      `<div class="field"><label>目标</label><input class="input" id="ngTitle" placeholder="例：今年读完 24 本书"></div>`,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn btn-amber" data-act="goal-create">创建</button>`));
  }

  function openAddSub(pid) {
    const parent = goalById(pid);
    if (!parent) return;
    openModal(modalShell('添加子项', `挂在「${parent.title}」下面，拆到能直接做为止。`,
      `<div class="field"><label>子项</label><input class="input" id="nsTitle" placeholder="例：读完《设计中的设计》"></div>`,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn btn-amber" data-act="sub-create" data-id="${pid}">创建</button>`));
    setTimeout(() => { const el = document.getElementById('nsTitle'); if (el) el.focus(); }, 40);
  }

  function openNewProject() {
    openModal(modalShell('新项目', '有交付物、有结束点的一件事。',
      `<div class="field"><label>项目名</label><input class="input" id="npName" placeholder="例：书房改造"></div>
       <div class="field"><label>下一步（可以之后补）</label><input class="input" id="npNext" placeholder="例：量窗帘尺寸"></div>`,
      `<button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn btn-amber" data-act="project-create">创建</button>`));
  }

  function openProjectNext(id) {
    const p = projById(id);
    if (!p) return;
    openModal(modalShell(p.next ? '修改下一步' : '写一个下一步', '下一步要是能直接动手的一件小事。',
      `<div class="field"><label>${p.name} · 下一步</label><input class="input" id="pnNext" value="${esc(p.next || '')}" placeholder="例：量窗帘尺寸"></div>`,
      `${p.next ? `<button class="btn btn-ghost" data-act="project-next-clear" data-id="${p.id}">清空</button>` : ''}
       <button class="btn btn-ghost" data-act="m-close">取消</button>
       <button class="btn btn-amber" data-act="project-next-save" data-id="${p.id}">保存</button>`));
    setTimeout(() => { const el = document.getElementById('pnNext'); if (el) el.focus(); }, 40);
  }

  function openSettings() {
    const n = (S.trash || []).length;
    const cur = currentThemeId();
    const jd = cloudCfg();
    const themeOpts = THEMES.map(t => `<button class="theme-opt ${t.id === cur ? 'on' : ''}" data-act="theme-set" data-theme="${t.id}">
      <span class="theme-swatch" style="background:${t.swatch}"><i style="background:${t.accent}"></i></span>
      <span class="theme-name"><b>${t.name}</b><span>${t.hint}</span></span>
    </button>`).join('');

    openModal(modalShell('设置', '数据保存在本机，可导出或云备份。',
      `<div class="set-label">外观主题</div>
       <div class="theme-grid">${themeOpts}</div>
       <div class="kv"><span class="k">存储方式</span><span class="v">本地 · localStorage</span></div>
       <div class="set-actions">
         <button class="btn" data-act="backup-export">${icon('arrowUp', 14)}导出备份</button>
         <button class="btn" data-act="backup-import">${icon('restore', 14)}导入备份</button>
       </div>
       <div class="muted backup-hint">备份包含全部用户数据和当前主题；导入会覆盖现有数据。</div>
       <div class="hr"></div>
       <div class="set-label">切换数据源（测试用）</div>
       <div class="set-actions" style="margin-top:0">
         <button class="btn" data-act="wipe-demo">${icon('restore', 14)}载入演示数据</button>
         <button class="btn" data-act="wipe-pull">${icon('db', 14)}从云端重建</button>
       </div>
       <div class="muted backup-hint">「载入演示数据」清空本机后回到演示数据，并关闭自动同步，云端不动；「从云端重建」清空本机后以空数据启动，自动同步把云端内容整份拉回来——测试完回到真实数据用这个。账号和主题会保留。</div>
       <div class="hr"></div>
       <div class="set-label">多设备同步（坚果云）</div>
       <input class="input" id="jdUser" placeholder="坚果云账号（注册邮箱）" value="${esc(jd.user || '')}" style="margin-bottom:8px">
       <input class="input" id="jdPass" type="password" placeholder="${jd.pass ? '应用密码已保存，可输入新密码替换' : '应用密码（不是登录密码）'}" style="margin-bottom:10px">
       <div class="set-actions" style="margin-top:0">
         <button class="btn" id="jdTest" data-act="jd-test">${icon('check', 14)}测试连接</button>
         <button class="btn btn-amber" id="jdSync" data-act="jd-sync">${icon('cycle', 14)}同步云端</button>
         <button class="btn" id="jdList" data-act="jd-list">${icon('db', 14)}云端记录</button>
       </div>
       <button class="set-row" data-act="jd-auto">
         <span class="set-row-main">${icon('cycle', 15)}<span>自动同步</span></span>
         <span class="set-row-side"><span id="jdAutoState">${jd.autoSync === false ? '已关闭' : '已开启'}</span>${icon('chevR', 14)}</span>
       </button>
       <button class="set-row" data-act="jd-backup">
         <span class="set-row-main">${icon('arrowUp', 15)}<span>备份一份完整快照</span></span>
         <span class="set-row-side" id="jdBackup">云端留存${icon('chevR', 14)}</span>
       </button>
       <div class="muted backup-hint">两端各记各的都不会丢：同步会把云端独有和本机独有的内容按条目合并，同一条以较新的改动为准。改完十几秒自动上传，打开应用时也会自动拉一次。</div>
       <button class="set-row" data-act="jd-help">
         <span class="set-row-main">${icon('restore', 15)}<span>如何获取坚果云应用密码？</span></span>
         <span class="set-row-side">查看教程${icon('chevR', 14)}</span>
       </button>
       <div class="muted backup-hint" id="jdSyncLast">${syncStatusText(jd)}</div>
       <div class="muted backup-hint" id="jdLast">上次云备份：${fmtCloudTime(jd.lastBackupAt)}</div>
       <button class="set-row" data-act="trash-open">
         <span class="set-row-main">${icon('trash', 15)}<span>回收站</span></span>
         <span class="set-row-side">${n ? n + ' 条可恢复' : '空'}${icon('chevR', 14)}</span>
       </button>
       <div class="hr"></div>
       <div class="muted" style="font-size:11px;line-height:1.7">这是用于确认交互的原型，数据仅用于演示。正式版会换成本地数据库并自动备份。<br>删除操作都有撤销：按 <span class="kbd">Ctrl Z</span>，或者到回收站里恢复。</div>`,
      `<button class="btn" data-act="m-close">关闭</button>`));
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
      { label: '新建习惯', icon: 'repeat', hint: '', run: openNewHabit },
      { label: '新建日常事项', icon: 'cycle', hint: '', run: openNewRoutine },
      { label: '新建兴趣', icon: 'heart', hint: '', run: openNewHobby },
      { label: '新建笔记', icon: 'note', hint: 'Markdown', run: () => openMemoEditor() }
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
      { label: '新建日常事项', icon: 'cycle', hint: '', run: openNewRoutine },
      { label: '新建兴趣', icon: 'heart', hint: '', run: openNewHobby },
      { label: '新建笔记', icon: 'note', hint: 'Markdown', run: () => openMemoEditor() },
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
      case 'jd-test': cloudTest(); break;
      case 'jd-backup': cloudBackup(); break;
      case 'jd-list': cloudList(); break;
      case 'jd-sync': syncNow({ btnId: 'jdSync' }); break;
      case 'jd-auto': toggleAutoSync(); break;
      case 'jd-merge': cloudMerge(id); break;
      case 'jd-restore': cloudRestore(id); break;
      case 'jd-del': cloudDelete(id); break;
      case 'jd-help': openCloudHelp(); break;

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

      case 'memo-new': openMemoEditor(); break;
      case 'memo-open':
        if (S.ui.memoId === id) break;
        S.ui.memoId = id; save(); render(false); break;
      case 'memo-edit': openMemoEditor(id); break;
      case 'memo-del': {
        const memo = memoById(id);
        if (!memo) break;
        askConfirm({
          title: `删除笔记「${memo.title || '未命名笔记'}」？`,
          detail: '删掉后可以在回收站恢复，内容不会丢。',
          okText: '删除',
          onOk: () => delMemo(id)
        });
        break;
      }
      case 'memo-save': {
        const title = ((document.getElementById('memoTitle') || {}).value || '').trim();
        const content = (document.getElementById('memoBody') || {}).value || '';
        if (!title && !content.trim()) { toast('写点内容再保存'); break; }
        const now = new Date().toISOString();
        if (id) {
          const memo = memoById(id);
          if (!memo) break;
          memo.title = title || '未命名笔记';
          memo.content = content;
          memo.updated = now;
          S.ui.memoId = memo.id;
          toast('笔记已保存');
        } else {
          const memo = { id: uid('mn'), title: title || '未命名笔记', content, created: now, updated: now };
          S.memos.push(memo);
          S.ui.memoId = memo.id;
          toast('笔记已创建');
        }
        S.ui.route = 'memos';
        save(); closeModal(); render(true);
        break;
      }
      case 'goto-notes': go('trivia'); break;
      case 'goto-routines': go('routines'); break;
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
      case 'goal-add': openAddSub(id); break;
      case 'sub-create': {
        const title = (document.getElementById('nsTitle') || {}).value || '';
        if (!title.trim()) break;
        const pid = id;
        const parent = goalById(pid);
        if (!parent) break;
        S.goals.push({ id: uid('g'), parentId: pid, title: title.trim(), type: 'sub', status: 'todo', note: '' });
        S.ui.expanded[pid] = true;
        S.ui.goalId = pid;
        save(); closeModal(); render(false); toast('子项已添加，继续拆。');
        break;
      }
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
      case 'project-next-edit': openProjectNext(id); break;
      case 'project-next-save': {
        const p = projById(id);
        if (!p) break;
        const v = ((document.getElementById('pnNext') || {}).value || '').trim();
        if (!v) { toast('写点什么，或者点「清空」'); break; }
        p.next = v;
        save(); closeModal(); render(false);
        if (drawerOpen()) drawerProject(p.id);
        toast('下一步已更新：<b>' + esc(v) + '</b>');
        break;
      }
      case 'project-next-clear': {
        const p = projById(id);
        if (!p) break;
        p.next = '';
        save(); closeModal(); render(false);
        if (drawerOpen()) drawerProject(p.id);
        toast('已清空下一步');
        break;
      }

      // ---- 日常记录 ----
      case 'routine-tab':
        S.ui.routineTab = el.dataset.tab; save(); render(false); break;
      case 'routine-new': openNewRoutine(); break;

      case 'hobby-new': openNewHobby(); break;
      case 'open-hobby': drawerHobby(id); break;
      case 'hobby-log': openHobbyLog(id); break;
      case 'hobby-del': {
        const hb = hobbyById(id);
        if (!hb) break;
        askConfirm({
          title: `删除爱好「${hb.name}」？`,
          detail: `会一起删掉 ${(hb.logs || []).length} 条记录。如果只是暂时不玩了，删掉也没关系，回收站里能找回来。`,
          okText: '删除爱好',
          onOk: () => delHobby(id)
        });
        break;
      }
      case 'hobby-log-del': delHobbyLog(el.dataset.rid, id); break;
      case 'hobby-create': {
        const name = (document.getElementById('hoName') || {}).value || '';
        if (!name.trim()) break;
        const tag = (document.getElementById('hoTag') || {}).value || '';
        const hicon = (document.getElementById('hoIcon') || {}).value || 'heart';
        const level = Number((document.getElementById('hoLevel') || {}).value || 3);
        const note = (document.getElementById('hoNote') || {}).value || '';
        S.hobbies.push({ id: uid('hb'), name: name.trim(), icon: hicon, tag: tag.trim(), level, note: note.trim(), logs: [] });
        save(); closeModal(); render(false);
        toast(`已创建爱好 <b>${esc(name.trim())}</b>`);
        break;
      }
      case 'hobby-log-save': {
        const hb = hobbyById(el.dataset.id);
        if (!hb) break;
        const date = (document.getElementById('hlDate') || {}).value || TODAY_K;
        const minutes = Number((document.getElementById('hlMinutes') || {}).value || 0);
        const note = (document.getElementById('hlNote') || {}).value || '';
        if (!Array.isArray(hb.logs)) hb.logs = [];
        hb.logs.push({ id: uid('hg'), date, minutes: clamp(minutes, 0, 1440), note: note.trim() });
        save(); closeModal(); render(false);
        if (drawerOpen()) drawerHobby(hb.id);
        toast(`已记下 <b>${esc(hb.name)}</b> · ${fmtMD(date)}${minutes ? `，${minutes} 分钟` : ''}`);
        break;
      }
      case 'open-routine': drawerRoutine(id); break;
      case 'routine-log': openRoutineLog(id); break;
      case 'routine-del': {
        const r = routineById(id);
        if (!r) break;
        const n = (r.logs || []).length;
        askConfirm({
          title: `删除日常事项「${r.name}」？`,
          detail: n
            ? `已经攒了 ${n} 条记录，会一起删除，删掉后可以在回收站恢复。`
            : '删掉后可以在回收站恢复。',
          okText: '删除事项',
          onOk: () => delRoutine(id)
        });
        break;
      }
      case 'routine-log-del': {
        const rid = el.dataset.rid;
        delRoutineLog(rid, id);
        break;
      }
      case 'routine-quick-next': {
        const days = Number(el.dataset.days);
        const base = document.getElementById('rlDate');
        const next = document.getElementById('rlNext');
        if (!next) break;
        if (!days) { next.value = ''; break; }
        const from = base && base.value ? base.value : TODAY_K;
        next.value = iso(shift(parse(from), days));
        break;
      }
      case 'routine-create': {
        const name = (document.getElementById('nrName') || {}).value || '';
        if (!name.trim()) break;
        const cycle = Number((document.getElementById('nrCycle') || {}).value || 0);
        const note = (document.getElementById('nrNote') || {}).value || '';
        S.routines.push({
          id: uid('rt'), name: name.trim(), icon: 'cycle',
          cycleDays: cycle > 0 ? clamp(Math.round(cycle), 1, 365) : null,
          note: note.trim(), logs: []
        });
        save(); closeModal(); render(false);
        toast(`已创建日常事项 <b>${esc(name.trim())}</b>`, '记一次', () => {
          const r = S.routines[S.routines.length - 1];
          if (r) openRoutineLog(r.id);
        });
        break;
      }
      case 'routine-log-save': {
        const r = routineById(id);
        if (!r) break;
        const date = (document.getElementById('rlDate') || {}).value || '';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast('先选一个「哪天做的」'); break; }
        const nextRaw = (document.getElementById('rlNext') || {}).value || '';
        const next = /^\d{4}-\d{2}-\d{2}$/.test(nextRaw) ? nextRaw : null;
        const note = ((document.getElementById('rlNote') || {}).value || '').trim();
        const exist = (r.logs || []).find(l => l.date === date);
        if (exist) {
          exist.next = next;
          if (note) exist.note = note;
        } else {
          r.logs.push({ id: uid('rl'), date, next, note });
        }
        save(); closeModal(); render(false);
        if (drawerOpen()) drawerRoutine(r.id);
        toast(`${exist ? '已更新' : '已记下'} <b>${esc(r.name)}</b> · ${fmtMD(date)}${next ? `，下次 ${fmtMD(next)}` : ''}`);
        break;
      }

      case 'wish-new': openNewWish(); break;
      case 'wish-item-add': {
        const w = S.wishes.find(x => x.id === id);
        if (!w) break;
        const inp = document.getElementById(`wi-${id}`);
        const title = ((inp && inp.value) || '').trim();
        if (!title) { if (inp) inp.focus(); break; }
        if (!Array.isArray(w.items)) w.items = [];
        w.items.push({ id: uid('wi'), title, done: false });
        save(); render(false);
        const again = document.getElementById(`wi-${id}`);
        if (again) again.focus();
        break;
      }
      case 'wish-item-toggle': {
        const w = S.wishes.find(x => x.id === id);
        const it = w && (w.items || []).find(x => x.id === el.dataset.iid);
        if (!it) break;
        it.done = !it.done;
        save(); render(false);
        break;
      }
      case 'wish-item-del': {
        const w = S.wishes.find(x => x.id === id);
        if (!w || !Array.isArray(w.items)) break;
        const it = w.items.find(x => x.id === el.dataset.iid);
        w.items = w.items.filter(x => x.id !== el.dataset.iid);
        save(); render(false);
        if (it) toast(`已删掉子项 <b>${esc(it.title)}</b>`);
        break;
      }
      case 'wish-done': {
        const w = S.wishes.find(x => x.id === id);
        if (w) {
          w.status = 'done'; w.date = TODAY_K;
          (w.items || []).forEach(it => { it.done = true; });
          S.achievements.push({ id: uid('a'), title: `实现心愿：${w.name}`, date: TODAY_K, source: '心愿', note: '' });
          save(); render(false);
          toast(`心愿实现：<b>${esc(w.name)}</b>，已记入成就`);
        }
        break;
      }
      case 'ach-new': openNewAch(); break;
      case 'ach-edit': openEditAch(id); break;
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

      case 'habit-edit': openHabitEditor(id); break;
      case 'habit-save': {
        const hb = habitById(id);
        if (!hb) break;
        const nameEl = document.getElementById('ehName');
        const name = (nameEl ? nameEl.value : '') || '';
        if (!name.trim()) { toast('名字不能为空'); break; }
        hb.name = name.trim();
        const tg = document.getElementById('ehTarget');
        if (tg) hb.target = clamp(Number(tg.value) || 1, 1, 99);
        const nt = document.getElementById('ehNote');
        if (nt) hb.note = nt.value.trim();
        save(); closeModal(); render(false);
        if (document.getElementById('drawer').classList.contains('open')) drawerHabit(hb.id);
        toast('已保存');
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
        const steps = ((document.getElementById('nwSteps') || {}).value || '')
          .split('\n').map(s => s.trim()).filter(Boolean)
          .map(t => ({ id: uid('wi'), title: t, done: false }));
        S.wishes.push({ id: uid('w'), name: name.trim(), price, want, status: 'want', note: '', items: steps });
        save(); closeModal(); render(false);
        toast(steps.length ? `已加入心愿清单，拆了 ${steps.length} 步` : '已加入心愿清单');
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
      case 'ach-save': {
        const a = S.achievements.find(x => x.id === id);
        if (!a) break;
        const t = (document.getElementById('naTitle') || {}).value || '';
        if (!t.trim()) break;
        a.title = t.trim();
        a.date = (document.getElementById('naDate') || {}).value || a.date;
        a.note = ((document.getElementById('naNote') || {}).value || '').trim();
        save(); closeModal(); render(false); toast('已保存');
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
      case 'wipe-demo':
        askConfirm({
          title: '清空本机数据，载入演示数据？',
          detail: '本机全部内容、回收站、同步标记都会清掉，并关闭自动同步（不关的话几秒后云端数据又会被合并回来）。坚果云上的文件不受影响，账号和主题保留。',
          okText: '清空并载入',
          onOk: () => wipeLocal({ empty: false })
        });
        break;
      case 'wipe-pull':
        askConfirm({
          title: '清空本机，从云端重建？',
          detail: '本机全部内容和同步标记会清掉，然后以空数据启动，自动同步把云端内容整份拉回来。当前的测试数据不会留下。',
          okText: '清空并拉回',
          onOk: () => wipeLocal({ empty: true })
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
      } else if (id.indexOf('wi-') === 0) {
        const wid = id.slice(3);
        const w = S.wishes.find(x => x.id === wid);
        const title = e.target.value.trim();
        if (w && title) {
          if (!Array.isArray(w.items)) w.items = [];
          w.items.push({ id: uid('wi'), title, done: false });
          save(); render(false);
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
  if (qs.get('modal') === 'memo') setTimeout(() => openMemoEditor(qs.get('id') || null), 60);

  // 同步：启动后拉一次云端，之后按可见性轮询；窗口一有动静就补拉
  syncReady = true;
  if (autoSyncOn()) {
    setTimeout(() => syncNow({ silent: true }), 3000);
    startSyncLoop();
    installCatchUp();
  }


})();
