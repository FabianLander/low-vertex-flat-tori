/**
 * census — one paper torus at a time, staged and lit exactly like rich-birthday-render
 * (gold graph-paper surface, back wall, far soft spotlight, path tracer), but
 * showing a SINGLE subject you step through with the arrow keys:
 *
 *   ← / →     previous / next torus in the 100-torus census
 *   ↑ / ↓     jump back / forward by 10
 *   Render…   resolution popup → path trace · Save PNG · aspect box (top-right)
 *
 * Same materials and lighting as rich-birthday-render; the census is the CSV in this
 * folder. Knobs live in CONFIG below.
 */

import * as THREE from 'three';
import { PhysicalSpotLight } from 'three-gpu-pathtracer';

import { RICH } from '../../src/tori';
import { RICH_REFERENCE } from '../../src/math/reference';
import { parseEmbeddings } from '../../src/io/embeddings';
import { styledTorus } from '../../src/render/styledTorus';
import { paperMaterials } from '../../src/render/paper';
import { skyEnvironment, backWall } from '../../src/render/stage';
import { attachRenderControls } from '../../src/render/controls';
import { Studio } from '../../src/render/studio';

// ============================ tweak the whole look here ============================
const url = new URLSearchParams(location.search);

const CONFIG = {
  // ===================== COLORS (match rich-birthday-render) =====================
  torusColor:     '#dcbf6f',   // the paper
  gridColor:      '#2435AF',   // thick (major) graph lines
  gridMinorColor: '#4e5988',   // thin (fine) graph lines
  wallColor:      '#eceacf',   // background plane
  lightColor:     '#ffffff',   // light source(s)
  // ======================================================================

  // frame
  aspect: 1,                   // canvas aspect ratio (w/h), letterboxed in the window

  // subject
  torus: RICH,                 // combinatorics the CSV rows belong to
  cell: 1.0,                   // torus normalized to this size
  creases: true,
  creaseRadius: 0.004,

  // paper surface detail (same as rich-birthday-render)
  roughness: 0.92,
  gridRepeat: 6,                // major blocks across ONE torus (smaller grid than the 10×10 view)
  gridSubdivisions: 3,
  gridMinorWidth: 0.004,
  gridMajorWidth: 0.012,
  normalMapFile: 'crease-rough.png',
  normalRepeat: Number(url.get('nr')) || 4,
  normalScale: Number(url.get('ns')) || 1.0,

  // background plane
  background: 0xeef0f3,
  planeRoughness: 0.95,
  planeDistance: 0.4,          // initial wall gap behind the subject (× scene radius); the slider takes over after load
  planeSize: 10,               // wall side length (absolute; torus is normalized to cell≈1)

  // lighting (same recipe as rich-birthday-render: env fill + one far, soft spotlight)
  envIntensity: 0.9,
  spot: { intensity: 4, dir: [-0.5, 1.2, 1] as [number, number, number], dist: 6, angle: 1.3, penumbra: 1.3, radius: 1 },
};
// ====================================================================================

// ---- studio + stage ----
const studio = new Studio({ bounces: 5, pathTraceScale: 1, aspect: CONFIG.aspect, onModeChange: updateForMode });
studio.renderer.shadowMap.enabled = true;
studio.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
skyEnvironment(studio.scene, { intensity: CONFIG.envIntensity, background: CONFIG.background });
const ambient = new THREE.AmbientLight(0xffffff, 0.4);   // preview-only fill
studio.scene.add(ambient);

// Rotate the SUBJECT by click-drag instead of orbiting the camera. `orient` is the
// current drag orientation; it's mutated in place and reapplied to each subject so
// the pose persists as you step through the census.
// Camera ROTATE is off (left-drag rotates the torus instead, below); zoom + pan stay
// on: two-finger trackpad scroll / pinch zooms, right-drag (two-finger click-drag) pans.
studio.controls.enableRotate = false;
studio.controls.enablePan = true;
studio.controls.enableZoom = true;
const orient = new THREE.Quaternion();

// ---- load every CSV in this folder ----
const csvs = import.meta.glob('./*.csv', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
let papers = parseEmbeddings(Object.values(csvs).join('\n'), CONFIG.torus);
if (papers.length === 0) papers = [RICH_REFERENCE];

// ---- shared paper materials (per-torus UVs live on the geometry, so it's shared) ----
const { face: faceMaterial, edge: edgeMaterial } = paperMaterials({
  paperColor: CONFIG.torusColor, gridColor: CONFIG.gridColor, gridMinorColor: CONFIG.gridMinorColor,
  roughness: CONFIG.roughness, gridRepeat: CONFIG.gridRepeat, gridSubdivisions: CONFIG.gridSubdivisions,
  gridMinorWidth: CONFIG.gridMinorWidth, gridMajorWidth: CONFIG.gridMajorWidth,
  normalMapFile: CONFIG.normalMapFile, normalRepeat: CONFIG.normalRepeat, normalScale: CONFIG.normalScale,
}, () => studio.notifyMaterialsChanged());

// ---- back wall (re-fit per subject) ----
const wall = backWall({ color: CONFIG.wallColor, width: CONFIG.planeSize, height: CONFIG.planeSize, roughness: CONFIG.planeRoughness });
studio.scene.add(wall);

// Live back-plane distance (× scene radius), driven by the slider below. The
// per-subject staging values are cached so the slider can re-place the wall
// without rebuilding the torus.
let planeDistance = CONFIG.planeDistance;
const wallCenter = new THREE.Vector3();
let wallBackZ = 0, wallRadius = 0.5;
function updateWall(): void {
  wall.position.set(wallCenter.x, wallCenter.y, wallBackZ - wallRadius * planeDistance);
  if (studio.isPathTracing()) { studio.notifySceneChanged(); studio.resetAccumulation(); }
}

// ---- the single far, soft spotlight (re-fit per subject) ----
const spot = new PhysicalSpotLight(CONFIG.lightColor);
spot.intensity = CONFIG.spot.intensity;
spot.angle = CONFIG.spot.angle;
spot.penumbra = CONFIG.spot.penumbra;
spot.decay = 0;
spot.distance = 0;
spot.castShadow = true;
spot.shadow.mapSize.set(2048, 2048);
spot.shadow.radius = 6;
spot.shadow.bias = -0.0002;
studio.scene.add(spot, spot.target);

// ---- subject swap (the arrow keys drive `censusIdx`) ----
let censusIdx = (() => { const k = Number(url.get('i')); return Number.isInteger(k) && k >= 0 && k < papers.length ? k : 0; })();
let subject: THREE.Object3D | null = null;

function setSubject(): void {
  if (subject) {
    studio.scene.remove(subject);
    subject.traverse((o) => { (o as THREE.Mesh).geometry?.dispose(); });
  }

  const t = styledTorus(papers[censusIdx], { surface: 'grid', edges: true, faceMaterial, edgeMaterial, edgeRadius: CONFIG.creaseRadius });
  t.setEdgesVisible(CONFIG.creases);
  const size = new THREE.Box3().setFromObject(t).getSize(new THREE.Vector3());
  t.scale.setScalar(CONFIG.cell / (Math.max(size.x, size.y, size.z) || 1));
  t.rotation.z = Math.PI / 2;
  t.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });

  // re-fit the stage to this torus (radius ≈ half its largest extent)
  const box = new THREE.Box3().setFromObject(t);
  const center = box.getCenter(new THREE.Vector3());
  const radius = 0.5 * Math.max(box.max.x - box.min.x, box.max.y - box.min.y) || 0.5;

  // Wrap the torus in a pivot AT its center so click-drag rotates it in place
  // (camera/wall/light stay put). The torus keeps its exact world position — we
  // only move the rotation origin to the center — so the staging below is unchanged.
  // `orient` carries the current drag pose across subject swaps.
  t.position.sub(center);
  const pivot = new THREE.Group();
  pivot.position.copy(center);
  pivot.quaternion.copy(orient);
  pivot.add(t);
  subject = pivot;
  studio.scene.add(pivot);

  wallCenter.copy(center); wallBackZ = box.min.z; wallRadius = radius;
  updateWall();

  const dir = new THREE.Vector3(...CONFIG.spot.dir).normalize();
  const dist = radius * CONFIG.spot.dist;
  spot.radius = radius * CONFIG.spot.radius;
  spot.position.copy(center).addScaledVector(dir, dist);
  spot.target.position.copy(center);
  spot.shadow.camera.near = Math.max(0.5, dist - radius * 1.5);
  spot.shadow.camera.far = dist + radius * 2;

  studio.frame(subject, { direction: new THREE.Vector3(0, 0, 1) });
  studio.notifySceneChanged();
  studio.resetAccumulation();
}

setSubject();
studio.start();

// ---- click-drag to rotate the subject (orbit controls are disabled) ----
const ROT_SPEED = 0.01;            // radians per pixel of drag
let dragging = false, lastX = 0, lastY = 0;
const canvas = studio.renderer.domElement;
canvas.style.cursor = 'grab';

function applyOrient(): void {
  if (!subject) return;
  subject.quaternion.copy(orient);
  // In path-trace mode the BVH bakes transforms, so a pose change needs a rebuild.
  if (studio.isPathTracing()) { studio.notifySceneChanged(); studio.resetAccumulation(); }
}

canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;      // left button only — leave right-drag for OrbitControls pan
  dragging = true; lastX = e.clientX; lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  // world-axis trackball: horizontal drag yaws about world-up, vertical pitches about world-right
  const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * ROT_SPEED);
  const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * ROT_SPEED);
  orient.premultiply(qYaw).premultiply(qPitch);
  applyOrient();
});
const endDrag = (e: PointerEvent): void => {
  if (!dragging) return;
  dragging = false; canvas.style.cursor = 'grab';
  try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
// double-click resets to the framed front-on pose
canvas.addEventListener('dblclick', () => { orient.identity(); applyOrient(); });

function updateForMode(mode: 'webgl' | 'pathtracing'): void {
  ambient.intensity = mode === 'webgl' ? 0.4 : 0;   // AmbientLight is preview-only
  if (mode === 'pathtracing') studio.notifyMaterialsChanged();
}

function step(d: number): void {
  censusIdx = (censusIdx + d + papers.length) % papers.length;
  setSubject();
}

// ---- render controls (resolution popup + high-res save + aspect), with the
//      census navigation keys passed through ----
attachRenderControls(studio, {
  filename: 'flat-torus.png',
  hud: false,
  keys: {
    ArrowRight: () => step(1),
    ArrowLeft: () => step(-1),
    ArrowDown: () => step(10),
    ArrowUp: () => step(-10),
  },
});

// ---- tiny "which one" counter (top-left, only when not driving the menu) ----
const counter = document.createElement('div');
counter.style.cssText = 'position:fixed;bottom:12px;left:14px;font:12px ui-monospace,monospace;color:#cdd;background:rgba(0,0,0,.45);padding:5px 9px;border-radius:6px;pointer-events:none';
document.body.appendChild(counter);
const tick = (): void => {
  counter.textContent = `torus ${censusIdx + 1} / ${papers.length}   (← → step · ↑ ↓ ±10)`;
  requestAnimationFrame(tick);
};
tick();

// ---- back-plane distance slider (bottom-right) ----
const wallCtrl = document.createElement('div');
wallCtrl.style.cssText = 'position:fixed;bottom:12px;right:14px;display:flex;align-items:center;gap:8px;font:12px ui-monospace,monospace;color:#cdd;background:rgba(0,0,0,.45);padding:6px 10px;border-radius:6px';
const wallLabel = document.createElement('span');
wallLabel.textContent = 'wall';
const wallSlider = document.createElement('input');
wallSlider.type = 'range'; wallSlider.min = '0'; wallSlider.max = '2'; wallSlider.step = '0.01';
wallSlider.value = String(planeDistance);
wallSlider.style.width = '130px';
const wallVal = document.createElement('span');
wallVal.textContent = planeDistance.toFixed(2);
wallSlider.addEventListener('input', () => {
  planeDistance = Number(wallSlider.value);
  wallVal.textContent = planeDistance.toFixed(2);
  updateWall();
});
wallCtrl.append(wallLabel, wallSlider, wallVal);
document.body.appendChild(wallCtrl);
