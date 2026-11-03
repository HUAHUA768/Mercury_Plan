/* 冒烟测试：习惯「编辑/改名」链路（DOM 桩，不依赖浏览器） */
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
    children: [], firstElementChild: null,
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
const handlers = {};
const doc = {
  documentElement: makeEl(),
  body: makeEl(),
  activeElement: null,
  getElementById: id => (els[id] || (els[id] = makeEl())),
  createElement: () => makeEl(),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: (t, fn) => { handlers[t] = fn; }
};
global.document = doc;
global.window = global;
global.setTimeout = (fn) => 0;

const code = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf-8');
new Function(code.replace(/location\.search/g, "'?reset=1&route=habits'"))();

function assert(cond, msg) {
  if (!cond) { console.error('FAIL: ' + msg); process.exitCode = 1; }
  else console.log('PASS: ' + msg);
}
const click = dataset => handlers.click({ target: { closest: () => ({ dataset }) } });
const data = () => JSON.parse(store['mercury.plan.v1'] || '{}');
const habit = id => (data().habits || []).find(h => h.id === id);

assert(els['view'].innerHTML.indexOf('养成') >= 0, '习惯页渲染');

// 1. 打开抽屉，应出现编辑入口
click({ act: 'open-habit', id: 'h1' });
const drawer = els['drawer'].innerHTML;
assert(drawer.indexOf('data-act="habit-edit"') >= 0, '抽屉里有「编辑」入口');

// 2. 点编辑 → 弹出带名称/目标/备注的弹窗
click({ act: 'habit-edit', id: 'h1' });
const modal = els['modalLayer'].innerHTML;
assert(modal.indexOf('id="ehName"') >= 0, '编辑弹窗有名称输入框');
assert(modal.indexOf('id="ehTarget"') >= 0, '养成习惯可改每天目标');
assert(modal.indexOf('id="ehNote"') >= 0, '编辑弹窗有备注输入框');
assert(modal.indexOf('早起 6:30') >= 0, '名称预填当前值');

// 3. 改名 + 改目标 + 备注，保存
doc.getElementById('ehName').value = '  早起 6:00  ';
doc.getElementById('ehTarget').value = '2';
doc.getElementById('ehNote').value = ' 醒来先喝水 ';
els['drawer'].classList.contains = () => true;
click({ act: 'habit-save', id: 'h1' });
const h1 = habit('h1');
assert(h1.name === '早起 6:00', '改名生效且去掉首尾空格');
assert(h1.target === 2, '每天目标已更新');
assert(h1.note === '醒来先喝水', '备注已更新');
assert(Object.keys(h1.records || {}).length > 0, '历史打卡记录保留');
assert(els['modalLayer'].innerHTML === '', '保存后弹窗关闭');

// 4. 空名字不应保存
click({ act: 'habit-edit', id: 'h2' });
doc.getElementById('ehName').value = '   ';
click({ act: 'habit-save', id: 'h2' });
assert(habit('h2').name === '阅读 30 分钟', '空名字被拒绝，原名不变');

// 5. 戒除习惯：只能改名字和备注，不出现目标输入框
click({ act: 'habit-edit', id: 'q1' });
const qModal = els['modalLayer'].innerHTML;
assert(qModal.indexOf('id="ehName"') >= 0 && qModal.indexOf('id="ehTarget"') < 0, '戒除习惯编辑弹窗不含目标次数');
doc.getElementById('ehName').value = '不喝奶茶';
click({ act: 'habit-save', id: 'q1' });
assert(habit('q1').name === '不喝奶茶', '戒除习惯改名生效');

console.log(process.exitCode ? '\n有失败项' : '\n全部通过');
