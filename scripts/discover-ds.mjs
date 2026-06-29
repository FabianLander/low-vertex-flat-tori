/**
 * discover-ds — find flat embedded type-7 tori inside the Doyle–Schwartz tent scaffold
 * (`coordinates/dsScaffold`): the search runs in the model's 10 DOF, so every seed and every
 * perturbation is in-model by construction (two coplanar pinned–free segments + two poles).
 *
 *   seed θ ∈ ℝ¹⁰ → project([flat]∘φ) → minimize(energy∘φ) → push → measure (flat ∧ embedded)
 *
 * A thin runner over `discover(triang, { space: dsScaffold(triang) })` + the `collect`
 * driver. Accepted tori are written as 24-float CSV rows (ambient positions), so `certify`,
 * `build-moduli-data`, and the viewers consume them unchanged. See docs/ds-scaffold.md.
 *
 * Usage:  npm run discover-ds -- [options]
 *   --seed N            RNG seed (default: clock)
 *   --rng NAME          'xoshiro' (default) | 'mulberry'
 *   --seed-mode NAME    'ds' (perturb a gauge-fixed DS torus; default) | 'cold' (uniform θ)
 *   --ds-x / --ds-y N   DS anchor modulus for seed-mode ds (default 0.35, 1.30)
 *   --seed-size N       cold mode half-extent for θ (default 1.0)
 *   --sigma-dist NAME   'log' (default) | 'uniform'
 *   --sigma-min/max N   perturbation σ in θ-space (default 0.01 .. 0.30)
 *   --energy NAME       'cutoff' (default) | 'chord2'
 *   --step-size N       flow step (default 0.001)
 *   --max-flow-iters N  flow cap per attempt (default 500)
 *   --angle-tol N       accept: max|2π−θ| (default 1e-10)
 *   --max-tries N       (default ∞)   --max-accepts N  (default 100)
 *   --out PATH          CSV out (default samples/discover-ds-<ts>.csv)
 *   --report-secs N     progress interval (default 10)
 */

import { appendFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { makeArgs, csvRow } from './lib/cli.mjs';
import { RICH } from '@core/triangulations/index.ts';
import { dsScaffold } from '@core/coordinates/dsScaffold.ts';
import { doyleSchwartzPositions } from '@core/search/doyleSchwartz.ts';
import { makeRng } from '@core/sampling/rng.ts';
import { collect } from '@core/search/collect.ts';
import { discover } from '@core/search/discover.ts';
import { perturbedSeeds, uniformSeeds, uniformSigma, logSigma } from '@core/sampling/seeds.ts';
import { makeCutOffArea, makeChordLengthSquared } from '@core/embedding/index.ts';

const a = makeArgs(process.argv);
const triang = RICH;                               // the DS scaffold is specific to v8-7
const space = dsScaffold(triang);
const seed = a.num('--seed', Date.now() >>> 0);
const rng = makeRng(a.flag('--rng') ?? 'xoshiro', seed);

/** Gauge-fix an ambient config into the model frame (pin1 → (0,0), pin2 → (1,0); z scaled
 *  by the same factor) and read its θ coordinates — the in-model representative. */
function gaugeFixTheta(p) {
  const a1 = 1, a2 = 4;                             // DS pins: v1 → origin, v4 → (1,0)
  const Ax = p[3 * a1], Ay = p[3 * a1 + 1];
  const dx = p[3 * a2] - Ax, dy = p[3 * a2 + 1] - Ay;
  const L = Math.hypot(dx, dy), s = 1 / L, c = dx / L, sn = dy / L;
  const q = new Float64Array(triang.vertexCount * 3);
  for (let v = 0; v < triang.vertexCount; v++) {
    const X = p[3 * v] - Ax, Y = p[3 * v + 1] - Ay;
    q[3 * v] = s * (c * X + sn * Y);
    q[3 * v + 1] = s * (-sn * X + c * Y);
    q[3 * v + 2] = s * p[3 * v + 2];
  }
  const theta = new Float64Array(space.dim);
  space.coords(q, theta);
  return theta;
}

const mode = a.flag('--seed-mode') ?? 'ds';
const sMin = a.num('--sigma-min', 0.01), sMax = a.num('--sigma-max', 0.30);
const sigma = (a.flag('--sigma-dist') ?? 'log') === 'uniform' ? uniformSigma(sMin, sMax, rng) : logSigma(sMin, sMax, rng);
const drawSeed = mode === 'cold'
  ? uniformSeeds(space.dim, a.num('--seed-size', 1.0), rng)
  : perturbedSeeds(gaugeFixTheta(doyleSchwartzPositions(a.num('--ds-x', 0.35), a.num('--ds-y', 1.30))), sigma, rng);

const energy = (a.flag('--energy') ?? 'cutoff') === 'chord2' ? makeChordLengthSquared(triang) : makeCutOffArea(triang);
const attempt = discover(triang, {
  space,
  energy,
  angleTol: a.num('--angle-tol', 1e-10),
  stepSize: a.num('--step-size', 0.001),
  maxFlowIters: a.num('--max-flow-iters', 500),
});

const out = resolve(a.flag('--out') ?? `samples/discover-ds-${Date.now()}.csv`);
mkdirSync(dirname(out), { recursive: true });

const reportMs = a.num('--report-secs', 10) * 1000;
const start = Date.now();
let lastReport = start;
let accepted = 0;
const amb = new Float64Array(space.ambient);

console.log(`discover-ds  type ${triang.id}  energy ${energy.label}  seed-mode ${mode}  rng-seed ${seed}  dim ${space.dim}`);
console.log(`  → ${out}`);

process.on('SIGINT', () => { console.log('\n— interrupted —'); process.exit(0); });

const stats = collect(drawSeed, attempt, {
  maxTries: a.num('--max-tries', Infinity),
  maxAccepts: a.num('--max-accepts', 100),
  onAccept: (m, theta) => {
    space.push(theta, amb);                         // θ → ambient positions for the CSV
    appendFileSync(out, csvRow(amb) + '\n');
    console.log(`  + #${String(++accepted).padStart(4)}`
      + `  Im τ̂=${m.tauHat[1].toFixed(4)}  |Re τ̂|=${Math.abs(m.tauHat[0]).toFixed(4)}  clearance=${m.clearance.toFixed(4)}`);
  },
  onTry: (_acc, _p, s) => {
    if (Date.now() - lastReport > reportMs) {
      const el = ((Date.now() - start) / 1000).toFixed(0);
      const rate = s.tries ? (100 * s.accepts / s.tries).toFixed(1) : '0';
      console.log(`  [${el}s] tries=${s.tries}  accepts=${s.accepts} (${rate}%)`);
      lastReport = Date.now();
    }
  },
});

console.log(`— done — ${stats.accepts} accepts / ${stats.tries} tries → ${out}`);
