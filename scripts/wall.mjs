/**
 * wall — find flat embedded tori on a modulus wall |Re τ̂| = c (rectangular c = 0,
 * rhombic c = ½), on the new search stack.
 *
 *   seed → project([flat, modulusWall(seed, c)]) → flow([flat, wall], energy, embedded) → certify
 *
 * Walks a pool of near-wall tori: perturb a pool member, re-project onto flat ∧
 * the wall (chart frozen at the seed) and flow to embedded along it; accepts feed
 * the pool so the walk slides along the wall, sweeping out the Im τ̂ range. Thin
 * runner — search logic is in src/search/.
 *
 * Seeds: --seed-file PATH (CSV of near-wall tori) if given, else perturb Rich.
 *
 * Usage:  npm run wall -- [options]
 *   --type N          triangulation 1-7 (default 7)
 *   --c N             wall: |Re τ̂| = c (default 0 = rectangular; 0.5 = rhombic)
 *   --seed N          RNG seed       --rng NAME  xoshiro|mulberry
 *   --seed-file PATH  pool CSV (default: perturb Rich)
 *   --sigma-min/max N perturbation σ (default 0.005 .. 0.08)
 *   --energy NAME     cutoff (default) | chord2
 *   --angle-tol N     accept max|2π−θ| (default 1e-10)
 *   --re-tol N        accept ||Re τ̂|−c| (default 1e-9)
 *   --max-tries N (∞)   --max-accepts N (default 100)
 *   --out PATH        CSV out (default samples/wall-<ts>.csv)
 *   --no-feedback     don't add accepts back into the pool
 *   --report-secs N   progress interval (default 10)
 */

import { appendFileSync, mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { makeArgs, csvRow, readCsv } from './lib/cli.mjs';
import { byId } from '@core/triangulations/index.ts';
import { RICH_REFERENCE } from '@core/sampling/reference.ts';
import { makeRng } from '@core/sampling/rng.ts';
import { collect } from '@core/search/collect.ts';
import { wallAttempt } from '@core/search/wall.ts';
import { poolSeeds, logSigma } from '@core/sampling/seeds.ts';
import { makeCutOffArea } from '@core/embedding/index.ts';
import { makeChordLengthSquared } from '@core/embedding/index.ts';

const a = makeArgs(process.argv);
const triang = byId('v8-' + a.num('--type', 7));
const N = triang.vertexCount * 3;
const c = a.num('--c', 0);
const seed = a.num('--seed', Date.now() >>> 0);
const rng = makeRng(a.flag('--rng') ?? 'xoshiro', seed);

// Pool of near-wall seeds: a CSV if given, else a single-member pool of Rich.
const seedFile = a.flag('--seed-file');
const pool = seedFile
  ? readCsv(readFileSync(resolve(seedFile), 'utf8'), N)
  : [Float64Array.from(RICH_REFERENCE.positions)];
if (pool.length === 0) { console.error(`empty pool: ${seedFile}`); process.exit(1); }

const sigma = logSigma(a.num('--sigma-min', 0.005), a.num('--sigma-max', 0.08), rng);
const drawSeed = poolSeeds(pool, sigma, rng);

const energy = (a.flag('--energy') ?? 'cutoff') === 'chord2' ? makeChordLengthSquared(triang) : makeCutOffArea(triang);
const attempt = wallAttempt(triang, {
  c,
  energy,
  angleTol: a.num('--angle-tol', 1e-10),
  reTol: a.num('--re-tol', 1e-9),
  stepSize: a.num('--step-size', 0.001),
  maxFlowIters: a.num('--max-flow-iters', 500),
});

const out = resolve(a.flag('--out') ?? `samples/wall-${Date.now()}.csv`);
mkdirSync(dirname(out), { recursive: true });
const feedback = !a.has('--no-feedback');

const reportMs = a.num('--report-secs', 10) * 1000;
const start = Date.now();
let lastReport = start;
let accepted = 0;

console.log(`wall  type #${triang.id}  |Re τ̂|=${c}  energy ${energy.label}  pool ${pool.length}  rng-seed ${seed}`);
console.log(`  → ${out}${feedback ? '  [feedback]' : ''}`);
process.on('SIGINT', () => { console.log('\n— interrupted —'); process.exit(0); });

const stats = collect(drawSeed, attempt, {
  maxTries: a.num('--max-tries', Infinity),
  maxAccepts: a.num('--max-accepts', 100),
  onAccept: (cert, p) => {
    appendFileSync(out, csvRow(p) + '\n');
    if (feedback) pool.push(Float64Array.from(p));
    console.log(`  + #${String(++accepted).padStart(4)}  Im τ̂=${cert.tauHat[1].toFixed(4)}  `
      + `Re τ̂=${cert.tauHat[0].toFixed(6)}  margin=${cert.margin.toFixed(4)}`);
  },
  onTry: (_acc, _p, s) => {
    if (Date.now() - lastReport > reportMs) {
      const el = ((Date.now() - start) / 1000).toFixed(0);
      const rate = s.tries ? (100 * s.accepts / s.tries).toFixed(1) : '0';
      console.log(`  [${el}s] tries=${s.tries}  accepts=${s.accepts} (${rate}%)  pool=${pool.length}`);
      lastReport = Date.now();
    }
  },
});

console.log(`— done — ${stats.accepts} accepts / ${stats.tries} tries → ${out}`);
