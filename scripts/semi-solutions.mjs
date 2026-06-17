/**
 * semi-solutions — scan the Doyle–Schwartz semi-solution family on the new stack.
 *
 *   DS seed (random modulus) + tent-pole perturbation
 *     → project(pinCoords(baseZ), [flat, collinear(1,2,3), collinear(4,5,6)])
 *     → certify (record τ; embeddedness recorded, not required — "semi")
 *
 * Writes accepted flat semi-solutions as 24-float CSV rows and logs each τ̂. Filter
 * the output by Re τ̂ afterward to fish out rectangular (0) / rhombic (½) tori.
 * Thin runner — search logic is in src/search/semiSolution.ts.
 *
 * Usage:  npm run semi-solutions -- [options]
 *   --seed N            RNG seed (default: clock)     --rng NAME  xoshiro|mulberry
 *   --sigma-min/max N   tent-pole perturbation σ (default 0 .. 0.1; 0 = symmetric DS)
 *   --y-min/max N       modulus seed y range (default 0.7 .. 1.5)
 *   --angle-tol N       accept max|2π−θ| (default 1e-10)
 *   --max-tries N (∞)   --max-accepts N (default 200)
 *   --out PATH          CSV out (default samples/semi-<ts>.csv)
 *   --report-secs N     progress interval (default 10)
 */

import { appendFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { makeArgs, csvRow } from './lib/cli.mjs';
import { byId } from '../src/triangulations/index.ts';
import { makeRng } from '../src/sampling/rng.ts';
import { collect } from '../src/search/collect.ts';
import { semiSolutionAttempt, doyleSchwartzTentSeeds } from '../src/search/semiSolution.ts';

const a = makeArgs(process.argv);
const triang = byId(7); // the DS construction is the degree-6-regular #7 torus
const seed = a.num('--seed', Date.now() >>> 0);
const rng = makeRng(a.flag('--rng') ?? 'xoshiro', seed);

const drawSeed = doyleSchwartzTentSeeds(rng, {
  sigmaMin: a.num('--sigma-min', 0),
  sigmaMax: a.num('--sigma-max', 0.1),
  yMin: a.num('--y-min', 0.7),
  yMax: a.num('--y-max', 1.5),
});
const attempt = semiSolutionAttempt(triang, { angleTol: a.num('--angle-tol', 1e-10) });

const out = resolve(a.flag('--out') ?? `samples/semi-${Date.now()}.csv`);
mkdirSync(dirname(out), { recursive: true });

const reportMs = a.num('--report-secs', 10) * 1000;
const start = Date.now();
let lastReport = start;
let accepted = 0;

console.log(`semi-solutions  type #${triang.id}  σ∈[${a.num('--sigma-min', 0)}, ${a.num('--sigma-max', 0.1)}]  rng-seed ${seed}`);
console.log(`  → ${out}`);
process.on('SIGINT', () => { console.log('\n— interrupted —'); process.exit(0); });

const stats = collect(drawSeed, attempt, {
  maxTries: a.num('--max-tries', Infinity),
  maxAccepts: a.num('--max-accepts', 200),
  onAccept: (cert, p) => {
    appendFileSync(out, csvRow(p) + '\n');
    const emb = cert.embedded ? 'embedded' : 'immersed';
    console.log(`  + #${String(++accepted).padStart(4)}  τ̂=${cert.tauHat[0].toFixed(4)}${cert.tauHat[1] >= 0 ? '+' : ''}${cert.tauHat[1].toFixed(4)}i  ${emb}`);
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
