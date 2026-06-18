/**
 * discover — find flat embedded 8-vertex tori, on the new search stack.
 *
 *   seed → project([flat]) → flow([flat], energy, region = embedded) → certify
 *
 * A thin runner: it wires a seed source + the `discoverAttempt` recipe into the
 * `collect` driver and writes each accepted torus as a 24-float CSV row. All the
 * search logic is in src/search/; this file is just args + IO.
 *
 * Usage:  npm run discover -- [options]
 *   --type N            triangulation 1-7 (default 7 = Rich)
 *   --seed N            RNG seed (default: clock)
 *   --rng NAME          'xoshiro' (default) | 'mulberry'
 *   --seed-mode NAME    'rich' (perturb Rich; default) | 'uniform'
 *   --seed-size N       uniform mode half-extent (default 1.0)
 *   --sigma-dist NAME   'log' (default) | 'uniform'
 *   --sigma-min/max N   perturbation σ range (default 0.005 .. 0.15)
 *   --energy NAME       'cutoff' (default) | 'chord2'
 *   --step-size N       flow step (default 0.001)
 *   --max-flow-iters N  flow cap per attempt (default 500)
 *   --angle-tol N       accept: max|2π−θ| (default 1e-10)
 *   --max-tries N       (default ∞)   --max-accepts N  (default 100)
 *   --out PATH          CSV out (default samples/discover-<ts>.csv)
 *   --report-secs N     progress interval (default 10)
 */

import { appendFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { makeArgs, csvRow } from './lib/cli.mjs';
import { byId } from '../src/triangulations/index.ts';
import { RICH_REFERENCE } from '../src/sampling/reference.ts';
import { makeRng } from '../src/sampling/rng.ts';
import { collect } from '../src/search/collect.ts';
import { discoverAttempt } from '../src/search/discover.ts';
import { perturbedSeeds, uniformSeeds, uniformSigma, logSigma } from '../src/sampling/seeds.ts';
import { makeCutOffArea } from '../src/embedding/index.ts';
import { makeChordLengthSquared } from '../src/embedding/index.ts';

const a = makeArgs(process.argv);
const triang = byId(a.num('--type', 7));
const N = triang.vertexCount * 3;
const seed = a.num('--seed', Date.now() >>> 0);
const rng = makeRng(a.flag('--rng') ?? 'xoshiro', seed);

const mode = a.flag('--seed-mode') ?? 'rich';
if (mode === 'rich' && triang.id !== 7) { console.error('--seed-mode rich needs Rich (#7); use --seed-mode uniform'); process.exit(1); }
const sMin = a.num('--sigma-min', 0.005), sMax = a.num('--sigma-max', 0.15);
const sigma = (a.flag('--sigma-dist') ?? 'log') === 'uniform' ? uniformSigma(sMin, sMax, rng) : logSigma(sMin, sMax, rng);
const drawSeed = mode === 'uniform'
  ? uniformSeeds(N, a.num('--seed-size', 1.0), rng)
  : perturbedSeeds(RICH_REFERENCE.positions, sigma, rng);

const energy = (a.flag('--energy') ?? 'cutoff') === 'chord2' ? makeChordLengthSquared(triang) : makeCutOffArea(triang);
const attempt = discoverAttempt(triang, {
  energy,
  angleTol: a.num('--angle-tol', 1e-10),
  stepSize: a.num('--step-size', 0.001),
  maxFlowIters: a.num('--max-flow-iters', 500),
});

const out = resolve(a.flag('--out') ?? `samples/discover-${Date.now()}.csv`);
mkdirSync(dirname(out), { recursive: true });

const reportMs = a.num('--report-secs', 10) * 1000;
const start = Date.now();
let lastReport = start;
let accepted = 0;

console.log(`discover  type #${triang.id}  energy ${energy.label}  seed-mode ${mode}  rng-seed ${seed}`);
console.log(`  → ${out}`);

process.on('SIGINT', () => { console.log('\n— interrupted —'); process.exit(0); });

const stats = collect(drawSeed, attempt, {
  maxTries: a.num('--max-tries', Infinity),
  maxAccepts: a.num('--max-accepts', 100),
  onAccept: (cert, p) => {
    appendFileSync(out, csvRow(p) + '\n');
    console.log(`  + #${String(++accepted).padStart(4)}`
      + `  Im τ̂=${cert.tauHat[1].toFixed(4)}  |Re τ̂|=${Math.abs(cert.tauHat[0]).toFixed(4)}  margin=${cert.margin.toFixed(4)}`);
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
