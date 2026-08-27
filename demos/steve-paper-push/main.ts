/**
 * paper-push — how far Lander's OWN argument reaches.
 *
 * The paper's construction is a curve, and this is that curve with a handle on it. Start from
 * the fold: a configuration collapsed FLAT into the plane, sixteen nondegenerate triangles with
 * eight of them folded over, already an exact flat torus of modulus exactly i (square, T = v8-7)
 * or exactly ρ (hexagonal, T′ = v8-3), and of course not embedded. Push it off the plane along
 * the fixed rational direction ζ — vertex v to (Q_v, t·ζ_v) — and the lift is embedded for every
 * t > 0 but no longer flat: the squared edge lengths change by t²(ζ_a − ζ_b)², so the cone
 * deficits open as O(t²) and the modulus drifts. Correct it back onto {flat} ∩ {τ = τ₀} by the
 * implicit function theorem, moving the nine planar coordinates of §6 and freezing the rest.
 * That correction is a SQUARE 9×9 system, invertible at the fold (Prop. 3), so near t = 0 it has
 * exactly one solution and t ↦ (corrected torus) is the curve the theorem produces.
 *
 * THE THEOREM IS LOCAL. It says a good t exists, not how big it gets — and the honest answer is
 * that both conditions it needs fail, at very different places, well before the correction
 * itself gives out:
 *
 *   square       embedded for t ≤ 0.136, then never again; the 9×9 solves to t ≈ 1.19
 *   hexagonal    embedded for t ≤ 0.013, then never again; the 9×9 solves to t ≈ 0.056
 *
 * Both losses are PERMANENT — measured on every rung, embeddedness is lost once and does not
 * come back — so the usable part of the paper's curve is an interval starting at 0, and the
 * slider shows you exactly where it ends. The tori go RED there and stay red, and the band is
 * marked on the slider track before you touch it.
 *
 * THIS IS NOT THE REPO'S OTHER LADDER, and the difference is the point. `npm run inflate-fold`
 * corrects with `free: 'planar'` — sixteen coordinates, a 7-dimensional fiber — and fattens
 * along that fiber against a barrier, which carries the square torus to t ≈ 1.6. That is a
 * better torus-finder and a worse measurement of the paper: it uses freedom the argument does
 * not claim. Here the correction is exactly §6's, nothing is fattened (at `free: 'paper'` the
 * solution is locally isolated, so there is nothing to fatten along), and what you are watching
 * is the theorem's own curve.
 *
 * Data from `npm run paper-push`, which marches t up in small steps warm-starting each solve
 * from the last and records EVERY rung, embedded or not — stopping only when the correction
 * stops solving, since past that there is no curve left to follow. Every rung it kept is
 * verified flat to 1e-11 and at its exact modulus to 1e-11; only embeddedness varies.
 *
 *   sliders    the push-off height t, one per torus (click a track, then ← → to step)
 *   E          jump each slider to its last embedded rung — the edge of the argument
 *   Z          view-only z exaggeration ×1 → ×3 → ×6, so a near-planar torus is legible.
 *              Every number in the readout is measured on the TRUE positions.
 *   V          vertex coloring: cone deficit ↔ none
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { FOLDED_BASES, liftedPositions, type FoldedBase } from '@core/sampling/foldedBases.ts';
import { coneAngleDeficits } from '@core/constraints/flat.ts';
import { measure } from '@core/search/measure.ts';
import { squash, volumeRatio } from '@core/search/shape.ts';
import { makeTorusView, type TorusView } from '@display/viewer/TorusView';
import { plainSurfaceMaterial } from '@display/viewer/materials';
import { DEFICIT_PALETTE } from '@display/viewer/palette';
import squareData from './data/square.csv?raw';
import hexagonalData from './data/hexagonal.csv?raw';

const GOLD = 0xd9c48a;
const RED = 0xd05050;

// ---- the precomputed curve: t, converged, coneDeficit, dTau, embedded, clearance, then 24 ----
interface Rung {
  t: number;
  embedded: boolean;
  coneDeficit: number;
  dTau: number;
  clearance: number;
  positions: Float64Array;
}

function parseCurve(text: string): Rung[] {
  return text.trim().split('\n').filter(Boolean).map((line) => {
    const v = line.split(',').map(Number);
    return {
      t: v[0], coneDeficit: v[2], dTau: v[3], embedded: v[4] === 1, clearance: v[5],
      positions: Float64Array.from(v.slice(6)),
    };
  });
}
const CURVES: Record<string, Rung[]> = {
  square: parseCurve(squareData),
  hexagonal: parseCurve(hexagonalData),
};
const nameOf = (base: FoldedBase) => (base.tauHat[0] === 0 ? 'square' : 'hexagonal');

/**
 * The fold itself, as rung 0 — the left end of the curve and the thing the argument starts
 * from. Exactly flat and exactly at modulus by construction (Lander, Prop. 1), and not
 * embedded: the sheet lies in a plane with eight of its triangles folded over onto the others.
 */
function foldRung(base: FoldedBase): Rung {
  const positions = liftedPositions(base, 0);
  const m = measure(base.triang, positions);
  return { t: 0, embedded: false, coneDeficit: m.coneDeficit, dTau: 0, clearance: m.clearance, positions };
}

// ---- scene ----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101014);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(0, -2.8, 2.4);
camera.up.set(0, 0, 1);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const keyLight = new THREE.DirectionalLight(0xffffff, 0.9); keyLight.position.set(2, -3, 6);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.4); fillLight.position.set(-3, 2, -4);
scene.add(keyLight, fillLight);

// ---- one subject per base ----
interface Subject {
  base: FoldedBase;
  name: string;
  view: TorusView;
  material: THREE.MeshStandardMaterial;
  rungs: Rung[];
  lastEmbeddedIdx: number;
  slider: HTMLInputElement;
  readout: HTMLDivElement;
  deficits: Float64Array;
  /** Scale that holds the torus at a constant apparent size as t grows. */
  unitScale: number[];
}

const panel = document.createElement('div');
panel.style.cssText = ['position:fixed', 'left:0', 'right:0', 'bottom:0', 'z-index:10',
  'display:flex', 'gap:16px', 'padding:12px 16px 16px',
  'font:12px/1.5 -apple-system,system-ui,sans-serif', 'color:#e8e8ec',
  'background:linear-gradient(transparent,rgba(16,16,20,0.92) 30%)'].join(';');
document.body.appendChild(panel);

/**
 * The slider track, painted from the rungs' OWN embedded flags — green where the paper's
 * torus is embedded, red where it is not. Built from runs rather than from "everything past
 * the last good one", so if the data ever came back with embeddedness returning, the track
 * would show that instead of hiding it behind an assumption.
 */
function trackGradient(rungs: Rung[]): string {
  const stops: string[] = [];
  let i = 0;
  while (i < rungs.length) {
    let j = i;
    while (j + 1 < rungs.length && rungs[j + 1].embedded === rungs[i].embedded) j++;
    const a = (100 * i) / rungs.length, b = (100 * (j + 1)) / rungs.length;
    const c = rungs[i].embedded ? '#3f8f5f' : '#8f3f3f';
    stops.push(`${c} ${a}%`, `${c} ${b}%`);
    i = j + 1;
  }
  return `linear-gradient(to right, ${stops.join(',')})`;
}

const GAP = 1.05;
const subjects: Subject[] = [];
let cursor = -((FOLDED_BASES.length - 1) * GAP) / 2 - 0.55;

for (const base of FOLDED_BASES) {
  const name = nameOf(base);
  const rungs = [foldRung(base), ...(CURVES[name] ?? [])];
  let lastEmbeddedIdx = 0;
  rungs.forEach((r, i) => { if (r.embedded) lastEmbeddedIdx = i; });

  // our own material, so the surface can be recolored: white vertex tint, colour lives here
  const material = plainSurfaceMaterial({ roughness: 0.55 });
  material.color.setHex(GOLD);
  const view = makeTorusView(base.triang, {
    surface: { style: 'plain', color: 0xffffff, material },
    creases: { radius: 0.006 },
    corners: { radius: 0.022 },
    center: true,
  });
  view.group.position.set(cursor, 0, 0);
  scene.add(view.group);
  cursor += 1.1 + GAP;

  // Hold the apparent size fixed. Both conditions the correction imposes are scale-invariant,
  // so the family grows like t — without this the torus would mostly just get bigger, and the
  // change of SHAPE, which is the thing worth looking at, would be hidden inside that.
  const unitScale = rungs.map((r) => {
    const b = new THREE.Box3();
    for (let v = 0; v < base.triang.vertexCount; v++) {
      b.expandByPoint(new THREE.Vector3(r.positions[3*v], r.positions[3*v+1], r.positions[3*v+2]));
    }
    const s = b.getSize(new THREE.Vector3());
    return 1 / (Math.max(s.x, s.y, s.z) || 1);
  });

  const col = document.createElement('div');
  col.style.cssText = 'flex:1;min-width:0';
  const title = document.createElement('div');
  const embT = rungs[lastEmbeddedIdx].t;
  title.innerHTML = `<b>${name}</b> — ${base.triang.id}, τ̂ = ${name === 'square' ? 'i' : 'ρ'}`
    + `<br><span style="color:#8c8c95">the paper's torus is embedded for `
    + `<b style="color:#7fd6a0">t ≤ ${embT.toFixed(4)}</b>`
    + ` (${rungs.filter((r) => r.embedded).length} of ${rungs.length} rungs),`
    + ` then never again; the 9×9 solves to t = ${rungs[rungs.length-1].t.toFixed(3)}</span>`;
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0'; slider.max = String(rungs.length - 1); slider.step = '1'; slider.value = '0';
  slider.style.cssText = `width:100%;margin:8px 0 4px;height:14px;-webkit-appearance:none;`
    + `appearance:none;border-radius:7px;background:${trackGradient(rungs)};outline:none`;
  const readout = document.createElement('div');
  readout.style.cssText = 'font-variant-numeric:tabular-nums;color:#c8c8d0';
  col.append(title, slider, readout);
  panel.appendChild(col);

  const s: Subject = {
    base, name, view, material, rungs, lastEmbeddedIdx, slider, readout,
    deficits: new Float64Array(base.triang.vertexCount), unitScale,
  };
  slider.addEventListener('input', () => update(s));
  subjects.push(s);
}

// ---- drawing ----
let zScale = 1;
const Z_STEPS = [1, 3, 6];
let showDeficit = true;

function update(s: Subject): void {
  const i = Number(s.slider.value);
  const r = s.rungs[i];
  const p = r.positions;

  // VIEW ONLY: exaggerate z, and hold the apparent size fixed. Neither touches what is measured.
  const shown = new Float64Array(p.length);
  for (let v = 0; v < p.length / 3; v++) {
    shown[3*v] = p[3*v] * s.unitScale[i];
    shown[3*v+1] = p[3*v+1] * s.unitScale[i];
    shown[3*v+2] = p[3*v+2] * s.unitScale[i] * zScale;
  }
  s.view.draw(shown);
  s.material.color.setHex(r.embedded ? GOLD : RED);

  if (showDeficit) {
    coneAngleDeficits(s.base.triang, p, s.deficits);
    s.view.paintVertices(s.deficits, DEFICIT_PALETTE);
  } else s.view.paintVertices(null);

  const tag = r.embedded
    ? '<b style="color:#7fd6a0">EMBEDDED</b>'
    : `<b style="color:#e07070">NOT EMBEDDED</b>${i === 0 ? ' — the fold itself' : ''}`;
  s.readout.innerHTML = `t = <b>${r.t.toFixed(4)}</b> &nbsp; ${tag}`
    + ` &nbsp;<span style="color:#8c8c95">·  cone deficit ${r.coneDeficit.toExponential(1)}`
    + ` · |Δτ| ${r.dTau.toExponential(1)}`
    + ` · clearance ${r.clearance.toExponential(2)}`
    + ` · squash ${squash(p).toFixed(4)}`
    + ` · inflation ${volumeRatio(s.base.triang, p).toFixed(5)}</span>`;
}

const hint = document.createElement('div');
hint.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:10;'
  + 'color:#8c8c95;font:12px/1.6 system-ui,sans-serif;text-align:center';
document.body.appendChild(hint);
function syncHint(): void {
  hint.innerHTML = '<b style="color:#e8e8ec">the paper\'s push-off, exactly</b>'
    + ' — fold + t·ζ, corrected by the 9×9 of §6<br>'
    + `E: jump to the edge of embeddedness · Z: z exaggeration ×${zScale} · `
    + `V: cone deficit ${showDeficit ? 'on' : 'off'}`;
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'e' || e.key === 'E') {
    for (const s of subjects) { s.slider.value = String(s.lastEmbeddedIdx); update(s); }
  }
  if (e.key === 'z' || e.key === 'Z') {
    zScale = Z_STEPS[(Z_STEPS.indexOf(zScale) + 1) % Z_STEPS.length];
    for (const s of subjects) update(s);
    syncHint();
  }
  if (e.key === 'v' || e.key === 'V') {
    showDeficit = !showDeficit;
    for (const s of subjects) update(s);
    syncHint();
  }
});

for (const s of subjects) update(s);
syncHint();

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
