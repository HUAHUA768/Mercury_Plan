// A→W 回灌：用桌面端（Windows 版）自己的 ui/app.js + ui/index.html 跑一次「导入备份」，
// 走真实的 <input type=file> → FileReader → validateBackup → askConfirm → 覆盖 流程，
// 只把文件来源换成 jsdom 的 File 对象。数据用手机端真实导出的 A-export.json。
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const SRC = 'E:/Mercury_Plan/ui';
const FILES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['E:/Mercury_Plan_Android/.workbuddy/p3/A-export.json'];

const ARR = ['tasks', 'projects', 'goals', 'habits', 'wishes', 'trivia', 'achievements', 'routines', 'hobbies', 'memos', 'trash'];

function counts(obj) {
  const o = {};
  ARR.forEach(k => { o[k] = Array.isArray(obj[k]) ? obj[k].length : 'MISSING'; });
  return o;
}

for (const file of FILES) {
  const dom = new JSDOM(fs.readFileSync(path.join(SRC, 'index.html'), 'utf8'), {
    url: 'https://mercury.local/index.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
      window.__TAURI__ = { core: { invoke: () => Promise.resolve(null) } };
      // 拦截 <input type=file> 的 click，换成 jsdom File
      window.__lastFileInput = null;
      const orig = window.HTMLInputElement.prototype.click;
      window.HTMLInputElement.prototype.click = function () {
        window.__lastFileInput = this;
      };
    }
  });

  const w = dom.window;
  const el = w.document.createElement('script');
  el.textContent = fs.readFileSync(path.join(SRC, 'app.js'), 'utf8');
  w.document.body.appendChild(el);
  await new Promise(r => setTimeout(r, 300));

  // 打开设置抽屉 → 点导入备份
  w.document.querySelector('[data-act="settings"]').click();
  await new Promise(r => setTimeout(r, 200));
  w.document.querySelector('[data-act="backup-import"]').click();
  await new Promise(r => setTimeout(r, 200));

  const input = w.__lastFileInput;
  if (!input) { console.log(file, '=> 未捕获到文件选择 input'); continue; }

  const text = fs.readFileSync(file, 'utf8');
  const f = new w.File([text], path.basename(file), { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [f], configurable: true });
  input.onchange(new w.Event('change'));
  await new Promise(r => setTimeout(r, 300));

  // 确认弹窗 → 覆盖并导入
  const ok = w.document.querySelector('#modalLayer [data-act="confirm-ok"]');
  if (!ok) { console.log(file, '=> 没有出现确认弹窗（可能被校验拦下）');
    const layer = w.document.getElementById('modalLayer');
    console.log('  modalLayer 内容片段:', (layer.innerHTML || '').slice(0, 200));
    continue;
  }
  ok.click();
  await new Promise(r => setTimeout(r, 300));

  // 读导入后的 localStorage
  const s = JSON.parse(w.localStorage.getItem('mercury.plan.v1'));
  console.log(path.basename(file), '=> 导入成功');
  console.log('  counts:', JSON.stringify(counts(s)));
  console.log('  theme:', s.theme, ' meta:', JSON.stringify(s.meta));
  // 顺手验证下还原出的ui状态能被桌面版代码接受（桌面版没有 tabs 字段也不该报错）
  dom.window.close();
}
