import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { PaperTorus } from '../../src/math/embedding';
import { VERTEX_COUNT, TRIANGLES } from '../../src/math/topology';
import { TorusView } from '../../src/viewer/TorusView';

// Read every curated CSV directly at serve/build time — no codegen, no manual
// data file to edit. These files are tracked (the repo-root samples/ dir is
// raw scratch and gitignored); promote good finds into ./samples/ and refresh.
// Vite inlines each file's text via the ?raw query.
const csvFiles = import.meta.glob('./samples/*.csv', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const DIM = VERTEX_COUNT * 3;        // 24 floats per torus: [x0,y0,z0,...,x7,y7,z7]
const FACE_COUNT = TRIANGLES.length; // 16

const SPACING = 3.5;   // gap between tori within one file's plane
const LAYER_GAP = 4.5; // vertical gap between file planes

/** Parse one CSV file into normalized Float64Array rows of length DIM. */
function parseCsv(text: string): Float64Array[] {
  const rows: Float64Array[] = [];
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    const nums = s.split(',').map(Number);
    if (nums.length !== DIM) {
      throw new Error(`expected ${DIM} floats per row, got ${nums.length}`);
    }
    const p = Float64Array.from(nums);
    normalize(p);
    rows.push(p);
  }
  return rows;
}

/**
 * Normalize one torus in place: centroid → 0, RMS centroid-distance → 1.
 * Translation and scale are gauge freedoms (flatness & embeddedness are
 * invariant under them), so this only affects display, making samples of
 * wildly different scale directly comparable.
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
  if (rms > 0) {
    const inv = 1 / rms;
    for (let i = 0; i < DIM; i++) p[i] *= inv;
  }
}

const basename = (path: string) => path.slice(path.lastIndexOf('/') + 1);

// Per-file data: stable sorted order, a fixed color per file (so a file's plane
// and its swatch in the menu always match, regardless of what's selected).
const fileNames = Object.keys(csvFiles).sort();
const fileData = new Map<string, Float64Array[]>();
const fileColor = new Map<string, THREE.Color>();
for (let i = 0; i < fileNames.length; i++) {
  const name = fileNames[i];
  fileData.set(name, parseCsv(csvFiles[name]));
  const col = new THREE.Color();
  col.setHSL(fileNames.length > 1 ? i / fileNames.length : 0.58, 0.55, 0.62);
  fileColor.set(name, col);
}

const selected = new Set<string>(fileNames); // all shown by default

// ---------------- scene ----------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 0.1, 2000,
);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const key = new THREE.DirectionalLight(0xffffff, 0.85);
key.position.set(20, 30, 20);
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.3);
fill.position.set(-20, -10, -20);
scene.add(fill);

// ---------------- rebuildable layout ----------------
// Each selected file is one horizontal plane; planes stack along +Y, compacted
// so a subset stays together. Within a plane, tori sit in a centered grid.
let liveViews: TorusView[] = [];

function gridDims(n: number): { cols: number; rows: number } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  return { cols, rows: Math.ceil(n / cols) };
}

function rebuild(): void {
  for (const v of liveViews) { scene.remove(v); v.dispose(); }
  liveViews = [];

  const shown = fileNames.filter((n) => selected.has(n));
  const faceScalars = new Array(FACE_COUNT).fill(0);

  shown.forEach((name, layer) => {
    const tori = fileData.get(name)!;
    const col = fileColor.get(name)!;
    const solid = { color: () => col.clone() };
    const { cols, rows } = gridDims(tori.length);
    const y = layer * LAYER_GAP;
    for (let i = 0; i < tori.length; i++) {
      const view = new TorusView({ vertexRadius: 0.04 });
      view.sync(new PaperTorus(tori[i]));
      view.setFaceScalars(faceScalars, solid);
      const c = i % cols;
      const r = Math.floor(i / cols);
      view.position.set(
        (c - (cols - 1) / 2) * SPACING,
        y,
        (r - (rows - 1) / 2) * SPACING,
      );
      scene.add(view);
      liveViews.push(view);
    }
  });

  // Aim controls at the center of what's shown (don't yank the camera mid-orbit).
  const midY = shown.length > 0 ? ((shown.length - 1) * LAYER_GAP) / 2 : 0;
  controls.target.set(0, midY, 0);
}

// Initial camera framing based on all files (stable starting view).
function frameAll(): void {
  let maxCols = 1;
  for (const tori of fileData.values()) maxCols = Math.max(maxCols, gridDims(tori.length).cols);
  const planar = maxCols * SPACING;
  const stack = Math.max(1, fileNames.length) * LAYER_GAP;
  const midY = (Math.max(1, fileNames.length) - 1) * LAYER_GAP / 2;
  const span = Math.max(planar, stack);
  camera.position.set(planar * 0.9, midY + span * 0.7, planar * 1.3 + span * 0.6);
}

frameAll();
rebuild();

function animate(): void {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// ---------------- file selector dropdown ----------------
const ui = document.createElement('div');
ui.style.cssText = [
  'position:fixed', 'top:12px', 'left:12px', 'z-index:10',
  'background:rgba(20,20,24,0.85)', 'color:#e8e8ec',
  'font:12px/1.4 -apple-system,system-ui,sans-serif',
  'border:1px solid #333', 'border-radius:8px', 'overflow:hidden',
  'min-width:220px',
].join(';');

const header = document.createElement('button');
header.style.cssText = [
  'width:100%', 'text-align:left', 'cursor:pointer',
  'background:transparent', 'color:#e8e8ec', 'border:none',
  'padding:8px 12px', 'font:inherit',
].join(';');

const list = document.createElement('div');
list.style.cssText = ['display:none', 'border-top:1px solid #333', 'padding:6px 0'].join(';');

function updateHeader(): void {
  const arrow = list.style.display === 'none' ? '▸' : '▾';
  header.textContent = `${arrow}  Files (${selected.size}/${fileNames.length} shown)`;
}

header.addEventListener('click', () => {
  list.style.display = list.style.display === 'none' ? 'block' : 'none';
  updateHeader();
});

// Bulk all / none controls.
const bulk = document.createElement('div');
bulk.style.cssText = 'padding:2px 12px 6px;display:flex;gap:10px;color:#8c8c95';
for (const [label, fn] of [
  ['all', () => fileNames.forEach((n) => selected.add(n))],
  ['none', () => selected.clear()],
] as const) {
  const a = document.createElement('a');
  a.textContent = label;
  a.style.cssText = 'cursor:pointer;text-decoration:underline';
  a.addEventListener('click', () => {
    fn();
    syncCheckboxes();
    updateHeader();
    rebuild();
  });
  bulk.appendChild(a);
}
list.appendChild(bulk);

const checkboxes = new Map<string, HTMLInputElement>();
for (const name of fileNames) {
  const row = document.createElement('label');
  row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:3px 12px;cursor:pointer';

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = true;
  cb.addEventListener('change', () => {
    if (cb.checked) selected.add(name); else selected.delete(name);
    updateHeader();
    rebuild();
  });
  checkboxes.set(name, cb);

  const swatch = document.createElement('span');
  const col = fileColor.get(name)!;
  swatch.style.cssText = `width:11px;height:11px;border-radius:2px;flex:none;background:#${col.getHexString()}`;

  const text = document.createElement('span');
  text.textContent = `${basename(name)}  (${fileData.get(name)!.length})`;

  row.append(cb, swatch, text);
  list.appendChild(row);
}

function syncCheckboxes(): void {
  for (const [name, cb] of checkboxes) cb.checked = selected.has(name);
}

ui.append(header, list);
document.body.appendChild(ui);
updateHeader();
