/**
 * random-imaginary — an UNGUIDED Monte Carlo: does an imaginary-axis modulus
 * (default the square torus i, Im = 1) admit an embedded type-7 realization?
 *
 * Complements the continuation result (collect-imaginary marched down only to
 * Im ≈ 1.134 before the embedded set pinched, short of i). Here we do NOT follow
 * a path: each attempt kicks EVERY coordinate of a low embedded rectangular torus
 * by a large Gaussian σ (a random shape in the flat-shape fiber, no symmetry),
 * projects onto {flat ∧ τ̂ = (0, t)} (pinning the modulus EXACTLY), optionally flows
 * the repulsion energy, and checks isEmbedded.
 *
 *   - one embedded hit at t = 1  ⟹  the square torus IS realizable (DS Remark 6, +).
 *   - many thousands of attempts, zero hits  ⟹  strong evidence it is not.
 *
 * Runs until --max-hours or Ctrl-C; checkpoints the hits every --report-secs
 * (safe to kill any time). The base seed is the lowest-Im embedded rectangular
 * torus (so the frozen SL(2,ℤ) chart is valid near the target).
 *
 *   npm run random-imaginary -- [options]
 *   --im N         target Im τ̂ (default 1.0 = the square torus i)
 *   --sigma N      kick stddev per coordinate (default 0.15)
 *   --flow-iters N repulsion-flow iters per attempt after projecting (default 200; 0 = off)
 *   --max-hours N  stop after N hours (default ∞ — Ctrl-C)
 *   --seed N       RNG seed (default 1)
 *   --seed-file P  embedded seed pool (default data/curated/rectangular-t7.csv)
 *   --out PATH     output base (default samples/random-i-<im>)
 */

import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';

import { byId } from '../src/triangulations/index.ts';
import { project } from '../src/solvers/project.ts';
import { flow } from '../src/solvers/flow.ts';
import { certify } from '../src/search/certify.ts';
import { identity } from '../src/configuration/chart.ts';
import { flat } from '../src/conditions/flat.ts';
import { fixedModulus } from '../src/conditions/modulus.ts';
import { embedded } from '../src/regions/embedded.ts';
import { makeCutOffArea } from '../src/functions/energies/cutOffArea.ts';
import { makeRng } from '../src/configuration/rng.ts';

const args = process.argv.slice(2);
function flag(n) { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; }
function num(v, d) { return v === undefined ? d : Number(v); }

const torus = byId(7);
const N = torus.vertexCount * 3;
const T = num(flag('--im'), 1.0);                 // target Im τ̂ (square torus i = 1.0)
const SIGMA = num(flag('--sigma'), 0.15);
const FLOW_ITERS = num(flag('--flow-iters'), 200);
const MAX_HOURS = num(flag('--max-hours'), Infinity);
const REPORT = num(flag('--report-secs'), 30);
const RNG_SEED = num(flag('--seed'), 1);
const seedFile = resolve(flag('--seed-file') ?? 'data/curated/rectangular-t7.csv');
const outBase = resolve((flag('--out') ?? `samples/random-i-${T}`).replace(/\.csv$/, ''));

const chart = identity(N);
const region = embedded(torus);
const flatC = flat(torus);
// The UN-CROSSING energy: cut-off area is 0 iff no triangles cross (= embedded)
// and grows with penetration depth, so its descent separates crossing triangles —
// unlike cell-margin, which only fattens an already-embedded surface.
const uncross = makeCutOffArea(torus);

// Base: the lowest-Im embedded rectangular torus (keeps the frozen chart valid near t).
let base = null, baseIm = Infinity;
for (const l of readFileSync(seedFile, 'utf8').split('\n')) {
  if (!l.trim()) continue;
  const p = Float64Array.from(l.split(',').slice(0, N).map(Number));
  if (p.length !== N || p.some(Number.isNaN)) continue;
  const c = certify(torus, p);
  if (c.embedded && Math.abs(c.tauHat[0]) < 1e-3 && c.tauHat[1] < baseIm) { base = p; baseIm = c.tauHat[1]; }
}
if (!base) { process.stderr.write(`no embedded rectangular base seed in ${seedFile}\n`); process.exit(1); }

const rng = makeRng('xoshiro', RNG_SEED);
function gauss() { const u = Math.max(rng(), 1e-12); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); }

const startMs = Date.now();
let attempts = 0, onModulus = 0, embeddedN = 0, bestMargin = -Infinity;
const hitRows = [];
function checkpoint() {
  mkdirSync(dirname(outBase), { recursive: true });
  writeFileSync(outBase + '.csv', hitRows.length ? hitRows.join('\n') + '\n' : '');
}

process.stderr.write(
  `random-imaginary: target Im=${T} (square i = 1.0), base Im=${baseIm.toFixed(3)}, σ=${SIGMA}, flow ${FLOW_ITERS}, rng ${RNG_SEED}\n`,
);

let lastReport = startMs;
while ((Date.now() - startMs) / 3.6e6 < MAX_HOURS) {
  attempts++;
  const p = Float64Array.from(base);
  for (let i = 0; i < N; i++) p[i] += SIGMA * gauss();

  const held = [flatC, fixedModulus(torus, p, [0, T])];
  const x = new Float64Array(N);
  chart.lift(p, x);
  const pr = project(chart, x, held, { tolerance: 1e-12, maxIters: 120 });

  if (pr.status === 'converged') {
    onModulus++;
    chart.realize(x, p);
    if (FLOW_ITERS > 0 && !region.contains(p)) {
      flow(chart, x, held, uncross, { stepSize: 0.004, maxIters: FLOW_ITERS, energyTol: 1e-12 });
      chart.realize(x, p);
    }
    const c = certify(torus, p);
    if (c.margin > bestMargin) bestMargin = c.margin;
    if (c.embedded) {
      embeddedN++;
      hitRows.push(Array.from(p).join(',') + `,${c.coneDeficit},${c.tauHat[0]},${c.tauHat[1]},${c.margin}`);
      process.stderr.write(`  ★ EMBEDDED at τ̂=(${c.tauHat[0].toFixed(4)},${c.tauHat[1].toFixed(4)}) margin=${c.margin.toExponential(2)} (attempt ${attempts})\n`);
      checkpoint();
    }
  }

  if ((Date.now() - lastReport) / 1000 >= REPORT) {
    lastReport = Date.now();
    const mins = ((Date.now() - startMs) / 6e4).toFixed(1);
    process.stderr.write(`  ${mins}m: ${attempts} attempts, ${onModulus} on-modulus, ${embeddedN} embedded, best margin ${bestMargin.toExponential(2)}\n`);
    checkpoint();
  }
}

checkpoint();
process.stderr.write(`\nDone: ${attempts} attempts, ${embeddedN} embedded at Im=${T} → ${outBase}.csv\n`);
