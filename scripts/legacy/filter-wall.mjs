/**
 * filter-wall — distill a big wall-walk dump down to the examples that sit very
 * close to a wall of moduli space and are genuinely well-embedded.
 *
 * Works for either wall: the rhombic wall |Re τ̂| = ½ (--target-re 0.5, default)
 * or the rectangular wall Re τ̂ = 0 (--target-re 0). The wall-walk demo emits
 * tens of thousands of clustered points; we keep only those within --re-max of
 * the wall with embedding margin ≥ --margin-min:
 *
 *   1. PREFILTER on the stored certificate (with a little slack) so we don't
 *      drop borderline rows to browser-vs-headless float wobble.
 *   2. CERTIFY: recompute coneDeficit, reduced τ̂ and margin headlessly against
 *      the file's triangulation, and apply the STRICT gate on those values —
 *      distance to the wall d = ||Re τ̂| − target| ≤ --re-max, margin ≥
 *      --margin-min, deficit < --angle-tol, embedded.
 *   3. Optionally thin to --max examples spread over Im τ̂, one per Im bucket,
 *      taking the BEST per bucket by --rank: 'wall' = closest to the wall
 *      (default, for the rhombic dumps) or 'margin' = fattest embedding (for the
 *      rectangular wall, where every row is already exactly on Re τ̂ = 0 so
 *      closeness can't discriminate and fatness is what "best" means).
 *
 * Inputs may be 28-col (cert appended, prefiltered fast) OR 24-col positions
 * (e.g. rect-all.csv — no cert, so every row is recomputed; ~67µs each).
 * Triangulation type comes from the filename (…-t<N>…) unless given as PATH=TYPE.
 * Each input is written to its OWN file (rows are type-less, so triangulations
 * must stay separate): <out-dir>/<rhombic|rectangular>-t<N>.csv, 28-col
 * search-near-rect format (24 positions, coneDeficit, Re τ̂, Im τ̂, margin).
 *
 * Usage:
 *   npx tsx scripts/filter-wall.mjs [--in PATH[=TYPE] ...] [opts]
 *     no --in  →  the two night3 wall-walk dumps (rhombic, types 6 and 3).
 *
 * Options:
 *   --target-re N    Wall to hug: 0.5 (rhombic, default) or 0 (rectangular)
 *   --re-max N       Max distance to the wall ||Re τ̂|−target| (default 1e-5)
 *   --margin-min N   Minimum embedding margin (default 1e-4)
 *   --max N          Cap kept count, spreading over Im (default 0 = keep all)
 *   --rank wall|margin  Per-Im-bucket pick when thinning (default wall)
 *   --angle-tol N    Flatness gate on recompute (default 1e-9)
 *   --out-dir DIR    Output directory (default data/curated)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, basename, join } from 'path';
import { byId } from '../../src/triangulations/index.ts';
import { modulus, reduceModulus } from '../../src/topology/develop.ts';
import { maxConeDeficit } from '../../src/functions/coneDeficit.ts';
import { isEmbedded } from '../../src/math/embedded.ts';
import { minMargin } from '../../src/functions/minMargin.ts';

const argv = process.argv.slice(2);
const flags = (n) => argv.flatMap((a, i) => (a === n ? [argv[i + 1]] : []));
const flag = (n, d) => { const v = flags(n)[0]; return v === undefined ? d : v; };
const num = (v, d) => (v === undefined ? d : Number(v));

const targetRe = num(flag('--target-re'), 0.5);
const reMax = num(flag('--re-max'), 1e-5);
const marginMin = num(flag('--margin-min'), 1e-4);
const maxKeep = num(flag('--max'), 0);
const rank = flag('--rank', 'wall');   // 'wall' = closest to wall, 'margin' = fattest
const angleTol = num(flag('--angle-tol'), 1e-9);
const outDir = resolve(flag('--out-dir', 'data/curated'));
const cls = targetRe === 0 ? 'rectangular' : targetRe === 0.5 ? 'rhombic' : `re${targetRe}`;

const inputs = flags('--in').length ? flags('--in') : [
  'samples/experiments/night3/wall-walk-wall-t6-60000.csv',
  'samples/experiments/night3/wall-walk-push-t3-38327.csv',
];

const distToWall = (re) => Math.abs(Math.abs(re) - targetRe);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

for (const spec of inputs) {
  const [pathRaw, typeRaw] = spec.split('=');
  const path = resolve(pathRaw);
  if (!existsSync(path)) { console.log(`skip ${pathRaw}: not found`); continue; }
  const type = typeRaw ? Number(typeRaw) : Number((basename(path).match(/t(\d)/) || [])[1]);
  if (!(type >= 1 && type <= 7)) { console.log(`skip ${pathRaw}: cannot read type from name (pass PATH=TYPE)`); continue; }
  const torus = byId(type);
  const N = torus.vertexCount * 3;

  // ---- 1. prefilter on the stored certificate, with slack (25 reτ̂, 27 margin) ----
  const cand = [];
  let rows = 0;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s || /^[a-zA-Z]/.test(s)) continue;
    const parts = s.split(',');
    if (parts.length < N) continue;
    rows++;
    // 28-col rows carry a certificate → prefilter cheaply; 24-col rows (no cert)
    // can't be prefiltered, so they all become candidates and step 2 recomputes.
    if (parts.length >= 28 && !(+parts[27] >= marginMin * 0.9 && distToWall(+parts[25]) <= reMax * 1.5)) continue;
    cand.push(parts);
  }

  // ---- 2. recompute + strict gate ----
  const kept = [];
  for (const parts of cand) {
    const p = new Float64Array(N);
    for (let i = 0; i < N; i++) p[i] = +parts[i];
    const deficit = maxConeDeficit(torus, p);
    const tHat = reduceModulus(modulus(torus, p).tau);
    const d = distToWall(tHat[0]);
    if (!(deficit < angleTol) || !(d <= reMax) || !isEmbedded(torus, p)) continue;
    const margin = minMargin(torus, p).margin;
    if (!(margin >= marginMin)) continue;
    let row = p[0].toString();
    for (let i = 1; i < N; i++) row += ',' + p[i].toString();
    kept.push({ row: `${row},${deficit},${tHat[0]},${tHat[1]},${margin}`, im: tHat[1], d, margin });
  }

  // ---- 3. optional thin to --max, spread over Im (closest-to-wall first) ----
  let out = kept;
  if (maxKeep > 0 && kept.length > maxKeep) {
    let lo = Infinity, hi = -Infinity;
    for (const k of kept) { if (k.im < lo) lo = k.im; if (k.im > hi) hi = k.im; }
    const width = ((hi - lo) || 1) / maxKeep;
    const order = rank === 'margin'
      ? (a, b) => b.margin - a.margin   // fattest first
      : (a, b) => a.d - b.d;            // closest to wall first
    const taken = new Set();
    out = [];
    for (const k of [...kept].sort(order)) {
      const b = Math.round(k.im / width);
      if (taken.has(b)) continue;
      taken.add(b); out.push(k);
    }
  }
  out.sort((a, b) => a.im - b.im);

  const outPath = join(outDir, `${cls}-t${type}.csv`);
  writeFileSync(outPath, out.map((o) => o.row).join('\n') + (out.length ? '\n' : ''));

  const dMax = out.reduce((m, o) => Math.max(m, o.d), 0);
  const mMin = out.reduce((m, o) => Math.min(m, o.margin), Infinity);
  const imLo = out.reduce((m, o) => Math.min(m, o.im), Infinity);
  const imHi = out.reduce((m, o) => Math.max(m, o.im), 0);
  console.log(`${basename(path)}  (type ${type}, ${cls} wall)`);
  console.log(`  scanned ${rows.toLocaleString()}  →  kept ${out.length}  ·  d≤${dMax.toExponential(1)}  ·  margin≥${mMin.toExponential(2)}  ·  Im∈[${imLo.toFixed(3)},${imHi.toFixed(3)}]`);
  console.log(`  → ${outPath}\n`);
}
