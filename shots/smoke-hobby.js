/* 冒烟测试：用最小 DOM 桩加载 app.js，验证「兴趣爱好」模块 */
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
    set onclick(fn) { el._onclick = fn; }, get onclick() { return el._onclick; }
  };
  return el;
}

const els = {};
const doc = {
  documentElement: makeEl(),
  body: makeEl(),
  activeElement: null,
  getElementById: id => (els[id] || (els[id] = makeEl())),
  createElement: () => makeEl(),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {}
};
global.document = doc;
global.window = global;

const code = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf-8');
const IIFE = code.replace(/location\.search/g, "'?reset=1&route=hobbies'");
new Function(IIFE)();

const view = els['view'];
const html = view.innerHTML;

function assert(cond, msg) {
  if (!cond) { console.error('FAIL: ' + msg); process.exitCode = 1; }
  else console.log('PASS: ' + msg);
}

assert(html.indexOf('page-title">兴趣爱好') >= 0, '页面标题渲染（默认路由仍为今日，需带 route）');
assert(html.indexOf('hobby-card') >= 0, '爱好卡片渲染');
assert(html.indexOf('胶片摄影') >= 0 && html.indexOf('钢笔字') >= 0, '种子数据显示');
assert(html.indexOf('data-act="hobby-log"') >= 0 && html.indexOf('data-act="open-hobby"') >= 0, '「记一笔 / 全部记录」按钮存在');

const sidebar = els['sidebar'].innerHTML;
assert(sidebar.indexOf('data-route="hobbies"') >= 0 && sidebar.indexOf('兴趣爱好') >= 0, '侧边栏出现「兴趣爱好」入口');

const data = (store['mercury.plan.v1'] ? JSON.parse(store['mercury.plan.v1']) : null) || { hobbies: null };
assert(Array.isArray(data.hobbies) || html.indexOf('本月投入') >= 0, '爱好数据结构可用（种子渲染出统计）');

console.log('\n冒烟测试结束');
