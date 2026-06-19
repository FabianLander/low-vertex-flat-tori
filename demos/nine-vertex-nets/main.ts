/**
 * nine-vertex-nets — the planar developing layouts of all 112 nine-vertex torus
 * triangulations (Lutz's census). Each torus is laid out flat via the harmonic (Tutte)
 * embedding — PURELY COMBINATORIAL: no 3D realization, no precomputed marking needed
 * (`harmonicLayout` runs on the derived combinatorics alone).
 *
 * Gallery view: all 112 flat structures at a glance. Click one to open the detail view —
 * the universal-cover tiling with the provably-minimal fundamental domain highlighted and
 * the period-lattice vectors V₁,V₂ drawn (this is the per-triangulation "developing map").
 *
 * Controls: gallery — scroll, click a net to open. detail — drag pan · scroll zoom ·
 *           ←/→ switch torus · esc back to gallery.
 */

import { NINE_VERTEX } from '@core/triangulations/nineVertex';
import { deriveCombinatorics, type Combinatorics } from '@core/topology/triangulation';
import { harmonicLayout, periodicTiles, type HarmonicLayout, type HarmonicTile } from '@core/topology/harmonicLayout';
import { exactMinCutDomain, type ExactDomainResult } from '@core/topology/fundamentalDomain';
import type { Vec2 } from '@core/geometry/vec2';

type Entry = { id: string; comb: Combinatorics; layout: HarmonicLayout };
// harmonicLayout is fast (~0.3ms each) → all 112 up front; the expensive minimal-domain
// (exactMinCutDomain) is computed lazily, only when a net is opened in detail.
const entries: Entry[] = NINE_VERTEX.map((d) => {
  const comb = deriveCombinatorics(d.triangles);
  return { id: d.id, comb, layout: harmonicLayout(comb) };
});
const F = 18;                                   // faces per 9-vertex torus
const domCache = new Map<number, ExactDomainResult>();
const domainOf = (i: number): ExactDomainResult => {
  let d = domCache.get(i);
  if (!d) { d = exactMinCutDomain(entries[i].comb, entries[i].layout); domCache.set(i, d); }
  return d;
};

document.body.style.cssText = 'margin:0;background:#0e0e12;overflow:hidden';
const canvas = document.createElement('canvas');
canvas.style.cssText = 'display:block;width:100vw;height:100vh';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d')!;

const hue = (id: number) => (id / F) * 360;
const cen = (c: readonly Vec2[]): Vec2 => [(c[0][0] + c[1][0] + c[2][0]) / 3, (c[0][1] + c[1][1] + c[2][1]) / 3];

function bbox(tiles: readonly HarmonicTile[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of tiles) for (const [x, y] of t.corners) {
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

/** Draw `tiles` (colored by triangle id) fit into the rect (ox,oy,w,h). */
function drawTiles(tiles: readonly HarmonicTile[], ox: number, oy: number, w: number, h: number, lineW: number, alpha = 1): void {
  const { minX, minY, maxX, maxY } = bbox(tiles);
  const s = Math.min(w / ((maxX - minX) || 1), h / ((maxY - minY) || 1)) * 0.9;
  const mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
  const px = (p: Vec2) => ox + w / 2 + (p[0] - mx) * s;
  const py = (p: Vec2) => oy + h / 2 - (p[1] - my) * s;
  for (const t of tiles) {
    ctx.beginPath();
    ctx.moveTo(px(t.corners[0]), py(t.corners[0]));
    ctx.lineTo(px(t.corners[1]), py(t.corners[1]));
    ctx.lineTo(px(t.corners[2]), py(t.corners[2]));
    ctx.closePath();
    ctx.fillStyle = `hsla(${hue(t.id)}, 65%, 58%, ${0.42 * alpha})`; ctx.fill();
    ctx.strokeStyle = `hsla(${hue(t.id)}, 80%, 78%, ${0.85 * alpha})`; ctx.lineWidth = lineW; ctx.stroke();
  }
}

// ─── state ────────────────────────────────────────────────────────────────────
let mode: 'gallery' | 'detail' = 'gallery';
let sel = 0;
let scrollY = 0;                                 // gallery scroll
// detail view transform (world ↔ screen)
let dScale = 1, dCx = 0, dCy = 0;

const CELL = 168, GAP = 10, PAD = 16, LABEL = 20;
function cols(): number { return Math.max(1, Math.floor((window.innerWidth - 2 * PAD + GAP) / (CELL + GAP))); }
function rows(): number { return Math.ceil(entries.length / cols()); }
function maxScroll(): number { return Math.max(0, rows() * (CELL + LABEL + GAP) + 2 * PAD - window.innerHeight); }

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
window.addEventListener('resize', resize);

// ─── gallery ────────────────────────────────────────────────────────────────────
function cellRect(i: number): { x: number; y: number } {
  const c = cols();
  const col = i % c, row = Math.floor(i / c);
  return { x: PAD + col * (CELL + GAP), y: PAD + row * (CELL + LABEL + GAP) - scrollY };
}

function drawGallery(): void {
  const W = window.innerWidth, H = window.innerHeight;
  ctx.clearRect(0, 0, W, H);
  for (let i = 0; i < entries.length; i++) {
    const { x, y } = cellRect(i);
    if (y + CELL + LABEL < 0 || y > H) continue;            // cull offscreen
    ctx.fillStyle = '#15151c'; ctx.fillRect(x, y, CELL, CELL);
    drawTiles(entries[i].layout.tiles, x, y, CELL, CELL, 1);
    ctx.fillStyle = '#cfd2dc'; ctx.font = '12px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(entries[i].id, x + CELL / 2, y + CELL + LABEL / 2);
  }
  // HUD
  ctx.fillStyle = 'rgba(14,14,18,0.85)'; ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = '#e8e8ec'; ctx.font = '13px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`9-vertex torus triangulations — ${entries.length} harmonic flat layouts · scroll · click a net to open`, 12, 15);
}

// ─── detail (per-triangulation developing map) ──────────────────────────────────
function fitDetail(): void {
  const dom = domainOf(sel).domain;
  const { minX, minY, maxX, maxY } = bbox(dom);
  const W = window.innerWidth, H = window.innerHeight, m = 140;
  dScale = Math.min((W - 2 * m) / ((maxX - minX) || 1), (H - 2 * m) / ((maxY - minY) || 1));
  dCx = (minX + maxX) / 2; dCy = (minY + maxY) / 2;
}
const dsx = (p: Vec2) => window.innerWidth / 2 + (p[0] - dCx) * dScale;
const dsy = (p: Vec2) => window.innerHeight / 2 - (p[1] - dCy) * dScale;
const dwx = (px: number) => dCx + (px - window.innerWidth / 2) / dScale;
const dwy = (py: number) => dCy - (py - window.innerHeight / 2) / dScale;

function dpoly(c: readonly Vec2[]): void {
  ctx.beginPath();
  ctx.moveTo(dsx(c[0]), dsy(c[0])); ctx.lineTo(dsx(c[1]), dsy(c[1])); ctx.lineTo(dsx(c[2]), dsy(c[2]));
  ctx.closePath();
}

function drawDetail(): void {
  const W = window.innerWidth, H = window.innerHeight;
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = 'round';
  const { id, layout } = entries[sel];
  const res = domainOf(sel);
  const dom = res.domain;

  // faint universal-cover tiling over the window
  const win = { x0: dwx(0), x1: dwx(W), y0: dwy(H), y1: dwy(0) };
  const ext = Math.max(win.x1 - win.x0, win.y1 - win.y0);
  const vmin = Math.min(Math.hypot(...layout.V1), Math.hypot(...layout.V2)) || 1;
  const range = Math.min(30, Math.ceil(ext / vmin) + 2);
  for (const t of periodicTiles(layout, win, range)) {
    dpoly(t.corners);
    ctx.fillStyle = `hsla(${hue(t.id)}, 60%, 60%, 0.08)`; ctx.fill();
    ctx.strokeStyle = `hsla(${hue(t.id)}, 55%, 70%, 0.25)`; ctx.lineWidth = 0.8; ctx.stroke();
  }
  // the minimal fundamental domain, highlighted, with face ids
  for (const t of dom) {
    dpoly(t.corners);
    ctx.fillStyle = `hsla(${hue(t.id)}, 70%, 55%, 0.5)`; ctx.fill();
    ctx.strokeStyle = `hsla(${hue(t.id)}, 85%, 80%, 0.95)`; ctx.lineWidth = 1.8; ctx.stroke();
    const g = cen(t.corners);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(t.id), dsx(g), dsy(g));
  }
  // HUD
  ctx.fillStyle = 'rgba(14,14,18,0.85)'; ctx.fillRect(0, 0, W, 30);
  ctx.fillStyle = '#e8e8ec'; ctx.font = '13px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`${id}  ·  minimal fundamental domain · cut ${res.cut.length} · F=${F}  ·  drag · scroll · ←/→ · esc`, 12, 15);
}

function draw(): void { mode === 'gallery' ? drawGallery() : drawDetail(); }

// ─── interaction ────────────────────────────────────────────────────────────────
function openDetail(i: number): void { sel = i; mode = 'detail'; fitDetail(); draw(); }
function backToGallery(): void { mode = 'gallery'; draw(); }

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (mode === 'gallery') {
    scrollY = Math.max(0, Math.min(maxScroll(), scrollY + e.deltaY));
    draw();
  } else {
    const k = Math.exp(-e.deltaY * 0.0015);
    const pX = dwx(e.clientX), pY = dwy(e.clientY);
    dScale *= k;
    dCx = pX - (e.clientX - window.innerWidth / 2) / dScale;
    dCy = pY + (e.clientY - window.innerHeight / 2) / dScale;
    draw();
  }
}, { passive: false });

let dragging = false, lastX = 0, lastY = 0, moved = false;
canvas.addEventListener('mousedown', (e) => { dragging = true; moved = false; lastX = e.clientX; lastY = e.clientY; });
window.addEventListener('mouseup', (e) => {
  dragging = false;
  if (moved) return;
  if (mode === 'gallery') {
    for (let i = 0; i < entries.length; i++) {
      const { x, y } = cellRect(i);
      if (e.clientX >= x && e.clientX <= x + CELL && e.clientY >= y && e.clientY <= y + CELL) { openDetail(i); return; }
    }
  }
});
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  if (Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY) > 3) moved = true;
  if (mode === 'detail') { dCx -= (e.clientX - lastX) / dScale; dCy += (e.clientY - lastY) / dScale; }
  lastX = e.clientX; lastY = e.clientY;
  if (mode === 'detail') draw();
});
window.addEventListener('keydown', (e) => {
  if (mode === 'detail') {
    if (e.key === 'Escape') backToGallery();
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      sel = (sel + (e.key === 'ArrowLeft' ? -1 : 1) + entries.length) % entries.length;
      fitDetail(); draw();
    }
  }
});

resize();
