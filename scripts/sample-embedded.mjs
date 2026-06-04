/**
 * Two-stage rejection sampler.
 *
 *   Stage 1: random in cube → isEmbedded → write to <base>-emb-NNN.bin
 *   Stage 2: stage-1 output → newtonFlatten → isEmbedded → write to <base>-flat-NNN.bin
 *
 * Files are Float32, packed [x0,y0,z0, ..., x7,y7,z7]. 24 floats × 4 bytes = 96 bytes/sample.
 * Each file rolls to a new part every --max-per-file accepts.
 *
 * Usage:
 *   npm run sample -- [options]
 *
 * Options:
 *   --seed N                RNG seed (default: clock-derived)
 *   --out PATH              Output base (default: samples/run-<timestamp>)
 *   --size N                Half-size of the cube (default: 1.0)
 *   --max-tries N           Stop after N total tries (default: ∞)
 *   --max-accepts N         Stop after N stage-1 (embedded) accepts (default: 1,000,000;
 *                             pass `Infinity` to disable)
 *   --max-per-file N        Roll to a new file every N accepts (default: 1,000,000)
 *   --newton-tolerance N    Newton convergence threshold on ||R||∞ (default: 1e-10)
 *   --no-flatten            Skip stage 2 entirely (write only -emb files)
 *   --report N              Print progress every N tries (default: 1,000,000)
 *   --flush N               Stage N accepts in RAM before each disk write (default: 1,000)
 *
 * Ctrl-C flushes pending buffers and exits cleanly.
 *
 * Loading later (TypeScript):
 *   const buf = readFileSync(path);
 *   const arr = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
 *   // sample i = arr.subarray(i * 24, (i + 1) * 24)
 */

import { appendFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';

import { isEmbedded } from '../src/math/embedded.ts';
import { makeRng } from '../src/math/perturb.ts';
import { newtonFlatten } from '../src/math/newton.ts';
import { RICH } from '../src/tori/index.ts';

const N = RICH.vertexCount * 3;     // 24
const SAMPLE_BYTES = N * 4;     // 96

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}
function hasFlag(name) { return args.indexOf(name) !== -1; }
function num(value, defaultVal) {
  return value === undefined ? defaultVal : Number(value);
}

const seed = num(flag('--seed'), Date.now() >>> 0);
const rngName = flag('--rng') ?? 'xoshiro';   // 'xoshiro' (default, 2^128) | 'mulberry' (legacy, 2^32)
const size = num(flag('--size'), 1.0);
const maxTries = num(flag('--max-tries'), Infinity);
const maxAccepts = num(flag('--max-accepts'), 1_000_000);
const maxPerFile = num(flag('--max-per-file'), 1_000_000);
const newtonTol = num(flag('--newton-tolerance'), 1e-10);
const reportEvery = num(flag('--report'), 1_000_000);
const flushEvery = num(flag('--flush'), 1_000);
const flatten = !hasFlag('--no-flatten');

const defaultBase = `samples/run-${Date.now()}`;
const baseOut = resolve((flag('--out') ?? defaultBase).replace(/\.(bin|csv)$/, ''));
const outDir = dirname(baseOut);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const pathForPart = (label, n) => `${baseOut}-${label}-${n.toString().padStart(3, '0')}.bin`;

console.log('sample-embedded');
console.log(`  rng:            ${rngName}`);
console.log(`  seed:           ${seed}`);
console.log(`  cube:           [-${size}, ${size}]^${N}`);
console.log(`  embedded out:   ${baseOut}-emb-<NNN>.bin`);
if (flatten) {
  console.log(`  flat out:       ${baseOut}-flat-<NNN>.bin`);
  console.log(`  newton tol:     ${newtonTol}`);
} else {
  console.log('  flatten:        OFF (skipping Newton stage)');
}
console.log(`  max-tries:      ${maxTries === Infinity ? '∞' : maxTries.toLocaleString()}`);
console.log(`  max-accepts:    ${maxAccepts === Infinity ? '∞' : maxAccepts.toLocaleString()}`);
console.log(`  max-per-file:   ${maxPerFile.toLocaleString()}`);
console.log('  ctrl-C to stop early; pending buffers are flushed.');
console.log();

// Run manifest: sidecar .params.txt next to the output (no dates/timestamps).
{
  const pairs = [
    ['script', 'sample-embedded'],
    ['type', `#${RICH.id} (${RICH.name})`],
    ['rng', rngName],
    ['seed', seed],
    ['size', size],
    ['flatten', flatten],
  ];
  if (flatten) pairs.push(['newton-tol', newtonTol]);
  pairs.push(
    ['max-tries', maxTries === Infinity ? 'inf' : maxTries],
    ['max-accepts', maxAccepts === Infinity ? 'inf' : maxAccepts],
    ['max-per-file', maxPerFile],
  );
  const w = Math.max(...pairs.map(([k]) => k.length));
  const text = pairs.map(([k, v]) => `${k.padEnd(w)}  ${v}`).join('\n') + '\n';
  writeFileSync(`${baseOut}.params.txt`, text);
}

const rng = makeRng(rngName, seed);
const p = new Float64Array(N);
const pCopy = new Float64Array(N);

// Stage 1 bucket: embedded random samples.
const embStaging = new Float32Array(flushEvery * N);
let embStagingCount = 0;
let embPartNum = 0;
let embCurrentPart = pathForPart('emb', embPartNum);
let acceptsInEmbPart = 0;

// Stage 2 bucket: also flat after Newton.
const flatStaging = new Float32Array(flushEvery * N);
let flatStagingCount = 0;
let flatPartNum = 0;
let flatCurrentPart = pathForPart('flat', flatPartNum);
let acceptsInFlatPart = 0;

// Counters
let tries = 0;
let embAccepts = 0;
let flatAccepts = 0;
let newtonConverged = 0;
let newtonDiverged = 0;

const start = Date.now();
let lastReportTime = start;
let lastReportTries = 0;

function flushEmb() {
  if (embStagingCount === 0) return;
  appendFileSync(embCurrentPart, Buffer.from(embStaging.buffer, 0, embStagingCount * SAMPLE_BYTES));
  embStagingCount = 0;
}
function flushFlat() {
  if (flatStagingCount === 0) return;
  appendFileSync(flatCurrentPart, Buffer.from(flatStaging.buffer, 0, flatStagingCount * SAMPLE_BYTES));
  flatStagingCount = 0;
}
function rollEmb() {
  flushEmb();
  embPartNum++;
  embCurrentPart = pathForPart('emb', embPartNum);
  acceptsInEmbPart = 0;
  console.log(`  → new emb part: ${embCurrentPart}`);
}
function rollFlat() {
  flushFlat();
  flatPartNum++;
  flatCurrentPart = pathForPart('flat', flatPartNum);
  acceptsInFlatPart = 0;
  console.log(`  → new flat part: ${flatCurrentPart}`);
}

function totalSize(label, partNum) {
  let s = 0;
  for (let i = 0; i <= partNum; i++) {
    try { s += statSync(pathForPart(label, i)).size; } catch { /* */ }
  }
  return s;
}
function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function report() {
  const now = Date.now();
  const dT = (now - lastReportTime) / 1000;
  const dTries = tries - lastReportTries;
  const tps = dT > 0 ? dTries / dT : 0;
  const elapsed = (now - start) / 1000;
  const embSize = formatSize(totalSize('emb', embPartNum));
  const flatSize = formatSize(totalSize('flat', flatPartNum));
  const flatStr = flatten ? `flat=${flatAccepts.toLocaleString().padStart(5)} (${flatSize.padStart(8)})` : '';
  console.log(
    `[${elapsed.toFixed(0).padStart(5)}s] `
    + `tries=${tries.toLocaleString().padStart(13)} `
    + `emb=${embAccepts.toLocaleString().padStart(7)} (${embSize.padStart(8)}) `
    + flatStr + ' '
    + `rate=${tps.toFixed(0).padStart(7)}/s`,
  );
  lastReportTime = now;
  lastReportTries = tries;
}

process.on('SIGINT', () => {
  flushEmb();
  flushFlat();
  console.log('\n— interrupted —');
  report();
  if (flatten) {
    console.log(`newton converged: ${newtonConverged.toLocaleString()}, diverged: ${newtonDiverged.toLocaleString()}`);
  }
  process.exit(0);
});

while (tries < maxTries && embAccepts < maxAccepts) {
  for (let i = 0; i < N; i++) p[i] = (rng() * 2 - 1) * size;
  tries++;
  if (isEmbedded(RICH, p)) {
    // Stage 1: save the embedded random torus.
    embStaging.set(p, embStagingCount * N);
    embStagingCount++;
    embAccepts++;
    acceptsInEmbPart++;
    if (embStagingCount >= flushEvery) flushEmb();
    if (acceptsInEmbPart >= maxPerFile) rollEmb();

    // Stage 2: copy, Newton-flatten, re-check embedded.
    if (flatten) {
      pCopy.set(p);
      const r = newtonFlatten(RICH, pCopy, { tolerance: newtonTol });
      if (r.status === 'converged') {
        newtonConverged++;
        if (isEmbedded(RICH, pCopy)) {
          flatStaging.set(pCopy, flatStagingCount * N);
          flatStagingCount++;
          flatAccepts++;
          acceptsInFlatPart++;
          if (flatStagingCount >= flushEvery) flushFlat();
          if (acceptsInFlatPart >= maxPerFile) rollFlat();
        }
      } else if (r.status === 'diverged') {
        newtonDiverged++;
      }
    }
  }
  if (tries % reportEvery === 0) report();
}

flushEmb();
flushFlat();
console.log('\n— done —');
report();
if (flatten) {
  console.log(`newton converged: ${newtonConverged.toLocaleString()}, diverged: ${newtonDiverged.toLocaleString()}`);
}
