/**
 * discover-at — search the FIBER at a prescribed modulus τ₀ for a flat EMBEDDED torus: flow many
 * seeds toward embeddedness holding [flat ∧ τ = τ₀], keep only what `isEmbedded` truly accepts.
 * The modulus-pinned twin of `discover`. Thin runner over src/core/search/discover-at.ts.
 *
 *   npm run discover-at -- --type 7 --to hex --pool samples/near-rho-seed.csv --max-accepts 5
 *
 *   --type N            triangulation 1-7 (default 7 = Rich)
 *   --to NAME           target modulus: 'hex' (default) | 'i' (square) | explicit via --re/--im
 *   --re / --im N       explicit target τ₀ (overrides --to)
 *   --pool PATH         warm seeds: perturb rows of this CSV (each row's LAST 24 nums are a config).
 *                       Omitted → cold uniform seeds (half-extent --seed-size).
 *   --sigma-min/max N   perturbation σ range (default 0.02 .. 0.25)
 *   --seed-size N       cold uniform half-extent (default 1.0)
 *   --energy NAME       'cutoff' (default) | 'chord2'  (force only — acceptance is isEmbedded)
 *   --step-size N       flow step (default 0.001)
 *   --max-flow-iters N  flow cap per attempt (default 2000)
 *   --seed N            RNG seed (default: clock)
 *   --max-tries N       (default ∞)   --max-accepts N  (default 20)
 *   --out PATH          CSV out (default samples/discover-at-<ts>.csv)
 *   --report-secs N     progress interval (default 10)
 */

import { readFileSync, appendFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { makeArgs, csvRow } from './lib/cli.mjs';
import { byId } from '@core/triangulations/index.ts';
import { HEXAGONAL, SQUARE } from '@core/moduli/reduce.ts';
import { makeRng } from '@core/sampling/rng.ts';
import { collect } from '@core/search/collect.ts';
import { discoverAt } from '@core/search/discover-at.ts';
import { perturbedSeeds, poolSeeds, uniformSeeds, logSigma } from '@core/sampling/seeds.ts';
import { makeCutOffArea, makeChordLengthSquared } from '@core/embedding/index.ts';

const a = makeArgs(process.argv);
const triang = byId('v8-' + a.num('--type', 7));
const N = triang.vertexCount * 3;
const seed = a.num('--seed', Date.now() >>> 0);
const rng = makeRng('xoshiro', seed);

const to = a.flag('--to') ?? 'hex';
const target = a.has('--re') || a.has('--im')
  ? [a.num('--re', 0), a.num('--im', 1)]
  : (to === 'i' ? SQUARE : HEXAGONAL);
const dTo = (t) => Math.hypot(t[0] - target[0], t[1] - target[1]);

// seed source: warm (perturb a pool) if --pool, else cold uniform.
const sMin = a.num('--sigma-min', 0.02), sMax = a.num('--sigma-max', 0.25);
const sigma = logSigma(sMin, sMax, rng);
const poolPath = a.flag('--pool');
let drawSeed;
if (poolPath) {
  // positions are the FIRST 24 cols (plain 24, or Fabi's 28 = 24 pos + 4 meta); hex-hunt's 25 = id + 24.
  const cols = (v) => v.length === 25 ? v.slice(1) : v.slice(0, 24);
  const pool = readFileSync(resolve(poolPath), 'utf8').trim().split('\n').filter(Boolean)
    .map((l) => Float64Array.from(cols(l.split(',').map(Number))));
  drawSeed = poolSeeds(pool, sigma, rng);
  console.log(`  seeds: perturb ${pool.length} pool rows (σ ${sMin}..${sMax})`);
} else {
  drawSeed = uniformSeeds(N, a.num('--seed-size', 1.0), rng);
  console.log(`  seeds: cold uniform (half-extent ${a.num('--seed-size', 1.0)})`);
}

const energy = (a.flag('--energy') ?? 'cutoff') === 'chord2' ? makeChordLengthSquared(triang) : makeCutOffArea(triang);
const attempt = discoverAt(triang, target, {
  energy,
  angleTol: a.num('--angle-tol', 1e-10),
  stepSize: a.num('--step-size', 0.001),
  maxFlowIters: a.num('--max-flow-iters', 2000),
});

const out = resolve(a.flag('--out') ?? `samples/discover-at-${Date.now()}.csv`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, '');

const reportMs = a.num('--report-secs', 10) * 1000;
const start = Date.now();
let lastReport = start, accepted = 0;
console.log(`discover-at  type ${triang.id}  → τ₀=[${target[0].toFixed(4)}, ${target[1].toFixed(4)}]  energy ${energy.label}`);
console.log(`  → ${out}`);
process.on('SIGINT', () => { console.log('\n— interrupted —'); process.exit(0); });

const stats = collect(drawSeed, attempt, {
  maxTries: a.num('--max-tries', Infinity),
  maxAccepts: a.num('--max-accepts', 20),
  onAccept: (m, p) => {
    appendFileSync(out, csvRow(p) + '\n');
    console.log(`  + #${String(++accepted).padStart(3)}  EMBEDDED at τ₀`
      + `  clearance=${m.clearance.toExponential(2)}  dist(τ→τ₀)=${dTo(m.tau).toExponential(1)}`);
  },
  onTry: (_acc, _p, s) => {
    if (Date.now() - lastReport > reportMs) {
      const el = ((Date.now() - start) / 1000).toFixed(0);
      const rate = s.tries ? (100 * s.accepts / s.tries).toFixed(2) : '0';
      console.log(`  [${el}s] tries=${s.tries}  accepts=${s.accepts} (${rate}%)`);
      lastReport = Date.now();
    }
  },
});

console.log(`— done — ${stats.accepts} embedded / ${stats.tries} tries → ${out}`);
