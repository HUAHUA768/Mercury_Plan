// 通过 WebView DevTools 在页面里跑一段表达式并打印结果
// 用法: node cdp.mjs "<expression>"   （先 adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>）
const expr = process.argv[2] || "1+1";

const list = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = list.find(p => p.type === "page") || list[0];
if (!page) { console.error("没有可调试页面"); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
function send(method, params) {
  return new Promise(resolve => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}
ws.onmessage = ev => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
};
ws.onopen = async () => {
  await send("Runtime.enable", {});
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  const res = r.result || {};
  if (res.exceptionDetails) {
    console.log("EXCEPTION:", res.exceptionDetails.text, res.exceptionDetails.exception && res.exceptionDetails.exception.description);
  } else {
    console.log(typeof res.result.value === "string" ? res.result.value : JSON.stringify(res.result.value));
  }
  process.exit(0);
};
ws.onerror = e => { console.log("WS ERROR", e.message || e); process.exit(1); };
setTimeout(() => { console.log("TIMEOUT"); process.exit(2); }, 20000);
