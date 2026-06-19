/**
 * torus-moduli — OUR generated datasets plotted in MODULI space ℍ: flat
 * embedded tori found along the imaginary-axis edge (Re τ̂ = 0, the rectangular
 * tori) by scripts/collect-imaginary.mjs and scripts/march-to-i.mjs. Standalone
 * clone of curated-moduli showing only our data, COLORED BY TRIANGULATION TYPE
 * (type 3 blue, type 7 red) — one file per class in ./data (…-t<N>.csv). The
 * march-to-i-t* classes are the margin→0 frontiers; note type 3 reaches Im ≈ 1.009
 * (near the square torus i) while type 7 stops at ≈ 1.134.
 *
 * Each file is the 28-col format (24 positions, coneDeficit, Re τ̂, Im τ̂, margin);
 * the stored Re τ̂ / Im τ̂ ARE the reduced modulus — points of moduli space — so we
 * plot them directly against the SL(2,ℤ) fundamental domain (walls Re = ±½, arc
 * |τ| = 1). The points sit on the imaginary axis from the pinch (lowest embeddable
 * Im ≈ 1.13) up to Im = 3; the square torus i (Im = 1) is below the pinch.
 *
 * CLICK a point to read its τ, embedding margin, and flatness (max cone deficit);
 * click empty space to dismiss. Scroll to zoom, drag to pan, click a legend row to
 * toggle a file, r resets the view, f fits all.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { byId } from '@core/triangulations';
import { paperFromRow } from '@core/configuration/csv';
import { makeTorusView } from '@display/viewer/TorusView';
import { developedSheet } from '@display/viewer/developedSheet';
import { paperMaterials } from '@display/viewer/materials';
import { skyEnvironment } from '@app/render/stage';

// data/ = committed curated examples; live/ = gitignored symlinks into samples/
// for watching an active search (re-run a script, refresh, it updates). Use
// DISTINCT basenames across the two folders (same basename → duplicate class).
const files = import.meta.glob(['./data/*.csv', './live/*.csv'], {
  eager: true, query: '?raw', import: 'default',
}) as Record<string, string>;

// ---- light theme: off-white background, black text. Edit THEME.bg to taste. ----
const THEME = {
  bg: '#f4f3ee',                       // off-white background (the whole ℍ canvas)
  text: 'rgba(15,15,15,0.85)',
  gridMinor: 'rgba(20,20,20,0.09)',
  gridAxis: 'rgba(10,10,10,0.38)',
  domain: 'rgba(120,75,0,0.85)',       // SL(2,ℤ) fundamental-domain walls
  pointStroke: 'rgba(10,10,10,0.6)',
  legendTitle: '#101014',
  legendSub: 'rgba(20,20,20,0.75)',
  legendLabel: '#101014',
  panelBg: 'rgba(255,255,255,0.97)',
  panelText: '#101014',
};
// one colour per triangulation type (saturated so they read on a bright bg)
const TYPE_COLOR: Record<number, string> = { 3: '#1d4ed8', 6: '#15803d', 7: '#dc2626' };
const FALLBACK = '#6b7280';

type Klass = {
  name: string; type: number; wall: string; color: string; visible: boolean;
  re: Float64Array; im: Float64Array; cone: Float64Array; margin: Float64Array;
  pos: Float64Array[]; n: number;
};

function parseClass(path: string, text: string): Klass {
  const name = path.match(/([^/]+)\.csv$/)![1];                       // e.g. "rhombic-t6"
  const type = Number((name.match(/t(\d)/) || [])[1]);
  const wall = name.startsWith('rect') ? 'rectangular (Re τ̂ = 0)' : 'rhombic (|Re τ̂| = ½)';
  const re: number[] = [], im: number[] = [], cone: number[] = [], margin: number[] = [];
  const pos: Float64Array[] = [];
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s || /^[a-zA-Z]/.test(s)) continue;
    const p = s.split(',');
    if (p.length < 28) continue;
    cone.push(+p[24]); re.push(+p[25]); im.push(+p[26]); margin.push(+p[27]);
    pos.push(Float64Array.from(p.slice(0, 24), Number));
  }
  return {
    name, type, wall, color: TYPE_COLOR[type] ?? FALLBACK, visible: true,
    re: Float64Array.from(re), im: Float64Array.from(im),
    cone: Float64Array.from(cone), margin: Float64Array.from(margin), pos, n: re.length,
  };
}

const classes: Klass[] = Object.keys(files)
  .sort()
  .map((path) => parseClass(path, files[path]));
const totalPts = classes.reduce((s, c) => s + c.n, 0);

const dataBounds = (() => {
  let minRe = Infinity, maxRe = -Infinity, minIm = Infinity, maxIm = -Infinity;
  for (const c of classes) for (let i = 0; i < c.n; i++) {
    const r = c.re[i], m = c.im[i];
    if (r < minRe) minRe = r; if (r > maxRe) maxRe = r;
    if (m < minIm) minIm = m; if (m > maxIm) maxIm = m;
  }
  return { minRe, maxRe, minIm, maxIm };
})();

// ---- canvas ----
const canvas = document.createElement('canvas');
canvas.style.cssText = `display:block;width:100vw;height:100vh;background:${THEME.bg};cursor:grab;touch-action:none`;
document.body.style.cssText = 'margin:0;overflow:hidden;overscroll-behavior:none';
document.documentElement.style.cssText = 'overflow:hidden';
document.body.appendChild(canvas);
const isMobile = () => window.innerWidth < 700;
const ctx = canvas.getContext('2d')!;

// ---- view transform ----
let scale = 1, cx = 0, cy = 1.4;
function setView(minRe: number, maxRe: number, minIm: number, maxIm: number): void {
  const W = window.innerWidth, H = window.innerHeight;
  const m = Math.min(70, Math.min(W, H) * 0.12);            // smaller inset margin on phones
  scale = Math.min((W - 2 * m) / ((maxRe - minRe) || 1), (H - 2 * m) / ((maxIm - minIm) || 1));
  cx = (minRe + maxRe) / 2; cy = (minIm + maxIm) / 2;
}
const homeView = () => setView(-1.05, 1.05, 0.35, 3.1);
const fitAll = () => setView(dataBounds.minRe, dataBounds.maxRe, dataBounds.minIm, dataBounds.maxIm);
const sx = (re: number) => window.innerWidth / 2 + (re - cx) * scale;
const sy = (im: number) => window.innerHeight / 2 - (im - cy) * scale;
const planeX = (px: number) => cx + (px - window.innerWidth / 2) / scale;
const planeY = (py: number) => cy - (py - window.innerHeight / 2) / scale;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
  layoutPanel();
}
window.addEventListener('resize', resize);

// ---- axes + fundamental domain ----
function niceStep(span: number): number {
  const raw = span / 8, pow = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / pow;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * pow;
}
function drawAxes(): void {
  const W = window.innerWidth, H = window.innerHeight;
  const left = planeX(0), right = planeX(W), top = planeY(0), bot = planeY(H);
  const step = niceStep(right - left);
  ctx.lineWidth = 1; ctx.font = '11px ui-monospace, monospace'; ctx.textBaseline = 'top';
  for (let re = Math.ceil(left / step) * step; re <= right; re += step) {
    const X = sx(re);
    ctx.strokeStyle = Math.abs(re) < step / 2 ? THEME.gridAxis : THEME.gridMinor;
    ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, H); ctx.stroke();
    ctx.fillStyle = THEME.text; ctx.textAlign = 'center'; ctx.fillText(re.toFixed(2), X, H - 16);
  }
  for (let im = Math.max(step, Math.ceil(Math.max(bot, 0) / step) * step); im <= top; im += step) {
    const Y = sy(im);
    ctx.strokeStyle = THEME.gridMinor;
    ctx.beginPath(); ctx.moveTo(0, Y); ctx.lineTo(W, Y); ctx.stroke();
    ctx.fillStyle = THEME.text; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(`${im.toFixed(2)}i`, 6, Y); ctx.textBaseline = 'top';
  }
  ctx.strokeStyle = THEME.domain; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
  for (const wall of [-0.5, 0.5]) {
    const X = sx(wall);
    ctx.beginPath(); ctx.moveTo(X, sy(Math.sin(Math.PI / 3))); ctx.lineTo(X, 0); ctx.stroke();
  }
  ctx.beginPath();
  for (let k = 0; k <= 96; k++) {
    const re = -0.5 + k / 96, X = sx(re), Y = sy(Math.sqrt(1 - re * re));
    if (k === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
  }
  ctx.stroke(); ctx.setLineDash([]);
}

function drawPoints(): void {
  const W = window.innerWidth, H = window.innerHeight;
  ctx.lineWidth = 0.6; ctx.strokeStyle = THEME.pointStroke;
  for (const c of classes) {
    if (!c.visible) continue;
    ctx.fillStyle = c.color;
    for (let i = 0; i < c.n; i++) {
      const X = sx(c.re[i]), Y = sy(c.im[i]);
      if (X < -4 || X > W + 4 || Y < -4 || Y > H + 4) continue;
      ctx.beginPath(); ctx.arc(X, Y, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }
}

// ---- legend (top-left); click a row to toggle a file ----
type LegendHit = { x: number; y: number; w: number; h: number; klass: Klass };
let legendHits: LegendHit[] = [];
function drawLegend(): void {
  legendHits = [];
  const mob = isMobile();
  const x0 = mob ? 10 : 16, y0 = mob ? 10 : 16, rowH = mob ? 26 : 22, sw = 12;
  const fs = mob ? 12 : 13;
  ctx.font = `${fs}px ui-monospace, monospace`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = THEME.legendTitle;
  ctx.fillText(mob ? `${totalPts.toLocaleString()} curated tori` : `moduli τ̂ ∈ ℍ — ${totalPts.toLocaleString()} curated tori`, x0, y0 + 8);
  ctx.fillStyle = THEME.legendSub; ctx.font = `${mob ? 10 : 11}px ui-monospace, monospace`;
  ctx.fillText(mob ? 'colour = triangulation · tap a point' : 'colour = triangulation · click a point for details · r reset · f fit', x0, y0 + 26);
  ctx.font = `${fs}px ui-monospace, monospace`;
  classes.forEach((c, i) => {
    const y = y0 + (mob ? 44 : 48) + i * rowH;
    const label = `${c.name}  (${c.n})`;
    const labW = sw + 8 + ctx.measureText(label).width + 10;
    legendHits.push({ x: x0 - 4, y: y - rowH / 2, w: labW, h: rowH, klass: c });
    ctx.globalAlpha = c.visible ? 1 : 0.32;
    ctx.fillStyle = c.color; ctx.fillRect(x0, y - sw / 2, sw, sw);
    ctx.fillStyle = THEME.legendLabel;
    ctx.fillText(label, x0 + sw + 8, y + 1);
    ctx.globalAlpha = 1;
  });
}

// ---- selection (set by tap/click); stats + 3D live in the DOM info panel ----
let selected: { c: Klass; i: number } | null = null;
function drawSelection(): void {
  if (!selected) return;
  const { c, i } = selected;
  if (!c.visible) { selected = null; return; }
  const X = sx(c.re[i]), Y = sy(c.im[i]);
  ctx.beginPath(); ctx.arc(X, Y, 6, 0, Math.PI * 2);
  ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.arc(X, Y, 9, 0, Math.PI * 2);
  ctx.strokeStyle = c.color; ctx.lineWidth = 1.5; ctx.stroke();
}

function draw(): void {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawAxes();
  drawPoints();
  drawLegend();
  drawSelection();
}

// ===================== info panel: stats + rotatable 3D torus =====================
// One DOM panel (so it reflows for any aspect ratio): the certificate text on top,
// a WebGL torus below. Desktop → a card bottom-right; mobile → a full-width bottom
// drawer. Shown only while a point is selected.
const panel = document.createElement('div');
panel.style.cssText = 'position:fixed;display:none;flex-direction:column;background:rgba(255,255,255,0.97);'
  + 'border:1px solid rgba(0,0,0,0.18);border-radius:8px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.18);z-index:20';
const statsDiv = document.createElement('div');
statsDiv.style.cssText = 'padding:8px 11px;font:12px/1.55 ui-monospace,monospace;color:#101014;border-bottom:1px solid rgba(0,0,0,0.08)';
const glHost = document.createElement('div');
glHost.style.cssText = 'flex:1;min-height:0;position:relative;background:#eef1f5';
const hint = document.createElement('div');
hint.textContent = 'drag to rotate · pinch / scroll to zoom';
hint.style.cssText = 'position:absolute;left:8px;bottom:6px;font:11px ui-monospace,monospace;color:rgba(20,20,20,0.5);pointer-events:none';
// "investigate" button → opens the slice view for the selected torus in a new
// tab (target set per-selection in showTorus3D).
const investBtn = document.createElement('button');
investBtn.textContent = 'Investigate this torus ↗';
investBtn.style.cssText = 'margin:8px 11px 4px;padding:6px 10px;font:12px ui-monospace,monospace;cursor:pointer;'
  + 'border:none;border-radius:6px;background:#166534;color:#fff';
panel.append(statsDiv, investBtn, glHost);
document.body.appendChild(panel);

/** URL of the slice view for a torus — dev (per-demo djb2 port) or the Pages build (sibling path). */
function sliceUrl(type: number, pos: ArrayLike<number>): string {
  const qs = new URLSearchParams({ type: String(type), pos: Array.from(pos).join(',') }).toString();
  if (location.pathname.includes('/.dev/')) {
    let h = 5381; const name = 'torus-inspector';
    for (let i = 0; i < name.length; i++) h = ((h * 33) ^ name.charCodeAt(i)) >>> 0;
    return `http://${location.hostname}:${5200 + (h % 400)}/.dev/torus-inspector.html?${qs}`;
  }
  return new URL(`../torus-inspector/?${qs}`, location.href).href;
}

const insetRenderer = new THREE.WebGLRenderer({ antialias: true });
insetRenderer.setPixelRatio(window.devicePixelRatio || 1);
insetRenderer.domElement.style.cssText = 'display:block;touch-action:none';
glHost.append(insetRenderer.domElement, hint);

const insetScene = new THREE.Scene();
skyEnvironment(insetScene, { intensity: 0.7, background: 0xeef1f5 });
insetScene.add(new THREE.AmbientLight(0xffffff, 0.25));
const insetKey = new THREE.DirectionalLight(0xffffff, 2.2);
insetKey.position.set(-0.4, 0.8, 0.7);
insetScene.add(insetKey);

const insetCam = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
const insetControls = new OrbitControls(insetCam, insetRenderer.domElement);
insetControls.enableDamping = true;
insetControls.enablePan = true;
// Interaction (pointer handler below): one finger on the torus spins it; one finger
// elsewhere orbits the scene; two fingers pan/zoom the scene (OrbitControls owns the
// multi-touch). Mouse: right-drag pans, scroll zooms.

const { surface: insetFace } = paperMaterials({
  paperColor: '#dcbf6f', gridColor: '#2435AF', gridMinorColor: '#4e5988',
});
const NET_EDGE = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.5 });   // black, very-thin fold-line tubes

let insetMesh: THREE.Object3D | null = null;
let torusPivot: THREE.Object3D | null = null;   // the folded torus; drag it to spin in place
let insetVisible = false;

// position/size the panel for the current viewport, then match the renderer to its gl area
function layoutPanel(): void {
  if (!insetVisible) return;
  const s = panel.style;
  s.top = 'auto';
  if (isMobile()) {
    s.left = '8px'; s.right = '8px'; s.bottom = '8px'; s.width = 'auto'; s.height = '42vh';
  } else {
    const w = Math.min(360, Math.max(300, Math.round(window.innerWidth * 0.26)));
    s.left = 'auto'; s.right = '16px'; s.bottom = '16px'; s.width = `${w}px`; s.height = `${Math.round(w * 1.12)}px`;
  }
  const rect = glHost.getBoundingClientRect();
  const w = Math.max(80, Math.floor(rect.width)), h = Math.max(80, Math.floor(rect.height));
  insetRenderer.setSize(w, h);
  insetCam.aspect = w / h;
  insetCam.updateProjectionMatrix();
  insetControls.update();
}

function showTorus3D(c: Klass, i: number): void {
  if (insetMesh) {
    insetScene.remove(insetMesh);
    insetMesh.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  }
  const paper = paperFromRow(byId(c.type), c.pos[i]);

  // The folded paper torus (NO edges; drag it to spin) floating above its UNFOLDED
  // developed net, whose fold lines are black very-thin tubes (rect-gallery / Rich's
  // present). Both faces use the grid material so the graph-paper tiles across the net.
  const group = new THREE.Group();

  // folded torus: grid face, no edges, centered in a spin pivot
  const tview = makeTorusView(byId(c.type), { surface: { material: insetFace } });
  tview.draw(paper.positions);
  const torus = tview.group;
  torus.updateMatrixWorld(true);
  const tbox = new THREE.Box3().setFromObject(torus);
  const tr = tbox.getBoundingSphere(new THREE.Sphere()).radius || 1;
  torus.position.sub(tbox.getCenter(new THREE.Vector3()));   // centered at the pivot origin → spins in place
  const pivot = new THREE.Group();
  pivot.add(torus);
  torusPivot = pivot;

  // developed net: grid face + black very-thin tube fold lines
  const sheetView = developedSheet(byId(c.type), { faceMaterial: insetFace, foldMaterial: NET_EDGE, foldRadius: 0.0015 });
  sheetView.draw(paper.positions);
  const sheet = sheetView.group;
  sheet.rotation.x = -Math.PI / 2;                  // lay the net flat on the ground

  // stack: torus hovering above, net on the ground below
  pivot.position.y += tr * 0.7;
  sheet.position.y -= tr * 0.9;
  group.add(pivot, sheet);
  group.updateMatrixWorld(true);
  group.position.sub(new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3()));
  insetScene.add(group);
  insetMesh = group;
  // frame the camera on the bounding sphere (extra margin to survive any aspect)
  const r = new THREE.Box3().setFromObject(group).getBoundingSphere(new THREE.Sphere()).radius || 1;
  const dist = (r / Math.sin((insetCam.fov * Math.PI / 180) / 2)) * 1.45;
  insetCam.position.set(0.35 * dist, 0.45 * dist, dist);
  insetCam.near = r * 0.05; insetCam.far = r * 40;
  insetControls.target.set(0, 0, 0);

  const im = c.im[i];
  statsDiv.innerHTML =
    `<b style="color:${c.color}">${c.name} · type ${c.type}</b><br>`
    + `${c.wall}<br>`
    + `τ̂ = ${c.re[i]} ${im >= 0 ? '+' : '−'} ${Math.abs(im)} i<br>`
    + `embedding margin&nbsp; ${c.margin[i].toExponential(3)}<br>`
    + `flatness (cone def) ${c.cone[i].toExponential(3)}`;

  investBtn.onclick = () => window.open(sliceUrl(c.type, c.pos[i]), '_blank');

  panel.style.display = 'flex';
  insetVisible = true;
  layoutPanel();
}
function hideTorus3D(): void { panel.style.display = 'none'; insetVisible = false; }

(function renderInset(): void {
  requestAnimationFrame(renderInset);
  if (!insetVisible) return;
  insetControls.update();
  insetRenderer.render(insetScene, insetCam);
})();

// ---- one finger on the torus spins it; one finger elsewhere orbits; two fingers
//      pan/zoom the scene (we step aside and let OrbitControls own the gesture) ----
{
  const ROT = 0.01;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const cv = insetRenderer.domElement;
  const down = new Set<number>();
  let spinning = false;
  let lx = 0, ly = 0;
  const overTorus = (e: PointerEvent | MouseEvent): boolean => {
    if (!torusPivot) return false;
    const r = cv.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, insetCam);
    return ray.intersectObject(torusPivot, true).length > 0;
  };
  cv.addEventListener('pointerdown', (e) => {
    down.add(e.pointerId);
    if (down.size > 1) { spinning = false; return; }   // 2+ fingers → OrbitControls pans/zooms
    if (e.button === 0 && overTorus(e)) {
      spinning = true;
      insetControls.enableRotate = false;              // suppress orbit so this drag only spins the torus
      lx = e.clientX; ly = e.clientY; cv.style.cursor = 'grabbing';
    }
  }, { capture: true });
  cv.addEventListener('pointermove', (e) => {
    if (!spinning) { if (down.size === 0) cv.style.cursor = overTorus(e) ? 'grab' : 'default'; return; }
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * ROT);
    const qp = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * ROT);
    torusPivot?.quaternion.premultiply(qy).premultiply(qp);
  });
  const up = (e: PointerEvent): void => {
    down.delete(e.pointerId);
    if (down.size === 0) {
      spinning = false;
      insetControls.enableRotate = true;               // restore one-finger orbit
      cv.style.cursor = overTorus(e) ? 'grab' : 'default';
    }
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('dblclick', (e) => { if (overTorus(e)) torusPivot?.quaternion.identity(); });
}

// ---- a tap/click: legend toggle, else select the nearest visible point ----
function selectAt(x: number, y: number): void {
  const hit = legendHits.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
  if (hit) {
    hit.klass.visible = !hit.klass.visible;
    if (selected && selected.c === hit.klass && !hit.klass.visible) { selected = null; hideTorus3D(); }
    draw(); return;
  }
  const pr = isMobile() ? 26 : 16;              // generous radius for touch (larger on mobile)
  let best: { c: Klass; i: number; d2: number } | null = null;
  for (const c of classes) {
    if (!c.visible) continue;
    for (let i = 0; i < c.n; i++) {
      const dx = sx(c.re[i]) - x, dy = sy(c.im[i]) - y, d2 = dx * dx + dy * dy;
      if (d2 < pr * pr && (!best || d2 < best.d2)) best = { c, i, d2 };
    }
  }
  selected = best ? { c: best.c, i: best.i } : null;
  if (selected) showTorus3D(selected.c, selected.i); else hideTorus3D();
  draw();
}

// ---- pointer interaction on the 2D plot: 1 pointer = pan/tap, 2 = pinch-zoom ----
// (Pointer Events unify mouse + touch + pen; OrbitControls handles the 3D inset itself.)
const pointers = new Map<number, { x: number; y: number }>();
let tap: { x: number; y: number; moved: boolean } | null = null;
let pinch: { dist: number; mx: number; my: number } | null = null;

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) { tap = { x: e.clientX, y: e.clientY, moved: false }; canvas.style.cursor = 'grabbing'; }
  else { tap = null; pinch = null; }
});
canvas.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  const ox = p.x, oy = p.y; p.x = e.clientX; p.y = e.clientY;
  if (pointers.size === 1) {
    if (tap && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > (isMobile() ? 14 : 6)) tap.moved = true;
    cx -= (e.clientX - ox) / scale; cy += (e.clientY - oy) / scale;
    draw();
  } else if (pointers.size >= 2) {
    const v = [...pointers.values()];
    const mx = (v[0].x + v[1].x) / 2, my = (v[0].y + v[1].y) / 2;
    const dist = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) || 1;
    if (pinch) {
      cx -= (mx - pinch.mx) / scale; cy += (my - pinch.my) / scale;   // pan by the midpoint
      const pX = planeX(mx), pY = planeY(my);                          // zoom about the midpoint
      scale *= dist / pinch.dist;
      cx = pX - (mx - window.innerWidth / 2) / scale;
      cy = pY + (my - window.innerHeight / 2) / scale;
      draw();
    }
    pinch = { dist, mx, my };
  }
});
function endPointer(e: PointerEvent): void {
  const had = pointers.size;
  pointers.delete(e.pointerId);
  try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  if (pointers.size < 2) pinch = null;
  if (pointers.size === 0) canvas.style.cursor = 'grab';
  if (had === 1 && tap && !tap.moved) selectAt(tap.x, tap.y);
  if (had <= 1) tap = null;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const k = Math.exp(-e.deltaY * 0.0015);
  const pX = planeX(e.clientX), pY = planeY(e.clientY);
  scale *= k;
  cx = pX - (e.clientX - window.innerWidth / 2) / scale;
  cy = pY + (e.clientY - window.innerHeight / 2) / scale;
  draw();
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.key === 'r') { homeView(); draw(); }
  else if (e.key === 'f') { fitAll(); draw(); }
  else if (e.key === 'Escape') { selected = null; hideTorus3D(); draw(); }
});

homeView();
resize();
