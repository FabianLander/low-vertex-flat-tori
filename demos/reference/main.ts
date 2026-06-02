import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { RICH } from '../../src/tori';
import { RICH_REFERENCE } from '../../src/math/reference';
import { TorusView } from '../../src/viewer/TorusView';
import { DEFICIT_PALETTE, HIGHLIGHT_PALETTE, oneHot } from '../../src/viewer/palette';

const TWO_PI = Math.PI * 2;

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
const fill = new THREE.DirectionalLight(0xc0d0ff, 0.25);
fill.position.set(-2, -1, -3);
scene.add(fill);

// ---- Torus + view ----
const torus = RICH_REFERENCE;
const view = new TorusView(RICH, { vertexRadius: 0.05 });
view.sync(torus);

const absDeficits = new Float32Array(RICH.vertexCount);
for (let i = 0; i < RICH.vertexCount; i++) {
  absDeficits[i] = Math.abs(torus.coneAngleDeficit(i));
}
view.setVertexScalars(absDeficits, DEFICIT_PALETTE);

scene.add(view);

function animate(): void {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// ---- Cone-angle panel ----
const panel = document.createElement('div');
panel.style.cssText = [
  'position:fixed', 'top:12px', 'left:12px', 'z-index:10',
  'background:rgba(20,20,24,0.78)', 'color:#e8e8ec',
  'font:13px/1.6 -apple-system,system-ui,sans-serif',
  'padding:10px 14px', 'border-radius:8px',
  'border:1px solid #333', 'min-width:280px',
  'backdrop-filter:blur(6px)',
].join(';');

const title = document.createElement('div');
title.style.cssText = 'font-size:12px;margin-bottom:6px;color:#c8c8d0';
title.textContent = "Rich Schwartz's 8-vertex flat torus";
panel.appendChild(title);

const subtitle = document.createElement('div');
subtitle.style.cssText = 'font-size:11px;color:#8c8c95;margin-bottom:8px';
subtitle.textContent = 'cone angle at each vertex (should be 2π)';
panel.appendChild(subtitle);

const list = document.createElement('div');
list.style.cssText = 'font:12px ui-monospace, SFMono-Regular, monospace';
panel.appendChild(list);

const TOL = 1e-3;
let maxAbs = 0;
for (let i = 0; i < RICH.vertexCount; i++) {
  const a = torus.coneAngle(i);
  const d = TWO_PI - a;
  if (Math.abs(d) > maxAbs) maxAbs = Math.abs(d);

  const row = document.createElement('div');
  row.style.cssText = [
    'display:flex', 'justify-content:space-between', 'gap:14px',
    'padding:1px 0', 'cursor:default',
  ].join(';');
  row.dataset.vertex = String(i);

  const label = document.createElement('span');
  label.textContent = `v${i}`;
  label.style.cssText = 'color:#8c8c95';

  const angle = document.createElement('span');
  angle.textContent = a.toFixed(10);
  angle.style.color = Math.abs(d) < TOL ? '#4ade80' : '#ef4444';

  const deficit = document.createElement('span');
  deficit.textContent = d.toExponential(2);
  deficit.style.cssText = 'color:#8c8c95;min-width:90px;text-align:right';

  row.append(label, angle, deficit);

  row.addEventListener('mouseenter', () => {
    view.setVertexScalars(oneHot(RICH.vertexCount, i), HIGHLIGHT_PALETTE);
  });
  row.addEventListener('mouseleave', () => {
    view.setVertexScalars(absDeficits, DEFICIT_PALETTE);
  });

  list.appendChild(row);
}

const summary = document.createElement('div');
summary.style.cssText = 'margin-top:8px;font:12px ui-monospace, monospace;color:#c8c8d0';
summary.textContent = `max |deficit| = ${maxAbs.toExponential(2)}`;
panel.appendChild(summary);

const note = document.createElement('div');
note.style.cssText = 'margin-top:6px;font-size:11px;color:#8c8c95';
note.textContent = 'hover a row to highlight that vertex';
panel.appendChild(note);

document.body.appendChild(panel);
