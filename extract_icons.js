const fs = require('fs');
const zlib = require('zlib');

if (!fs.existsSync('D:/erp/extracted_icons')) {
  fs.mkdirSync('D:/erp/extracted_icons');
}

const buf = fs.readFileSync('D:/erp/SchoolERP-Backup.apk');
let offset = buf.length - 22;
while (offset > 0 && buf.readUInt32LE(offset) !== 0x06054b50) {
  offset--;
}
const cdOffset = buf.readUInt32LE(offset + 16);
const cdCount = buf.readUInt16LE(offset + 10);
let ptr = cdOffset;
const targetFiles = [
  'res/BW.xml',
  'res/0K.xml',
  'res/5c.webp',
  'res/13.webp',
  'res/sK.webp',
  'res/d2.webp',
  'res/Sn.webp'
];

for (let i = 0; i < cdCount; i++) {
  const nameLen = buf.readUInt16LE(ptr + 28);
  const extraLen = buf.readUInt16LE(ptr + 30);
  const commentLen = buf.readUInt16LE(ptr + 32);
  const localHeaderOffset = buf.readUInt32LE(ptr + 42);
  const name = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);
  if (targetFiles.includes(name)) {
    const method = buf.readUInt16LE(localHeaderOffset + 8);
    const compSize = buf.readUInt32LE(localHeaderOffset + 18);
    const fnL = buf.readUInt16LE(localHeaderOffset + 26);
    const exL = buf.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + fnL + exL;
    const raw = buf.slice(dataOffset, dataOffset + compSize);
    const data = method === 8 ? zlib.inflateRawSync(raw) : raw;
    const base = name.replace('res/', '');
    fs.writeFileSync('D:/erp/extracted_icons/' + base, data);
    console.log('Extracted:', base, data.length);
  }
  ptr += 46 + nameLen + extraLen + commentLen;
}
console.log('Extraction complete!');
