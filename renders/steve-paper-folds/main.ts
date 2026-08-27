/**
 * paper-folds — the two FLAT models of Lander's paper, side by side: the square base Q⁰ on
 * T = v8-7 and the hexagonal base P⁰ on T′ = v8-3, in the graph-paper look of the birthday
 * renders with the triangulation's edges baked into the paper.
 *
 * Each is a configuration folded flat into the plane: sixteen nondegenerate triangles, eight of
 * them folded over, so the sheet lies on top of itself. Folded flat each is ALREADY an exact
 * flat torus — every cone angle exactly 2π — of modulus exactly i, respectively ρ. Neither is
 * embedded, and that is not a defect: it is what a folded-flat configuration is.
 *
 * Both are exact by construction (`sampling/foldedBases`), so nothing is loaded and nothing is
 * fitted. They are verified anyway, on their EXACT positions, with the results in the console
 * and a banner if anything fails — a figure that quietly showed a configuration which was not
 * flat, or not at the modulus it claims, would be worse than no figure.
 *
 * TWO DISPLAY-ONLY CONCESSIONS, both stated in the console and neither touching what is verified:
 *   - The sheets are COINCIDENT, so they z-fight. `CONFIG.planarLift` separates the layers by a
 *     microscopic amount along ζ — ~0.2% of the fold's width, invisible at any sane zoom but
 *     comfortably above depth-buffer precision. Lifting along ζ is a real push-off, which breaks
 *     flatness at O(t²), so it is applied to the drawing only. `?lift=0` for the true planes.
 *   - Edges are BAKED INTO THE PAPER (`viewer/latticeEdgeTexture`) rather than drawn as crease
 *     tubes. A tube has a radius, so on a fold the tube on the lower sheet pokes through the
 *     sheet above it; a texture has no thickness. It also survives the path tracer, which reads
 *     material properties and ignores shader work.
 *
 * Each fold is normalized to the same on-screen size, since the two have quite different areas
 * (9.43 and 3.19) and a figure comparing their combinatorics wants them the same size. `?true=1`
 * keeps their real relative scale instead.
 *
 * LANDER'S FIGURE 7 is drawn over the folds: the defining incidences the two bases were found
 * by. On the square, the line through vertices 0, 2, 4 and the rectangle 0, 4, 7, 6 in green,
 * with the rectangle's circumscribed circle in purple and vertex 5 sitting on it — note those
 * two green things COINCIDE along the bottom, since 0, 2, 4 lie on the rectangle's own edge
 * 0→4, so `?over=` is what makes the collinearity separately visible; on the
 * hexagonal, three purple circles, through 0-2-4-5-6, through 0-1-3-6, and through 3-4-5-7.
 * The paper prints no equations for these — it says the centre and radius are computed from
 * the printed coordinates and every vertex checked onto its circle before drawing, so that is
 * what `incidences.ts` does, and it REFUSES to draw a circle whose vertices do not land on it.
 * They land to machine zero. I toggles the overlay.
 *
 * THIN OPAQUE TUBES follow the triangulation's edges (T toggles, `?tr=` the radius), centred
 * ON the sheet rather than proud of it, so each is half buried and reads from both sides. The
 * fold's sheets sit a hair apart, so a tube belonging to a LOWER sheet shows through the one
 * above — which is the point: it is how you see which parts of the configuration are folded
 * over. Keep `?lift=` very small so they stay near-coplanar.
 *
 * Because those tubes are buried in the surface, the paper is given a real THICKNESS
 * (`?paper=`): a zero-thickness double-sided sheet has no interior, so a path tracer meeting
 * geometry embedded in it can terminate the ray and render the surface black. A slab has an
 * inside, and the intersection becomes ordinary solid geometry. It is thinner than the tubes,
 * so they still protrude from both faces.
 *
 * DRAG a fold to turn it, SHIFT-DRAG to move it, + / − to resize the one you last touched,
 * [ / ] to move the backdrop toward or away from them, G to reset. Render… → path trace; S saves.
 */

import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { PhysicalSpotLight } from 'three-gpu-pathtracer';

import { SQUARE_FOLD, HEXAGONAL_FOLD, liftedPositions, type FoldedBase } from '@core/sampling/foldedBases.ts';
import { measure } from '@core/search/measure.ts';
import { makeTorusView, type TorusView } from '@display/viewer/TorusView';
import { paperMaterials } from '@display/viewer/materials';
import { latticeEdgeTexture, imageBackedTexture } from '@display/viewer/gridTexture';
import { skyEnvironment, backWall } from '@app/render/stage';
import { incidenceOverlay } from './incidences.ts';
import { attachRenderControls } from '@app/render/controls';
import { Studio } from '@app/render/studio';

// ============================ tweak the whole piece here ============================
const url = new URLSearchParams(location.search);
const num = (k: string, d: number) => (url.get(k) !== null ? Number(url.get(k)) : d);

const CONFIG = {
  // ===================== COLORS (matched to the birthday renders) =====================
  torusColor:     '#dcbf6f',   // the paper
  gridColor:      '#2435AF',   // thick (major) graph lines
  gridMinorColor: '#4e5988',   // thin (fine) graph lines
  wallColor:      '#eceacf',   // background plane
  lightColor:     '#ffffff',
  // ====================================================================================

  aspect: 16 / 9,
  cell: 1.0,                   // each fold normalized to this size, before its own multiplier
  gap: 0.5,                    // clear space between them (× cell)
  /** Keep the folds' true relative scale instead of normalizing each to `cell`. */
  trueScale: url.get('true') === '1',
  /** Per-panel size multipliers, e.g. ?scale=1,1.3. */
  scales: (url.get('scale') ?? '').split(',').map(Number).filter((v) => v > 0),

  /** DISPLAY ONLY — see the header. ?lift=0 shows the true coincident planes (and their fighting). */
  planarLift: num('lift', 0.002),

  /**
   * Which surface material to use — a DIAGNOSTIC switch, because the baked-edge texture goes
   * black in the path tracer while the untextured overlay next to it renders fine, and the
   * only difference between them is the map.
   *
   *   'baked'  latticeEdgeTexture: graph paper with the triangulation's edges drawn in
   *   'paper'  the shared `paperMaterials` surface — the SAME material rich-birthday-render
   *            traces correctly, so if this one works the fault is in the baked texture
   *   'flat'   no colour map, just the paper colour
   *
   * `?nm=0` additionally strips the NORMAL map. 'flat' with `nm=1` is the case that isolates
   * the normal map on its own — measured so far, 'flat' (which had neither) traces fine while
   * both textured options go black, so the next question is which of the two maps is at fault.
   */
  surfaceMaterial: (url.get('mat') ?? 'baked') as 'baked' | 'paper' | 'flat',
  normalMapOn: url.get('nm') !== '0',
  /**
   * How the colour map is backed. Measured: a CANVAS-backed map renders black in the path
   * trace on this page while the image-backed normal map beside it is fine, and the WebGL
   * preview shows both correctly — so this defaults to re-baking the canvas to a PNG and
   * loading it back. `?tex=canvas` uses the canvas directly, which is faster and fine for
   * preview-only work.
   */
  textureBacking: (url.get('tex') ?? 'image') as 'image' | 'canvas',

  /** Draw the defining incidences of Lander's Figure 7 over the folds (I toggles). */
  incidences: url.get('inc') !== '0',
  incidenceGreen: '#1f7a3d',   // the collinearity and the rectangle
  incidencePurple: '#6b3fa0',  // the circles
  incidenceWidth: num('iw', 0.004),   // tube radius, × the fold's width
  /** Extend the collinear line past vertices 0 and 4 by this fraction of its length. It is
   *  hidden under the rectangle's bottom edge otherwise — see `incidences.ts`. 0 = draw only
   *  what is actually there. */
  incidenceOverhang: num('over', 0),

  /** Thin OPAQUE tubes along the triangulation's edges, centred ON the surface (offset 0), so
   *  half of each tube sits below the sheet. On a fold the sheets are stacked a hair apart, so
   *  a tube belonging to a lower sheet shows THROUGH the sheet above it — which is the point
   *  here: it reveals which parts of the configuration are doubled over. T toggles them. */
  tubes: url.get('tubes') !== '0',
  /**
   * Tube radius, × the fold's width. To be seen THROUGH the stack it has to out-reach it: the
   * sheets span roughly ±`planarLift`·width (ζ runs over ±1), so a tube on the bottom sheet
   * only breaks the top surface once its radius exceeds about 2·`planarLift`·width. At the
   * default lift of 0.002 that is 0.004 — which is why 0.0018 vanished into the stack.
   */
  tubeRadius: num('tr', 0.006),
  /**
   * Give the paper a real THICKNESS (× the fold's width), solidifying each face into a slab.
   *
   * This is what lets the tracer cope with tubes that are buried in the surface. A
   * zero-thickness double-sided sheet has no well-defined inside, so a ray leaving it can
   * immediately re-hit the tube it is embedded in and terminate — which renders as black. A
   * closed slab has an interior, and the intersection becomes ordinary solid geometry. Keep it
   * BELOW the tube radius so the tubes still protrude from both faces and read through the
   * sheet. Default 0: the crease tubes turned out NOT to be what blackened the path trace, so
   * this stays off until something needs it.
   */
  paperThickness: num('paper', 0),
  tubeColor: '#20242a',
  tubeRoughness: num('trough', 0.4),
  tubeMetalness: num('tmet', 0.1),

  // paper surface detail (same knobs as rich-birthday-render)
  edgeColor: '#241a10',
  edgeWidth: num('ew', 0.006),      // fraction of the fundamental domain
  roughness: 0.92,
  gridRepeat: 16,
  gridSubdivisions: 3,
  gridMinorWidth: 0.004,
  gridMajorWidth: 0.012,
  normalMapFile: 'crease-rough.png',
  normalRepeat: num('nr', 4),
  normalScale: num('ns', 1.0),

  // stage
  background: 0xeef0f3,
  showPlane: true,
  planeRoughness: 0.95,
  /** How far the backdrop sits BEHIND the folds, in scene radii. Small = the paper reads as
   *  resting on the surface; large = it floats in front of a distant wall. `[` / `]` nudge it
   *  live and print the `?plane=` to reproduce. */
  planeDistance: num('plane', 0.12),
  planeSize: 40,
  envIntensity: 0.9,
  spotIntensity: 4,
};
// ====================================================================================

const studio = new Studio({ bounces: 5, pathTraceScale: 1, aspect: CONFIG.aspect, onModeChange: updateForMode });
studio.renderer.shadowMap.enabled = true;
studio.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
skyEnvironment(studio.scene, { intensity: CONFIG.envIntensity, background: CONFIG.background });
const ambient = new THREE.AmbientLight(0xffffff, 0.4);   // preview-only fill
studio.scene.add(ambient);

// ---- the two folds ----
interface Panel {
  label: string;
  base: FoldedBase;
  /** The EXACT planar configuration — what gets verified. */
  exact: Float64Array;
  /** What gets drawn: the same, plus the microscopic display-only lift. */
  display: Float64Array;
  /** The fold's own width, so overlay line weights scale with it. */
  width: number;
}

const problems: string[] = [];

function foldPanel(base: FoldedBase, label: string): Panel {
  const exact = liftedPositions(base, 0);
  let lo = Infinity, hi = -Infinity;
  for (const [x] of base.planar) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  const width = hi - lo;
  let display = exact;
  if (CONFIG.planarLift > 0) {
    const eps = CONFIG.planarLift * width;
    display = Float64Array.from(exact);
    for (let v = 0; v < base.triang.vertexCount; v++) display[3 * v + 2] = eps * base.lift[v];
  }
  return { label, base, exact, display, width };
}

const panels: Panel[] = [
  foldPanel(SQUARE_FOLD, 'square base Q⁰ (τ = i, v8-7)'),
  foldPanel(HEXAGONAL_FOLD, 'hexagonal base P⁰ (τ = ρ, v8-3)'),
];

// ---- verify, on the exact positions ----
console.log(`paper-folds — the two flat models · surface material '${CONFIG.surfaceMaterial}'`
  + `${CONFIG.normalMapOn ? '' : ', normal map OFF'}`
  + `, ${CONFIG.textureBacking}-backed map`
  + ' (?mat=baked|paper|flat, ?nm=0, ?tex=canvas isolate a path-trace problem)');
for (const p of panels) {
  const m = measure(p.base.triang, p.exact);
  const target = p.base.tauHat;
  const dTau = Math.min(
    Math.hypot(m.tauHat[0] - target[0], m.tauHat[1] - target[1]),
    Math.hypot(m.tauHat[0] + target[0], m.tauHat[1] - target[1]),   // ±Re on the wall
  );
  console.log(`  ${p.label.padEnd(32)} cone deficit ${m.coneDeficit.toExponential(2)}`
    + `  τ̂ off ${dTau.toExponential(2)}  area ${(m.area).toFixed(4)}`);
  if (m.coneDeficit >= 1e-9) problems.push(`${p.label}: NOT flat (${m.coneDeficit.toExponential(2)})`);
  if (dTau >= 1e-8) problems.push(`${p.label}: modulus off by ${dTau.toExponential(2)}`);
}
if (CONFIG.planarLift > 0) {
  console.log(`  drawn with a display-only z-lift of ${CONFIG.planarLift} of each fold's width,`
    + ' so the coincident sheets do not z-fight (?lift=0 for the true planes)');
}
if (problems.length) {
  const banner = document.createElement('div');
  banner.style.cssText = ['position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:100',
    'background:#7a1f1f', 'color:#fff', 'font:12px/1.5 system-ui,sans-serif', 'padding:8px 14px'].join(';');
  banner.innerHTML = '<b>paper-folds</b><br>' + problems.map((p) => `• ${p}`).join('<br>');
  document.body.appendChild(banner);
}

// ---- materials: one per fold, since each edge texture belongs to its own developed net ----
const shared = paperMaterials({
  surface: 'grid',
  paperColor: CONFIG.torusColor, gridColor: CONFIG.gridColor, gridMinorColor: CONFIG.gridMinorColor,
  roughness: CONFIG.roughness, gridRepeat: CONFIG.gridRepeat, gridSubdivisions: CONFIG.gridSubdivisions,
  gridMinorWidth: CONFIG.gridMinorWidth, gridMajorWidth: CONFIG.gridMajorWidth,
  normalMapFile: CONFIG.normalMapFile, normalRepeat: CONFIG.normalRepeat, normalScale: CONFIG.normalScale,
}, () => studio.notifyMaterialsChanged());
const normalMap = shared.surface.normalMap;

function surfaceFor(p: Panel): THREE.MeshStandardMaterial {
  if (CONFIG.surfaceMaterial === 'paper') {
    if (!CONFIG.normalMapOn) shared.surface.normalMap = null;
    return shared.surface;
  }
  if (CONFIG.surfaceMaterial === 'flat') {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(CONFIG.torusColor),
      roughness: CONFIG.roughness, metalness: 0, flatShading: true, side: THREE.DoubleSide,
    });
    if (CONFIG.normalMapOn && normalMap) {
      m.normalMap = normalMap;
      m.normalScale.set(CONFIG.normalScale, CONFIG.normalScale);
    }
    return m;
  }
  const canvasMap = latticeEdgeTexture(p.base.triang, p.exact, {
    bg: CONFIG.torusColor, minor: CONFIG.gridMinorColor, major: CONFIG.gridColor,
    gridRepeat: CONFIG.gridRepeat, gridSubdivisions: CONFIG.gridSubdivisions,
    minorWidth: CONFIG.gridMinorWidth, majorWidth: CONFIG.gridMajorWidth,
    edgeColor: CONFIG.edgeColor, edgeWidth: CONFIG.edgeWidth,
  });
  const map = CONFIG.textureBacking === 'image'
    ? imageBackedTexture(canvasMap, () => studio.notifyMaterialsChanged())
    : canvasMap;
  const m = new THREE.MeshStandardMaterial({
    map, vertexColors: true, roughness: CONFIG.roughness, metalness: 0,
    flatShading: true, side: THREE.DoubleSide,
  });
  if (CONFIG.normalMapOn && normalMap) {
    m.normalMap = normalMap;
    m.normalScale.set(CONFIG.normalScale, CONFIG.normalScale);
  }
  return m;
}

// ---- build + lay out ----
const row = new THREE.Group();
const panelScale = panels.map((_, i) => CONFIG.scales[i] ?? 1);
const baseScale: number[] = [];
const offsets = panels.map(() => new THREE.Vector3());

const overlays: THREE.Group[] = [];
/**
 * Thin opaque tubes for the creases. Shared across both folds: unlike the paper texture, which
 * belongs to one developed net, this carries no per-torus information.
 *
 * Deliberately NOT transmissive. A transmissive material forces three.js's separate
 * transmission pass in the WebGL preview, which blackened the opaque paper — and glass on a
 * tube this thin reads as grey wire anyway. Opaque is both correct and what it looked like.
 */
const tubeMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(CONFIG.tubeColor),
  roughness: CONFIG.tubeRoughness,
  metalness: CONFIG.tubeMetalness,
});

const views: TorusView[] = panels.map((p, i) => {
  const view = makeTorusView(p.base.triang, {
    // uvRepeat 1: the whole torus is ONE tile, so the paper is subdivided inside it
    surface: {
      material: surfaceFor(p),
      // the baked texture is ONE tile over the whole torus; the shared paper repeats a small one
      uvRepeat: CONFIG.surfaceMaterial === 'baked' ? 1 : CONFIG.gridRepeat,
      thickness: CONFIG.paperThickness * p.width,
    },
    // offset 0 centres the tube ON the sheet rather than proud of it, so it is half buried and
    // shows through from either side — and through the sheet stacked just above it
    creases: { material: tubeMaterial, radius: CONFIG.tubeRadius * p.width, offset: 0 },
  });
  view.draw(p.display);
  view.setVisible('edge', CONFIG.tubes);
  const g = view.group;
  // Lander Fig. 7, in the view's own centred frame (TorusView offsets by the bbox centre)
  // Clear the sheet entirely rather than lying in it. The overlay is solid tube geometry, and
  // the sheets sit within ±planarLift·width of z = 0, so anything drawn at that height passes
  // THROUGH them — intersecting geometry the path tracer resolves as black.
  const sheetTop = CONFIG.planarLift * p.width;
  const overlayTube = CONFIG.incidenceWidth * p.width;
  const overlay = incidenceOverlay(p.base, p.exact, {
    green: CONFIG.incidenceGreen, purple: CONFIG.incidencePurple,
    tube: overlayTube,
    lift: sheetTop + overlayTube * 1.25,
    overhang: CONFIG.incidenceOverhang,
  });
  overlay.visible = CONFIG.incidences;
  overlays.push(overlay);
  g.add(overlay);
  const size = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
  baseScale[i] = CONFIG.trueScale ? 1 : CONFIG.cell / (Math.max(size.x, size.y, size.z) || 1);
  g.scale.setScalar(baseScale[i] * panelScale[i]);
  row.add(g);
  return view;
});

/** Place them left to right with a constant CLEAR gap, measured from their actual widths. */
function relayout(): void {
  const widths = views.map((v) => {
    const keep = v.group.position.clone();
    v.group.position.set(0, 0, 0);
    const w = new THREE.Box3().setFromObject(v.group).getSize(new THREE.Vector3()).x || CONFIG.cell;
    v.group.position.copy(keep);
    return w;
  });
  const total = widths.reduce((a, w) => a + w, 0) + CONFIG.gap * (widths.length - 1);
  let x = -total / 2;
  views.forEach((v, i) => {
    v.group.position.set(x + widths[i] / 2 + offsets[i].x, offsets[i].y, offsets[i].z);
    x += widths[i] + CONFIG.gap;
  });
}
relayout();
row.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
studio.add(row);

// ---- stage ----
const box = new THREE.Box3().setFromObject(row);
const center = box.getCenter(new THREE.Vector3());
const extent = box.getSize(new THREE.Vector3());
const radius = 0.5 * Math.max(extent.x, extent.y);

let wall: THREE.Mesh | null = null;
let planeDistance = CONFIG.planeDistance;
if (CONFIG.showPlane) {
  const s = radius * CONFIG.planeSize;
  wall = backWall({ color: CONFIG.wallColor, width: s, height: s, roughness: CONFIG.planeRoughness });
  studio.scene.add(wall);
}
function placeWall(): void {
  if (!wall) return;
  wall.position.set(center.x, center.y, box.min.z - radius * planeDistance);
  studio.notifySceneChanged();
  studio.resetAccumulation();
}
placeWall();

RectAreaLightUniformsLib.init();
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

// ---- grab a fold: drag turns it, shift-drag moves it ----
const grab = { view: null as THREE.Object3D | null, x: 0, y: 0 };
let selected = 0;
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const canvas = studio.renderer.domElement;

function panelUnder(event: PointerEvent): THREE.Object3D | null {
  const r = canvas.getBoundingClientRect();
  ndc.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, studio.camera);
  const hit = raycaster.intersectObjects(row.children, true)[0];
  if (!hit) return null;
  let o: THREE.Object3D | null = hit.object;
  while (o && o.parent !== row) o = o.parent;
  return o;
}

canvas.addEventListener('pointerdown', (e) => {
  const panel = panelUnder(e);
  if (!panel) return;
  grab.view = panel; grab.x = e.clientX; grab.y = e.clientY;
  const i = row.children.indexOf(panel);
  if (i >= 0) selected = i;
  studio.controls.enabled = false;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!grab.view) return;
  const dx = e.clientX - grab.x, dy = e.clientY - grab.y;
  grab.x = e.clientX; grab.y = e.clientY;
  const right = new THREE.Vector3().setFromMatrixColumn(studio.camera.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(studio.camera.matrixWorld, 1);
  if (e.shiftKey) {
    const i = row.children.indexOf(grab.view);
    if (i >= 0) {
      offsets[i].addScaledVector(right, dx * 0.008 * CONFIG.cell)
        .addScaledVector(up, -dy * 0.008 * CONFIG.cell);
      relayout();
    }
  } else {
    const k = 0.01;
    grab.view.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(up, dx * k)
      .multiply(new THREE.Quaternion().setFromAxisAngle(right, dy * k)));
  }
  studio.notifySceneChanged();
  studio.resetAccumulation();
});

function endGrab(e: PointerEvent): void {
  if (!grab.view) return;
  grab.view = null;
  studio.controls.enabled = true;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener('pointerup', endGrab);
canvas.addEventListener('pointercancel', endGrab);

let tubesShown = CONFIG.tubes;

function applyScales(): void {
  views.forEach((v, i) => v.group.scale.setScalar(baseScale[i] * panelScale[i]));
  relayout();
  studio.frame(row, { direction: new THREE.Vector3(0, 0, 1) });
  studio.notifySceneChanged();
  studio.resetAccumulation();
  console.log(`sizes: ?scale=${panelScale.map((v) => v.toFixed(2)).join(',')}`);
}
function resize(by: number): void {
  panelScale[selected] = Math.max(0.2, Math.min(6, panelScale[selected] * by));
  applyScales();
}

// framed along +z: these are planar, so straight on is the view that shows the fold
studio.frame(row, { direction: new THREE.Vector3(0, 0, 1) });
studio.start();

function updateForMode(mode: 'webgl' | 'pathtracing'): void {
  ambient.intensity = mode === 'webgl' ? 0.4 : 0;
  if (mode === 'pathtracing') studio.notifyMaterialsChanged();
}

attachRenderControls(studio, {
  filename: 'paper-folds.png',
  hud: false,
  keys: {
    g: () => {
      for (const o of row.children) o.quaternion.identity();
      for (const o of offsets) o.set(0, 0, 0);
      relayout();
      studio.notifySceneChanged();
      studio.resetAccumulation();
    },
    '=': () => resize(1.12),
    '+': () => resize(1.12),
    '-': () => resize(1 / 1.12),
    '_': () => resize(1 / 1.12),
    '0': () => { panelScale.fill(1); for (const o of offsets) o.set(0, 0, 0); applyScales(); },
    // move the backdrop toward / away from the folds
    t: () => {
      tubesShown = !tubesShown;
      for (const v of views) v.setVisible('edge', tubesShown);
      studio.notifySceneChanged();
      studio.resetAccumulation();
    },
    i: () => {
      const on = !overlays[0]?.visible;
      for (const o of overlays) o.visible = on;
      studio.notifySceneChanged();
      studio.resetAccumulation();
    },
    '[': () => { planeDistance = Math.max(0, planeDistance - 0.04); placeWall(); console.log(`?plane=${planeDistance.toFixed(2)}`); },
    ']': () => { planeDistance = Math.min(3, planeDistance + 0.04); placeWall(); console.log(`?plane=${planeDistance.toFixed(2)}`); },
  },
});
