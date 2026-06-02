import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { RICH } from '../../src/tori';
import { PaperTorus } from '../../src/math/embedding';
import { RICH_REFERENCE } from '../../src/math/reference';
import { perturb, mulberry32 } from '../../src/math/perturb';
import { TorusView } from '../../src/viewer/TorusView';
import { DEFICIT_PALETTE } from '../../src/viewer/palette';

const GRID = 5;
const N = GRID * GRID;
const SPACING = 3.5;

// Three.js boilerplate
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 0.1, 200,
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
key.position.set(5, 10, 7);
scene.add(key);

/**
 * Render an array of embeddings as a grid of TorusViews.
 * This is the hook the eventual "load solutions from a file" pipeline plugs into.
 */
function renderGrid(embeddings: readonly PaperTorus[]): TorusView[] {
  const views: TorusView[] = [];
  const deficits = new Float32Array(RICH.vertexCount);
  for (let i = 0; i < embeddings.length; i++) {
    const t = embeddings[i];
    const view = new TorusView(RICH, { vertexRadius: 0.05 });
    view.sync(t);
    for (let v = 0; v < RICH.vertexCount; v++) {
      deficits[v] = Math.abs(t.coneAngleDeficit(v));
    }
    view.setVertexScalars(deficits, DEFICIT_PALETTE);
    const r = Math.floor(i / GRID);
    const c = i % GRID;
    view.position.set(c * SPACING, 0, r * SPACING);
    scene.add(view);
    views.push(view);
  }
  return views;
}

// Today: 25 random perturbations of Rich's solution.
// Tomorrow: replace this list with the contents of a solutions file.
const rng = mulberry32(1);
const embeddings: PaperTorus[] = [];
for (let i = 0; i < N; i++) {
  embeddings.push(perturb(RICH_REFERENCE, 0.08, rng));
}
renderGrid(embeddings);

function animate(): void {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// Tiny status panel
const panel = document.createElement('div');
panel.style.cssText = [
  'position:fixed', 'top:12px', 'left:12px', 'z-index:10',
  'background:rgba(20,20,24,0.78)', 'color:#e8e8ec',
  'font:12px/1.5 -apple-system,system-ui,sans-serif',
  'padding:8px 12px', 'border-radius:8px',
  'border:1px solid #333',
].join(';');
panel.innerHTML = `grid: ${GRID}×${GRID} = ${N} embeddings<br>`
  + '<span style="color:#8c8c95">today: random perturbations of Rich’s solution</span>';
document.body.appendChild(panel);
