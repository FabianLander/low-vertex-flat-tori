/**
 * low-vertex-nets — the developed nets of the low-vertex torus triangulations (7, 8, 9, and
 * 10 vertices: 1 + 7 + 112 + 2109).
 *
 * Each net is `developedNet(triangulation)`: the triangulation unfolded along its **stored
 * marking's cut** (the chart we precompute) into one contiguous planar copy of each triangle,
 * with shapes from the harmonic flat structure. This is THE thing we compute — not
 * `harmonicLayout.tiles` (the per-triangle base lifts, which fragment at period wraps).
 *
 * Pick a vertex count in the top bar. Nets are computed lazily as they scroll into view, so
 * even the 2109 ten-vertex load instantly. Colored = irreducible (genuinely new); grayed =
 * just a 1→3 subdivision of a smaller triangulation (`isReducible`). Click a net to open it
 * large — drag pan · scroll zoom · ←/→ switch · esc back.
 */

import { ALL_TORI } from '@core/triangulations';
import type { Triangulation } from '@core/topology/triangulation';
import { developedNet } from '@core/topology/fundamentalDomain';
import { isReducible } from '@core/topology/pachner';
import type { HarmonicTile } from '@core/topology/harmonicLayout';
import type { Vec2 } from '@core/geometry/vec2';

const VCOUNTS = [7, 8, 9, 10] as const;
let selV = 9;
let shown: Triangulation[] = [];

// lazy, memoized per triangulation: the developed net + whether it's a 1→3 subdivision.
type Cell = { net: HarmonicTile[]; reducible: boolean };
const cache = new Map<string, Cell>();
function cellOf(t: Triangulation): Cell {
  let c = cache.get(t.id);
  if (!c) { c = { net: developedNet(t), reducible: isReducible(t.triangles) }; cache.set(t.id, c); }
  return c;
}

// ─── DOM: top bar (buttons + status) over a full-screen canvas ───────────────────
const BAR_H = 40;
document.body.style.cssText = 'margin:0;background:#0e0e12;overflow:hidden;font-family:ui-monospace,monospace';
const bar = document.createElement('div');
bar.style.cssText = `position:fixed;top:0;left:0;right:0;height:${BAR_H}px;display:flex;align-items:center;gap:8px;padding:0 12px;background:#15151c;color:#cfd2dc;font-size:13px;z-index:1;box-sizing:border-box`;
document.body.appendChild(bar);
const buttons = VCOUNTS.map((v) => {
  const b = document.createElement('button');
  b.textContent = `${v} (${ALL_TORI.filter((t) => t.vertexCount === v).length})`;
  b.style.cssText = 'background:#23232e;color:#cfd2dc;border:1px solid #33333f;border-radius:5px;padding:4px 9px;cursor:pointer;font:inherit';
  b.onclick = () => selectV(v);
  bar.appendChild(b);
  return b;
});
const status = document.createElement('span');
status.style.cssText = 'margin-left:10px;color:#9a9da8';
bar.appendChild(status);

const canvas = document.createElement('canvas');
canvas.style.cssText = `display:block;width:100vw;height:100vh`;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d')!;

const cen = (c: readonly Vec2[]): Vec2 => [(c[0][0] + c[1][0] + c[2][0]) / 3, (c[0][1] + c[1][1] + c[2][1]) / 3];

function bbox(net: readonly HarmonicTile[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of net) for (const [x, y] of t.corners) {
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

/** Draw a net via a world→screen map. Colored by triangle id, or grayed if `gray`. */
function drawNet(net: readonly HarmonicTile[], px: (p: Vec2) => number, py: (p: Vec2) => number, lineW: number, ids: boolean, gray: boolean): void {
  const F = net.length;
  for (const t of net) {
    const hue = (t.id / F) * 360;
    ctx.beginPath();
    ctx.moveTo(px(t.corners[0]), py(t.corners[0]));
    ctx.lineTo(px(t.corners[1]), py(t.corners[1]));
    ctx.lineTo(px(t.corners[2]), py(t.corners[2]));
    ctx.closePath();
    // subdivisions (`gray`) are MUTED, not killed: same hue, ~70% desaturated + dimmed, so
    // they stay legible but recede behind the irreducible (full-color) ones.
    ctx.fillStyle = gray ? `hsla(${hue}, 20%, 52%, 0.22)` : `hsla(${hue}, 65%, 56%, 0.5)`; ctx.fill();
    ctx.strokeStyle = gray ? `hsla(${hue}, 28%, 64%, 0.55)` : `hsla(${hue}, 82%, 80%, 0.95)`; ctx.lineWidth = lineW; ctx.stroke();
  }
  if (ids) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of net) { const g = cen(t.corners); ctx.fillText(String(t.id), px(g), py(g)); }
  }
}

function fitMap(net: readonly HarmonicTile[], ox: number, oy: number, w: number, h: number): [(p: Vec2) => number, (p: Vec2) => number] {
  const { minX, minY, maxX, maxY } = bbox(net);
  const s = Math.min(w / ((maxX - minX) || 1), h / ((maxY - minY) || 1)) * 0.9;
  const mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
  return [(p) => ox + w / 2 + (p[0] - mx) * s, (p) => oy + h / 2 - (p[1] - my) * s];
}

// ─── state ────────────────────────────────────────────────────────────────────
let mode: 'gallery' | 'detail' = 'gallery';
let sel = 0;
let scrollY = 0;
let dScale = 1, dCx = 0, dCy = 0;               // detail pan/zoom

const CELL = 168, GAP = 10, PAD = 16, LABEL = 20;
const cols = () => Math.max(1, Math.floor((window.innerWidth - 2 * PAD + GAP) / (CELL + GAP)));
const rows = () => Math.ceil(shown.length / cols());
const maxScroll = () => Math.max(0, rows() * (CELL + LABEL + GAP) + 2 * PAD - (window.innerHeight - BAR_H));
const cellRect = (i: number) => { const c = cols(); return { x: PAD + (i % c) * (CELL + GAP), y: BAR_H + PAD + Math.floor(i / c) * (CELL + LABEL + GAP) - scrollY }; };

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
window.addEventListener('resize', resize);

function drawGallery(): void {
  const W = window.innerWidth, H = window.innerHeight;
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = 'round';
  for (let i = 0; i < shown.length; i++) {
    const { x, y } = cellRect(i);
    if (y + CELL + LABEL < BAR_H || y > H) continue;           // cull offscreen (lazy: only visible computed)
    const { net, reducible } = cellOf(shown[i]);
    ctx.fillStyle = '#15151c'; ctx.fillRect(x, y, CELL, CELL);
    const [px, py] = fitMap(net, x, y, CELL, CELL);
    drawNet(net, px, py, 1, false, reducible);
    ctx.fillStyle = reducible ? '#62656f' : '#cfd2dc'; ctx.font = '12px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(shown[i].id, x + CELL / 2, y + CELL + LABEL / 2);
  }
}

function fitDetail(): void {
  const { minX, minY, maxX, maxY } = bbox(cellOf(shown[sel]).net);
  const W = window.innerWidth, H = window.innerHeight, m = 140;
  dScale = Math.min((W - 2 * m) / ((maxX - minX) || 1), (H - 2 * m) / ((maxY - minY) || 1));
  dCx = (minX + maxX) / 2; dCy = (minY + maxY) / 2;
}
const dsx = (p: Vec2) => window.innerWidth / 2 + (p[0] - dCx) * dScale;
const dsy = (p: Vec2) => (window.innerHeight + BAR_H) / 2 - (p[1] - dCy) * dScale;
const dwx = (px: number) => dCx + (px - window.innerWidth / 2) / dScale;
const dwy = (py: number) => dCy - (py - (window.innerHeight + BAR_H) / 2) / dScale;

function drawDetail(): void {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.lineJoin = 'round';
  drawNet(cellOf(shown[sel]).net, dsx, dsy, 1.8, true, false);   // colored in detail so triangles read
}

function setStatus(): void {
  if (mode === 'gallery') status.textContent = `${selV}-vertex · ${shown.length} developed nets · colored = irreducible (new) · gray = 1→3 subdivision`;
  else status.textContent = `${shown[sel].id} · ${cellOf(shown[sel]).reducible ? 'a 1→3 subdivision of a smaller torus' : 'irreducible (genuinely new)'} · ${sel + 1}/${shown.length} · drag · scroll · ←/→ · esc`;
}

function draw(): void { (mode === 'gallery' ? drawGallery : drawDetail)(); setStatus(); }

function selectV(v: number): void {
  selV = v;
  shown = ALL_TORI.filter((t) => t.vertexCount === v);
  mode = 'gallery'; scrollY = 0; sel = 0;
  buttons.forEach((b, k) => { b.style.background = VCOUNTS[k] === v ? '#3a3a4a' : '#23232e'; });
  draw();
}

// ─── interaction ────────────────────────────────────────────────────────────────
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (mode === 'gallery') { scrollY = Math.max(0, Math.min(maxScroll(), scrollY + e.deltaY)); draw(); }
  else {
    const k = Math.exp(-e.deltaY * 0.0015);
    const pX = dwx(e.clientX), pY = dwy(e.clientY);
    dScale *= k;
    dCx = pX - (e.clientX - window.innerWidth / 2) / dScale;
    dCy = pY + (e.clientY - (window.innerHeight + BAR_H) / 2) / dScale;
    draw();
  }
}, { passive: false });

let dragging = false, lastX = 0, lastY = 0, moved = false;
canvas.addEventListener('mousedown', (e) => { dragging = true; moved = false; lastX = e.clientX; lastY = e.clientY; });
window.addEventListener('mouseup', (e) => {
  dragging = false;
  if (moved || mode !== 'gallery') return;
  for (let i = 0; i < shown.length; i++) {
    const { x, y } = cellRect(i);
    if (e.clientX >= x && e.clientX <= x + CELL && e.clientY >= y && e.clientY <= y + CELL) { sel = i; mode = 'detail'; fitDetail(); draw(); return; }
  }
});
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  if (Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY) > 3) moved = true;
  if (mode === 'detail') { dCx -= (e.clientX - lastX) / dScale; dCy += (e.clientY - lastY) / dScale; draw(); }
  lastX = e.clientX; lastY = e.clientY;
});
window.addEventListener('keydown', (e) => {
  if (mode !== 'detail') return;
  if (e.key === 'Escape') { mode = 'gallery'; draw(); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    sel = (sel + (e.key === 'ArrowLeft' ? -1 : 1) + shown.length) % shown.length;
    fitDetail(); draw();
  }
});

selectV(selV);
resize();
