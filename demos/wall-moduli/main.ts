/**
 * wall-moduli — the night3 search outputs as points in TEICHMÜLLER space ℍ.
 *
 * We collected flat embedded tori along two walls of moduli space: the
 * rectangular wall Re τ̂ = 0 (rect-*) and the rhombic wall |Re τ̂| = ½ (push-*,
 * wall-*). Those certificates recorded the REDUCED modulus τ̂. Here we plot the
 * raw TEICHMÜLLER point τ = v₂/v₁ that develop() reads off the marked holonomy
 * (precomputed by scripts/teich-moduli.mjs; ./data here is a tracked snapshot,
 * with the dense rect families subsampled to ~12k points). The rect family lives in
 * the standard fundamental domain so τ = τ̂ there; the rhombic-wall trajectories
 * develop to τ that wanders BELOW the unit circle and across neighbouring
 * copies of the domain — which is the whole point of looking unreduced.
 *
 * The standard SL(2,ℤ) fundamental domain (|Re τ| ≤ ½, |τ| ≥ 1) is drawn faintly
 * as a fixed reference. Each input file is one colored class.
 *
 * Interaction: scroll to zoom, drag to pan, click a legend row to toggle a
 * class, hover to read τ + cone deficit (flatness) + embedding margin.
 * r = reset to the fundamental-domain view, f = fit all points (rect reaches
 * Im ≈ 55, so the default view does NOT fit everything).
 */

// Each teich/*.csv is one class: rows of "reTau,imTau,coneDeficit,margin".
const files = import.meta.glob('./data/*.csv', {
  eager: true, query: '?raw', import: 'default',
}) as Record<string, string>;

// Fixed family colors + display order (rect first, then the rhombic wall).
const STYLE: Record<string, { color: string; order: number; label: string }> = {
  'rect-t7': { color: '#3b82f6', order: 0, label: 'rect · type 7 (Rich)   Re τ̂ = 0' },
  'rect-t3': { color: '#06b6d4', order: 1, label: 'rect · type 3          Re τ̂ = 0' },
  'push-t7': { color: '#ef4444', order: 2, label: 'push · type 7          |Re τ̂| = ½' },
  'push-t3': { color: '#f97316', order: 3, label: 'push · type 3          |Re τ̂| = ½' },
  'wall-t4': { color: '#facc15', order: 4, label: 'wall · type 4          → |Re τ̂| = ½' },
  'wall-t5': { color: '#22c55e', order: 5, label: 'wall · type 5          → |Re τ̂| = ½' },
  'wall-t6': { color: '#a855f7', order: 6, label: 'wall · type 6          → |Re τ̂| = ½' },
};
const FALLBACK = '#9ca3af';

type Klass = {
  name: string; color: string; label: string; visible: boolean;
  // parallel arrays, one entry per torus
  re: Float64Array; im: Float64Array; cone: Float64Array; margin: Float64Array;
  n: number;
};

function parseClass(name: string, text: string): Klass {
  const re: number[] = [], im: number[] = [], cone: number[] = [], margin: number[] = [];
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s || /^[a-zA-Z]/.test(s)) continue; // skip header / blanks
    const p = s.split(',');
    if (p.length < 4) continue;
    re.push(+p[0]); im.push(+p[1]); cone.push(+p[2]); margin.push(+p[3]);
  }
  const st = STYLE[name];
  return {
    name, color: st?.color ?? FALLBACK, label: st?.label ?? name, visible: true,
    re: Float64Array.from(re), im: Float64Array.from(im),
    cone: Float64Array.from(cone), margin: Float64Array.from(margin), n: re.length,
  };
}

const classes: Klass[] = Object.keys(files)
  .map((path) => path.match(/([^/]+)\.csv$/)![1])
  .sort((a, b) => (STYLE[a]?.order ?? 99) - (STYLE[b]?.order ?? 99))
  .map((name) => parseClass(name, files[`./data/${name}.csv`]));

const totalPts = classes.reduce((s, c) => s + c.n, 0);

// data bounds over all τ (used by the 'f' = fit-all key)
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
canvas.style.cssText = 'display:block;width:100vw;height:100vh;background:#0e0e12;cursor:grab';
document.body.style.margin = '0';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d')!;

// Static layer (axes + points + legend) is cached here and only rebuilt on view
// change / toggle; hover just blits this and draws a tooltip on top.
const layer = document.createElement('canvas');
const lctx = layer.getContext('2d')!;

// ---- view transform: equal-aspect, plane → screen ----
let scale = 1, cx = 0, cy = 1.4;
function setView(minRe: number, maxRe: number, minIm: number, maxIm: number): void {
  const W = window.innerWidth, H = window.innerHeight, m = 70;
  const spanX = (maxRe - minRe) || 1, spanY = (maxIm - minIm) || 1;
  scale = Math.min((W - 2 * m) / spanX, (H - 2 * m) / spanY);
  cx = (minRe + maxRe) / 2; cy = (minIm + maxIm) / 2;
}
// default = the fundamental-domain neighbourhood (rect spikes far above this)
const homeView = () => setView(-1.05, 1.05, 0.35, 3.1);
const fitAll = () => setView(dataBounds.minRe, dataBounds.maxRe, dataBounds.minIm, dataBounds.maxIm);

const sx = (re: number) => window.innerWidth / 2 + (re - cx) * scale;
const sy = (im: number) => window.innerHeight / 2 - (im - cy) * scale;
const planeX = (px: number) => cx + (px - window.innerWidth / 2) / scale;
const planeY = (py: number) => cy - (py - window.innerHeight / 2) / scale;

// ---- the static layer: axes, fundamental domain, points, legend ----
function niceStep(spanUnits: number): number {
  const raw = spanUnits / 8;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * pow;
}

function drawAxes(c: CanvasRenderingContext2D): void {
  const W = window.innerWidth, H = window.innerHeight;
  const left = planeX(0), right = planeX(W), top = planeY(0), bot = planeY(H);
  const step = niceStep(right - left);
  c.lineWidth = 1;
  c.font = '11px ui-monospace, monospace';
  c.textBaseline = 'top';
  for (let re = Math.ceil(left / step) * step; re <= right; re += step) {
    const X = sx(re);
    c.strokeStyle = Math.abs(re) < step / 2 ? 'rgba(150,160,190,0.30)' : 'rgba(150,160,190,0.08)';
    c.beginPath(); c.moveTo(X, 0); c.lineTo(X, H); c.stroke();
    c.fillStyle = 'rgba(180,186,200,0.5)'; c.textAlign = 'center';
    c.fillText(re.toFixed(2), X, H - 16);
  }
  for (let im = Math.max(step, Math.ceil(Math.max(bot, 0) / step) * step); im <= top; im += step) {
    const Y = sy(im);
    c.strokeStyle = 'rgba(150,160,190,0.08)';
    c.beginPath(); c.moveTo(0, Y); c.lineTo(W, Y); c.stroke();
    c.fillStyle = 'rgba(180,186,200,0.5)'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(`${im.toFixed(2)}i`, 6, Y); c.textBaseline = 'top';
  }
  // SL(2,ℤ) fundamental domain: walls Re = ±½ (up from the arc) and the arc |τ| = 1.
  c.strokeStyle = 'rgba(240,200,120,0.5)';
  c.setLineDash([5, 5]); c.lineWidth = 1.3;
  for (const wall of [-0.5, 0.5]) {
    const X = sx(wall);
    c.beginPath(); c.moveTo(X, sy(Math.sin(Math.PI / 3))); c.lineTo(X, 0); c.stroke();
  }
  c.beginPath();
  for (let k = 0; k <= 96; k++) {
    const re = -0.5 + k / 96;
    const X = sx(re), Y = sy(Math.sqrt(1 - re * re));
    if (k === 0) c.moveTo(X, Y); else c.lineTo(X, Y);
  }
  c.stroke();
  c.setLineDash([]);
}

function drawPoints(c: CanvasRenderingContext2D): void {
  const W = window.innerWidth, H = window.innerHeight;
  for (const cl of classes) {
    if (!cl.visible) continue;
    c.fillStyle = cl.color;
    // a handful of champions (push/wall-t6) get visible rings; dense clouds get dots
    if (cl.n <= 80) {
      c.globalAlpha = 0.95; c.lineWidth = 1.5; c.strokeStyle = '#0e0e12';
      for (let i = 0; i < cl.n; i++) {
        const X = sx(cl.re[i]), Y = sy(cl.im[i]);
        if (X < -6 || X > W + 6 || Y < -6 || Y > H + 6) continue;
        c.beginPath(); c.arc(X, Y, 4, 0, Math.PI * 2); c.fill(); c.stroke();
      }
    } else {
      const r = cl.n > 20000 ? 1.3 : 2;
      c.globalAlpha = 0.5;
      for (let i = 0; i < cl.n; i++) {
        const X = sx(cl.re[i]), Y = sy(cl.im[i]);
        if (X < -4 || X > W + 4 || Y < -4 || Y > H + 4) continue;
        c.beginPath(); c.arc(X, Y, r, 0, Math.PI * 2); c.fill();
      }
    }
  }
  c.globalAlpha = 1;
}

type LegendHit = { x: number; y: number; w: number; h: number; klass: Klass };
let legendHits: LegendHit[] = [];
function drawLegend(c: CanvasRenderingContext2D): void {
  legendHits = [];
  const x0 = 16, y0 = 16, rowH = 22, sw = 12;
  c.font = '13px ui-monospace, monospace';
  c.textAlign = 'left'; c.textBaseline = 'middle';
  c.fillStyle = 'rgba(232,232,236,0.95)';
  c.fillText(`Teichmüller τ ∈ ℍ — ${totalPts.toLocaleString()} tori`, x0, y0 + 8);
  c.fillStyle = 'rgba(180,186,200,0.75)'; c.font = '11px ui-monospace, monospace';
  c.fillText('dashed = SL(2,ℤ) fundamental domain  ·  r reset · f fit all', x0, y0 + 26);
  c.font = '13px ui-monospace, monospace';
  classes.forEach((cl, i) => {
    const y = y0 + 48 + i * rowH;
    legendHits.push({ x: x0 - 4, y: y - rowH / 2, w: 320, h: rowH, klass: cl });
    c.globalAlpha = cl.visible ? 1 : 0.32;
    c.fillStyle = cl.color; c.fillRect(x0, y - sw / 2, sw, sw);
    c.fillStyle = 'rgba(232,232,236,0.92)';
    c.fillText(`${cl.label}  (${cl.n.toLocaleString()})`, x0 + sw + 8, y + 1);
    c.globalAlpha = 1;
  });
}

function buildLayer(): void {
  const dpr = window.devicePixelRatio || 1;
  layer.width = Math.floor(window.innerWidth * dpr);
  layer.height = Math.floor(window.innerHeight * dpr);
  lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  lctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawAxes(lctx);
  drawPoints(lctx);
  drawLegend(lctx);
}

// ---- hover readout: nearest visible point to the cursor ----
let hover: { x: number; y: number } | null = null;
function drawHover(): void {
  if (!hover) return;
  const W = window.innerWidth;
  const pr = 14; // px search radius
  let best: { c: Klass; i: number; d2: number } | null = null;
  for (const cl of classes) {
    if (!cl.visible) continue;
    for (let i = 0; i < cl.n; i++) {
      const dx = sx(cl.re[i]) - hover.x, dy = sy(cl.im[i]) - hover.y, d2 = dx * dx + dy * dy;
      if (d2 < pr * pr && (!best || d2 < best.d2)) best = { c: cl, i, d2 };
    }
  }
  if (!best) return;
  const { c: cl, i } = best;
  const re = cl.re[i], im = cl.im[i];
  const X = sx(re), Y = sy(im);
  ctx.beginPath(); ctx.arc(X, Y, 4, 0, Math.PI * 2);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

  const lines = [
    cl.name,
    `τ = ${re.toFixed(5)} ${im >= 0 ? '+' : '−'} ${Math.abs(im).toFixed(5)} i`,
    `cone deficit  ${cl.cone[i].toExponential(2)}`,
    `embed margin  ${cl.margin[i].toExponential(2)}`,
  ];
  ctx.font = '12px ui-monospace, monospace';
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
  const h = 16 + lines.length * 16;
  let bx = X + 12, by = Y - h - 8;
  if (bx + w > W) bx = X - 12 - w;
  if (by < 0) by = Y + 14;
  ctx.fillStyle = 'rgba(20,22,30,0.95)'; ctx.fillRect(bx, by, w, h);
  ctx.strokeStyle = cl.color; ctx.lineWidth = 1.2; ctx.strokeRect(bx, by, w, h);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  lines.forEach((l, k) => {
    ctx.fillStyle = k === 0 ? cl.color : '#e8e8ec';
    ctx.fillText(l, bx + 8, by + 14 + k * 16);
  });
}

// main draw = blit cached layer + hover overlay
function draw(): void {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.drawImage(layer, 0, 0, window.innerWidth, window.innerHeight);
  drawHover();
}
// rebuild the static layer, then draw (use after any view/visibility change)
function rebuild(): void { buildLayer(); draw(); }

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rebuild();
}
window.addEventListener('resize', resize);

// ---- interaction ----
let dragging = false, dragMoved = false, lastX = 0, lastY = 0;
canvas.addEventListener('mousedown', (e) => {
  dragging = true; dragMoved = false; lastX = e.clientX; lastY = e.clientY;
  canvas.style.cursor = 'grabbing';
});
window.addEventListener('mouseup', (e) => {
  if (dragging && !dragMoved) {
    const hit = legendHits.find((h) => e.clientX >= h.x && e.clientX <= h.x + h.w && e.clientY >= h.y && e.clientY <= h.y + h.h);
    if (hit) { hit.klass.visible = !hit.klass.visible; rebuild(); }
  }
  dragging = false; canvas.style.cursor = 'grab';
});
window.addEventListener('mousemove', (e) => {
  if (dragging) {
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
    cx -= dx / scale; cy += dy / scale;
    lastX = e.clientX; lastY = e.clientY;
    hover = null; rebuild();
  } else {
    hover = { x: e.clientX, y: e.clientY }; draw();
  }
});
canvas.addEventListener('mouseleave', () => { hover = null; draw(); });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const k = Math.exp(-e.deltaY * 0.0015);
  const pX = planeX(e.clientX), pY = planeY(e.clientY);
  scale *= k;
  cx = pX - (e.clientX - window.innerWidth / 2) / scale;
  cy = pY + (e.clientY - window.innerHeight / 2) / scale;
  rebuild();
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.key === 'r') { homeView(); rebuild(); }
  else if (e.key === 'f') { fitAll(); rebuild(); }
});

homeView();
resize();
