/**
 * "Investigate further" view — examine ANY flat 8-vertex torus in detail.
 * Opened from the moduli-space scatter via ?type=&pos= (the clicked torus), and
 * defaults to a bundled sample (the embedded square torus, type 3, modulus i)
 * when launched directly. Nothing here is specific to the square torus: the type,
 * triangulation, generators, and section are all derived from the passed embedding.
 *
 * The camera is FIXED. A translucent torus sits in a world-fixed horizontal plane
 * through the origin (z = 0, parallel to xy). You:
 *   • DRAG to rotate the torus,
 *   • use the SLIDER to slide the torus along z (the plane stays put),
 * and the polygon where the plane cuts the torus is traced live (plane ∩ each
 * triangle). Two mini 2-D panels:
 *   • bottom-right — the live section polygon (pan/zoom);
 *   • bottom-left  — the developed net tiled across the universal cover, with the
 *     two generator loops (α blue, β red) and their straight holonomy vectors.
 *
 * Coordinates: TorusMesh recenters geometry on the bounding-box center, so we work
 * in that same frame (cpos = raw − bboxCenter). The torus's pivot is at the origin;
 * its rotation/z-offset are applied to cpos when computing the section.
 *
 * The default sample is in ./square-torus.csv (24 positions + certificate columns).
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { byId } from '@core/triangulations';
import { paperFromRow } from '@core/configuration/csv';
import { makeTorusView } from '@display/viewer/TorusView';
import { paperMaterials } from '@display/viewer/materials';
import { skyEnvironment } from '@app/render/stage';
import { modulus } from '@core/moduli/modulus';
import { developNet, developLoop } from '@core/moduli/develop';
import { edgeKey } from '@core/topology/triangulation';
import { certify } from '@core/search/certify';
import type { Vec2 } from '@core/geometry/vec2';

// ---------------------------------------------------------------------------
// Load the square torus (type 3); work in the bbox-centered render frame.
// ---------------------------------------------------------------------------
// Torus to investigate: from ?type=&pos= (handed over by the torus-moduli
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
// Full certificate for the stats panel: embeddedness, the reduced + raw modulus,
// and the flatness/clearance residuals (cone deficit, rotation defect, margin).
const cert = certify(torusDef, raw);
const tauRaw = modulus(torusDef, raw).tau;       // unreduced τ = v₂/v₁ (matches the cover panel)
const tauHat = cert.tauHat;                       // reduced into the fundamental domain

// --- developing-net data for the universal-cover panel ---
// Develop the flat torus into the plane and read off the two generator loops as
// lifted edge-paths; their net displacements are the lattice generators v₁, v₂.
const net = developNet(torusDef, raw);
const genLoops = torusDef.marking.generatorLoops;
// Re-root both loops at a shared vertex so the straight generators share a
// basepoint. (For type 3 the loops are 6→2→1→6 and 4→2→1→4, sharing 2 and 1.)
function rerootLoop(loop: readonly number[], base: number): number[] {
  const cyc = loop.slice(0, -1);                       // drop the repeated closing vertex
  const i = cyc.indexOf(base);
  if (i < 0) return loop.slice();                      // base not on this loop → leave as is
  return cyc.slice(i).concat(cyc.slice(0, i), [base]);
}
const sharedBase = genLoops[0].slice(0, -1).find((v) => genLoops[1].includes(v)) ?? genLoops[0][0];
const loopA = rerootLoop(genLoops[0], sharedBase);
const loopB = rerootLoop(genLoops[1], sharedBase);
// Anchor at the basepoint's true position in the net, so loopA overlays the net.
const tBase = torusDef.edgeToTris.get(edgeKey(loopA[0], loopA[1]))![0];
const baseCorner = net.corners[tBase][torusDef.triangles[tBase].indexOf(loopA[0])];
const O: Vec2 = [baseCorner[0], baseCorner[1]];
const pathA = developLoop(torusDef, net, loopA, O);    // blue: O → O + v₁
const pathB = developLoop(torusDef, net, loopB, O);    // red:  O → O + v₂
const gv1: Vec2 = [pathA[pathA.length - 1][0] - O[0], pathA[pathA.length - 1][1] - O[1]];
const gv2: Vec2 = [pathB[pathB.length - 1][0] - O[0], pathB[pathB.length - 1][1] - O[1]];
const gUnit = Math.hypot(gv1[0], gv1[1]) || 1;         // ≈ |v₁|, the cell size

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

// ---------------------------------------------------------------------------
// Generator loops on the folded torus (toggle, off by default). Each loop is a
// vertex cycle; we draw it as a tube polyline through the centered vertex
// positions (same `cpos` frame as the mesh), added to the pivot so it spins
// with the torus. α blue, β red — matching the universal-cover panel.
// ---------------------------------------------------------------------------
function tubeLoop(loop: readonly number[], color: number, radius: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0 });
  const Y = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k + 1 < loop.length; k++) {
    const a = loop[k], b = loop[k + 1];
    const pa = new THREE.Vector3(cpos[3 * a], cpos[3 * a + 1], cpos[3 * a + 2]);
    const pb = new THREE.Vector3(cpos[3 * b], cpos[3 * b + 1], cpos[3 * b + 2]);
    const dir = new THREE.Vector3().subVectors(pb, pa);
    const len = dir.length() || 1e-9;
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 12), mat);
    cyl.position.copy(pa).addScaledVector(dir, 0.5);
    cyl.quaternion.setFromUnitVectors(Y, dir.clone().normalize());
    g.add(cyl);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), mat).translateX(pa.x).translateY(pa.y).translateZ(pa.z));
  }
  return g;
}
const loopsA = tubeLoop(loopA, 0x1d4ed8, maxR * 0.013);   // α blue
const loopsB = tubeLoop(loopB, 0xdc2626, maxR * 0.013);   // β red
loopsA.visible = false; loopsB.visible = false;
pivot.add(loopsA, loopsB);

// world-fixed slice plane at z = 0
const planeSize = maxR * 2.4;
const plane = new THREE.Mesh(
  new THREE.PlaneGeometry(planeSize, planeSize),
  new THREE.MeshStandardMaterial({ color: 0x4488ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
);
scene.add(plane);

// the section polygon in 3-D
// transparent so it renders in the transparent pass (after the translucent plane
// + torus), with high renderOrder + depthTest off → the section always draws on top.
const sliceMat = new THREE.LineBasicMaterial({ color: 0x166534, depthTest: false, transparent: true });
const sliceGeo = new THREE.BufferGeometry();
const sliceBuf = new Float32Array(torusDef.triangles.length * 2 * 3);
sliceGeo.setAttribute('position', new THREE.BufferAttribute(sliceBuf, 3));
const slice = new THREE.LineSegments(sliceGeo, sliceMat);
slice.renderOrder = 10;
slice.frustumCulled = false;
scene.add(slice);

let sliceVerts = 0;                 // number of vertices written to sliceBuf (2 per segment)
const tmp = new THREE.Vector3();

/** Section: the fixed plane z = 0 ∩ the torus (rotated by pivot, z-shifted by pivot.position.z). */
function updateSlice(): void {
  const q = pivot.quaternion;
  const pz = pivot.position.z;
  let n = 0;
  for (const t of torusDef.triangles) {
    const W: number[][] = [];
    for (let k = 0; k < 3; k++) {
      const v = t[k];
      tmp.set(cpos[3 * v], cpos[3 * v + 1], cpos[3 * v + 2]).applyQuaternion(q);
      W.push([tmp.x, tmp.y, tmp.z + pz]);
    }
    const d = [W[0][2], W[1][2], W[2][2]];   // signed distance to z = 0
    const cross: number[][] = [];
    for (let e = 0; e < 3; e++) {
      const i = e, j = (e + 1) % 3;
      if ((d[i] < 0) !== (d[j] < 0)) {
        const s = d[i] / (d[i] - d[j]);
        cross.push([W[i][0] + s * (W[j][0] - W[i][0]), W[i][1] + s * (W[j][1] - W[i][1]), 0]);
      }
    }
    if (cross.length === 2) {
      sliceBuf[n++] = cross[0][0]; sliceBuf[n++] = cross[0][1]; sliceBuf[n++] = cross[0][2];
      sliceBuf[n++] = cross[1][0]; sliceBuf[n++] = cross[1][1]; sliceBuf[n++] = cross[1][2];
    }
  }
  sliceVerts = n / 3;
  sliceGeo.setDrawRange(0, sliceVerts);
  sliceGeo.attributes.position.needsUpdate = true;
  sliceGeo.computeBoundingSphere();
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
// Full numerical precision for the moduli (JS shortest round-trip string — shows
// e.g. 1.0000000000000007, not a rounded 1.000); exponential for the residuals.
const fmtC = (v: Vec2): string => `${v[0]} ${v[1] >= 0 ? '+' : '−'} ${Math.abs(v[1])} i`;
const exp = (x: number): string => x.toExponential(2);
// `embedded` is the topological isEmbedded check; `margin` is the geometric
// clearance — flag "tight" when the surface is embedded but barely (frontier tori).
const tight = cert.embedded && cert.margin < 1e-6;
const badge = cert.embedded
  ? `<span style="color:#15803d;font-weight:700">embedded ✓</span>`
    + (tight ? ` <span style="color:#b45309">(tight)</span>` : '')
  : `<span style="color:#dc2626;font-weight:700">NOT embedded ✗</span>`;
ui.innerHTML =
  `<b>type ${typeNum} torus</b> · ${badge}`
  + `<div style="margin-top:6px;font-size:12px;line-height:1.6;white-space:nowrap">`
  +   `τ̂ = ${fmtC(tauHat)}<br>`
  +   `τ&nbsp;&nbsp;= ${fmtC(tauRaw)}<br>`
  +   `<span style="opacity:.75">margin&nbsp;&nbsp;${exp(cert.margin)}`
  +   `&nbsp;&nbsp;·&nbsp;&nbsp;cone&nbsp;def&nbsp;${exp(cert.coneDeficit)}<br>`
  +   `rot&nbsp;def&nbsp;${exp(cert.rotDefect)}&nbsp;&nbsp;·&nbsp;&nbsp;area&nbsp;${cert.area.toPrecision(8)}</span>`
  + `</div>`
  + `<div style="margin-top:6px;opacity:.6">drag torus to spin · drag outside to orbit · scroll zoom</div>`
  + `<div style="margin-top:8px">slide torus · z = <span id="zv">0.000</span><br>`
  + `<input id="z" type="range" min="${-maxR}" max="${maxR}" step="${maxR / 300}" value="0" style="width:100%"></div>`
  + `<div style="margin-top:8px">show loops:&nbsp;`
  +   `<label style="cursor:pointer;user-select:none;margin-right:8px"><input id="loopA" type="checkbox" style="vertical-align:middle"> <span style="color:#1d4ed8;font-weight:700">α</span></label>`
  +   `<label style="cursor:pointer;user-select:none;margin-right:8px"><input id="loopB" type="checkbox" style="vertical-align:middle"> <span style="color:#dc2626;font-weight:700">β</span></label>`
  +   `<label style="cursor:pointer;user-select:none"><input id="loopBoth" type="checkbox" style="vertical-align:middle"> both</label></div>`;
document.body.appendChild(ui);
const zEl = ui.querySelector<HTMLInputElement>('#z')!;
const zv = ui.querySelector<HTMLSpanElement>('#zv')!;
zEl.addEventListener('input', () => { pivot.position.z = parseFloat(zEl.value); zv.textContent = pivot.position.z.toFixed(3); });
// three toggles: α and β independent, "both" a master that mirrors them.
const aEl = ui.querySelector<HTMLInputElement>('#loopA')!;
const bEl = ui.querySelector<HTMLInputElement>('#loopB')!;
const bothEl = ui.querySelector<HTMLInputElement>('#loopBoth')!;
function syncLoops(): void {
  loopsA.visible = aEl.checked;
  loopsB.visible = bEl.checked;
  bothEl.checked = aEl.checked && bEl.checked;
}
aEl.addEventListener('change', syncLoops);
bEl.addEventListener('change', syncLoops);
bothEl.addEventListener('change', () => { aEl.checked = bEl.checked = bothEl.checked; syncLoops(); });

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
  for (let s = 0; s < sliceVerts; s += 2) {
    const ax = sliceBuf[s * 3], ay = sliceBuf[s * 3 + 1];
    const bx = sliceBuf[(s + 1) * 3], by = sliceBuf[(s + 1) * 3 + 1];
    p2d.moveTo(ox + ax * pxPerUnit, oy - ay * pxPerUnit);
    p2d.lineTo(ox + bx * pxPerUnit, oy - by * pxPerUnit);
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
// Universal-cover panel (bottom-left): the developed net tiled by the lattice
// Λ = ℤv₁ + ℤv₂, the two generator edge-paths (α blue, β red) and their straight
// geodesic representatives from the shared basepoint. For the square torus the
// lattice is square → a square tiling.
// ---------------------------------------------------------------------------
const sideC = Math.max(180, Math.min(440, Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.5)));
const wrapC = document.createElement('div');
wrapC.style.cssText = `position:fixed;left:14px;bottom:14px;width:${sideC}px;height:${sideC}px;background:#fff;`
  + 'border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.14);overflow:hidden';
const panelC = document.createElement('canvas');
panelC.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:move';
wrapC.appendChild(panelC);
// resize handle in the top-RIGHT corner (panel grows right / up into the screen)
const handleC = document.createElement('div');
handleC.style.cssText = 'position:absolute;right:0;top:0;width:18px;height:18px;cursor:nesw-resize;'
  + 'background:linear-gradient(225deg,#c4c4c4 0 42%,transparent 42%);border-top-right-radius:8px;touch-action:none';
wrapC.appendChild(handleC);
document.body.appendChild(wrapC);

const c2d = panelC.getContext('2d')!;
let cw = sideC, ch = sideC;
function sizeC(): void {
  const dpr = window.devicePixelRatio || 1;
  cw = panelC.clientWidth; ch = panelC.clientHeight;
  panelC.width = Math.round(cw * dpr); panelC.height = Math.round(ch * dpr);
  c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
}
sizeC();
{
  let rz = false, sw = 0, sh = 0, sx = 0, sy = 0;
  handleC.addEventListener('pointerdown', (e) => {
    rz = true; sw = wrapC.clientWidth; sh = wrapC.clientHeight; sx = e.clientX; sy = e.clientY;
    handleC.setPointerCapture(e.pointerId); e.stopPropagation();
  });
  handleC.addEventListener('pointermove', (e) => {
    if (!rz) return;
    wrapC.style.width = Math.max(200, Math.min(window.innerWidth - 28, sw + (e.clientX - sx))) + 'px';
    wrapC.style.height = Math.max(200, Math.min(window.innerHeight - 28, sh - (e.clientY - sy))) + 'px';
    sizeC();
  });
  const stop = (e: PointerEvent): void => { rz = false; try { handleC.releasePointerCapture(e.pointerId); } catch { /* */ } };
  handleC.addEventListener('pointerup', stop);
  handleC.addEventListener('pointercancel', stop);
}
// 2-D camera for the cover: center on the unit cell, scale so several cells show.
let ppuC = (Math.min(cw, ch) * 0.26) / gUnit;
let panCX = -(O[0] + (gv1[0] + gv2[0]) / 2) * ppuC;
let panCY = (O[1] + (gv1[1] + gv2[1]) / 2) * ppuC;
const wsx = (x: number): number => cw / 2 + panCX + x * ppuC;
const wsy = (y: number): number => ch / 2 + panCY - y * ppuC;     // screen y is flipped

function drawCover(): void {
  c2d.clearRect(0, 0, cw, ch);
  const reach = Math.ceil((Math.hypot(cw, ch) / ppuC) / gUnit + 2);
  const cellpx = gUnit * ppuC;
  // 1. tiled developed net (faint): every triangle, shifted by a·v₁ + b·v₂,
  //    culled to copies whose cell lands in (or near) the viewport.
  c2d.strokeStyle = 'rgba(0,0,0,0.10)'; c2d.lineWidth = 1;
  c2d.beginPath();
  for (let a = -reach; a <= reach; a++) for (let b = -reach; b <= reach; b++) {
    const tx = a * gv1[0] + b * gv2[0], ty = a * gv1[1] + b * gv2[1];
    const sxp = wsx(O[0] + tx), syp = wsy(O[1] + ty);
    if (sxp < -3 * cellpx || sxp > cw + 3 * cellpx || syp < -3 * cellpx || syp > ch + 3 * cellpx) continue;
    for (const tri of net.corners) for (let e = 0; e < 3; e++) {
      const p = tri[e], q = tri[(e + 1) % 3];
      c2d.moveTo(wsx(p[0] + tx), wsy(p[1] + ty));
      c2d.lineTo(wsx(q[0] + tx), wsy(q[1] + ty));
    }
  }
  c2d.stroke();
  // 2. the square lattice grid through O (the tiling the generators induce)
  c2d.strokeStyle = 'rgba(0,0,0,0.22)'; c2d.lineWidth = 1;
  c2d.beginPath();
  for (let b = -reach; b <= reach; b++) {                 // lines along v₁
    const ax = O[0] + b * gv2[0], ay = O[1] + b * gv2[1];
    c2d.moveTo(wsx(ax - reach * gv1[0]), wsy(ay - reach * gv1[1]));
    c2d.lineTo(wsx(ax + reach * gv1[0]), wsy(ay + reach * gv1[1]));
  }
  for (let a = -reach; a <= reach; a++) {                 // lines along v₂
    const ax = O[0] + a * gv1[0], ay = O[1] + a * gv1[1];
    c2d.moveTo(wsx(ax - reach * gv2[0]), wsy(ay - reach * gv2[1]));
    c2d.lineTo(wsx(ax + reach * gv2[0]), wsy(ay + reach * gv2[1]));
  }
  c2d.stroke();
  // 3. the two lifted generator edge-paths: α blue, β red
  const drawPath = (path: readonly Vec2[], color: string): void => {
    c2d.strokeStyle = color; c2d.lineWidth = 3; c2d.lineJoin = 'round'; c2d.lineCap = 'round';
    c2d.beginPath(); c2d.moveTo(wsx(path[0][0]), wsy(path[0][1]));
    for (let k = 1; k < path.length; k++) c2d.lineTo(wsx(path[k][0]), wsy(path[k][1]));
    c2d.stroke();
  };
  drawPath(pathA, '#1d4ed8');
  drawPath(pathB, '#dc2626');
  // 4. straight geodesic representatives (dashed) + arrowheads, from O
  const drawArrow = (v: Vec2, color: string): void => {
    const ex = O[0] + v[0], ey = O[1] + v[1];
    c2d.strokeStyle = color; c2d.fillStyle = color; c2d.lineWidth = 2;
    c2d.setLineDash([5, 4]);
    c2d.beginPath(); c2d.moveTo(wsx(O[0]), wsy(O[1])); c2d.lineTo(wsx(ex), wsy(ey)); c2d.stroke();
    c2d.setLineDash([]);
    const ang = Math.atan2(-(ey - O[1]), ex - O[0]);     // screen space (y flipped)
    const hx = wsx(ex), hy = wsy(ey), s = 9;
    c2d.beginPath(); c2d.moveTo(hx, hy);
    c2d.lineTo(hx - s * Math.cos(ang - 0.4), hy + s * Math.sin(ang - 0.4));
    c2d.lineTo(hx - s * Math.cos(ang + 0.4), hy + s * Math.sin(ang + 0.4));
    c2d.closePath(); c2d.fill();
  };
  drawArrow(gv1, '#1d4ed8');
  drawArrow(gv2, '#dc2626');
  c2d.fillStyle = '#111'; c2d.beginPath(); c2d.arc(wsx(O[0]), wsy(O[1]), 3, 0, Math.PI * 2); c2d.fill();
  c2d.fillStyle = 'rgba(20,20,20,0.6)'; c2d.font = '11px ui-monospace,monospace';
  c2d.fillText('universal cover · v₁ blue · v₂ red · drag pan · scroll zoom', 8, ch - 8);
}

{
  let dragging = false, lx = 0, ly = 0;
  panelC.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; panelC.setPointerCapture(e.pointerId); });
  panelC.addEventListener('pointermove', (e) => { if (!dragging) return; panCX += e.clientX - lx; panCY += e.clientY - ly; lx = e.clientX; ly = e.clientY; });
  const end = (e: PointerEvent): void => { dragging = false; try { panelC.releasePointerCapture(e.pointerId); } catch { /* */ } };
  panelC.addEventListener('pointerup', end);
  panelC.addEventListener('pointercancel', end);
  panelC.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = panelC.getBoundingClientRect();
    const mx = e.clientX - r.left - (cw / 2 + panCX), my = e.clientY - r.top - (ch / 2 + panCY);
    const f = Math.exp(-e.deltaY * 0.0015);
    ppuC *= f; panCX -= mx * (f - 1); panCY -= my * (f - 1);
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
  sizeC();
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
  drawCover();
})();
