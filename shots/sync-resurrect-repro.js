/* 复现：Windows 端删除后条目被云端带回来
 * 用假时钟 + 内存模拟坚果云，直接跑 ui/app.js 的启动与同步流程
 */
const fs = require('fs');
const path = require('path');

// ---------- localStorage ----------
const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};

// ---------- DOM ----------
function makeEl() {
  const el = {
    innerHTML: '', value: '', hidden: true, scrollTop: 0, textContent: '', disabled: false,
    classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
    dataset: {}, style: {},
    addEventListener() {}, focus() {}, blur() {},
    removeAttribute() {}, setAttribute() {}, getAttribute: () => null,
    appendChild() {}, remove() {}, insertBefore() {}, after() {}, before() {},
    querySelector: () => null, querySelectorAll: () => [],
    closest: () => null, contains: () => false,
    children: { length: 0 }, firstElementChild: { remove() {} }, lastElementChild: null,
    set onclick(fn) { el._onclick = fn; }, get onclick() { return el._onclick; }
  };
  return el;
}
const els = {};
let clickHandler = null;
global.document = {
  documentElement: makeEl(),
  body: makeEl(),
  activeElement: null,
  visibilityState: 'visible',
  hidden: false,
  getElementById: id => (els[id] || (els[id] = makeEl())),
  createElement: () => makeEl(),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener(type, fn) { if (type === 'click') clickHandler = fn; }
};
global.window = global;
global.location = { search: '' };
global.requestAnimationFrame = fn => setTimeout(fn, 16);
const winEvents = {};
global.addEventListener = (type, fn) => { (winEvents[type] = winEvents[type] || []).push(fn); };
const fire = type => (winEvents[type] || []).forEach(fn => fn({ type }));

// ---------- 假时钟 ----------
let now = 0;
let seq = 0;
const timers = new Map();
function fakeSetTimeout(fn, ms) {
  const id = ++seq;
  timers.set(id, { at: now + Math.max(0, Number(ms) || 0), fn, id });
  return id;
}
function fakeClearTimeout(id) { timers.delete(id); }
global.setTimeout = fakeSetTimeout;
global.clearTimeout = fakeClearTimeout;
global.setInterval = (fn, ms) => { const id = fakeSetTimeout(function tick() { fn(); fakeSetTimeout(tick, ms); }, ms); return id; };
global.clearInterval = fakeClearTimeout;

const flush = async () => { for (let i = 0; i < 30; i++) await new Promise(r => setImmediate(r)); };

async function advance(ms) {
  const target = now + ms;
  await flush();
  for (;;) {
    let next = null;
    for (const t of timers.values()) if (t.at <= target && (!next || t.at < next.at)) next = t;
    if (!next) break;
    timers.delete(next.id);
    now = next.at;
    global.__fakeNow = now;
    try { next.fn(); } catch (e) { console.error('timer error:', e.message); }
    await flush();
  }
  now = target;
  global.__fakeNow = now;
  await flush();
}

// ---------- 模拟云端 ----------
const cloud = {};
const calls = [];
global.__TAURI__ = {
  core: {
    invoke(cmd, args) {
      calls.push(cmd);
      if (cmd === 'webdav_download') {
        if (!(args.filename in cloud)) return Promise.reject(new Error('文件不存在 (404)'));
        return Promise.resolve(cloud[args.filename]);
      }
      if (cmd === 'webdav_upload') { cloud[args.filename] = args.content; return Promise.resolve('ok'); }
      if (cmd === 'webdav_list') return Promise.resolve([]);
      return Promise.resolve(null);
    }
  }
};

// ---------- 预置本机状态 ----------
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TODAY = iso(new Date());
const T1 = { id: 't1', title: '站会：同步本周进度', date: TODAY, time: '09:00', done: false, goalId: null, ut: Date.now() - 60000 };
const T2 = { id: 't2', title: '写周报', date: TODAY, time: '18:00', done: false, goalId: null, ut: Date.now() - 60000 };

const baseState = {
  v: 2,
  meta: { deviceId: 'dev-windows', tomb: {}, ut: Date.now() - 60000 },
  tasks: [T1, T2], projects: [], goals: [], habits: [], wishes: [], trivia: [], achievements: [],
  routines: [], hobbies: [], memos: [], trash: [],
  ui: { route: 'today', cursor: TODAY, taskView: 'day', habitTab: 'build', routineTab: 'all', goalId: null, expanded: {} }
};
store['mercury.plan.v1'] = JSON.stringify(baseState);
store['mercury.webdav'] = JSON.stringify({ user: 'u@example.com', pass: 'app-pass', autoSync: true });
// 云端已有同一份（先前同步过）
cloud['sync.json'] = JSON.stringify({ format: 'mercury-plan-sync', version: 1, app: '水星计划', updatedAt: new Date().toISOString(), deviceId: 'dev-windows', data: JSON.parse(JSON.stringify(baseState)) });

// ---------- 启动 ----------
let code = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf-8');
if (process.argv.includes('--nograce')) {
  code = code.replace(/const TOMB_GRACE = [^;]+;/, 'const TOMB_GRACE = 0;');
  console.log('已关闭墓碑容差（复现旧行为）');
}
new Function(code)();

const injectedUt = { v: 0 };

const click = ds => clickHandler({ target: { closest: () => ({ dataset: ds }) } });
const localS = () => JSON.parse(store['mercury.plan.v1'] || '{}');
const cloudS = () => (cloud['sync.json'] ? JSON.parse(cloud['sync.json']).data : null);
const has = (s, coll, id) => (s[coll] || []).some(x => x.id === id);

function assert(cond, msg) {
  console.log((cond ? 'PASS: ' : 'FAIL: ') + msg);
  if (!cond) process.exitCode = 1;
}

(async () => {
  await advance(4000);
  console.log('启动后同步次数:', calls.filter(c => c === 'webdav_upload').length, '上传 /', calls.filter(c => c === 'webdav_download').length, '下载');

  // 删除
  click({ act: 'task-del', id: 't1' });
  click({ act: 'confirm-ok' });
  await advance(100);   // 确认动作本身有 30ms 延迟
  const afterDel = localS();
  console.log('  debug: tasks=', JSON.stringify((afterDel.tasks || []).map(x => x.id)), 'trash=', (afterDel.trash || []).length, 'tomb keys=', Object.keys(afterDel.meta.tomb || {}));
  assert(!has(afterDel, 'tasks', 't1'), '删除后本机 tasks 里没有 t1');
  assert(!!afterDel.meta.tomb['tasks:t1'], '墓碑已写入 meta.tomb: ' + afterDel.meta.tomb['tasks:t1']);
  console.log('墓碑时间 - 条目 ut =', afterDel.meta.tomb['tasks:t1'] - T1.ut, 'ms');

  // 模拟：另一端把这条重新打了时间戳（比墓碑晚 117 秒）后上传回来
  await advance(7000);
  const C1 = JSON.parse(cloud['sync.json']);
  const tombNow = localS().meta.tomb['tasks:t1'];
  C1.data.tasks.push({ ...T1, ut: tombNow + 117000 });
  injectedUt.v = tombNow + 117000;
  cloud['sync.json'] = JSON.stringify(C1);
  console.log('已把 t1 以 ut = 墓碑+117s 塞回云端，等下一轮同步…');

  // 等自动同步跑几轮（模拟挂机 3 分钟）
  for (let i = 0; i < 20; i++) await advance(10000);

  const L = localS();
  const C = cloudS();
  assert(!has(L, 'tasks', 't1'), '3 分钟后本机仍然没有 t1（没被带回来）');
  assert(C && !has(C, 'tasks', 't1'), '云端也没有 t1');
  assert(L.meta.tomb['tasks:t1'] > injectedUt.v, '墓碑已推进到条目 ut 之后（' + L.meta.tomb['tasks:t1'] + ' > ' + injectedUt.v + '）');
  if (has(L, 'tasks', 't1')) {
    const back = L.tasks.find(x => x.id === 't1');
    console.log('  复活条目的 ut =', back.ut, '墓碑 =', L.meta.tomb['tasks:t1'], '差 =', back.ut - (L.meta.tomb['tasks:t1'] || 0));
  }
  console.log('回收站:', JSON.stringify((L.trash || []).map(e => e.id + '|' + e.kind)));
  console.log('请求统计: 下载', calls.filter(c => c === 'webdav_download').length, '上传', calls.filter(c => c === 'webdav_upload').length);

  // ---- 第二轮：删掉 t2 → 从回收站恢复 → 同步后不能被墓碑再删 ----
  click({ act: 'task-del', id: 't2' });
  click({ act: 'confirm-ok' });
  await advance(100);
  const trashEntry = (localS().trash || []).find(e => (e.items.tasks || []).some(x => x.id === 't2'));
  assert(!!trashEntry, 't2 已进回收站');
  click({ act: 'trash-restore', id: trashEntry.id });
  await advance(200);
  const afterUndo = localS();
  assert(has(afterUndo, 'tasks', 't2'), '恢复后 t2 回到列表');
  assert(!afterUndo.meta.tomb['tasks:t2'], '恢复后墓碑已清除');
  for (let i = 0; i < 10; i++) await advance(10000);
  const L2 = localS();
  assert(has(L2, 'tasks', 't2'), '同步多轮后 t2 仍在（没被墓碑二次删除）');
  assert(has(cloudS(), 'tasks', 't2'), '云端也有恢复后的 t2');
})();
