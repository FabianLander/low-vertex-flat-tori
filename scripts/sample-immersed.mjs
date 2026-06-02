/**
 * Sample a dataset of IMMERSED flat 8-vertex tori — fast, no embedding filter.
 *
 *   for each attempt:
 *     1. Sample 24 coords i.i.d. uniform in [-1, 1] (the cube, side 2).
 *     2. newtonFlatten              (min-norm projection onto the flat manifold)
 *     3. Discard unless Newton converged.
 *     4. Discard if the flattened torus LEFT the cube (any |coord| > 1).
 *     5. Discard if any triangle is degenerate (area < --min-area) — this is the
 *        "immersion" guard: a flat angle-defect-free realization with a collapsed
 *        triangle is not an immersion. (Empirically never fires from cube starts,
 *        but kept so the output is honestly immersed, not merely angle-flat.)
 *     6. Write one CSV row of 24 full-precision floats.
 *
 * Unlike sample-flat.mjs there is NO repulsion flow and NO isEmbedded check:
 * these tori are immersions, not necessarily embeddings. Newton converges ~100%
 * of the time from a cube start and ~17% land back inside the cube, so 50k saves
 * take a few hundred-thousand attempts ≈ seconds.
 *
 * Coordinates are saved RAW (no unit-area normalization): the cube is the bound,
 * and rescaling would undo the containment that step 4 enforces.
 *
 * Output format: comma-separated, one torus per line, 24 floats
 * `x0,y0,z0,...,x7,y7,z7`, via Number.prototype.toString() (shortest exact
 * round-trip under Number(field)). Same format as everything in data/.
 *
 * Usage:
 *   npm run sample-immersed -- [options]
 *
 * Options:
 *   --count N         Number of tori to save (default: 50000)
 *   --out PATH        Output CSV (default: data/immersed-flat.csv). Overwritten.
 *   --seed N          RNG seed (default: clock-derived; printed at start)
 *   --tol N           Newton tolerance = max |2π − coneAngle| (default: 1e-10)
 *   --min-area N      Degenerate-triangle threshold (default: 1e-9)
 *   --max-newton N    Newton iteration cap per attempt (default: 50)
 *   --report-secs N   Progress line every N seconds (default: 5)
 *
 * Ctrl-C flushes the pending buffer and exits cleanly.
 */

import { appendFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';

import { mulberry32 } from '../src/math/perturb.ts';
import { VERTEX_COUNT, TRIANGLES } from '../src/math/topology.ts';
import { newtonFlatten } from '../src/math/newton.ts';
import { maxConeDeficit } from '../src/math/angles.ts';

const N = VERTEX_COUNT * 3;  // 24

const args = process.argv.slice(2);
function flag(name) { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1]; }
function num(v, d) { return v === undefined ? d : Number(v); }

const count = num(flag('--count'), 50_000);
const seed = num(flag('--seed'), Date.now() >>> 0);
const tol = num(flag('--tol'), 1e-10);
const minArea = num(flag('--min-area'), 1e-9);
const maxNewton = num(flag('--max-newton'), 50);
const reportSecs = num(flag('--report-secs'), 5);
const outPath = resolve(flag('--out') ?? 'data/immersed-flat.csv');

const outDir = dirname(outPath);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
if (existsSync(outPath)) rmSync(outPath);  // fresh file; we append as we go

console.log('sample-immersed');
console.log(`  count:        ${count.toLocaleString()}`);
console.log(`  seed:         ${seed}`);
console.log(`  cube:         [-1, 1]^${N}  (uniform i.i.d. start, discard if flattened result leaves it)`);
console.log(`  newton tol:   ${tol}  (max |2π − coneAngle|; cap ${maxNewton} iters)`);
console.log(`  min tri area: ${minArea}  (immersion guard: reject collapsed triangles)`);
console.log(`  out:          ${outPath}`);
console.log('  ctrl-C to stop early; pending buffer is flushed.\n');

const rng = mulberry32(seed);
const p = new Float64Array(N);

// --- smallest triangle area, to reject degenerate (non-immersion) realizations.
function minTriArea(q) {
  let m = Infinity;
  for (let t = 0; t < TRIANGLES.length; t++) {
    const [a, b, c] = TRIANGLES[t];
    const ux = q[3 * b] - q[3 * a], uy = q[3 * b + 1] - q[3 * a + 1], uz = q[3 * b + 2] - q[3 * a + 2];
    const vx = q[3 * c] - q[3 * a], vy = q[3 * c + 1] - q[3 * a + 1], vz = q[3 * c + 2] - q[3 * a + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    const area = 0.5 * Math.hypot(cx, cy, cz);
    if (area < m) m = area;
  }
  return m;
}

function inCube(q) {
  for (let i = 0; i < N; i++) if (Math.abs(q[i]) > 1) return false;
  return true;
}

// --- output staging.
const buf = [];
const FLUSH_EVERY = 2000;
function flushBuf() {
  if (buf.length === 0) return;
  appendFileSync(outPath, buf.join('\n') + '\n');
  buf.length = 0;
}

// --- counters.
let tries = 0, notConverged = 0, leftCube = 0, degenerate = 0, saved = 0;
const start = Date.now();
let lastReport = start, lastTries = 0, lastSaved = 0;

function report(tag = '') {
  const now = Date.now();
  const elapsed = (now - start) / 1000;
  const dT = (now - lastReport) / 1000 || 1e-9;
  const triesPerSec = (tries - lastTries) / dT;
  const savedPerSec = (saved - lastSaved) / dT;
  const acceptPct = tries > 0 ? (100 * saved / tries) : 0;
  console.log(
    `[${elapsed.toFixed(0).padStart(4)}s]${tag} `
    + `tries=${tries.toLocaleString().padStart(9)} `
    + `saved=${saved.toLocaleString().padStart(7)}/${count.toLocaleString()} `
    + `(${acceptPct.toFixed(1)}% accept) `
    + `${(triesPerSec / 1000).toFixed(1)}k tries/s, ${savedPerSec.toFixed(0)} saves/s`,
  );
  lastReport = now; lastTries = tries; lastSaved = saved;
}

process.on('SIGINT', () => {
  flushBuf();
  console.log('\n— interrupted —');
  report();
  console.log(`reject breakdown: not-converged=${notConverged}  left-cube=${leftCube}  degenerate=${degenerate}`);
  process.exit(0);
});

const reportMs = reportSecs * 1000;

while (saved < count) {
  for (let i = 0; i < N; i++) p[i] = rng() * 2 - 1;   // 1. uniform in cube
  tries++;

  const r = newtonFlatten(p, { tolerance: tol, maxIters: maxNewton });  // 2.
  if (r.status !== 'converged') { notConverged++; }          // 3.
  else if (!inCube(p)) { leftCube++; }                       // 4.
  else if (minTriArea(p) < minArea) { degenerate++; }        // 5.
  else {
    // 6. serialize: shortest exact round-trip per value.
    let row = p[0].toString();
    for (let i = 1; i < N; i++) row += ',' + p[i].toString();
    buf.push(row);
    saved++;
    if (buf.length >= FLUSH_EVERY) flushBuf();
  }

  if (Date.now() - lastReport > reportMs) report();
}

flushBuf();
console.log('\n— done —');
report();
console.log(`reject breakdown: not-converged=${notConverged}  left-cube=${leftCube}  degenerate=${degenerate}`);
console.log(`wrote ${saved.toLocaleString()} immersed flat tori → ${outPath}`);
