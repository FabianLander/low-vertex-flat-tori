import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { PaperTorus } from '../../src/math/embedding';
import { TorusView } from '../../src/viewer/TorusView';
import { SAMPLE_COUNT, SAMPLE_SIZE, SAMPLES_FLAT } from './data';

// 100 samples — 10×10 grid.
const GRID = 10;
const SPACING = 3.5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 0.1, 500,
);
const center = ((GRID - 1) * SPACING) / 2;
camera.position.set(center, GRID * SPACING * 0.9, GRID * SPACING * 1.1);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(center, 0, center);
controls.enableDamping = true;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const key = new THREE.DirectionalLight(0xffffff, 0.85);
key.position.set(20, 30, 20);
scene.add(key);

const views: TorusView[] = [];
const buf = new Float64Array(SAMPLE_SIZE);
for (let i = 0; i < SAMPLE_COUNT; i++) {
  for (let k = 0; k < SAMPLE_SIZE; k++) buf[k] = SAMPLES_FLAT[i * SAMPLE_SIZE + k];
  const t = new PaperTorus(buf);
  const view = new TorusView({ vertexRadius: 0.04 });
  view.sync(t);
  const r = Math.floor(i / GRID);
  const c = i % GRID;
  view.position.set(c * SPACING, 0, r * SPACING);
  scene.add(view);
  views.push(view);
}

function animate(): void {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

const panel = document.createElement('div');
panel.style.cssText = [
  'position:fixed', 'top:12px', 'left:12px', 'z-index:10',
  'background:rgba(20,20,24,0.78)', 'color:#e8e8ec',
  'font:12px/1.5 -apple-system,system-ui,sans-serif',
  'padding:8px 12px', 'border-radius:8px',
  'border:1px solid #333',
].join(';');
panel.innerHTML = `grid: ${SAMPLE_COUNT} flat embedded tori<br>`
  + '<span style="color:#8c8c95">perturb Rich → Newton-flatten → repulsion flow; all are flat &amp; embedded</span>';
document.body.appendChild(panel);
