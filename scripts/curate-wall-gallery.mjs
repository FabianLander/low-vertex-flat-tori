/**
 * Curate the wall-gallery: collect GOOD rhombic-wall examples (|Re τ̂| = ½) from
 * the night3 push/wall searches into per-type gallery files for demos/wall-gallery.
 *
 * The analogue of curate-rect-gallery, but (a) the target locus is the rhombic
 * wall |Re τ̂| = ½ instead of the rectangular wall Re τ̂ = 0, and (b) the inputs
 * span SEVERAL triangulations (types 3–7), so we verify and bucket each against
 * its OWN torus and write one file per type. Every row is verified — flat to
 * --angle-tol, ||Re τ̂| − ½| < --re-tol (this admits both signs of the wall and
 * its SL(2,ℤ) translates, since we test the REDUCED modulus), embedded — then
 * bucketed by Im τ̂ with the FATTEST example (largest scale-free minMargin)
 * winning each bucket, and normalized to unit area.
 *
 *   Inputs  (samples/experiments/night3/, positions = first 24 cols):
 *     push-t7-best, push-t3-best, wall-t4-best, wall-t5-best, wall-t6-best
 *   Output  (demos/wall-gallery/gallery-t<N>.csv): unit-area 24-float rows,
 *     sorted by Im τ̂. The demo re-derives every certificate from coordinates.
 *
 * Usage:
 *   npx tsx scripts/curate-wall-gallery.mjs [--re-tol N] [--bucket N] [--in PATH=TYPE ...]
 *
 * Options:
 *   --re-tol N     ||Re τ̂| − ½| gate (default 5e-2 — admits the near-wall
 *                    wall-t4/t5 champions that stalled at ~0.47, not only the
 *                    exactly-½ push/wall-t6 solutions). Tighten for on-wall only.
 *   --bucket N     Im τ̂ bucket width (default 0.04) — one example kept per bucket
 *   --angle-tol N  max |cone deficit| (default 1e-10)
 *   --in PATH=TYPE Extra input as "file.csv=3" (repeatable); ADDED to the night3
 *                    defaults (e.g. a wall-walk download: …t6-60000.csv=6).
 *   --out-dir DIR  Output directory (default demos/wall-gallery)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { byId } from '../src/tori/index.ts';
import { modulus, reduceModulus } from '../src/math/develop.ts';
import { maxConeDeficit } from '../src/math/angles.ts';
import { isEmbedded } from '../src/math/embedded.ts';
import { minMargin, linearSize } from '../src/math/energies/cellMargin.ts';

const argv = process.argv.slice(2);
const flags = (n) => argv.flatMap((a, i) => (a === n ? [argv[i + 1]] : []));
const flag = (n, d) => { const v = flags(n)[0]; return v === undefined ? d : v; };
const num = (v, d) => (v === undefined ? d : Number(v));

const reTol = num(flag('--re-tol'), 7e-2);
const bucket = num(flag('--bucket'), 0.04);
const angleTol = num(flag('--angle-tol'), 1e-10);
const TARGET = 0.5;
const outDir = resolve(flag('--out-dir', 'demos/wall-gallery'));

// inputs as { file, type }: the night3 rhombic-wall families, plus any --in extras
const custom = flags('--in').map((s) => { const [f, t] = s.split('='); return { file: f, type: Number(t) }; });
const SPECS = [
  { file: 'samples/experiments/night3/push-t7-best.csv', type: 7 },
  { file: 'samples/experiments/night3/push-t3-best.csv', type: 3 },
  { file: 'samples/experiments/night3/wall-t4-best.csv', type: 4 },
  { file: 'samples/experiments/night3/wall-t5-best.csv', type: 5 },
  { file: 'samples/experiments/night3/wall-t6-best.csv', type: 6 },
  ...custom,
];

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
console.log('curate-wall-gallery');
console.log(`  keep:    deficit < ${angleTol}, ||Re τ̂| − ½| < ${reTol}, embedded`);
console.log(`  buckets: Im τ̂ width ${bucket} — fattest (largest minMargin) wins\n`);

// group specs by type so several files can feed one gallery file
const byType = new Map();
for (const s of SPECS) (byType.get(s.type) ?? byType.set(s.type, []).get(s.type)).push(s.file);

let grand = 0;
for (const [type, fileList] of [...byType.entries()].sort((a, b) => a[0] - b[0])) {
  const torus = byId(type);
  const N = torus.vertexCount * 3;
  const best = new Map();  // Im bucket → { row, im, re, margin, deficit }
  let scanned = 0, verified = 0;
  for (const file of fileList) {
    const path = resolve(file);
    if (!existsSync(path)) { console.log(`  (skip ${file}: missing)`); continue; }
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const s = line.trim();
      if (!s || /^[a-zA-Z]/.test(s)) continue;
      const parts = s.split(',');
      if (parts.length < N) continue;
      scanned++;
      const p = new Float64Array(N);
      for (let i = 0; i < N; i++) p[i] = Number(parts[i]);
      const deficit = maxConeDeficit(torus, p);
      if (!(deficit < angleTol)) continue;
      const tHat = reduceModulus(modulus(torus, p).tau);
      if (!(Math.abs(Math.abs(tHat[0]) - TARGET) < reTol)) continue;
      if (!isEmbedded(torus, p)) continue;
      verified++;
      const margin = minMargin(torus, p).margin;
      const b = Math.round(tHat[1] / bucket);
      const cur = best.get(b);
      if (!cur || margin > cur.margin) {
        const k = 1 / linearSize(torus, p);
        for (let i = 0; i < N; i++) p[i] *= k;       // unit area
        let row = p[0].toString();
        for (let i = 1; i < N; i++) row += ',' + p[i].toString();
        best.set(b, { row, im: tHat[1], re: tHat[0], margin, deficit });
      }
    }
  }
  const kept = [...best.values()].sort((a, b) => a.im - b.im);
  const out = join(outDir, `gallery-t${type}.csv`);
  writeFileSync(out, kept.map((x) => x.row).join('\n') + (kept.length ? '\n' : ''));
  grand += kept.length;
  console.log(`  type ${type}: scanned ${scanned.toLocaleString().padStart(7)}  verified ${String(verified).padStart(6)}  kept ${String(kept.length).padStart(3)} → gallery-t${type}.csv`);
  for (const x of kept) console.log(`      Im=${x.im.toFixed(4)}  Re τ̂=${x.re.toFixed(5)}  margin=${x.margin.toExponential(2)}`);
}
console.log(`\nwrote ${grand} gallery tori → ${outDir}`);
