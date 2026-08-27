/**
 * hunt-hex — an overnight RACE of random walks toward the hexagonal torus ρ = (½, √3/2),
 * triangulation 7. One lineage per seed: each near-ρ seed runs its OWN marching random walk
 * (perturb → re-flatten `project([flat])` → keep only if still EMBEDDED and CLOSER to ρ),
 * interleaved round-robin so all lineages get equal time. Every accepted torus is tagged with
 * its ORIGINAL seed, so afterward we can see who won and the cloud/path each lineage took.
 *
 * Seeds: samples/hex-hunt/seeds.csv (make with the extractor). Outputs to a DATED run folder
 * samples/hex-hunt/<stamp>/ (never clobbers a previous run; override the name with --run NAME):
 *   cloud.csv         — `seedId,rawRe,rawIm,reducedDist` per accepted torus (subsampled + every new
 *                       lineage-best): the moduli trail the demo animates (colored by seed).
 *   champions.csv     — `seedId` + 24 floats, APPENDED for every record torus (the full progress
 *                       history of each lineage — actual configs, never overwritten).
 *   frontier-tori.csv — `seedId` + 24 floats for the whole live frontier, snapshotted each checkpoint.
 *   best.csv          — `seedId` + 24 floats: each lineage's closest torus so far.
 * Prints the race standings periodically. Runs until --max-hours or Ctrl-C (saves on exit).
 *
 *   npm run hunt-hex -- --max-hours 8
 */
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'fs';
import { RICH } from '@core/triangulations';
import { modulus } from '@core/moduli/modulus.ts';
import { reduceModulus, HEXAGONAL } from '@core/moduli/reduce.ts';
import { isEmbedded, clearance } from '@core/embedding/index.ts';
import { flat, maxConeDeficit } from '@core/constraints/flat.ts';
import { project } from '@core/solvers/project.ts';
import { perturb } from '@core/sampling/perturb.ts';
import { mulberry32 } from '@core/sampling/rng.ts';

const args = process.argv.slice(2);
const num = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : Number(args[i + 1]); };
const MAX_HOURS = num('--max-hours', 8);
const M = num('--frontier', 120);              // per-lineage frontier size
const SAMPLE = num('--cloud-sample', 15);      // record 1 in SAMPLE accepts to the cloud
const SEEDS = 'samples/hex-hunt/seeds.csv';                 // shared input (make with the extractor)
const runArg = args.indexOf('--run');
const STAMP = runArg >= 0 ? args[runArg + 1] : new Date().toISOString().slice(0, 16).replace('T', '-').replace(/:/g, '');
const OUT = `samples/hex-hunt/${STAMP}`;                    // dated run folder — never clobbers a previous run
mkdirSync(OUT, { recursive: true });

const HEX = HEXAGONAL;
const held = [flat(RICH)];
const rtau = (p) => reduceModulus(modulus(RICH, p).tau);
const dist = (p) => { const t = rtau(p); return Math.hypot(t[0] - HEX[0], t[1] - HEX[1]); };
const isGood = (p) => maxConeDeficit(RICH, p) < 1e-8 && isEmbedded(RICH, p);
const rng = mulberry32(num('--seed', 20260702));

// ── lineages: one per seed row ──
const seedRows = readFileSync(SEEDS, 'utf8').trim().split('\n')
  .map((l) => Float64Array.from(l.split(',').map(Number))).filter((p) => p.length === 24);
const lineages = seedRows.map((pos, id) => {
  const d = dist(pos);
  return { id, frontier: [{ pos, d }], best: d, bestPos: pos.slice() };
});
writeFileSync(`${OUT}/cloud.csv`, '');                 // fresh cloud (moduli trail for the demo)
writeFileSync(`${OUT}/champions.csv`, '');            // append EVERY record torus (seedId + 24 floats)
console.log(`hunt-hex RACE → ρ=[${HEX[0].toFixed(3)}, ${HEX[1].toFixed(3)}]  |  ${lineages.length} lineages`);
console.log(`  seed dists: ${lineages.map((L) => L.best.toFixed(2)).join(' ')}`);
console.log(`  ${MAX_HOURS}h → ${OUT}/  (cloud · champions · best · frontier-tori;  Ctrl-C saves)`);

const worst = (fr) => fr[fr.length - 1].d;
let globalAccepts = 0;
const recordCloud = (id, t, d) => appendFileSync(`${OUT}/cloud.csv`, `${id},${t[0].toFixed(5)},${t[1].toFixed(5)},${d.toFixed(5)}\n`);

function step(L) {
  const parent = L.frontier[Math.floor(rng() * L.frontier.length)].pos;
  const sigma = Math.exp(Math.log(0.003) + rng() * (Math.log(0.03) - Math.log(0.003)));
  const child = perturb(parent, sigma, rng);
  if (project(child, held).status !== 'converged' || !isGood(child)) return;
  const d = dist(child);
  if (d >= worst(L.frontier)) return;                  // keep only if closer than the lineage's worst
  globalAccepts++;
  const c = child.slice();
  L.frontier.push({ pos: c, d });
  L.frontier.sort((a, b) => a.d - b.d);
  if (L.frontier.length > M) L.frontier.length = M;
  const t = modulus(RICH, c).tau;                      // RAW Teichmüller τ for the plot (dist stays reduced)
  if (globalAccepts % SAMPLE === 0) recordCloud(L.id, t, d);
  if (d < L.best) {
    L.best = d; L.bestPos = c; recordCloud(L.id, t, d);
    appendFileSync(`${OUT}/champions.csv`, `${L.id},` + [...c].join(',') + '\n');   // full torus, never overwritten
  }
}

const saveBest = () => writeFileSync(`${OUT}/best.csv`,
  lineages.map((L) => `${L.id},` + [...L.bestPos].join(',')).join('\n') + '\n');
const saveFrontier = () => writeFileSync(`${OUT}/frontier-tori.csv`,     // the whole live frontier, as tori
  lineages.flatMap((L) => L.frontier.map((e) => `${L.id},` + [...e.pos].join(','))).join('\n') + '\n');
const checkpoint = () => { saveBest(); saveFrontier(); };
process.on('SIGINT', () => { checkpoint(); console.log('\n— saved, exiting —'); standings(); process.exit(0); });

function standings() {
  const rank = [...lineages].sort((a, b) => a.best - b.best);
  console.log('  standings (closest first): ' + rank.slice(0, 6).map((L) => `#${L.id}:${L.best.toExponential(2)}`).join('  '));
}

const t0 = Date.now();
let round = 0;
while ((Date.now() - t0) / 3.6e6 < MAX_HOURS) {
  for (const L of lineages) step(L);
  if (++round % 3000 === 0) {
    checkpoint();
    const el = ((Date.now() - t0) / 3.6e6).toFixed(2);
    const board = [...lineages].sort((a, b) => a.best - b.best)
      .map((L) => `#${String(L.id).padStart(2)}:${L.best.toFixed(3)}`).join('  ');
    console.log(`[${el}h] rounds=${round} accepts=${globalAccepts}  — all lineages, closest first:`);
    console.log(`   ${board}`);
  }
}
checkpoint();
console.log(`\n— done (${MAX_HOURS}h) — ${globalAccepts} accepts`); standings();
