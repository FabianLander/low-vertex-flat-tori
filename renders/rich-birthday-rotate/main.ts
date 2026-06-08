/**
 * rich-birthday-rotate — the rich-birthday-render grid, but the camera is locked
 * (two-finger zoom only) and each torus spins INDIVIDUALLY in place. Press-drag
 * over a torus to rotate the one under the cursor (a raycaster picks it on
 * pointerdown and locks on for the whole drag); double-click a torus to reset
 * just that one. Every torus keeps its own pose. Render… → path trace; S saves.
 */

import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { PhysicalSpotLight } from 'three-gpu-pathtracer';

import { RICH } from '../../src/tori';
import { RICH_REFERENCE } from '../../src/math/reference';
import { parseEmbeddings } from '../../src/io/embeddings';
import { styledTorus } from '../../src/render/styledTorus';
import { paperMaterials } from '../../src/render/paper';
import { skyEnvironment, backWall } from '../../src/render/stage';
import { attachRenderControls } from '../../src/render/controls';
import { Studio } from '../../src/render/studio';

// ============================ tweak the whole piece here ============================
const url = new URLSearchParams(location.search);

type LightSpec = {
  type: 'area' | 'directional' | 'spot';
  on: boolean;
  intensity: number;
  dir: [number, number, number];     // direction from the scene center to the light
  color?: THREE.ColorRepresentation;  // defaults to CONFIG.lightColor
  size?: number;                      // area: panel size (× scene radius)
  dist?: number;                      // spot: distance (× scene radius)
  angle?: number; penumbra?: number; radius?: number;  // spot
};

const CONFIG = {
  // ===================== COLORS (the palette) =====================
  torusColor:     '#dcbf6f',   // the paper
  gridColor:      '#2435AF',   // thick (major) graph lines
  gridMinorColor: '#4e5988',   // thin (fine) graph lines
  wallColor:      '#eceacf',   // background plane
  lightColor:     '#ffffff',   // light source(s)
  // ================================================================

  // frame
  aspect: 1,                   // canvas aspect ratio (w/h), letterboxed in the window (e.g. 1, 16/9, 4/5)

  // tori + layout
  torus: RICH,                 // combinatorics the CSV rows belong to
  maxTori: 100,                // cap (10×10)
  cell: 1.0,                   // each torus normalized to this size
  spacing: 1.9,                // cell-to-cell gap (× cell)
  surface: 'grid' as 'grid' | 'plain',
  creases: true,
  creaseColor: 0x5a3a1e,       // crease cylinders along the folds
  creaseRadius: 0.004,

  // paper surface detail
  roughness: 0.92,             // 0 glossy … 1 matte paper
  gridRepeat: 16,               // major blocks across each torus (INTEGER ⟹ seamless)
  gridSubdivisions: 3,         // fine squares per major block ⟹ a thick line every Nth (3 = 3×3)
  gridMinorWidth: 0.004,       // thin-line thickness (fraction of a major block)
  gridMajorWidth: 0.012,       // thick-line thickness
  normalMapFile: 'crease-rough.png',           // in assets/textures/
  normalRepeat: Number(url.get('nr')) || 4,    // low = large creases (?nr=)
  normalScale: Number(url.get('ns')) || 1.0,   // tooth strength (?ns=)

  // background plane
  background: 0xeef0f3,        // sky tint (mostly hidden by the plane)
  showPlane: true,
  planeRoughness: 0.95,         // 1 = fully matte, lower = sheen/reflection
  planeDistance: 0.0,         // how far behind the grid (× scene radius)
  planeSize: 40,               // HUGE so it fills the view even zoomed out (× scene radius)

  // lighting — env fill + a list of lights you can MIX & MATCH (toggle `on`).
  //   type: 'area' (soft softbox) · 'directional' (hard sun) · 'spot' (cone)
  //   shared: on, intensity, dir (center→light), color (defaults to lightColor)
  //   area:   size  (× radius; BIGGER = softer)
  //   spot:   dist (× radius), angle, penumbra, radius  (BIGGER radius = softer)
  envIntensity: 0.9,
  lights: [
    { type: 'area',        on: false, intensity: 4,  dir: [0.25, 0.35, 1], size: 0.6 },
    { type: 'directional', on: false, intensity: 1,  dir: [-0.4, 0.5, 0.9] },
    // above, equally left + out-of-screen, FAR away (even rays) and big & soft
    { type: 'spot',        on: true,  intensity: 4, dir: [-0.5, 1.2, 1], dist: 6, angle: 1.3, penumbra: 1.3, radius: 1 },
  ] as LightSpec[],
};
// ====================================================================================

// ---- studio ----
const studio = new Studio({ bounces: 5, pathTraceScale: 1, aspect: CONFIG.aspect, onModeChange: updateForMode });
studio.renderer.shadowMap.enabled = true;
studio.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
skyEnvironment(studio.scene, { intensity: CONFIG.envIntensity, background: CONFIG.background });
const ambient = new THREE.AmbientLight(0xffffff, 0.4);   // preview-only fill
studio.scene.add(ambient);

// ---- load every CSV in this folder ----
const csvs = import.meta.glob('./*.csv', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
let papers = parseEmbeddings(Object.values(csvs).join('\n'), CONFIG.torus);
if (papers.length === 0) papers = [RICH_REFERENCE];
papers = papers.slice(0, CONFIG.maxTori);

// ---- shared paper material (per-torus UVs live on the geometry, so it's shared) ----
const { face: faceMaterial, edge: edgeMaterial } = paperMaterials({
  surface: CONFIG.surface,
  paperColor: CONFIG.torusColor, gridColor: CONFIG.gridColor, gridMinorColor: CONFIG.gridMinorColor,
  roughness: CONFIG.roughness, gridRepeat: CONFIG.gridRepeat, gridSubdivisions: CONFIG.gridSubdivisions,
  gridMinorWidth: CONFIG.gridMinorWidth, gridMajorWidth: CONFIG.gridMajorWidth,
  normalMapFile: CONFIG.normalMapFile, normalRepeat: CONFIG.normalRepeat, normalScale: CONFIG.normalScale,
}, () => studio.notifyMaterialsChanged());

// ---- build the grid (surface always 'grid' so lattice UVs exist for the normal map) ----
const cols = Math.ceil(Math.sqrt(papers.length));
const rows = Math.ceil(papers.length / cols);
const grid = new THREE.Group();
const tori: ReturnType<typeof styledTorus>[] = [];   // inner torus objects (for the V edge toggle)
const pivots: THREE.Object3D[] = [];    // one center-pivot per torus (the rotatable handle)
papers.forEach((paper, i) => {
  // edges are always built so V can reveal them; CONFIG.creases sets the initial visibility
  const t = styledTorus(paper, { surface: 'grid', edges: true, faceMaterial, edgeMaterial, edgeRadius: CONFIG.creaseRadius });
  t.setEdgesVisible(CONFIG.creases);
  const size = new THREE.Box3().setFromObject(t).getSize(new THREE.Vector3());
  t.scale.setScalar(CONFIG.cell / (Math.max(size.x, size.y, size.z) || 1));
  t.rotation.z = Math.PI / 2;
  const c = i % cols, r = Math.floor(i / cols);
  t.position.set((c - (cols - 1) / 2) * CONFIG.spacing, ((rows - 1) / 2 - r) * CONFIG.spacing, 0);

  // Wrap each torus in a pivot AT its center so the drag spins it in place. The
  // grid layout is identical (pivot.position + the torus's local offset reproduce
  // the cell); only the rotation origin moves to the center. pivot.quaternion is
  // this torus's independent pose, mutated by the raycast-driven drag below.
  const center = new THREE.Box3().setFromObject(t).getCenter(new THREE.Vector3());
  t.position.sub(center);
  const pivot = new THREE.Group();
  pivot.position.copy(center);
  pivot.add(t);
  grid.add(pivot);
  tori.push(t);
  pivots.push(pivot);
});
grid.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
studio.add(grid);

// ---- scene extent (grid is centered ⟹ center ≈ origin) ----
const gbox = new THREE.Box3().setFromObject(grid);
const gsize = gbox.getSize(new THREE.Vector3());
const gcenter = gbox.getCenter(new THREE.Vector3());
const radius = 0.5 * Math.max(gsize.x, gsize.y);

// ---- background plane (large, so it fills the frame at any zoom) ----
let wall: THREE.Mesh | undefined;
if (CONFIG.showPlane) {
  const s = radius * CONFIG.planeSize;
  wall = backWall({ color: CONFIG.wallColor, width: s, height: s, roughness: CONFIG.planeRoughness });
  wall.position.set(gcenter.x, gcenter.y, gbox.min.z - radius * CONFIG.planeDistance);
  studio.scene.add(wall);
}

// ---- lights: build each entry by type, all aimed at the scene center ----
RectAreaLightUniformsLib.init();   // required for RectAreaLight to light the WebGL preview
for (const L of CONFIG.lights) {
  if (!L.on) continue;
  const color = L.color ?? CONFIG.lightColor;
  const dir = new THREE.Vector3(L.dir[0], L.dir[1], L.dir[2]).normalize();

  if (L.type === 'area') {
    // soft "softbox" panel — diffuse soft shadows in the path trace (no preview shadow)
    const p = radius * (L.size ?? 0.6);
    const light = new THREE.RectAreaLight(color, L.intensity, p, p);
    light.position.copy(gcenter).addScaledVector(dir, radius * 3);
    light.lookAt(gcenter);
    studio.scene.add(light);

  } else if (L.type === 'directional') {
    // hard "sun" — crisp shadow in preview + path trace
    const light = new THREE.DirectionalLight(color, L.intensity);
    light.position.copy(gcenter).addScaledVector(dir, radius * 3);
    light.target.position.copy(gcenter);
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    const c = light.shadow.camera;
    c.left = -radius * 1.4; c.right = radius * 1.4; c.top = radius * 1.4; c.bottom = -radius * 1.4;
    c.near = 0.5; c.far = radius * 8; c.updateProjectionMatrix();
    light.shadow.bias = -0.0002;
    studio.scene.add(light, light.target);

  } else {
    // spotlight cone — soft shadows scale with `radius` (× scene radius)
    const dist = radius * (L.dist ?? 2.2);
    const light = new PhysicalSpotLight(color);
    light.intensity = L.intensity;
    light.angle = L.angle ?? 0.6;
    light.penumbra = L.penumbra ?? 0.7;
    light.decay = 0;
    light.distance = 0;
    light.radius = radius * (L.radius ?? 0.15);
    light.position.copy(gcenter).addScaledVector(dir, dist);
    light.target.position.copy(gcenter);
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.camera.near = Math.max(0.5, dist - radius * 1.5);
    light.shadow.camera.far = dist + radius * 2;
    light.shadow.radius = 6;
    light.shadow.bias = -0.0002;
    studio.scene.add(light, light.target);
  }
}

studio.frame(grid, { direction: new THREE.Vector3(0, 0, 1) });
studio.start();

// ---- lock the camera: rotate + pan off, only two-finger zoom remains ----
studio.controls.enableRotate = false;
studio.controls.enablePan = false;
studio.controls.enableZoom = true;

// ---- raycast-pick a torus on press, then click-drag to spin THAT one in place ----
const ROT_SPEED = 0.01;            // radians per pixel of drag
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const canvas = studio.renderer.domElement;
canvas.style.cursor = 'default';

let active: THREE.Object3D | null = null;   // pivot currently being dragged
let lastX = 0, lastY = 0;

// ---- hover highlight: a subtle scale bump on the torus under the pointer ----
// This is PREVIEW-ONLY. It never reaches the path-trace bake because (a) it's
// suppressed whenever we're tracing, and (b) pointerleave clears it — and the
// Render button opens a resolution dialog first, so the pointer always leaves
// the canvas (clearing the bump) before the tracer reads the scene.
const HOVER_SCALE = 1.05;
let hovered: THREE.Object3D | null = null;
function setHover(pivot: THREE.Object3D | null): void {
  if (pivot !== hovered) {
    if (hovered) hovered.scale.setScalar(1);          // restore the previous one
    hovered = pivot;
    if (hovered && !studio.isPathTracing()) hovered.scale.setScalar(HOVER_SCALE);
  }
  canvas.style.cursor = active ? 'grabbing' : pivot ? 'grab' : 'default';
}

// Cursor-ray → the pivot under the pointer (null if the ray misses every torus).
// Walks up from the hit mesh to the pivot that is a direct child of `grid`.
function pickPivot(e: PointerEvent | MouseEvent): THREE.Object3D | null {
  const rect = canvas.getBoundingClientRect();
  ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, studio.camera);
  const hits = raycaster.intersectObjects(pivots, true);
  if (hits.length === 0) return null;
  let o: THREE.Object3D = hits[0].object;
  while (o.parent && o.parent !== grid) o = o.parent;
  return o.parent === grid ? o : null;
}

// A pose change rebuilds the path-trace BVH (it bakes transforms), so nudge it.
function poseChanged(): void {
  if (studio.isPathTracing()) { studio.notifySceneChanged(); studio.resetAccumulation(); }
}

canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;      // left button only
  const pivot = pickPivot(e);
  if (!pivot) return;              // missed every torus → let OrbitControls (zoom) keep it
  if (hovered) { hovered.scale.setScalar(1); hovered = null; }   // drop the bump before posing
  active = pivot;
  lastX = e.clientX; lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('pointermove', (e) => {
  if (!active) { setHover(pickPivot(e)); return; }
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  // world-axis trackball: horizontal drag yaws about world-up, vertical pitches about world-right
  const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * ROT_SPEED);
  const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * ROT_SPEED);
  active.quaternion.premultiply(qYaw).premultiply(qPitch);
  poseChanged();
});
const endDrag = (e: PointerEvent): void => {
  if (!active) return;
  active = null;
  try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  setHover(pickPivot(e));          // re-evaluate hover/cursor where the pointer ended up
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointerleave', () => { if (!active) setHover(null); });
// double-click a torus to reset just that one to the framed front-on pose
canvas.addEventListener('dblclick', (e) => {
  const pivot = pickPivot(e);
  if (!pivot) return;
  pivot.quaternion.identity();
  poseChanged();
});

function updateForMode(mode: 'webgl' | 'pathtracing'): void {
  ambient.intensity = mode === 'webgl' ? 0.4 : 0;   // AmbientLight is preview-only
  if (mode === 'pathtracing') { setHover(null); studio.notifyMaterialsChanged(); }
}

// V toggles the edge tubes on every torus (preview); re-render to bake into the trace
let edgesShown = CONFIG.creases;
function toggleEdges(): void {
  edgesShown = !edgesShown;
  for (const t of tori) t.setEdgesVisible(edgesShown);
  studio.notifySceneChanged();
  studio.resetAccumulation();
}

// Clean frame: no HUD, no color pickers — just the Render button. (Colors are
// set in CONFIG above; V toggles the edge tubes.)
attachRenderControls(studio, {
  filename: 'rich-birthday-rotate.png',
  hud: false,
  keys: { v: toggleEdges },
});

// ---- save every torus's current pose as a CSV (same 24-column format as the source) ----
// Each torus's pose is its pivot.quaternion. The CSV stores raw vertex coordinates,
// so we save the pose by BAKING it into the coordinates (about each torus's centroid).
// On load every torus gets the fixed display rotation Rz(π/2), so to reproduce the
// on-screen pose we bake R = Rz(-π/2)·pivot·Rz(π/2). An un-posed torus ⟹ R = identity
// ⟹ that row is an exact copy of the source.
function posedCsv(): string {
  const qZinv = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2).invert();
  const qZ = qZinv.clone().invert();
  const R = new THREE.Quaternion();
  const v = new THREE.Vector3(), c = new THREE.Vector3();
  const out: string[] = [];
  papers.forEach((paper, i) => {
    R.copy(qZinv).multiply(pivots[i].quaternion).multiply(qZ);   // bake this torus's pose, undoing the display Rz(π/2)
    const p = paper.positions;                                    // 24 numbers (8 vertices × xyz)
    c.set(0, 0, 0);
    for (let k = 0; k < p.length; k += 3) c.add(v.set(p[k], p[k + 1], p[k + 2]));
    c.multiplyScalar(3 / p.length);                               // centroid (÷ vertex count)
    const cols: string[] = [];
    for (let k = 0; k < p.length; k += 3) {
      v.set(p[k], p[k + 1], p[k + 2]).sub(c).applyQuaternion(R).add(c);
      cols.push(v.x.toFixed(10), v.y.toFixed(10), v.z.toFixed(10));
    }
    out.push(cols.join(','));
  });
  return out.join('\n') + '\n';
}

const saveBtn = document.createElement('button');
saveBtn.textContent = 'save poses ⬇';
saveBtn.title = 'download all tori in their current orientations as a CSV (drop-in replacement for the source)';
saveBtn.style.cssText = 'font:12px ui-monospace,monospace;color:#e8e8ec;background:#2a2a30;border:1px solid #555;border-radius:5px;padding:5px 10px;cursor:pointer';
saveBtn.onclick = () => {
  const blob = new Blob([posedCsv()], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'torus-trace-tori.csv';
  a.click();
  URL.revokeObjectURL(a.href);
};

// ---- back-wall distance slider (0 … 0.5 × scene radius) ----
let planeDistance = CONFIG.planeDistance;
function updateWall(): void {
  if (!wall) return;
  wall.position.z = gbox.min.z - radius * planeDistance;
  if (studio.isPathTracing()) { studio.notifySceneChanged(); studio.resetAccumulation(); }
}
const wallCtrl = document.createElement('label');
wallCtrl.style.cssText = 'display:flex;align-items:center;gap:8px;font:12px ui-monospace,monospace;color:#e8e8ec;background:#2a2a30;border:1px solid #555;border-radius:5px;padding:0 10px';
const wallLabel = document.createElement('span'); wallLabel.textContent = 'wall';
const wallSlider = document.createElement('input');
wallSlider.type = 'range'; wallSlider.min = '0'; wallSlider.max = '0.5'; wallSlider.step = '0.01';
wallSlider.value = String(planeDistance);
wallSlider.style.width = '110px';
const wallVal = document.createElement('span'); wallVal.style.minWidth = '26px'; wallVal.textContent = planeDistance.toFixed(2);
wallSlider.addEventListener('input', () => {
  planeDistance = Number(wallSlider.value);
  wallVal.textContent = planeDistance.toFixed(2);
  updateWall();
});
wallCtrl.append(wallLabel, wallSlider, wallVal);

// ---- edge tube radius slider (0 = no tubes … CONFIG.creaseRadius = current width) ----
let edgeRadius = CONFIG.creaseRadius;
let edgeDirty = false;
function rebuildEdges(): void { for (const t of tori) t.setEdgeRadius(edgeRadius); }
function queueEdges(): void {                 // coalesce many slider events into one rebuild/frame
  if (edgeDirty) return;
  edgeDirty = true;
  requestAnimationFrame(() => { edgeDirty = false; rebuildEdges(); });
}
const edgeCtrl = document.createElement('label');
edgeCtrl.style.cssText = 'display:flex;align-items:center;gap:8px;font:12px ui-monospace,monospace;color:#e8e8ec;background:#2a2a30;border:1px solid #555;border-radius:5px;padding:0 10px';
const edgeLabel = document.createElement('span'); edgeLabel.textContent = 'edge';
const edgeSlider = document.createElement('input');
edgeSlider.type = 'range'; edgeSlider.min = '0'; edgeSlider.max = String(CONFIG.creaseRadius); edgeSlider.step = String(CONFIG.creaseRadius / 40);
edgeSlider.value = String(edgeRadius);
edgeSlider.style.width = '110px';
const edgeVal = document.createElement('span'); edgeVal.style.minWidth = '42px'; edgeVal.textContent = edgeRadius.toFixed(4);
edgeSlider.addEventListener('input', () => { edgeRadius = Number(edgeSlider.value); edgeVal.textContent = edgeRadius.toFixed(4); queueEdges(); });
edgeSlider.addEventListener('change', () => { rebuildEdges(); if (studio.isPathTracing()) { studio.notifySceneChanged(); studio.resetAccumulation(); } });
edgeCtrl.append(edgeLabel, edgeSlider, edgeVal);

// Stack all three just UNDER the render toolbar (top-right), each on its own line.
const panel = document.createElement('div');
panel.style.cssText = 'position:fixed;top:46px;right:12px;display:flex;flex-direction:column;gap:6px;align-items:flex-end;z-index:10';
panel.append(wallCtrl, saveBtn, edgeCtrl);
document.body.appendChild(panel);
