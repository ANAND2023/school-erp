const fs = require('fs');
const path = require('path');
const { toQR } = require('./mobile/node_modules/toqr');

const url = 'exp://10.0.2.104:8081';
const bits = toQR(url);
const size = Math.round(Math.sqrt(bits.length));

// Create SVG
const scale = 10;
const qz = 4; // Quiet zone
const totalSize = (size + qz * 2) * scale;

let svgPaths = '';
for (let r = 0; r < size; r++) {
  for (let c = 0; c < size; c++) {
    if (bits[r * size + c] === 1) {
      const x = (c + qz) * scale;
      const y = (r + qz) * scale;
      svgPaths += `<rect x="${x}" y="${y}" width="${scale}" height="${scale}" fill="#0f172a" />\n`;
    }
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="280" height="280" style="background:#ffffff; border-radius:12px; padding:8px;">
  <rect width="100%" height="100%" fill="#ffffff" rx="12"/>
  ${svgPaths}
</svg>`;

// Also ASCII half-block string
const border = 2;
const fullSize = size + border * 2;
const grid = Array.from({ length: fullSize }, () => Array(fullSize).fill(0));
for (let r = 0; r < size; r++) {
  for (let c = 0; c < size; c++) {
    grid[r + border][c + border] = bits[r * size + c];
  }
}

// Inverted half-blocks: inverted so white is background and black is dark
let ascii = '';
for (let r = 0; r < fullSize; r += 2) {
  let line = '';
  for (let c = 0; c < fullSize; c++) {
    const top = grid[r][c];
    const bot = (r + 1 < fullSize) ? grid[r + 1][c] : 0;
    if (top && bot) line += ' ';
    else if (top && !bot) line += '▄';
    else if (!top && bot) line += '▀';
    else line += '█';
  }
  ascii += line + '\n';
}

console.log('SIZE:', size);
console.log('ASCII:\n' + ascii);
fs.writeFileSync('./qr_output.svg', svg);
