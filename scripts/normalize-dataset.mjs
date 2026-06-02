/**
 * Normalize a torus dataset into the canonical pose and DROP the trivial
 * coordinates: each 24-float row → the 17 free coords [x2,y2, v3,v4,v5,v6,v7]
 * (see src/math/normalize.ts for the convention). The 7 dropped numbers are
 * fixed by the convention (v0=origin, v1=(1,0,0), v2.z=0) and reconstructed on
 * demand with fromReduced().
 *
 * Usage:
 *   npx tsx scripts/normalize-dataset.mjs --in PATH [--out PATH]
 *
 *   --in  PATH   input CSV, 24 floats/row  (default: data/immersed/immersedFlat50000.csv)
 *   --out PATH   output CSV, 17 floats/row (default: <in> with `-reduced17` before .csv)
 *
 * Rows where the convention is undegenerate-defined (v0=v1, or v0,v1,v2
 * collinear) are skipped and counted — they cannot be normalized.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

import { VERTEX_COUNT } from '../src/math/topology.ts';
import { toReduced, REDUCED_DIM } from '../src/math/normalize.ts';

const DIM = VERTEX_COUNT * 3; // 24

const args = process.argv.slice(2);
function flag(name) { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1]; }

const inPath = resolve(flag('--in') ?? 'data/immersed/immersedFlat50000.csv');
const outPath = resolve(flag('--out') ?? inPath.replace(/\.csv$/, '-reduced17.csv'));

console.log('normalize-dataset');
console.log(`  in:   ${inPath}  (${DIM} floats/row)`);
console.log(`  out:  ${outPath}  (${REDUCED_DIM} floats/row)\n`);

const text = readFileSync(inPath, 'utf8');
const out = [];
let rows = 0, badCols = 0, skipped = 0;

for (const line of text.split('\n')) {
  const s = line.trim();
  if (!s) continue;
  rows++;
  const nums = s.split(',').map(Number);
  if (nums.length !== DIM) { badCols++; continue; }
  try {
    const r = toReduced(Float64Array.from(nums));   // normalize + drop the 7 fixed coords
    let row = r[0].toString();
    for (let i = 1; i < REDUCED_DIM; i++) row += ',' + r[i].toString();
    out.push(row);
  } catch (e) {
    skipped++;   // degenerate: v0=v1 or v0,v1,v2 collinear
  }
}

writeFileSync(outPath, out.join('\n') + '\n');

console.log(`read ${rows.toLocaleString()} rows`);
if (badCols) console.log(`  ${badCols} rows had != ${DIM} cols (ignored)`);
if (skipped) console.log(`  ${skipped} rows degenerate, could not normalize (skipped)`);
console.log(`wrote ${out.length.toLocaleString()} reduced rows → ${outPath}`);
