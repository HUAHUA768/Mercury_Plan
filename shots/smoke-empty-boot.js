/* 冒烟：?empty=1 空数据启动 → 自动同步把云端内容整份拉回 */
const fs = require('fs');
const path = require('path');

const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};

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
global.document = {
  documentElement: makeEl(), body: makeEl(), activeElement: null,
  visibilityState: 'visible',
  getElementById: id => (els[id] || (els[id] = makeEl())),
  createElement: () => makeEl(),
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}
};
global.window = global;
global.location = { search: '?empty=1', pathname: '/', reload() {} };
global.requestAnimationFrame = fn => setTimeout(fn, 16);
global.addEventListener = () => {};

let now = 0, seq = 0;
const timers = new Map();
global.setTimeout = (fn, ms) => { const id = ++seq; timers.set(id, { at: now + (Number(ms) || 0), fn, id }); return id; };
global.clearTimeout = id => timers.delete(id);
global.setInterval = (fn, ms) => global.setTimeout(function t() { fn(); global.setTimeout(t, ms); }, ms);
global.clearInterval = global.clearTimeout;
const flush = async () => { for (let i = 0; i < 30; i++) await new Promise(r => setImmediate(r)); };
async function advance(ms) {
  const target = now + ms;
  await flush();
  for (;;) {
    let next = null;
    for (const t of timers.values()) if (t.at <= target && (!next || t.at < next.at)) next = t;
    if (!next) break;
    timers.delete(next.id); now = next.at;
    try { next.fn(); } catch (e) { console.error('timer error:', e.message); }
    await flush();
  }
  now = target; await flush();
}

const cloud = {};
global.__TAURI__ = {
  core: {
    invoke(cmd, args) {
      if (cmd === 'webdav_download') {
        if (!(args.filename in cloud)) return Promise.reject(new Error('文件不存在 (404)'));
        return Promise.resolve(cloud[args.filename]);
      }
      if (cmd === 'webdav_upload') { cloud[args.filename] = args.content; return Promise.resolve('ok'); }
      return Promise.resolve(null);
    }
  }
};

// 云端：两条真实数据
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TODAY = iso(new Date());
const remote = {
  v: 2,
  meta: { deviceId: 'dev-phone', tomb: {}, ut: Date.now() - 5000 },
  tasks: [
    { id: 'r1', title: '真实待办一', date: TODAY, done: false, ut: Date.now() - 9000 },
    { id: 'r2', title: '真实待办二', date: TODAY, done: true, ut: Date.now() - 8000 }
  ],
  projects: [], goals: [], habits: [], wishes: [], trivia: [], achievements: [],
  routines: [], hobbies: [], memos: [], trash: [],
  ui: { route: 'today', cursor: TODAY }
};
cloud['sync.json'] = JSON.stringify({ format: 'mercury-plan-sync', version: 1, app: '水星计划', data: remote });
store['mercury.webdav'] = JSON.stringify({ user: 'u', pass: 'p', autoSync: true });

new Function(fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf-8'))();

let pass = 0, fail = 0;
const assert = (c, m) => { console.log((c ? 'PASS: ' : 'FAIL: ') + m); c ? pass++ : fail++; };

(async () => {
  const boot = JSON.parse(store['mercury.plan.v1'] || 'null');
  assert(!boot || (boot.tasks || []).length === 0, '空数据启动（没有演示数据）');
  assert(!boot || !boot.meta.demo, '空数据不标记为演示数据');

  await advance(4000);
  const S = JSON.parse(store['mercury.plan.v1']);
  assert((S.tasks || []).length === 2, '云端两条已拉回本机（实际 ' + (S.tasks || []).length + ' 条）');
  assert(!S.meta.demo, '拉回后仍不是演示数据');
  const up = JSON.parse(cloud['sync.json']).data;
  assert((up.tasks || []).length === 2, '上传结果没有把云端弄丢，也没有多出演示数据');
  console.log('\n通过 ' + pass + ' 项，失败 ' + fail + ' 项');
  process.exit(fail ? 1 : 0);
})();
