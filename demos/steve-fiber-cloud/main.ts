/**
 * fiber-cloud — explore the fiber {flat ∧ τ = τ₀} and see how deep into the embedded region,
 * or how INFLATED, an 8-vertex flat torus at that exact modulus can get.
 *
 * ONE TORUS AT A TIME — T switches between the hexagonal (τ = ρ, v8-3) and the square
 * (τ = i, v8-7), and the idle one's worker stops rather than competing for cores. It opens on
 * the HEXAGONAL side, which is the open case; `?torus=square` for the other one. Whichever is running stays pinned to exact flatness and its
 * exact modulus while a search wanders that fiber. Each trial perturbs a shape, re-solves the 9 rows {δ₀…δ₆, Re τ,
 * Im τ} back onto the fiber, and discards anything not verifiably flat ∧ at-modulus ∧
 * embedded. What you see is the best shape found so far, so it reshapes as the search works.
 *
 * THE SEARCH RUNS IN A WEB WORKER, one per torus. That is the difference between a demo you
 * glance at and one you leave running: the search is pure `src/core/` code with no DOM, so it
 * runs flat out on its own thread while the page keeps its frame rate. On the main thread the
 * two competed for the same milliseconds and the search got whatever the renderer left over.
 *
 * TWO OBJECTIVES, genuinely opposed. `clearance` is how far the torus is from crossing itself;
 * `inflation` is how much air it encloses per unit area (|volume| / area^{3/2} — 0 when
 * planar, 0.0940 for a sphere). Measured on the square fiber:
 *
 *   objective    clearance   inflation   squash
 *   clearance    3.660e-3    8.383e-3    0.247
 *   inflation    6.968e-4    1.484e-2    0.424    ← 1.8× the air, 1/5 the clearance
 *   balanced     3.401e-3    1.062e-2    0.327    ← 93% of the clearance, +27% air
 *
 * THE STRATEGY SWITCHES WITH THE OBJECTIVE, because measurement says it must, in opposite
 * directions: chasing clearance is a hunt for pockets and wants unselected roaming (1.5M
 * trials: 3.66e-3 roaming vs 3.44e-3 climbing), while chasing inflation is a smooth climb and
 * wants elitist pressure (400k trials: 1.85e-2 climbing vs 1.43e-2 roaming). The demo picks
 * the winner for you and shows which is running.
 *
 * THE CLEARANCE FLOOR is the useful control when inflating. Unconstrained, an inflation hunt
 * walks the torus right up against touching itself. The frontier turns out to be nearly flat —
 * on the square, going from clearance 1.2e-5 to 1.0e-3 costs only 9% of the volume — so a
 * floor buys a lot of robustness almost for free.
 *
 * AND IT WATCHES FOR HOLES AS IT GOES. The point of inflating one of these is a torus you can
 * SEE THROUGH, and the walk passes through tori that have one without any idea that it did — so
 * a second clock watches. It cannot be the objective: `holeSize` is exactly 0 on every closed
 * torus, so there is nothing to climb, and it costs ~25 ms against a trial's ~0.3 ms, which
 * scoring every trial with it slowed the walk ~80× to compute a number the search never reads.
 * So the walk keeps its cheap objective and the detector runs on its own schedule — each walker
 * re-checked along the direction it last saw a hole (one rasterization), with a full scan
 * rotating through the walkers to find new ones. Every holed torus is archived the moment it
 * appears, deduplicated by distance in the chart so the archive fills with genuinely different
 * tori rather than near-copies of one lucky step.
 *
 * THE SILHOUETTE PANEL beside each spark is the torus on screen, projected down the direction
 * that shows the most and filled opaquely: any gap you can see IS the hole, and it turns green
 * when one is open. Holes here are seen EDGE-ON — measured, the see-through direction sits
 * 85–89° from the flattest axis every time, never at the broad face — so this is not a view you
 * would have found by turning the torus with the mouse.
 *
 * SAVING. The hall of fame is the output: TAB picks which torus the keys act on, ← / → step
 * through its hall (H switches the arrows to the HOLED tori instead), and D / shift-D / J save
 * what you are looking at. A saved row is the
 * repo's 24-float coordinate row with metrics appended, so it reads back with
 * `parseEmbeddings`. For runs longer than a tab should be open, `npm run hunt-fiber` is the
 * same search headless, with checkpointing and --resume.
 *
 *   O         objective: clearance → inflation → nonplanar → balanced
 *   F         clearance floor: 0 → 1e-5 → 1e-4 → 1e-3
 *   H         browse the HOLED tori ↔ the hall
 *   TAB       focus the other torus · ← →  browse its list (pauses)
 *   D         save the shape on screen · shift-D  save the whole hall · J  save OBJ
 *   T         switch torus (the other worker stops) · S  starting shape, fold → inflated
 *   SPACE     pause / resume · R  restart · V  vertex coloring
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { FOLDED_BASES, type FoldedBase } from '@core/sampling/foldedBases.ts';
import { foldTau } from '@core/search/correct-fold.ts';
import type { CloudObjective, CloudStrategy } from '@core/search/fiber-cloud.ts';
import { coneAngleDeficits } from '@core/constraints/flat.ts';
import { totalArea } from '@core/moduli/develop.ts';
import { makePaperTorus } from '@core/configuration/paperTorus.ts';
import { makeTorusView, type TorusView } from '@display/viewer/TorusView';
import { downloadObj } from '@display/mesh/obj';
import { DEFICIT_PALETTE } from '@display/viewer/palette';
import type { InMessage, OutMessage, MemberWire, HoleFind } from './worker.ts';
import squareLadder from '../steve-folded-tori/data/square.csv?raw';
import hexagonalLadder from '../steve-folded-tori/data/hexagonal.csv?raw';

/**
 * WHERE THE WALK STARTS, and it runs NEAR-FLAT FIRST.
 *
 * The obvious seed is the furthest-inflated rung of the ladder — start from the best shape
 * anyone has and make it better. But that is one point of one region, and the walk explores
 * around wherever it begins, so every run comes back with variations on the same torus. Seeding
 * back at the fold instead lets the cloud build its OWN family: from the square ladder's first
 * rung (t=0.01, barely off the plane, clearance 5.9e-5) forty seconds of roaming found 79
 * distinct holed tori, the best of them 6.6e-3 — bigger than anything previously saved.
 *
 * The pool runs from the fold outwards, so S steps you from "start at the flat one" to "start
 * from the shape the march already reached". Each entry is a rung of the precomputed inflation
 * ladder, and every rung was verified flat ∧ at-modulus ∧ embedded before it was written.
 */
interface Seed { label: string; positions: number[] }

function ladderSeeds(text: string): Seed[] {
  const rows = text.trim().split('\n').filter(Boolean);
  const pick = [...new Set([0, Math.floor(rows.length / 3), Math.floor((2 * rows.length) / 3), rows.length - 1])];
  return pick.map((i) => {
    const cols = rows[i].split(',');
    return { label: `ladder t=${Number(cols[0]).toFixed(2)}`, positions: cols.slice(5).map(Number) };
  });
}
const SEEDS: Record<string, Seed[]> = {
  square: ladderSeeds(squareLadder),
  hexagonal: ladderSeeds(hexagonalLadder),
};
const nameOf = (base: FoldedBase) => (base.tauHat[0] === 0 ? 'square' : 'hexagonal');

const OBJECTIVES: CloudObjective[] = ['clearance', 'inflation', 'nonplanar', 'balanced'];
const FLOORS = [0, 1e-5, 1e-4, 1e-3];
const strategyFor = (o: CloudObjective): CloudStrategy =>
  (o === 'inflation' || o === 'nonplanar' ? 'climb' : 'roam');

// ---- scene ----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101014);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(0, -3.0, 2.2);
camera.up.set(0, 0, 1);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(2, -3, 6); scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.4); fill.position.set(-3, 2, -4); scene.add(fill);

// ---- one worker-backed subject per base ----
interface Subject {
  base: FoldedBase;
  worker: Worker;
  view: TorusView;
  deficits: Float32Array;
  readout: HTMLDivElement;
  spark: HTMLCanvasElement;
  /** The shadow of the torus on screen, looked down its best direction: any gap you can see
   *  IS the hole. The only way to tell "found a hole" from "found a fat torus" at a glance. */
  silhouette: HTMLCanvasElement;
  history: number[];
  latest: OutMessage & { kind: 'update' } | null;
  hallIdx: number;
  /** Which list ← / → step through: the hall (ranked by the objective) or the holed tori. */
  browse: 'hall' | 'holes';
  /** Hole scan of the browsed HALL member — those carry no direction, so the page asks the
   *  worker for one rather than spending ~200 rasterizations on its own thread. */
  scanned: { hole: number; direction: [number, number, number] } | null;
  /** This torus's block in the side panel — hidden while the other one is the active search. */
  box: HTMLDivElement;
  dirty: boolean;
}

const TARGET_AREA = 2.5;     // draw everything at one area, so fatness never reads as size
const subjects: Subject[] = [];
for (const base of FOLDED_BASES) {
  const view = makeTorusView(base.triang, {
    surface: { style: 'plain', color: 0xd9c48a },
    creases: { radius: 0.006 }, corners: { radius: 0.022 }, center: true,
  });
  view.group.position.set(0, 0, 0);       // only one is visible at a time, so both sit centred
  scene.add(view.group);

  const spark = document.createElement('canvas');
  spark.width = 150; spark.height = 46;
  spark.style.cssText = 'width:150px;height:46px;background:#16161c;border-radius:4px';
  const silhouette = document.createElement('canvas');
  silhouette.width = silhouette.height = 104;
  silhouette.style.cssText = 'width:104px;height:104px;background:#16161c;border-radius:4px';

  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  const s: Subject = {
    base, worker, view, spark, silhouette,
    deficits: new Float32Array(base.triang.vertexCount),
    readout: document.createElement('div'),
    history: [], latest: null, hallIdx: 0, browse: 'hall', scanned: null,
    box: document.createElement('div'), dirty: false,
  };
  worker.onmessage = (e: MessageEvent<OutMessage>) => {
    const msg = e.data;
    if (msg.kind === 'update') {
      s.latest = msg;
      s.history.push(msg.best.score);
      if (s.history.length > 260) s.history.shift();
      s.dirty = true;
    } else if (msg.kind === 'hall') {
      saveText(`${nameOf(s.base)}-${OBJECTIVES[objIdx]}-hall.csv`, msg.rows.map((m) => rowOf(m)).join('\n') + '\n');
    } else if (msg.kind === 'holes') {
      saveText(`${nameOf(s.base)}-holes.csv`, msg.rows.map((m) => holeRow(m)).join('\n') + '\n');
    } else if (msg.kind === 'scanned') {
      s.scanned = { hole: msg.hole, direction: msg.direction };
      s.dirty = true;
    }
  };
  subjects.push(s);
}

// ---- state ----
// ONE TORUS AT A TIME. Both searches at once halved the trial rate of each and split the
// attention of a page that can only really be read one column at a time; T switches, and the
// idle torus's worker is paused rather than competing for cores.
let objIdx = 0;
let floorIdx = 0;
let running = true;
// HEXAGONAL BY DEFAULT — it is the open case: the square side already has saved tori with
// holes of 6e-3, while the hexagonal best is 3e-3 and its inflation ladder dies after 5 rungs.
// `?torus=square` opens on the other one.
let active = /^squ/i.test(new URLSearchParams(location.search).get('torus') ?? '') ? 0 : 1;
const seedIdx = [0, 0];
let paintDeficit = true;

function post(s: Subject, m: InMessage): void { s.worker.postMessage(m); }

function launch(): void {
  subjects.forEach((s, i) => {
    s.history.length = 0; s.hallIdx = 0; s.latest = null; s.scanned = null; s.browse = 'hall';
    s.view.group.visible = i === active;
    s.box.style.display = i === active ? '' : 'none';
    if (i !== active) { post(s, { kind: 'pause' }); return; }
    const pool = SEEDS[nameOf(s.base)];
    post(s, {
      kind: 'start',
      triangId: s.base.triang.id,
      target: foldTau(s.base) as [number, number],
      seed: pool[seedIdx[i] % pool.length].positions,
      objective: OBJECTIVES[objIdx],
      strategy: strategyFor(OBJECTIVES[objIdx]),
      minClearance: FLOORS[floorIdx],
    });
  });
  running = true;
  syncStatus();
}

// ---- saving ----
function saveText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
/** The standard 24-float coordinate row, metrics appended. */
const rowOf = (m: MemberWire) =>
  [...m.positions, m.score, m.clearance, m.volumeRatio, m.squash, m.creaseDegrees].join(',');
/** A holed torus: the same row, with the hole and the direction it is seen along appended. */
const holeRow = (m: HoleFind) => [rowOf(m), m.hole, ...m.direction].join(',');

// ---- drawing ----
function browseList(s: Subject): MemberWire[] {
  if (!s.latest) return [];
  return s.browse === 'holes' ? s.latest.holes : s.latest.top;
}

function shownMember(s: Subject): MemberWire | null {
  if (!s.latest) return null;
  const list = browseList(s);
  return list[Math.min(s.hallIdx, list.length - 1)] ?? s.latest.best;
}

/**
 * The hole of whatever is on screen, and the direction to look down for it. A holed find
 * carries both; the champion is rescanned by the worker whenever it changes; any other hall
 * member has to be asked for, which is what `s.scanned` caches.
 */
function shownHole(s: Subject): { hole: number; direction: [number, number, number] } | null {
  if (!s.latest) return null;
  const m = shownMember(s);
  if (m && 'hole' in m) return { hole: (m as HoleFind).hole, direction: (m as HoleFind).direction };
  if (s.hallIdx === 0 && s.browse === 'hall') return { hole: s.latest.bestHole.size, direction: s.latest.bestHole.direction };
  return s.scanned;
}

function drawSpark(s: Subject): void {
  const ctx = s.spark.getContext('2d')!;
  const { width: W, height: H } = s.spark;
  ctx.clearRect(0, 0, W, H);
  if (s.history.length < 2) return;
  const lo = Math.min(...s.history), hi = Math.max(...s.history), span = hi - lo || 1;
  ctx.strokeStyle = '#7fd6a0'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = 0; i < s.history.length; i++) {
    const x = (i / (s.history.length - 1)) * (W - 2) + 1;
    const y = H - 3 - ((s.history[i] - lo) / span) * (H - 8);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = '#6a6a75'; ctx.font = '9px system-ui';
  ctx.fillText(hi.toExponential(2), 3, 10);
}

/**
 * The torus's shadow, looked down the direction that shows the most, filled opaquely — so any
 * gap you can see IS a hole. Green when one is open. The projection is 16 filled triangles,
 * which is cheap; finding the DIRECTION is the expensive part, and that happens in the worker.
 */
function drawSilhouette(s: Subject): void {
  const ctx = s.silhouette.getContext('2d')!;
  const S = s.silhouette.width;
  ctx.clearRect(0, 0, S, S);
  const m = shownMember(s);
  const v = shownHole(s);
  if (!m) return;
  const d = v?.direction ?? [0, 0, 1];
  const p = m.positions;

  // an orthonormal frame with `d` as the view axis
  const t = Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const e1r = [t[1]*d[2]-t[2]*d[1], t[2]*d[0]-t[0]*d[2], t[0]*d[1]-t[1]*d[0]];
  const l = Math.hypot(e1r[0], e1r[1], e1r[2]) || 1;
  const e1 = [e1r[0]/l, e1r[1]/l, e1r[2]/l];
  const e2 = [d[1]*e1[2]-d[2]*e1[1], d[2]*e1[0]-d[0]*e1[2], d[0]*e1[1]-d[1]*e1[0]];

  const q: [number, number][] = [];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < p.length / 3; i++) {
    const a = p[3*i], b = p[3*i+1], c = p[3*i+2];
    const u = a*e1[0]+b*e1[1]+c*e1[2], w = a*e2[0]+b*e2[1]+c*e2[2];
    q.push([u, w]);
    x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, w); y1 = Math.max(y1, w);
  }
  const span = Math.max(x1-x0, y1-y0) || 1;
  const sc = (S - 12) / (span * 1.2);
  const cx = (x0+x1)/2, cy = (y0+y1)/2;
  const X = (u: number) => S/2 + (u - cx) * sc;
  const Y = (w: number) => S/2 - (w - cy) * sc;

  ctx.fillStyle = v && v.hole > 0 ? '#7fd6a0' : '#d9c48a';
  for (const [a, b, c] of s.base.triang.triangles) {
    ctx.beginPath();
    ctx.moveTo(X(q[a][0]), Y(q[a][1]));
    ctx.lineTo(X(q[b][0]), Y(q[b][1]));
    ctx.lineTo(X(q[c][0]), Y(q[c][1]));
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#6a6a75';
  ctx.font = '9px system-ui';
  ctx.fillText(v ? (v.hole > 0 ? `OPEN ${v.hole.toExponential(1)}` : 'closed') : 'not scanned', 4, S - 4);
}

function redraw(s: Subject): void {
  const m = shownMember(s);
  if (!m || !s.latest) return;
  const positions = Float64Array.from(m.positions);

  const defs = coneAngleDeficits(s.base.triang, positions);
  for (let i = 0; i < defs.length; i++) s.deficits[i] = Math.abs(defs[i]);

  const area = totalArea(s.base.triang, positions);
  const k = area > 0 ? Math.sqrt(TARGET_AREA / area) : 1;
  const shown = Float64Array.from(positions);
  for (let i = 0; i < shown.length; i++) shown[i] *= k;
  s.view.draw(shown);
  s.view.paintVertices(paintDeficit ? s.deficits : null, DEFICIT_PALETTE);

  drawSilhouette(s);

  const u = s.latest;
  const gain = u.seedScore > 0 ? u.best.score / u.seedScore : 1;
  const where = s.browse === 'holes'
    ? `hole #${s.hallIdx + 1} of ${u.holes.length}`
    : (s.hallIdx === 0 ? 'best' : `hall #${s.hallIdx + 1}`);
  const warn = !u.seedMeetsFloor && u.best.clearance < FLOORS[floorIdx]
    ? '<br><span style="color:#e07070">seed is below the floor — nothing has cleared the bar yet</span>' : '';
  s.readout.innerHTML =
    `<b>${s.base.label}</b> <span style="color:#c8a45c">${where}</span><br>`
    + `<b style="color:#7fd6a0">${OBJECTIVES[objIdx]} ${m.score.toExponential(3)}</b>`
    + ` <span style="color:#8c8c95">(×${gain.toFixed(2)} on seed)</span><br>`
    + `<span style="color:#8c8c95">clearance ${m.clearance.toExponential(2)}`
    + ` · inflation ${m.volumeRatio.toExponential(2)} (${(100 * m.volumeRatio / 0.0940).toFixed(1)}% of a sphere)<br>`
    + `squash ${m.squash.toFixed(3)} · crease ${m.creaseDegrees.toFixed(2)}° · hall ${u.hallSize}<br>`
    + `${(u.tries / 1000).toFixed(0)}k trials · ${u.tries ? Math.round((100 * u.accepted) / u.tries) : 0}% accepted`
    + (u.strategy === 'roam' ? ` · roamed ${u.roamed.toFixed(2)}` : ' · climbing')
    + `</span><br>`
    + (u.holeCount
      ? `<b style="color:#7fd6a0">${u.holeCount} HOLED ${u.holeCount > 1 ? 'TORI' : 'TORUS'}</b>`
        + ` <span style="color:#8c8c95">— best ${u.holes[0].hole.toExponential(2)} · H to browse them</span>`
      : `<span style="color:#8c8c95">no hole yet · champion `
        + `${u.bestHole.size > 0 ? `is OPEN ${u.bestHole.size.toExponential(2)}` : 'is closed'}</span>`)
    + warn;
}

// ---- panel ----
const panel = document.createElement('div');
panel.style.cssText = [
  'position:fixed', 'top:12px', 'left:12px', 'z-index:10', 'max-width:310px',
  'background:rgba(20,20,24,0.85)', 'color:#e8e8ec',
  'font:12px/1.6 -apple-system,system-ui,sans-serif',
  'padding:10px 14px', 'border-radius:8px', 'border:1px solid #333',
].join(';');
document.body.appendChild(panel);
const head = document.createElement('div');
head.innerHTML = '<b>fiber cloud</b> — exactly flat, exactly at modulus<br>'
  + '<span style="color:#8c8c95">searching in workers · similarity quotiented<br>out (17-coord chart, 8-dim shape fiber)</span>';
const status = document.createElement('div');
status.style.cssText = 'margin-top:6px;color:#8c8c95';
panel.append(head, status);
for (const s of subjects) {
  const box = s.box;
  box.style.cssText = 'margin-top:8px;padding-top:6px;border-top:1px solid #333';
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:6px;align-items:flex-end;margin-top:4px';
  row.append(s.spark, s.silhouette);
  box.append(s.readout, row);
  panel.append(box);
}
const keys = document.createElement('div');
keys.style.cssText = 'margin-top:8px;padding-top:6px;border-top:1px solid #333;color:#8c8c95';
keys.innerHTML = 'T: switch torus · S: starting shape (fold → inflated)'
  + '<br>O: objective · F: clearance floor · ← →: browse'
  + '<br>H: browse the HOLED tori ↔ the hall'
  + '<br>D: save one · shift-D: save the list · J: save OBJ'
  + '<br>SPACE: pause · R: restart · V: coloring'
  + '<br><span style="color:#6a6a75">long runs: npm run hunt-fiber -- --minutes 60</span>';
panel.append(keys);

function syncStatus(): void {
  const floor = FLOORS[floorIdx];
  const pool = SEEDS[nameOf(subjects[active].base)];
  const seed = pool[seedIdx[active] % pool.length];
  status.innerHTML = `<b style="color:#c8a45c">${nameOf(subjects[active].base)}</b>`
    + ` · ${running ? 'running' : 'paused'} · ${OBJECTIVES[objIdx]} (${strategyFor(OBJECTIVES[objIdx])})`
    + ` · floor ${floor === 0 ? 'none' : floor.toExponential(0)}<br>`
    + `from seed ${seedIdx[active] % pool.length + 1}/${pool.length}: ${seed.label}`;
}

window.addEventListener('keydown', (e) => {
  const s = subjects[active];
  if (e.code === 'Space') {
    e.preventDefault();
    running = !running;
    post(subjects[active], { kind: running ? 'resume' : 'pause' });
    syncStatus();
  }
  if (e.key === 'o' || e.key === 'O') { objIdx = (objIdx + 1) % OBJECTIVES.length; launch(); }
  if (e.key === 'f' || e.key === 'F') { floorIdx = (floorIdx + 1) % FLOORS.length; launch(); }
  if (e.key === 'r' || e.key === 'R') { launch(); }
  if (e.key === 'v' || e.key === 'V') { paintDeficit = !paintDeficit; for (const t of subjects) redraw(t); }
  // T (or TAB) switches which torus is being searched — the other one's worker stops.
  if (e.code === 'Tab' || e.key === 't' || e.key === 'T') {
    e.preventDefault();
    active = (active + 1) % subjects.length;
    launch();
  }
  // S steps the starting shape from the fold outwards.
  if (e.key === 's' || e.key === 'S') {
    seedIdx[active] = (seedIdx[active] + 1) % SEEDS[nameOf(subjects[active].base)].length;
    launch();
  }
  // H switches which list the arrows walk: the hall, ranked by the objective, or the tori
  // that turned out to have a hole. They are different orders over different things — the
  // fattest torus is usually not a holed one — so browsing them as one list would hide both.
  if (e.key === 'h' || e.key === 'H') {
    s.browse = s.browse === 'hall' ? 'holes' : 'hall';
    s.hallIdx = 0; s.scanned = null;
    redraw(s);
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    if (!s.latest) return;
    running = false;                                   // hold the list still while stepping
    post(s, { kind: 'pause' });
    const n = browseList(s).length;
    if (!n) return;
    s.hallIdx = (s.hallIdx + (e.key === 'ArrowRight' ? 1 : n - 1)) % n;
    // A hall member carries no viewing direction; ask the worker for one rather than spending
    // ~200 rasterizations on the render thread.
    s.scanned = null;
    if (s.browse === 'hall' && s.hallIdx !== 0) {
      const m = shownMember(s);
      if (m) post(s, { kind: 'scan', positions: m.positions });
    }
    redraw(s); syncStatus();
  }
  if (e.key === 'd' || e.key === 'D') {
    const tag = `${nameOf(s.base)}-${s.browse === 'holes' ? 'hole' : OBJECTIVES[objIdx]}`;
    // the worker owns the full archive either way
    if (e.shiftKey) post(s, { kind: s.browse === 'holes' ? 'holes' : 'hall' });
    else {
      const m = shownMember(s);
      if (m) saveText(`${tag}-${s.hallIdx}.csv`,
        (s.browse === 'holes' ? holeRow(m as HoleFind) : rowOf(m)) + '\n');
    }
  }
  if (e.key === 'j' || e.key === 'J') {
    const m = shownMember(s);
    if (m) downloadObj(makePaperTorus(s.base.triang, Float64Array.from(m.positions)),
      `${nameOf(s.base)}-${s.browse === 'holes' ? 'hole' : OBJECTIVES[objIdx]}-${s.hallIdx}.obj`);
  }
});

launch();

function animate(): void {
  const s = subjects[active];
  if (s.dirty) { redraw(s); drawSpark(s); s.dirty = false; }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
