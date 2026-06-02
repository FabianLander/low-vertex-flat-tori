/**
 * Develop-grid demo — the full story per torus, in a grid:
 *
 *   INTRO (auto on load):
 *     · unfold the 16 triangles one at a time (DEVELOP_ORDER),
 *     · then draw the two holonomy generator edge-paths (blue, red) on the net.
 *
 *   MORPH (Space toggles, reversible):
 *     · pull the bent edge-paths tight into straight holonomy vectors,
 *     · complete the parallelogram (ℝ²/Λ),
 *     · rotate so the blue edge lands on the x-axis,
 *     · rescale (blue → unit, shared across cells) and center.
 *
 * Blue/red are ordered so the basis is positively oriented (τ ∈ ℍ); the morph
 * is then a pure rotate+scale similarity. Space also skips the intro. r replays.
 * Reads data/explore-from-seeds/seeds.csv.
 */

import seedsRaw from '../../data/walk4u-new-000.csv?raw';
import { VERTEX_COUNT } from '../../src/math/topology';
import { developNet, generatorPaths, type V2 } from '../../src/math/develop';

const DIM = VERTEX_COUNT * 3;
const BLUE = '#3b82f6', RED = '#ef4444';
const INTRO_MS = 3200, MORPH_MS = 1900;
const DEV_ZOOM = 3;   // uniform magnification of the developed view (all unit-area, so safe to scale up together)

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

const cross = (a: V2, b: V2) => a[0] * b[1] - a[1] * b[0];
const cdiv = (a: V2, b: V2): V2 => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (x: number) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const clamp01 = (x: number) => x < 0 ? 0 : x > 1 ? 1 : x;

const tori = parse(seedsRaw);
const data = tori.map((p) => {
  const net = developNet(p);
  const g = generatorPaths(net);
  const base = g[0][0];
  const hA: V2 = [g[0].at(-1)![0] - base[0], g[0].at(-1)![1] - base[1]];
  const hB: V2 = [g[1].at(-1)![0] - base[0], g[1].at(-1)![1] - base[1]];
  // order so (v1,v2) positively oriented ⇒ τ ∈ ℍ; blue follows v1, red v2
  const pos = cross(hA, hB) > 0;
  const bluePath = pos ? g[0] : g[1], redPath = pos ? g[1] : g[0];
  const v1 = pos ? hA : hB, v2 = pos ? hB : hA;
  const tau = cdiv(v2, v1);
  const U: V2[] = [[0, 0], [1, 0], [1 + tau[0], -tau[1]], [tau[0], -tau[1]]]; // screen-oriented (red up)
  const cU: V2 = [(U[0][0] + U[1][0] + U[2][0] + U[3][0]) / 4, (U[0][1] + U[1][1] + U[2][1] + U[3][1]) / 4];
  // net centroid + farthest corner from the vertex-0 anchor (for a shared, to-scale fit)
  let radius = 0, cx0 = 0, cy0 = 0, cnt = 0;
  for (const tri of net.corners) for (const c of tri) {
    radius = Math.max(radius, Math.hypot(c[0] - base[0], c[1] - base[1]));
    cx0 += c[0]; cy0 += c[1]; cnt++;
  }
  const cen: V2 = [cx0 / cnt, cy0 / cnt];
  return { net, base, bluePath, redPath, v1, tau, U, cU, radius, cen };
});

const halfExt = data.reduce((acc, d) => {
  for (const c of d.U) { acc.w = Math.max(acc.w, Math.abs(c[0] - d.cU[0])); acc.h = Math.max(acc.h, Math.abs(c[1] - d.cU[1])); }
  return acc;
}, { w: 0, h: 0 });

// One shared scale for the developed view, so equal-area tori render the same
// size. Sized so the largest net fits a cell when anchored at vertex 0.
const maxRadius = Math.max(1e-9, ...data.map((d) => d.radius));
// Average offset from vertex 0 to the net centroid. We anchor (vertex0 + this)
// at the cell center, so the bodies sit centered while vertex 0 stays a fixed,
// co-located point across all cells.
const meanOff: V2 = (() => {
  let ox = 0, oy = 0;
  for (const d of data) { ox += d.cen[0] - d.base[0]; oy += d.cen[1] - d.base[1]; }
  return [ox / data.length, oy / data.length];
})();

// ---- animation state ----
let intro = 0;        // 0→1 auto: triangles unfold then holonomy draws
let morph = 0, morphTarget = 0;  // 0 = developed+holonomy, 1 = parallelogram

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
}
window.addEventListener('resize', resize);

// ---- actions (shared by keys and on-screen buttons) ----
function primary(): void {
  morphTarget = morphTarget === 0 ? 1 : 0;       // toggle developed ⇄ parallelogram
}
function replay(): void { intro = 0; morph = 0; morphTarget = 0; }

// ---- on-screen, touch-friendly controls ----
const ui = document.createElement('div');
ui.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:10px;z-index:10';
const mkBtn = (label: string, fn: () => void): HTMLButtonElement => {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.cssText = [
    'font:600 15px/1 system-ui,sans-serif', 'color:#e8e8ec', 'background:rgba(40,44,54,0.9)',
    'border:1px solid #4a5060', 'border-radius:10px', 'padding:12px 18px', 'cursor:pointer',
    'min-width:140px', '-webkit-tap-highlight-color:transparent', 'touch-action:manipulation',
  ].join(';');
  b.addEventListener('click', () => { fn(); b.blur(); });
  return b;
};
const replayBtn = mkBtn('↻', replay);
replayBtn.style.minWidth = '52px';
const primaryBtn = mkBtn('', primary);
ui.append(replayBtn, primaryBtn);
document.body.appendChild(ui);
function syncButtons(): void {
  // label shows the FD you'll switch to
  primaryBtn.textContent = morphTarget === 0 ? 'Parallelogram FD ▶' : '◀ Combinatorial FD';
}

type Fit = { sx: (p: V2) => number; sy: (p: V2) => number; scale: number };

/** Developed-view transform: SHARED scale across all cells (so equal-area tori
 *  render the same size), with vertex 0's base copy anchored at the cell center
 *  (so vertex 0 — and both generators' start — sit in the same place in every
 *  cell). y is flipped (math up). */
function devFit(base: V2, cx: number, cy: number, cw: number, ch: number, m: number): Fit {
  const scale = DEV_ZOOM * (Math.min(cw, ch) / 2 - m) / maxRadius;
  const acx = cx + cw / 2, acy = cy + ch / 2;
  // anchor (vertex0 + meanOff) at the cell center: bodies centered on average,
  // vertex 0 still a fixed co-located point.
  return {
    sx: (p) => acx + scale * (p[0] - base[0] - meanOff[0]),
    sy: (p) => acy - scale * (p[1] - base[1] - meanOff[1]),
    scale,
  };
}

function drawPathTight(path: V2[], tight: number, color: string, alpha: number, f: Fit): void {
  const last = path.length - 1;
  ctx.beginPath();
  for (let i = 0; i <= last; i++) {
    const sx = lerp(path[0][0], path[last][0], i / last), sy = lerp(path[0][1], path[last][1], i / last);
    const px = lerp(path[i][0], sx, tight), py = lerp(path[i][1], sy, tight);
    const X = f.sx([px, py]), Y = f.sy([px, py]);
    if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
  }
  ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke(); ctx.globalAlpha = 1;
}

function drawCell(d: typeof data[number], cx: number, cy: number, cw: number, ch: number): void {
  const f = devFit(d.base, cx, cy, cw, ch, 36);
  const introDone = intro >= 1;

  // reveal count + mesh alpha
  const revealCount = morph > 0 || introDone ? 16 : Math.max(1, Math.round((intro / 0.85) * 16));
  const meshAlpha = morph > 0 ? 1 - smooth(morph / 0.4) : 1;

  // mesh
  if (meshAlpha > 0.01) {
    const shown = d.net.steps.slice(0, Math.min(revealCount, 16));
    for (const { t } of shown) {
      const [A, B, C] = d.net.corners[t];
      const cur = !introDone && morph === 0 && t === shown[shown.length - 1].t;
      ctx.beginPath(); ctx.moveTo(f.sx(A), f.sy(A)); ctx.lineTo(f.sx(B), f.sy(B)); ctx.lineTo(f.sx(C), f.sy(C)); ctx.closePath();
      ctx.fillStyle = cur ? `rgba(240,190,90,${0.4 * meshAlpha})` : `rgba(150,160,190,${0.10 * meshAlpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(150,160,190,${0.32 * meshAlpha})`; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  if (morph < 0.3) {
    // holonomy edge-paths (bent → straightening), fading in at end of intro
    const holAlpha = morph > 0 ? 1 : smooth((intro - 0.85) / 0.15);
    if (holAlpha > 0.01) {
      const tight = smooth(clamp01(morph / 0.3));
      drawPathTight(d.bluePath, tight, BLUE, holAlpha, f);
      drawPathTight(d.redPath, tight, RED, holAlpha, f);
    }
  } else {
    // parallelogram via similarity M(U): raw (on mesh) → rotate → rescale/center
    const S = Math.min((cw / 2 - 36) / (halfExt.w || 1), (ch / 2 - 36) / (halfExt.h || 1));
    const sRaw = f.scale * Math.hypot(d.v1[0], d.v1[1]);
    const phiRaw = Math.atan2(-d.v1[1], d.v1[0]);
    const Oraw: V2 = [f.sx(d.base), f.sy(d.base)];
    const Ofin: V2 = [cx + cw / 2 - S * d.cU[0], cy + ch / 2 - S * d.cU[1]];
    const aRot = smooth(clamp01((morph - 0.3) / 0.35));
    const aSca = smooth(clamp01((morph - 0.65) / 0.35));
    const phi = phiRaw * (1 - aRot);
    const s = lerp(sRaw, S, aSca);
    const O: V2 = [lerp(Oraw[0], Ofin[0], aSca), lerp(Oraw[1], Ofin[1], aSca)];
    const cos = Math.cos(phi), sin = Math.sin(phi);
    const M = (c: V2): V2 => [O[0] + s * (cos * c[0] - sin * c[1]), O[1] + s * (sin * c[0] + cos * c[1])];
    const P = d.U.map(M);
    const fillA = smooth(clamp01((morph - 0.3) / 0.15));
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath();
    ctx.globalAlpha = fillA; ctx.fillStyle = 'rgba(150,160,190,0.12)'; ctx.fill();
    ctx.strokeStyle = 'rgba(150,160,190,0.4)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); ctx.lineTo(P[1][0], P[1][1]); ctx.strokeStyle = BLUE; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); ctx.lineTo(P[3][0], P[3][1]); ctx.strokeStyle = RED; ctx.lineWidth = 4; ctx.stroke();
  }
}

function draw(): void {
  const W = window.innerWidth, H = window.innerHeight;
  ctx.clearRect(0, 0, W, H);
  const n = data.length;
  const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
  const cw = W / cols, ch = H / rows;
  for (let i = 0; i < n; i++) {
    const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
    drawCell(data[i], cx, cy, cw, ch);
    const tau = data[i].tau;
    ctx.fillStyle = 'rgba(232,232,236,0.9)'; ctx.font = '12px ui-monospace, monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`#${i + 1}  τ=${tau[0].toFixed(3)}${tau[1] >= 0 ? '+' : '−'}${Math.abs(tau[1]).toFixed(3)}i`, cx + 8, cy + 6);
  }
}

let prev = -1;
function frame(now: number): void {
  if (prev < 0) prev = now;
  const dt = now - prev; prev = now;
  if (intro < 1) intro = clamp01(intro + dt / INTRO_MS);
  else if (morph !== morphTarget) {
    const dir = morphTarget > morph ? 1 : -1;
    morph = clamp01(morph + dir * dt / MORPH_MS);
    if ((dir > 0 && morph >= morphTarget) || (dir < 0 && morph <= morphTarget)) morph = morphTarget;
  }
  syncButtons();
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener('keydown', (e) => {
  if (e.key === ' ') { primary(); e.preventDefault(); }
  else if (e.key === 'r') { replay(); }
});

resize();
requestAnimationFrame(frame);
