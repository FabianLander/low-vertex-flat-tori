/**
 * Frontier exploration of moduli space: a novelty-biased random walk on the
 * embedded flat tori, starting from a known seed.
 *
 * Straight-line τ-targeting fails — the embedded set is a thin curved region in
 * ℍ, so aiming at an external point walks straight out of it. Instead we keep
 * the Markov walk (perturb → Newton-flatten → keep only if embedded), but bias
 * acceptance toward τ-cells not yet visited. The cloud then expands to fill the
 * achievable region and stalls at its true boundary.
 *
 * Usage:
 *   npx tsx scripts/explore-moduli.mjs [options]
 *     --in PATH     start tori CSV (default data/explore-from-seeds/seed-1.csv, the biggest)
 *     --row N        start row (default 0)
 *     --steps N      proposals (default 40000)
 *     --sigma N      perturbation magnitude (default 0.03)
 *     --grid N       moduli-cell size for novelty (default 0.04)
 *     --seed N       RNG seed (default 1)
 *     --out PATH     write visited τ as CSV re,im,0 (default demos/moduli/explore.csv)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

import { VERTEX_COUNT } from '../src/math/topology.ts';
import { newtonFlatten } from '../src/math/newton.ts';
import { isEmbedded } from '../src/math/embedded.ts';
import { maxConeDeficit } from '../src/math/angles.ts';
import { modulus } from '../src/math/develop.ts';
import { mulberry32 } from '../src/math/perturb.ts';

const DIM = VERTEX_COUNT * 3;
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i === -1 ? undefined : args[i + 1]; };
const num = (v, d) => (v === undefined ? d : Number(v));

const inPath = resolve(flag('--in') ?? 'data/explore-from-seeds/seed-1.csv');
const row = num(flag('--row'), 0);
const steps = num(flag('--steps'), 40000);
const sigma = num(flag('--sigma'), 0.03);
const grid = num(flag('--grid'), 0.04);
const outPath = resolve(flag('--out') ?? 'demos/moduli/explore.csv');
const rng = mulberry32(num(flag('--seed'), 1) >>> 0);

function gauss() { let u = rng(); if (u < 1e-12) u = 1e-12; return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); }

const lines = readFileSync(inPath, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
const p = Float64Array.from(lines[row].split(',').map(Number));
newtonFlatten(p, { tolerance: 1e-12 });

const cellKey = (t) => `${Math.round(t[0] / grid)},${Math.round(t[1] / grid)}`;
const occupied = new Map();             // cell → representative τ
let tau = modulus(p).tau;
occupied.set(cellKey(tau), [tau[0], tau[1]]);

let reMin = tau[0], reMax = tau[0], imMin = tau[1], imMax = tau[1];
const note = (t) => { reMin = Math.min(reMin, t[0]); reMax = Math.max(reMax, t[0]); imMin = Math.min(imMin, t[1]); imMax = Math.max(imMax, t[1]); };

console.log(`start ${inPath} row ${row}:  τ₀ = ${tau[0].toFixed(4)}+${tau[1].toFixed(4)}i`);
console.log(`novelty walk: ${steps} steps, σ=${sigma}, grid=${grid}\n`);

const q = new Float64Array(DIM);
let embok = 0, accepts = 0;
for (let s = 1; s <= steps; s++) {
  for (let i = 0; i < DIM; i++) q[i] = p[i] + sigma * gauss();
  const nr = newtonFlatten(q, { tolerance: 1e-11 });
  if (nr.status !== 'converged' || maxConeDeficit(q) > 1e-8 || !isEmbedded(q)) continue;
  embok++;
  const t = modulus(q).tau;
  const key = cellKey(t);
  const novel = !occupied.has(key);
  if (novel || rng() < 0.2) {       // explore new cells; sometimes traverse known ones
    p.set(q);
    accepts++;
    if (novel) { occupied.set(key, [t[0], t[1]]); note(t); }
  }
  if (s % 5000 === 0) console.log(`  step ${s}: cells=${occupied.size}  Re∈[${reMin.toFixed(2)},${reMax.toFixed(2)}]  Im∈[${imMin.toFixed(2)},${imMax.toFixed(2)}]  (emb-ok ${(100 * embok / s).toFixed(0)}%, accept ${(100 * accepts / s).toFixed(0)}%)`);
}

console.log(`\nvisited ${occupied.size} moduli cells`);
console.log(`  Re ∈ [${reMin.toFixed(3)}, ${reMax.toFixed(3)}]   Im ∈ [${imMin.toFixed(3)}, ${imMax.toFixed(3)}]`);

if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true });
const out = [...occupied.values()].map(([re, im]) => `${re},${im},0`).join('\n');
writeFileSync(outPath, out + '\n');
console.log(`wrote ${occupied.size} τ → ${outPath}`);
