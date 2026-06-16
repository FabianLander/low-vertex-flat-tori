/**
 * teich-moduli — turn the night3 search outputs into plot-ready TEICHMÜLLER
 * points for demos/wall-moduli.
 *
 * The search scripts (push-re, wall-ladder, collect-rect) all stored the
 * REDUCED modulus τ̂ = reduceModulus(τ) — i.e. a point of MODULI space, folded
 * into the standard SL(2,ℤ) fundamental domain. We instead want the raw
 * TEICHMÜLLER point τ = v₂/v₁ that develop() reads straight off the holonomy of
 * the two marked generator loops (no folding). For the rect (Re τ̂ = 0) family
 * these coincide — those tori already sit in the domain — but the rhombic-wall
 * trajectories (push/wall, |Re τ̂| = ½) develop to raw τ that wanders BELOW the
 * unit circle and across several copies of the domain. That spread is exactly
 * what we want to see, so we recompute τ from the stored positions here.
 *
 * For every input we re-develop each torus (24 floats → τ) against its OWN
 * triangulation type and copy the already-certified coneDeficit / margin
 * straight through (those are SL(2,ℤ)-invariant, no need to recompute).
 *
 *   Input  (samples/experiments/night3/, positions are always the first 24 columns):
 *     <name>-best.csv      28 cols: …positions…, coneDeficit, reτ̂, imτ̂, margin
 *     rect*-all.csv        24 cols positions; coneDeficit/margin from the
 *                          row-aligned rect*-all-info.csv companion
 *   Output (samples/experiments/night3/teich/<name>.csv):
 *     header reTau,imTau,coneDeficit,margin  — reTau/imTau are now Teichmüller.
 *
 * Usage:  npx tsx scripts/teich-moduli.mjs   [--in DIR] [--out DIR]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { byId } from '../src/tori/index.ts';
import { modulus } from '../src/math/develop.ts';

const ROOT = resolve(import.meta.dirname, '..');
const flag = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const IN = resolve(ROOT, flag('--in', 'samples/experiments/night3'));
const OUT = resolve(ROOT, flag('--out', 'samples/experiments/night3/teich'));
const ROT_TOL = 1e-4;   // drop rows whose holonomy isn't (nearly) a pure translation

// name → { pos: positions file, type: triangulation, cols28 | info: cert source }
const SPECS = [
  { name: 'rect-t7', pos: 'rect-all.csv',     type: 7, info: 'rect-all-info.csv' },
  { name: 'rect-t3', pos: 'rect-t3-all.csv',  type: 3, info: 'rect-t3-all-info.csv' },
  { name: 'push-t7', pos: 'push-t7-best.csv', type: 7, cols28: true },
  { name: 'push-t3', pos: 'push-t3-best.csv', type: 3, cols28: true },
  { name: 'wall-t4', pos: 'wall-t4-best.csv', type: 4, cols28: true },
  { name: 'wall-t5', pos: 'wall-t5-best.csv', type: 5, cols28: true },
  { name: 'wall-t6', pos: 'wall-t6-best.csv', type: 6, cols28: true },
];

/** numeric data rows (drops a header line and blanks); each row is number[] */
function dataRows(path) {
  return readFileSync(path, 'utf8').split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^[a-zA-Z]/.test(l))
    .map((l) => l.split(',').map(Number));
}

// compact but plenty for plotting: 7 sig figs for τ (snap numeric dust to 0,
// which collapses the rect family's ~1e-16 Re τ), 6 for the tiny cert numbers.
const fτ = (x) => (Math.abs(x) < 1e-12 ? '0' : Number(x).toPrecision(7).replace(/(\.\d*?)0+($|e)/, '$1$2').replace(/\.($|e)/, '$1'));
const fc = (x) => Number(x).toPrecision(6);

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

let grand = 0;
for (const s of SPECS) {
  const posPath = join(IN, s.pos);
  if (!existsSync(posPath)) { console.log(`skip ${s.name}: no ${s.pos}`); continue; }
  const torus = byId(s.type);
  const rows = dataRows(posPath);
  // cone/margin source, row-aligned with `rows`
  const info = s.info ? dataRows(join(IN, s.info)) : null;

  const out = ['reTau,imTau,coneDeficit,margin'];
  let dropped = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < 24) { dropped++; continue; }
    const p = Float64Array.from(r.slice(0, 24));
    const m = modulus(torus, p);
    if (m.rotDefect > ROT_TOL) { dropped++; continue; }
    let cone, margin;
    if (s.cols28) { cone = r[24]; margin = r[27]; }
    else { const ir = info[i]; cone = ir[2]; margin = ir[3]; }  // info: reTau,imTau,coneDeficit,margin
    out.push(`${fτ(m.tau[0])},${fτ(m.tau[1])},${fc(cone)},${fc(margin)}`);
  }
  writeFileSync(join(OUT, `${s.name}.csv`), out.join('\n') + '\n');
  grand += out.length - 1;
  console.log(`${s.name.padEnd(8)} type ${s.type}  ${String(out.length - 1).padStart(7)} pts` +
    (dropped ? `  (${dropped} dropped)` : ''));
}
console.log(`\nwrote ${grand} Teichmüller points → ${OUT}`);
