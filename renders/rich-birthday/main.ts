/**
 * rich-birthday — rich-birthday-render's 10×10 wall of paper tori, but stripped back to a
 * plain WebGL scene you can ORBIT: no path tracer, no back wall, no UI. A grid/
 * individual slider switches between the whole 10×10 wall and a single torus shown
 * hovering above its developed net (the flat sheet it folds from, laid on the
 * ground); ← → / on-screen arrows step through the census. Lit by one raking key +
 * soft sky fill, with a dedication top-left and credits bottom-right.
 *
 * Same paper/grid/normal-map surface as rich-birthday-render; the census is the CSV in
 * this folder. Knobs live in CONFIG below.
 */

import * as THREE from 'three';

import { RICH } from '../../src/tori';
import { RICH_REFERENCE } from '../../src/math/reference';
import { modulus } from '../../src/math/develop';
import { parseEmbeddings } from '../../src/io/embeddings';
import { styledTorus, creaseEdgeMaterial } from '../../src/render/styledTorus';
import { developedSheet } from '../../src/render/developedSheet';
import { paperMaterials } from '../../src/render/paper';
import { skyEnvironment } from '../../src/render/stage';
import { Studio } from '../../src/render/studio';

// ============================ tweak the whole piece here ============================
const url = new URLSearchParams(location.search);

const CONFIG = {
  // ===================== COLORS (match rich-birthday-render) =====================
  torusColor:     '#dcbf6f',   // the paper (also the crease / fold-line color)
  gridColor:      '#2435AF',   // thick (major) graph lines
  gridMinorColor: '#4e5988',   // thin (fine) graph lines
  background:     0xf7f5f0,    // matches stevejtrettel.site (--bg: #F7F5F0)
  lightColor:     '#ffffff',
  // ======================================================================

  // tori + layout
  torus: RICH,                 // combinatorics the CSV rows belong to
  maxTori: 100,                // cap (10×10)
  cell: 1.0,                   // each torus normalized to this size
  spacing: 1.9,                // cell-to-cell gap (× cell)
  creases: false,              // edges off in both views (no crease tubes / fold lines)
  creaseRadius: 0.004,
  // developed (flat) mode: thin dark-gray crease/fold lines
  foldLineColor: '#4d4d4d',
  foldLineRadius: 0.0022,

  // paper surface detail (same as rich-birthday-render)
  roughness: 0.92,
  gridRepeat: 16,
  gridSubdivisions: 3,
  gridMinorWidth: 0.004,
  gridMajorWidth: 0.012,
  normalMapFile: 'crease-rough.png',
  normalRepeat: Number(url.get('nr')) || 4,
  normalScale: Number(url.get('ns')) || 1.0,

  // lighting — one raking key (no cast shadows) over a dimmer sky/ambient fill:
  // the folds get their form from diffuse facet shading, backsides never go black.
  envIntensity: 0.55,
  ambientIntensity: 0.22,
  keyIntensity: 2.4,
  keyDir: [-0.4, 0.7, 0.7] as [number, number, number],   // center → light
};
// ====================================================================================

// ---- studio (WebGL preview only — never enable path tracing) ----
const studio = new Studio();
skyEnvironment(studio.scene, { intensity: CONFIG.envIntensity, background: CONFIG.background });
studio.scene.add(new THREE.AmbientLight(0xffffff, CONFIG.ambientIntensity));

// a single raking key light — NO cast shadows (thin folded sheets self-shadow into
// acne, and a hard cast shadow on the net read too dark/sharp). The strong key over
// a dim fill gives the folds their form purely through diffuse facet shading.
const key = new THREE.DirectionalLight(CONFIG.lightColor, CONFIG.keyIntensity);
studio.scene.add(key, key.target);

/** Aim the key light at an object's center, from the CONFIG.keyDir side. */
function aimKey(obj: THREE.Object3D): void {
  const sphere = new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere());
  const dir = new THREE.Vector3(...CONFIG.keyDir).normalize();
  key.position.copy(sphere.center).addScaledVector(dir, (sphere.radius || 1) * 3);
  key.target.position.copy(sphere.center);
}

// ---- load every CSV in this folder ----
const csvs = import.meta.glob('./*.csv', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
let papers = parseEmbeddings(Object.values(csvs).join('\n'), CONFIG.torus);
if (papers.length === 0) papers = [RICH_REFERENCE];
papers = papers.slice(0, CONFIG.maxTori);

// ---- shared paper material (per-torus UVs live on the geometry, so it's shared) ----
const { face: faceMaterial, edge: edgeMaterial } = paperMaterials({
  paperColor: CONFIG.torusColor, gridColor: CONFIG.gridColor, gridMinorColor: CONFIG.gridMinorColor,
  roughness: CONFIG.roughness, gridRepeat: CONFIG.gridRepeat, gridSubdivisions: CONFIG.gridSubdivisions,
  gridMinorWidth: CONFIG.gridMinorWidth, gridMajorWidth: CONFIG.gridMajorWidth,
  normalMapFile: CONFIG.normalMapFile, normalRepeat: CONFIG.normalRepeat, normalScale: CONFIG.normalScale,
});   // 3D torus creases match the paper (edge defaults to paperColor)
const foldLineMaterial = creaseEdgeMaterial(CONFIG.foldLineColor);   // flat-net fold lines: thin dark gray

// ---- build the grid (same layout as rich-birthday-render) ----
const cols = Math.ceil(Math.sqrt(papers.length));
const rows = Math.ceil(papers.length / cols);
const grid = new THREE.Group();
const pivots: THREE.Object3D[] = [];   // one center-pivot per torus (the rotatable handle)
papers.forEach((paper, i) => {
  const t = styledTorus(paper, { surface: 'grid', edges: true, faceMaterial, edgeMaterial, edgeRadius: CONFIG.creaseRadius });
  t.setEdgesVisible(CONFIG.creases);
  const size = new THREE.Box3().setFromObject(t).getSize(new THREE.Vector3());
  t.scale.setScalar(CONFIG.cell / (Math.max(size.x, size.y, size.z) || 1));
  t.rotation.z = Math.PI / 2;
  const c = i % cols, r = Math.floor(i / cols);
  t.position.set((c - (cols - 1) / 2) * CONFIG.spacing, ((rows - 1) / 2 - r) * CONFIG.spacing, 0);

  // Wrap each torus in a pivot AT its center so a click-drag spins it in place. The
  // layout is identical (pivot.position + the torus's local offset reproduce the
  // cell); only the rotation origin moves to the center. pivot.quaternion is this
  // torus's independent pose, mutated by the raycast-driven drag below.
  const center = new THREE.Box3().setFromObject(t).getCenter(new THREE.Vector3());
  t.position.sub(center);
  const pivot = new THREE.Group();
  pivot.position.copy(center);
  pivot.add(t);
  grid.add(pivot);
  pivots.push(pivot);
});
studio.add(grid);

// ---- each torus's modulus τ = v₂/v₁ ∈ ℍ (the trace-tori, so they outline the
//      cartoon torus); used as the morph destination below. ----
const taus = papers.map((p) => modulus(RICH, p.positions).tau as readonly [number, number]);

// ---- morph: slide every torus from its grid cell (morph=0) to its τ point in ℍ²
//      (morph=1), where the 100 points form the cartoon-torus donut. Only each
//      pivot's POSITION is animated, so per-torus rotation (its quaternion) and
//      camera pan keep working throughout, donut included. ----
const gridPos = pivots.map((p) => p.position.clone());

// τ → world: center the cloud on the origin, uniform scale so the donut's wider
// extent ≈ 90% of the grid width (full-size tori, grid-sized footprint, in place).
const targetPos: THREE.Vector3[] = (() => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of taus) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const gw = new THREE.Box3().setFromObject(grid).getSize(new THREE.Vector3()).x;
  const s = (gw * 0.9) / Math.max(x1 - x0 || 1, y1 - y0 || 1);
  return taus.map(([x, y]) => new THREE.Vector3((x - cx) * s, (y - cy) * s, 0));   // Im → +y
})();

// path is pluggable (linear for now; arcs / staggered timing can swap in here)
type MorphPath = (i: number, from: THREE.Vector3, to: THREE.Vector3, t: number) => THREE.Vector3;
const smootherstep = (t: number): number => t * t * t * (t * (6 * t - 15) + 10);
const linearPath: MorphPath = (_i, from, to, t) => from.clone().lerp(to, smootherstep(t));
const morphPath: MorphPath = linearPath;

const MORPH_DURATION = 2.6;        // seconds, end to end (whole row-by-row sweep)
let morph = 0;                     // 0 = grid wall, 1 = moduli donut (global clock)
let morphTarget = 0;
let morphAnimating = false;
let morphLast = 0;                 // last RAF timestamp (ms)

// row-by-row stagger: each torus's own [start, start+WIN] window inside the global
// clock, keyed on its grid row. STAGGER=0 ⟹ all at once; →1 ⟹ fully sequential.
// (The wall and the donut overlap mid-sweep — fine for now.)
const STAGGER = 0.8;
const rowStart = papers.map((_, i) => (rows > 1 ? Math.floor(i / cols) / (rows - 1) : 0) * STAGGER);
const WIN = Math.max(1e-3, 1 - STAGGER);
const localT = (i: number): number => Math.min(1, Math.max(0, (morph - rowStart[i]) / WIN));

function applyMorph(): void {
  for (let i = 0; i < pivots.length; i++) {
    const t = localT(i);
    pivots[i].position.copy(morphPath(i, gridPos[i], targetPos[i], t));
    pivots[i].scale.setScalar(1 - 0.5 * t);   // shrink with its own progress (linear in its window)
  }
}
function morphTick(now: number): void {
  if (!morphAnimating) return;
  const dt = morphLast ? (now - morphLast) / 1000 : 0;
  morphLast = now;
  const dir = Math.sign(morphTarget - morph);
  morph += dir * (dt / MORPH_DURATION);
  if ((dir >= 0 && morph >= morphTarget) || (dir < 0 && morph <= morphTarget)) { morph = morphTarget; morphAnimating = false; }
  applyMorph();
  if (morphAnimating) requestAnimationFrame(morphTick);
}
function setMorph(target: 0 | 1): void {
  morphTarget = target;
  if (!morphAnimating) { morphAnimating = true; morphLast = 0; requestAnimationFrame(morphTick); }
}

// ---- single-subject view: the folded torus hovering ABOVE its developed net,
//      which lies flat on the "ground" (the XZ plane). Built on demand and
//      centered at the origin so stepping the census keeps the camera/orbit put. ----
const TORUS_SIZE = 1.7;    // folded torus, floating above
const NET_SIZE = 2.6;      // developed sheet, on the ground
const TORUS_LIFT = 1.6;    // gap between the ground net and the torus
let single: THREE.Object3D | null = null;
let soloPivot: THREE.Object3D | null = null;   // center-pivot of the lifted torus (the rotatable handle in individual mode)
let soloIdx = (() => { const k = Number(url.get('i')); return Number.isInteger(k) && k >= 0 && k < papers.length ? k : 0; })();

/** Scale obj so its largest extent = size, then recenter it on its local origin. */
function fitInPlace(obj: THREE.Object3D, size: number): void {
  const s = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  obj.scale.setScalar(size / (Math.max(s.x, s.y, s.z) || 1));
  obj.updateMatrixWorld(true);
  obj.position.sub(new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3()));
}

function buildSubject(reframe: boolean): void {
  if (single) { studio.scene.remove(single); single.traverse((o) => (o as THREE.Mesh).geometry?.dispose()); }
  const group = new THREE.Group();

  // folded torus, hovering above the ground
  const torus = styledTorus(papers[soloIdx], { surface: 'grid', edges: true, faceMaterial, edgeMaterial, edgeRadius: CONFIG.creaseRadius });
  torus.setEdgesVisible(CONFIG.creases);
  torus.rotation.z = Math.PI / 2;
  fitInPlace(torus, TORUS_SIZE);
  torus.position.y += TORUS_LIFT;
  // wrap in a center pivot so a drag spins it in place (the net stays put on the ground)
  const tcenter = new THREE.Box3().setFromObject(torus).getCenter(new THREE.Vector3());
  torus.position.sub(tcenter);
  soloPivot = new THREE.Group();
  soloPivot.position.copy(tcenter);
  soloPivot.add(torus);
  group.add(soloPivot);

  // developed net, laid flat on the "ground" (rotate its XY plane down into XZ).
  // Fold lines stay ON here (the dark net edges) even though the 3D tori are edgeless.
  const sheet = developedSheet(papers[soloIdx], { faceMaterial, edgeMaterial: foldLineMaterial, edgeRadius: CONFIG.foldLineRadius });
  fitInPlace(sheet, NET_SIZE);
  sheet.rotation.x = -Math.PI / 2;
  group.add(sheet);

  // center the whole composite on the origin (stable framing as you step)
  group.updateMatrixWorld(true);
  group.position.sub(new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3()));
  single = group;
  studio.scene.add(group);
  aimKey(group);
  if (reframe) studio.frame(group, { direction: new THREE.Vector3(0, 0.6, 1) });   // elevated front, so the ground reads
}

// ---- mode: grid (10×10) ↔ individual (torus above its developed net) ----
type Mode = 'grid' | 'individual';
let mode: Mode = url.get('view') === 'individual' ? 'individual' : 'grid';

// Frame the grid front-on. The default fit only accounts for the camera's vertical
// FOV, so on a narrow (portrait) screen the wide grid overflows sideways — here we
// ALSO require the full width to fit and back off to whichever distance is farther.
// On desktop/landscape the vertical/diagonal fit stays the limiter, so it's unchanged.
function frameGrid(): void {
  const box = new THREE.Box3().setFromObject(grid);
  const fov = (studio.camera.fov * Math.PI) / 180;
  const aspect = studio.camera.aspect || 1;
  const r = box.getBoundingSphere(new THREE.Sphere()).radius || 1;
  const fitDefault = (r / Math.sin(fov / 2)) * 1.1;
  const fitWidth = (box.getSize(new THREE.Vector3()).x / 2) / (Math.tan(fov / 2) * aspect) * 1.1;
  studio.frame(grid, { direction: new THREE.Vector3(0, 0, 1), distance: Math.max(fitDefault, fitWidth) });
}

function setMode(next: Mode): void {
  mode = next;
  const solo = mode === 'individual';
  grid.visible = !solo;
  morphBtn.style.display = solo ? 'none' : '';   // the wall↔moduli button is meaningless in individual view
  chevrons.style.display = solo ? '' : 'none';
  // grid: pan/zoom only (no scene rotation — you rotate the tori, not the camera);
  // individual: keep orbit so the torus + net can be viewed from any angle.
  studio.controls.enableRotate = solo;
  if (solo) buildSubject(true);
  else { if (single) single.visible = false; frameGrid(); aimKey(grid); }
  syncToggle();
}

function step(d: number): void { if (mode === 'individual') { soloIdx = (soloIdx + d + papers.length) % papers.length; buildSubject(false); } }

frameGrid();
studio.start();

// keep the whole grid in frame across orientation / window-size changes (phones)
window.addEventListener('resize', () => { if (mode === 'grid') frameGrid(); });

// ---- click-drag a torus to spin THAT one in place; empty-space drags still pan ----
// OrbitControls keeps pan/zoom; we only steal a drag that lands on a torus. A
// capture-phase pointerdown picks the pivot first and stopPropagation()s so the
// controls never start a pan for that gesture — misses fall through to pan as before.
const ROT_SPEED = 0.01;            // radians per pixel of drag
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const canvas = studio.renderer.domElement;

let active: THREE.Object3D | null = null;   // pivot currently being dragged
let lastX = 0, lastY = 0;

// The rotatable handles for the current mode (grid → every cell; individual → the lone torus).
function pickTargets(): THREE.Object3D[] { return mode === 'grid' ? pivots : soloPivot ? [soloPivot] : []; }

// Cursor-ray → the pivot under the pointer (null if the ray misses every torus).
// Walks up from the hit mesh to the pivot in pickTargets().
function pickPivot(e: PointerEvent | MouseEvent): THREE.Object3D | null {
  const targets = pickTargets();
  if (targets.length === 0) return null;
  const rect = canvas.getBoundingClientRect();
  ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, studio.camera);
  const hits = raycaster.intersectObjects(targets, true);
  if (hits.length === 0) return null;
  let o: THREE.Object3D = hits[0].object;
  const set = new Set(targets);
  while (o.parent && !set.has(o)) o = o.parent;
  return set.has(o) ? o : null;
}

canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;      // left button only
  const pivot = pickPivot(e);
  if (!pivot) return;              // missed → let OrbitControls pan/zoom keep it
  e.stopPropagation();             // hit → don't let the controls start a pan this drag
  active = pivot;
  lastX = e.clientX; lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing';
}, { capture: true });

canvas.addEventListener('pointermove', (e) => {
  if (!active) { canvas.style.cursor = pickPivot(e) ? 'grab' : 'default'; return; }
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  // world-axis trackball: horizontal drag yaws about world-up, vertical pitches about world-right
  const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * ROT_SPEED);
  const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * ROT_SPEED);
  active.quaternion.premultiply(qYaw).premultiply(qPitch);
});

const endDrag = (e: PointerEvent): void => {
  if (!active) return;
  active = null;
  try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  canvas.style.cursor = pickPivot(e) ? 'grab' : 'default';
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// double-click a torus to reset just that one to its upright pose
canvas.addEventListener('dblclick', (e) => {
  const pivot = pickPivot(e);
  if (pivot) pivot.quaternion.identity();
});

// ---- dedication (top-left, small) ----
const caption = document.createElement('div');
caption.style.cssText = 'position:fixed;top:12px;left:14px;font:11px/1.5 ui-serif,Georgia,serif;color:#555;letter-spacing:.02em;pointer-events:none;white-space:pre';
caption.textContent = 'One Hundred Vertex-Minimal Paper Tori\nHappy Birthday Rich. 2026';
document.body.appendChild(caption);

// ---- minimal sliders, just under the dedication (clickable — no keyboard needed) ----
function makeSlider(left: string, right: string, top: number, onToggle: () => void): { el: HTMLDivElement; sync: (right: boolean) => void } {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;top:${top}px;left:14px;display:flex;align-items:center;gap:8px;font:11px ui-serif,Georgia,serif;letter-spacing:.02em;cursor:pointer;user-select:none`;
  const l = document.createElement('span'); l.textContent = left;
  const r = document.createElement('span'); r.textContent = right;
  const track = document.createElement('span');
  track.style.cssText = 'position:relative;width:32px;height:16px;border-radius:8px;background:#fff;border:1px solid #cfcfcf;box-shadow:inset 0 1px 2px rgba(0,0,0,.06)';
  const knob = document.createElement('span');
  knob.style.cssText = 'position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:#b08d57;transition:transform .18s ease';
  track.appendChild(knob);
  el.append(l, track, r);
  el.onclick = onToggle;
  document.body.appendChild(el);
  return {
    el,
    sync: (isRight) => {
      knob.style.transform = isRight ? 'translateX(16px)' : 'translateX(0)';
      l.style.color = isRight ? '#aaa' : '#333';
      r.style.color = isRight ? '#333' : '#aaa';
    },
  };
}

const gridSlider = makeSlider('grid', 'individual', 54, () => setMode(mode === 'grid' ? 'individual' : 'grid'));
function syncToggle(): void { gridSlider.sync(mode === 'individual'); }
syncToggle();

// ---- bottom-center button: animate the tori between the wall and their moduli
//      points. Label flips To Moduli ↔ To Grid; hidden in individual view. ----
const morphBtn = document.createElement('button');
morphBtn.className = 'morph-btn';
morphBtn.style.cssText = 'position:fixed;bottom:40px;left:50%;transform:translate(-50%,0);font:11px ui-serif,Georgia,serif;letter-spacing:.05em;color:#5e4626;background:#f7f5f0;border:1px solid #c9bd9e;border-radius:7px;padding:6px 15px;cursor:pointer;user-select:none;box-shadow:0 2px 4px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.65)';
const morphBtnCss = document.createElement('style');
morphBtnCss.textContent =
  '.morph-btn{transition:background .15s,box-shadow .12s,transform .06s}' +
  '.morph-btn:hover{background:#efece2;box-shadow:0 3px 8px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.65)}' +
  '.morph-btn:active{transform:translate(-50%,1px);box-shadow:inset 0 2px 5px rgba(0,0,0,.18)}';
document.head.appendChild(morphBtnCss);
function syncMorphBtn(): void { morphBtn.textContent = morphTarget === 1 ? '→ Grid' : '→ Moduli'; }
morphBtn.onclick = () => { setMorph(morphTarget === 1 ? 0 : 1); syncMorphBtn(); };
syncMorphBtn();
document.body.appendChild(morphBtn);

// ---- subtle ‹ › arrows (individual mode only) ----
const chevrons = document.createElement('div');
chevrons.style.display = 'none';
const makeChevron = (glyph: string, side: 'left' | 'right', onClick: () => void): HTMLElement => {
  const el = document.createElement('div');
  el.textContent = glyph;
  el.style.cssText = `position:fixed;top:50%;${side}:12%;transform:translateY(-50%);font:300 40px ui-serif,Georgia,serif;color:rgba(80,80,80,.35);cursor:pointer;user-select:none;transition:color .15s`;
  el.onmouseenter = () => (el.style.color = 'rgba(80,80,80,.85)');
  el.onmouseleave = () => (el.style.color = 'rgba(80,80,80,.35)');
  el.onclick = onClick;
  chevrons.appendChild(el);
  return el;
};
makeChevron('‹', 'left', () => step(-1));
makeChevron('›', 'right', () => step(1));
document.body.appendChild(chevrons);

// ---- arrow keys step through the census (individual mode) ----
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
});

// apply the initial mode (honors ?view=individual & ?i=N)
setMode(mode);

// ---- subtle credits (bottom-right). Names link to our sites but read as plain
//      text — no underline, a color barely off the background. Fill in the URLs. ----
const CREDITS = [
  { name: 'Fabian Lander', url: 'https://fabianlander.github.io/' },
  { name: 'Steve Trettel', url: 'https://stevejtrettel.site' },
];
const credits = document.createElement('div');
credits.style.cssText = 'position:fixed;bottom:12px;right:14px;text-align:right;font:11px/1.5 ui-serif,Georgia,serif;letter-spacing:.02em;color:#bdb697';
for (const { name, url: href } of CREDITS) {
  const a = document.createElement('a');
  a.textContent = name;
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  a.style.cssText = 'display:block;color:inherit;text-decoration:none;cursor:pointer';
  credits.appendChild(a);
}
document.body.appendChild(credits);
