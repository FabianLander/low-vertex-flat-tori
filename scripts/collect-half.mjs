/**
 * collect-half — overnight collector for embedded flat tori as close as
 * possible to the rhombic wall Re τ̂ = 1/2, across widely varying Im τ̂.
 *
 * Unlike Re = 0 (see collect-rect.mjs), the wall sits at the very edge of
 * embeddability — margins collapse as you approach — so points cannot be
 * projected exactly onto it. Instead each Im bucket keeps the champion
 * CLOSEST to the wall (smallest dist = ||Re τ̂| − 1/2|), margin recorded, and
 * the archive doubles as a map of how near the wall the embedded set comes
 * at each aspect ratio.
 *
 * Moves (mixed per iteration), built on the validated push-re mechanics:
 *   FLOW   barrier-pull descent  E = −sgn·Re(g·τ) + λ·(Im(g·τ) − c)² + μ·B
 *          with μ ∝ current margin (slides along the embeddedness boundary
 *          toward the wall) and an Im ANCHOR at c = the target bucket's
 *          center — λ is what spreads the search SIDEWAYS along the wall
 *          into empty buckets instead of funneling to one easy Im.
 *   KICK   margin-scaled Gaussian kicks (σ = margin/3, 10% at 10σ),
 *          re-flattened; installed wherever they land if they improve.
 *   FATTEN when a champion's margin sinks below --margin-floor, barrier-only
 *          flow (costs a little dist, buys room to move).
 *
 * Output:
 *   <out>-all.csv           APPEND-ONLY: every verified torus with
 *                           distToWall < --save-below, in discovery order
 *   <out>-all-info.csv      SAME ORDER, header:
 *                           reTau,imTau,coneDeficit,margin,distToWall
 *
 * Archive (rewritten every --report-secs, safe to kill any time):
 *   <out>-archive.csv       one row per occupied bucket, ascending Im τ̂ —
 *                           24 full-precision floats (unit area)
 *   <out>-archive-info.csv  SAME ORDER, header:
 *                           bucketIm,reTau,imTau,coneDeficit,margin,distToWall
 *   <out>.log.csv           one line per report
 *
 * Resume / extend: pass a previous archive back as --in.
 *
 * Usage:
 *   npm run collect-half -- [options]
 *
 * Options:
 *   --in PATH         Seed CSV file or dir (repeatable; ≥24 cols).
 *                       Default: data/rect/seeds-half.csv
 *   --type N          Triangulation type 1-7 (default 7)
 *   --seed N          RNG seed (default clock)
 *   --bucket N        Im τ̂ bucket width (default 0.02)
 *   --im-pull N       Anchor weight λ (default 2)
 *   --flow-iters N    Flow iterations per FLOW move (default 200)
 *   --kicks N         Kicks per KICK move (default 400)
 *   --step N          Flow step size (default 1e-3)
 *   --barrier-delta N Barrier cutoff, units of √area (default 0.02)
 *   --margin-floor N  Fatten a champion below this margin (default 1e-6)
 *   --save-below N    Append to -all.csv when distToWall < this (default 1e-2)
 *   --margin-min N    REJECT candidates with margin below this (default 1e-12
 *                       — below that, embeddedness is numerical dust)
 *   --angle-tol N     Flatness verification (default 1e-10)
 *   --max-hours N     Stop after N hours (default ∞ — ctrl-C)
 *   --out PATH        Output base (default samples/collect-half-<timestamp>)
 *   --report-secs N   Report + rewrite interval (default 60)
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';

import { makeRng } from '../src/math/perturb.ts';
import { byId } from '../src/triangulations/index.ts';
import { modulus, reduceModulus, reduceModulusWithMatrix, applyMobius } from '../src/topology/develop.ts';
import { newtonFlatten } from '../src/math/newton.ts';
import { maxConeDeficit } from '../src/math/angles.ts';
import { isEmbedded } from '../src/math/embedded.ts';
import { embeddedFlow } from '../src/math/embeddedFlow.ts';
import { makeCellBarrier } from '../src/math/energies/cellBarrier.ts';
import { minMargin, linearSize } from '../src/math/energies/cellMargin.ts';
import { energyFromCompute } from '../src/math/energies/finiteDiffGradient.ts';

const args = process.argv.slice(2);
function flags(name) {
  const out = [];
  for (let i = 0; i < args.length; i++) if (args[i] === name) out.push(args[i + 1]);
  return out;
}
function flag(name) { return flags(name)[0]; }
function num(v, d) { return v === undefined ? d : Number(v); }

const torus = byId(num(flag('--type'), 7));
const N = torus.vertexCount * 3;

const TARGET = 0.5;
const seed = num(flag('--seed'), Date.now() >>> 0);
const BUCKET = num(flag('--bucket'), 0.02);
const IM_PULL = num(flag('--im-pull'), 2);
const FLOW_ITERS = num(flag('--flow-iters'), 200);
const KICKS = num(flag('--kicks'), 400);
const STEP = num(flag('--step'), 1e-3);
const DELTA = num(flag('--barrier-delta'), 0.02);
const MARGIN_FLOOR = num(flag('--margin-floor'), 1e-6);
const MARGIN_MIN = num(flag('--margin-min'), 1e-12);
const SAVE_BELOW = num(flag('--save-below'), 1e-2);
const angleTol = num(flag('--angle-tol'), 1e-10);
const maxHours = num(flag('--max-hours'), Infinity);
const reportSecs = num(flag('--report-secs'), 60);
const baseOut = resolve((flag('--out') ?? `samples/collect-half-${Date.now()}`).replace(/\.csv$/, ''));
const inputs = flags('--in').length ? flags('--in') : ['data/rect/seeds-half.csv'];

const rng = makeRng('xoshiro', seed);
function gaussian() {
  let u = rng();
  if (u < 1e-12) u = 1e-12;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

function unitArea(p) {
  const k = 1 / linearSize(torus, p);
  for (let i = 0; i < N; i++) p[i] *= k;
}
function certify(p) {
  if (maxConeDeficit(torus, p) > angleTol || !isEmbedded(torus, p)) return null;
  const margin = minMargin(torus, p).margin;
  if (margin < MARGIN_MIN) return null;   // numerically meaningless embeddedness
  const t = reduceModulus(modulus(torus, p).tau);
  return {
    re: t[0], im: t[1],
    deficit: maxConeDeficit(torus, p),
    margin,
    dist: Math.abs(Math.abs(t[0]) - TARGET),
  };
}

// ---- archive: Im bucket → champion (min dist to the wall) ----
const archive = new Map();
function install(p, cert) {
  const b = Math.floor(cert.im / BUCKET);
  const cur = archive.get(b);
  if (cur && cur.dist <= cert.dist) return false;
  archive.set(b, { p: Float64Array.from(p), ...cert });
  return !cur ? 'new-bucket' : 'closer';
}

// ---- seed ----
const files = [];
for (const inp of inputs) {
  const p = resolve(inp);
  if (statSync(p).isDirectory()) {
    for (const f of readdirSync(p)) if (f.endsWith('.csv')) files.push(join(p, f));
  } else files.push(p);
}
let seedRows = 0;
for (const f of files) {
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s) continue;
    const parts = s.split(',');
    if (parts.length < N) continue;
    const p = new Float64Array(N);
    for (let i = 0; i < N; i++) p[i] = Number(parts[i]);
    seedRows++;
    unitArea(p);
    const cert = certify(p);
    if (cert) install(p, cert);
  }
}
if (archive.size === 0) { console.error('collect-half: no healthy seeds'); process.exit(1); }

// ---- output ----
const outDir = dirname(baseOut);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const archivePath = `${baseOut}-archive.csv`;
const infoPath = `${baseOut}-archive-info.csv`;
const logPath = `${baseOut}.log.csv`;
appendFileSync(logPath, 'elapsedSec,iters,savedAll,buckets,imLo,imHi,bestDist,medianDist,minMargin\n');
const allPath = `${baseOut}-all.csv`;
const allInfoPath = `${baseOut}-all-info.csv`;
if (!existsSync(allInfoPath)) appendFileSync(allInfoPath, 'reTau,imTau,coneDeficit,margin,distToWall\n');
let allSaved = 0;
// every good-enough find is stored — the archive only steers the search
function saveAll(p, cert) {
  if (cert.dist >= SAVE_BELOW) return;
  appendFileSync(allPath, Array.from(p, (v) => v.toString()).join(',') + '\n');
  appendFileSync(allInfoPath, `${cert.re},${cert.im},${cert.deficit},${cert.margin},${cert.dist}\n`);
  allSaved++;
  console.log(`  + #${allSaved.toString().padStart(6)}  τ̂=${cert.re.toFixed(8)} + ${cert.im.toFixed(5)}i  from½=${cert.dist.toExponential(2)}  flat=${cert.deficit.toExponential(1)}  margin=${cert.margin.toExponential(1)}`);
}

function writeArchive() {
  const entries = [...archive.values()].sort((a, b) => a.im - b.im);
  writeFileSync(archivePath, entries.map((e) => Array.from(e.p, (v) => v.toString()).join(',')).join('\n') + '\n');
  writeFileSync(infoPath, 'bucketIm,reTau,imTau,coneDeficit,margin,distToWall\n'
    + entries.map((e) => `${(Math.floor(e.im / BUCKET) * BUCKET).toFixed(4)},${e.re},${e.im},${e.deficit},${e.margin},${e.dist}`).join('\n') + '\n');
}
const stats = () => {
  const es = [...archive.values()].sort((a, b) => a.im - b.im);
  const ds = es.map((e) => e.dist).sort((a, b) => a - b);
  const ms = es.map((e) => e.margin);
  return { n: es.length, imLo: es[0].im, imHi: es[es.length - 1].im, dBest: ds[0], dMed: ds[Math.floor(ds.length / 2)], mMin: Math.min(...ms) };
};

{
  const s = stats();
  console.log('collect-half — archive of embedded tori nearest the rhombic wall |Re τ̂| = 1/2, per Im bucket');
  console.log(`  seeds:    ${seedRows} rows → ${s.n} buckets, Im ∈ [${s.imLo.toFixed(3)}, ${s.imHi.toFixed(3)}], best dist ${s.dBest.toExponential(2)}`);
  console.log(`  bucket:   ${BUCKET}   anchor λ=${IM_PULL}   flow ${FLOW_ITERS}@${STEP}   kicks ${KICKS}   δ=${DELTA}   rng ${seed}`);
  console.log(`  out:      ${archivePath}\n            ${infoPath}\n            ${logPath}`);
  console.log(`  stop:     ${maxHours === Infinity ? 'ctrl-C' : maxHours + 'h'} (archive rewritten every ${reportSecs}s — safe to kill)`);
  console.log();
}
writeArchive();

// ---- moves ----
const scratch = new Float64Array(N);

/** Guarded flow on `energy` from `from`; returns a fresh verified position or null. */
function runFlow(from, energy, iters) {
  const q = Float64Array.from(from);
  embeddedFlow(torus, q, energy, {
    stepSize: STEP,
    energyTol: -Infinity,            // objective goes negative — never converge on energy
    gradientTol: 1e-12,
    maxIters: iters,
    normalizeGradient: true,
    feasible: (x) => isEmbedded(torus, x),
    newtonOpts: { tolerance: 1e-12 },
  });
  unitArea(q);
  newtonFlatten(torus, q, { tolerance: 1e-12 });
  return certify(q) ? q : null;
}

/** FLOW move: pull champion toward the wall, anchored at Im = c. */
function flowMove(parent, c) {
  const { tau, m } = reduceModulusWithMatrix(modulus(torus, parent.p).tau);
  const sgn = tau[0] >= 0 ? 1 : -1;
  const mu = Math.max(parent.margin, 1e-9) * 0.25;
  const barrier = makeCellBarrier(torus, { delta: DELTA, strength: 1 });
  const energy = energyFromCompute('pull+anchor', (q) => {
    const t = applyMobius(m, modulus(torus, q).tau);
    const dIm = t[1] - c;
    return -sgn * t[0] + IM_PULL * dIm * dIm + mu * barrier.compute(q);
  });
  return runFlow(parent.p, energy, FLOW_ITERS);
}

/** FATTEN move: barrier only. */
function fattenMove(parent) {
  return runFlow(parent.p, makeCellBarrier(torus, { delta: DELTA, strength: 1 }), Math.floor(FLOW_ITERS / 2));
}

// ---- main loop ----
const start = Date.now();
let lastReport = start;
let iters = 0;
let running = true;
process.on('SIGINT', () => { running = false; });

while (running && (Date.now() - start) / 3600000 < maxHours) {
  iters++;
  const keys = [...archive.keys()];
  // parent: 30% an Im-extreme (expansion), else uniform
  let key;
  const r = rng();
  if (r < 0.15) key = Math.min(...keys);
  else if (r < 0.3) key = Math.max(...keys);
  else key = keys[Math.floor(rng() * keys.length)];
  const parent = archive.get(key);

  // anchor: own bucket center (refine) or a neighboring bucket's center
  // (sideways expansion — empty neighbors preferred)
  const centers = [key, key - 1, key + 1].map((k) => (k + 0.5) * BUCKET);
  let c = centers[0];
  const r2 = rng();
  if (r2 < 0.5) {
    const emptySide = [key - 1, key + 1].filter((k) => !archive.has(k));
    c = emptySide.length
      ? (emptySide[Math.floor(rng() * emptySide.length)] + 0.5) * BUCKET
      : centers[1 + Math.floor(rng() * 2)];
  }

  if (parent.margin < MARGIN_FLOOR && rng() < 0.5) {
    const q = fattenMove(parent);
    if (q) {
      const cert = certify(q);
      saveAll(q, cert);
      // fattening trades dist for margin: replace only if margin clearly grew
      const b = Math.floor(cert.im / BUCKET);
      const cur = archive.get(b);
      if (!cur || (cert.margin > cur.margin * 3 && cert.dist < cur.dist + 0.01)) {
        archive.set(b, { p: Float64Array.from(q), ...cert });
      }
    }
  } else if (rng() < 0.55) {
    const q = flowMove(parent, c);
    if (q) {
      const cert = certify(q);
      saveAll(q, cert);
      const how = install(q, cert);
      if (how === 'new-bucket') {
        console.log(`  + bucket ${(Math.floor(cert.im / BUCKET) * BUCKET).toFixed(3)}  Im=${cert.im.toFixed(4)}  dist=${cert.dist.toExponential(2)}  margin=${cert.margin.toExponential(1)}  (${archive.size} buckets, t=${((Date.now() - start) / 60000).toFixed(1)}m)`);
      }
    }
  } else {
    const sigmaBase = Math.max(parent.margin / 3, 1e-8);
    for (let k = 0; k < KICKS; k++) {
      const sigma = rng() < 0.1 ? sigmaBase * 10 : sigmaBase;
      for (let i = 0; i < N; i++) scratch[i] = parent.p[i] + sigma * gaussian();
      if (newtonFlatten(torus, scratch, { tolerance: 1e-12 }).status !== 'converged') continue;
      const cert = certify(scratch);
      if (cert) { saveAll(scratch, cert); install(scratch, cert); }
    }
  }

  if (Date.now() - lastReport > reportSecs * 1000) {
    lastReport = Date.now();
    writeArchive();
    const s = stats();
    appendFileSync(logPath, `${((Date.now() - start) / 1000).toFixed(0)},${iters},${allSaved},${s.n},${s.imLo},${s.imHi},${s.dBest},${s.dMed},${s.mMin}\n`);
    console.log(`[${((Date.now() - start) / 60000).toFixed(1).padStart(7)}m] iters=${iters}  saved=${allSaved}  buckets=${s.n} (Im ${s.imLo.toFixed(3)}–${s.imHi.toFixed(3)})  `
      + `dist best=${s.dBest.toExponential(2)} med=${s.dMed.toExponential(2)}  minMargin=${s.mMin.toExponential(1)}`);
  }
}

writeArchive();
const s = stats();
console.log(`\n— done — ${s.n} buckets, Im ∈ [${s.imLo.toFixed(4)}, ${s.imHi.toFixed(4)}], best dist ${s.dBest.toExponential(3)}`);
console.log(`archive:  ${archivePath}`);
console.log(`resume:   npm run collect-half -- --in ${archivePath}`);
