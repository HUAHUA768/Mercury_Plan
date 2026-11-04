const WS_URL = process.argv[2];
const ws = new WebSocket(WS_URL);
let id = 0;
const pending = new Map();
function send(method, params) {
  return new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};
ws.onopen = async () => {
  await send('Runtime.enable', {});
  async function evalJs(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: false });
    return r.result && r.result.result ? r.result.result : r.result;
  }
  const checks = {
    readyState: 'document.readyState',
    hasS: 'typeof S',
    route: "typeof S!=='undefined' ? S.ui.route : 'no S'",
    navCount: "document.querySelectorAll('[data-act=\\\"nav\\\"]').length",
    clickHandlersBound: "typeof window.__layerDepth",
    layers: "typeof window.__wbLayers"
  };
  for (const [k, expr] of Object.entries(checks)) {
    console.log(k, '=>', JSON.stringify(await evalJs(expr)));
  }
  // 试着用 JS 直接触发一次导航点击
  console.log('clickResult =>', JSON.stringify(await evalJs(
    "(function(){var els=document.querySelectorAll('[data-act=\\\"nav\\\"]');if(!els.length)return 'no nav els';var el=els[1];var r=el.getBoundingClientRect();el.click();return 'clicked '+el.textContent.trim()+' rect='+r.x+','+r.y+' route='+S.ui.route;})()"
  )));
  await new Promise(r => setTimeout(r, 800));
  console.log('routeAfter =>', JSON.stringify(await evalJs("S.ui.route")));
  // 收集页面错误标志
  console.log('lastError =>', JSON.stringify(await evalJs("window.onerror ? 'has onerror' : 'no onerror'")));
  process.exit(0);
};
ws.onerror = (e) => { console.log('WS ERROR', e.message || e); process.exit(1); };
setTimeout(() => { console.log('TIMEOUT'); process.exit(2); }, 15000);
