/**
 * march-modulus — transport flat embedded tori onto a modulus wall |Re τ̂| = c by
 * continuation, mapping where the embedded path pinches.
 *
 *   perturbed-Rich seed → project([flat]) → flow to embedded
 *     → march |Re τ̂| onto the wall (re-freeze + gate embedded each step) → certify
 *
 * Logs each outcome: `reached` (a flat embedded torus on the wall) or `blocked`
 * (pinched short, at the boundary |Re τ̂|). Thin runner — logic in
 * src/search/marchModulus.ts; see docs/math/searches.md.
 *
 * Usage:  npm run march-modulus -- [options]
 *   --c N             target wall |Re τ̂| (default 0 = rectangular; 0.5 = rhombic)
 *   --seed N          RNG seed     --rng NAME  xoshiro|mulberry
 *   --sigma-min/max N seed perturbation σ (default 0.02 .. 0.12)
 *   --energy NAME     cutoff (default) | chord2
 *   --fatten EPS      fatten the start to margin EPS (cell-margin energy) before
 *                       marching, so it has room to move (off by default)
 *   --max-tries N (∞)   --max-accepts N (default 50)
 *   --out PATH        CSV out for tori that REACHED the wall (default samples/march-<ts>.csv)
 *   --report-secs N   progress interval (default 10)
 */

import { appendFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { makeArgs, csvRow } from './lib/cli.mjs';
import { byId } from '../src/triangulations/index.ts';
import { RICH_REFERENCE } from '../src/sampling/reference.ts';
import { makeRng } from '../src/sampling/rng.ts';
import { collect } from '../src/search/collect.ts';
import { marchToWallAttempt } from '../src/search/marchModulus.ts';
import { perturbedSeeds, logSigma } from '../src/sampling/seeds.ts';
import { makeCutOffArea } from '../src/conditions/embedded/index.ts';
import { makeChordLengthSquared } from '../src/conditions/embedded/index.ts';
import { makeCellMargin } from '../src/conditions/embedded/index.ts';

const a = makeArgs(process.argv);
const triang = byId(7);
const c = a.num('--c', 0);
const seed = a.num('--seed', Date.now() >>> 0);
const rng = makeRng(a.flag('--rng') ?? 'xoshiro', seed);

const sigma = logSigma(a.num('--sigma-min', 0.02), a.num('--sigma-max', 0.12), rng);
const drawSeed = perturbedSeeds(RICH_REFERENCE.positions, sigma, rng);
const energy = (a.flag('--energy') ?? 'cutoff') === 'chord2' ? makeChordLengthSquared(triang) : makeCutOffArea(triang);
// --fatten ε: push the start to margin ε before marching, so it has room to move.
const fatten = a.flag('--fatten');
const fattenEnergy = fatten !== undefined ? makeCellMargin(triang, { epsilon: Number(fatten) }) : undefined;
const attempt = marchToWallAttempt(triang, { c, energy, fattenEnergy, angleTol: a.num('--angle-tol', 1e-10) });

const out = resolve(a.flag('--out') ?? `samples/march-${Date.now()}.csv`);
mkdirSync(dirname(out), { recursive: true });

const reportMs = a.num('--report-secs', 10) * 1000;
const start = Date.now();
let lastReport = start;
let reached = 0, blocked = 0;

console.log(`march-modulus  type #${triang.id}  → wall |Re τ̂|=${c}  energy ${energy.label}  rng-seed ${seed}`);
console.log(`  → ${out} (tori that reached the wall)`);
process.on('SIGINT', () => { console.log('\n— interrupted —'); process.exit(0); });

const stats = collect(drawSeed, attempt, {
  maxTries: a.num('--max-tries', Infinity),
  maxAccepts: a.num('--max-accepts', 50),
  onAccept: (o, p) => {
    const im = o.cert.tauHat[1].toFixed(4);
    if (o.status === 'reached') {
      reached++;
      appendFileSync(out, csvRow(p) + '\n');
      console.log(`  ✓ reached  |Re τ̂|=${o.reached.toFixed(6)}  Im τ̂=${im}  ${o.cert.embedded ? 'embedded' : 'IMMERSED'}`);
    } else {
      blocked++;
      console.log(`  · ${o.status.padEnd(9)} pinched at |Re τ̂|=${o.reached.toFixed(4)}  Im τ̂=${im}`);
    }
  },
  onTry: (_acc, _p, s) => {
    if (Date.now() - lastReport > reportMs) {
      const el = ((Date.now() - start) / 1000).toFixed(0);
      console.log(`  [${el}s] tries=${s.tries}  reached=${reached}  blocked=${blocked}`);
      lastReport = Date.now();
    }
  },
});

console.log(`— done — ${reached} reached / ${blocked} blocked / ${stats.tries} tries → ${out}`);
