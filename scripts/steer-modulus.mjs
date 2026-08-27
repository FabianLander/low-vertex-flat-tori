/**
 * steer-modulus — steer a POOL of flat embedded tori toward a target Teichmüller modulus τ₀ by the
 * plain `steerModulus` routine (fatten-interleaved geodesic continuation, gated — NO walk escape).
 * A thin runner: args + IO only. Reports per seed whether it REACHED τ₀ or PINCHED, and where.
 *
 *   npm run steer-modulus -- --pool data/flat-embedded/type-3.csv --type 3 --to hex
 *
 *   --pool PATH        seed CSV (each row's LAST 24 numbers are the config; a leading id col is OK)
 *   --type N           triangulation 1-7 (default 7 = Rich)
 *   --to NAME          target modulus: 'hex' (default) | 'i' (square) | explicit via --re/--im
 *   --re / --im N      explicit target τ₀ (overrides --to)
 *   --max-rounds N     fatten+march rounds cap (default 60)
 *   --trace            print τ + dist(→τ₀) each round
 *   --out PATH         CSV out for reached tori (default samples/steer-<ts>.csv)
 */

import { readFileSync, appendFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { makeArgs, csvRow } from './lib/cli.mjs';
import { byId } from '@core/triangulations/index.ts';
import { HEXAGONAL, SQUARE } from '@core/moduli/reduce.ts';
import { modulus } from '@core/moduli/modulus.ts';
import { collect } from '@core/search/collect.ts';
import { steerModulus } from '@core/search/steer-modulus.ts';

const a = makeArgs(process.argv);
const triang = byId('v8-' + a.num('--type', 7));
const to = a.flag('--to') ?? 'hex';
const target = a.has('--re') || a.has('--im')
  ? [a.num('--re', 0), a.num('--im', 1)]
  : (to === 'i' ? SQUARE : HEXAGONAL);
const dTo = (t) => Math.hypot(t[0] - target[0], t[1] - target[1]);

const poolPath = a.flag('--pool');
if (!poolPath) { console.error('steer-modulus: --pool PATH is required'); process.exit(1); }
const pool = readFileSync(resolve(poolPath), 'utf8').trim().split('\n').filter(Boolean)
  .map((l) => { const v = l.split(',').map(Number); return Float64Array.from(v.slice(v.length - 24)); });

const trace = a.has('--trace');
// steerModulus returns Measurement|null (null = pinched); capture the last τ via onRound so we can
// report WHERE a pinched seed stopped, not just that it failed.
let lastTau = null;
const attempt = steerModulus(triang, target, {
  maxRounds: a.num('--max-rounds', 60),
  onRound: (tau, round) => {
    lastTau = tau;
    if (trace) console.log(`    r${String(round).padStart(3)}  τ=[${tau[0].toFixed(4)}, ${tau[1].toFixed(4)}]  dist=${dTo(tau).toExponential(3)}`);
  },
});

const out = resolve(a.flag('--out') ?? `samples/steer-${Date.now()}.csv`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, '');

let idx = 0;
const drawSeed = () => (idx < pool.length ? pool[idx++].slice() : null);

let reached = 0, pinched = 0;
console.log(`steer-modulus  type ${triang.id}  → τ₀=[${target[0].toFixed(4)}, ${target[1].toFixed(4)}]  pool ${pool.length}`);
console.log(`  → ${out}`);

collect(drawSeed, (seed) => {
  const start = dTo(modulus(triang, seed).tau);
  lastTau = null;
  const m = attempt(seed);   // Measurement (reached) or null (pinched)
  const endTau = m ? m.tau : (lastTau ?? modulus(triang, seed).tau);
  if (m) reached++; else pinched++;
  const tag = m ? 'REACHED' : 'pinch  ';
  console.log(`  ${tag}  start=${start.toFixed(3)}  →  τ=[${endTau[0].toFixed(4)}, ${endTau[1].toFixed(4)}]  dist=${dTo(endTau).toExponential(2)}`
    + (m ? `  clr=${m.clearance.toExponential(2)}` : ''));
  if (m) appendFileSync(out, csvRow(seed) + '\n');
  return m;   // non-null accepts (reached) for collect's stats
}, {});

console.log(`— done — ${reached} reached, ${pinched} pinched / ${pool.length} seeds → ${out}`);
