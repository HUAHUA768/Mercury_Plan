# 安卓端多设备同步 · 施工方案

目标：安卓版与 Windows 版共用云端 `/MercuryPlan/sync.json`，同步时**按条目合并**而不是整包覆盖。
电脑记了 A、手机记了 B，任何一端点同步，两端最后都是 A+B。

前置确认（安卓工作区 `ui/app.js`）：

```bash
grep -n "function save()\|webdav_download\|case 'jd-restore'" ui/app.js
```

三条都能搜到就可以照下面改，Rust 端不用动。

本文所有代码块与 Windows 版 `E:\Mercury_Plan\ui\app.js` 中的对应段落逐字一致，可以直接复制；改完用 `node --check ui/app.js` 过一遍语法。安卓端的 `platform.js`、移动端样式不影响这套逻辑，不需要动。

---

## 一、状态初始化：给数据加同步字段

**位置**：`ui/app.js` 里 `if (S.v !== 2) { S.v = 2; }` 这一行**之后**、`function save()` **之前**。

```js
  // ---------- 多设备同步：每条记录的修改时间 ----------
  // 每条记录带一个 ut（修改时间戳），内存里带墓碑 tomb，合并时按条目取新、按墓碑删旧。
  const SYNC_COLLECTIONS = ['tasks', 'projects', 'goals', 'habits', 'wishes', 'trivia', 'achievements', 'routines', 'hobbies', 'memos', 'trash'];

  if (!S.meta || typeof S.meta !== 'object') S.meta = {};
  if (!S.meta.tomb || typeof S.meta.tomb !== 'object') S.meta.tomb = {};
  if (!S.meta.deviceId) S.meta.deviceId = 'dev-' + Math.random().toString(36).slice(2, 10);

  let maxSeenUt = 0;
  (function scanMaxUt() {
    SYNC_COLLECTIONS.forEach(coll => (S[coll] || []).forEach(it => {
      if (it && Number(it.ut) > maxSeenUt) maxSeenUt = Number(it.ut);
    }));
    Object.keys(S.meta.tomb).forEach(k => { if (Number(S.meta.tomb[k]) > maxSeenUt) maxSeenUt = Number(S.meta.tomb[k]); });
  })();

  function nextUt() {
    const t = Math.max(Date.now(), maxSeenUt + 1);
    maxSeenUt = t;
    return t;
  }

  function itemSig(item) {
    const o = {};
    Object.keys(item).forEach(k => { if (k !== 'ut') o[k] = item[k]; });
    return JSON.stringify(o);
  }

  function indexState(state) {
    const map = {};
    SYNC_COLLECTIONS.forEach(coll => {
      (state[coll] || []).forEach(it => {
        if (!it || it.id == null) return;
        map[coll + ':' + it.id] = itemSig(it);
      });
    });
    return map;
  }

  // 老数据没有 ut，升级时统一补一个基准时间，之后每次改动只更新被改的那几条
  (function stampLegacy() {
    const t = nextUt();
    let stamped = false;
    SYNC_COLLECTIONS.forEach(coll => (S[coll] || []).forEach(it => {
      if (it && it.ut == null) { it.ut = t; stamped = true; }
    }));
    if (stamped) { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 忽略 */ } }
  })();

  let syncBase = indexState(S);

  // 保存时对比上一次落盘的快照，找出新增/修改/删除并打时间戳与墓碑
  function stampChanges() {
    const prev = syncBase;
    const next = indexState(S);
    const t = nextUt();
    let changed = false;
    SYNC_COLLECTIONS.forEach(coll => (S[coll] || []).forEach(it => {
      if (!it || it.id == null) return;
      const key = coll + ':' + it.id;
      if (!prev || prev[key] !== next[key]) { it.ut = t; changed = true; }
    }));
    if (prev) {
      Object.keys(prev).forEach(key => {
        if (!next[key] && !S.meta.tomb[key]) { S.meta.tomb[key] = t; changed = true; }
      });
    }
    syncBase = next;
    if (changed) onLocalChange();
  }

  function onLocalChange() {
    S.meta.ut = nextUt();
    // 用户第一次真正改动后就不再是演示数据，也不再每天重置
    if (S.meta.demo) { S.meta.demo = false; S.meta.seedDate = null; }
    scheduleAutoSync();
  }
```

## 二、save() 换成带标记的版本

**位置**：原 `function save() { ... }` 整段替换。

```js
  function save() {
    try { stampChanges(); } catch (e) { /* 同步标记失败不影响保存 */ }
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 无痕模式等场景忽略 */ }
  }
```

## 三、新增同步模块

**位置**：`function cloudDelete(file) { ... }` 之后、`function openCloudHelp()` **之前**，整段粘贴。

```js
  // ---------- 多设备同步（按条目合并，不覆盖整包） ----------
  const SYNC_FILE = 'sync.json';
  const SYNC_FORMAT = 'mercury-plan-sync';
  const SYNC_BEFORE_KEY = 'mercury.sync.before';
  const SYNC_GAP = 20000;        // 两次自动同步之间的最小间隔
  const SYNC_DEBOUNCE = 6000;    // 改动停下多久后自动上传
  let syncTimer = null;
  let syncReady = false;
  let syncing = false;
  let syncPending = false;

  function autoSyncOn() {
    const cfg = cloudCfg();
    return cfg.autoSync !== false && !!cfg.user && !!cfg.pass;
  }

  function errText(e) { return typeof e === 'string' ? e : (e && e.message) || ''; }

  function syncParams() {
    const cfg = cloudCfg();
    if (!cfg.user) throw new Error('请先填写坚果云账号（注册邮箱）');
    if (!cfg.pass) throw new Error('请先填写坚果云应用密码');
    return { cfg, base: { server: CLOUD_SERVER, username: cfg.user, password: cfg.pass, folder: CLOUD_FOLDER } };
  }

  function pruneTomb(tomb) {
    const limit = Date.now() - 180 * 86400000;
    const out = {};
    Object.keys(tomb || {}).forEach(k => { if (Number(tomb[k]) >= limit) out[k] = tomb[k]; });
    return out;
  }

  // 习惯打卡取两边较多次数，日常记录按 id 并集，避免整条覆盖时丢掉另一台设备的记录
  function unionCounts(a, b) {
    const out = { ...(b || {}) };
    Object.keys(a || {}).forEach(k => {
      out[k] = Math.max(Number(a[k]) || 0, Number(out[k]) || 0);
    });
    return out;
  }

  function unionById(a, b) {
    const list = Array.isArray(b) ? b.slice() : [];
    const seen = new Set(list.map(x => x && x.id));
    (Array.isArray(a) ? a : []).forEach(x => { if (x && !seen.has(x.id)) { seen.add(x.id); list.push(x); } });
    return list;
  }

  function mergeItem(coll, local, remote) {
    const lu = Number(local.ut) || 0;
    const ru = Number(remote.ut) || 0;
    const pick = lu > ru ? local : (ru > lu ? remote : local);
    if (coll === 'habits') return { ...pick, checks: unionCounts(local.checks, remote.checks) };
    if (coll === 'routines') return { ...pick, logs: unionById(local.logs, remote.logs) };
    if (coll === 'wishes') return { ...pick, items: unionById(local.items, remote.items) };
    if (coll === 'hobbies') return { ...pick, logs: unionById(local.logs, remote.logs) };
    return pick;
  }

  // 合并两份数据：同 id 取 ut 新的，各自独有的条目都保留，墓碑时间晚于记录则视为删除
  function mergeStates(localS, remoteS) {
    const stats = { added: 0, updated: 0, deleted: 0 };
    const tomb = { ...((localS.meta && localS.meta.tomb) || {}) };
    const rTomb = (remoteS && remoteS.meta && remoteS.meta.tomb) || {};
    Object.keys(rTomb).forEach(k => { if (!tomb[k] || rTomb[k] > tomb[k]) tomb[k] = rTomb[k]; });

    const out = {};
    SYNC_COLLECTIONS.forEach(coll => {
      const lmap = new Map();
      const rmap = new Map();
      (localS[coll] || []).forEach(it => { if (it && it.id != null) lmap.set(it.id, it); });
      (((remoteS && remoteS[coll]) || [])).forEach(it => { if (it && it.id != null) rmap.set(it.id, it); });
      const ids = new Set([...lmap.keys(), ...rmap.keys()]);
      const list = [];
      ids.forEach(id => {
        const l = lmap.get(id);
        const r = rmap.get(id);
        let item;
        if (l && r) {
          item = mergeItem(coll, l, r);
          if (itemSig(l) !== itemSig(r)) stats.updated++;
        } else if (l) {
          item = l;
        } else {
          item = r;
          stats.added++;
        }
        const t = tomb[coll + ':' + id] || 0;
        if (t && t >= (Number(item.ut) || 0)) { stats.deleted++; return; }
        list.push(item);
      });
      out[coll] = list;
    });

    out.v = localS.v;
    out.ui = localS.ui;
    out.meta = { ...(localS.meta || {}), tomb: pruneTomb(tomb) };
    const lu = Number(localS.meta && localS.meta.ut) || 0;
    const ru = Number(remoteS && remoteS.meta && remoteS.meta.ut) || 0;
    out.meta.ut = Math.max(lu, ru);
    return { state: out, stats };
  }

  function dataSig(state) {
    return JSON.stringify(SYNC_COLLECTIONS.map(c => (state[c] || []).map(itemSig)));
  }

  // 重绘时避开正在输入的框，防止同步把光标顶掉
  function safeRender(left) {
    const remain = left == null ? 6 : left;
    const ae = document.activeElement;
    const editing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
    if (editing && remain > 0) { setTimeout(() => safeRender(remain - 1), 1500); return; }
    render(true);
  }

  function syncPayload() {
    return {
      format: SYNC_FORMAT,
      version: 1,
      app: '水星计划',
      updatedAt: new Date().toISOString(),
      deviceId: S.meta.deviceId,
      data: S
    };
  }

  // ---------- 同步状态标记：记录「哪条内容已经传上云」 ----------
  const SYNC_MARK_KEY = 'mercury.sync.marks';
  let lastFailAt = 0;

  function loadMarks() {
    try { return JSON.parse(localStorage.getItem(SYNC_MARK_KEY) || '{}') || {}; } catch (e) { return {}; }
  }

  function markAllSynced(state) {
    const marks = {};
    SYNC_COLLECTIONS.forEach(coll => (state[coll] || []).forEach(it => {
      if (it && it.id != null) marks[coll + ':' + it.id] = Number(it.ut) || 0;
    }));
    marks.__at = Date.now();
    try { localStorage.setItem(SYNC_MARK_KEY, JSON.stringify(marks)); } catch (e) { /* 忽略 */ }
  }

  function isSynced(coll, item) {
    if (!item || item.id == null) return false;
    const marks = loadMarks();
    return (Number(marks[coll + ':' + item.id]) || 0) >= (Number(item.ut) || 0);
  }

  // 列表里的同步状态：待上传转圈，已上传显示云勾；没配账号就不显示
  function syncMark(coll, item) {
    const cfg = cloudCfg();
    if (!cfg.user || !cfg.pass) return '';
    if (isSynced(coll, item)) {
      return `<span class="sync-mark done" title="已同步到云端">${icon('cloudCheck', 11)}</span>`;
    }
    return `<span class="sync-mark pending" title="等待同步到云端">${icon('syncRing', 11)}</span>`;
  }

  // 自动同步失败时也给个提示，同一分钟内只提示一次
  function syncFailNote(e) {
    const now = Date.now();
    if (now - lastFailAt < 60000) return;
    lastFailAt = now;
    toast(`<b>云端同步失败</b>：${esc(errText(e) || '未知错误')}`);
  }

  function syncStatusText(cfg) {
    if (cfg.lastSyncError) return `上次同步失败：${cfg.lastSyncError.msg}`;
    return `上次同步：${fmtCloudTime(cfg.lastSyncAt)}`;
  }

  function updateSyncLabels() {
    const cfg = cloudCfg();
    const a = document.getElementById('jdSyncLast');
    if (a) a.textContent = syncStatusText(cfg);
    const b = document.getElementById('jdAutoState');
    if (b) b.textContent = cfg.autoSync === false ? '已关闭' : '已开启';
    const c = document.getElementById('jdLast');
    if (c) c.textContent = `上次云备份：${fmtCloudTime(cfg.lastBackupAt)}`;
    updateSyncBadge();
  }

  // 拉取云端 → 与本机按条目合并 → 写回本机 → 把合并结果传回云端
  async function syncNow(opts) {
    const o = opts || {};
    if (o.silent && S.meta && S.meta.demo) return null; // 演示数据不上传
    let cfg, base;
    try { ({ cfg, base } = syncParams()); } catch (e) { if (!o.silent) toast(esc(e.message)); return null; }
    if (syncing) { syncPending = true; return null; }
    syncing = true;
    const btn = document.getElementById(o.btnId || 'jdSync');
    if (btn) { btn.disabled = true; btn.dataset.orig = btn.innerHTML; btn.innerHTML = esc('同步中…'); }

    let result = null;
    try {
      let remote = null;
      let first = false;
      try {
        const raw = await tauriInvoke('webdav_download', { ...base, filename: SYNC_FILE });
        const payload = JSON.parse(raw);
        if (payload && payload.format === SYNC_FORMAT && payload.data) remote = payload.data;
      } catch (e) {
        if (/不存在|404/.test(errText(e))) first = true;
        else throw e;
      }

      let stats = { added: 0, updated: 0, deleted: 0 };
      let touched = false;
      if (remote) {
        const merged = mergeStates(S, remote);
        stats = merged.stats;
        touched = dataSig(merged.state) !== dataSig(S);
        if (touched) {
          try { localStorage.setItem(SYNC_BEFORE_KEY, JSON.stringify(S)); } catch (e) { /* 存不下就算了 */ }
          S = merged.state;
          syncBase = indexState(S);
          try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 忽略 */ }
        }
      }

      // 本机没有待上传、合并也没带来变化时不必重复上传，省掉一次云端写
      const needUpload = first || !remote || touched || pendingSyncCount() > 0;
      if (needUpload) {
        await tauriInvoke('webdav_upload', { ...base, filename: SYNC_FILE, content: JSON.stringify(syncPayload()) });
        markAllSynced(S);
      }
      cfg.lastSyncAt = new Date().toISOString();
      delete cfg.lastSyncError;
      saveCloudCfg(cfg);
      try { localStorage.setItem('mercury.sync.at', String(Date.now())); } catch (e) { /* 忽略 */ }
      if (touched || S.ui.route === 'memos') safeRender();
      updateSyncLabels();
      result = stats;

      if (!o.silent) {
        const parts = [];
        if (stats.added) parts.push(`补入 ${stats.added} 条`);
        if (stats.deleted) parts.push(`删除 ${stats.deleted} 条`);
        if (stats.updated) parts.push(`更新 ${stats.updated} 条`);
        if (parts.length) toast(`已同步 · ${parts.join('，')}`);
        else toast(first ? '已创建云端同步库' : '两端已经一致');
      }
    } catch (e) {
      if (!o.silent) cloudFail(e, '同步失败');
      else { console.warn('[sync]', e); syncFailNote(e); }
      try {
        const c = cloudCfg();
        c.lastSyncError = { at: Date.now(), msg: errText(e) || '未知错误' };
        saveCloudCfg(c);
      } catch (err) { /* 忽略 */ }
      updateSyncLabels();
    } finally {
      syncing = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.orig || '同步云端';
        delete btn.dataset.orig;
      }
      if (syncPending) { syncPending = false; scheduleAutoSync(3000); }
    }
    return result;
  }

  function scheduleAutoSync(delay) {
    if (!syncReady || !autoSyncOn()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      if (syncing) { syncPending = true; return; }
      const last = Number(localStorage.getItem('mercury.sync.at') || 0);
      const wait = SYNC_GAP - (Date.now() - last);
      if (wait > 0) { scheduleAutoSync(wait + 500); return; }
      if (S.meta && S.meta.demo) return; // 演示数据不上传
      syncNow({ silent: true });
    }, delay == null ? SYNC_DEBOUNCE : delay);
  }

  function toggleAutoSync() {
    const cfg = cloudCfg();
    cfg.autoSync = cfg.autoSync === false;
    saveCloudCfg(cfg);
    updateSyncLabels();
    toast(cfg.autoSync === false ? '已关闭自动同步' : '已开启自动同步，改动后会自动上传');
    if (cfg.autoSync !== false) scheduleAutoSync(2000);
  }

  // 手动挑一份云端备份与当前数据合并（不覆盖本机独有的内容）
  async function cloudMerge(file) {
    let cfg, base;
    try { ({ cfg, base } = syncParams()); } catch (e) { toast(esc(e.message)); return; }
    let payload;
    try {
      const raw = await tauriInvoke('webdav_download', { ...base, filename: file });
      payload = JSON.parse(raw);
    } catch (e) {
      cloudFail(e, '读取云端备份失败');
      return;
    }
    const remote = payload && payload.data ? payload.data : payload;
    if (!remote || typeof remote !== 'object' || !Array.isArray(remote.tasks)) { toast('这份云端文件无法合并'); return; }
    const merged = mergeStates(S, remote);
    const st = merged.stats;
    askConfirm({
      title: '合并云端备份到本机？',
      heading: '同步确认',
      danger: false,
      detail: `按条目合并：云端独有 ${st.added} 条会补进本机，本机独有的一条不丢，同一内容以较新的改动为准。合并结果会同时写回云端。`,
      okText: '合并',
      onOk: () => {
        const touched = dataSig(merged.state) !== dataSig(S);
        try { localStorage.setItem(SYNC_BEFORE_KEY, JSON.stringify(S)); } catch (e) { /* 忽略 */ }
        S = merged.state;
        syncBase = indexState(S);
        save();
        closeModal();
        safeRender();
        toast(touched ? `已合并 · 补入 ${st.added} 条` : '本机已包含云端全部内容');
        syncNow({ silent: true });
      }
    });
  }
```

## 四、云端记录列表：加「合并」+ 显示更新时间

**位置**：`cloudNameToTime()` 之后加一个时间格式化函数；`cloudList()` 里生成每一行的部分整段替换。

**1）时间格式化**（坚果云返回的是 `Thu, 06 Nov 2026 05:08:24 GMT`，转成本机时间显示）

```js
  // 坚果云 PROPFIND 返回的是 RFC1123（Thu, 06 Nov 2026 05:08:24 GMT），转成本地时间
  function fmtDavTime(s) {
    if (!s) return '';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
```

**2）列表行**

```js
    const rows = files.map(f => {
      const t = cloudNameToTime(f.name);
      const isSync = f.name === 'sync.json';
      const label = t || (isSync ? 'sync.json（实时同步文件）' : (f.name === 'latest.json' ? '最新一份（固定入口）' : esc(f.name)));
      const meta = [esc(fmtCloudSize(f.size)), fmtDavTime(f.modified) ? `${isSync ? '更新于' : ''}${fmtDavTime(f.modified)}`.trim() : ''].filter(Boolean).join(' · ');
      return `<div class="cloud-row">
        <span class="cloud-name"><b>${label}</b><span>${meta}</span></span>
        <span class="cloud-ops">
          <button class="btn sm" data-act="jd-merge" data-id="${esc(f.name)}">合并</button>
          <button class="btn sm" data-act="jd-restore" data-id="${esc(f.name)}">覆盖</button>
          <button class="btn sm" data-act="jd-del" data-id="${esc(f.name)}">删除</button>
        </span>
      </div>`;
    }).join('');
```

`f.modified` 来自 `webdav_list`（Rust 端 `parse_propfind` 已解析 `getlastmodified`）。安卓端如果拿不到这个字段，就把 `meta` 简化成只有大小，标签保留。

## 五、设置页：换成同步面板

**位置**：`openSettings()` 里「坚果云云备份」那一整块（从 `<div class="set-label">坚果云云备份</div>` 到 `id="jdLast"` 那行），整体替换。

```html
       <div class="hr"></div>
       <div class="set-label">多设备同步（坚果云）</div>
       <input class="input" id="jdUser" placeholder="坚果云账号（注册邮箱）" value="${esc(jd.user || '')}" style="margin-bottom:8px">
       <input class="input" id="jdPass" type="password" placeholder="${jd.pass ? '应用密码已保存，可输入新密码替换' : '应用密码（不是登录密码）'}" style="margin-bottom:10px">
       <div class="set-actions" style="margin-top:0">
         <button class="btn" id="jdTest" data-act="jd-test">${icon('check', 14)}测试连接</button>
         <button class="btn btn-amber" id="jdSync" data-act="jd-sync">${icon('cycle', 14)}同步云端</button>
         <button class="btn" id="jdList" data-act="jd-list">${icon('db', 14)}云端记录</button>
       </div>
       <button class="set-row" data-act="jd-auto">
         <span class="set-row-main">${icon('cycle', 15)}<span>自动同步</span></span>
         <span class="set-row-side"><span id="jdAutoState">${jd.autoSync === false ? '已关闭' : '已开启'}</span>${icon('chevR', 14)}</span>
       </button>
       <button class="set-row" data-act="jd-backup">
         <span class="set-row-main">${icon('arrowUp', 15)}<span>备份一份完整快照</span></span>
         <span class="set-row-side" id="jdBackup">云端留存${icon('chevR', 14)}</span>
       </button>
       <div class="muted backup-hint">两端各记各的都不会丢：同步会把云端独有和本机独有的内容按条目合并，同一条以较新的改动为准。改完十几秒自动上传，打开应用时也会自动拉一次。</div>
       <button class="set-row" data-act="jd-help">
         <span class="set-row-main">${icon('restore', 15)}<span>如何获取坚果云应用密码？</span></span>
         <span class="set-row-side">查看教程${icon('chevR', 14)}</span>
       </button>
       <div class="muted backup-hint" id="jdSyncLast">${syncStatusText(jd)}</div>
<div class="muted backup-hint" id="jdLast">上次云备份：${fmtCloudTime(jd.lastBackupAt)}</div>
```

上述整块替换掉原来的云备份区块（含原来的「如何获取应用密码」入口，入口顺序不变）。

## 六、事件绑定：新增 3 个 case

**位置**：点击事件 `switch (act)` 里，`case 'jd-list'` 之后。

```js
      case 'jd-sync': syncNow({ btnId: 'jdSync' }); break;
      case 'jd-auto': toggleAutoSync(); break;
      case 'jd-merge': cloudMerge(id); break;
```

## 七、启动：拉一次 + 每 5 分钟兜底

**位置**：文件末尾，`})();` 之前（即所有 `qs.get(...)` 启动逻辑之后）。

```js
  // 同步：启动后拉一次云端，之后每 5 分钟兜底对一次
  syncReady = true;
  if (autoSyncOn()) {
    setTimeout(() => syncNow({ silent: true }), 3000);
    setInterval(() => { if (autoSyncOn() && document.visibilityState !== 'hidden') syncNow({ silent: true }); }, 5 * 60 * 1000);
  }
```

---

## 八、笔记旁的同步状态标记（建议加）

未上传转圈，传上云变云勾；没配账号就不显示。

**1）`ui/app.js` 顶部图标表 `I`**：`restore` 那一行后面补两行

```js
    syncRing: '<path d="M20.6 12a8.6 8.6 0 11-3.1-6.6"/><path d="M17.6 2.4v3.8h-3.8"/>',
    cloudCheck: '<path d="M7.2 18h9.4a3.6 3.6 0 00.5-7.2 5.2 5.2 0 00-9.9-1.3A3.7 3.7 0 007.2 18z"/><path d="M9.9 13.9l1.9 1.9 3.4-3.5"/>'
```

**2）`ui/styles.css`**：`.memo-item .m-time` 那行后面加

```css
.m-foot{display:flex;align-items:center;gap:6px}
.sync-mark{display:inline-flex;align-items:center;justify-content:center;line-height:0;color:var(--text-3);opacity:.62;cursor:default}
.sync-mark.done{opacity:.4}
.sync-mark.pending{opacity:.9;color:hsl(var(--hue) 80% 57%)}
.sync-mark.pending svg{animation:sync-spin 1.15s linear infinite}
@keyframes sync-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
```

**3）备忘录列表**：`list.forEach` 里把时间那行换成

```js
        <div class="m-foot"><span class="m-time">${memoTime(m.updated)}</span>${syncMark('memos', m)}</div>
```

**4）笔记详情**：`memo-meta` 里 `字数` 后面加 `${syncMark('memos', cur)}`。

`syncMark()` / `isSynced()` / `markAllSynced()` 已在第三步的同步模块里，不用再写。数据来源是 localStorage 的 `mercury.sync.marks`，不参与云端同步。

**5）底部状态栏（可选，有才做）**：安卓如果没有 `statusHTML` 那种状态栏，跳过这步；有的话换成下面这套。

要点：同步结束后**只局部刷新这一个节点**，不整页重绘——否则会出现「已经传上去了，右下角还写着 N 条待上传」。

```js
  function pendingSyncCount() {
    const cfg = cloudCfg();
    if (!cfg.user || !cfg.pass) return -1; // 没配账号 = 没开启
    const marks = loadMarks();
    let n = 0;
    SYNC_COLLECTIONS.forEach(coll => (S[coll] || []).forEach(it => {
      if (!it || it.id == null) return;
      if ((Number(marks[coll + ':' + it.id]) || 0) < (Number(it.ut) || 0)) n++;
    }));
    return n;
  }

  // 状态栏右侧的同步提示：只在同步结束后局部刷新，不整页重绘
  function syncBadge() {
    const pend = pendingSyncCount();
    const cfg = cloudCfg();
    if (pend < 0) return { cls: '', text: '数据保存在本机' };
    if (cfg.lastSyncError) return { cls: 'err', text: '云端同步失败' };
    return pend ? { cls: 'warn', text: `${pend} 条待上传` } : { cls: 'ok', text: '云端已同步' };
  }

  function updateSyncBadge() {
    const el = document.querySelector('#statusbar .sb-local');
    if (!el) return;
    const b = syncBadge();
    el.className = 'sb-local' + (b.cls ? ' ' + b.cls : '');
    el.title = b.text;
    el.innerHTML = `<i></i>${esc(b.text)}`;
  }
```

`statusHTML()` 里原来算 `pend / syncCls / syncText` 的三行换成：

```js
    const badge = syncBadge();
```

状态栏那一段改成：

```js
        <span class="sb-local ${badge.cls}" title="${esc(badge.text)}"><i></i>${esc(badge.text)}</span>
```

最后在第三步的 `updateSyncLabels()` 末尾加一行 `updateSyncBadge();`，这样同步成功、同步失败、开关自动同步三种情况都会立刻更新状态栏。

对应样式（`ui/styles.css`）：

```css
.sb-local.warn i{background:#E9A33C}
.sb-local.err i{background:#E5714B}
.sb-local.ok i{background:#6FBF9B}
```

## 九、改动后没同步？按这个顺序查

Windows 版实测过的坑，安卓照抄同一套判断。

**先分清两种情况**：

- 云端文件时间没变 → 真的没传上去，按下表排查。
- 云端时间变了、右下角还写着「N 条待上传」→ 已经传上去了，只是提示没刷新。旧实现只在整页重绘时才更新状态栏，所以看着像「要等下一个操作才反馈」。按第八节 5）加 `updateSyncBadge()`，同步一结束就局部刷新。

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 改完半天，云端没变 | 设置里没填账号/应用密码 | 填好账号和应用密码，点「测试连接」 |
| | 自动同步被关 | 设置页「自动同步」应为「已开启」 |
| | 装的还是旧版 | 旧版不写 `sync.json`，必须重新构建安装 |
| | 还处于初始演示数据 | 新增或改一条内容后即转正式数据，再等 6 秒 |
| | 距上次同步不到 20 秒 | 正常节流，等下一轮 |
| | 正在输入标题/正文 | 重绘会延后到输入结束，属正常 |
| 图标一直转圈 | 上一轮同步失败 | 看设置页「上次同步失败：原因」，修好后点「同步云端」 |
| 状态栏「N 条待上传」不下 | 有新改动还没传 | 等自动同步或手动点「同步云端」 |
| 提示「已同步 · 两端已经一致」但看不到变化 | 本机改动确实已上传 | 去另一端点同步才会看到合并结果 |

提示出现在四个位置，缺一个都说明那步没做：

| 位置 | 内容 | 对应步骤 |
| --- | --- | --- |
| 笔记列表/详情时间旁 | 转圈=待上传，云勾=已上传 | 第八节 |
| 底部状态栏 | `N 条待上传` / `云端已同步` / `云端同步失败` | 第八节 5） |
| 设置页「上次同步」 | 时间或失败原因 | 第三节 `syncStatusText()` |
| 自动同步失败弹窗 | 失败原因（同一分钟只弹一次） | 第三节 `syncFailNote()` |

## 十、别把 `sync.json` 当成备份快照

云端 `/MercuryPlan/` 里三类文件，作用不同：

| 文件 | 是什么 | 何时更新 |
| --- | --- | --- |
| `sync.json` | 两端合并后的**实时数据**，每次同步整份覆盖 | 每次自动/手动同步 |
| `mercury-plan-backup-*.json` | 手动点「备份一份完整快照」留下的历史版本 | 只有点备份时 |
| `latest.json` | 最新一份快照的固定入口 | 跟着备份一起更新 |

- 列表按文件名倒序，`sync.json` 常排在最前，**不代表它时间最新**；要看「更新于」。
- 体积差别正常：`sync.json` 是紧凑 JSON，快照用 `JSON.stringify(..., 2)` 带缩进并多存 `theme`，同一份数据能大 40% 左右。
- 判断新旧看 `sync.json` 里的 `updatedAt`，或列表里的「更新于」。
- 不要删 `sync.json`。删了不报错（下次同步会被重建），但重建时是以当时那台设备的数据为底，容易漏掉只存在另一端的条目。

## 合并规则（验收时对照）

| 场景 | 结果 |
| --- | --- |
| 电脑有 A，手机有 B，都还没同步 | 谁先同步都不会丢，另一端下次同步后两端都是 A+B |
| 同一条两端都改过 | 以时间较新的改动为准 |
| 一端删了某条，另一端还留着旧副本 | 按墓碑删除，不会复活 |
| 一端删了又从回收站恢复 | 恢复时间晚于删除时间，保留 |
| 习惯打卡 | 按日期取两边较多次数 |
| 日常记录 / 兴趣记录 / 心愿子项 | 按 id 取并集 |
| 备忘录正文两端都改 | 取较新的整篇（正文不做行级合并） |

## 验收步骤

1. 手机填好坚果云账号密码，点「同步云端」，云端 `/MercuryPlan/` 出现 `sync.json`。
2. 电脑也点「同步云端」，两端条数一致。
3. 关掉自动同步，电脑加一条 A、手机加一条 B，然后先点手机同步、再点电脑同步 —— 两端都应同时出现 A 和 B。
4. 电脑删掉一条，同步；手机同步后该条消失，且手机回收站里能看到它。
5. 手机给某个习惯打卡一天，电脑给另一个日期打卡，两端同步后两天的打卡都在。
6. 自动同步：开启后随便改点东西，等 10 秒左右，云端 `sync.json` 的 `updatedAt` 会变。
7. 新增一条笔记，6 秒内列表时间旁出现转圈，同步完成后变云勾，状态栏回到「云端已同步」。
8. 打开「云端记录」，`sync.json` 显示 `sync.json（实时同步文件） · 大小 · 更新于 …`，时间与刚才同步时间接近。
9. 故意填错应用密码点同步，设置页「上次同步」显示失败原因，改回正确密码再同步即恢复。

## 注意

- **两端都要升级**。旧版只会写 `latest.json`，不会写 `sync.json`，升级前别指望旧端参与合并。
- 首次启动会给所有老记录补一个基准时间戳，属于正常现象。
- 自动同步默认开启，两次自动同步至少间隔 20 秒，避免撞上坚果云免费账户的频率限制。
- 同步前会把本机旧数据存在 `mercury.sync.before`，出问题可从开发者工具里取回。
- 不用改 Rust 端，`webdav_download / webdav_upload` 已有就能用。
