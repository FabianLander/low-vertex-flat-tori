/**
 * random-imaginary — an UNGUIDED Monte Carlo: does an imaginary-axis modulus
 * (default the square torus i, Im = 1) admit an embedded type-7 realization?
 *
 * Complements the continuation result (collect-imaginary / march-to-i, which march
 * down only to a pinch short of i). Here we do NOT follow a path: each attempt kicks
 * EVERY coordinate of a low embedded rectangular torus by a large Gaussian σ (a random
 * shape in the flat-shape fiber, no symmetry), projects onto {flat ∧ τ̂ = (0, T)}
 * (pinning the modulus EXACTLY), optionally flows the repulsion energy, and checks
 * isEmbedded.
 *
 *   - one embedded hit at T = 1  ⟹  the square torus IS realizable (DS Remark 6, +).
 *   - many thousands of attempts, zero hits  ⟹  strong evidence it is not.
 *
 * Runs until --max-hours or Ctrl-C; checkpoints the hits every --report-secs.
 *
 *   npm run random-imaginary -- [--im N] [--sigma N] [--flow-iters N] [--max-hours N]
 *                                [--seed N] [--seed-file P] [--out PATH]
 */

import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';

import { makeArgs } from './lib/cli.mjs';
import { byId } from '@core/triangulations/index.ts';
import { project } from '@core/solvers/project.ts';
import { minimize } from '@core/solvers/minimize.ts';
import { certify } from '@core/search/legacy/certify.ts';
import { flat } from '@core/constraints/flat.ts';
import { fixedModulus } from '@core/constraints/modulus.ts';
import { isEmbedded, makeCutOffArea } from '@core/embedding/index.ts';
import { makeRng } from '@core/sampling/rng.ts';

const a = makeArgs(process.argv);
const TYPE = a.num('--type', 7);
const triang = byId('v8-' + TYPE);
const N = triang.vertexCount * 3;
const T = a.num('--im', 1.0);                 // target Im τ̂ (square torus i = 1.0)
const SIGMA = a.num('--sigma', 0.15);
const FLOW_ITERS = a.num('--flow-iters', 200);
const MAX_HOURS = a.num('--max-hours', Infinity);
const REPORT = a.num('--report-secs', 30);
const RNG_SEED = a.num('--seed', 1);
const seedFile = resolve(a.flag('--seed-file') ?? `data/curated/rectangular-t${TYPE}.csv`);
const outBase = resolve((a.flag('--out') ?? `samples/random-i-${T}`).replace(/\.csv$/, ''));

// fullSpace ⇒ the working point is the positions; flat / fixedModulus / cut-off area
// are all ambient (ℝ³ⱽ) maps, so project/flow take them directly. The UN-CROSSING
// energy (cut-off area) is 0 iff embedded and grows with penetration, so its descent
// separates crossing triangles (unlike cell-margin, which only fattens).
const flatC = flat(triang);
const uncross = makeCutOffArea(triang);

// Base: the lowest-Im embedded rectangular torus (keeps the frozen chart valid near T).
let base = null, baseIm = Infinity;
for (const l of readFileSync(seedFile, 'utf8').split('\n')) {
  if (!l.trim()) continue;
  const p = Float64Array.from(l.split(',').slice(0, N).map(Number));
  if (p.length !== N || p.some(Number.isNaN)) continue;
  const c = certify(triang, p);
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
  const x = Float64Array.from(base);                 // working point = positions
  for (let i = 0; i < N; i++) x[i] += SIGMA * gauss();

  // pin {flat ∧ τ̂ = (0, T)}, chart frozen at the kicked config
  const held = [flatC, fixedModulus(triang, x, [0, T])];
  const pr = project(x, held, { tolerance: 1e-12, maxIters: 120 });

  if (pr.status === 'converged') {
    onModulus++;
    if (FLOW_ITERS > 0 && !isEmbedded(triang, x)) {
      minimize(x, held, uncross, { stepSize: 0.004, maxIters: FLOW_ITERS, energyTol: 1e-12 });
    }
    const c = certify(triang, x);
    if (c.margin > bestMargin) bestMargin = c.margin;
    if (c.embedded) {
      embeddedN++;
      hitRows.push(Array.from(x).join(',') + `,${c.coneDeficit},${c.tauHat[0]},${c.tauHat[1]},${c.margin}`);
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
