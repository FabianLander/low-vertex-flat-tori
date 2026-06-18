/**
 * square-torus-slice — investigate the cross-sections of the flat SQUARE torus
 * (the embedded type-3 realization of modulus i, from march-to-i).
 *
 * The camera is FIXED. A translucent torus sits in a world-fixed horizontal plane
 * through the origin (z = 0, parallel to xy). You:
 *   • DRAG to rotate the torus,
 *   • use the SLIDER to slide the torus along z (the plane stays put),
 * and the polygon where the plane cuts the torus is traced live (plane ∩ each
 * triangle). A mini 2-D panel (bottom-right) shows only that polygon, with its own
 * pan (drag) and zoom (scroll).
 *
 * Coordinates: TorusMesh recenters geometry on the bounding-box center, so we work
 * in that same frame (cpos = raw − bboxCenter). The torus's pivot is at the origin;
 * its rotation/z-offset are applied to cpos when computing the section.
 *
 * The torus is in ./square-torus.csv (24 positions + certificate columns).
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { byId } from '../../src/triangulations';
import { paperFromRow } from '../../src/configuration/csv';
import { makeTorusView } from '../../src/viewer/TorusView';
import { paperMaterials } from '../../src/viewer/materials';
import { slicePlane } from '../../src/viewer/slicePlane';
import { skyEnvironment } from '../../src/render/stage';
import { modulus } from '../../src/moduli/modulus';
import { reduceModulus } from '../../src/moduli/reduce';

// ---------------------------------------------------------------------------
// Load the square torus (type 3); work in the bbox-centered render frame.
// ---------------------------------------------------------------------------
// Torus to investigate: from ?type=&pos= (handed over by the imaginary-moduli
// scatter), else the bundled square torus.
const params = new URLSearchParams(location.search);
const csv = import.meta.glob('./square-torus.csv', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
let typeNum = 3;
let raw: Float64Array;
{
  const tp = params.get('type'), pp = params.get('pos');
  const nums = tp && pp ? pp.split(',').map(Number) : null;
  if (nums && nums.length >= 24 && nums.every(Number.isFinite)) {
    typeNum = Number(tp);
    raw = Float64Array.from(nums.slice(0, 24));
  } else {
    raw = Float64Array.from(Object.values(csv)[0].trim().split('\n')[0].split(',').slice(0, 24), Number);
  }
}
const torusDef = byId(typeNum);
const tauHat = reduceModulus(modulus(torusDef, raw).tau);

let xlo = Infinity, xhi = -Infinity, ylo = Infinity, yhi = -Infinity, zlo = Infinity, zhi = -Infinity;
for (let v = 0; v < 8; v++) {
  const x = raw[3 * v], y = raw[3 * v + 1], z = raw[3 * v + 2];
  xlo = Math.min(xlo, x); xhi = Math.max(xhi, x); ylo = Math.min(ylo, y); yhi = Math.max(yhi, y); zlo = Math.min(zlo, z); zhi = Math.max(zhi, z);
}
const bc = [(xlo + xhi) / 2, (ylo + yhi) / 2, (zlo + zhi) / 2];
const cpos = Float64Array.from(raw);
for (let v = 0; v < 8; v++) { cpos[3 * v] -= bc[0]; cpos[3 * v + 1] -= bc[1]; cpos[3 * v + 2] -= bc[2]; }
let maxR = 0;
for (let v = 0; v < 8; v++) maxR = Math.max(maxR, Math.hypot(cpos[3 * v], cpos[3 * v + 1], cpos[3 * v + 2]));

const paper = paperFromRow(torusDef, raw);   // TorusMesh recenters by bboxCenter(raw)=bc → mesh = cpos

// ---------------------------------------------------------------------------
// Fixed 3-D view
// ---------------------------------------------------------------------------
document.body.style.cssText = 'margin:0;overflow:hidden;background:#eef1f5;font:13px ui-monospace,monospace';
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.cssText = 'display:block;touch-action:none;cursor:grab';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
skyEnvironment(scene, { intensity: 0.8, background: 0xeef1f5 });
scene.add(new THREE.AmbientLight(0xffffff, 0.3));
const key = new THREE.DirectionalLight(0xffffff, 2.0);
key.position.set(-0.5, 0.9, 0.8);
scene.add(key);

const cam = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, maxR * 0.02, maxR * 40);

// translucent torus; its own group is the pivot (rotate + z-slide)
const { surface: face } = paperMaterials({ paperColor: '#dcbf6f', gridColor: '#2435AF', gridMinorColor: '#4e5988' });
face.transparent = true; face.opacity = 0.4;
const view = makeTorusView(torusDef, { surface: { material: face } });
view.draw(paper.positions);
const pivot = view.group;
scene.add(pivot);

// frame the FIXED camera on the torus's actual bounds (a slightly-elevated 3/4 view)
pivot.updateMatrixWorld(true);
const tbox = new THREE.Box3().setFromObject(pivot);
const tcenter = tbox.getCenter(new THREE.Vector3());
const trad = tbox.getBoundingSphere(new THREE.Sphere()).radius || maxR;
const cdist = (trad / Math.sin((cam.fov * Math.PI / 180) / 2)) * 1.6;
cam.position.set(tcenter.x + cdist * 0.5, tcenter.y + cdist * 0.72, tcenter.z + cdist * 0.55);
cam.near = trad * 0.02; cam.far = trad * 40; cam.updateProjectionMatrix();
cam.lookAt(tcenter);

// orbit the WHOLE scene (camera) — gated below so it only fires off the torus
const controls = new OrbitControls(cam, renderer.domElement);
controls.enableDamping = true;
controls.target.copy(tcenter);
controls.update();

// world-fixed slice plane at z = 0 + the live section, via the slicePlane decoration.
const planeZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const slicer = slicePlane(torusDef, { planeSize: maxR * 2.4, curveColor: 0x166534 });
scene.add(slicer.group);

// Section: the fixed plane z = 0 ∩ the torus. The torus's world positions are its
// centered coords rotated by the pivot and z-shifted by pivot.position.z; the slicer
// measures plane ∩ those.
const V = torusDef.vertexCount;
const worldPos = new Float64Array(V * 3);
const tmp = new THREE.Vector3();
function updateSlice(): void {
  const q = pivot.quaternion;
  const pz = pivot.position.z;
  for (let v = 0; v < V; v++) {
    tmp.set(cpos[3 * v], cpos[3 * v + 1], cpos[3 * v + 2]).applyQuaternion(q);
    worldPos[3 * v] = tmp.x; worldPos[3 * v + 1] = tmp.y; worldPos[3 * v + 2] = tmp.z + pz;
  }
  slicer.draw(worldPos, planeZ0);
}

// ---------------------------------------------------------------------------
// DRAG on the torus → spin the torus; DRAG outside it → orbit the whole scene.
// ---------------------------------------------------------------------------
{
  const cv = renderer.domElement;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const Y = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0);
  let spinning = false, lx = 0, ly = 0;
  const onTorus = (e: PointerEvent): boolean => {
    const r = cv.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    return ray.intersectObject(pivot, true).length > 0;
  };
  cv.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !onTorus(e)) return;     // miss → fall through to OrbitControls (scene orbit)
    spinning = true;
    controls.enableRotate = false;                 // suppress scene orbit while spinning the torus
    lx = e.clientX; ly = e.clientY; cv.style.cursor = 'grabbing';
  }, { capture: true });
  cv.addEventListener('pointermove', (e) => {
    if (!spinning) { cv.style.cursor = onTorus(e) ? 'grab' : 'default'; return; }
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    pivot.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(Y, dx * 0.01));
    pivot.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(X, dy * 0.01));
  });
  const end = (): void => { if (spinning) { spinning = false; controls.enableRotate = true; cv.style.cursor = 'grab'; } };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
}

// ---------------------------------------------------------------------------
// Slider (slide the torus along z) + readout
// ---------------------------------------------------------------------------
const ui = document.createElement('div');
ui.style.cssText = 'position:fixed;left:14px;top:14px;background:rgba(255,255,255,0.94);padding:10px 12px;border-radius:8px;'
  + 'box-shadow:0 2px 10px rgba(0,0,0,0.12);user-select:none;color:#101014;min-width:230px';
ui.innerHTML =
  `<b>type ${typeNum} torus · τ̂ = ${tauHat[0].toFixed(3)} ${tauHat[1] >= 0 ? '+' : '−'} ${Math.abs(tauHat[1]).toFixed(3)} i</b>`
  + `<br><span style="opacity:.6">drag torus to spin · drag outside to orbit · scroll zoom</span>`
  + `<div style="margin-top:8px">slide torus · z = <span id="zv">0.000</span><br>`
  + `<input id="z" type="range" min="${-maxR}" max="${maxR}" step="${maxR / 300}" value="0" style="width:100%"></div>`;
document.body.appendChild(ui);
const zEl = ui.querySelector<HTMLInputElement>('#z')!;
const zv = ui.querySelector<HTMLSpanElement>('#zv')!;
zEl.addEventListener('input', () => { pivot.position.z = parseFloat(zEl.value); zv.textContent = pivot.position.z.toFixed(3); });

// ---------------------------------------------------------------------------
// Mini 2-D view: only the section polygon, with pan (drag) + zoom (scroll)
// ---------------------------------------------------------------------------
const wrap = document.createElement('div');
// Initial size: capped at 440 on desktop, but shrink to fit small / mobile screens
// (half the smaller viewport dimension, floored at 180 so it stays usable).
const panelSide = Math.max(180, Math.min(440, Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.5)));
wrap.style.cssText = `position:fixed;right:14px;bottom:14px;width:${panelSide}px;height:${panelSide}px;background:#fff;`
  + 'border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.14);overflow:hidden';
const panel = document.createElement('canvas');
panel.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:move';
wrap.appendChild(panel);
// drag this top-left handle to resize the panel (it grows up/left into the screen)
const handle = document.createElement('div');
handle.style.cssText = 'position:absolute;left:0;top:0;width:18px;height:18px;cursor:nwse-resize;'
  + 'background:linear-gradient(135deg,#c4c4c4 0 42%,transparent 42%);border-top-left-radius:8px;touch-action:none';
wrap.appendChild(handle);
document.body.appendChild(wrap);

const p2d = panel.getContext('2d')!;
let pw = 440, ph = 440;
function size2d(): void {
  const dpr = window.devicePixelRatio || 1;
  pw = panel.clientWidth; ph = panel.clientHeight;
  panel.width = Math.round(pw * dpr); panel.height = Math.round(ph * dpr);
  p2d.setTransform(dpr, 0, 0, dpr, 0, 0);
}
size2d();
{
  let rz = false, sw = 0, sh = 0, sx = 0, sy = 0;
  handle.addEventListener('pointerdown', (e) => {
    rz = true; sw = wrap.clientWidth; sh = wrap.clientHeight; sx = e.clientX; sy = e.clientY;
    handle.setPointerCapture(e.pointerId); e.stopPropagation();
  });
  handle.addEventListener('pointermove', (e) => {
    if (!rz) return;
    wrap.style.width = Math.max(200, Math.min(window.innerWidth - 28, sw - (e.clientX - sx))) + 'px';
    wrap.style.height = Math.max(200, Math.min(window.innerHeight - 28, sh - (e.clientY - sy))) + 'px';
    size2d();
  });
  const stop = (e: PointerEvent): void => { rz = false; try { handle.releasePointerCapture(e.pointerId); } catch { /* */ } };
  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
}
// 2-D camera: world (x,y at z=0) → panel px.  cx = pw/2 + panX + wx*pxPerUnit, cy = ph/2 + panY − wy*pxPerUnit
let pxPerUnit = (Math.min(pw, ph) * 0.42) / (maxR || 1);
let panX = 0, panY = 0;

function draw2d(): void {
  p2d.clearRect(0, 0, pw, ph);
  // crosshair at the origin
  p2d.strokeStyle = 'rgba(0,0,0,0.12)'; p2d.lineWidth = 1;
  const ox = pw / 2 + panX, oy = ph / 2 + panY;
  p2d.beginPath(); p2d.moveTo(0, oy); p2d.lineTo(pw, oy); p2d.moveTo(ox, 0); p2d.lineTo(ox, ph); p2d.stroke();
  // the polygon
  p2d.strokeStyle = '#166534'; p2d.lineWidth = 2; p2d.lineCap = 'round';
  p2d.beginPath();
  for (const loop of slicer.loops()) {
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i + 1) % loop.length];
      p2d.moveTo(ox + a.x * pxPerUnit, oy - a.y * pxPerUnit);
      p2d.lineTo(ox + b.x * pxPerUnit, oy - b.y * pxPerUnit);
    }
  }
  p2d.stroke();
  p2d.fillStyle = 'rgba(20,20,20,0.5)'; p2d.font = '11px ui-monospace,monospace';
  p2d.fillText('section (z = 0) · drag pan · scroll zoom', 8, ph - 8);
}

{
  let dragging = false, lx = 0, ly = 0;
  panel.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; panel.setPointerCapture(e.pointerId); });
  panel.addEventListener('pointermove', (e) => { if (!dragging) return; panX += e.clientX - lx; panY += e.clientY - ly; lx = e.clientX; ly = e.clientY; });
  const end = (e: PointerEvent): void => { dragging = false; try { panel.releasePointerCapture(e.pointerId); } catch { /* */ } };
  panel.addEventListener('pointerup', end);
  panel.addEventListener('pointercancel', end);
  panel.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = panel.getBoundingClientRect();
    const mx = e.clientX - r.left - (pw / 2 + panX), my = e.clientY - r.top - (ph / 2 + panY);  // cursor in world-px
    const f = Math.exp(-e.deltaY * 0.0015);
    pxPerUnit *= f; panX -= mx * (f - 1); panY -= my * (f - 1);   // zoom toward the cursor
  }, { passive: false });
}

// ---------------------------------------------------------------------------
// Loop + resize
// ---------------------------------------------------------------------------
function onResize(): void {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
  size2d();
}
addEventListener('resize', onResize);
onResize();                          // apply once now …
requestAnimationFrame(onResize);     // … and again after the first layout pass
(function tick(): void {
  requestAnimationFrame(tick);
  controls.update();
  updateSlice();
  renderer.render(scene, cam);
  draw2d();
})();
