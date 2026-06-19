/**
 * build-moduli-data — assemble the torus-moduli picker's committed dataset.
 *
 * Pulls flat embedded 8-vertex tori from many scattered source CSVs, RE-CERTIFIES
 * every row (never trusts a source's stored certificate columns), keeps only those
 * that are flat AND embedded, DEDUPS by reduced modulus τ̂ (keeping the largest-
 * margin representative per bucket), caps per type, and writes clean 28-col files
 * `embedded-t<N>.csv` into demos/torus-moduli/data/ — one per triangulation type.
 *
 * The gate does the curation for free: immersed dumps (flat but self-intersecting)
 * fail `embedded`, and raw seeds (not flat) fail the cone-deficit test, so neither
 * reaches the viewer. Dedup collapses the wall-crowding (e.g. collect-half has tens
 * of thousands of rows on a couple of moduli) down to distinct points.
 *
 * Output row (28 cols, NO header — what the picker parses):
 *   24 positions, coneDeficit, Re τ̂, Im τ̂, margin
 *
 * Usage:
 *   npm run build-moduli-data -- [--tol 0.01] [--cap 800] [--cone-tol 1e-6]
 *   --tol N       τ̂ dedup bucket size (Re and Im rounded to this grid). Default 0.01.
 *   --cap N       max points kept per type (even subsample if exceeded). Default 800.
 *   --cone-tol N  flatness gate: keep only |coneDeficit|, rotDefect < N. Default 1e-6.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';

import { byId } from '@core/triangulations/index.ts';
import { certify } from '@core/search/certify.ts';

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const num = (v, d) => (v === undefined ? d : Number(v));
const TOL = num(flag('--tol'), 0.01);
const CAP = num(flag('--cap'), 800);
const CONE_TOL = num(flag('--cone-tol'), 1e-6);

const OUT_DIR = resolve('demos/torus-moduli/data');

// ---------------------------------------------------------------------------
// Sources: { file, type }. Type is supplied here (24-col files carry no type),
// and only sources whose rows certify cleanly under that type are listed.
// ---------------------------------------------------------------------------
const SOURCES = [
  // Collaborator's curated boundary-line crowds (28-col, already embedded).
  { file: 'data/curated/rectangular-t3.csv', type: 3 },
  { file: 'data/curated/rectangular-t7.csv', type: 7 },
  { file: 'data/curated/rhombic-t3.csv', type: 3 },
  { file: 'data/curated/rhombic-t6.csv', type: 6 },
  { file: 'data/curated/rhombic-t7.csv', type: 7 },
  // Small hand-curated flat-embedded sets.
  { file: 'data/flat-embedded/type-3.csv', type: 3 },
  { file: 'data/flat-embedded/type-4.csv', type: 4 },
  { file: 'data/flat-embedded/type-5.csv', type: 5 },
  { file: 'data/flat-embedded/type-6.csv', type: 6 },
  { file: 'data/flat-embedded/type-7.csv', type: 7 },
  // Larger exploration dumps (flat + embedded, heavily clustered → dedup earns its keep).
  { file: 'data/explore-from-seeds/seed-1.csv', type: 7 },
  { file: 'data/explore-from-seeds/seed-2.csv', type: 7 },
  { file: 'data/explore-from-seeds/seed-3.csv', type: 7 },
  { file: 'data/explore-from-seeds/seed-4.csv', type: 7 },
  { file: 'data/explore-from-seeds/seed-5.csv', type: 7 },
  { file: 'data/explore-from-seeds/seed-6.csv', type: 7 },
  { file: 'data/explore-from-seeds/seed-7.csv', type: 7 },
  { file: 'samples/collect-half-t7-all.csv', type: 7 },
  // Our frontier results (near the square torus i and the Re τ̂ = ½ wall).
  { file: 'data/frontier/march-to-i-t3.csv', type: 3 },
  { file: 'data/frontier/march-to-i-t7.csv', type: 7 },
  { file: 'data/frontier/imaginary-t7.csv', type: 7 },
  { file: 'demos/torus-inspector/square-torus.csv', type: 3 },
];

// ---------------------------------------------------------------------------
// Ingest: certify, gate (flat ∧ embedded), dedup by τ̂ keeping max margin.
// ---------------------------------------------------------------------------
const N = 24;
const bucketKey = (re, im) => `${Math.round(re / TOL)}_${Math.round(im / TOL)}`;
// per type: Map<bucketKey, { row: number[], margin, re, im }>
const byType = new Map();
const stats = new Map(); // type -> { scanned, notFlat, notEmbedded, kept }

function bump(type, field) {
  if (!stats.has(type)) stats.set(type, { scanned: 0, notFlat: 0, notEmbedded: 0 });
  stats.get(type)[field]++;
}

for (const { file, type } of SOURCES) {
  const path = resolve(file);
  if (!existsSync(path)) { process.stderr.write(`  (skip, missing) ${file}\n`); continue; }
  const torus = byId(type);
  if (!byType.has(type)) byType.set(type, new Map());
  const buckets = byType.get(type);
  let kept = 0;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const p = Float64Array.from(line.split(',').slice(0, N).map(Number));
    if (p.length !== N || p.some(Number.isNaN)) continue;
    bump(type, 'scanned');
    const c = certify(torus, p);
    if (c.coneDeficit >= CONE_TOL || c.rotDefect >= CONE_TOL) { bump(type, 'notFlat'); continue; }
    if (!c.embedded) { bump(type, 'notEmbedded'); continue; }
    const [re, im] = c.tauHat;
    const k = bucketKey(re, im);
    const prev = buckets.get(k);
    if (!prev || c.margin > prev.margin) {
      buckets.set(k, { row: [...p, c.coneDeficit, re, im, c.margin], margin: c.margin, re, im });
      if (!prev) kept++;
    }
  }
  process.stderr.write(`  ${file} [t${type}]: +${kept} distinct\n`);
}

// ---------------------------------------------------------------------------
// Cap (even subsample by Im) and write one file per type.
// ---------------------------------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });
let grand = 0;
const summary = [];
for (const [type, buckets] of [...byType.entries()].sort((a, b) => a[0] - b[0])) {
  let pts = [...buckets.values()].sort((a, b) => a.im - b.im || a.re - b.re);
  const distinct = pts.length;
  if (pts.length > CAP) {
    const step = pts.length / CAP;
    pts = Array.from({ length: CAP }, (_, i) => pts[Math.floor(i * step)]);
  }
  const out = resolve(OUT_DIR, `embedded-t${type}.csv`);
  writeFileSync(out, pts.map((q) => q.row.join(',')).join('\n') + '\n');
  grand += pts.length;
  const s = stats.get(type) ?? { scanned: 0, notFlat: 0, notEmbedded: 0 };
  summary.push({ type, scanned: s.scanned, notFlat: s.notFlat, notEmbedded: s.notEmbedded, distinct, written: pts.length });
}

process.stderr.write('\n  type | scanned | dropped(notFlat/notEmb) | distinct τ̂ | written\n');
for (const s of summary) {
  process.stderr.write(
    `   t${s.type}  | ${String(s.scanned).padStart(6)}  |   ${String(s.notFlat).padStart(5)} / ${String(s.notEmbedded).padStart(5)}        |   ${String(s.distinct).padStart(5)}    | ${s.written}\n`,
  );
}
process.stderr.write(`\nDone: ${grand} points across ${summary.length} types → ${OUT_DIR}/embedded-t*.csv  (tol=${TOL}, cap=${CAP})\n`);
