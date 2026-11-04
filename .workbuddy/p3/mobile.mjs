// 手机端（Tauri Android WebView）P3 用例驱动
// 前提：
//   1) node 侧已 adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
//   2) 已 adb reverse tcp:8765 tcp:8765，且 PC 上有 http 服务指向 .workbuddy/p3
// 用法：
//   node mobile.mjs snap  <outfile>        导出当前 localStorage 到文件
//   node mobile.mjs import <file.json> [--confirm]   走真实「设置→导入备份」流程
//   node mobile.mjs state                  读当前页面状态
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:8765/';

async function connect() {
  const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const page = list.find(p => p.type === 'page') || list[0];
  if (!page) throw new Error('没有可调试页面');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  });
  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', () => rej(new Error('WS 连接失败')));
  });
  const send = (method, params) => new Promise(resolve => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
  await send('Runtime.enable', {});
  return {
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      const res = r.result || {};
      if (res.exceptionDetails) {
        return { __error: res.exceptionDetails.text + ' ' + (res.exceptionDetails.exception?.description || '') };
      }
      return res.result.value;
    },
    close() { ws.close(); }
  };
}

const EXPR_STATE = `(() => {
  const S = (() => { try { return JSON.parse(localStorage.getItem('mercury.plan.v1')) || {}; } catch (e) { return {}; } })();
  const cnt = k => Array.isArray(S[k]) ? S[k].length : 'MISSING';
  const ml = document.getElementById('modalLayer');
  return {
    modalOpen: !!(ml && !ml.hasAttribute('hidden')),
    modalTitle: (document.querySelector('#modalLayer h3')?.textContent || '').trim(),
    modalDetail: (document.querySelector('#modalLayer .m-sub')?.textContent || '').trim(),
    hasConfirmOk: !!document.querySelector('#modalLayer [data-act="confirm-ok"]'),
    toasts: [...document.querySelectorAll('.toast, .toast-wrap')].map(t => t.textContent.trim()).filter(Boolean),
    tabs: S.ui && S.ui.tabs ? S.ui.tabs : null,
    counts: { tasks: cnt('tasks'), projects: cnt('projects'), goals: cnt('goals'), habits: cnt('habits'),
              routines: cnt('routines'), hobbies: cnt('hobbies'), memos: cnt('memos'), trivia: cnt('trivia'),
              achievements: cnt('achievements'), wishes: cnt('wishes'), trash: cnt('trash') },
    theme: S.theme || null,
    ver: window.APP_VER || null
  };
})()`;

const mode = process.argv[2];

if (mode === 'snap') {
  const out = process.argv[3] || 'phone-snap.json';
  const c = await connect();
  const raw = await c.eval(`localStorage.getItem('mercury.plan.v1')`);
  c.close();
  if (!raw || typeof raw !== 'string') { console.log('抓取失败:', JSON.stringify(raw)); process.exit(1); }
  fs.writeFileSync(out, raw, 'utf8');
  console.log('已保存', out, raw.length, 'bytes');
  process.exit(0);
}

if (mode === 'state') {
  const c = await connect();
  const v = await c.eval(EXPR_STATE);
  c.close();
  console.log(JSON.stringify(v, null, 2));
  process.exit(0);
}

if (mode === 'import') {
  const file = process.argv[3];
  const confirm = process.argv.includes('--confirm');
  if (!file) { console.error('缺少文件名'); process.exit(1); }
  const c = await connect();

  // 1) 关闭可能残留的弹层，清掉旧 toast
  await c.eval(`(() => {
    document.querySelectorAll('#toastWrap .toast').forEach(n => n.remove());
    const layer = document.getElementById('modalLayer');
    const close = layer && layer.querySelector('[data-act="m-close"], [data-act="confirm-cancel"], [data-act="close"]');
    if (layer && !layer.hasAttribute('hidden') && close) close.click();
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 250));

  // 2) 把文件字节以 base64 分块注入页面，模拟 platform.pickJsonText 的返回值
  //    （含 BOM 剥离，与 platform.js 真机实现逐字一致）
  const b64 = fs.readFileSync(file).toString('base64');
  const CHUNK = 800000;
  await c.eval(`window.__buf = ''; window.__pickLog = []; true`);
  for (let i = 0; i < b64.length; i += CHUNK) {
    const part = b64.slice(i, i + CHUNK);
    const r = await c.eval(`(window.__buf += ${JSON.stringify(part)}).length`);
    if (typeof r !== 'number') { console.log('注入中断:', JSON.stringify(r)); c.close(); process.exit(1); }
  }
  const setup = await c.eval(`(() => {
    if (window.__buf.length !== ${b64.length}) return 'len-mismatch:' + window.__buf.length;
    window.MercuryPlatform.pickJsonText = async () => {
      const bin = atob(window.__buf);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const t = new TextDecoder('utf-8').decode(bytes);
      window.__pickLog.push('picked:' + t.length);
      return String(t).replace(/^\\uFEFF/, '');
    };
    return 'ok';
  })()`);
  if (setup !== 'ok') { console.log('注入失败:', JSON.stringify(setup)); c.close(); process.exit(1); }

  // 3) 点「设置」→「导入备份」
  const clicked = await c.eval(`(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    let setBtn = document.querySelector('[data-act="settings"]');
    if (!setBtn) {
      // 移动端设置入口在「更多」面板里
      const more = document.querySelector('.nav [data-act="more"]');
      if (!more) return 'no-more-btn';
      more.click();
      await wait(450);
      setBtn = document.querySelector('[data-act="settings"]');
    }
    if (!setBtn) return 'no-settings-btn';
    setBtn.click();
    await wait(400);
    const impBtn = document.querySelector('[data-act="backup-import"]');
    if (!impBtn) return 'no-import-btn';
    // 先挂监听，记录所有出现过的 toast（避免时序漏抓）
    window.__toastLog = [];
    const tw = document.getElementById('toastWrap');
    if (tw) new MutationObserver(() => {
      tw.querySelectorAll('.toast').forEach(t => {
        const x = t.textContent.trim();
        if (x && !window.__toastLog.includes(x)) window.__toastLog.push(x);
      });
    }).observe(tw, { childList: true, subtree: true });
    impBtn.click();
    // 轮询：文件读取 + 校验 + 弹确认框都可能异步，逐帧记录首个可观测结果
    window.__events = [];
    for (let i = 0; i < 30; i++) {
      await wait(150);
      const ml = document.getElementById('modalLayer');
      const ok = !!document.querySelector('#modalLayer [data-act="confirm-ok"]');
      const ts = [...document.querySelectorAll('.toast')].map(t => t.textContent.trim());
      const sig = (ok ? 'CONFIRM|' : 'modal|') + (ml ? ml.textContent.replace(/\\s+/g, ' ').slice(0, 60) : '') + '|' + ts.join(';');
      if (!window.__events.length || window.__events[window.__events.length - 1] !== sig) window.__events.push(sig);
      if (ok || ts.length) break;
    }
    return 'clicked';
  })()`);

  const st = await c.eval(EXPR_STATE);
  const events = await c.eval(`JSON.stringify(window.__events || [])`);
  const toastLog = await c.eval(`JSON.stringify(window.__toastLog || [])`);
  const pickLog = await c.eval(`JSON.stringify(window.__pickLog || [])`);
  let result = { file, clicked, phase: 'after-pick', toastLog, pickLog, events, state: st };

  if (confirm && st && st.hasConfirmOk) {
    const okRes = await c.eval(`(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      document.querySelector('#modalLayer [data-act="confirm-ok"]').click();
      await wait(1200);
      return 'confirmed';
    })()`);
    await new Promise(r => setTimeout(r, 300));
    result.phase = 'after-confirm';
    result.confirmed = okRes;
    result.after = await c.eval(EXPR_STATE);
    result.pickLog = await c.eval(`JSON.stringify(window.__pickLog || [])`);
  }
  c.close();
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

console.error('未知子命令');
process.exit(1);
