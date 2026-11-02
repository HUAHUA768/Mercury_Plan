// 每次构建前自增版本号：patch 逢十进位（0.1.9 -> 0.2.0）
// 用法：npm run build 会自动执行；也可单独 node scripts/bump.js [patch|minor|major]
const fs = require('fs');
const path = require('path');

const confPath = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
const conf = JSON.parse(fs.readFileSync(confPath, 'utf8'));
const kind = process.argv[2] || 'patch';

let [major, minor, patch] = conf.version.split('.').map(Number);
if (kind === 'patch') {
  patch += 1;
  if (patch > 9) { patch = 0; minor += 1; }
} else if (kind === 'minor') {
  minor += 1; patch = 0;
} else if (kind === 'major') {
  major += 1; minor = 0; patch = 0;
}
conf.version = `${major}.${minor}.${patch}`;
fs.writeFileSync(confPath, JSON.stringify(conf, null, 2) + '\n');
console.log(`版本号 -> ${conf.version}`);
