/**
 * wall-gallery — step through the rhombic-wall flat embedded tori (|Re τ̂| = ½
 * and its SL(2,ℤ) translates) one at a time, the analogue of rect-gallery for
 * the rhombic wall. The folded paper torus hovers above its modulus cell — the
 * reduced lattice parallelogram Λ = ℤ·1 + ℤ·τ̂. Rows are unit-area, so the cell
 * has sides (1/√Im) and τ̂/√Im; for the rhombic wall Re τ̂ = ½ it is a sheared
 * parallelogram (a rectangle only when Re τ̂ = 0).
 *
 * Unlike rect-gallery these tori span SEVERAL triangulations (types 3–7): each
 * per-type file gallery-t<N>.csv is interpreted against byId(N), and the HUD
 * reports the type alongside τ̂, the flatness residual, and the embedding
 * margin — all recomputed LIVE from the row, so the screen certifies exactly
 * the geometry being drawn. (No developed net here — but the modulus τ̂ and the
 * grid UVs come from the holonomy basis, which is generic across all types.)
 *
 * Curate with scripts/curate-wall-gallery.mjs (fattest example per Im bucket,
 * per type). Controls: ← → / on-screen ‹ › step · orbit/pan/zoom · drag the
 * torus to spin it · double-click resets its pose · ?i=N start index.
 *
 * Visuals follow rect-gallery / rich-birthday; WebGL preview only.
 */

import * as THREE from 'three';

import { byId } from '../../src/triangulations';
import { modulus, reduceModulus } from '../../src/topology/develop';
import { maxConeDeficit } from '../../src/functions/coneDeficit';
import { minMargin } from '../../src/functions/minMargin';
import { parseEmbeddings } from '../../src/io/embeddings';
import type { PaperTorus } from '../../src/math/embedding';
import { styledTorus } from '../../src/render/styledTorus';
import { paperMaterials } from '../../src/render/paper';
import { skyEnvironment } from '../../src/render/stage';
import { Studio } from '../../src/render/studio';

const url = new URLSearchParams(location.search);
const CONFIG = {
  torusColor:     '#dcbf6f',
  gridColor:      '#2435AF',
  gridMinorColor: '#4e5988',
  background:     0xf7f5f0,
  lightColor:     '#ffffff',
  cellColor:      '#2435AF',     // modulus-parallelogram outline (and faint fill)
  cellFillOpacity: 0.07,
  cellLineRadius: 0.006,
  torusSize: 1.6, cellSize: 1.7, torusLift: 1.0,
  creases: false, creaseRadius: 0.004,
  roughness: 0.92, gridRepeat: 16, gridSubdivisions: 3, gridMinorWidth: 0.004, gridMajorWidth: 0.012,
  normalMapFile: 'crease-rough.png', normalRepeat: 4, normalScale: 1.0,
  envIntensity: 0.55, ambientIntensity: 0.22, keyIntensity: 2.4,
  keyDir: [-0.4, 0.7, 0.7] as [number, number, number],
};

// ---- studio ----
const studio = new Studio();
skyEnvironment(studio.scene, { intensity: CONFIG.envIntensity, background: CONFIG.background });
studio.scene.add(new THREE.AmbientLight(0xffffff, CONFIG.ambientIntensity));
const key = new THREE.DirectionalLight(CONFIG.lightColor, CONFIG.keyIntensity);
studio.scene.add(key, key.target);
function aimKey(obj: THREE.Object3D): void {
  const sphere = new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere());
  const dir = new THREE.Vector3(...CONFIG.keyDir).normalize();
  key.position.copy(sphere.center).addScaledVector(dir, (sphere.radius || 1) * 3);
  key.target.position.copy(sphere.center);
}

// ---- load every per-type gallery file; type comes from the filename ----
const csvFiles = import.meta.glob('./gallery-t*.csv', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
type Entry = { paper: PaperTorus; type: number; deficit: number; margin: number; tau: readonly [number, number] };
const entries: Entry[] = [];
for (const path of Object.keys(csvFiles).sort()) {
  const type = Number(path.match(/gallery-t(\d+)\.csv$/)![1]);
  const torus = byId(type);
  const group: Entry[] = parseEmbeddings(csvFiles[path], torus).map((paper) => {
    const deficit = maxConeDeficit(torus, paper.positions);
    const tau = reduceModulus(modulus(torus, paper.positions).tau);
    const margin = minMargin(torus, paper.positions).margin;
    return { paper, type, deficit, margin, tau: [tau[0], tau[1]] as const };
  });
  group.sort((a, b) => a.tau[1] - b.tau[1]);   // within a type: thinnest → tallest
  entries.push(...group);                       // grouped by type (files sorted), then Im
}
if (entries.length === 0) throw new Error('wall-gallery: no embeddings — run scripts/curate-wall-gallery.mjs first');

// ---- shared materials ----
const { face: faceMaterial, edge: edgeMaterial } = paperMaterials({
  paperColor: CONFIG.torusColor, gridColor: CONFIG.gridColor, gridMinorColor: CONFIG.gridMinorColor,
  roughness: CONFIG.roughness, gridRepeat: CONFIG.gridRepeat, gridSubdivisions: CONFIG.gridSubdivisions,
  gridMinorWidth: CONFIG.gridMinorWidth, gridMajorWidth: CONFIG.gridMajorWidth,
  normalMapFile: CONFIG.normalMapFile, normalRepeat: CONFIG.normalRepeat, normalScale: CONFIG.normalScale,
});
const cellLineMaterial = new THREE.MeshBasicMaterial({ color: CONFIG.cellColor });
const cellFillMaterial = new THREE.MeshBasicMaterial({
  color: CONFIG.cellColor, transparent: true, opacity: CONFIG.cellFillOpacity, side: THREE.DoubleSide,
});

function fitInPlace(obj: THREE.Object3D, size: number): number {
  const s = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  const k = size / (Math.max(s.x, s.y, s.z) || 1);
  obj.scale.setScalar(k);
  obj.updateMatrixWorld(true);
  obj.position.sub(new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3()));
  return k;
}

/** a tube between two XY-plane points (cylinder's native axis is +Y) */
function tube(a: THREE.Vector3, b: THREE.Vector3, r: number): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length() || 1e-6;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len + 2 * r, 12), cellLineMaterial);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return m;
}

/** modulus cell: parallelogram with lattice edge vectors v1, v2 (XY units),
 *  centered on the origin — outline tubes + faint fill. */
function modulusCell(v1: THREE.Vector2, v2: THREE.Vector2): THREE.Group {
  const g = new THREE.Group();
  const c = new THREE.Vector3((v1.x + v2.x) / 2, (v1.y + v2.y) / 2, 0);   // centroid
  const O = new THREE.Vector3(0, 0, 0).sub(c);
  const A = new THREE.Vector3(v1.x, v1.y, 0).sub(c);
  const B = new THREE.Vector3(v2.x, v2.y, 0).sub(c);
  const AB = new THREE.Vector3(v1.x + v2.x, v1.y + v2.y, 0).sub(c);
  const r = CONFIG.cellLineRadius;
  g.add(tube(O, A, r), tube(A, AB, r), tube(AB, B, r), tube(B, O, r));
  const shape = new THREE.Shape();
  shape.moveTo(O.x, O.y); shape.lineTo(A.x, A.y); shape.lineTo(AB.x, AB.y); shape.lineTo(B.x, B.y); shape.closePath();
  g.add(new THREE.Mesh(new THREE.ShapeGeometry(shape), cellFillMaterial));
  return g;
}

// ---- the single-subject view ----
let subject: THREE.Object3D | null = null;
let torusPivot: THREE.Object3D | null = null;
let idx = (() => { const k = Number(url.get('i')); return Number.isInteger(k) && k >= 0 && k < entries.length ? k : 0; })();

function buildSubject(reframe: boolean): void {
  if (subject) { studio.scene.remove(subject); subject.traverse((o) => (o as THREE.Mesh).geometry?.dispose()); }
  const { paper, tau } = entries[idx];
  const group = new THREE.Group();

  // folded torus, hovering above, in a center pivot (drag to spin)
  const torus = styledTorus(paper, { surface: 'grid', edges: true, faceMaterial, edgeMaterial, edgeRadius: CONFIG.creaseRadius });
  torus.setEdgesVisible(CONFIG.creases);
  torus.rotation.z = Math.PI / 2;
  fitInPlace(torus, CONFIG.torusSize);
  torus.position.y += CONFIG.torusLift;
  const tc = new THREE.Box3().setFromObject(torus).getCenter(new THREE.Vector3());
  torus.position.sub(tc);
  torusPivot = new THREE.Group();
  torusPivot.position.copy(tc);
  torusPivot.add(torus);
  group.add(torusPivot);

  // modulus cell on the ground: unit-area lattice basis 1, τ̂ ⟹
  //   v1 = (1/√Im, 0), v2 = (Re/√Im, √Im).  Built in raw lattice units, then
  //   scaled uniformly for display (preserves the parallelogram shape / aspect).
  const root = Math.sqrt(tau[1]);
  const cell = modulusCell(new THREE.Vector2(1 / root, 0), new THREE.Vector2(tau[0] / root, root));
  fitInPlace(cell, CONFIG.cellSize);
  cell.rotation.x = -Math.PI / 2;
  group.add(cell);

  group.updateMatrixWorld(true);
  group.position.sub(new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3()));
  subject = group;
  studio.scene.add(group);
  aimKey(group);
  if (reframe) studio.frame(group, { direction: new THREE.Vector3(0, 0.6, 1) });
  updateHud();
}

// ---- HUD ----
const hud = document.createElement('div');
hud.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);text-align:center;'
  + 'font:13px/1.7 ui-serif,Georgia,serif;color:#444;letter-spacing:.02em;pointer-events:none;white-space:pre';
document.body.appendChild(hud);
const fmtRe = (re: number): string => `${re < 0 ? '−' : ''}${Math.abs(re).toFixed(5)}`;
function updateHud(): void {
  const { deficit, margin, tau, type } = entries[idx];
  hud.textContent =
    `rhombic wall · type ${type} — torus ${idx + 1} / ${entries.length}\n`
    + `τ̂ = ${fmtRe(tau[0])} + ${tau[1].toFixed(6)} i      |Re τ̂ − ½| = ${Math.abs(Math.abs(tau[0]) - 0.5).toExponential(2)}\n`
    + `flat to ${deficit.toExponential(2)} (max cone deficit)      embedding margin ${margin.toExponential(2)}`;
}

// ---- ‹ › chevrons + arrow keys ----
function step(d: number): void { idx = (idx + d + entries.length) % entries.length; buildSubject(false); }
const makeChevron = (glyph: string, side: 'left' | 'right', onClick: () => void): void => {
  const el = document.createElement('div');
  el.textContent = glyph;
  el.style.cssText = `position:fixed;top:50%;${side}:8%;transform:translateY(-50%);font:300 40px ui-serif,Georgia,serif;color:rgba(80,80,80,.35);cursor:pointer;user-select:none;transition:color .15s`;
  el.onmouseenter = () => (el.style.color = 'rgba(80,80,80,.85)');
  el.onmouseleave = () => (el.style.color = 'rgba(80,80,80,.35)');
  el.onclick = onClick;
  document.body.appendChild(el);
};
makeChevron('‹', 'left', () => step(-1));
makeChevron('›', 'right', () => step(1));
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
});

// ---- drag the torus to spin it in place ----
const ROT_SPEED = 0.01;
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const canvas = studio.renderer.domElement;
let active: THREE.Object3D | null = null;
let lastX = 0, lastY = 0;
function pickPivot(e: PointerEvent | MouseEvent): THREE.Object3D | null {
  if (!torusPivot) return null;
  const rect = canvas.getBoundingClientRect();
  ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, studio.camera);
  return raycaster.intersectObject(torusPivot, true).length > 0 ? torusPivot : null;
}
canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const pivot = pickPivot(e);
  if (!pivot) return;
  e.stopPropagation();
  active = pivot; lastX = e.clientX; lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing';
}, { capture: true });
canvas.addEventListener('pointermove', (e) => {
  if (!active) { canvas.style.cursor = pickPivot(e) ? 'grab' : 'default'; return; }
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
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
canvas.addEventListener('dblclick', (e) => { if (pickPivot(e)) torusPivot?.quaternion.identity(); });

// ---- caption ----
const caption = document.createElement('div');
caption.style.cssText = 'position:fixed;bottom:12px;right:14px;font:11px/1.5 ui-serif,Georgia,serif;color:#999;letter-spacing:.02em;pointer-events:none;text-align:right;white-space:pre';
caption.textContent = 'rhombic-wall flat embedded tori (|Re τ̂| = ½)\n← → step · drag torus to spin · scroll to zoom';
document.body.appendChild(caption);

buildSubject(true);
studio.start();
