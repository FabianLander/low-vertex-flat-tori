/**
 * folded-tori — Lander's two folded bases, pushed off the plane and inflated.
 *
 * Left, the square base Q⁰ on T = v8-7; right, the hexagonal base P⁰ on T′ = v8-3.
 * Each is a configuration folded FLAT into the plane: sixteen nondegenerate triangles,
 * eight of them folded over, so the sheet overlaps itself. Folded flat each is already an
 * exact flat torus — every cone angle exactly 2π — of modulus exactly i, respectively ρ,
 * but of course not embedded.
 *
 * The t slider is the push-off height. Two things can be drawn at each t:
 *
 *   RAW      vertex v at (Q_v, t·ζ_v), the paper's lift along its fixed rational direction ζ.
 *            Embedded for every t > 0, but flat only at t = 0 — flatness and the modulus both
 *            break at O(t²). Computed live; it is a closed form.
 *
 *   SNAPPED  the same push-off solved back onto {flat} ∩ {τ = τ₀}, so that all THREE conditions
 *            hold at once: exactly flat, exactly the target modulus, and embedded. This is the
 *            interesting one, and it is READ FROM A PRECOMPUTED LADDER (data/*.csv, built by
 *            `npm run inflate-fold`) rather than solved here — for two reasons. Solving cold at
 *            a given t converges but lands OUTSIDE the embedded region, and the fatten that
 *            would rescue it is gated, so it cannot; the family has to be MARCHED up in t,
 *            warm-starting each step. And that march costs ~0.5–2 s per step, far too slow for
 *            a slider. Every rung in the ladder was verified flat ∧ at-modulus ∧ embedded
 *            before being written, so the slider is scrubbing verified tori.
 *
 * The square ladder runs far — a genuinely inflated flat square torus. The hexagonal one stops
 * early: marching from that fold pinches at small t whatever the barrier settings. That is a
 * limit of this path from this fold, not a statement about which hexagonal tori exist.
 *
 * FIXED AREA is on by default, and it matters here. Both conditions the snap imposes are
 * scale-invariant — flatness is, and so is τ — so freezing the heights at t·ζ is the only thing
 * in the problem that sees scale: if q solves at t then λq solves at λt. The solution set at λt
 * is exactly λ × the solution set at t, and the barrier is normalized by √area, so the fatten is
 * scale-invariant too. Past t ≈ 0.2 the square family is therefore PURE SIMILARITY GROWTH —
 * measured: area/t² constant to three digits, normalized shape constant to ~3e-3. All the real
 * inflation happens in t ∈ (0, 0.2). Rescaling every rung to one fixed area divides that growth
 * out, so the slider shows the shape changing and then visibly stopping.
 *
 *   t slider     the push-off height (the snapped curve is clamped to its ladder's reach)
 *   z slider     VIEW ONLY — stretches z so a nearly planar object is legible. Every number
 *                in the readout is measured on the true positions.
 *   A            fixed area ↔ true scale (see above)
 *   S            snapped ↔ raw push-off
 *   V            vertex coloring: cone deficit ↔ none
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { FOLDED_BASES, liftedPositions, type FoldedBase } from '@core/sampling/foldedBases.ts';
import { coneAngleDeficits } from '@core/constraints/flat.ts';
import { measure } from '@core/search/measure.ts';
import { totalArea } from '@core/moduli/develop.ts';
import { makeTorusView, type TorusView } from '@display/viewer/TorusView';
import { DEFICIT_PALETTE } from '@display/viewer/palette';
import squareLadder from './data/square.csv?raw';
import hexagonalLadder from './data/hexagonal.csv?raw';

// ---- the precomputed ladders: t, coneDeficit, clearance, tauRe, tauIm, then 24 positions ----
interface Rung { t: number; positions: Float64Array }

function parseLadder(text: string): Rung[] {
  return text.trim().split('\n').filter(Boolean).map((line) => {
    const v = line.split(',').map(Number);
    return { t: v[0], positions: Float64Array.from(v.slice(5)) };
  });
}
const LADDERS: Record<string, Rung[]> = {
  square: parseLadder(squareLadder),
  hexagonal: parseLadder(hexagonalLadder),
};
const nameOf = (base: FoldedBase) => (base.tauHat[0] === 0 ? 'square' : 'hexagonal');

/** The rung nearest t, clamped to the ladder's reach (it stops where the march pinched). */
function rungAt(ladder: Rung[], t: number): Rung | null {
  if (!ladder.length) return null;
  let best = ladder[0];
  for (const r of ladder) if (Math.abs(r.t - t) < Math.abs(best.t - t)) best = r;
  return best;
}

// ---- scene ----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101014);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(0, -2.6, 2.6);
camera.up.set(0, 0, 1);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const key = new THREE.DirectionalLight(0xffffff, 0.9);
key.position.set(2, -3, 6);
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.4);
fill.position.set(-3, 2, -4);
scene.add(fill);

// ---- one subject per base, laid out side by side ----
interface Subject {
  base: FoldedBase;
  view: TorusView;
  deficits: Float32Array;
  readout: HTMLDivElement;
  ladder: Rung[];
}

const GAP = 1.0;
const subjects: Subject[] = [];
let cursor = -((FOLDED_BASES.length - 1) * GAP) / 2 - 0.6;
for (const base of FOLDED_BASES) {
  const view = makeTorusView(base.triang, {
    surface: { style: 'plain', color: 0xd9c48a },
    creases: { radius: 0.006 },
    corners: { radius: 0.022 },
    center: true,           // spin about each torus's own centre
  });
  view.group.position.set(cursor, 0, 0);
  scene.add(view.group);
  cursor += 1.2 + GAP;

  const readout = document.createElement('div');
  subjects.push({
    base, view, readout,
    deficits: new Float32Array(base.triang.vertexCount),
    ladder: LADDERS[nameOf(base)] ?? [],
  });
}

// ---- state ----
const maxLadderT = Math.max(...subjects.map((s) => (s.ladder.length ? s.ladder[s.ladder.length - 1].t : 0)), 0.1);
let t = Math.min(0.3, maxLadderT);
let zScale = 1;
let snapped = true;
let paintDeficit = true;
let fixedArea = true;
/** every torus drawn at this intrinsic area, so similarity growth is divided out */
const TARGET_AREA = 2.5;

function refresh(): void {
  for (const s of subjects) {
    const rung = snapped ? rungAt(s.ladder, t) : null;
    const positions = rung ? rung.positions : liftedPositions(s.base, t);

    // the honest readout is measured on the true positions …
    const m = measure(s.base.triang, positions);
    const defs = coneAngleDeficits(s.base.triang, positions);
    for (let i = 0; i < defs.length; i++) s.deficits[i] = Math.abs(defs[i]);

    // … and only the drawn copy is rescaled to a common area and stretched in z
    const area = totalArea(s.base.triang, positions);
    const k = fixedArea && area > 0 ? Math.sqrt(TARGET_AREA / area) : 1;
    const shown = Float64Array.from(positions);
    for (let i = 0; i < shown.length; i++) shown[i] *= k;
    for (let i = 2; i < shown.length; i += 3) shown[i] *= zScale;

    s.view.draw(shown);
    s.view.paintVertices(paintDeficit ? s.deficits : null, DEFICIT_PALETTE);

    const target = s.base.tauHat;
    const dTauHat = Math.min(
      Math.hypot(m.tauHat[0] - target[0], m.tauHat[1] - target[1]),
      Math.hypot(m.tauHat[0] + target[0], m.tauHat[1] - target[1]),   // ±Re convention on the wall
    );
    const yes = (ok: boolean, txt: string) =>
      `<b style="color:${ok ? '#7fd6a0' : '#e07070'}">${txt}</b>`;
    const reach = s.ladder.length ? s.ladder[s.ladder.length - 1].t : 0;
    const shownT = rung ? rung.t : t;
    const clamped = snapped && Math.abs(shownT - t) > 1e-9
      ? ` <span style="color:#c8a45c">(ladder ends at t=${reach.toFixed(2)})</span>` : '';

    s.readout.innerHTML =
      `<b>${s.base.label}</b><br>`
      + `t = ${shownT.toFixed(3)}${clamped}<br>`
      + `${yes(m.coneDeficit < 1e-11, m.coneDeficit < 1e-11 ? 'flat' : `not flat (${m.coneDeficit.toExponential(1)})`)}`
      + ` · ${yes(dTauHat < 1e-9, dTauHat < 1e-9 ? 'at target modulus' : `τ̂ off by ${dTauHat.toExponential(1)}`)}`
      + ` · ${yes(m.embedded, m.embedded ? 'embedded' : 'NOT embedded')}<br>`
      + `<span style="color:#8c8c95">τ̂ = ${m.tauHat[0].toFixed(9)} + ${m.tauHat[1].toFixed(9)} i`
      + ` · clearance ${m.clearance.toExponential(2)}`
      + ` · area ${area.toExponential(2)}${fixedArea ? ` (drawn ×${k.toFixed(3)})` : ''}</span>`;
  }
}

// ---- panel ----
const panel = document.createElement('div');
panel.style.cssText = [
  'position:fixed', 'top:12px', 'left:12px', 'z-index:10', 'max-width:440px',
  'background:rgba(20,20,24,0.85)', 'color:#e8e8ec',
  'font:12px/1.6 -apple-system,system-ui,sans-serif',
  'padding:10px 14px', 'border-radius:8px', 'border:1px solid #333',
].join(';');
document.body.appendChild(panel);

const tSlider = document.createElement('input');
tSlider.type = 'range'; tSlider.min = '0'; tSlider.max = String(Math.max(maxLadderT, 0.2));
tSlider.step = '0.01'; tSlider.value = String(t);
tSlider.style.cssText = 'width:210px;vertical-align:middle';
const tLabel = document.createElement('span');
const tRow = document.createElement('div');
tRow.append('push-off t ', tSlider, ' ', tLabel);

const zSlider = document.createElement('input');
zSlider.type = 'range'; zSlider.min = '1'; zSlider.max = '20'; zSlider.step = '0.5'; zSlider.value = String(zScale);
zSlider.style.cssText = 'width:210px;vertical-align:middle';
const zLabel = document.createElement('span');
const zRow = document.createElement('div');
zRow.append('z stretch ', zSlider, ' ', zLabel);

const keysRow = document.createElement('div');
keysRow.style.cssText = 'margin-top:6px;color:#8c8c95';
keysRow.innerHTML = 'A: fixed area ↔ true scale · S: snapped ↔ raw push-off · V: vertex coloring'
  + '<br>z stretch is a VIEW aid — the readouts are measured on the true positions';

panel.append(tRow, zRow, keysRow);
for (const s of subjects) {
  const box = document.createElement('div');
  box.style.cssText = 'margin-top:8px;padding-top:6px;border-top:1px solid #333';
  box.append(s.readout);
  panel.append(box);
}

function syncLabels(): void {
  tLabel.textContent = t.toFixed(2)
    + (snapped ? '  · snapped (flat + at modulus)' : '  · raw push-off')
    + (fixedArea ? '  · fixed area' : '  · true scale');
  zLabel.textContent = '×' + zScale.toFixed(1);
}

tSlider.addEventListener('input', () => { t = Number(tSlider.value); syncLabels(); refresh(); });
zSlider.addEventListener('input', () => { zScale = Number(zSlider.value); syncLabels(); refresh(); });
window.addEventListener('keydown', (e) => {
  if (e.key === 's' || e.key === 'S') { snapped = !snapped; syncLabels(); refresh(); }
  if (e.key === 'a' || e.key === 'A') { fixedArea = !fixedArea; syncLabels(); refresh(); }
  if (e.key === 'v' || e.key === 'V') { paintDeficit = !paintDeficit; refresh(); }
});

syncLabels();
refresh();

function animate(): void {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
