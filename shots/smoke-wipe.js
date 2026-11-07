/* 冒烟测试：清空本地数据 / 从云端重建 两个入口 */
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
let clickHandler = null;
global.document = {
  documentElement: makeEl(), body: makeEl(), activeElement: null,
  visibilityState: 'visible',
  getElementById: id => (els[id] || (els[id] = makeEl())),
  createElement: () => makeEl(),
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener(t, fn) { if (t === 'click') clickHandler = fn; }
};
global.window = global;
global.requestAnimationFrame = fn => setTimeout(fn, 16);
global.addEventListener = () => {};

const nav = { reloaded: 0, href: null };
global.location = {
  search: '',
  pathname: '/',
  reload() { nav.reloaded++; },
  set href(v) { nav.href = v; },
  get href() { return nav.href; }
};

const code = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf-8');
new Function(code)();

const click = ds => clickHandler({ target: { closest: () => ({ dataset: ds }) } });
let pass = 0, fail = 0;
function assert(cond, msg) {
  console.log((cond ? 'PASS: ' : 'FAIL: ') + msg);
  cond ? pass++ : fail++;
}

// 预置：真实数据 + 同步标记 + 云配置（自动同步开着）
store['mercury.plan.v1'] = JSON.stringify({ v: 2, meta: { tomb: {}, ut: 1 }, tasks: [{ id: 'x', title: '真实数据' }], projects: [], goals: [], habits: [], wishes: [], trivia: [], achievements: [], routines: [], hobbies: [], memos: [], trash: [], ui: {} });
store['mercury.sync.marks'] = '{"tasks:x":1}';
store['mercury.sync.before'] = '{"tasks:x":"{}"}';
store['mercury.sync.at'] = '123';
store['mercury.webdav'] = JSON.stringify({ user: 'u', pass: 'p', autoSync: true });
store['mercury.theme'] = 'day';

// 1. 载入演示数据：清 KEY / 标记，关自动同步
click({ act: 'wipe-demo' });
click({ act: 'confirm-ok' });
setTimeout(() => {
  assert(!('mercury.plan.v1' in store), 'wipe-demo 清掉了本机数据');
  assert(!('mercury.sync.marks' in store), 'wipe-demo 清掉了同步标记');
  assert(!('mercury.sync.before' in store), 'wipe-demo 清掉了合并前快照');
  assert(!('mercury.sync.at' in store), 'wipe-demo 清掉了同步时间');
  assert(JSON.parse(store['mercury.webdav']).autoSync === false, 'wipe-demo 关闭自动同步');
  assert(store['mercury.webdav'].includes('"user":"u"'), '账号保留');
  assert(store['mercury.theme'] === 'day', '主题保留');
  assert(nav.reloaded === 1, 'wipe-demo 触发重载');

  // 2. 从云端重建：清数据，保持自动同步，跳 ?empty=1
  click({ act: 'wipe-pull' });
  click({ act: 'confirm-ok' });
  setTimeout(() => {
    assert(!('mercury.plan.v1' in store), 'wipe-pull 清掉了本机数据');
    assert(JSON.parse(store['mercury.webdav']).autoSync === true, 'wipe-pull 保持自动同步');
    assert(nav.href === '/?empty=1', 'wipe-pull 跳到 ?empty=1（实际 ' + nav.href + '）');
    console.log('\n通过 ' + pass + ' 项，失败 ' + fail + ' 项');
    process.exit(fail ? 1 : 0);
  }, 80);
}, 80);
