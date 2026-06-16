/**
 * collect-rect — overnight collector for EXACTLY-rectangular embedded flat
 * tori (Re τ̂ = 0) with widely varying Im τ̂.
 *
 * The Im axis is split into buckets (--bucket wide). Each bucket holds one
 * champion: the torus with the LARGEST embedding margin among all exactly-
 * rectangular embedded tori found with that aspect ratio. The loop:
 *
 *   1. pick an occupied bucket — 35% of the time one of the two Im-extremes
 *      (pushes coverage outward), else uniform (improves interior quality);
 *   2. Gaussian-kick its champion, σ log-uniform in [--sigma-min, --sigma-max]
 *      (small kicks fatten in place, large kicks travel in Im);
 *   3. project EXACTLY back onto { flat ∧ Re(g·τ) = 0 } with the augmented
 *      Newton (g = the SL(2,ℤ) chart frozen at the parent);
 *   4. verify: cone deficit < 1e-10, |Re τ̂| < 1e-10, embedded;
 *   5. compute Im τ̂ + margin; install in the landing bucket if it is empty
 *      or beats the incumbent's margin.
 *
 * Per-bucket quality is monotone non-decreasing; coverage only grows.
 *
 * Output:
 *   <out>-all.csv           APPEND-ONLY: every verified exactly-rectangular
 *                           embedded torus found, in discovery order
 *   <out>-all-info.csv      SAME ORDER, header: reTau,imTau,coneDeficit,margin
 *
 * Archive (rewritten every --report-secs, safe to kill any time):
 *   <out>-archive.csv       one row per occupied bucket, ascending Im τ̂ —
 *                           24 full-precision floats (unit area)
 *   <out>-archive-info.csv  SAME ORDER, with header:
 *                           bucketIm,reTau,imTau,coneDeficit,margin
 *   <out>.log.csv           one line per report: coverage + quality stats
 *
 * Resume / extend: pass a previous run's archive as --in (any ≥24-col CSV
 * works; seeds are re-projected and re-verified at load).
 *
 * Usage:
 *   npm run collect-rect -- [options]
 *
 * Options:
 *   --in PATH         Seed CSV file or dir (repeatable).
 *                       Default: data/rect/pool.csv + data/rect/pool-tall.csv
 *   --type N          Triangulation type 1-7 (default 7)
 *   --seed N          RNG seed (default clock)
 *   --bucket N        Im τ̂ bucket width (default 0.02)
 *   --sigma-min N     Min kick (default 0.002)
 *   --sigma-max N     Max kick (default 0.08)
 *   --re-tol N        On-locus verification |Re τ̂| (default 1e-10)
 *   --angle-tol N     Flatness verification (default 1e-10)
 *   --max-hours N     Stop after N hours (default ∞ — ctrl-C)
 *   --out PATH        Output base (default samples/collect-rect-<timestamp>)
 *   --report-secs N   Report + rewrite interval (default 60)
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';

import { makeRng } from '../src/math/perturb.ts';
import { byId } from '../src/tori/index.ts';
import { modulus, reduceModulus, reduceModulusWithMatrix, applyMobius } from '../src/math/develop.ts';
import { newtonFlatten } from '../src/math/newton.ts';
import { maxConeDeficit } from '../src/math/angles.ts';
import { isEmbedded } from '../src/math/embedded.ts';
import { minMargin, linearSize } from '../src/math/energies/cellMargin.ts';

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

const seed = num(flag('--seed'), Date.now() >>> 0);
const BUCKET = num(flag('--bucket'), 0.02);
const sigmaMin = num(flag('--sigma-min'), 0.002);
const sigmaMax = num(flag('--sigma-max'), 0.08);
const reTol = num(flag('--re-tol'), 1e-10);
const angleTol = num(flag('--angle-tol'), 1e-10);
const maxHours = num(flag('--max-hours'), Infinity);
const reportSecs = num(flag('--report-secs'), 60);
const baseOut = resolve((flag('--out') ?? `samples/collect-rect-${Date.now()}`).replace(/\.csv$/, ''));
const inputs = flags('--in').length ? flags('--in') : ['data/rect/pool.csv', 'data/rect/pool-tall.csv'];

const rng = makeRng('xoshiro', seed);
function gaussian() {
  let u = rng();
  if (u < 1e-12) u = 1e-12;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}
const logMin = Math.log(sigmaMin), logMax = Math.log(sigmaMax);
const drawSigma = () => Math.exp(logMin + rng() * (logMax - logMin));

function unitArea(p) {
  const k = 1 / linearSize(torus, p);
  for (let i = 0; i < N; i++) p[i] *= k;
}

/** Project p exactly onto { flat ∧ rectangular } in the chart frozen at p
 *  itself; returns the verified certificate or null. */
function projectAndVerify(p) {
  const { m } = reduceModulusWithMatrix(modulus(torus, p).tau);
  const nr = newtonFlatten(torus, p, {
    tolerance: 1e-12,
    extraConstraints: [{ value: (q) => applyMobius(m, modulus(torus, q).tau)[0] }],
  });
  if (nr.status !== 'converged') return null;
  unitArea(p);
  const deficit = maxConeDeficit(torus, p);
  const t = reduceModulus(modulus(torus, p).tau);
  if (!(deficit < angleTol) || !(Math.abs(t[0]) < reTol)) return null;
  if (!isEmbedded(torus, p)) return null;
  return { re: t[0], im: t[1], deficit, margin: minMargin(torus, p).margin };
}

// ---- archive: Im bucket → champion (max margin) ----
const archive = new Map();   // bucketIndex → { p, re, im, deficit, margin }
function install(p, cert) {
  const b = Math.floor(cert.im / BUCKET);
  const cur = archive.get(b);
  if (cur && cur.margin >= cert.margin) return false;
  archive.set(b, { p: Float64Array.from(p), ...cert });
  return !cur ? 'new-bucket' : 'fatter';
}

// ---- seed the archive ----
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
    const cert = projectAndVerify(p);
    if (cert) install(p, cert);
  }
}
if (archive.size === 0) { console.error('collect-rect: no seeds survived projection'); process.exit(1); }

// ---- output ----
const outDir = dirname(baseOut);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const archivePath = `${baseOut}-archive.csv`;
const infoPath = `${baseOut}-archive-info.csv`;
const logPath = `${baseOut}.log.csv`;
appendFileSync(logPath, 'elapsedSec,tries,savedAll,installed,buckets,imLo,imHi,medianMargin,minMargin,maxMargin\n');
const allPath = `${baseOut}-all.csv`;
const allInfoPath = `${baseOut}-all-info.csv`;
if (!existsSync(allInfoPath)) appendFileSync(allInfoPath, 'reTau,imTau,coneDeficit,margin\n');
// every verified on-locus torus is stored — the archive only steers the search
function saveAll(p, cert) {
  appendFileSync(allPath, Array.from(p, (v) => v.toString()).join(',') + '\n');
  appendFileSync(allInfoPath, `${cert.re},${cert.im},${cert.deficit},${cert.margin}\n`);
}

function writeArchive() {
  const entries = [...archive.values()].sort((a, b) => a.im - b.im);
  writeFileSync(archivePath, entries.map((e) => Array.from(e.p, (v) => v.toString()).join(',')).join('\n') + '\n');
  writeFileSync(infoPath, 'bucketIm,reTau,imTau,coneDeficit,margin\n'
    + entries.map((e) => `${(Math.floor(e.im / BUCKET) * BUCKET).toFixed(4)},${e.re},${e.im},${e.deficit},${e.margin}`).join('\n') + '\n');
}

const stats = () => {
  const es = [...archive.values()].sort((a, b) => a.im - b.im);
  const ms = es.map((e) => e.margin).sort((a, b) => a - b);
  return { n: es.length, imLo: es[0].im, imHi: es[es.length - 1].im, mMed: ms[Math.floor(ms.length / 2)], mMin: ms[0], mMax: ms[ms.length - 1] };
};

{
  const s = stats();
  console.log('collect-rect — exact Re τ̂ = 0 archive, one fattest torus per Im bucket');
  console.log(`  seeds:    ${seedRows} rows → ${s.n} buckets, Im ∈ [${s.imLo.toFixed(3)}, ${s.imHi.toFixed(3)}]`);
  console.log(`  bucket:   ${BUCKET}   σ: log-uniform [${sigmaMin}, ${sigmaMax}]   rng seed ${seed}`);
  console.log(`  verify:   deficit < ${angleTol}, |Re τ̂| < ${reTol}, embedded; champion = max margin`);
  console.log(`  out:      ${archivePath}\n            ${infoPath}\n            ${logPath}`);
  console.log(`  stop:     ${maxHours === Infinity ? 'ctrl-C' : maxHours + 'h'} (archive rewritten every ${reportSecs}s — safe to kill)`);
  console.log();
}
writeArchive();

// ---- main loop ----
const start = Date.now();
let lastReport = start;
let tries = 0, accepted = 0, newBuckets = 0, allSaved = 0;
let running = true;
process.on('SIGINT', () => { running = false; });

const p = new Float64Array(N);
while (running && (Date.now() - start) / 3600000 < maxHours) {
  // pick a parent bucket: 35% an Im-extreme (expand), else uniform (fatten)
  const keys = [...archive.keys()];
  let key;
  const r = rng();
  if (r < 0.175) key = Math.min(...keys);
  else if (r < 0.35) key = Math.max(...keys);
  else key = keys[Math.floor(rng() * keys.length)];
  const parent = archive.get(key);

  const sigma = drawSigma();
  for (let i = 0; i < N; i++) p[i] = parent.p[i] + sigma * gaussian();
  tries++;

  const cert = projectAndVerify(p);
  if (cert) {
    saveAll(p, cert);
    allSaved++;
    if (allSaved % 100 === 0) {
      console.log(`  #${allSaved.toLocaleString().padStart(8)}  τ̂ = ${cert.re.toExponential(1)} + ${cert.im.toFixed(5)}i  flat=${cert.deficit.toExponential(1)}  margin=${cert.margin.toExponential(2)}  (${archive.size} buckets, ${((Date.now() - start) / 60000).toFixed(1)}m)`);
    }
    const how = install(p, cert);
    if (how) {
      accepted++;
      if (how === 'new-bucket') {
        newBuckets++;
        console.log(`  + bucket ${(Math.floor(cert.im / BUCKET) * BUCKET).toFixed(3)}  Im=${cert.im.toFixed(5)}  margin=${cert.margin.toExponential(2)}  (${archive.size} buckets, t=${((Date.now() - start) / 60000).toFixed(1)}m)`);
      }
    }
  }

  if (Date.now() - lastReport > reportSecs * 1000) {
    lastReport = Date.now();
    writeArchive();
    const s = stats();
    appendFileSync(logPath, `${((Date.now() - start) / 1000).toFixed(0)},${tries},${allSaved},${accepted},${s.n},${s.imLo},${s.imHi},${s.mMed},${s.mMin},${s.mMax}\n`);
    console.log(`[${((Date.now() - start) / 60000).toFixed(1).padStart(7)}m] tries=${tries.toLocaleString()}  saved=${allSaved.toLocaleString()}  installed=${accepted}  `
      + `buckets=${s.n} (Im ${s.imLo.toFixed(3)}–${s.imHi.toFixed(3)})  margins med=${s.mMed.toExponential(1)} max=${s.mMax.toExponential(1)}`);
  }
}

writeArchive();
const s = stats();
console.log(`\n— done — ${s.n} buckets, Im ∈ [${s.imLo.toFixed(4)}, ${s.imHi.toFixed(4)}], median margin ${s.mMed.toExponential(2)}`);
console.log(`archive:  ${archivePath}`);
console.log(`resume:   npm run collect-rect -- --in ${archivePath}`);
