const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const cwebp = path.resolve('node_modules/cwebp-bin/vendor/cwebp.exe');
const outDir = path.resolve('D:/erp/real_webp');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const mappings = [
  // ic_launcher
  { src: 'mobile/android/app/src/main/res/mipmap-mdpi/ic_launcher.webp', apkEntry: 'res/d2.webp', name: 'd2.webp' },
  { src: 'mobile/android/app/src/main/res/mipmap-hdpi/ic_launcher.webp', apkEntry: 'res/MO.webp', name: 'MO.webp' },
  { src: 'mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher.webp', apkEntry: 'res/qs.webp', name: 'qs.webp' },
  { src: 'mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.webp', apkEntry: 'res/Sn.webp', name: 'Sn.webp' },
  { src: 'mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.webp', apkEntry: 'res/sK.webp', name: 'sK.webp' },

  // ic_launcher_foreground
  { src: 'mobile/android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.webp', apkEntry: 'res/Nt.webp', name: 'Nt.webp' },
  { src: 'mobile/android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.webp', apkEntry: 'res/13.webp', name: '13.webp' },
  { src: 'mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.webp', apkEntry: 'res/9Q.webp', name: '9Q.webp' },
  { src: 'mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.webp', apkEntry: 'res/iE.webp', name: 'iE.webp' },
  { src: 'mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.webp', apkEntry: 'res/5c.webp', name: '5c.webp' },

  // ic_launcher_round
  { src: 'mobile/android/app/src/main/res/mipmap-mdpi/ic_launcher_round.webp', apkEntry: 'res/yw.webp', name: 'yw.webp' },
  { src: 'mobile/android/app/src/main/res/mipmap-hdpi/ic_launcher_round.webp', apkEntry: 'res/fq.webp', name: 'fq.webp' },
  { src: 'mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.webp', apkEntry: 'res/u5.webp', name: 'u5.webp' },
  { src: 'mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.webp', apkEntry: 'res/j_.webp', name: 'j_.webp' },
  { src: 'mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.webp', apkEntry: 'res/-6.webp', name: '-6.webp' },
];

for (const m of mappings) {
  const dest = path.join(outDir, m.name);
  const cmd = `"${cwebp}" "${path.resolve(m.src)}" -q 95 -o "${dest}"`;
  console.log('Converting:', m.src, '->', m.name);
  execSync(cmd);
  const b = fs.readFileSync(dest);
  console.log('Verified:', m.name, b.length, 'bytes, magic:', b.slice(0, 12).toString());
}

console.log('All 15 icon files successfully converted to real WebP format!');
