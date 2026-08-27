/**
 * Long-running fiber hunt: roam the fiber {flat ∧ τ = τ₀} looking for the best embedded
 * shapes, checkpointing to CSV so a multi-hour run is never lost and can be resumed.
 *
 *   npm run hunt-fiber -- --torus square --objective balanced --minutes 60
 *   npm run hunt-fiber -- --torus both --objective clearance --minutes 240 --resume
 *
 * Options
 *   --torus      square | hexagonal | both          (default both)
 *   --objective  clearance | inflation | nonplanar | balanced   (default clearance)
 *   --strategy   roam | climb   (default: climb for inflation/nonplanar, roam otherwise —
 *                measured, the best strategy DEPENDS on the objective: roaming wins big for
 *                clearance, climbing wins for inflation)
 *   --min-clearance  reject anything thinner than this (default 0 = the embedded gate only).
 *                Worth setting when chasing inflation: unconstrained, it walks the torus up
 *                against touching itself (clearance ~1e-6).
 *   --minutes    wall-clock budget per torus        (default 10)
 *   --walkers    roamers wandering at once          (default 12)
 *   --hall       how many best shapes to keep       (default 200)
 *   --seed       RNG seed                           (default 1)
 *   --out        output directory                   (default samples/fiber-hunt)
 *   --resume     start from the best row of an existing output file, if present
 *
 * Output: <out>/<torus>-<objective>.csv, one torus per line, best first —
 *   x0,y0,z0, …, x7,y7,z7, score, clearance, volumeRatio, squash, creaseRoomDegrees
 * The first 24 columns are the repo's standard coordinate row, and `parseEmbeddings` ignores
 * the trailing ones, so these files drop straight into the existing viewers and tools.
 *
 * Checkpoints every 30 s, so killing the run at any point leaves a usable file. Output goes
 * under the gitignored /samples by default (raw run output, per the repo convention); copy the
 * ones worth keeping into the tracked data/.
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { SQUARE_FOLD, HEXAGONAL_FOLD } from '@core/sampling/foldedBases.ts';
import { foldTau } from '@core/search/correct-fold.ts';
import { fiberCloud } from '@core/search/fiber-cloud.ts';
import { creaseRoom } from '@core/search/shape.ts';

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
};
const has = (name) => argv.includes(`--${name}`);

const WHICH = opt('torus', 'both');
const OBJECTIVE = opt('objective', 'clearance');
// The best strategy depends on the objective (measured), so default per objective rather than
// making the caller remember: inflation/nonplanar are smooth climbs, clearance is a hunt.
const STRATEGY = opt('strategy', OBJECTIVE === 'inflation' || OBJECTIVE === 'nonplanar' ? 'climb' : 'roam');
const MIN_CLEARANCE = Number(opt('min-clearance', 0));
const MINUTES = Number(opt('minutes', 10));
const WALKERS = Number(opt('walkers', 12));
const HALL = Number(opt('hall', 200));
const RNG_SEED = Number(opt('seed', 1));
// Raw/overnight run output lives under the gitignored /samples, per the repo convention;
// curated keepers get copied into the tracked data/ by hand.
const OUT = resolve(process.cwd(), opt('out', 'samples/fiber-hunt'));
const RESUME = has('resume');
const CHECKPOINT_MS = 30_000;

if (!['clearance', 'inflation', 'nonplanar', 'balanced'].includes(OBJECTIVE)) {
  console.error(`unknown --objective '${OBJECTIVE}'`);
  process.exit(1);
}
if (!['roam', 'climb'].includes(STRATEGY)) {
  console.error(`unknown --strategy '${STRATEGY}'`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const ALL = { square: SQUARE_FOLD, hexagonal: HEXAGONAL_FOLD };
const chosen = WHICH === 'both' ? Object.keys(ALL) : [WHICH];
for (const name of chosen) {
  if (!ALL[name]) { console.error(`unknown --torus '${name}'`); process.exit(1); }
}

/** The seed: the resumed best if asked for and available, else the inflation ladder's last rung. */
function seedFor(name, file) {
  if (RESUME && existsSync(file)) {
    const first = readFileSync(file, 'utf8').split('\n').find((l) => l.trim());
    if (first) {
      const v = first.split(',').map(Number).slice(0, 24);
      if (v.length === 24 && v.every((x) => Number.isFinite(x))) {
        console.log(`  resuming from the best row of ${file}`);
        return Float64Array.from(v);
      }
    }
  }
  const rows = readFileSync(`demos/steve-folded-tori/data/${name}.csv`, 'utf8').trim().split('\n');
  return Float64Array.from(rows[rows.length - 1].split(',').slice(5).map(Number));
}

const fmt = (n) => n.toExponential(3);

for (const name of chosen) {
  const base = ALL[name];
  const floorTag = MIN_CLEARANCE > 0 ? `-clr${MIN_CLEARANCE.toExponential(0)}` : '';
  const file = resolve(OUT, `${name}-${OBJECTIVE}-${STRATEGY}${floorTag}.csv`);
  console.log(`\n== ${base.label} · ${OBJECTIVE} · ${STRATEGY} · ${MINUTES} min`
    + (MIN_CLEARANCE > 0 ? ` · clearance floor ${MIN_CLEARANCE.toExponential(0)}` : ''));

  const cloud = fiberCloud(base.triang, foldTau(base), seedFor(name, file), {
    walkers: WALKERS, hallSize: HALL, trialsPerStep: 400, seed: RNG_SEED,
    objective: OBJECTIVE, strategy: STRATEGY, minClearance: MIN_CLEARANCE,
  });

  function save() {
    const lines = cloud.hall.map((m) => [
      ...m.positions,
      m.score, m.clearance, m.volumeRatio, m.squash,
      (creaseRoom(base.triang, m.positions) * 180) / Math.PI,
    ].join(','));
    writeFileSync(file, lines.join('\n') + '\n');
  }

  if (!cloud.seedMeetsFloor) {
    console.log(`  ! the seed's clearance ${fmt(cloud.seedClearance)} is below the floor `
      + `${fmt(MIN_CLEARANCE)} — until the search clears the bar, "best" is still the seed`);
  }

  const t0 = Date.now();
  const deadline = t0 + MINUTES * 60_000;
  let nextCheckpoint = t0 + CHECKPOINT_MS;
  let nextReport = t0 + 10_000;
  while (Date.now() < deadline) {
    cloud.step();
    const now = Date.now();
    if (now >= nextCheckpoint) { save(); nextCheckpoint = now + CHECKPOINT_MS; }
    if (now >= nextReport) {
      const b = cloud.best;
      const mins = ((now - t0) / 60000).toFixed(1);
      console.log(
        `  ${mins.padStart(5)}m  ${(cloud.tries / 1000).toFixed(0).padStart(6)}k trials  `
        + `score ${fmt(b.score)}  clearance ${fmt(b.clearance)}  inflation ${fmt(b.volumeRatio)}  `
        + `squash ${b.squash.toFixed(3)}`
        + (STRATEGY === 'roam' ? `  roamed ${Math.max(...cloud.walkerDistances()).toFixed(2)}` : ''),
      );
      nextReport = now + 10_000;
    }
  }
  save();
  const b = cloud.best;
  console.log(`  done: ${cloud.tries} trials, ${Math.round((100 * cloud.accepted) / cloud.tries)}% accepted`);
  console.log(`  best ${OBJECTIVE} ${fmt(b.score)} — clearance ${fmt(b.clearance)}, inflation ${fmt(b.volumeRatio)}, squash ${b.squash.toFixed(4)}`);
  console.log(`  → ${file}  (${cloud.hall.length} shapes, best first)`);
}
