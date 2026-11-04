/* ===========================================================
   平台适配层：告诉 app.js 当前平台，并提供「读一个 JSON / 存一个 JSON」
   - 桌面：导入仍走 app.js 原有的 <input type=file>，本文件只接管导出
   - 安卓：走系统文件选择器（SAF）+ fs 插件读写
   必须在 app.js 之前加载
   =========================================================== */
(function () {
  const UA = navigator.userAgent || '';
  const isAndroid = /Android/i.test(UA);
  const T = window.__TAURI__ || {};
  const invokeCore = T.core && T.core.invoke ? T.core.invoke.bind(T.core) : null;

  const FILTERS = [{ name: '水星计划备份', extensions: ['json'] }];

  function api(name) {
    if (T[name]) return T[name];
    if (T.plugin && T.plugin[name]) return T.plugin[name];
    return null;
  }

  function call(cmd, args) {
    if (!invokeCore) return Promise.reject(new Error('文件功能不可用，请重新构建应用'));
    return invokeCore(cmd, args);
  }

  function first(v) {
    return Array.isArray(v) ? v[0] : v;
  }

  // dialog 选中的路径（安卓是 content:// URI）默认不在 fs 作用域里，先放行
  async function allowPath(path) {
    try { await call('allow_fs_path', { path }); } catch (e) { /* 放行失败交给 fs 自己报错 */ }
  }

  async function openDialog() {
    const d = api('dialog');
    if (d && d.open) {
      return first(await d.open({ multiple: false, directory: false, filters: FILTERS }));
    }
    return first(await call('plugin:dialog|open', {
      options: { multiple: false, directory: false, filters: FILTERS }
    }));
  }

  async function saveDialog(defaultPath) {
    const d = api('dialog');
    if (d && d.save) {
      return first(await d.save({ defaultPath, filters: FILTERS }));
    }
    return first(await call('plugin:dialog|save', {
      options: { defaultPath, filters: FILTERS }
    }));
  }

  async function readText(path) {
    const f = api('fs');
    if (f && f.readTextFile) return f.readTextFile(path);
    const bytes = await call('plugin:fs|read_text_file', { path, options: {} });
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  }

  async function writeText(path, text) {
    const f = api('fs');
    if (f && f.writeTextFile) return f.writeTextFile(path, text);
    const data = Array.from(new TextEncoder().encode(text));
    return call('plugin:fs|write_text_file', { path, data, options: {} });
  }

  /**
   * 桌面返回 null（调用方继续用 <input type=file>）；
   * 安卓返回文件内容字符串。
   */
  async function pickJsonText() {
    if (!isAndroid) return null;
    const path = await openDialog();
    if (!path) return null;
    await allowPath(path);
    const text = await readText(path);
    // 安卓端另存的文件可能带 BOM，必须剥掉再 JSON.parse
    return String(text).replace(/^\uFEFF/, '');
  }

  /**
   * 双端同一条路径：系统保存对话框 + 直接写文件。返回最终路径，取消则 null。
   */
  async function saveJsonText(defaultName, text) {
    let path = await saveDialog(defaultName);
    if (!path) return null;
    if (!isAndroid && !/\.json$/i.test(path)) path += '.json';
    await allowPath(path);
    await writeText(path, text);
    return path;
  }

  // 安卓的 content:// URI 不适合直接展示，换成友好文案
  function friendlyPath(path) {
    if (!path) return '';
    if (/^content:\/\//i.test(path)) {
      let name = '';
      try { name = decodeURIComponent(path).split('/').pop() || ''; } catch (e) { name = ''; }
      return name ? `${name}（已保存到手机里你选择的位置）` : '已保存到手机里你选择的位置';
    }
    return path;
  }

  window.MercuryPlatform = { isAndroid, pickJsonText, saveJsonText, friendlyPath };
})();
