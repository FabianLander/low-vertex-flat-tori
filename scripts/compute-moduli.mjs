/**
 * Develop every torus in a directory of CSVs and write their moduli τ ∈ ℍ to a
 * small CSV the moduli viewer can load directly (instead of inlining the large
 * raw-tori files). Each output row is `re,im,src` where src is the source-file
 * index; the first line is a `# files: a.csv,b.csv,...` comment for the legend.
 *
 * Usage:
 *   npx tsx scripts/compute-moduli.mjs [inDir] [outFile]
 *   (defaults: data/explore-from-seeds  →  demos/moduli/moduli.csv)
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';

import { VERTEX_COUNT } from '../src/math/topology.ts';
import { modulus } from '../src/math/develop.ts';

const DIM = VERTEX_COUNT * 3;
const inDir = resolve(process.argv[2] ?? 'data/explore-from-seeds');
const outFile = resolve(process.argv[3] ?? 'demos/moduli/moduli.csv');

const files = readdirSync(inDir).filter((n) => n.endsWith('.csv')).sort();
if (files.length === 0) { console.error(`no CSVs in ${inDir}`); process.exit(1); }

const out = [`# files: ${files.join(',')}`];
let total = 0;
files.forEach((name, src) => {
  let count = 0;
  for (const line of readFileSync(join(inDir, name), 'utf8').split('\n')) {
    const s = line.trim();
    if (!s) continue;
    const nums = s.split(',').map(Number);
    if (nums.length !== DIM) continue;
    const t = modulus(Float64Array.from(nums)).tau;
    out.push(`${t[0]},${t[1]},${src}`);
    count++;
  }
  console.log(`  ${name.padEnd(14)} ${count} tori`);
  total += count;
});

if (!existsSync(dirname(outFile))) mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, out.join('\n') + '\n');
console.log(`\nwrote ${total} moduli → ${outFile}`);
