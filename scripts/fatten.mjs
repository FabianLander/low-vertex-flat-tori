/**
 * Post-process: fatten the margin of already flat + embedded tori.
 *
 * For each sample (a flat, embedded 8-vertex torus) we run the projected
 * gradient flow on the CELL_MARGIN energy — Newton-flatten / margin descent /
 * re-Newton — which pushes non-adjacent cells apart toward a ≥ ε gap WITHOUT
 * leaving the flatness manifold. We then re-verify flatness and embeddedness
 * and report the minimum normalized gap (d/√area) before and after.
 *
 * The scale column √area is reported before/after as a guard: because the
 * energy is scale-free, the surface should fatten by changing SHAPE, not by
 * inflating — so √area should stay essentially constant while min-margin rises.
 *
 * Usage:
 *   npm run fatten -- [options]
 *
 * Options:
 *   --in PATH        Dir or .csv to read (default: demos/flat-samples/samples)
 *   --out PATH       Output CSV (default: samples/fattened-<timestamp>-000.csv)
 *   --epsilon N      Margin target, units of √area (default: 0.1)
 *   --weight N       Per-pair penalty height c (default: 1)
 *   --step-size N    Flow descent step (default: 0.0005)
 *   --max-iters N    Flow iteration cap per sample (default: 4000)
 *   --angle-tol N    Flatness re-check tolerance (default: 1e-9)
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';

import { RICH } from '../src/tori/index.ts';
import { newtonFlatten } from '../src/math/newton.ts';
import { embeddedFlow } from '../src/math/embeddedFlow.ts';
import { isEmbedded, allViolations } from '../src/math/embedded.ts';
import { maxConeDeficit } from '../src/math/angles.ts';
import { makeCellMargin, minMargin, linearSize } from '../src/math/energies/cellMargin.ts';
import { makeCutOffArea } from '../src/math/energies/cutOffArea.ts';
import { makeChordLengthSquared } from '../src/math/energies/chordLengthSquared.ts';
import { weightedSum } from '../src/math/energies/weightedSum.ts';

const DIM = RICH.vertexCount * 3; // 24

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1]; };
const num = (v, d) => (v === undefined ? d : Number(v));

// Default to the single canonical curated file (not the whole dir) so stray
// fattened/viewer copies dropped into the folder don't get picked up.
const inPath = resolve(flag('--in') ?? 'demos/flat-samples/samples/flat-1780155692970-000.csv');
const epsilon = num(flag('--epsilon'), 0.1);
const weight = num(flag('--weight'), 1);
const stepSize = num(flag('--step-size'), 0.0005);
const maxIters = num(flag('--max-iters'), 4000);   // iters for the final base-only cleanup
const angleTol = num(flag('--angle-tol'), 1e-9);
const intersection = flag('--intersection') ?? 'cutoff'; // embedding-keeping base: 'cutoff' | 'chord2'
const lambda0 = num(flag('--lambda'), 0.1);        // starting margin weight
const decay = num(flag('--lambda-decay'), 0.5);    // λ ← λ·decay each round until embedded
const lambdaMin = num(flag('--lambda-min'), 1e-6); // give up annealing below this λ
const roundIters = num(flag('--round-iters'), 800);// flow iters per λ round
const maxRounds = num(flag('--max-rounds'), 40);
const fatThreshold = num(flag('--fat-threshold'), 0.002); // min margin to call a result "fatter"
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const outPath = resolve(flag('--out')
  ?? `samples/fattened-anneal-${intersection}-eps${epsilon}-lam${lambda0}-${stamp}.csv`);

// The annealed objective: embedding-keeping base + λ·cell-margin, with λ shrunk
// each round until the surface re-settles to embedded. Built fresh per λ.
const margin = makeCellMargin(RICH, { epsilon, weight });
const base = intersection === 'chord2' ? makeChordLengthSquared(RICH) : makeCutOffArea(RICH);
const composite = (lam) => weightedSum(`${base.label} + ${lam}·margin`,
  [{ energy: base, weight: 1 }, { energy: margin, weight: lam }]);

// Collect input rows from a dir of CSVs or a single CSV.
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

console.log('fatten (anneal λ until embedded)');
console.log(`  in:        ${inPath}  (${samples.length} samples)`);
console.log(`  base:      ${base.label}    margin: ε=${epsilon}, c=${weight}, L=√area`);
console.log(`  λ:         start ${lambda0}, ×${decay}/round down to ${lambdaMin};  ${roundIters} iters/round, ≤${maxRounds} rounds`);
console.log(`  out:       ${outPath}`);
console.log();
console.log('  #  margin: before→after (×)    binding(after)  emb?  flatResid  λ_term     rnds peak#v  result');
console.log('  ' + '-'.repeat(98));

const fattened = [];
let nEmbedded = 0, nFatter = 0;
for (let i = 0; i < samples.length; i++) {
  const p = samples[i];

  // Normalize to √area = 1 so base (scale-dependent) and margin (scale-free) are comparable.
  const s = 1 / linearSize(RICH, p);
  for (let k = 0; k < DIM; k++) p[k] *= s;
  newtonFlatten(RICH, p, { tolerance: 1e-12 });

  const before = minMargin(RICH, p);
  const m0 = before.margin;

  // Anneal: fatten at λ (allowing slightly-non-embedded excursions), then shrink
  // λ each round until the surface re-settles to embedded + flat. Stop at that λ.
  let lam = lambda0, rounds = 0, peakViol = 0, lamTerm = lam, embeddedNow = false;
  while (rounds < maxRounds) {
    embeddedFlow(RICH, p, composite(lam), {
      stepSize, energyTol: 1e-12, gradientTol: 1e-12, maxIters: roundIters,
      newtonOpts: { tolerance: 1e-12 },
    });
    rounds++;
    peakViol = Math.max(peakViol, allViolations(RICH, p).length);
    lamTerm = lam;
    if (isEmbedded(RICH, p) && maxConeDeficit(RICH, p) < angleTol) { embeddedNow = true; break; }
    lam *= decay;
    if (lam < lambdaMin) break;
  }
  // Final cleanup: if still over the line, relax with the base alone (λ → 0).
  if (!embeddedNow) {
    embeddedFlow(RICH, p, base, {
      stepSize, energyTol: 1e-12, gradientTol: 1e-12, maxIters,
      newtonOpts: { tolerance: 1e-12 },
    });
    lamTerm = 0;
    embeddedNow = isEmbedded(RICH, p) && maxConeDeficit(RICH, p) < angleTol;
  }

  const after = minMargin(RICH, p);
  const m1 = after.margin;
  const flatResid = maxConeDeficit(RICH, p);
  const ratio = m0 > 0 ? m1 / m0 : Infinity;
  const fatter = embeddedNow && m1 > fatThreshold;
  if (embeddedNow) nEmbedded++;
  if (fatter) nFatter++;

  const f = (x) => x.toFixed(4);
  console.log(
    `  ${String(i).padStart(2)}  `
    + `${f(m0)}→${f(m1)} (×${ratio.toFixed(1).padStart(5)})  `
    + `${(after.type + ' ' + after.cells.join(',')).padEnd(12)}  `
    + `${embeddedNow ? 'yes' : 'NO '}   `
    + `${flatResid.toExponential(1)}  `
    + `${(lamTerm === 0 ? '0 (relax)' : lamTerm.toExponential(2)).padStart(9)}  `
    + `${String(rounds).padStart(4)}  ${String(peakViol).padStart(4)}   `
    + `${fatter ? 'FATTER' : embeddedNow ? 'same' : 'NOT EMB'}`,
  );

  let row = p[0].toString();
  for (let k = 1; k < DIM; k++) row += ',' + p[k].toString();
  fattened.push(row);
}

const outDir = dirname(outPath);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, fattened.join('\n') + '\n');
console.log();
console.log(`  summary: ${nEmbedded}/${samples.length} ended embedded, ${nFatter} genuinely fatter (margin > ${fatThreshold})`);
console.log(`wrote ${fattened.length} samples → ${outPath}`);
