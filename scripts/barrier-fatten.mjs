/**
 * Post-process: fatten flat+embedded tori with the cell-BARRIER energy.
 *
 * Distinct from fatten.mjs (which uses the finite hinge + cutOffArea anneal).
 * Here the single energy is a log-barrier on the cell gaps (cellBarrier.ts):
 * it is active throughout the embedded interior and → +∞ as any watched gap
 * → 0, so it both keeps the surface embedded and pushes its gaps open. No
 * separate intersection term, no λ-anneal, no embedding guard needed — the
 * barrier self-stabilizes at a fattened, embedded fixed point.
 *
 * The barrier gradient is stiff near contact, so we step along the UNIT
 * gradient (normalizeGradient) — stepSize is then a fixed displacement/step.
 *
 * Usage:
 *   npm run barrier -- [options]
 *
 * Options:
 *   --in PATH        Dir or .csv (default: the canonical curated file)
 *   --out PATH       Output CSV (default: samples/barrier-<δ>-<μ>-<stamp>.csv)
 *   --delta N        Barrier cutoff radius, units of √area (default: 0.1)
 *   --strength N     Barrier strength μ (default: 1)
 *   --step-size N    Displacement per step along unit gradient (default: 0.002)
 *   --max-iters N    Flow iteration cap per sample (default: 3000)
 *   --angle-tol N    Flatness re-check tolerance (default: 1e-9)
 *   --guard          Also hard-guard embedding (insurance vs numeric overshoot)
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';

import { RICH } from '../src/tori/index.ts';
import { newtonFlatten } from '../src/math/newton.ts';
import { embeddedFlow } from '../src/math/embeddedFlow.ts';
import { isEmbedded } from '../src/math/embedded.ts';
import { maxConeDeficit } from '../src/math/angles.ts';
import { minMargin, linearSize } from '../src/math/energies/cellMargin.ts';
import { makeCellBarrier } from '../src/math/energies/cellBarrier.ts';

const DIM = RICH.vertexCount * 3;

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1]; };
const num = (v, d) => (v === undefined ? d : Number(v));

const inPath = resolve(flag('--in') ?? 'demos/flat-samples/samples/flat-1780155692970-000.csv');
const delta = num(flag('--delta'), 0.1);
const strength = num(flag('--strength'), 1);
const stepSize = num(flag('--step-size'), 0.002);
const maxIters = num(flag('--max-iters'), 3000);
const angleTol = num(flag('--angle-tol'), 1e-9);
const guard = args.includes('--guard');
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const outPath = resolve(flag('--out') ?? `samples/barrier-d${delta}-m${strength}-${stamp}.csv`);

const energy = makeCellBarrier(RICH, { delta, strength });

function readRows(p) {
  const files = statSync(p).isDirectory()
    ? readdirSync(p).filter((n) => n.endsWith('.csv')).sort().map((n) => join(p, n))
    : [p];
  const rows = [];
  for (const f of files) {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const s = line.trim();
      if (!s) continue;
      const nums = s.split(',').map(Number);
      if (nums.length !== DIM) throw new Error(`${f}: expected ${DIM} floats, got ${nums.length}`);
      rows.push(Float64Array.from(nums));
    }
  }
  return rows;
}

if (!existsSync(inPath)) { console.error(`input not found: ${inPath}`); process.exit(1); }
const samples = readRows(inPath);

console.log('barrier-fatten');
console.log(`  in:        ${inPath}  (${samples.length} samples)`);
console.log(`  energy:    ${energy.label}`);
console.log(`  flow:      unit-grad step ${stepSize}, max ${maxIters} iters/sample, guard ${guard ? 'ON' : 'off'}`);
console.log(`  out:       ${outPath}`);
console.log();
console.log('  #  margin: before→after (×)    binding(after)  emb?  flatResid  flow');
console.log('  ' + '-'.repeat(82));

const fattened = [];
let nEmbedded = 0, nFatter = 0;
for (let i = 0; i < samples.length; i++) {
  const p = samples[i];

  // Normalize to √area = 1 so δ is in the same units across samples.
  const s = 1 / linearSize(RICH, p);
  for (let k = 0; k < DIM; k++) p[k] *= s;
  newtonFlatten(RICH, p, { tolerance: 1e-12 });

  const m0 = minMargin(RICH, p).margin;

  const fr = embeddedFlow(RICH, p, energy, {
    stepSize,
    energyTol: -Infinity,   // never "converge" on energy; run to stall or max-iters
    gradientTol: 1e-9,
    maxIters,
    normalizeGradient: true,
    newtonOpts: { tolerance: 1e-12 },
    feasible: guard ? (q) => isEmbedded(RICH, q) : undefined,
  });

  const after = minMargin(RICH, p);
  const m1 = after.margin;
  const flatResid = maxConeDeficit(RICH, p);
  const embAfter = isEmbedded(RICH, p);
  const flatOk = flatResid < angleTol;
  const ratio = m0 > 0 ? m1 / m0 : Infinity;
  const fatter = embAfter && flatOk && m1 > 0.002;
  if (embAfter && flatOk) nEmbedded++;
  if (fatter) nFatter++;

  const f = (x) => x.toFixed(4);
  console.log(
    `  ${String(i).padStart(2)}  `
    + `${f(m0)}→${f(m1)} (×${ratio.toFixed(1).padStart(6)})  `
    + `${(after.type + ' ' + after.cells.join(',')).padEnd(12)}  `
    + `${embAfter ? 'yes' : 'NO '}   `
    + `${flatResid.toExponential(1)}  `
    + `${fr.status}(${fr.iters})`,
  );

  let row = p[0].toString();
  for (let k = 1; k < DIM; k++) row += ',' + p[k].toString();
  fattened.push(row);
}

const outDir = dirname(outPath);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, fattened.join('\n') + '\n');
console.log();
console.log(`  summary: ${nEmbedded}/${samples.length} embedded+flat, ${nFatter} genuinely fatter (margin > 0.002)`);
console.log(`wrote ${fattened.length} samples → ${outPath}`);
