/**
 * push-arrows — the paper's push-off, drawn as the vector field it is.
 *
 * Two pictures of the SQUARE torus, side by side and always seen from the same direction:
 * left, the fold — the configuration collapsed flat into the plane, already an exact flat torus
 * of modulus exactly i and of course not embedded; right, that fold pushed off by t and
 * corrected back onto {flat} ∩ {τ = i} by the paper's own 9×9 implicit-function step.
 *
 * WHAT THE ARROWS ARE, and it is worth being exact because the shape of the answer is not the
 * obvious one. The push-off is NOT a translation of the whole configuration by one vector in
 * ℝ³, and it is not a different direction at each vertex either. Lander's ζ is ONE HEIGHT PER
 * VERTEX — `liftedPositions` sends vertex v to (Q_v, t·ζ_v) — so every vertex moves along the
 * same axis, perpendicular to the fold's plane, and what differs is the signed distance:
 *
 *     ζ = [3/13, −3/8, −3/7, 12/13, 1, −1, 1, 0]
 *
 * Four vertices go up, three go down, and vertex 7 does not move at all — so it gets no arrow.
 * Each arrow is drawn at its vertex with the true length t·|ζ_v| (× the exaggeration, which is
 * announced), pointing up or down by the sign. The lift alone is embedded for every t > 0 but
 * no longer flat — the squared edge lengths change by t²(ζ_a − ζ_b)², so the cone deficits open
 * as O(t²) — and the right-hand torus is what the correction does about that. R shows the RAW
 * push instead, so you can see what the correction had to fix: at t = 0.136 the raw lift's
 * worst cone angle is off by 0.165 rad (≈9.5°), and the correction takes that to 3e-15.
 *
 * AND THE CORRECTION ONLY MOVES THINGS SIDEWAYS. The nine free coordinates of §6 are all
 * PLANAR ones — the heights are frozen — so the corrected torus has exactly the same z as the
 * raw lift, to the last bit: measured, max|Δz| = 0 at every t. Six of the eight vertices slide
 * in-plane (by up to 0.036 at t = 0.136) and the other two do not move at all. That is why the
 * arrows can be drawn once, on the fold, and still be true of the torus beside it: what they
 * show IS the final height of every vertex.
 *
 * ONE ORIENTATION FOR BOTH. Drag anywhere and the same rotation is applied to each panel about
 * its OWN centre, so the two never drift out of alignment; the camera never moves. It is
 * orthographic on purpose — under perspective two objects at different screen positions are
 * seen along different rays, so "the same orientation" would still not look the same. Nothing
 * here is a camera trick: both panels really are being shown from one direction.
 *
 * The right-hand torus is read from `npm run paper-push`'s ladder, whose every rung was solved
 * by the paper's own correction and verified flat to 1e-11 and at modulus to 1e-11. Only
 * embeddedness varies along it, and the slider says so: past t ≈ 0.136 the square torus is no
 * longer embedded and the panel goes RED.
 *
 *   t slider   the push-off height  ·  E  jump to the last embedded rung
 *   R          right panel: the corrected torus ↔ the RAW push (not flat)
 *   A          arrow exaggeration ×1 → ×2 → ×4  ·  drag  turn both  ·  scroll  zoom  ·  G  reset
 */

import * as THREE from 'three';

import { SQUARE_FOLD, liftedPositions } from '@core/sampling/foldedBases.ts';
import { measure } from '@core/search/measure.ts';
import { squash } from '@core/search/shape.ts';
import { makeTorusView } from '@display/viewer/TorusView';
import { plainSurfaceMaterial } from '@display/viewer/materials';
import squareData from '../steve-paper-push/data/square.csv?raw';

const BASE = SQUARE_FOLD;
const GOLD = 0xd9c48a;
const RED = 0xd05050;
const UP = 0x6fbf8f;      // ζ_v > 0
const DOWN = 0xd08a5a;    // ζ_v < 0

// ---- the corrected curve: t, converged, coneDeficit, dTau, embedded, clearance, then 24 ----
interface Rung { t: number; embedded: boolean; coneDeficit: number; clearance: number; positions: Float64Array }
const RUNGS: Rung[] = squareData.trim().split('\n').filter(Boolean).map((line) => {
  const v = line.split(',').map(Number);
  return { t: v[0], embedded: v[4] === 1, coneDeficit: v[2], clearance: v[5], positions: Float64Array.from(v.slice(6)) };
});
let lastEmbeddedIdx = 0;
RUNGS.forEach((r, i) => { if (r.embedded) lastEmbeddedIdx = i; });

// ---- scene: orthographic, so both panels are seen along the SAME ray ----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101014);

let viewHeight = 2.2;
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -50, 50);
camera.position.set(0, -6, 3.2);
camera.up.set(0, 0, 1);
camera.lookAt(0, 0, 0);

function resize(): void {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  const aspect = w / h;
  camera.left = -viewHeight * aspect / 2; camera.right = viewHeight * aspect / 2;
  camera.top = viewHeight / 2; camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const keyL = new THREE.DirectionalLight(0xffffff, 0.9); keyL.position.set(2, -3, 6);
const fillL = new THREE.DirectionalLight(0xffffff, 0.4); fillL.position.set(-3, 2, -4);
scene.add(keyL, fillL);

/**
 * A panel: a holder that carries the shared rotation, and an inner group offset so that
 * rotation happens about this panel's OWN centre. Rotating a common parent instead would swing
 * the two around each other; rotating each about its own centre is what keeps them aligned.
 */
interface Panel {
  holder: THREE.Group;
  inner: THREE.Group;
  material: THREE.MeshStandardMaterial;
  draw(positions: ArrayLike<number>): void;
}

const PANEL_X = 0.62;
function makePanel(x: number): Panel {
  const holder = new THREE.Group();
  holder.position.set(x, 0, 0);
  const inner = new THREE.Group();
  holder.add(inner);
  scene.add(holder);
  const material = plainSurfaceMaterial({ roughness: 0.55 });
  material.color.setHex(GOLD);
  const view = makeTorusView(BASE.triang, {
    surface: { style: 'plain', color: 0xffffff, material },
    creases: { radius: 0.005 },
    corners: { radius: 0.018 },
    center: false,                 // this panel does its own centring, so arrows can share it
  });
  inner.add(view.group);
  return { holder, inner, material, draw: (p) => view.draw(p) };
}
const left = makePanel(-PANEL_X);
const right = makePanel(PANEL_X);

/** One solid arrow along ±z: a cylinder shaft with a cone head. Real geometry, not a Line. */
function makeArrow(length: number, color: number): THREE.Group {
  const g = new THREE.Group();
  const up = length >= 0;
  const L = Math.abs(length);
  const head = Math.min(0.32 * L, 0.05);
  const shaft = Math.max(L - head, 1e-4);
  const r = 0.008;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, shaft, 12), mat);
  body.rotation.x = Math.PI / 2;                 // cylinder is +y by default
  body.position.z = shaft / 2;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, head, 14), mat);
  tip.rotation.x = Math.PI / 2;
  tip.position.z = shaft + head / 2;
  g.add(body, tip);
  if (!up) g.rotation.x = Math.PI;                // point the whole thing the other way
  return g;
}

/** The arrows live on the FLAT panel, one per vertex that actually moves. */
let arrows: THREE.Group | null = null;
function drawArrows(t: number, exaggeration: number): void {
  if (arrows) { left.inner.remove(arrows); arrows.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    if (m.material) (m.material as THREE.Material).dispose();
  }); }
  arrows = new THREE.Group();
  const fold = liftedPositions(BASE, 0);
  BASE.lift.forEach((z, v) => {
    if (z === 0) return;                          // vertex 7 does not move: no arrow
    const a = makeArrow(t * z * exaggeration, z > 0 ? UP : DOWN);
    a.position.set(fold[3 * v], fold[3 * v + 1], fold[3 * v + 2]);
    arrows!.add(a);
  });
  left.inner.add(arrows);
}

// ---- one scale and one centring for both panels, so the inflation reads honestly ----
const foldPositions = liftedPositions(BASE, 0);
const foldBox = new THREE.Box3();
for (let v = 0; v < BASE.triang.vertexCount; v++) {
  foldBox.expandByPoint(new THREE.Vector3(foldPositions[3*v], foldPositions[3*v+1], foldPositions[3*v+2]));
}
const foldCenter = foldBox.getCenter(new THREE.Vector3());
const foldSize = foldBox.getSize(new THREE.Vector3());
const SCALE = 1 / (Math.max(foldSize.x, foldSize.y) || 1);
for (const p of [left, right]) {
  p.inner.scale.setScalar(SCALE);
  p.inner.position.set(-foldCenter.x * SCALE, -foldCenter.y * SCALE, 0);
}

// ---- UI ----
const panel = document.createElement('div');
panel.style.cssText = ['position:fixed', 'left:0', 'right:0', 'bottom:0', 'z-index:10',
  'padding:12px 18px 16px', 'font:12px/1.6 -apple-system,system-ui,sans-serif', 'color:#e8e8ec',
  'background:linear-gradient(transparent,rgba(16,16,20,0.92) 35%)'].join(';');
document.body.appendChild(panel);
const title = document.createElement('div');
title.innerHTML = '<b>the push-off, as a vector field</b> — ζ is ONE HEIGHT PER VERTEX, so every '
  + 'vertex moves along the same axis and only the signed distance differs<br>'
  + `<span style="color:#8c8c95">ζ = [${BASE.lift.map((z) => (z === 0 ? `<b style="color:#e8e8ec">0</b>` : z.toFixed(3)))
      .join(', ')}] — <span style="color:#6fbf8f">up</span>, `
  + '<span style="color:#d08a5a">down</span>, and vertex 7 stays put</span>';
const slider = document.createElement('input');
slider.type = 'range'; slider.min = '0'; slider.max = String(RUNGS.length - 1); slider.step = '1';
slider.value = String(lastEmbeddedIdx);
const stops: string[] = [];
{
  let i = 0;
  while (i < RUNGS.length) {
    let j = i;
    while (j + 1 < RUNGS.length && RUNGS[j + 1].embedded === RUNGS[i].embedded) j++;
    const c = RUNGS[i].embedded ? '#3f8f5f' : '#8f3f3f';
    stops.push(`${c} ${(100*i)/RUNGS.length}%`, `${c} ${(100*(j+1))/RUNGS.length}%`);
    i = j + 1;
  }
}
slider.style.cssText = 'width:100%;margin:8px 0 4px;height:14px;-webkit-appearance:none;'
  + `appearance:none;border-radius:7px;outline:none;background:linear-gradient(to right,${stops.join(',')})`;
const readout = document.createElement('div');
readout.style.cssText = 'font-variant-numeric:tabular-nums;color:#c8c8d0';
panel.append(title, slider, readout);

let exaggeration = 1;
const EXAGGERATIONS = [1, 2, 4];
/**
 * RAW ↔ CORRECTED on the right. The push alone is not the answer: it is embedded for every
 * t > 0 but the squared edge lengths change by t²(ζ_a − ζ_b)², so it stops being flat at
 * O(t²) — at t = 0.136 the raw lift's worst cone angle is off by 0.165 radians, nearly 10°.
 * The correction is what puts that back, and R shows you the difference.
 */
let showRaw = false;

function update(): void {
  const r = RUNGS[Number(slider.value)];
  const shown = showRaw ? liftedPositions(BASE, r.t) : r.positions;
  left.draw(foldPositions);
  right.draw(shown);
  const m = measure(BASE.triang, shown);
  right.material.color.setHex(m.embedded ? GOLD : RED);
  drawArrows(r.t, exaggeration);

  const badge = (ok: boolean, yes: string, no: string) =>
    `<b style="color:${ok ? '#7fd6a0' : '#e07070'}">${ok ? yes : no}</b>`;
  const isFlat = m.coneDeficit <= 1e-9;
  readout.innerHTML = `t = <b>${r.t.toFixed(4)}</b>`
    + ` &nbsp; right panel: <b style="color:#c8a45c">${showRaw ? 'RAW PUSH' : 'CORRECTED'}</b> (R)`
    + ` &nbsp; arrows ×${exaggeration} (A)<br>`
    + `${badge(isFlat, 'FLAT', 'NOT FLAT')} `
    + `<span style="color:#8c8c95">worst cone deficit ${m.coneDeficit.toExponential(2)}</span>`
    + ` &nbsp;·&nbsp; ${badge(m.embedded, 'EMBEDDED', 'NOT EMBEDDED')} `
    + `<span style="color:#8c8c95">clearance ${m.clearance.toExponential(2)}`
    + ` · squash ${squash(shown).toFixed(4)}`
    + ` · the correction slides ${showRaw ? '' : ''}6 of 8 vertices SIDEWAYS only — every height`
    + ` stays exactly t·ζ_v, so these arrows are true of both panels</span>`;
}
slider.addEventListener('input', update);

// ---- one rotation for both panels ----
const shared = new THREE.Quaternion();
let dragging = false;
let px = 0, py = 0;
renderer.domElement.addEventListener('pointerdown', (e) => {
  dragging = true; px = e.clientX; py = e.clientY;
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - px, dy = e.clientY - py;
  px = e.clientX; py = e.clientY;
  // turn about the CAMERA's axes, so dragging right spins right on screen for both panels
  const right3 = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up3 = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const q = new THREE.Quaternion().setFromAxisAngle(up3, dx * 0.01)
    .multiply(new THREE.Quaternion().setFromAxisAngle(right3, dy * 0.01));
  shared.premultiply(q);
  left.holder.quaternion.copy(shared);
  right.holder.quaternion.copy(shared);
});
const endDrag = (e: PointerEvent): void => {
  dragging = false;
  if (renderer.domElement.hasPointerCapture(e.pointerId)) renderer.domElement.releasePointerCapture(e.pointerId);
};
renderer.domElement.addEventListener('pointerup', endDrag);
renderer.domElement.addEventListener('pointercancel', endDrag);
renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  viewHeight = Math.min(6, Math.max(0.6, viewHeight * (1 + e.deltaY * 0.001)));
  resize();
}, { passive: false });

window.addEventListener('keydown', (e) => {
  if (e.key === 'a' || e.key === 'A') {
    exaggeration = EXAGGERATIONS[(EXAGGERATIONS.indexOf(exaggeration) + 1) % EXAGGERATIONS.length];
    update();
  }
  if (e.key === 'e' || e.key === 'E') { slider.value = String(lastEmbeddedIdx); update(); }
  if (e.key === 'r' || e.key === 'R') { showRaw = !showRaw; update(); }
  if (e.key === 'g' || e.key === 'G') {
    shared.identity();
    left.holder.quaternion.identity();
    right.holder.quaternion.identity();
  }
});

resize();
update();
renderer.setAnimationLoop(() => renderer.render(scene, camera));
