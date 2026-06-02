/**
 * Develop-winding — every 8-vertex flat torus developed into the plane as its
 * abstract (harmonic) fundamental domain, revealed one triangle at a time in a
 * continuous WINDING order that spirals outward from the central triangle.
 *
 * Works for all 7 combinatorial types: #7 comes out as the equilateral lattice;
 * the other six are their harmonic flat structures (genuinely non-equilateral,
 * since they have degree-5/7 vertices). Each triangle glues onto an
 * already-placed coincident neighbor, so the net grows connectedly.
 *
 * Controls:  ↑/↓ switch torus · ←/→ step · Space play/pause · r reset · v labels
 */

import { ALL_TORI } from '../../src/tori/index';
import { harmonicLayout, windingNet, type WindingNet, type XY } from '../../src/math/harmonicLayout';

const STEP_MS = 380;
const HOLD_MS = 1100;

const nets: WindingNet[] = ALL_TORI.map((t) => windingNet(t, harmonicLayout(t)));

let idx = ALL_TORI.length - 1; // start on Rich (#7)
let step = 1;
let playing = true;
let showLabels = true;

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

type Fit = { sx: (p: XY) => number; sy: (p: XY) => number };
function fit(pts: XY[], W: number, H: number, margin = 100): Fit {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const scale = Math.min((W - 2 * margin) / (maxX - minX || 1), (H - 2 * margin) / (maxY - minY || 1));
  const ox = (W - scale * (minX + maxX)) / 2;
  const oy = (H + scale * (minY + maxY)) / 2;
  return { sx: (p) => ox + scale * p[0], sy: (p) => oy - scale * p[1] };
}

function draw(): void {
  const W = window.innerWidth, H = window.innerHeight;
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = 'round';

  const torus = ALL_TORI[idx];
  const net = nets[idx];
  const byId = new Map(net.tiles.map((t) => [t.id, t]));
  const f = fit(net.tiles.flatMap((t) => t.corners), W, H); // stable: fit full domain

  const currentT = net.order[step - 1];
  const shown = net.order.slice(0, step);
  const shownSet = new Set(shown);

  // faint outline of the not-yet-placed tiles, for context
  for (const tile of net.tiles) {
    if (shownSet.has(tile.id)) continue;
    poly(f, tile.corners);
    ctx.fillStyle = 'rgba(140,150,180,0.035)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,128,150,0.18)'; ctx.lineWidth = 0.8; ctx.stroke();
  }

  // placed tiles (in winding order)
  for (const id of shown) {
    const tile = byId.get(id)!;
    const isCur = id === currentT;
    poly(f, tile.corners);
    ctx.fillStyle = isCur ? 'rgba(240,190,90,0.55)' : 'rgba(90,155,255,0.18)';
    ctx.fill();
    ctx.strokeStyle = isCur ? '#f0be5a' : 'rgba(150,185,255,0.7)';
    ctx.lineWidth = isCur ? 2.6 : 1.2; ctx.stroke();
    const m = centroidPx(f, tile.corners);
    ctx.fillStyle = isCur ? '#ffe6ad' : 'rgba(210,225,255,0.85)';
    ctx.font = `${isCur ? 'bold ' : ''}14px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(id), m.x, m.y);
  }

  // vertex labels at unique placed corner positions
  if (showLabels) {
    const seen = new Set<string>();
    ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const id of shown) {
      const tile = byId.get(id)!;
      const tri = torus.triangles[id];
      for (let k = 0; k < 3; k++) {
        const x = f.sx(tile.corners[k]), y = f.sy(tile.corners[k]);
        const key = `${x.toFixed(1)},${y.toFixed(1)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        ctx.fillStyle = '#0e0e12'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 2 * Math.PI); ctx.fill();
        ctx.strokeStyle = 'rgba(220,225,240,0.45)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = 'rgba(235,240,255,0.95)'; ctx.fillText(String(tri[k]), x, y);
      }
    }
  }

  // HUD
  const cur = net.steps[step - 1];
  const placing = cur.parent >= 0
    ? `placing T${cur.t} onto T${cur.parent} across edge ${cur.edge[0]}–${cur.edge[1]}`
    : `root T${cur.t}`;
  const lines = [
    `torus ${torus.id}/7  ${torus.name}   deg=[${torus.degreeSequence}]   (↑ ↓ switch)`,
    `winding develop  step ${step}/16  —  ${placing}`,
    `[← → step · Space ${playing ? 'pause' : 'play'} · r reset · v labels]`,
  ];
  ctx.font = '13px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  let yy = 22;
  for (const L of lines) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(L, 13, yy + 1);
    ctx.fillStyle = '#e8e8ec'; ctx.fillText(L, 12, yy);
    yy += 19;
  }
}

function poly(f: Fit, c: XY[]): void {
  ctx.beginPath();
  ctx.moveTo(f.sx(c[0]), f.sy(c[0]));
  ctx.lineTo(f.sx(c[1]), f.sy(c[1]));
  ctx.lineTo(f.sx(c[2]), f.sy(c[2]));
  ctx.closePath();
}
function centroidPx(f: Fit, c: XY[]): { x: number; y: number } {
  return { x: (f.sx(c[0]) + f.sx(c[1]) + f.sx(c[2])) / 3, y: (f.sy(c[0]) + f.sy(c[1]) + f.sy(c[2])) / 3 };
}

let lastT = 0;
function tick(now: number): void {
  const delay = step >= 16 ? HOLD_MS : STEP_MS;
  if (playing && now - lastT > delay) { lastT = now; step = step >= 16 ? 1 : step + 1; draw(); }
  requestAnimationFrame(tick);
}

window.addEventListener('keydown', (e) => {
  if (e.key === ' ') { playing = !playing; draw(); e.preventDefault(); }
  else if (e.key === 'ArrowRight') { playing = false; step = Math.min(16, step + 1); draw(); }
  else if (e.key === 'ArrowLeft') { playing = false; step = Math.max(1, step - 1); draw(); }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    idx = (idx + (e.key === 'ArrowUp' ? -1 : 1) + ALL_TORI.length) % ALL_TORI.length;
    step = 1; draw(); e.preventDefault();
  } else if (e.key === 'r') { step = 1; draw(); }
  else if (e.key === 'v') { showLabels = !showLabels; draw(); }
});

resize();
requestAnimationFrame(tick);
