/**
 * walk-fatten — steer a POOL of flat embedded tori toward a target Teichmüller modulus τ₀, and on
 * a march pinch escape by fattening HARDER (a bigger torus) + an optional fiber-walk spread. A thin
 * runner over src/core/search/walk-fatten.ts: args + IO only.
 *
 *   npm run walk-fatten -- --pool samples/hex-hunt/2026-07-02-1024/frontier-tori.csv --to hex
 *
 *   --pool PATH        seed CSV (each row's LAST 24 numbers are the config; a leading id col is OK)
 *   --type N           triangulation 1-7 (default 7 = Rich)
 *   --to NAME          target modulus: 'hex' (default) | 'i' (square) | explicit via --re/--im
 *   --re / --im N      explicit target τ₀ (overrides --to)
 *   --march-delta N    normal per-round fatten radius (default 0.005)
 *   --escape-deltas L  escalating escape fatten radii, comma-sep (default 0.003,0.006 — reachable)
 *   --escape-iters N   minimize cap during escape fatten (default 600)
 *   --escape-step N    escape fatten step size — small (stiff barrier at ∂Ω) (default 1e-6)
 *   --walk-blob N      fiber-walk shapes to try on a stuck pinch (default 0 = off)
 *   --walk-sigma N     fiber-walk perturbation σ, sweet spot ~1e-3..3e-3 (default 0.002)
 *   --march-min-step N continuation min step per march hop (default 1e-4); shrink to squeeze finer at a wall
 *   --stall-step N     continuation stall threshold (default 1e-7); shrink alongside --march-min-step
 *   --trace            print τ + dist(→τ₀) each round, to watch the march / see where it pinches
 *   --seed N           RNG seed for the walk (default: clock)
 *   --max-rounds N     (default 80)   --max-accepts N  (default ∞)
 *   --out PATH         CSV out (reached + pinched tori; default samples/walk-fatten-<ts>.csv)
 */

import { readFileSync, appendFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { makeArgs, csvRow } from './lib/cli.mjs';
import { byId } from '@core/triangulations/index.ts';
import { HEXAGONAL, SQUARE } from '@core/moduli/reduce.ts';
import { makeRng } from '@core/sampling/rng.ts';
import { collect } from '@core/search/collect.ts';
import { walkFatten } from '@core/search/walk-fatten.ts';

const a = makeArgs(process.argv);
const triang = byId('v8-' + a.num('--type', 7));
const rng = makeRng('xoshiro', a.num('--seed', Date.now() >>> 0));

const to = a.flag('--to') ?? 'hex';
const target = a.has('--re') || a.has('--im')
  ? [a.num('--re', 0), a.num('--im', 1)]
  : (to === 'i' ? SQUARE : HEXAGONAL);

const poolPath = a.flag('--pool');
if (!poolPath) { console.error('walk-fatten: --pool PATH is required'); process.exit(1); }
// each row's LAST 24 numbers are the config (tolerates a leading seedId column).
const pool = readFileSync(resolve(poolPath), 'utf8').trim().split('\n').filter(Boolean)
  .map((l) => { const v = l.split(',').map(Number); return Float64Array.from(v.slice(v.length - 24)); });

const escapeDeltas = (a.flag('--escape-deltas') ?? '0.003,0.006').split(',').map(Number);
const walkBlob = a.num('--walk-blob', 0);
const trace = a.has('--trace');   // print τ + dist each round (watch the march)

const dHex = (t) => Math.hypot(t[0] - target[0], t[1] - target[1]);
const attempt = walkFatten(triang, target, {
  maxRounds: a.num('--max-rounds', 80),
  progressTol: a.num('--progress-tol', 1e-5),   // keep crawling until a round advances τ by less than this
  marchDelta: a.num('--march-delta', 0.005),
  marchIters: a.num('--march-iters', 300),
  escapeDeltas,
  escapeIters: a.num('--escape-iters', 600),
  escapeStep: a.num('--escape-step', 1e-6),
  marchMinStep: a.has('--march-min-step') ? a.num('--march-min-step', 1e-4) : undefined,
  marchStallStep: a.has('--stall-step') ? a.num('--stall-step', 1e-7) : undefined,
  walkBlob,
  walkSigma: a.num('--walk-sigma', 0.002),
  rng,
  onRound: trace
    ? (tau, round, tag) => console.log(`    r${String(round).padStart(3)} ${tag.padEnd(6)} τ=[${tau[0].toFixed(4)}, ${tau[1].toFixed(4)}]  dist=${dHex(tau).toExponential(3)}`)
    : undefined,
});

const out = resolve(a.flag('--out') ?? `samples/walk-fatten-${Date.now()}.csv`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, '');

let i = 0;
const drawSeed = () => (i < pool.length ? pool[i++].slice() : null);

let reached = 0, pinched = 0;
console.log(`walk-fatten  type ${triang.id}  → τ₀=[${target[0].toFixed(4)}, ${target[1].toFixed(4)}]`
  + `  pool ${pool.length}  escape δ=[${escapeDeltas.join(',')}]  walk-blob ${walkBlob}`);
console.log(`  → ${out}`);

const stats = collect(drawSeed, attempt, {
  onAccept: (r, p) => {
    const m = r.measurement;
    if (r.reached) reached++; else pinched++;
    const tag = r.reached ? 'REACHED' : 'pinch  ';
    console.log(`  ${tag}  τ=[${m.tau[0].toFixed(4)}, ${m.tau[1].toFixed(4)}]`
      + `  clr=${m.clearance.toFixed(4)}  rounds=${r.rounds}  escapes=${r.escapes}`
      + (r.reached ? '' : `  dist=${Math.hypot(m.tau[0] - target[0], m.tau[1] - target[1]).toExponential(2)}`));
    // record both reached and pinched tori (the pinch modulus is a result); embedded flat only.
    if (m.embedded && m.coneDeficit < 1e-8) appendFileSync(out, csvRow(p) + '\n');
  },
});

console.log(`— done — ${reached} reached, ${pinched} pinched / ${stats.tries} seeds → ${out}`);
