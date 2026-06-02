/**
 * Flat-samples demo — the 7 seed tori of explore-from-seeds, in order.
 *
 * data/explore-from-seeds/seeds.csv holds exactly the 7 seed flat tori (row i
 * is the seed that walk seed-(i+1).csv starts from). We render their 3D
 * embeddings in a single row, left→right in seed order 1..7, each numbered and
 * tinted with the SAME categorical palette as the moduli demo so the two views
 * correspond (seed 1 here = the seed-1 cloud there). Orbit/zoom to inspect.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import seedsRaw from '../../data/explore-from-seeds/seeds.csv?raw';
import { PaperTorus } from '../../src/math/embedding';
import { VERTEX_COUNT, TRIANGLES } from '../../src/math/topology';
import { TorusView } from '../../src/viewer/TorusView';

const DIM = VERTEX_COUNT * 3;        // 24 floats per torus
const FACE_COUNT = TRIANGLES.length; // 16
const SPACING = 3.6;                 // gap between adjacent seed tori

// One color per seed, matching demos/moduli (seed-1..seed-7 order).
const PALETTE = ['#ef4444', '#f59e0b', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7'];

/** Parse seeds.csv into normalized Float64Array rows (one torus each), in order. */
function parseCsv(text: string): Float64Array[] {
  const rows: Float64Array[] = [];
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    const nums = s.split(',').map(Number);
    if (nums.length !== DIM) throw new Error(`expected ${DIM} floats per row, got ${nums.length}`);
    const p = Float64Array.from(nums);
    normalize(p);
    rows.push(p);
  }
  return rows;
}

/**
 * Normalize one torus in place: centroid → 0, RMS centroid-distance → 1.
 * Translation and scale are gauge freedoms (flatness & embeddedness are
 * invariant under them), so this only affects display — making the 7 seeds,
 * whose intrinsic scales differ wildly, directly comparable side by side.
 */
function normalize(p: Float64Array): void {
  let cx = 0, cy = 0, cz = 0;
  for (let v = 0; v < VERTEX_COUNT; v++) {
    cx += p[3 * v]; cy += p[3 * v + 1]; cz += p[3 * v + 2];
  }
  cx /= VERTEX_COUNT; cy /= VERTEX_COUNT; cz /= VERTEX_COUNT;
  let rms2 = 0;
  for (let v = 0; v < VERTEX_COUNT; v++) {
    const x = p[3 * v] - cx, y = p[3 * v + 1] - cy, z = p[3 * v + 2] - cz;
    p[3 * v] = x; p[3 * v + 1] = y; p[3 * v + 2] = z;
    rms2 += x * x + y * y + z * z;
  }
  const rms = Math.sqrt(rms2 / VERTEX_COUNT);
  if (rms > 0) { const inv = 1 / rms; for (let i = 0; i < DIM; i++) p[i] *= inv; }
}

const seeds = parseCsv(seedsRaw);
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

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
keyLight.position.set(20, 30, 20);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
fillLight.position.set(-20, -10, -20);
scene.add(fillLight);

// ---------------- the 7 seed tori, in a row, in order ----------------
const labelAnchors: THREE.Vector3[] = [];
seeds.forEach((p, i) => {
  const col = new THREE.Color(PALETTE[i % PALETTE.length]);
  const view = new TorusView({ vertexRadius: 0.04 });
  view.sync(new PaperTorus(p));
  view.setFaceScalars(new Array(FACE_COUNT).fill(0), { color: () => col.clone() });
  const x = (i - (N - 1) / 2) * SPACING;
  view.position.set(x, 0, 0);
  scene.add(view);
  labelAnchors.push(new THREE.Vector3(x, -1.9, 0)); // number sits just below each torus
});

// Frame the whole row.
const span = (N - 1) * SPACING + 4;
const dist = (span / 2) / Math.tan((FOV / 2) * Math.PI / 180) * 1.15;
camera.position.set(0, span * 0.18, dist);
controls.target.set(0, 0, 0);

// ---------------- numeric labels (HTML overlay, projected each frame) ----------------
const labelLayer = document.createElement('div');
labelLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:10';
document.body.appendChild(labelLayer);
const labels = seeds.map((_, i) => {
  const el = document.createElement('div');
  el.textContent = String(i + 1);
  el.style.cssText = [
    'position:absolute', 'transform:translate(-50%,-50%)',
    'font:700 15px/1 ui-monospace,monospace', 'color:#0a0a0a',
    `background:${PALETTE[i % PALETTE.length]}`,
    'width:24px', 'height:24px', 'border-radius:50%',
    'display:flex', 'align-items:center', 'justify-content:center',
    'box-shadow:0 1px 4px rgba(0,0,0,0.5)',
  ].join(';');
  labelLayer.appendChild(el);
  return el;
});

function updateLabels(): void {
  const w = window.innerWidth, h = window.innerHeight;
  for (let i = 0; i < labels.length; i++) {
    const v = labelAnchors[i].clone().project(camera);
    const onScreen = v.z < 1;
    labels[i].style.display = onScreen ? 'flex' : 'none';
    labels[i].style.left = `${(v.x * 0.5 + 0.5) * w}px`;
    labels[i].style.top = `${(-v.y * 0.5 + 0.5) * h}px`;
  }
}

// ---------------- title ----------------
const title = document.createElement('div');
title.textContent = '7 seed tori — explore-from-seeds order (1–7)';
title.style.cssText = [
  'position:fixed', 'top:12px', 'left:12px', 'z-index:10',
  'color:#e8e8ec', 'font:13px/1.4 -apple-system,system-ui,sans-serif',
  'background:rgba(20,20,24,0.85)', 'border:1px solid #333',
  'border-radius:8px', 'padding:8px 12px',
].join(';');
document.body.appendChild(title);

// ---------------- loop ----------------
function animate(): void {
  controls.update();
  renderer.render(scene, camera);
  updateLabels();
  requestAnimationFrame(animate);
}
animate();
