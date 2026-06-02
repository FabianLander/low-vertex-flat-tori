/**
 * Develop demo — abstract torus (left) vs. its developing map (right).
 *
 * LEFT: the abstract combinatorial fundamental domain (fixed equilateral tiles,
 *       latticeLayout.hexDomain). As we unfold, each triangle is shaded by
 *       status — done / currently-adding (gold) / not-yet — so you can watch
 *       which abstract triangle is being placed.
 * RIGHT: the same torus actually developed into the plane with its real
 *        intrinsic edge lengths, revealed one triangle at a time in
 *        DEVELOP_ORDER. The first six fan around vertex 2 and close to 2π.
 *
 * Controls:  Space play/pause · ←/→ step · ↑/↓ switch torus · r reset
 * Reads data/explore-from-seeds/seeds.csv (the 7 found tori).
 */

import seedsRaw from '../../data/explore-from-seeds/seeds.csv?raw';
import { RICH } from '../../src/tori';
import { developNet, modulus, reduceModulus, type V2 } from '../../src/math/develop';
import { latticeLayout, type Tile, type XY } from '../../src/math/latticeLayout';

const DEVELOP_ORDER = RICH.developOrder;
const lattice = latticeLayout(RICH);
// Unfold the metric net with the SAME gluing the lattice picture uses, so the
// developed net (right) matches the abstract net (left) triangle-for-triangle.
const ATTACH = lattice.developAttach(DEVELOP_ORDER);

const DIM = RICH.vertexCount * 3;
const STEP_MS = 500;
const HOLD_MS = 1000; // pause on the finished net before restarting

function parse(text: string): Float64Array[] {
  const rows: Float64Array[] = [];
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    const nums = s.split(',').map(Number);
    if (nums.length === DIM) rows.push(Float64Array.from(nums));
  }
  return rows;
}

const tori = parse(seedsRaw);

// abstract picture (fixed for all tori)
const ABSTRACT: Tile[] = lattice.hexDomain();
const ABSTRACT_VERTS = lattice.vertexLabels(ABSTRACT);

// ---- state ----
let torusIdx = 0;
let step = 1;            // triangles revealed (1..16)
let playing = true;
let net = developNet(RICH, tori[torusIdx], ATTACH);
let mod = modulus(RICH, tori[torusIdx]);
const reload = () => { net = developNet(RICH, tori[torusIdx], ATTACH); mod = modulus(RICH, tori[torusIdx]); };

// ---- canvas ----
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
type Fit = { sx: (p: V2 | XY) => number; sy: (p: V2 | XY) => number };

function fit(pts: ReadonlyArray<V2 | XY>, rect: Rect, margin = 70): Fit {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const scale = Math.min((rect.w - 2 * margin) / (maxX - minX || 1), (rect.h - 2 * margin) / (maxY - minY || 1));
  const ox = rect.x + (rect.w - scale * (minX + maxX)) / 2;
  const oy = rect.y + (rect.h + scale * (minY + maxY)) / 2;
  return { sx: (p) => ox + scale * p[0], sy: (p) => oy - scale * p[1] };
}

function tri(f: Fit, P: ArrayLike<V2 | XY>): void {
  ctx.beginPath();
  ctx.moveTo(f.sx(P[0]), f.sy(P[0]));
  ctx.lineTo(f.sx(P[1]), f.sy(P[1]));
  ctx.lineTo(f.sx(P[2]), f.sy(P[2]));
  ctx.closePath();
}

function label(f: Fit, P: ArrayLike<V2 | XY>, txt: string, color: string, size: number, bold = false): void {
  const mx = (f.sx(P[0]) + f.sx(P[1]) + f.sx(P[2])) / 3;
  const my = (f.sy(P[0]) + f.sy(P[1]) + f.sy(P[2])) / 3;
  ctx.fillStyle = color;
  ctx.font = `${bold ? 'bold ' : ''}${size}px system-ui`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, mx, my);
}

function draw(): void {
  const W = window.innerWidth, H = window.innerHeight;
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = 'round';

  const currentT = DEVELOP_ORDER[step - 1];
  const done = new Set(DEVELOP_ORDER.slice(0, step));

  // ─── LEFT: abstract torus ───
  const leftRect: Rect = { x: 0, y: 0, w: W / 2, h: H };
  const fL = fit(ABSTRACT.flatMap((t) => t.P), leftRect);
  for (const t of ABSTRACT) {
    const isCur = t.id === currentT, isDone = done.has(t.id);
    tri(fL, t.P);
    ctx.fillStyle = isCur ? 'rgba(240,190,90,0.55)' : isDone ? 'rgba(90,155,255,0.20)' : 'rgba(140,150,180,0.05)';
    ctx.fill();
    ctx.strokeStyle = isCur ? '#f0be5a' : isDone ? 'rgba(120,160,230,0.6)' : 'rgba(120,128,150,0.35)';
    ctx.lineWidth = isCur ? 2.5 : 1.2; ctx.stroke();
    label(fL, t.P, String(t.id), isCur ? '#ffe6ad' : isDone ? 'rgba(210,225,255,0.9)' : 'rgba(150,160,185,0.5)', 15, isCur);
  }
  ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(220,225,240,0.6)';
  for (const { pos, id } of ABSTRACT_VERTS) ctx.fillText(String(id), fL.sx(pos) + 3, fL.sy(pos) - 3);

  // ─── RIGHT: developed image (revealed up to step) ───
  const rightRect: Rect = { x: W / 2, y: 0, w: W / 2, h: H };
  const fR = fit(net.corners.flat(), rightRect); // stable: fit to full net
  const shown = net.steps.slice(0, step);
  for (const { t } of shown) {
    const isCur = t === currentT;
    tri(fR, net.corners[t]);
    ctx.fillStyle = isCur ? 'rgba(240,190,90,0.45)' : 'rgba(90,155,255,0.16)';
    ctx.fill();
    ctx.strokeStyle = isCur ? '#f0be5a' : 'rgba(120,160,230,0.5)';
    ctx.lineWidth = isCur ? 2.5 : 1.2; ctx.stroke();
    label(fR, net.corners[t], String(t), isCur ? '#ffe6ad' : 'rgba(210,225,255,0.85)', 14, isCur);
  }
  ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(220,225,240,0.65)';
  for (const { t } of shown) {
    const trv = RICH.triangles[t];
    for (let k = 0; k < 3; k++) { const P = net.corners[t][k]; ctx.fillText(String(trv[k]), fR.sx(P) + 3, fR.sy(P) - 3); }
  }

  // divider + panel titles
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
  ctx.fillStyle = 'rgba(230,230,236,0.85)'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('abstract torus', W / 4, H - 16);
  ctx.fillText('developed', 3 * W / 4, H - 16);

  // HUD
  const cur = shown.length ? shown[shown.length - 1] : null;
  const placing = cur && cur.parent >= 0
    ? `placing T${cur.t} onto T${cur.parent} across edge ${cur.edge[0]}–${cur.edge[1]}`
    : `root T${DEVELOP_ORDER[0]}`;
  const red = reduceModulus(mod.tau);
  const lines = [
    `seeds.csv  torus ${torusIdx + 1}/${tori.length}  (↑ ↓)    step ${step}/16  —  ${placing}`,
    `[Space ${playing ? 'pause' : 'play'} · ← → step · r reset]    τ = ${fmt(mod.tau)}   τ̂ = ${fmt(red)}`,
  ];
  ctx.font = '13px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  let yy = 22;
  for (const L of lines) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(L, 13, yy + 1);
    ctx.fillStyle = '#e8e8ec'; ctx.fillText(L, 12, yy);
    yy += 19;
  }
}

function fmt(z: V2): string {
  return `${z[0].toFixed(4)} ${z[1] >= 0 ? '+' : '−'} ${Math.abs(z[1]).toFixed(4)} i`;
}

// ---- animation ----
let lastT = 0;
function tick(now: number): void {
  const delay = step >= 16 ? HOLD_MS : STEP_MS; // linger on the completed net
  if (playing && now - lastT > delay) { lastT = now; step = step >= 16 ? 1 : step + 1; draw(); }
  requestAnimationFrame(tick);
}

// ---- controls ----
window.addEventListener('keydown', (e) => {
  if (e.key === ' ') { playing = !playing; draw(); e.preventDefault(); }
  else if (e.key === 'ArrowRight') { playing = false; step = Math.min(16, step + 1); draw(); }
  else if (e.key === 'ArrowLeft') { playing = false; step = Math.max(1, step - 1); draw(); }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    torusIdx = (torusIdx + (e.key === 'ArrowUp' ? -1 : 1) + tori.length) % tori.length;
    reload(); draw(); e.preventDefault();
  } else if (e.key === 'r') { step = 1; draw(); }
});

resize();
requestAnimationFrame(tick);
