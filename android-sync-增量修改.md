# 安卓端同步 · 这次要补的改动（只改 `ui/app.js`）

前提：`android-sync-施工方案.md` 那套已经做完。下面 5 处是在它基础上的增量，解决了「云端已经传上去了，右下角还一直显示 N 条待上传」。

改完执行 `node --check ui/app.js` 过一遍语法。Rust 端、样式、`platform.js` 都不用动。

---

## 一、调快冷却：两行常量

**位置**：`function syncNow` 上面的常量区。

```js
  const SYNC_GAP = 20000;        // 两次自动同步之间的最小间隔
  const SYNC_DEBOUNCE = 6000;    // 改动停下多久后自动上传
```

原来是 `60000` / `12000`，直接改数字即可。

## 二、`syncNow` 上传段：没变化就不重复上传

**位置**：`syncNow()` 里 `await tauriInvoke('webdav_upload', { ...base, filename: SYNC_FILE, ... })` 那一段。

整段**替换**为：

```js
      // 本机没有待上传、合并也没带来变化时不必重复上传，省掉一次云端写
      const needUpload = first || !remote || touched || pendingSyncCount() > 0;
      if (needUpload) {
        await tauriInvoke('webdav_upload', { ...base, filename: SYNC_FILE, content: JSON.stringify(syncPayload()) });
        markAllSynced(S);
      }
      cfg.lastSyncAt = new Date().toISOString();
      delete cfg.lastSyncError;
      saveCloudCfg(cfg);
```

## 三、`updateSyncLabels()` 末尾加一行

**位置**：函数最后一句 `if (c) c.textContent = ...` 之后。

```js
    updateSyncBadge();
  }
```

这一行是关键：同步成功、同步失败、切换自动同步，三种情况都会立刻刷新右下角。

## 四、新增两个函数

**位置**：`pendingSyncCount()` 这个函数的结束 `}` 之后，紧接着粘贴。

```js
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

## 五、`statusHTML()` 改用 `syncBadge()`

**位置**：`statusHTML()` 开头那 5 行（`const fileCfg = ...` 到 `const syncText = ...`），整段换成一行：

```js
    const badge = syncBadge();
```

再把状态栏那一段的 `<span class="sb-local ...">` 换成：

```js
        <span class="sb-local ${badge.cls}" title="${esc(badge.text)}"><i></i>${esc(badge.text)}</span>
```

原来的写法是 `${syncText}` 直接插入，这里顺手加上 `esc()`，避免文案里带特殊字符时把 HTML 撑坏。

## 六、让手机上真的看得见这条提示

安卓代码里其实已经有这条了（`statusHTML()` 里的 `.sb-right > .sb-local`，`index.html` 也有 `<footer class="statusbar" id="statusbar">`）。看不到通常是两个原因，按顺序确认：

**原因 1：没填坚果云账号或应用密码。** 这时 `pendingSyncCount()` 返回 `-1`，文案是「数据保存在本机」，不会出现条数。去「设置 → 多设备同步」填好账号和应用密码再回来看。

**原因 2：状态栏在窄屏被横向挤出去了。** `mobile.css` 里 `.statusbar` 是 `overflow-x: auto`，右边那截（同步状态 + 今日小结）默认在可视区之外，要往左滑才看得到。

把同步状态固定在右侧，其他统计该滚就滚。**`ui/mobile.css`** 里 `.sb-right { gap: 8px; }` 那行改成：

```css
  .sb-right {
    gap: 8px; position: sticky; right: 0; padding-left: 12px;
    background: var(--bottom-a); backdrop-filter: blur(8px);
  }
```

改动只有这一行。如果嫌窄屏太挤，干脆把中间几项统计在手机上藏起来（状态栏只剩同步状态和「今日小结」），在 `mobile.css` 的 `.statusbar` 块里加：

```css
  .statusbar .stat, .statusbar .dot-sep { display: none; }
```

---

## 验收（4 条就够）

1. 勾一条待办 → 右下角显示「1 条待上传」→ 约 6 秒后自动变成「云端已同步」，**不用再做任何操作**。
2. 打开坚果云看 `sync.json` 的修改时间，与刚才那 6 秒内的同步时间一致。
3. 挂机 5 分钟不动：云端 `sync.json` 的修改时间不应被反复改写（无变化时不再上传），但右下角仍显示「云端已同步」。
4. 手机上不进设置页、不横向滑动状态栏，也能直接看到「N 条待上传 / 云端已同步」。

## 注意

- 「N 条待上传」只在设置里填过账号和应用密码后才出现，没配时显示「数据保存在本机」，这是设计如此，不是 bug。
- `#statusbar .sb-local` 要和安卓实际 DOM 一致；安卓的 `index.html` 里就是 `id="statusbar"`，照抄即可。
- 「N 条待上传」的判定依赖 `mercury.sync.marks`，这个键只在本机 localStorage，不参与云同步，天然各设备独立。
- 如果改完仍然卡在「N 条待上传」，先看云端 `sync.json` 时间有没有变：变了就是提示没刷新（`updateSyncBadge()` 没接上），没变才是真的没传。
