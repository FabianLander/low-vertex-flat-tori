/**
 * Normalize the first N samples from a -emb-NNN.bin file:
 *   1. subtract the 8-vertex centroid (kills translation)
 *   2. divide by RMS distance from centroid (kills scale)
 *
 * Each sample's 24 floats are processed independently, so every output
 * sample has centroid 0 and RMS centroid-distance 1. Rotation/relabeling
 * are NOT quotiented here.
 *
 * Output is float32 .bin, same packing as the input ([x0,y0,z0,...,x7,y7,z7]
 * per sample, 96 bytes/sample). Load it the same way:
 *   const buf = readFileSync(path);
 *   const arr = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
 *   // sample i = arr.subarray(i * 24, (i + 1) * 24)
 *
 * Usage:
 *   node scripts/normalize-embedded.mjs [--in PATH] [--out PATH] [--count N]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';

const VERTEX_COUNT = 8;
const DIM = VERTEX_COUNT * 3; // 24
const SAMPLE_BYTES = DIM * 4; // 96

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

const DEFAULT_IN = 'samples/run-1780092524352-emb-000.bin';
const inputPath = resolve(flag('--in') ?? DEFAULT_IN);
const count = Number(flag('--count') ?? 100_000);
const outputPath = resolve(
  flag('--out') ?? `${dirname(inputPath)}/${basename(inputPath, '.bin')}-norm-${count}.bin`,
);

if (!existsSync(inputPath)) {
  console.error(`input not found: ${inputPath}`);
  process.exit(1);
}

const buf = readFileSync(inputPath);
const total = Math.floor(buf.byteLength / SAMPLE_BYTES);
if (total < count) {
  console.error(`file has ${total.toLocaleString()} samples, requested ${count.toLocaleString()}`);
  process.exit(1);
}

console.log('normalize-embedded');
console.log(`  in:    ${inputPath}`);
console.log(`  out:   ${outputPath}`);
console.log(`  count: ${count.toLocaleString()} of ${total.toLocaleString()}`);

const src = new Float32Array(buf.buffer, buf.byteOffset, count * DIM);
const out = new Float32Array(count * DIM);

let degenerate = 0;
for (let s = 0; s < count; s++) {
  const off = s * DIM;
  let cx = 0, cy = 0, cz = 0;
  for (let v = 0; v < VERTEX_COUNT; v++) {
    cx += src[off + 3 * v + 0];
    cy += src[off + 3 * v + 1];
    cz += src[off + 3 * v + 2];
  }
  cx /= VERTEX_COUNT;
  cy /= VERTEX_COUNT;
  cz /= VERTEX_COUNT;

  let rms2 = 0;
  for (let v = 0; v < VERTEX_COUNT; v++) {
    const x = src[off + 3 * v + 0] - cx;
    const y = src[off + 3 * v + 1] - cy;
    const z = src[off + 3 * v + 2] - cz;
    out[off + 3 * v + 0] = x;
    out[off + 3 * v + 1] = y;
    out[off + 3 * v + 2] = z;
    rms2 += x * x + y * y + z * z;
  }
  const rms = Math.sqrt(rms2 / VERTEX_COUNT);
  if (rms > 0) {
    const inv = 1 / rms;
    for (let i = 0; i < DIM; i++) out[off + i] *= inv;
  } else {
    degenerate++;
  }
}

const dataBytes = Buffer.from(out.buffer, 0, out.byteLength);
writeFileSync(outputPath, dataBytes);

const mb = dataBytes.length / 1024 / 1024;
console.log(`  wrote ${mb.toFixed(1)} MB  (${count.toLocaleString()} samples × ${DIM} floats)`);
if (degenerate > 0) console.log(`  warning: ${degenerate} degenerate (zero-RMS) samples left unscaled`);
