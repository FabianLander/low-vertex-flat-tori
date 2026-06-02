/**
 * Flat-samples demo — normalization test on the 7 seed tori.
 *
 * Top row:    the 7 seeds as given (gauge-centered only, for framing).
 * Bottom row: the same 7 after normalize() — the canonical similarity pose
 *             v0→(0,0,0), v1→(1,0,0), v2→xy-plane (see src/math/normalize.ts).
 *
 * The three ANCHOR vertices that define the convention are marked:
 *   v0 = white (origin), v1 = red (the +x axis), v2 = green (the +y / xy-plane).
 * A coordinate frame is drawn under each bottom torus (three.js axes: x red,
 * y green, z blue), so you can see the normalized tori share v0 at the origin
 * and v1 on +x, while the top row's anchors sit wherever the raw embedding put
 * them. Each bottom torus is congruent to the one above it (same shape, just
 * repositioned/rescaled by a similarity). Orbit/zoom to inspect.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import seedsRaw from '../../data/explore-from-seeds/seeds.csv?raw';
import { PaperTorus } from '../../src/math/embedding';
import { RICH } from '../../src/tori';
import { normalize } from '../../src/math/normalize';
import { TorusView } from '../../src/viewer/TorusView';

const DIM = RICH.vertexCount * 3;
const FACE_COUNT = RICH.triangles.length;
const SPACING = 4.5;          // gap between columns (one column per seed)
const TOP_Y = 3.0, BOT_Y = -3.0;

// One color per seed column (matches the moduli demo: seed-1..seed-7).
const PALETTE = [0xef4444, 0xf59e0b, 0xfacc15, 0x22c55e, 0x06b6d4, 0x3b82f6, 0xa855f7];

// Anchor marking: vertex 0/1/2 get distinct colors, everything else neutral.
const C_V0 = new THREE.Color(0xffffff);   // origin
const C_V1 = new THREE.Color(0xef4444);   // +x  (matches the red x-axis)
const C_V2 = new THREE.Color(0x22c55e);   // xy-plane (matches the green y-axis)
const C_OTHER = new THREE.Color(0x9aa0aa);
const anchorScalars = new Float32Array(RICH.vertexCount); // 0 except the 3 anchors
anchorScalars[0] = 1; anchorScalars[1] = 2; anchorScalars[2] = 3;
const anchorPalette = {
  color: (v: number) => v === 1 ? C_V0.clone() : v === 2 ? C_V1.clone() : v === 3 ? C_V2.clone() : C_OTHER.clone(),
};

/** Parse seeds.csv into raw Float64Array rows (one torus each), in order. */
function parseRaw(text: string): Float64Array[] {
  const rows: Float64Array[] = [];
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    const nums = s.split(',').map(Number);
    if (nums.length === DIM) rows.push(Float64Array.from(nums));
  }
  return rows;
}

/** Display gauge for the TOP row only: centroid → 0, RMS radius → 1. Just a
 *  similarity (so it doesn't change the shape, and normalize() is invariant to
 *  it), used here to frame raw seeds of wildly different scale side by side. */
function displayGauge(p: Float64Array): Float64Array {
  const q = Float64Array.from(p);
  let cx = 0, cy = 0, cz = 0;
  for (let v = 0; v < RICH.vertexCount; v++) { cx += q[3 * v]; cy += q[3 * v + 1]; cz += q[3 * v + 2]; }
  cx /= RICH.vertexCount; cy /= RICH.vertexCount; cz /= RICH.vertexCount;
  let rms2 = 0;
  for (let v = 0; v < RICH.vertexCount; v++) {
    const x = q[3 * v] - cx, y = q[3 * v + 1] - cy, z = q[3 * v + 2] - cz;
    q[3 * v] = x; q[3 * v + 1] = y; q[3 * v + 2] = z;
    rms2 += x * x + y * y + z * z;
  }
  const rms = Math.sqrt(rms2 / RICH.vertexCount) || 1;
  for (let i = 0; i < DIM; i++) q[i] /= rms;
  return q;
}

const seeds = parseRaw(seedsRaw);
const N = seeds.length;

// ---------------- scene ----------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const FOV = 45;
const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 2000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const keyLight = new THREE.DirectionalLight(0xffffff, 0.85); keyLight.position.set(20, 30, 20); scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.3); fillLight.position.set(-20, -10, -20); scene.add(fillLight);

// ---------------- the two rows ----------------
type Tagged = { anchor: THREE.Vector3; text: string };
const tags: Tagged[] = [];

function addTorus(p24: Float64Array, x: number, y: number, colHex: number): void {
  const view = new TorusView(RICH, { vertexRadius: 0.05 });
  view.sync(new PaperTorus(RICH, p24));
  const col = new THREE.Color(colHex);
  view.setFaceScalars(new Array(FACE_COUNT).fill(0), { color: () => col.clone() });
  view.setVertexScalars(anchorScalars, anchorPalette);
  view.position.set(x, y, 0);
  scene.add(view);
}

seeds.forEach((raw, i) => {
  const x = (i - (N - 1) / 2) * SPACING;
  addTorus(displayGauge(raw), x, TOP_Y, PALETTE[i % PALETTE.length]);   // top: raw
  addTorus(normalize(raw), x, BOT_Y, PALETTE[i % PALETTE.length]);      // bottom: canonical

  // coordinate frame under each normalized torus: its origin IS v0, +x carries v1.
  const axes = new THREE.AxesHelper(1.0);
  axes.position.set(x, BOT_Y, 0);
  scene.add(axes);

  tags.push({ anchor: new THREE.Vector3(x, (TOP_Y + BOT_Y) / 2, 0), text: String(i + 1) });
});
// row labels at the left end
const leftX = (-(N - 1) / 2) * SPACING - SPACING * 0.75;
tags.push({ anchor: new THREE.Vector3(leftX, TOP_Y, 0), text: 'unnormalized' });
tags.push({ anchor: new THREE.Vector3(leftX, BOT_Y, 0), text: 'normalized' });

// frame both rows
const halfW = ((N - 1) / 2) * SPACING + SPACING;
const dist = (halfW) / Math.tan((FOV / 2) * Math.PI / 180) * 1.05;
camera.position.set(0, 0.5, dist);
controls.target.set(0, 0, 0);

// ---------------- HTML overlay labels (projected each frame) ----------------
const labelLayer = document.createElement('div');
labelLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:10';
document.body.appendChild(labelLayer);
const labelEls = tags.map((t) => {
  const el = document.createElement('div');
  el.textContent = t.text;
  const isNum = /^\d+$/.test(t.text);
  el.style.cssText = isNum
    ? 'position:absolute;transform:translate(-50%,-50%);font:700 14px/1 ui-monospace,monospace;color:#cfd3da'
    : 'position:absolute;transform:translate(-50%,-50%);font:600 12px/1 -apple-system,system-ui,sans-serif;color:#8c92a0;letter-spacing:.04em';
  labelLayer.appendChild(el);
  return el;
});
function updateLabels(): void {
  const w = window.innerWidth, h = window.innerHeight;
  tags.forEach((t, i) => {
    const v = t.anchor.clone().project(camera);
    labelEls[i].style.display = v.z < 1 ? 'block' : 'none';
    labelEls[i].style.left = `${(v.x * 0.5 + 0.5) * w}px`;
    labelEls[i].style.top = `${(-v.y * 0.5 + 0.5) * h}px`;
  });
}

// ---------------- title + anchor legend ----------------
const panel = document.createElement('div');
panel.style.cssText = [
  'position:fixed', 'top:12px', 'left:12px', 'z-index:10', 'color:#e8e8ec',
  'font:12px/1.5 -apple-system,system-ui,sans-serif', 'background:rgba(20,20,24,0.85)',
  'border:1px solid #333', 'border-radius:8px', 'padding:10px 12px', 'max-width:280px',
].join(';');
const swatch = (hex: string) => `<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${hex};vertical-align:middle;margin:0 5px 2px 0"></span>`;
panel.innerHTML =
  '<b>Normalization test — 7 seed tori</b><br>'
  + 'top: as given &nbsp;·&nbsp; bottom: canonical pose<br>'
  + '<div style="margin-top:6px">anchors:<br>'
  + `${swatch('#ffffff')}v0 → origin<br>`
  + `${swatch('#ef4444')}v1 → (1,0,0), the +x axis<br>`
  + `${swatch('#22c55e')}v2 → xy-plane (+y)</div>`;
document.body.appendChild(panel);

// ---------------- loop ----------------
function animate(): void {
  controls.update();
  renderer.render(scene, camera);
  updateLabels();
  requestAnimationFrame(animate);
}
animate();
