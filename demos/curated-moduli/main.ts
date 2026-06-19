/**
 * curated-moduli — the curated data/curated collection plotted in MODULI space ℍ,
 * one COLOR per triangulation. Self-contained: it reads its own copies of the
 * CSVs in ./data (snapshotted from data/curated, so this demo never shifts when
 * the search pool is re-curated).
 *
 * Each file is the 28-col search-near-rect format (24 positions, coneDeficit,
 * Re τ̂, Im τ̂, margin); the stored Re τ̂ / Im τ̂ ARE the reduced modulus — points
 * of moduli space — so we plot them directly against the SL(2,ℤ) fundamental
 * domain (walls Re = ±½, arc |τ| = 1). Rectangular tori sit on the imaginary
 * axis (Re τ̂ = 0); rhombic tori sit on the vertical walls (Re τ̂ = ±½).
 *
 * Colour encodes the TRIANGULATION TYPE (3 / 6 / 7), shared between a type's
 * rectangular and rhombic files. CLICK a point to read its τ, embedding margin,
 * and flatness (max cone deficit); click empty space to dismiss. Scroll to zoom,
 * drag to pan, click a legend row to toggle a file, r resets the view, f fits all.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { byId } from '@core/triangulations';
import { paperFromRow } from '@core/configuration/csv';
import { makeTorusView, type TorusView } from '@display/viewer/TorusView';
import { paperMaterials } from '@display/viewer/materials';
import { skyEnvironment } from '@app/render/stage';

const files = import.meta.glob('./data/*.csv', {
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
panel.append(statsDiv, glHost);
document.body.appendChild(panel);

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
insetControls.enablePan = false;

const { surface: insetFace } = paperMaterials({
  paperColor: '#dcbf6f', gridColor: '#2435AF', gridMinorColor: '#4e5988',
});

let insetMesh: THREE.Object3D | null = null;
let curInset: TorusView | null = null;
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
  if (insetMesh) insetScene.remove(insetMesh);
  curInset?.dispose();
  const paper = paperFromRow(byId('v8-' + c.type), c.pos[i]);
  const view = makeTorusView(paper.triang, { surface: { material: insetFace } });
  view.draw(paper.positions);
  curInset = view;
  const mesh = view.group;
  mesh.updateMatrixWorld(true);
  const center = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
  mesh.position.sub(center);                        // recenter on the origin
  mesh.updateMatrixWorld(true);
  insetScene.add(mesh);
  insetMesh = mesh;
  // frame the camera on the bounding sphere (extra margin to survive any aspect)
  const r = new THREE.Box3().setFromObject(mesh).getBoundingSphere(new THREE.Sphere()).radius || 1;
  const dist = (r / Math.sin((insetCam.fov * Math.PI / 180) / 2)) * 1.45;
  insetCam.position.set(0.35 * dist, 0.45 * dist, dist);
  insetCam.near = r * 0.05; insetCam.far = r * 40;
  insetControls.target.set(0, 0, 0);

  const im = c.im[i];
  statsDiv.innerHTML =
    `<b style="color:${c.color}">${c.name} · type ${c.type}</b><br>`
    + `${c.wall}<br>`
    + `τ̂ = ${c.re[i].toFixed(6)} ${im >= 0 ? '+' : '−'} ${Math.abs(im).toFixed(6)} i<br>`
    + `embedding margin&nbsp; ${c.margin[i].toExponential(3)}<br>`
    + `flatness (cone def) ${c.cone[i].toExponential(3)}`;

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

// ---- a tap/click: legend toggle, else select the nearest visible point ----
function selectAt(x: number, y: number): void {
  const hit = legendHits.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
  if (hit) {
    hit.klass.visible = !hit.klass.visible;
    if (selected && selected.c === hit.klass && !hit.klass.visible) { selected = null; hideTorus3D(); }
    draw(); return;
  }
  const pr = 16;                                // generous radius for touch
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
    if (tap && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 6) tap.moved = true;
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
