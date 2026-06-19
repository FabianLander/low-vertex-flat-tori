/**
 * hull-experiment — numerical evidence for the "no flat type-2 torus" argument.
 *
 * Schwartz's non-existence proof for 7-vertex paper tori (Vertex-Minimal Paper Tori,
 * §2) is two lemmas: (Hull) every embedded polyhedral torus has a vertex interior to
 * its convex hull, and (Cone) an interior vertex has cone angle > 2π. Flat needs every
 * angle = 2π, so an interior vertex kills flatness. The Hull Lemma there is proved via
 * the Bokowski–Eggert oriented-matroid classification of 7-vertex tori; for the 8-vertex
 * types we have no such classification, so we gather evidence numerically.
 *
 * On each EMBEDDED (not flat) torus it records: which vertices are strictly interior to
 * the convex hull (support margin < −tol), the cone-angle deficit δ = 2π − θ at every
 * vertex (interior ⟹ δ < 0 ⟺ angle > 2π), each vertex's degree, and the max|δ|.
 * A sample with 0 interior vertices refutes the Hull analog; an interior vertex with
 * δ ≥ 0 refutes the Cone Lemma for type 2 (not automatic — type 2 is not neighborly).
 *
 * Two modes:
 *   (default)    analyse a fixed population read from CSV — the 5000 curated embedded
 *                type-2 tori in samples/type2-seeds/.
 *   --generate   STREAM new embedded tori forever: perturb a pool member, flow back to
 *                embedded, analyse, repeat — live dashboard, runs until Ctrl-C / --mins.
 *                (Random-from-scratch almost never reaches embedded; perturb+reflow does.)
 *
 * Usage:  npm run hull-experiment -- [options]
 *   --type N            triangulation 1-7 (default 2)
 *   --csv PATHS         comma-separated CSV paths (default: the 5 type2-seeds shards)
 *   --tol N             hull interior threshold on the normalized margin (default 1e-4)
 *   --limit N           (static mode) cap the number of tori analysed
 *   --dump PATH         write tori with ≤ --dump-max-interior interior vertices to PATH (24-float rows)
 *   --dump-max-interior K   threshold for --dump (default 0 = all-vertices-on-hull tori)
 *   --generate          stream-generate embedded tori instead of reading a fixed set
 *   --mins N            (generate) stop after N minutes (default: run until Ctrl-C)
 *   --seed N            (generate) RNG seed (default: clock)
 *   --sigma-min/max N   (generate) perturbation σ range (default 0.01 .. 0.25)
 *   --step-size N       (generate) flow step (default 0.001)
 *   --max-flow-iters N  (generate) flow cap per attempt (default 800)
 *   --energy NAME       (generate) 'cutoff' (default) | 'chord2'
 *   --out PATH          (generate) append each new embedded torus as a 24-float CSV row
 *   --report-secs N     (generate) dashboard refresh interval (default 2)
 */

import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { makeArgs, csvRow } from './lib/cli.mjs';
import { byId } from '@core/triangulations/index.ts';
import { parseEmbeddings } from '@core/configuration/csv.ts';
import { isEmbedded } from '@core/embedding/index.ts';
import { coneAngleDeficits, maxConeDeficit } from '@core/constraints/flat.ts';
import { supportMargins } from '@core/geometry/convexHull.ts';
import { makeRng } from '@core/sampling/rng.ts';
import { poolSeeds, logSigma } from '@core/sampling/seeds.ts';
import { flattenFlowEmbed } from '@core/search/recipe.ts';
import { makeCutOffArea, makeChordLengthSquared } from '@core/embedding/index.ts';

const a = makeArgs(process.argv);
const triang = byId(a.num('--type', 2));
const V = triang.vertexCount;
const tol = a.num('--tol', 1e-4);
const limit = a.num('--limit', Infinity);
const generate = a.has('--generate');
const dumpPath = a.flag('--dump') ? resolve(a.flag('--dump')) : null;        // write the low-interior tori here
const dumpMaxInterior = a.num('--dump-max-interior', 0);                      // dump samples with ≤ this many interior vertices (default 0 = all-on-hull)

const defaultCsvs = [1, 2, 3, 4, 5].map((k) => `samples/type2-seeds/type2-seeds-${k}.csv`);
const csvPaths = (a.flag('--csv') ? a.flag('--csv').split(',') : defaultCsvs).map((p) => resolve(p.trim()));
const degree = Array.from({ length: V }, (_, i) => triang.vertexLinks[i].length);

// ── pretty-printing (TTY-gated colour; plain when piped) ──────────────────────
const tty = process.stdout.isTTY;
const sgr = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : `${s}`);
const bold = sgr(1), dim = sgr(2), red = sgr(31), green = sgr(32), yellow = sgr(33), cyan = sgr(36);
const bar = (frac, width = 30) => { const n = Math.max(0, Math.round(frac * width)); return '█'.repeat(n) + dim('·'.repeat(width - n)); };
const pct = (n, t) => (t ? (100 * n) / t : 0).toFixed(1).padStart(5) + '%';
const fmtDur = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`; };
const line = (s) => '  ' + s;

// ── accumulators ──────────────────────────────────────────────────────────────
let tries = 0, embedded = 0, notEmbedded = 0, interiorTotal = 0, noInterior = 0, coneViolations = 0, borderline = 0;
const interiorHist = new Map();   // #interior vertices → #samples
const byDeg = new Map();          // degree → { interior, coneOk, coneBad }
for (const d of new Set(degree)) byDeg.set(d, { interior: 0, coneOk: 0, coneBad: 0 });
let minInterior = null;           // sample with fewest interior vertices (tiebreak flattest)
let worstCone = null;             // interior vertex with the most positive δ
let bestFlat = Infinity;          // smallest max|δ| over all embedded samples
let dumpCount = 0;                // how many tori written to --dump
let flattestOnHull = null;        // { flatness, row } of the flattest all-on-hull torus seen

if (dumpPath) { mkdirSync(dirname(dumpPath), { recursive: true }); writeFileSync(dumpPath, ''); }

/** Analyse one embedded configuration `x` (Float64Array, length 3V), updating the tallies. */
function analyse(x) {
  const flatness = maxConeDeficit(triang, x);
  if (flatness < bestFlat) bestFlat = flatness;
  const pts = [];
  for (let i = 0; i < V; i++) pts.push([x[3 * i], x[3 * i + 1], x[3 * i + 2]]);
  const margins = supportMargins(pts);
  const deficits = coneAngleDeficits(triang, x);

  let nInterior = 0, sawBorderline = false;
  for (let i = 0; i < V; i++) {
    if (Math.abs(margins[i]) < 10 * tol) sawBorderline = true;
    if (margins[i] < -tol) {
      nInterior++; interiorTotal++;
      const b = byDeg.get(degree[i]);
      b.interior++;
      if (deficits[i] < 0) b.coneOk++;                          // angle > 2π — as the Cone Lemma predicts
      else {
        b.coneBad++; coneViolations++;
        if (!worstCone || deficits[i] > worstCone.deficit) worstCone = { degree: degree[i], deficit: deficits[i], flatness };
      }
    }
  }
  interiorHist.set(nInterior, (interiorHist.get(nInterior) ?? 0) + 1);
  if (nInterior === 0) noInterior++;
  if (sawBorderline) borderline++;
  if (dumpPath && nInterior <= dumpMaxInterior) { appendFileSync(dumpPath, csvRow(x) + '\n'); dumpCount++; }
  if (nInterior === 0 && (!flattestOnHull || flatness < flattestOnHull.flatness)) flattestOnHull = { flatness, row: csvRow(x) };
  if (!minInterior || nInterior < minInterior.nInterior || (nInterior === minInterior.nInterior && flatness < minInterior.flatness)) {
    minInterior = { nInterior, flatness };
  }
}

// ── dashboard ───────────────────────────────────────────────────────────────
function render(status) {
  const L = [];
  const title = `hull-experiment · type #${triang.id} · V=${V} · degrees ${[...degree].sort((p, q) => p - q).join(' ')}`;
  const rule = '─'.repeat(title.length + 2);
  L.push(bold('╭' + rule + '╮'));
  L.push(bold('│ ' + title + ' │'));
  L.push(bold('╰' + rule + '╯'));
  L.push('');
  L.push(status);
  if (!embedded) { console.log(L.map(line).join('\n')); return; }

  L.push('');
  L.push(bold('INTERIOR VERTICES PER TORUS'));
  const keys = [...interiorHist.keys()].sort((p, q) => p - q);
  const maxCount = Math.max(...keys.map((k) => interiorHist.get(k)));
  for (const k of keys) {
    const n = interiorHist.get(k);
    const tag = k === 0 ? '  ' + red('← all vertices on the hull') : '';
    L.push(` ${k} ${bar(n / maxCount)} ${String(n).padStart(6)} ${pct(n, embedded)}${tag}`);
  }

  L.push('');
  L.push(bold('KEY CLAIMS'));
  const hullOk = noInterior === 0, coneOk = coneViolations === 0;
  L.push(`  Hull analog  ${dim('every embedded torus has an interior vertex')}`);
  L.push(`               ${hullOk ? green('✓ holds') : red('✗ fails')}  ${dim('—')}  ${noInterior} / ${embedded} (${pct(noInterior, embedded).trim()}) all-on-hull`);
  L.push(`  Cone lemma   ${dim('interior vertex ⟹ cone angle > 2π')}`);
  L.push(`               ${coneOk ? green('✓ holds') : red('✗ fails')}  ${dim('—')}  ${coneViolations} / ${interiorTotal} (${pct(coneViolations, interiorTotal).trim()}) interior vertices have angle ≤ 2π`);

  L.push('');
  L.push(bold('CONE LEMMA BY VERTEX DEGREE') + dim('   (interior-vertex observations)'));
  L.push(dim('  deg │ verts │ interior │ angle>2π │ angle≤2π │ violation'));
  L.push(dim('  ────┼───────┼──────────┼──────────┼──────────┼──────────'));
  for (const d of [...byDeg.keys()].sort((p, q) => p - q)) {
    const b = byDeg.get(d);
    const nAtDeg = degree.filter((x) => x === d).length;
    const rate = b.coneBad === 0 ? green('  clean  ') : yellow(((100 * b.coneBad) / b.interior).toFixed(1).padStart(5) + '%  ');
    const note = d === 7 && b.coneBad === 0 ? dim(' ← neighborly') : '';
    L.push(`   ${d}  │  ${String(nAtDeg).padStart(2)}   │ ${String(b.interior).padStart(7)}  │ ${String(b.coneOk).padStart(7)}  │ ${String(b.coneBad).padStart(7)}  │ ${rate}${note}`);
  }

  L.push('');
  L.push(bold('NOTABLE'));
  L.push(`  closest any torus got to flat   max|δ| = ${cyan(bestFlat.toFixed(4))}`);
  if (minInterior.nInterior === 0) {
    L.push(`  flattest all-on-hull torus      max|δ| = ${cyan(minInterior.flatness.toFixed(4))} ${dim('(0 interior vertices)')}`);
  } else {
    L.push(`  fewest interior vertices seen   ${minInterior.nInterior} ${dim(`(flattest such: max|δ| = ${minInterior.flatness.toFixed(4)})`)}`);
  }
  if (worstCone) L.push(`  worst Cone violation            deg ${worstCone.degree} · δ = ${cyan('+' + worstCone.deficit.toFixed(4))} ${dim(`(sample max|δ| = ${worstCone.flatness.toFixed(4)})`)}`);
  L.push(`  borderline margins              ${borderline} ${dim(`samples within |m| < ${10 * tol} of the hull`)}`);

  if (dumpPath) {
    L.push('');
    L.push(bold('EXPORT'));
    L.push(`  wrote ${dumpCount} tori with ≤ ${dumpMaxInterior} interior vertices  ${dim('→')}  ${dumpPath}`);
    if (flattestOnHull) {
      L.push(dim(`  view the flattest all-on-hull one (max|δ| = ${flattestOnHull.flatness.toFixed(4)}): run`));
      L.push(dim('    npm run dev torus-inspector'));
      L.push(dim('  then append this to the served URL:'));
      L.push(`    ?type=${triang.id}&pos=${flattestOnHull.row}`);
    }
  }

  console.log(L.map(line).join('\n'));
}

// ─────────────────────────────────────────────────────────────────────────────
if (!generate) {
  // STATIC: analyse a fixed CSV population.
  const tori = [];
  for (const path of csvPaths) {
    let text;
    try { text = readFileSync(path, 'utf8'); } catch (e) { console.error(`skip ${path}: ${e.message}`); continue; }
    for (const p of parseEmbeddings(text, triang)) { tori.push(p.positions); if (tori.length >= limit) break; }
    if (tori.length >= limit) break;
  }
  for (const x of tori) { if (isEmbedded(triang, x)) { embedded++; analyse(x); } else notEmbedded++; }
  const status = `${bold(String(embedded))} embedded tori analysed${notEmbedded ? dim(`  ·  ${notEmbedded} skipped (not embedded for type ${triang.id})`) : ''}  ${dim(`· tol ${tol}`)}`;
  render(status);
} else {
  // GENERATE: stream embedded tori by perturbing the pool and flowing back to embedded.
  const seed = a.num('--seed', Date.now() >>> 0);
  const rng = makeRng('xoshiro', seed);
  const pool = [];
  for (const path of csvPaths) {
    try { for (const p of parseEmbeddings(readFileSync(path, 'utf8'), triang)) pool.push(p.positions); } catch { /* skip */ }
  }
  if (!pool.length) { console.error('generate mode needs a non-empty pool; no CSV loaded'); process.exit(1); }

  const energy = (a.flag('--energy') ?? 'cutoff') === 'chord2' ? makeChordLengthSquared(triang) : makeCutOffArea(triang);
  const sigma = logSigma(a.num('--sigma-min', 0.01), a.num('--sigma-max', 0.25), rng);
  const drawSeed = poolSeeds(pool, sigma, rng);
  const attempt = flattenFlowEmbed(triang, () => [], (c) => c.embedded, {
    energy, stepSize: a.num('--step-size', 0.001), maxFlowIters: a.num('--max-flow-iters', 800),
  });

  const out = a.flag('--out') ? resolve(a.flag('--out')) : null;
  if (out) mkdirSync(dirname(out), { recursive: true });
  const deadline = a.has('--mins') ? Date.now() + a.num('--mins', 0) * 60000 : Infinity;
  const reportMs = a.num('--report-secs', 2) * 1000;
  const start = Date.now();
  let lastReport = 0;

  const statusLine = () => {
    const el = Date.now() - start;
    const rate = tries ? `${((100 * embedded) / tries).toFixed(0)}% embedded` : '—';
    const thru = el ? `${(embedded / (el / 1000)).toFixed(0)}/s` : '—';
    return `${bold('GENERATE')}  ${dim('seed')} ${seed}  ${dim('·')}  ${fmtDur(el)}  ${dim('·')}  tries ${tries}  ${dim('·')}  embedded ${bold(String(embedded))} (${rate}, ${thru})${out ? dim(`  ·  → ${out}`) : ''}`;
  };
  const refresh = () => { if (tty) process.stdout.write('\x1b[2J\x1b[3J\x1b[H'); render(statusLine()); };

  let stopping = false;
  const finish = () => { stopping = true; if (tty) process.stdout.write('\x1b[2J\x1b[3J\x1b[H'); render(statusLine()); console.log(line(dim('\n— stopped —'))); process.exit(0); };
  process.on('SIGINT', finish);

  console.log(line(dim(`streaming from a pool of ${pool.length} embedded tori — Ctrl-C to stop\n`)));
  while (!stopping && Date.now() < deadline) {
    tries++;
    const x = drawSeed();
    const cert = attempt(x);                 // mutates x; null if it never reached embedded
    if (cert) {
      embedded++;
      analyse(x);
      if (out) appendFileSync(out, csvRow(x) + '\n');
      pool.push(Float64Array.from(x));        // diffuse the walk
    }
    if (Date.now() - lastReport > reportMs) { refresh(); lastReport = Date.now(); }
  }
  finish();
}
