// 用桌面端（Windows 版）自己的 ui/app.js 跑一次「导出备份」，
// 只把 Tauri 的 export_backup 命令替换成“把内容写到文件”，
// 其余（createBackup / 数据 / 序列化方式）全部是桌面端的原样代码。
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const SRC = 'E:/Mercury_Plan/ui';
const OUT = 'E:/Mercury_Plan_Android/.workbuddy/p3/W-export.json';

let captured = null;

const dom = new JSDOM(fs.readFileSync(path.join(SRC, 'index.html'), 'utf8'), {
  url: 'file:///E:/Mercury_Plan/ui/index.html',
  runScripts: 'dangerously',
  resources: undefined,
  pretendToBeVisual: true,
  beforeParse(window) {
    window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
    window.__TAURI__ = {
      core: {
        invoke(cmd, args) {
          if (cmd === 'export_backup') {
            captured = { content: args.content, defaultName: args.defaultName };
            return Promise.resolve('C:\\Users\\admin\\Desktop\\' + args.defaultName);
          }
          return Promise.resolve(null);
        }
      }
    };
  }
});

// index.html 用 <script src="app.js"> 引入，jsdom 默认不加载外部资源，手动补上
const appjs = fs.readFileSync(path.join(SRC, 'app.js'), 'utf8');
const el = dom.window.document.createElement('script');
el.textContent = appjs;
dom.window.document.body.appendChild(el);

await new Promise(r => setTimeout(r, 300));

const doc = dom.window.document;
// 桌面端的「导出备份」在设置抽屉里，先点开设置
doc.querySelector('[data-act="settings"]').click();
await new Promise(r => setTimeout(r, 200));

const btn = doc.querySelector('[data-act="backup-export"]');
if (!btn) {
  console.error('找不到导出按钮，DOM 里 data-act 列表：',
    [...doc.querySelectorAll('[data-act]')].map(e => e.dataset.act).slice(0, 40));
  process.exit(1);
}
btn.click();
await new Promise(r => setTimeout(r, 500));

if (!captured) { console.error('未捕获到导出的内容'); process.exit(1); }
fs.writeFileSync(OUT, captured.content, 'utf8');
const b = JSON.parse(captured.content);
const arrs = ['tasks', 'projects', 'goals', 'habits', 'wishes', 'trivia', 'achievements', 'routines', 'hobbies', 'memos', 'trash'];
console.log('桌面端导出文件名：', captured.defaultName);
console.log('字节数：', Buffer.byteLength(captured.content, 'utf8'));
console.log('format/version/theme：', b.format, b.version, b.theme);
console.log(arrs.map(k => `${k}=${Array.isArray(b.data[k]) ? b.data[k].length : 'MISSING'}`).join('  '));
