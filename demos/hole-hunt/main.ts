/**
 * hole-hunt — search, starting from Lander's family, for a flat torus you can SEE THROUGH.
 *
 * The 3-D view is where the search IS RIGHT NOW — one roamer's current torus — and the panel
 * beside it is that torus's SILHOUETTE, the sixteen triangles projected down the direction
 * that shows the most. A hole is open exactly when you can see a gap in it enclosed by the
 * outline; the panel turns green and says OPEN when one does.
 *
 * Watching the live roamer rather than the best-so-far matters here. The score is 0 on every
 * closed torus, so until something actually opens, "best" is legitimately frozen on the seed
 * and looks like the search is stuck — it isn't, it just has nothing to rank yet.
 *
 * HOW IT SEARCHES, and why it is a lottery rather than a climb. The score is the exact radius
 * of the visible hole (`search/shape.holeSize`), which is 0 on every closed torus — so there
 * is NOTHING to climb, and a hill-climber would just wander. Several signed relaxations that
 * would have provided a gradient were tried and every one was gamed the same way: near-planar
 * tori let a rod slide past edge-on, which scores beautifully and is not a hole. So this uses
 * ROAMERS instead: walkers that take every verified step regardless of score, needing no
 * gradient at all, while the hall records anything that does open. That is a broad random
 * search with an exact filter, and it is honest about being one.
 *
 * WHETHER TO STAY IN THE FAMILY is the switch that matters, and it defaults to HELD, because
 * the family turns out to contain holes already: the hexagonal torus saved out of the earlier
 * search scores 0.00421 and its inflation ladder's last rung scores 0.00202. Freeing the
 * modulus lets τ drift off τ₀ while keeping flatness and embeddedness, which widens the search
 * but leaves the theorem's tori behind. The readout shows τ̂ live either way.
 *
 * WHY HOLES ARE HARD TO SEE HERE, and it is not intuitive: measured over flat embedded tori
 * that have one, the see-through direction sits 85–89° from the flattest axis EVERY time. You
 * look through these things edge-on, along the plane — never at the broad face. Sampling
 * directions uniformly misses them almost always (13 uniform directions found a known hole 0
 * times out of 13), which is why `shape.holeSize` now aims a dense band at that equator.
 *
 * STARTING OVER. R advances to the NEXT SEED in this torus's pool (shift-R goes back), with a
 * fresh RNG. Both halves matter: a restart from the same configuration explores the same
 * neighbourhood however new its random numbers are, and this fiber is 17-dimensional, so one
 * starting point samples almost none of it. C instead restarts FROM the saved hole currently
 * on screen, to work the area around a good find. Either way the archive of finds survives.
 *
 * FINDS ARE KEPT. The walk leaves a hole as readily as it finds one, so every holed torus is
 * archived the moment it appears — deduplicated by distance in the chart, so the archive fills
 * with genuinely different tori rather than a thousand near-copies of one lucky step — and
 * mirrored into localStorage, so a reload or a stray restart cannot throw one away. ← / →
 * browse them (Esc returns to the live walk), D saves one, shift-D saves all, X clears this
 * torus's, shift-X clears all. A LAUNCH ALWAYS OPENS ON THE WALK, never on an archived find —
 * otherwise a run started from a near-flat seed opens on a grown torus from a previous
 * session and looks like it began somewhere it did not.
 *
 * FINDS ARE KEPT PER TRIANGULATION, and that is not bookkeeping. Eight points mean nothing
 * without the face list that joins them — read the square torus's configurations with the
 * hexagonal face list and you get a different, wildly self-intersecting surface, with the
 * square's hole size still reported beside it. So a find carries its `triangId`, and the
 * browser only ever shows you the current torus's.
 *
 * Opens on the HEXAGONAL side (`?torus=square` for the other); T switches either way. The hexagonal search
 * starts from `renders/steve-paper-tori/hex.obj` rather than its ladder rung — see `hexSeed` for
 * why that matters more than it sounds like it should.
 *
 *   M      hold the modulus ↔ let it drift   (restarts the search; HELD by default)
 *   T      switch torus: square (v8-7) ↔ hexagonal (v8-3)
 *   G      strategy: climb ↔ roam
 *   SPACE  pause / resume · D  save the best as CSV · J  save it as OBJ
 *   X      clear this torus's finds · shift-X  clear every torus's
 *   O      what the walk ranks by: inflation → nonplanar → clearance → balanced
 *   F      clearance floor: 0 → 1e-4 → 5e-4 → 1e-3, so growth cannot run it into itself
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { SQUARE_FOLD, HEXAGONAL_FOLD, type FoldedBase } from '@core/sampling/foldedBases.ts';
import { foldTau } from '@core/search/correct-fold.ts';
import type { CloudStrategy, CloudObjective } from '@core/search/fiber-cloud.ts';
import { makePaperTorus } from '@core/configuration/paperTorus.ts';
import { makeTorusView } from '@display/viewer/TorusView';
import { downloadObj, paperFromObj } from '@display/mesh/obj';
import { ALL_TORI } from '@core/triangulations';
import { measure } from '@core/search/measure.ts';
import type { InMessage, OutMessage, UpdateMessage, Find } from './worker.ts';
import squareLadder from '../steve-folded-tori/data/square.csv?raw';
import hexagonalLadder from '../steve-folded-tori/data/hexagonal.csv?raw';
import hexBest from '../../renders/steve-paper-tori/hex.obj?raw';
import square2Obj from '../../renders/steve-paper-tori/square2.obj?raw';
import hexRhoPool from '../../data/hex-rho-type3.csv?raw';

/** Rung k of an inflation ladder (1-based; k beyond the end clamps to the last). Column 0 is
 *  the push-off height t and the configuration starts at column 5. */
const rung = (text: string, k: number): { t: number; positions: number[] } => {
  const rows = text.trim().split('\n').filter(Boolean);
  const cols = rows[Math.min(k, rows.length) - 1].split(',');
  return { t: Number(cols[0]), positions: cols.slice(5).map(Number) };
};
const lastRung = (t: string) => rung(t, Number.MAX_SAFE_INTEGER).positions;

/**
 * EACH TORUS GETS A POOL OF SEEDS, NOT ONE, and the reason is the fiber's size. A restart from
 * the same configuration explores the same neighbourhood however fresh its RNG is, and the
 * fiber here is 17-dimensional — one starting point samples almost none of it. R now advances
 * to the NEXT seed in the pool, so "restart elsewhere" relocates rather than re-rolls.
 *
 * WHY NOT JUST THE LADDER RUNG. The square ladder climbs 160 rungs to clearance 1.8e-3, so its
 * last rung is a fine place to start. The hexagonal one stops after 5, at 1.3e-4 — and a fiber
 * walk needs roughly 1e-3 of clearance to take a step, below which the projector's own drift
 * carries every trial out of the embedded region and the walkers sit still. So the hexagonal
 * pool is made of tori that were found, not marched to; the ladder rung is included last, as
 * the honest starting point of the family rather than a useful one.
 *
 * The pool entries are genuinely far apart — the `data/hex-rho-type3.csv` tori sit ~3.8 from
 * `hex.obj` in the chart, against the ~0.05 that counts as "a different torus" for the
 * archive — so these are different regions of the fiber, not variations on one shape.
 */
interface Seed { label: string; positions: number[] }

/** Rows of a plain 24-column CSV (the repo's standard coordinate row). */
const csvSeeds = (text: string, tag: string): Seed[] =>
  text.trim().split('\n').filter(Boolean).map((line, i) => ({
    label: `${tag} #${i}`,
    positions: line.split(',').map(Number).slice(0, 24),
  }));

const objSeed = (text: string, tag: string): Seed[] => {
  try {
    return [{ label: tag, positions: Array.from(paperFromObj(text, ALL_TORI).positions) }];
  } catch (err) {
    console.warn(`${tag} unreadable, skipping it`, err);
    return [];
  }
};

/** A ladder rung as a seed, labelled by the push-off height it sits at. */
const rungSeed = (text: string, k: number): Seed => {
  const r = rung(text, k);
  return { label: `ladder t=${r.t.toFixed(2)}`, positions: r.positions };
};

/**
 * THE POOL RUNS NEAR-FLAT FIRST, because growing out of the fold is the strongest way to
 * reach a hole and it is where this search starts by default. Measured from the hexagonal
 * ladder's FIRST rung (t=0.01, inflation 0.00087, squash 0.017), twenty seconds of
 * `inflation`/`climb` reached inflation 0.0126 and squash 0.36 — more inflated than
 * `hex.obj`, which took a 1.37-long fiber roam to reach — with a 3.2e-3 hole. The same seed
 * under `clearance`/`roam` barely moved and opened nothing. Then come the found tori, which
 * start already grown; `hex.obj` last, since it is one point of one region.
 */
const BASES: { base: FoldedBase; name: string; seeds: Seed[] }[] = [
  {
    base: SQUARE_FOLD, name: 'square (τ=i, v8-7)',
    seeds: [
      rungSeed(squareLadder, 1), rungSeed(squareLadder, 5), rungSeed(squareLadder, 20),
      { label: 'ladder rung (last)', positions: lastRung(squareLadder) },
      ...objSeed(square2Obj, 'square2.obj'),
    ],
  },
  {
    base: HEXAGONAL_FOLD, name: 'hexagonal (τ=ρ, v8-3)',
    seeds: [
      rungSeed(hexagonalLadder, 1), rungSeed(hexagonalLadder, 3),
      { label: 'ladder rung (last)', positions: lastRung(hexagonalLadder) },
      ...csvSeeds(hexRhoPool, 'hex-rho-type3'),
      ...objSeed(hexBest, 'hex.obj'),
    ],
  },
];

/** Which seed of the current torus's pool the next launch starts from. */
const seedIdx = BASES.map(() => 0);

for (const b of BASES) {
  const lines = b.seeds.map((s) => {
    const m = measure(b.base.triang, Float64Array.from(s.positions));
    return `    ${s.label.padEnd(20)} clearance ${m.clearance.toExponential(2)}`
      + `  embedded ${m.embedded}  deficit ${m.coneDeficit.toExponential(1)}`;
  });
  console.log(`${b.name} — ${b.seeds.length} seeds\n${lines.join('\n')}`);
}

// ---- scene ----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101014);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(2.2, -2.6, 1.8);
camera.up.set(0, 0, 1);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(2, -3, 6); scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.4); fill.position.set(-3, 2, -4); scene.add(fill);

// Hexagonal by default — the open case. `?torus=square` for the other one; T still switches.
let baseIdx = /^squ/i.test(new URLSearchParams(location.search).get('torus') ?? '') ? 0 : 1;
/**
 * WHAT THE WALK RANKS BY — the switch that decides what kind of search this is, and the two
 * settings want opposite walks:
 *
 *   'inflation' / 'nonplanar' + climb   GROW the torus away from the fold. This is the default,
 *       and from a near-flat seed it is by far the stronger move: measured from the hexagonal
 *       ladder's first rung, twenty seconds took inflation 0.00087 → 0.0126 and opened a
 *       3.2e-3 hole, while `clearance`/`roam` from the same seed opened nothing at all.
 *   'clearance' + roam   hunt for pockets at whatever shape you are already in. The right
 *       instrument once you are OUT of the plane and want a fatter version of the same torus.
 *
 * Growth and clearance are antagonistic: inflating unchecked walks the torus right up against
 * touching itself (clearance fell to 3.7e-5 in that run, against `hex.obj`'s 1.5e-3). `minClearance`
 * is the counterweight — F raises the floor — but note the seed is exempt from it, so a floor
 * above the seed's own clearance can leave the search with nothing that qualifies.
 */
let objective: CloudObjective = 'inflation';
let minClearance = 0;
const FLOORS = [0, 1e-4, 5e-4, 1e-3];
/** climb for the growth objectives, roam for clearance — measured, and they point opposite ways. */
const strategyFor = (o: CloudObjective): CloudStrategy =>
  o === 'inflation' || o === 'nonplanar' ? 'climb' : 'roam';
let strategy: CloudStrategy = strategyFor(objective);
let holdModulus = true;       // stay in the family — the hexagonal member already has a hole
let running = true;
let latest: UpdateMessage | null = null;
let view = makeTorusView(BASES[0].base.triang, {
  surface: { style: 'plain', color: 0xd9c48a }, creases: { radius: 0.006 },
  corners: { radius: 0.02 }, center: true,
});
scene.add(view.group);

let worker: Worker | null = null;
/** Bumped every launch so each restart is a genuinely different walk, not a replay. */
let runSeed = Math.floor(Math.random() * 1e9);

function launch(from?: number[]): void {
  browsing = false;                        // a new run always opens on the walk itself
  worker?.terminate();
  scene.remove(view.group);
  view.dispose();
  const { base, seeds } = BASES[baseIdx];
  const seed = seeds[seedIdx[baseIdx] % seeds.length].positions;
  runSeed = (runSeed + 0x9e3779b1) >>> 0;      // a new walk every time
  view = makeTorusView(base.triang, {
    surface: { style: 'plain', color: 0xd9c48a }, creases: { radius: 0.006 },
    corners: { radius: 0.02 }, center: true,
  });
  scene.add(view.group);
  latest = null;
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<OutMessage>) => {
    const m = e.data;
    if (m.kind === 'update') { latest = m; dirty = true; }
    else if (m.kind === 'find') { remember(m.find); }
    else saveText(`hole-hunt-${BASES[baseIdx].name.split(' ')[0]}-holes.csv`,
      m.rows.map((r: number[]) => r.join(',')).join('\n') + '\n');
  };
  const msg: InMessage = {
    kind: 'start', triangId: base.triang.id, target: foldTau(base) as [number, number],
    seed: from ?? seed, strategy, objective, minClearance, holdModulus, rngSeed: runSeed,
  };
  worker.postMessage(msg);
  running = true;
  syncStatus();
}

/**
 * Holed tori found so far, KEPT PER TRIANGULATION. The walk leaves a hole as readily as it
 * finds one, so these are mirrored into localStorage — a reload, or an accidental restart,
 * would otherwise throw away the very thing the search is for.
 *
 * One archive shared by both tori was a bug, and an instructive one: eight points mean nothing
 * without the face list that joins them, so the square's configurations, browsed while the
 * hexagonal torus was loaded, were drawn with hexagonal faces. That surface is a genuinely
 * different — and wildly self-intersecting — object, while the panel went on reporting the
 * SQUARE find's recorded hole size beside it. A find is a (triangulation, positions) pair or
 * it is nothing, so the store is now keyed by triangulation id and the browser only ever sees
 * the current torus's finds.
 */
const archives: Record<string, Find[]> = {};
let holeIdx = 0;
/** v2: the v1 store held untagged finds that cannot be attributed to a torus. */
const STORE_KEY = 'hole-hunt-finds-v2';

/** The current torus's finds — the only ones it is meaningful to draw or score. */
function currentHoles(): Find[] {
  return archives[BASES[baseIdx].base.triang.id] ?? [];
}

function loadHoles(): void {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, Find[]>) : {};
    for (const [id, list] of Object.entries(parsed)) {
      // Only keep entries that agree with the key they are filed under, and COLLAPSE what is
      // already stored through the same dedup the live archive uses. Self-healing on purpose:
      // a run that duplicated finds leaves sixty copies of one torus behind, and they should
      // fold back into one on the next load rather than needing the archive cleared by hand.
      archives[id] = [];
      for (const f of list.filter((g) => g.triangId === id).sort((a, b) => b.size - a.size)) {
        if (!archives[id].some((g) => chartDist(g.positions, f.positions) < MIN_SEP)) {
          archives[id].push(f);
        }
      }
    }
    try { localStorage.setItem(STORE_KEY, JSON.stringify(archives)); } catch { /* ignore */ }
  } catch { /* leave the archive empty */ }
  try { localStorage.removeItem('hole-hunt-finds'); } catch { /* ignore */ }
}

/**
 * How far apart two configurations are in the chart — the same measure the worker dedups by,
 * so the page and the search agree on what counts as "a different torus".
 */
function chartDist(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

/**
 * The page keeps its OWN deduplicated archive, and has to: the worker's is per-run (every
 * restart is a new worker), while this one persists across runs and reloads, so identical
 * finds arrive from successive walks over the same ground. A find within `MIN_SEP` of one
 * already held replaces it only if it is bigger — so the archive fills with genuinely
 * different tori rather than sixty views of one lucky step.
 */
const MIN_SEP = 0.05;

function remember(f: Find): void {
  const list = archives[f.triangId] ?? (archives[f.triangId] = []);
  const near = list.findIndex((g) => chartDist(g.positions, f.positions) < MIN_SEP);
  if (near >= 0) {
    if (f.size <= list[near].size) return;      // a worse view of a torus already held
    list[near] = f;
  } else {
    list.push(f);
  }
  list.sort((a, b) => b.size - a.size);
  if (list.length > 60) list.length = 60;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(archives)); } catch { /* full or blocked */ }
  dirty = true;
}
/** One saved line: the 24-float coordinate row, then the hole's size and where it was seen. */
const holeRow = (f: Find) =>
  [...f.positions, f.size, f.clearance, f.tauHat[0], f.tauHat[1], ...f.direction].join(',');

function saveText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ---- the silhouette panel: what the search is looking through ----
const shot = document.createElement('canvas');
shot.width = shot.height = 300;
shot.style.cssText = 'position:fixed;right:12px;top:12px;z-index:10;width:300px;height:300px;'
  + 'background:#16161c;border:1px solid #333;border-radius:8px';
document.body.appendChild(shot);
const shotLabel = document.createElement('div');
shotLabel.style.cssText = 'position:fixed;right:12px;top:318px;z-index:10;width:300px;text-align:center;'
  + 'color:#8c8c95;font:11px/1.5 system-ui,sans-serif';
document.body.appendChild(shotLabel);

function drawSilhouette(u: UpdateMessage): void {
  const holes = currentHoles();
  const kept = browsing ? holes[Math.min(holeIdx, holes.length - 1)] : undefined;
  const w = kept
    ? { positions: kept.positions, hole: kept.size, direction: kept.direction }
    : u.live;
  const ctx = shot.getContext('2d')!;
  const S = shot.width;
  ctx.clearRect(0, 0, S, S);
  const p = w.positions;
  const d = w.direction;
  const t = Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const e1r = [t[1]*d[2]-t[2]*d[1], t[2]*d[0]-t[0]*d[2], t[0]*d[1]-t[1]*d[0]];
  const l = Math.hypot(e1r[0], e1r[1], e1r[2]);
  const e1 = [e1r[0]/l, e1r[1]/l, e1r[2]/l];
  const e2 = [d[1]*e1[2]-d[2]*e1[1], d[2]*e1[0]-d[0]*e1[2], d[0]*e1[1]-d[1]*e1[0]];
  const V = p.length / 3;
  const q: [number, number][] = [];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let v = 0; v < V; v++) {
    const a = p[3*v], b = p[3*v+1], c = p[3*v+2];
    const uu = a*e1[0]+b*e1[1]+c*e1[2], vv = a*e2[0]+b*e2[1]+c*e2[2];
    q.push([uu, vv]);
    x0 = Math.min(x0, uu); x1 = Math.max(x1, uu); y0 = Math.min(y0, vv); y1 = Math.max(y1, vv);
  }
  const pad = 0.1 * Math.max(x1-x0, y1-y0);
  const sc = (S - 20) / (Math.max(x1-x0, y1-y0) + 2*pad);
  const cx = (x0+x1)/2, cy = (y0+y1)/2;
  const X = (u2: number) => S/2 + (u2 - cx) * sc;
  const Y = (v2: number) => S/2 - (v2 - cy) * sc;

  // the shadow, filled opaquely: any gap you can see IS the hole
  ctx.fillStyle = w.hole > 0 ? '#7fd6a0' : '#d9c48a';
  const tri = BASES[baseIdx].base.triang.triangles;
  for (const [a, b, c] of tri) {
    ctx.beginPath();
    ctx.moveTo(X(q[a][0]), Y(q[a][1]));
    ctx.lineTo(X(q[b][0]), Y(q[b][1]));
    ctx.lineTo(X(q[c][0]), Y(q[c][1]));
    ctx.closePath();
    ctx.fill();
  }
  shotLabel.textContent = w.hole > 0
    ? `OPEN — you can see through here (radius ${w.hole.toFixed(5)})`
    : 'live shadow, best direction — no gap anywhere yet';
}

// ---- panel ----
const panel = document.createElement('div');
panel.style.cssText = ['position:fixed','top:12px','left:12px','z-index:10','max-width:330px',
  'background:rgba(20,20,24,0.85)','color:#e8e8ec','font:12px/1.6 -apple-system,system-ui,sans-serif',
  'padding:10px 14px','border-radius:8px','border:1px solid #333'].join(';');
document.body.appendChild(panel);
const status = document.createElement('div');
const readout = document.createElement('div');
readout.style.cssText = 'margin-top:8px;padding-top:6px;border-top:1px solid #333';
const keys = document.createElement('div');
keys.style.cssText = 'margin-top:8px;padding-top:6px;border-top:1px solid #333;color:#8c8c95';
keys.innerHTML = 'R: next seed (shift-R: previous) · C: continue from the shown hole<br>'
  + 'O: what to grow by · F: clearance floor · SPACE: pause<br>'
  + 'M: hold modulus ↔ drift · T: torus · G: strategy<br>'
  + '← →: browse the archive · Esc: back to the live walk<br>'
  + 'D: save one · shift-D: save all · J: OBJ<br>'
  + 'X: clear this torus\'s finds · shift-X: clear every torus\'s<br>'
  + '<span style="color:#6a6a75">finds are kept per triangulation and persist across reloads;'
  + ' every restart is a new walk</span>';
panel.append(status, readout, keys);

function syncStatus(): void {
  const b = BASES[baseIdx];
  const s = b.seeds[seedIdx[baseIdx] % b.seeds.length];
  status.innerHTML = `<b>hole hunt</b> — ${b.name}<br>`
    + `<span style="color:#8c8c95">${running ? 'running' : 'paused'} · ${strategy} · `
    + `modulus ${holdModulus ? 'HELD (stays in the family)' : 'FREE (may drift off τ₀)'}<br>`
    + `growing by ${objective}`
    + `${minClearance > 0 ? ` · clearance floor ${minClearance.toExponential(0)}` : ''}<br>`
    + `seed ${seedIdx[baseIdx] % b.seeds.length + 1}/${b.seeds.length}: ${s.label}</span>`;
}

/**
 * WHICH TORUS IS ON SCREEN: the live walk, or one out of the archive.
 *
 * It used to show an archived find whenever the archive was non-empty, which was right when
 * finds were rare — but it means a run started from a near-flat seed opens on a fully grown
 * torus from some previous session, and the search looks like it began somewhere it did not.
 * So a launch always shows the LIVE walk; ← / → (or C) put you into the archive, Escape
 * brings you back.
 */
let browsing = false;

let dirty = false;
function redraw(): void {
  if (!latest) return;
  const u = latest;
  const holes = currentHoles();
  const kept = browsing ? holes[Math.min(holeIdx, holes.length - 1)] : undefined;
  const w = kept
    ? { positions: kept.positions, hole: kept.size, clearance: kept.clearance,
        coneDeficit: 0, tauHat: kept.tauHat, direction: kept.direction }
    : u.live;                                          // nothing saved yet: watch the walk
  view.draw(Float64Array.from(w.positions));
  drawSilhouette(u);
  const yes = (ok: boolean, s: string) => `<b style="color:${ok ? '#7fd6a0' : '#e07070'}">${s}</b>`;
  readout.innerHTML =
    (kept
      ? `${yes(true, `BROWSING find #${holeIdx + 1} of ${holes.length}`)}`
        + ` — radius <b>${kept.size.toFixed(5)}</b>`
        + ` <span style="color:#8c8c95">(best ${holes[0].size.toFixed(5)}) · Esc: back to the walk</span><br>`
      : `<b style="color:#7fd6a0">LIVE</b> <span style="color:#8c8c95">— watching the walk itself`
        + `${holes.length ? ` · ${holes.length} find${holes.length > 1 ? 's' : ''} archived, ← → to browse` : ''}`
        + `</span><br>`)
    + `<span style="color:#8c8c95">clearance ${w.clearance.toExponential(2)}`
    + ` · τ̂ = ${w.tauHat[0].toFixed(4)} + ${w.tauHat[1].toFixed(4)} i`
    + `${u.holdModulus ? ' (held)' : ' (free)'}<br>`
    + `${(u.tries/1000).toFixed(1)}k trials · ${u.tries ? Math.round(100*u.accepted/u.tries) : 0}% accepted`
    + ` · inflation ${u.inflation.toFixed(5)}`
    // an elitist climb keeps its walkers ON the champion, so spread is only meaningful roaming
    + (u.strategy === 'roam' ? ` · roamed ${u.spread.toFixed(3)}` : '')
    + ` · live ${u.live.hole > 0 ? 'HAS a hole' : 'closed'}</span>`;
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); running = !running; worker?.postMessage({ kind: running ? 'resume' : 'pause' } as InMessage); syncStatus(); }
  if (e.key === 'm' || e.key === 'M') { holdModulus = !holdModulus; launch(); }
  if (e.key === 't' || e.key === 'T') { baseIdx = (baseIdx + 1) % BASES.length; holeIdx = 0; launch(); }
  if (e.key === 'g' || e.key === 'G') { strategy = strategy === 'climb' ? 'roam' : 'climb'; launch(); }
  // O cycles what the walk ranks by, and carries the strategy that suits it (G overrides after).
  if (e.key === 'o' || e.key === 'O') {
    const cycle: CloudObjective[] = ['inflation', 'nonplanar', 'clearance', 'balanced'];
    objective = cycle[(cycle.indexOf(objective) + 1) % cycle.length];
    strategy = strategyFor(objective);
    launch();
  }
  // F raises the clearance floor, so growth cannot run the torus into itself.
  if (e.key === 'f' || e.key === 'F') {
    minClearance = FLOORS[(FLOORS.indexOf(minClearance) + 1) % FLOORS.length];
    launch();
  }
  const holes = currentHoles();
  if (e.key === 'd' || e.key === 'D') {
    if (!holes.length) return;
    const tag = BASES[baseIdx].name.split(' ')[0];
    if (e.shiftKey) saveText(`${tag}-holes-all.csv`, holes.map(holeRow).join('\n') + '\n');
    else saveText(`${tag}-hole-${holeIdx}.csv`, holeRow(holes[Math.min(holeIdx, holes.length - 1)]) + '\n');
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    if (!holes.length) return;
    if (browsing) holeIdx = (holeIdx + (e.key === 'ArrowRight' ? 1 : holes.length - 1)) % holes.length;
    browsing = true;                       // the first arrow just enters the archive
    dirty = true;
  }
  if (e.key === 'Escape') { browsing = false; dirty = true; }
  // R relocates: the NEXT seed in this torus's pool, with a fresh RNG. A restart from the same
  // configuration explores the same neighbourhood however new its random numbers are, and the
  // fiber is 17-dimensional — moving the start is what actually buys new territory.
  if (e.key === 'r' || e.key === 'R') {
    seedIdx[baseIdx] = (seedIdx[baseIdx] + (e.shiftKey ? BASES[baseIdx].seeds.length - 1 : 1))
      % BASES[baseIdx].seeds.length;
    holeIdx = 0;
    launch();
  }
  if (e.key === 'c' || e.key === 'C') {                            // hunt around a good find
    const f = holes[Math.min(holeIdx, holes.length - 1)];
    browsing = false;
    if (f) launch(f.positions);
  }
  if (e.key === 'x' || e.key === 'X') {
    // X clears THIS torus's finds; shift-X clears every torus's.
    if (e.shiftKey) for (const id of Object.keys(archives)) delete archives[id];
    else delete archives[BASES[baseIdx].base.triang.id];
    holeIdx = 0;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(archives)); } catch { /* ignore */ }
    dirty = true;
  }
  if (e.key === 'j' || e.key === 'J') {
    const f = holes[Math.min(holeIdx, holes.length - 1)];
    const pts = f ? f.positions : latest?.live.positions;
    if (!pts) return;
    downloadObj(makePaperTorus(BASES[baseIdx].base.triang, Float64Array.from(pts)),
      `hole-hunt-${baseIdx === 0 ? 'square' : 'hex'}-${f ? holeIdx : 'live'}.obj`);
  }
});

loadHoles();
launch();
function animate(): void {
  if (dirty) { redraw(); dirty = false; }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
