/* 冒烟测试：心愿的子项（渲染 + 勾选 + 新增 + 删除） */
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
    innerHTML: '', value: '', hidden: true, scrollTop: 0, textContent: '',
    classList: { add() {}, remove() {}, contains: () => false },
    dataset: {}, style: {},
    addEventListener() {}, focus() {}, click() { if (el._onclick) el._onclick(); },
    removeAttribute() {}, setAttribute() {}, getAttribute: () => null,
    appendChild() {}, remove() {}, querySelector: () => null, querySelectorAll: () => [],
    closest: () => null, contains: () => false,
    children: { length: 0 }, firstElementChild: { remove() {} }, lastElementChild: null,
    insertBefore() {}, after() {}, before() {},
    set onclick(fn) { el._onclick = fn; }, get onclick() { return el._onclick; }
  };
  return el;
}

const els = {};
let clickHandler = null;
const doc = {
  documentElement: makeEl(),
  body: makeEl(),
  activeElement: null,
  getElementById: id => (els[id] || (els[id] = makeEl())),
  createElement: () => makeEl(),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener(type, fn) { if (type === 'click') clickHandler = fn; }
};
global.document = doc;
global.window = global;

const code = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf-8');
const IIFE = code.replace(/location\.search/g, "'?reset=1&route=wishes'");
new Function(IIFE)();

function assert(cond, msg) {
  if (!cond) { console.error('FAIL: ' + msg); process.exitCode = 1; }
  else console.log('PASS: ' + msg);
}

const view = () => els['view'].innerHTML;
const click = ds => clickHandler({ target: { closest: () => ({ dataset: ds }) } });

let html = view();
assert(html.indexOf('page-title">心愿清单') >= 0, '心愿页渲染');
assert(html.indexOf('data-act="wish-item-toggle"') >= 0, '子项勾选行存在');
assert(html.indexOf('办申根签证') >= 0, '种子子项显示');
assert(html.indexOf('id="wi-w3"') >= 0, '卡片内可输入新子项');
assert(/wish-items-head[\s\S]*?0\/3/.test(html), '子项进度 0/3');
assert(html.indexOf('3 个待办子项') >= 0 || html.indexOf('个待办子项') >= 0, '页头统计子项');

// 勾选：w3 的第一项
click({ act: 'wish-item-toggle', id: 'w3', iid: 'wi6' });
html = view();
assert(/1\/3/.test(html), '勾选后进度变 1/3');
assert(/wish-item on"[\s\S]*?办申根签证/.test(html) || html.indexOf('wish-item on') >= 0, '勾选态样式生效');

// 新增：w4 原本没有子项
doc.getElementById('wi-w4').value = '搜暗房课时间';
click({ act: 'wish-item-add', id: 'w4' });
html = view();
assert(html.indexOf('搜暗房课时间') >= 0, '卡片里直接加子项');

// 删除：从 w4 身上删掉刚加的那一项
const w4now = JSON.parse(store['mercury.plan.v1']).wishes.find(w => w.id === 'w4');
click({ act: 'wish-item-del', id: 'w4', iid: w4now.items[0].id });
html = view();
assert(html.indexOf('搜暗房课时间') < 0, '删子项生效');

const data = JSON.parse(store['mercury.plan.v1']);
const w3 = data.wishes.find(w => w.id === 'w3');
assert(w3 && w3.items.length === 3 && w3.items[0].done === true, '数据已持久化到 localStorage');
const w4 = data.wishes.find(w => w.id === 'w4');
assert(w4 && w4.items.length === 0, '新子项删除后写回数据');

// 标记已实现：子项全部勾上
click({ act: 'wish-done', id: 'w3' });
const data2 = JSON.parse(store['mercury.plan.v1']);
const w3b = data2.wishes.find(w => w.id === 'w3');
assert(w3b.status === 'done' && w3b.items.every(i => i.done), '标记已实现时子项一并勾上');

console.log('\n冒烟测试结束');
