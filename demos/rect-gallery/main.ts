/**
 * rect-gallery — step through ONE chosen near-rectangular census file
 * (CONFIG.dataFile below, or ?file=name.csv; CSVs live in this folder, from
 * scripts/search-near-rect.mjs or polish-rect.mjs) one torus at a time:
 * the folded paper torus hovers above its developed net (the flat sheet it
 * folds from), and BESIDE the net lies its modulus rectangle — the reduced
 * lattice cell, drawn in the same developing-plane units at the same display
 * scale. Rows are unit-area, so the rectangle is (1/√Im) × (√Im) and its area
 * visibly matches the net's: the net re-tiles into exactly that rectangle.
 *
 * The HUD reports τ̂ and the flatness residual, recomputed LIVE from the row
 * (not read from the CSV columns), so the screen certifies exactly the
 * geometry being drawn: flat to ~1e-14, rectangular to |Re τ̂|.
 *
 * Curate with scripts/curate-rect-gallery.mjs (best example per Im bucket) or
 * append rows to gallery.csv by hand — standard 24-float rows; extra trailing
 * columns are ignored and the certificate is recomputed from the coordinates.
 *
 * Controls: ← → / on-screen ‹ › step (sorted by Im τ̂) · orbit/pan/zoom ·
 * drag the torus to spin it · double-click resets its pose · ?i=N start index
 * · ?file=other.csv views a different CSV from this folder.
 *
 * Visuals follow renders/rich-birthday (same paper/grid materials, raking key
 * over a soft sky fill); WebGL preview only, no path tracer.
 */

import * as THREE from 'three';

import { RICH } from '@core/triangulations';
import { modulus } from '@core/moduli/modulus';
import { reduceModulus } from '@core/moduli/reduce';
import { maxConeDeficit } from '@core/constraints/flat';
import { parseEmbeddings } from '@core/configuration/csv';
import type { PaperTorus } from '@core/configuration/paperTorus.ts';
import { makeTorusView, type TorusView } from '@display/viewer/TorusView';
import { developedSheet, type DevelopedSheet } from '@display/viewer/developedSheet';
import { modulusCell, type ModulusCell } from '@display/viewer/modulusCell';
import { paperMaterials } from '@display/viewer/materials';
import { skyEnvironment } from '@app/render/stage';
import { Studio } from '@app/render/studio';

// ============================ tweak the whole piece here ============================
const url = new URLSearchParams(location.search);

const CONFIG = {
  // the curated gallery file (in this folder). Override per-visit with ?file=
  dataFile: 'gallery.csv',

  // colors (match rich-birthday)
  torusColor:     '#dcbf6f',
  gridColor:      '#2435AF',
  gridMinorColor: '#4e5988',
  background:     0xf7f5f0,
  lightColor:     '#ffffff',
  rectColor:      '#2435AF',   // modulus-rectangle outline (and faint fill)
  rectFillOpacity: 0.07,
  rectLineRadius: 0.006,

  // layout
  torusSize: 1.6,    // folded torus, floating above
  netSize: 2.3,      // developed sheet's largest extent on the ground
  torusLift: 1.55,   // gap between the ground sheet and the torus
  groundGap: 0.45,   // gap between the net and the rectangle

  // paper surface detail
  creases: false,
  creaseRadius: 0.004,
  foldLineColor: '#4d4d4d',
  foldLineRadius: 0.0022,
  roughness: 0.92,
  gridRepeat: 16,
  gridSubdivisions: 3,
  gridMinorWidth: 0.004,
  gridMajorWidth: 0.012,
  normalMapFile: 'crease-rough.png',
  normalRepeat: 4,
  normalScale: 1.0,

  // lighting
  envIntensity: 0.55,
  ambientIntensity: 0.22,
  keyIntensity: 2.4,
  keyDir: [-0.4, 0.7, 0.7] as [number, number, number],
};
// ====================================================================================

// ---- studio (WebGL preview only) ----
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

// ---- load EXACTLY ONE curated CSV (lazy glob: the others are never fetched).
//      Rows are 24 floats; extra trailing columns (certificates) are ignored. ----
const csvFiles = import.meta.glob('./*.csv', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const dataFile = url.get('file') ?? CONFIG.dataFile;
const loadCsv = csvFiles[`./${dataFile}`];
if (!loadCsv) {
  throw new Error(`rect-gallery: no "./${dataFile}" here — have ${Object.keys(csvFiles).join(', ')}; pick one with ?file=`);
}
type Entry = { paper: PaperTorus; deficit: number; tau: readonly [number, number] };
const entries: Entry[] = parseEmbeddings(await loadCsv(), RICH).map((paper) => {
  // Recompute the certificate from the row itself — the HUD then reports the
  // exact geometry on screen, whatever file it came from.
  const deficit = maxConeDeficit(RICH, paper.positions);
  const tau = reduceModulus(modulus(RICH, paper.positions).tau);
  return { paper, deficit, tau: [tau[0], tau[1]] };
});
entries.sort((a, b) => a.tau[1] - b.tau[1]);   // gallery order: thinnest → tallest rectangle
if (entries.length === 0) throw new Error(`rect-gallery: no embeddings in ${dataFile}`);

// ---- shared materials ----
const { surface: faceMaterial, crease: edgeMaterial } = paperMaterials({
  paperColor: CONFIG.torusColor, gridColor: CONFIG.gridColor, gridMinorColor: CONFIG.gridMinorColor,
  roughness: CONFIG.roughness, gridRepeat: CONFIG.gridRepeat, gridSubdivisions: CONFIG.gridSubdivisions,
  gridMinorWidth: CONFIG.gridMinorWidth, gridMajorWidth: CONFIG.gridMajorWidth,
  normalMapFile: CONFIG.normalMapFile, normalRepeat: CONFIG.normalRepeat, normalScale: CONFIG.normalScale,
});
const foldLineMaterial = new THREE.MeshStandardMaterial({ color: CONFIG.foldLineColor, roughness: 0.5 });

/** Scale obj so its largest extent = size, recenter on the origin; returns the scale. */
function fitInPlace(obj: THREE.Object3D, size: number): number {
  const s = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  const k = size / (Math.max(s.x, s.y, s.z) || 1);
  obj.scale.setScalar(k);
  obj.updateMatrixWorld(true);
  obj.position.sub(new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3()));
  return k;
}

// ---- the single-subject view: torus above, net + modulus cell on the ground ----
let subject: THREE.Object3D | null = null;
let torusPivot: THREE.Object3D | null = null;
let curView: TorusView | null = null, curSheet: DevelopedSheet | null = null, curCell: ModulusCell | null = null;
let idx = (() => { const k = Number(url.get('i')); return Number.isInteger(k) && k >= 0 && k < entries.length ? k : 0; })();

function buildSubject(reframe: boolean): void {
  if (subject) studio.scene.remove(subject);
  curView?.dispose(); curSheet?.dispose(); curCell?.dispose();
  const { paper, tau } = entries[idx];
  const group = new THREE.Group();

  // folded torus, hovering above the ground, in a center pivot (drag to spin)
  const view = makeTorusView(RICH, {
    surface: { material: faceMaterial },
    creases: CONFIG.creases ? { material: edgeMaterial, radius: CONFIG.creaseRadius } : false,
  });
  view.draw(paper.positions);
  curView = view;
  const triang = view.group;
  triang.rotation.z = Math.PI / 2;
  fitInPlace(triang, CONFIG.torusSize);
  triang.position.y += CONFIG.torusLift;
  const tc = new THREE.Box3().setFromObject(triang).getCenter(new THREE.Vector3());
  triang.position.sub(tc);
  torusPivot = new THREE.Group();
  torusPivot.position.copy(tc);
  torusPivot.add(triang);
  group.add(torusPivot);

  // developed net — keep its scale factor so the cell shares it
  const sheetDeco = developedSheet(RICH, { faceMaterial, foldMaterial: foldLineMaterial, foldRadius: CONFIG.foldLineRadius });
  sheetDeco.draw(paper.positions);
  curSheet = sheetDeco;
  const sheet = sheetDeco.group;
  const planeScale = fitInPlace(sheet, CONFIG.netSize);
  sheet.rotation.x = -Math.PI / 2;
  sheet.updateMatrixWorld(true);
  const netW = new THREE.Box3().setFromObject(sheet).getSize(new THREE.Vector3()).x;

  // modulus cell: the reduced lattice parallelogram, at the net's display scale ⟹
  // equal areas on screen (unit-area cell × planeScale; line radius pre-scaled).
  const cellDeco = modulusCell(RICH, {
    lineColor: CONFIG.rectColor, fillColor: CONFIG.rectColor,
    fillOpacity: CONFIG.rectFillOpacity, lineRadius: CONFIG.rectLineRadius / planeScale,
  });
  cellDeco.draw(paper.positions);
  curCell = cellDeco;
  const rect = cellDeco.group;
  rect.scale.setScalar(planeScale);
  rect.rotation.x = -Math.PI / 2;
  const W = (1 / Math.sqrt(tau[1])) * planeScale;

  // side by side on the ground, the pair centered on x = 0
  const total = netW + CONFIG.groundGap + W;
  sheet.position.x = -total / 2 + netW / 2;
  rect.position.x = total / 2 - W / 2;
  group.add(sheet, rect);

  // center the composite (stable framing as you step)
  group.updateMatrixWorld(true);
  group.position.sub(new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3()));
  subject = group;
  studio.scene.add(group);
  aimKey(group);
  if (reframe) studio.frame(group, { direction: new THREE.Vector3(0, 0.6, 1) });
  updateHud();
}

// ---- HUD: τ̂ + flatness, the certificate of the torus on screen ----
const hud = document.createElement('div');
hud.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);text-align:center;'
  + 'font:13px/1.7 ui-serif,Georgia,serif;color:#444;letter-spacing:.02em;pointer-events:none;white-space:pre';
document.body.appendChild(hud);

const fmtRe = (re: number): string => (re === 0 ? '0' : `${re < 0 ? '−' : ''}${Math.abs(re).toExponential(2)}`);
function updateHud(): void {
  const { deficit, tau } = entries[idx];
  hud.textContent =
    `${dataFile} — torus ${idx + 1} / ${entries.length}\n`
    + `τ̂ = ${fmtRe(tau[0])} + ${tau[1].toFixed(8)} i      rectangle 1 : ${tau[1].toFixed(8)}\n`
    + `flat to ${deficit.toExponential(2)} (max cone deficit)      rectangular to ${Math.abs(tau[0]).toExponential(2)} (|Re τ̂|)`;
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

// ---- drag the torus to spin it in place (misses fall through to orbit/pan) ----
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
  active = pivot;
  lastX = e.clientX; lastY = e.clientY;
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

// ---- caption (bottom-right) ----
const caption = document.createElement('div');
caption.style.cssText = 'position:fixed;bottom:12px;right:14px;font:11px/1.5 ui-serif,Georgia,serif;color:#999;letter-spacing:.02em;pointer-events:none;text-align:right;white-space:pre';
caption.textContent = 'near-rectangular flat embedded tori\n← → step · drag torus to spin · scroll to zoom';
document.body.appendChild(caption);

buildSubject(true);
studio.start();
