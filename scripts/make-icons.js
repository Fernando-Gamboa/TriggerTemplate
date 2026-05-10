const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const outDir = path.join(__dirname, "..", "assets");
const sizes = [16, 32, 48, 128];
const SCALE = 3;
const YELLOW = [255, 212, 0, 255];
const BLACK = [5, 5, 5, 255];
const CLEAR = [0, 0, 0, 0];

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function pixelFor(size, x, y) {
  const padding = size * 0.0625;
  const radius = size * 0.21875;
  const left = padding;
  const top = padding;
  const right = size - padding;
  const bottom = size - padding;
  const inside =
    (x >= left + radius && x < right - radius && y >= top && y < bottom) ||
    (y >= top + radius && y < bottom - radius && x >= left && x < right) ||
    distance(x, y, left + radius, top + radius) <= radius ||
    distance(x, y, right - radius, top + radius) <= radius ||
    distance(x, y, left + radius, bottom - radius) <= radius ||
    distance(x, y, right - radius, bottom - radius) <= radius;

  if (!inside) return CLEAR;

  const leftTop = rect(size, x, y, 0.25, 0.328125, 0.234375, 0.0859375);
  const leftStem = rect(size, x, y, 0.34375, 0.4140625, 0.078125, 0.2578125);
  const rightTop = rect(size, x, y, 0.515625, 0.328125, 0.234375, 0.0859375);
  const rightStem = rect(size, x, y, 0.578125, 0.4140625, 0.078125, 0.2578125);

  if (leftTop || leftStem || rightTop || rightStem) return BLACK;
  return YELLOW;
}

function rect(size, x, y, left, top, width, height) {
  return x >= size * left && x < size * (left + width) && y >= size * top && y < size * (top + height);
}

function distance(x, y, cx, cy) {
  return Math.hypot(x - cx, y - cy);
}

function png(size) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const rows = [];
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = sampledPixel(size, x, y);
      const offset = 1 + x * 4;
      row[offset] = r;
      row[offset + 1] = g;
      row[offset + 2] = b;
      row[offset + 3] = a;
    }
    rows.push(row);
  }

  return Buffer.concat([
    header,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function sampledPixel(size, x, y) {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;

  for (let sy = 0; sy < SCALE; sy += 1) {
    for (let sx = 0; sx < SCALE; sx += 1) {
      const color = pixelFor(size, x + (sx + 0.5) / SCALE, y + (sy + 0.5) / SCALE);
      r += color[0];
      g += color[1];
      b += color[2];
      a += color[3];
    }
  }

  const count = SCALE * SCALE;
  return [
    Math.round(r / count),
    Math.round(g / count),
    Math.round(b / count),
    Math.round(a / count)
  ];
}

fs.mkdirSync(outDir, { recursive: true });
for (const size of sizes) {
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), png(size));
}
