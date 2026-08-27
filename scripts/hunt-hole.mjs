/**
 * hunt-hole — search for a flat torus you can SEE THROUGH, headless.
 *
 *   npm run hunt-hole -- --torus hexagonal --minutes 60
 *   npm run hunt-hole -- --torus hexagonal --seed renders/steve-paper-tori/hex.obj --minutes 240
 *
 * The headless twin of `demos/hole-hunt`, for runs longer than a browser tab. Same two-clock
 * design, and the reason for it is the whole difficulty of this search:
 *
 *   THE SCORE CANNOT BE CLIMBED. The visible hole radius (`search/shape.holeSize`) is exactly
 *   0 on every closed torus, so there is no gradient anywhere except on the tori that already
 *   win. Signed relaxations that would supply one were tried and every one was gamed the same
 *   way — near-planar tori let a rod slide past EDGE-ON, which scores beautifully and is not
 *   a hole. So this ROAMS: walkers take every verified step regardless of score, needing no
 *   gradient, while a separate clock watches for holes and archives them. Roaming ranks on
 *   cheap `clearance`; the hole detector costs ~100× a step and no roamer ever reads it.
 *
 *   HOLES ARE SEEN EDGE-ON. Measured over every flat embedded torus that has one, the
 *   see-through direction sits 85–89° from the flattest axis — never at the broad face — so
 *   `holeSize` aims a dense band at that equator. Direction count matters more than you would
 *   expect: `renders/steve-paper-tori/hex.obj` scores 0 at the 120-direction default and 1.7e-3 at
 *   400+, so a thin hole is invisible to a coarse scan. Hence `--dirs`/`--res`, and hence the
 *   REFINEMENT PASS: every archived find is re-scored at `--verify-dirs`/`--verify-res` before
 *   it is written, and both numbers are recorded. Believe a find only if it holds up.
 *
 * Options
 *   --torus      square | hexagonal              (default hexagonal)
 *   --seed PATH  where to start: a .obj, or a .csv whose LAST row's last 24 numbers are a
 *                configuration. Default: that torus's inflation ladder's last rung
 *                (demos/steve-folded-tori/data/<torus>.csv). Starting from a torus that ALREADY has
 *                a hole is usually the better move — see the note under --free.
 *   --free       let τ drift off τ₀ (default: HELD, so finds stay Lander's tori)
 *   --strategy   roam | climb                    (default roam — see above)
 *   --minutes    wall-clock budget               (default 30)
 *   --walkers    roamers at once                 (default 6)
 *   --dirs/--res hunting detector                (default 300 / 96)
 *   --verify-dirs/--verify-res  refinement pass  (default 1200 / 256)
 *   --min-sep    archive dedup distance in the chart (default 0.05)
 *   --rng N      RNG seed                        (default: clock — vary it to explore anew)
 *   --out DIR    output directory                (default samples/hole-hunt)
 *
 * Output (checkpointed every 30 s, so killing the run always leaves a usable file):
 *   <out>/<torus>-hole[-free].csv — one torus per line, biggest hole first,
 *     x0,y0,z0, …, x7,y7,z7, hole, holeVerified, clearance, tauReHat, tauImHat, dx,dy,dz
 *   The first 24 columns are the repo's standard row, so `parseEmbeddings` and the viewers
 *   take these files directly; `<out>/<torus>-best.obj` is the top find, ready for steve-paper-tori.
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { makeArgs, csvRow } from './lib/cli.mjs';
import { SQUARE_FOLD, HEXAGONAL_FOLD } from '@core/sampling/foldedBases.ts';
import { foldTau } from '@core/search/correct-fold.ts';
import { fiberCloud } from '@core/search/fiber-cloud.ts';
import { bestHoleView, holeAlong, holeSize } from '@core/search/shape.ts';
import { totalArea } from '@core/moduli/develop.ts';
import { measure } from '@core/search/measure.ts';
import { makePaperTorus } from '@core/configuration/paperTorus.ts';
import { paperToObj, paperFromObj } from '@display/mesh/obj.ts';
import { ALL_TORI } from '@core/triangulations/index.ts';

const a = makeArgs(process.argv);
const BASES = { square: SQUARE_FOLD, hexagonal: HEXAGONAL_FOLD };
const WHICH = a.flag('--torus') ?? 'hexagonal';
if (!BASES[WHICH]) { console.error(`unknown --torus '${WHICH}' (square | hexagonal)`); process.exit(1); }
const base = BASES[WHICH];
const triang = base.triang;
const target = foldTau(base);

const HOLD = !a.has('--free');
const STRATEGY = a.flag('--strategy') ?? 'roam';
const MINUTES = a.num('--minutes', 30);
const WALKERS = a.num('--walkers', 6);
const DIRS = a.num('--dirs', 300), RES = a.num('--res', 96);
const VDIRS = a.num('--verify-dirs', 1200), VRES = a.num('--verify-res', 256);
const MIN_SEP = a.num('--min-sep', 0.05);
const RNG = a.num('--rng', Date.now() >>> 0);
const OUT = resolve(process.cwd(), a.flag('--out') ?? 'samples/hole-hunt');
mkdirSync(OUT, { recursive: true });
const FILE = resolve(OUT, `${WHICH}-hole${HOLD ? '' : '-free'}.csv`);
const OBJ = resolve(OUT, `${WHICH}-best.obj`);

// ---- the seed ----
function loadSeed() {
  const path = a.flag('--seed');
  if (!path) {
    const rows = readFileSync(`demos/steve-folded-tori/data/${WHICH}.csv`, 'utf8').trim().split('\n');
    console.log(`  seed: ${WHICH} ladder's last rung (of ${rows.length})`);
    return Float64Array.from(rows[rows.length - 1].split(',').slice(5).map(Number));
  }
  const text = readFileSync(resolve(path), 'utf8');
  if (path.endsWith('.obj')) {
    const p = paperFromObj(text, ALL_TORI);        // identifies its own triangulation
    if (p.triang.id !== triang.id) {
      console.error(`--seed ${path} is ${p.triang.id}, but --torus ${WHICH} is ${triang.id}`);
      process.exit(1);
    }
    console.log(`  seed: ${path}`);
    return p.positions;
  }
  const rows = text.trim().split('\n').filter(Boolean);
  const v = rows[rows.length - 1].split(',').map(Number);
  console.log(`  seed: last row of ${path}`);
  return Float64Array.from(v.slice(v.length - 24));
}
const seed = loadSeed();

const m0 = measure(triang, seed);
if (!m0.embedded || m0.coneDeficit > 1e-9) {
  console.error(`  ! the seed is not a flat embedded torus (deficit ${m0.coneDeficit.toExponential(1)}, embedded ${m0.embedded})`);
  process.exit(1);
}
console.log(`\n== ${base.label} · ${triang.id} · hole hunt · ${MINUTES} min · ${STRATEGY}`
  + ` · τ ${HOLD ? `held at [${target.map((v) => v.toFixed(4))}]` : 'FREE'} · rng ${RNG}`);
console.log(`  seed: clearance ${m0.clearance.toExponential(2)},`
  + ` hole ${holeSize(triang, seed, { directions: VDIRS, resolution: VRES }).toExponential(3)}`
  + ` (at ${VDIRS}/${VRES})`);

// ---- the archive: every holed torus, kept distinct ----
// The walk leaves a hole as readily as it finds one, so a find has to be captured the moment
// it appears. Deduplicated by distance in the chart, so this fills with genuinely different
// tori rather than a thousand near-copies of one lucky step.
const finds = [];
const MAX_FINDS = 60;

function chartDist(x, y) {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += (x[i] - y[i]) ** 2;
  return Math.sqrt(s);
}

function archive(f) {
  const near = finds.findIndex((g) => chartDist(g.positions, f.positions) < MIN_SEP);
  if (near >= 0) {
    if (f.size <= finds[near].size) return false;
    finds[near] = f;
  } else {
    finds.push(f);
  }
  finds.sort((x, y) => y.size - x.size);
  if (finds.length > MAX_FINDS) finds.length = MAX_FINDS;
  return true;
}

const cloud = fiberCloud(triang, target, seed, {
  walkers: WALKERS, hallSize: 20, trialsPerStep: 40, seed: RNG,
  objective: 'clearance', strategy: STRATEGY, holdModulus: HOLD,
});

// ---- the hole clock, running beside the walk ----
// A full scan is ~DIRS rasterizations; re-checking the direction a walker last saw a hole
// along is ONE. So each walker keeps its last good direction, is re-checked cheaply every
// batch (which TRACKS a hole while the walk is still on it), and gets a full scan only every
// so often, to discover new ones.
const lastDir = [];
let sweep = 0;
const FULL_SCAN_EVERY = 6;

function checkWalker(i, full) {
  const p = cloud.walkerPositions(i);
  const area = totalArea(triang, p);
  if (!(area > 0)) return;
  let size = 0;
  let dir = lastDir[i] ?? null;
  if (!full && dir) size = holeAlong(triang, p, dir, RES) / Math.sqrt(area);
  if (size <= 0) {
    if (!full) return;                              // cheap re-check failed; wait for the sweep
    const view = bestHoleView(triang, p, { directions: DIRS, resolution: RES });
    size = view.size;
    dir = view.direction;
  }
  lastDir[i] = size > 0 ? dir : null;
  if (size <= 0) return;
  const r = measure(triang, p);
  if (archive({ positions: Float64Array.from(p), size, clearance: r.clearance,
                tauHat: [r.tauHat[0], r.tauHat[1]], dir, atTrial: cloud.tries })) {
    console.log(`  + hole ${size.toExponential(3)} at ${(cloud.tries / 1000).toFixed(0)}k trials`
      + ` (clearance ${r.clearance.toExponential(2)}, ${finds.length} kept)`);
  }
}

// ---- write: refine every find before believing it ----
function save() {
  if (finds.length === 0) { writeFileSync(FILE, ''); return; }
  const scored = finds.map((f) => ({
    ...f, verified: holeSize(triang, f.positions, { directions: VDIRS, resolution: VRES }),
  }));
  scored.sort((x, y) => y.verified - x.verified);
  writeFileSync(FILE, scored.map((f) => [
    csvRow(f.positions), f.size, f.verified, f.clearance, f.tauHat[0], f.tauHat[1], ...f.dir,
  ].join(',')).join('\n') + '\n');
  if (scored[0].verified > 0) {
    writeFileSync(OBJ, paperToObj(makePaperTorus(triang, scored[0].positions), `${WHICH}-hole`));
  }
  return scored[0];
}

const t0 = Date.now();
const deadline = t0 + MINUTES * 60_000;
let nextCheckpoint = t0 + 30_000, nextReport = t0 + 15_000;
while (Date.now() < deadline) {
  for (let k = 0; k < 20; k++) cloud.step();
  const full = sweep % WALKERS;
  for (let i = 0; i < WALKERS; i++) checkWalker(i, i === full && sweep % FULL_SCAN_EVERY === 0);
  sweep++;

  const now = Date.now();
  if (now >= nextCheckpoint) { save(); nextCheckpoint = now + 30_000; }
  if (now >= nextReport) {
    const best = finds[0];
    console.log(`  ${((now - t0) / 60000).toFixed(1).padStart(5)}m`
      + ` ${(cloud.tries / 1000).toFixed(0).padStart(6)}k trials`
      + `  best hole ${best ? best.size.toExponential(3) : '— none yet'}`
      + `  ${finds.length} kept  roamed ${Math.max(...cloud.walkerDistances()).toFixed(2)}`);
    nextReport = now + 15_000;
  }
}

const best = save();
console.log(`\n  done: ${cloud.tries} trials, ${finds.length} distinct holed tori`);
if (best) {
  console.log(`  best hole ${best.verified.toExponential(3)} (verified at ${VDIRS}/${VRES};`
    + ` ${best.size.toExponential(3)} while hunting) — clearance ${best.clearance.toExponential(2)},`
    + ` τ̂ [${best.tauHat.map((v) => v.toFixed(4))}]`);
  console.log(`  → ${FILE}\n  → ${OBJ}`);
} else {
  console.log(`  no hole opened. Try --minutes higher, a different --rng, --free, or a`
    + ` --seed that already has one.`);
}
