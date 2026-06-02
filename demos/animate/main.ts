import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { RICH } from '../../src/tori';
import { PaperTorus } from '../../src/math/embedding';
import { RICH_REFERENCE } from '../../src/math/reference';
import { perturb, mulberry32 } from '../../src/math/perturb';
import { TorusView } from '../../src/viewer/TorusView';
import { DEFICIT_PALETTE } from '../../src/viewer/palette';

// ---- Three.js boilerplate ----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(
  50, window.innerWidth / window.innerHeight, 0.01, 100,
);
camera.position.set(2.5, 2.0, 3.0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const key = new THREE.DirectionalLight(0xffffff, 0.85);
key.position.set(3, 4, 5);
scene.add(key);

// ---- State ----
const rng = mulberry32(42);
const current = RICH_REFERENCE.clone();
let target = pickTarget();
const startPositions = current.positions.slice();
let phase = 0;
const lerpDuration = 1.4; // seconds per leg
const dwell = 0.4;        // seconds at each end before next leg

function pickTarget(): PaperTorus {
  return perturb(RICH_REFERENCE, 0.06, rng);
}

function lerpEmbedding(t: number): void {
  const u = smoothstep(t);
  for (let i = 0; i < current.positions.length; i++) {
    current.positions[i] =
      startPositions[i] * (1 - u) + target.positions[i] * u;
  }
}

function smoothstep(x: number): number {
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
}

const view = new TorusView(RICH, { vertexRadius: 0.05 });
scene.add(view);

const deficitBuf = new Float32Array(RICH.vertexCount);
function refreshColors(): void {
  for (let i = 0; i < RICH.vertexCount; i++) {
    deficitBuf[i] = Math.abs(current.coneAngleDeficit(i));
  }
  view.setVertexScalars(deficitBuf, DEFICIT_PALETTE);
}

// ---- Loop ----
const clock = new THREE.Clock();
function animate(): void {
  const dt = clock.getDelta();
  phase += dt;
  const period = lerpDuration + dwell;
  if (phase >= period) {
    // Snap to target, then pick a new one and use this target as the new start.
    startPositions.set(target.positions);
    target = pickTarget();
    phase -= period;
  }
  const tParam = Math.min(phase / lerpDuration, 1);
  lerpEmbedding(tParam);

  view.sync(current);
  refreshColors();

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// ---- Minimal status panel ----
const panel = document.createElement('div');
panel.style.cssText = [
  'position:fixed', 'top:12px', 'left:12px', 'z-index:10',
  'background:rgba(20,20,24,0.78)', 'color:#e8e8ec',
  'font:12px/1.5 -apple-system,system-ui,sans-serif',
  'padding:8px 12px', 'border-radius:8px',
  'border:1px solid #333',
].join(';');
panel.innerHTML = 'animate: drifting through random perturbations of Rich’s solution<br>'
  + '<span style="color:#8c8c95">vertices flash red when flatness breaks</span>';
document.body.appendChild(panel);
