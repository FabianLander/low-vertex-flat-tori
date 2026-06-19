/**
 * harmonic-tiling — the universal cover of a triangulation, tiled by its harmonic
 * flat structure (ℝ²/Λ), with the PROVABLY-MINIMAL fundamental domain highlighted
 * and the period-lattice vectors V₁,V₂ drawn.
 *
 * This is the inspector for a triangulation's auto develop-cut / markings: it
 * works for ANY triangulation with no embedding needed. Built on
 * src/topology/harmonicLayout (flat layout + lattice + `periodicTiles`) and
 * `exactMinCutDomain` (the minimal-cut fundamental domain). #7 comes out as the
 * equilateral triangular lattice; the others are their harmonic flat structures
 * (genuinely non-equilateral).
 *
 * Controls: drag pan · scroll zoom · ↑/↓ switch torus · d domain · l lattice
 *           t triangle ids · v vertex ids · r reset view
 */

import { ALL_TORI } from '@core/triangulations';
import { harmonicLayout, periodicTiles } from '@core/topology/harmonicLayout';
import type { Vec2 } from '@core/geometry/vec2';
import { exactMinCutDomain } from '@core/topology/fundamentalDomain';

const data = ALL_TORI.map((t) => {
  const layout = harmonicLayout(t);
  const ex = exactMinCutDomain(t, layout);       // provably-minimal fundamental domain
  return { triang: t, layout, dom: ex.domain, ext: ex.exterior };
});

let idx = data.length - 1;            // start on #7 (equilateral-lattice sanity check)
let showDomain = true, showLattice = true, showTriIds = false, showVtxIds = false;

const canvas = document.createElement('canvas');
canvas.style.cssText = 'display:block;width:100vw;height:100vh;background:#0e0e12;cursor:grab';
document.body.style.margin = '0';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d')!;

// ---- view transform (world ↔ screen), equal aspect ----
let scale = 1, cx = 0, cy = 0;
const sx = (p: Vec2) => window.innerWidth / 2 + (p[0] - cx) * scale;
const sy = (p: Vec2) => window.innerHeight / 2 - (p[1] - cy) * scale;
const wx = (px: number) => cx + (px - window.innerWidth / 2) / scale;
const wy = (py: number) => cy - (py - window.innerHeight / 2) / scale;

function fitDomain(): void {
  const pts = data[idx].dom.flatMap((t) => t.corners);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const W = window.innerWidth, H = window.innerHeight, m = 120;
  scale = Math.min((W - 2 * m) / ((maxX - minX) || 1), (H - 2 * m) / ((maxY - minY) || 1));
  cx = (minX + maxX) / 2; cy = (minY + maxY) / 2;
}

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
window.addEventListener('resize', resize);

const hue = (id: number, F: number) => (id / F) * 360;
const cen = (c: Vec2[]): Vec2 => [(c[0][0] + c[1][0] + c[2][0]) / 3, (c[0][1] + c[1][1] + c[2][1]) / 3];

function poly(c: Vec2[]): void {
  ctx.beginPath();
  ctx.moveTo(sx(c[0]), sy(c[0]));
  ctx.lineTo(sx(c[1]), sy(c[1]));
  ctx.lineTo(sx(c[2]), sy(c[2]));
  ctx.closePath();
}

function arrow(from: Vec2, v: Vec2, color: string, label: string): void {
  const to: Vec2 = [from[0] + v[0], from[1] + v[1]];
  const ax = sx(from), ay = sy(from), bx = sx(to), by = sy(to);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  const ang = Math.atan2(by - ay, bx - ax), h = 11;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx - h * Math.cos(ang - 0.4), by - h * Math.sin(ang - 0.4));
  ctx.lineTo(bx - h * Math.cos(ang + 0.4), by - h * Math.sin(ang + 0.4));
  ctx.closePath(); ctx.fill();
  ctx.font = 'bold 14px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + 12 * Math.cos(ang), by + 12 * Math.sin(ang));
}

function draw(): void {
  const W = window.innerWidth, H = window.innerHeight;
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = 'round';
  const d = data[idx];
  const { triang, layout } = d;
  const dom = d.dom;
  const F = triang.triangles.length;

  // ---- universal-cover patch covering the visible window ----
  const win = { x0: wx(0), x1: wx(W), y0: wy(H), y1: wy(0) };
  const ext = Math.max(win.x1 - win.x0, win.y1 - win.y0);
  const vmin = Math.min(Math.hypot(...layout.V1), Math.hypot(...layout.V2)) || 1;
  const range = Math.min(40, Math.ceil(ext / vmin) + 2);
  const tiles = periodicTiles(layout, win, range);

  // faint tiling, colored by base triangle id (so repeats are legible)
  for (const t of tiles) {
    poly(t.corners);
    ctx.fillStyle = `hsla(${hue(t.id, F)}, 60%, 60%, 0.10)`; ctx.fill();
    ctx.strokeStyle = `hsla(${hue(t.id, F)}, 55%, 70%, 0.30)`; ctx.lineWidth = 0.8; ctx.stroke();
  }
  if (showTriIds && tiles.length <= 450) {
    ctx.font = '10px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of tiles) {
      const g = cen(t.corners);
      ctx.fillStyle = `hsla(${hue(t.id, F)}, 70%, 80%, 0.55)`;
      ctx.fillText(String(t.id), sx(g), sy(g));
    }
  }

  // ---- the minimal fundamental domain, highlighted ----
  if (showDomain) {
    for (const t of dom) {
      poly(t.corners);
      ctx.fillStyle = `hsla(${hue(t.id, F)}, 70%, 55%, 0.48)`; ctx.fill();
      ctx.strokeStyle = `hsla(${hue(t.id, F)}, 85%, 78%, 0.95)`; ctx.lineWidth = 1.8; ctx.stroke();
      const g = cen(t.corners);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(t.id), sx(g), sy(g));
    }
    if (showVtxIds) {
      const seen = new Set<string>();
      ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const t of dom) {
        const tri = triang.triangles[t.id];
        for (let k = 0; k < 3; k++) {
          const x = sx(t.corners[k]), y = sy(t.corners[k]);
          const key = `${x.toFixed(1)},${y.toFixed(1)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          ctx.fillStyle = '#0e0e12'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 2 * Math.PI); ctx.fill();
          ctx.strokeStyle = 'rgba(220,225,240,0.45)'; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = 'rgba(235,240,255,0.95)'; ctx.fillText(String(tri[k]), x, y);
        }
      }
    }
  }

  // ---- period-lattice vectors V₁, V₂ from the domain centroid ----
  if (showLattice) {
    let ax = 0, ay = 0;
    for (const t of dom) { const g = cen(t.corners); ax += g[0]; ay += g[1]; }
    const anchor: Vec2 = [ax / dom.length, ay / dom.length];
    arrow(anchor, layout.V1, '#f0be5a', 'V₁');
    arrow(anchor, layout.V2, '#6fd1a0', 'V₂');
  }

  // ---- HUD ----
  const lines = [
    `torus ${triang.id}  ${triang.name}   V=${triang.vertexCount}  deg=[${triang.degreeSequence}]   (↑ ↓ switch)`,
    `minimal fundamental domain · exposed edges ${d.ext} (cut ${d.ext / 2})  ·  ${tiles.length} tiles shown`,
    `[drag · scroll · d domain ${showDomain ? '✓' : '·'} · l lattice ${showLattice ? '✓' : '·'} · t tri-ids ${showTriIds ? '✓' : '·'} · v vtx-ids ${showVtxIds ? '✓' : '·'} · r reset]`,
  ];
  ctx.font = '13px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  let yy = 22;
  for (const L of lines) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(L, 13, yy + 1);
    ctx.fillStyle = '#e8e8ec'; ctx.fillText(L, 12, yy);
    yy += 19;
  }
}

// ---- interaction ----
let dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.style.cursor = 'grabbing'; });
window.addEventListener('mouseup', () => { dragging = false; canvas.style.cursor = 'grab'; });
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  cx -= (e.clientX - lastX) / scale; cy += (e.clientY - lastY) / scale;
  lastX = e.clientX; lastY = e.clientY; draw();
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const k = Math.exp(-e.deltaY * 0.0015);
  const pX = wx(e.clientX), pY = wy(e.clientY);
  scale *= k;
  cx = pX - (e.clientX - window.innerWidth / 2) / scale;
  cy = pY + (e.clientY - window.innerHeight / 2) / scale;
  draw();
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    idx = (idx + (e.key === 'ArrowUp' ? -1 : 1) + data.length) % data.length;
    fitDomain(); draw(); e.preventDefault();
  } else if (e.key === 'd') { showDomain = !showDomain; draw(); }
  else if (e.key === 'l') { showLattice = !showLattice; draw(); }
  else if (e.key === 't') { showTriIds = !showTriIds; draw(); }
  else if (e.key === 'v') { showVtxIds = !showVtxIds; draw(); }
  else if (e.key === 'r') { fitDomain(); draw(); }
});

fitDomain();
resize();
