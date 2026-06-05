/**
 * Rank embedded tori by closeness to FLAT and split into shards for parallel
 * seeding of the flat search.
 *
 * Flatness = every cone-angle defect δᵢ = 2π − coneAngle(i) is zero. Closeness
 * is a norm of the defect vector (its signed sum is 0 by Gauss–Bonnet on the
 * torus, so we use |·|). Cone angles are scale-invariant, so no normalization.
 *   primary key:  L∞ = max_i |δᵢ|  (= maxConeDeficit; "how close to passing the flat test")
 *   tiebreak:     RMS = √(Σδᵢ²/V)  ("globally near-flat")
 *
 * Reads Float32 .bin datasets (96 bytes/sample), dedupes exact samples (so a
 * merged file overlapping its parts can't double-count), sorts ascending, takes
 * the top-K, and round-robins them into `--shards` CSV seed files of equal
 * quality — ready for: sample-flat --seed-mode file --seed-file <shard>.
 *
 *   npx tsx scripts/rank-seeds.mjs --type 2 --top 5000 --shards 5
 *
 * Options: --type N  --in GLOBDIR (dir or comma list)  --top K  --shards M
 *          --out-dir DIR  (default samples/type<N>-seeds)
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { byId } from '../src/tori/index.ts';
import { coneAngleDeficits, maxConeDeficit } from '../src/math/angles.ts';

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i === -1 ? undefined : args[i + 1]; };
const num = (v, d) => (v === undefined ? d : Number(v));

const type = num(flag('--type'), 2);
const torus = byId(type);
const top = num(flag('--top'), 5000);
const shards = num(flag('--shards'), 5);
const inSpec = flag('--in') ?? 'samples';
const outDir = resolve(flag('--out-dir') ?? `samples/type${type}-seeds`);
const DIM = torus.vertexCount * 3;
const SAMPLE_BYTES = DIM * 4;

// Resolve input .bin files: a dir (glob type<N>*-emb-*.bin) or comma-list of files.
let files;
if (existsSync(inSpec) && statSync(inSpec).isDirectory()) {
  const re = new RegExp(`^type${type}.*-emb-.*\\.bin$`);
  files = readdirSync(inSpec).filter((n) => re.test(n)).sort().map((n) => join(inSpec, n));
} else {
  files = inSpec.split(',').map((s) => resolve(s.trim()));
}
if (files.length === 0) { console.error(`no input .bin files matched ${inSpec}`); process.exit(1); }

console.log(`rank-seeds  type #${type} (${torus.name})`);
console.log(`  inputs: ${files.map((f) => f.split('/').pop()).join(', ')}`);

// Load + dedupe exact samples.
const seen = new Set();
const samples = [];
for (const f of files) {
  const buf = readFileSync(f);
  const arr = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
  for (let s = 0; s + DIM <= arr.length; s += DIM) {
    const p = new Float64Array(DIM);
    for (let k = 0; k < DIM; k++) p[k] = arr[s + k];
    const key = p.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    samples.push(p);
  }
}
console.log(`  loaded ${samples.length.toLocaleString()} unique embedded tori`);

// Score each by L∞ (primary) and RMS (tiebreak) of cone-angle defects.
const scored = samples.map((p) => {
  const d = coneAngleDeficits(torus, p);
  let sumSq = 0;
  for (let i = 0; i < d.length; i++) sumSq += d[i] * d[i];
  return { p, linf: maxConeDeficit(torus, p), rms: Math.sqrt(sumSq / d.length) };
});
scored.sort((a, b) => (a.linf - b.linf) || (a.rms - b.rms));

const chosen = scored.slice(0, Math.min(top, scored.length));
console.log(`  closest-to-flat: best L∞=${chosen[0].linf.toExponential(3)} (RMS=${chosen[0].rms.toExponential(3)}), `
  + `worst kept L∞=${chosen[chosen.length - 1].linf.toExponential(3)}`);

// Round-robin into shards of equal quality.
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const buckets = Array.from({ length: shards }, () => []);
chosen.forEach((s, i) => buckets[i % shards].push(Array.from(s.p).map((x) => x.toString()).join(',')));
console.log(`  writing ${shards} shards → ${outDir}`);
for (let k = 0; k < shards; k++) {
  const path = join(outDir, `type${type}-seeds-${k + 1}.csv`);
  writeFileSync(path, buckets[k].join('\n') + '\n');
  console.log(`    ${path}  (${buckets[k].length} seeds)`);
}
writeFileSync(join(outDir, 'README.txt'),
  `Top ${chosen.length} embedded type-${type} tori ranked closest-to-flat (L∞ of cone-angle\n`
  + `defect, tiebreak RMS), round-robined into ${shards} equal-quality shards for parallel\n`
  + `seeding. Best L∞=${chosen[0].linf.toExponential(3)}, worst kept=${chosen[chosen.length - 1].linf.toExponential(3)}.\n`
  + `Use: npm run sample-flat -- --type ${type} --seed-mode file --seed-file type${type}-seeds-<k>.csv\n`);
