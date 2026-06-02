/**
 * Tori grid — all 7 combinatorial types of 8-vertex flat torus, side by side,
 * each drawn as a harmonic "lattice patch" (the triangulation developed into the
 * plane and tiled by its period lattice). The central fundamental domain (16
 * triangles) is drawn solid with vertex labels; surrounding period-copies are
 * faint, to show how it tiles.
 *
 * Only #7 (Rich's) is degree-6-regular, so only it comes out equilateral; the
 * other six are genuinely distorted (degree-5/7 vertices).
 *
 * Controls:  v toggle vertex labels · t toggle tiling
 */

import { ALL_TORI } from '../../src/tori/index';
import { harmonicLayout, periodicTiles, type HarmonicLayout, type XY } from '../../src/math/harmonicLayout';

const layouts: HarmonicLayout[] = ALL_TORI.map(harmonicLayout);
let showLabels = true;
let showTiling = true;

const canvas = document.createElement('canvas');
canvas.style.cssText = 'display:block;width:100vw;height:100vh;background:#0e0e12';
document.body.style.margin = '0';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d')!;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
window.addEventListener('resize', resize);

type Rect = { x: number; y: number; w: number; h: number };

function cellRects(W: number, H: number, n: number): Rect[] {
  // 4 columns × 2 rows holds 7 (+1 spare)
  const cols = 4, rows = 2;
  const cw = W / cols, ch = H / rows;
  const out: Rect[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    out.push({ x: c * cw, y: r * ch, w: cw, h: ch });
  }
  return out;
}

function drawCell(rect: Rect, idx: number): void {
  const torus = ALL_TORI[idx];
  const L = layouts[idx];

  // view window = fundamental-domain bounding box + a thin ring of neighbors
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of L.tiles) for (const [x, y] of t.corners) {
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const per = Math.max(Math.hypot(...L.V1), Math.hypot(...L.V2));
  const pad = 0.4 * per; // thin border of surrounding copies
  minX -= pad; maxX += pad; minY -= pad; maxY += pad;
  const win = { x0: minX, x1: maxX, y0: minY, y1: maxY };
  const tiled = showTiling ? periodicTiles(L, win, 2) : [];

  const margin = 22, titleH = 34;
  const scale = Math.min((rect.w - 2 * margin) / (maxX - minX || 1), (rect.h - 2 * margin - titleH) / (maxY - minY || 1));
  const ox = rect.x + (rect.w - scale * (minX + maxX)) / 2;
  const oy = rect.y + titleH + (rect.h - titleH + scale * (minY + maxY)) / 2;
  const sx = (p: XY) => ox + scale * p[0];
  const sy = (p: XY) => oy - scale * p[1];

  const path = (c: XY[]) => { ctx.beginPath(); ctx.moveTo(sx(c[0]), sy(c[0])); ctx.lineTo(sx(c[1]), sy(c[1])); ctx.lineTo(sx(c[2]), sy(c[2])); ctx.closePath(); };

  // clip drawing to the cell (below the title) so the ring is trimmed cleanly
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y + titleH - 6, rect.w, rect.h - titleH + 6);
  ctx.clip();

  // faint ring of period copies
  for (const t of tiled) {
    path(t.corners);
    ctx.fillStyle = 'rgba(90,155,255,0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,150,210,0.22)'; ctx.lineWidth = 0.7; ctx.stroke();
  }
  // base fundamental domain (solid)
  for (const t of L.tiles) {
    path(t.corners);
    ctx.fillStyle = 'rgba(120,170,255,0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,185,255,0.8)'; ctx.lineWidth = 1.3; ctx.stroke();
  }
  // vertex labels (one per vertex, at its base position)
  if (showLabels) {
    ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let v = 0; v < torus.vertexCount; v++) {
      const x = sx(L.vertexPos[v]), y = sy(L.vertexPos[v]);
      ctx.fillStyle = '#0e0e12'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 2 * Math.PI); ctx.fill();
      ctx.strokeStyle = 'rgba(220,225,240,0.5)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = 'rgba(235,240,255,0.95)'; ctx.fillText(String(v), x, y);
    }
  }
  ctx.restore();

  // title
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 14px system-ui'; ctx.fillStyle = '#e8e8ec';
  ctx.fillText(`#${torus.id}  ${torus.name}`, rect.x + 14, rect.y + 20);
  ctx.font = '11px ui-monospace, monospace'; ctx.fillStyle = 'rgba(200,210,230,0.7)';
  ctx.fillText(`deg [${torus.degreeSequence.join(' ')}]`, rect.x + 14, rect.y + 34);

  // cell border
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
}

function draw(): void {
  const W = window.innerWidth, H = window.innerHeight;
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = 'round';
  const rects = cellRects(W, H, ALL_TORI.length);
  rects.forEach((r, i) => drawCell(r, i));

  // footer hint in the empty 8th cell
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = '12px system-ui'; ctx.fillStyle = 'rgba(210,215,230,0.6)';
  const cw = W / 4, ch = H / 2;
  ctx.fillText('harmonic lattice patches', 7 * 0 + 3 * cw + 14, 1 * ch + 24);
  ctx.fillText('only #7 is equilateral', 3 * cw + 14, ch + 44);
  ctx.fillText('(degree-6 regular)', 3 * cw + 14, ch + 60);
  ctx.fillText('[v] labels  [t] tiling', 3 * cw + 14, ch + 84);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'v') { showLabels = !showLabels; draw(); }
  else if (e.key === 't') { showTiling = !showTiling; draw(); }
});

resize();
