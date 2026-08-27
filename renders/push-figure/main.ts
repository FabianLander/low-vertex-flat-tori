/**
 * push-figure — the paper's push-off as a figure, at the FURTHEST push that still works.
 *
 * Two panels of the same torus, always seen from one orientation: left, the fold — collapsed
 * flat into the plane, already an exact flat torus of modulus exactly i (square) or ρ
 * (hexagonal), and of course not embedded; right, that fold pushed off by t and corrected back
 * onto {flat} ∩ {τ = τ₀} by the paper's own 9×9 implicit-function step. The push shown is the
 * LAST ONE THAT IS STILL EMBEDDED — the edge of what the argument delivers:
 *
 *     square      t = 0.136   (the 9×9 goes on solving to t ≈ 1.19, but not embedded)
 *     hexagonal   t = 0.013   (and to t ≈ 0.056)
 *
 * THE ARROWS ARE ζ. Lander's push-off is not a translation of the whole configuration by one
 * vector, nor a separate direction per vertex: ζ is ONE HEIGHT PER VERTEX, and
 * `liftedPositions` sends v to (Q_v, t·ζ_v). Every vertex moves along the same axis,
 * perpendicular to the fold's plane; only the signed distance differs. On the square base
 * ζ₇ = 0, so that vertex does not move and gets no arrow; on the hexagonal base every ζ_v is
 * nonzero and all eight move.
 *
 * AND THE ARROWS ARE TRUE OF BOTH PANELS. The nine coordinates the correction is free to move
 * (§6) are all PLANAR ones — the heights are frozen — so the corrected torus has exactly the
 * same z as the raw lift, to the last bit (measured: max|Δz| = 0 at every t). The correction
 * only slides vertices sideways. So an arrow drawn on the fold shows the FINAL height of that
 * vertex, and the pair reads as "here is where each vertex goes, and here is what had to slide
 * to keep it flat".
 *
 * THE SCENE WIRING IS `renders/paper-tori`'s, deliberately and to the letter — the same
 * `makeTorusView` options (centred groups, crease tubes built and hidden), the same baked-edge
 * surface, groups scaled and added straight to one row, the studio's own camera left alone.
 * An earlier version of this file did the same job through its own arrangement — uncentred
 * views inside nested scaled groups, and a narrowed fov — and the hexagonal torus came out
 * BLACK in the path trace while the square was fine and both were fine in preview. Rather than
 * keep bisecting a difference that only the tracer could see, it now shares the wiring of a
 * figure known to trace correctly. Keep it that way: if this needs restructuring, check the
 * hexagonal side in an actual path trace, not in the preview.
 *
 * Data from `npm run paper-push`, whose every rung is verified flat to 1e-11 and at its exact
 * modulus to 1e-11; the panel is checked again here before it is drawn.
 *
 *   buttons    square ↔ hexagonal (reloads; the panels are built at load)
 *   drag       turn BOTH panels together, about each one's own centre
 *   G          reset the orientation
 *   ?zmul=     vertical exaggeration (hexagonal ×3, square ×1) — the vertices are simply
 *              moved farther along z before drawing; verification uses the true positions
 *   A          longer arrows (5% → 7% → 9% → 12% → 18% of the fold's width) · shift-A true length
 *              — the exaggeration factor is printed to the console every time it changes
 *   Render…    path trace · S saves
 */

import * as THREE from 'three';
import { PhysicalSpotLight } from 'three-gpu-pathtracer';

import { SQUARE_FOLD, HEXAGONAL_FOLD, liftedPositions, type FoldedBase } from '@core/sampling/foldedBases.ts';
import { measure } from '@core/search/measure.ts';
import { makeTorusView, type TorusView } from '@display/viewer/TorusView';
import { paperMaterials } from '@display/viewer/materials';
import { latticeEdgeTexture, imageBackedTexture } from '@display/viewer/gridTexture';
import { skyEnvironment, backWall } from '@app/render/stage';
import { attachRenderControls } from '@app/render/controls';
import { Studio } from '@app/render/studio';
import squareData from '../../demos/steve-paper-push/data/square.csv?raw';
import hexData from '../../demos/steve-paper-push/data/hexagonal.csv?raw';

const url = new URLSearchParams(location.search);
const num = (k: string, d: number) => (url.get(k) !== null ? Number(url.get(k)) : d);

const CONFIG = {
  // ===================== COLORS (matched to the birthday renders) =====================
  torusColor:     '#dcbf6f',
  gridColor:      '#2435AF',
  gridMinorColor: '#4e5988',
  wallColor:      '#eceacf',
  lightColor:     '#ffffff',
  arrowUp:        '#2f7d55',   // ζ_v > 0
  arrowDown:      '#a8522a',   // ζ_v < 0
  // ====================================================================================

  torus: (url.get('torus') ?? 'square') as 'square' | 'hex',
  aspect: 16 / 9,

  /** Which rung: by default the last one still embedded — the edge of the argument. `?t=`
   *  picks the nearest rung to a given push-off height instead. */
  t: url.get('t') !== null ? Number(url.get('t')) : null,

  cell: 1.0,                   // the FOLD is normalized to this; the pushed panel shares it
  gap: 0.45,                   // clear space between the two panels (× cell)

  /** Arrow geometry, as fractions of the fold's width. The head is additionally capped at a
   *  fraction of each arrow's own length: the two pushes differ by an order of magnitude
   *  (0.136 against 0.013), so a fixed head right for the square is four times the whole
   *  hexagonal arrow. */
  /** Shaft radius, as a fraction of the fold's width. */
  arrowRadius: num('ar', 0.011),
  /** Head radius and length as MULTIPLES OF THE SHAFT RADIUS, not of the fold — so the arrow
   *  keeps one recognisable shape at every length. Tying the head to the arrow's own length
   *  instead made the heads shrink along with the arrows until they were barely wider than the
   *  shaft and read as a pip rather than a cone standing on top of a column. */
  arrowHeadRadius: num('ahr', 2.8),
  arrowHeadLength: num('ah', 3.2),
  /**
   * HOW LONG THE ARROWS ARE DRAWN, as the longest one's fraction of the fold's width. At true
   * length they are invisible in the figure: the whole point of the last embedded rung is that
   * the push is small, so the square's longest arrow is 8% of the panel and the hexagonal one's
   * is 1.3%. Worse, the two differ by an order of magnitude, so any single exaggeration factor
   * is wrong for one of them. Setting a TARGET instead and solving for the factor makes both
   * read the same, and the factor it chose is printed to the console so a caption can state it.
   * 7% is about a third of what first read as "visible" — enough to see the direction and the
   * relative sizes without the arrows dominating the paper they sit on.
   * `?ax=` overrides with an absolute factor (`?ax=1` for true length).
   */
  arrowTarget: num('at', 0.07),
  arrowExaggeration: url.get('ax') !== null ? Number(url.get('ax')) : null,

  /** DISPLAY ONLY: separate the fold's coincident sheets by this fraction of its width, so
   *  they do not z-fight. Microscopic, and never part of what is verified. */
  planarLift: num('lift', 0.002),

  /**
   * VERTICAL EXAGGERATION — a deliberate distortion, and the only one here that changes the
   * SHAPE rather than a decoration. The hexagonal torus's furthest embedded push is t = 0.013
   * against the square's 0.136, so drawn honestly it is a flat sheet with an imperceptible
   * ripple and the figure says nothing. Stretching z by 2–4 makes the ripple legible.
   *
   * It is applied as a non-uniform scale on the GROUP, never to the coordinates: the geometry,
   * its lattice UVs, and everything measured stay exactly the true torus, so the graph paper is
   * still the undistorted fundamental domain and only the rendered shape is stretched. The
   * stretch applies to the RIGHT-hand panel only; the arrows sit on the fold's group and keep
 * their own length.
   *
   * Done the simplest way there is: the vertices of the right-hand panel are MOVED FARTHER
   * along z before anything is drawn — `z ← z · zMul` — and the drawing code is exactly what it
   * was without it. Two earlier attempts to do this "properly" (a non-uniform scale on the
   * group; scaling the geometry buffer after the fact) each traced black, so this stays as
   * plain data.
   *
   * ×3 on the hexagonal side, ×1 (true shape) on the square, which does not need it. `?zmul=`
   * overrides. The factor is printed — it belongs in the caption.
   *
   * WHAT IT COSTS: the drawn torus is no longer flat, so its developed net is no longer a
   * perfect isometry and the graph paper's squares are very slightly out of true. The BAKED
   * TEXTURE IS BUILT FROM THE DRAWN CONFIGURATION for exactly this reason — bake it from the
   * true one and the edges, which are the 1-skeleton in the net's own coordinates, land where
   * the edges would be on the unstretched torus instead of where they are. Everything VERIFIED
   * is still measured on the true positions, which are untouched.
   */
  zMul: num('zmul', url.get('torus') === 'hex' ? 3 : 1),

  // paper surface detail (same knobs as rich-birthday-render)
  edgeColor: '#241a10',
  edgeWidth: num('ew', 0.0045),
  creaseRadius: 0.004,
  roughness: 0.92,
  gridRepeat: 16,
  gridSubdivisions: 3,
  gridMinorWidth: 0.004,
  gridMajorWidth: 0.012,
  textureSize: num('texsize', 4096),
  normalMapFile: 'crease-rough.png',
  normalRepeat: num('nr', 4),
  normalScale: num('ns', 1.0),

  // stage
  background: 0xeef0f3,
  showPlane: true,
  planeRoughness: 0.95,
  planeDistance: 0.35,
  planeSize: 40,
  envIntensity: 0.9,
  spotIntensity: 4,
};

const BASES: Record<string, FoldedBase> = { square: SQUARE_FOLD, hex: HEXAGONAL_FOLD };
const DATA: Record<string, string> = { square: squareData, hex: hexData };
const base = BASES[CONFIG.torus];

// ---- the rung to draw ----
interface Rung { t: number; embedded: boolean; positions: Float64Array }
const rungs: Rung[] = DATA[CONFIG.torus].trim().split('\n').filter(Boolean).map((line) => {
  const v = line.split(',').map(Number);
  return { t: v[0], embedded: v[4] === 1, positions: Float64Array.from(v.slice(6)) };
});
const embeddedRungs = rungs.filter((r) => r.embedded);
const chosen = CONFIG.t !== null
  ? rungs.reduce((a, b) => (Math.abs(b.t - CONFIG.t!) < Math.abs(a.t - CONFIG.t!) ? b : a))
  : embeddedRungs[embeddedRungs.length - 1];

// ---- verify before drawing: the figure claims this is flat, at modulus, and embedded ----
const check = measure(base.triang, chosen.positions);
const problems: string[] = [];
if (check.coneDeficit > 1e-9) problems.push(`the pushed torus is not flat (deficit ${check.coneDeficit.toExponential(2)})`);
if (!check.embedded && CONFIG.t === null) problems.push('the chosen rung is not embedded');
console.log(`push-figure — ${base.label}`);
console.log(`  drawing t=${chosen.t.toFixed(4)}${CONFIG.t === null ? ' (the LAST embedded rung)' : ''}`
  + `  ·  deficit ${check.coneDeficit.toExponential(1)} · embedded ${check.embedded}`
  + ` · τ̂ [${check.tauHat.map((v) => v.toFixed(4)).join(', ')}]`);
console.log(`  ζ = [${base.lift.map((z) => z.toFixed(4)).join(', ')}]`
  + `  — ${base.lift.filter((z) => z !== 0).length} of ${base.lift.length} vertices move`);
console.log(`  vertical exaggeration ×${CONFIG.zMul}`
  + `${CONFIG.zMul === 1 ? ' (TRUE SHAPE)' : ' — the drawn vertices are moved farther in z; state this in the caption'}`);
if (problems.length) {
  const banner = document.createElement('div');
  banner.style.cssText = ['position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:99',
    'background:#7a1f1f', 'color:#fff', 'font:12px/1.5 system-ui,sans-serif', 'padding:8px 14px'].join(';');
  banner.innerHTML = '<b>push-figure</b><br>' + problems.map((p) => `• ${p}`).join('<br>');
  document.body.appendChild(banner);
}

// ---- studio (paper-tori's, unchanged — the camera is left as the studio made it) ----
const studio = new Studio({ bounces: 5, pathTraceScale: 1, aspect: CONFIG.aspect, onModeChange: updateForMode });
studio.renderer.shadowMap.enabled = true;
studio.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
skyEnvironment(studio.scene, { intensity: CONFIG.envIntensity, background: CONFIG.background });
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
studio.scene.add(ambient);

// ---- the paper: edges baked in, so nothing pokes through the fold ----
const shared = paperMaterials({
  surface: 'grid',
  paperColor: CONFIG.torusColor, gridColor: CONFIG.gridColor, gridMinorColor: CONFIG.gridMinorColor,
  roughness: CONFIG.roughness, gridRepeat: CONFIG.gridRepeat, gridSubdivisions: CONFIG.gridSubdivisions,
  gridMinorWidth: CONFIG.gridMinorWidth, gridMajorWidth: CONFIG.gridMajorWidth,
  normalMapFile: CONFIG.normalMapFile, normalRepeat: CONFIG.normalRepeat, normalScale: CONFIG.normalScale,
}, () => studio.notifyMaterialsChanged());
const normalMap = shared.surface.normalMap;

let panelNo = 0;
function surfaceFor(positions: Float64Array): THREE.MeshStandardMaterial {
  const canvasMap = latticeEdgeTexture(base.triang, positions, {
    size: CONFIG.textureSize,
    bg: CONFIG.torusColor, minor: CONFIG.gridMinorColor, major: CONFIG.gridColor,
    gridRepeat: CONFIG.gridRepeat, gridSubdivisions: CONFIG.gridSubdivisions,
    minorWidth: CONFIG.gridMinorWidth, majorWidth: CONFIG.gridMajorWidth,
    edgeColor: CONFIG.edgeColor, edgeWidth: CONFIG.edgeWidth,
  });
  const map = imageBackedTexture(canvasMap, () => studio.notifyMaterialsChanged(),
    `${CONFIG.torus} panel ${++panelNo}`);
  const m = new THREE.MeshStandardMaterial({
    map, vertexColors: true, roughness: CONFIG.roughness, metalness: 0,
    flatShading: true, side: THREE.DoubleSide,
  });
  if (normalMap) { m.normalMap = normalMap; m.normalScale.set(CONFIG.normalScale, CONFIG.normalScale); }
  return m;
}

// ---- the two panels ----
const foldPositions = liftedPositions(base, 0);
const width = (() => {
  let lo = Infinity, hi = -Infinity;
  for (const [x] of base.planar) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  return hi - lo;
})();

/** The fold, with a microscopic display-only z-lift so the coincident sheets separate. */
const foldDisplay = Float64Array.from(foldPositions);
for (let v = 0; v < base.triang.vertexCount; v++) {
  foldDisplay[3 * v + 2] = CONFIG.planarLift * width * base.lift[v];
}

/** Bounding-box centre of the V vertex positions — the same offset `makeTorusView(center: true)`
 *  applies to the geometry, so anything drawn alongside it (the arrows) must use it too. */
function bboxCenter(p: ArrayLike<number>): THREE.Vector3 {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < base.triang.vertexCount; v++) {
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], p[3 * v + k]);
      hi[k] = Math.max(hi[k], p[3 * v + k]);
    }
  }
  return new THREE.Vector3((lo[0]+hi[0])/2, (lo[1]+hi[1])/2, (lo[2]+hi[2])/2);
}

const row = new THREE.Group();
/**
 * `truePositions` is the real flat torus: the texture is baked from it AND the UVs are pinned
 * to it. `display` is what actually gets drawn, exaggerated or not. Keeping both tied to the
 * true configuration is what puts the baked edge lines on the real edges — compute the UVs
 * from the exaggerated copy instead and the whole paper slides off the torus.
 */
function makePanel(truePositions: Float64Array, display: Float64Array): TorusView {
  const view = makeTorusView(base.triang, {
    // uvRepeat 1: with baked edges the whole torus is ONE tile, so the paper is subdivided
    // inside it rather than by repeating a small tile
    surface: { material: surfaceFor(truePositions), uvRepeat: 1, uvFrom: truePositions },
    creases: { material: shared.crease, radius: CONFIG.creaseRadius, offset: 0 },
  });
  view.draw(display);
  view.setVisible('edge', false);        // the edges are in the paper, not in tubes
  row.add(view.group);
  return view;
}
/** The pushed torus with its vertices moved farther along z — display only. */
const pushedDisplay = Float64Array.from(chosen.positions);
for (let v = 0; v < base.triang.vertexCount; v++) pushedDisplay[3 * v + 2] *= CONFIG.zMul;

// BAKE THE TEXTURE FROM WHAT IS DRAWN, always. The baked edges are the triangulation's
// 1-skeleton in the developed net's lattice coordinates, and the mesh's UVs are that same
// development — so they land on the real edges only when both are computed from the SAME
// configuration. Baking from the true positions while drawing the exaggerated ones put every
// black line in the wrong place on the right-hand panel.
const left = makePanel(foldPositions, foldDisplay);
const right = makePanel(chosen.positions, pushedDisplay);

/** One solid arrow along ±z — real geometry (cylinder + cone), so it path traces. */
const arrowMat = {
  up: new THREE.MeshStandardMaterial({ color: CONFIG.arrowUp, roughness: 0.35, metalness: 0.15 }),
  down: new THREE.MeshStandardMaterial({ color: CONFIG.arrowDown, roughness: 0.35, metalness: 0.15 }),
};
/** The exaggeration that makes the longest arrow `target` of the fold's width. */
function exaggerationFor(target: number): number {
  const longest = Math.max(...base.lift.map((z) => Math.abs(chosen.t * z)));
  return longest > 0 ? (target * width) / longest : 1;
}

let arrows: THREE.Group | null = null;
function buildArrows(exaggeration: number): void {
  if (arrows) {
    left.group.remove(arrows);
    arrows.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
  }
  arrows = new THREE.Group();
  const c = bboxCenter(foldDisplay);            // the view centred its geometry; match it
  const r = CONFIG.arrowRadius * width;
  const hr = CONFIG.arrowHeadRadius * r;
  const maxHead = CONFIG.arrowHeadLength * r;
  base.lift.forEach((z, v) => {
    if (z === 0) return;                        // this vertex does not move
    const L = Math.abs(chosen.t * z) * exaggeration;
    // The head keeps its full width; only its LENGTH gives way on a very short arrow, and even
    // then it keeps half the arrow so there is always a visible shaft under it.
    const head = Math.min(maxHead, 0.55 * L);
    const shaft = Math.max(L - head, 1e-4);
    const mat = z > 0 ? arrowMat.up : arrowMat.down;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, shaft, 20), mat);
    body.rotation.x = Math.PI / 2; body.position.z = shaft / 2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(hr, head, 28), mat);
    tip.rotation.x = Math.PI / 2; tip.position.z = shaft + head / 2;
    g.add(body, tip);
    if (z < 0) g.rotation.x = Math.PI;
    g.position.set(foldPositions[3*v] - c.x, foldPositions[3*v+1] - c.y, foldDisplay[3*v+2] - c.z);
    arrows!.add(g);
  });
  arrows.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  left.group.add(arrows);
  studio.notifySceneChanged();
  studio.resetAccumulation();
}
let target = CONFIG.arrowTarget;
let exaggeration = CONFIG.arrowExaggeration ?? exaggerationFor(target);
function announceArrows(): void {
  const longest = Math.max(...base.lift.map((z) => Math.abs(chosen.t * z))) * exaggeration;
  console.log(`  arrows ×${exaggeration.toFixed(1)}`
    + `${Math.abs(exaggeration - 1) < 1e-9 ? ' (TRUE LENGTH)' : ' — EXAGGERATED, state this in the caption'}`
    + `  ·  longest arrow ${(100 * longest / width).toFixed(1)}% of the fold's width`);
}
buildArrows(exaggeration);
announceArrows();

// ---- ONE scale for both, taken from the fold, so the growth between them reads honestly ----
const foldSize = new THREE.Box3().setFromObject(left.group).getSize(new THREE.Vector3());
const scale = CONFIG.cell / (Math.max(foldSize.x, foldSize.y) || 1);
left.group.scale.setScalar(scale);
right.group.scale.setScalar(scale);
const dx = (CONFIG.cell * (1 + CONFIG.gap)) / 2;
left.group.position.set(-dx, 0, 0);
right.group.position.set(dx, 0, 0);
row.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
studio.add(row);

// ---- stage (paper-tori's) ----
const box = new THREE.Box3().setFromObject(row);
const center = box.getCenter(new THREE.Vector3());
const size = box.getSize(new THREE.Vector3());
const radius = 0.5 * Math.max(size.x, size.y);
if (CONFIG.showPlane) {
  const s = radius * CONFIG.planeSize;
  const wall = backWall({ color: CONFIG.wallColor, width: s, height: s, roughness: CONFIG.planeRoughness });
  wall.position.set(center.x, center.y, box.min.z - radius * CONFIG.planeDistance);
  studio.scene.add(wall);
}
{
  const dir = new THREE.Vector3(-0.5, 1.2, 1).normalize();
  const dist = radius * 6;
  const light = new PhysicalSpotLight(CONFIG.lightColor);
  light.intensity = CONFIG.spotIntensity;
  light.angle = 1.3; light.penumbra = 1.3; light.decay = 0; light.distance = 0;
  light.radius = radius * 1;
  light.position.copy(center).addScaledVector(dir, dist);
  light.target.position.copy(center);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.camera.near = Math.max(0.5, dist - radius * 1.5);
  light.shadow.camera.far = dist + radius * 2;
  light.shadow.radius = 6;
  light.shadow.bias = -0.0002;
  studio.scene.add(light, light.target);
}

studio.frame(row, { direction: new THREE.Vector3(0, 0, 1) });
studio.start();

function updateForMode(mode: 'webgl' | 'pathtracing'): void {
  ambient.intensity = mode === 'webgl' ? 0.4 : 0;
  if (mode === 'pathtracing') studio.notifyMaterialsChanged();
}

// ---- drag turns BOTH panels together, each about its own centre ----
// The views are built centred, so a rotation on the group spins the torus in place; giving both
// groups the SAME quaternion is what keeps the pair locked in one orientation.
const turn = new THREE.Quaternion();
const grab = { on: false, x: 0, y: 0 };
const canvas = studio.renderer.domElement;
canvas.addEventListener('pointerdown', (e) => {
  if (e.shiftKey) return;                       // shift-drag leaves the studio's orbit alone
  grab.on = true; grab.x = e.clientX; grab.y = e.clientY;
  studio.controls.enabled = false;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!grab.on) return;
  const ddx = e.clientX - grab.x, ddy = e.clientY - grab.y;
  grab.x = e.clientX; grab.y = e.clientY;
  const right3 = new THREE.Vector3().setFromMatrixColumn(studio.camera.matrixWorld, 0);
  const up3 = new THREE.Vector3().setFromMatrixColumn(studio.camera.matrixWorld, 1);
  const q = new THREE.Quaternion().setFromAxisAngle(up3, ddx * 0.01)
    .multiply(new THREE.Quaternion().setFromAxisAngle(right3, ddy * 0.01));
  turn.premultiply(q);
  left.group.quaternion.copy(turn);
  right.group.quaternion.copy(turn);
  studio.notifySceneChanged();
  studio.resetAccumulation();
});
function endGrab(e: PointerEvent): void {
  if (!grab.on) return;
  grab.on = false;
  studio.controls.enabled = true;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener('pointerup', endGrab);
canvas.addEventListener('pointercancel', endGrab);

// ---- the torus switch ----
{
  const bar = document.createElement('div');
  bar.style.cssText = ['position:fixed', 'top:10px', 'left:50%', 'transform:translateX(-50%)',
    'z-index:20', 'display:flex', 'gap:4px', 'padding:4px', 'background:rgba(20,20,24,0.7)',
    'border-radius:8px', 'font:12px/1 -apple-system,system-ui,sans-serif'].join(';');
  for (const [name, label] of [['square', 'square (τ = i)'], ['hex', 'hexagonal (τ = ρ)']]) {
    const b = document.createElement('button');
    const on = name === CONFIG.torus;
    b.textContent = label;
    b.style.cssText = ['padding:5px 10px', 'border-radius:5px', 'cursor:pointer', 'font:inherit',
      'border:1px solid ' + (on ? '#c8a45c' : '#3a3a42'),
      'background:' + (on ? '#c8a45c' : 'transparent'),
      'color:' + (on ? '#1a1a1f' : '#c8c8d0')].join(';');
    b.onclick = () => {
      const q = new URLSearchParams(location.search);
      q.set('torus', name);
      q.delete('t');                 // the max push differs per torus; do not carry it across
      location.search = q.toString();
    };
    bar.appendChild(b);
  }
  document.body.appendChild(bar);
}

const TARGETS = [0.05, 0.07, 0.09, 0.12, 0.18];
attachRenderControls(studio, {
  filename: `push-figure-${CONFIG.torus}.png`,
  hud: false,
  keys: {
    // A lengthens the arrows; shift-A drops them to TRUE length, for a figure that must not
    // exaggerate. Either way the factor is printed.
    a: () => {
      target = TARGETS[(TARGETS.indexOf(target) + 1) % TARGETS.length];
      exaggeration = exaggerationFor(target);
      buildArrows(exaggeration);
      announceArrows();
    },
    A: () => {
      exaggeration = 1;
      buildArrows(exaggeration);
      announceArrows();
    },
    g: () => {
      turn.identity();
      left.group.quaternion.identity();
      right.group.quaternion.identity();
      studio.notifySceneChanged();
      studio.resetAccumulation();
    },
  },
});
