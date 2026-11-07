// 通过 CDP 读取运行中应用的 localStorage（只读）
const http = require('http');

function getJson(url) {
  return new Promise((res, rej) => {
    http.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej);
  });
}

(async () => {
  const list = await getJson('http://127.0.0.1:9222/json');
  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const send = (method, params) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await new Promise(r => ws.addEventListener('open', r));
  await send('Runtime.enable', {});

  const expr = process.argv[2] || 'localStorage.getItem("mercury.plan.v1").length';
  const out = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  const v = out.result && out.result.result ? out.result.result.value : null;
  console.log(typeof v === 'string' ? v : JSON.stringify(v));
  ws.close();
  process.exit(0);
})();
