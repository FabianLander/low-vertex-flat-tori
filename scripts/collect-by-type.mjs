/**
 * One-off collector: gather all sample-flat outputs from samples/, group them
 * by triangulation type (read from each run's .params.txt manifest, with a
 * geometric fallback for files lacking one), re-verify every row is genuinely
 * flat + embedded under its type, dedupe, and write one tidy file per type into
 * data/flat-embedded/. Prints a summary sorted by type.
 *
 *   node scripts/collect-by-type.mjs            # default in=samples out=data/flat-embedded
 *   node scripts/collect-by-type.mjs --in DIR --out DIR
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import { ALL_TORI, byId } from '../src/tori/index.ts';
import { isEmbedded } from '../src/math/embedded.ts';
import { maxConeDeficit } from '../src/math/angles.ts';

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i === -1 ? undefined : args[i + 1]; };
const inDir = resolve(flag('--in') ?? 'samples');
const outDir = resolve(flag('--out') ?? 'data/flat-embedded');
const DIM = 24, FLAT_TOL = 1e-6;

/** Detect a row's type geometrically: the type it is flat + embedded under. */
function detectType(p) {
  for (const t of ALL_TORI) {
    if (maxConeDeficit(t, p) < FLAT_TOL && isEmbedded(t, p)) return t.id;
  }
  return null;
}

// Find the type for a run base: prefer its manifest, else detect from row 0.
function typeOfBase(base, firstRow) {
  const pf = `${base}.params.txt`;
  if (existsSync(pf)) {
    const m = readFileSync(pf, 'utf8').match(/^type\s+#(\d+)/m);
    if (m) return Number(m[1]);
  }
  return firstRow ? detectType(firstRow) : null;
}

const parseRow = (line) => Float64Array.from(line.split(',').map(Number));

// Collect: base -> rows. A base is a "flat-*" file minus its -NNN.csv / .params.txt.
const all = readdirSync(inDir).filter((n) => /^flat-.*\.csv$/.test(n)).sort();
const byType = new Map();      // type -> Set(rowString)
const sources = new Map();     // type -> [{file, rows}]
let checked = 0, rejected = 0;

for (const file of all) {
  const lines = readFileSync(join(inDir, file), 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) continue;
  const base = join(inDir, file.replace(/-\d{3}\.csv$/, '').replace(/\.csv$/, ''));
  const type = typeOfBase(base, parseRow(lines[0]));
  if (type == null) { console.log(`  ?? ${file}: could not determine type — skipped`); continue; }
  const torus = byId(type);

  let kept = 0;
  for (const line of lines) {
    const cols = line.split(',');
    if (cols.length !== DIM) continue;
    const p = parseRow(line);
    checked++;
    if (!(maxConeDeficit(torus, p) < FLAT_TOL) || !isEmbedded(torus, p)) { rejected++; continue; }
    if (!byType.has(type)) byType.set(type, new Set());
    const before = byType.get(type).size;
    byType.get(type).add(line);
    if (byType.get(type).size > before) kept++;
  }
  if (!sources.has(type)) sources.set(type, []);
  sources.get(type).push({ file, rows: kept });
}

// Write one file per type, sorted by type.
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const types = [...byType.keys()].sort((a, b) => a - b);
console.log(`\ncollected from ${inDir}  (verified ${checked} rows, rejected ${rejected} not-flat/embedded)\n`);
console.log('  type   examples   source files');
console.log('  ' + '-'.repeat(60));
const indexLines = [];
for (const type of types) {
  const rows = [...byType.get(type)];
  const torus = byId(type);
  const outFile = join(outDir, `type-${type}.csv`);
  writeFileSync(outFile, rows.join('\n') + '\n');
  const srcs = sources.get(type);
  console.log(`  #${type}     ${String(rows.length).padStart(5)}      ${srcs.length} file(s): ${srcs.map((s) => s.file).join(', ')}`);
  indexLines.push(`type-${type}.csv : ${rows.length} flat embedded examples of triangulation #${type} (${torus.name}), deg[${torus.degreeSequence}]`);
}
writeFileSync(join(outDir, 'README.txt'),
  `Flat embedded 8-vertex tori, grouped by triangulation type.\n`
  + `Each row is one embedding: 24 floats x0,y0,z0,...,x7,y7,z7. Every row re-verified\n`
  + `flat (cone deficit < ${FLAT_TOL}) and embedded under its type. Deduped.\n\n`
  + indexLines.join('\n') + '\n');
console.log(`\nwrote ${types.length} files + README.txt → ${outDir}`);
