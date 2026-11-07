// 构建后把 APK 复制成带版本号的文件，避免每次构建都覆盖同一个 app-universal-release.apk
// 用法：tauri android build --apk 之后执行 node scripts/android-apk.js
// 输出目录：dist/android/mercury-plan-v0.2.5-20261107-1730-arm64.apk
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const conf = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri', 'tauri.conf.json'), 'utf8'));
const version = conf.version;
const versionCode = (Number(version.split('.')[0]) || 0) * 10000
  + (Number(version.split('.')[1]) || 0) * 100
  + (Number(version.split('.')[2]) || 0);

const outDir = path.join(root, 'dist', 'android');
fs.mkdirSync(outDir, { recursive: true });

const apkRoot = path.join(root, 'src-tauri', 'gen', 'android', 'app', 'build', 'outputs', 'apk');
if (!fs.existsSync(apkRoot)) {
  console.error('找不到构建产物目录：' + apkRoot);
  process.exit(1);
}

const now = new Date();
const p2 = n => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}-${p2(now.getHours())}${p2(now.getMinutes())}`;

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.apk')) out.push({ path: p, mtime: st.mtimeMs, size: st.size });
  }
  return out;
}

// 只取 release 包（debug 包体积大、文件名带 debug，不进 dist）
const apks = walk(apkRoot).filter(a => /release/i.test(a.path) && !/debug/i.test(a.path));
if (!apks.length) {
  console.error('没有找到 release APK，构建可能失败了');
  process.exit(1);
}

// 每种 ABI 各一份：universal / arm64 / armv7 / x86_64
const copied = [];
for (const apk of apks) {
  const m = path.basename(apk.path).match(/^app-(.+)\.apk$/);
  const abi = (m ? m[1] : 'universal').replace(/-?release$/, '');
  const name = `mercury-plan-v${version}-${stamp}-${abi}.apk`;
  const dest = path.join(outDir, name);
  fs.copyFileSync(apk.path, dest);
  copied.push({ dest, size: apk.size });
}

console.log(`\n版本 ${version}（versionCode ${versionCode}）`);
for (const c of copied) {
  const mb = (c.size / 1024 / 1024).toFixed(1);
  console.log(`  → ${path.relative(root, c.dest)}  ${mb} MB`);
}

// 记一份构建清单，方便回查
const logPath = path.join(outDir, 'builds.txt');
const files = copied.map(c => path.relative(outDir, c.dest)).join(', ');
fs.appendFileSync(logPath, `${stamp}\tv${version}\t(${versionCode})\t${files}\n`);
