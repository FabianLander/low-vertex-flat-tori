/**
 * Tutte gallery — every 8-vertex flat torus developed into the plane as a cut
 * fundamental polygon, so you can read off (and then hand-author) a developing
 * order and a pair of homology generators for each.
 *
 * Works for ALL 7 combinatorial types, including the six that are NOT
 * degree-6-regular (so the equilateral lattice picture does not exist for them).
 *
 * Each of the 9 cut edges appears twice on the polygon boundary; the two copies
 * are drawn in the same color to show the gluing. The two generator loops are
 * overlaid. Triangles are revealed in develop order so you can watch the net
 * build up.
 *
 * Controls:  ↑/↓ switch torus · ←/→ step develop order · Space play/pause · r reset · g toggle generators
 */

import { ALL_TORI } from '../../src/tori/index';
import { tutteLayout, generatorSegments, type XY, type TutteLayout } from '../../src/math/tutteLayout';

const STEP_MS = 450;
const HOLD_MS = 1100;

// distinct hues for the 9 cut-edge identifications
const CUT_COLORS = [
  '#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#c77dff',
  '#ff9f45', '#54e0c7', '#ff7fb0', '#b0a8ff',
];
const GEN_COLORS = ['#ff3d7f', '#3df0ff'];

let idx = ALL_TORI.length - 1; // start on Rich (#7)
let step = 1;
let playing = true;
let showGen = true;
let layout: TutteLayout = tutteLayout(ALL_TORI[idx]);
let gens: [XY, XY][][] = generatorSegments(ALL_TORI[idx], layout);
const reload = () => { layout = tutteLayout(ALL_TORI[idx]); gens = generatorSegments(ALL_TORI[idx], layout); };

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
function fit(pts: XY[], W: number, H: number, margin = 90): Fit {
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
  const f = fit(layout.boundaryLoop, W, H);
  const order = torus.developOrder;
  const currentT = order[step - 1];
  const done = new Set(order.slice(0, step));

  // triangles (revealed in develop order)
  for (const tile of layout.tiles) {
    const isCur = tile.id === currentT, isDone = done.has(tile.id);
    ctx.beginPath();
    ctx.moveTo(f.sx(tile.corners[0]), f.sy(tile.corners[0]));
    ctx.lineTo(f.sx(tile.corners[1]), f.sy(tile.corners[1]));
    ctx.lineTo(f.sx(tile.corners[2]), f.sy(tile.corners[2]));
    ctx.closePath();
    ctx.fillStyle = isCur ? 'rgba(240,190,90,0.55)' : isDone ? 'rgba(90,155,255,0.16)' : 'rgba(140,150,180,0.04)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,128,150,0.30)';
    ctx.lineWidth = 1; ctx.stroke();
    // triangle id at centroid
    const mx = (f.sx(tile.corners[0]) + f.sx(tile.corners[1]) + f.sx(tile.corners[2])) / 3;
    const my = (f.sy(tile.corners[0]) + f.sy(tile.corners[1]) + f.sy(tile.corners[2])) / 3;
    ctx.fillStyle = isCur ? '#ffe6ad' : isDone ? 'rgba(210,225,255,0.85)' : 'rgba(150,160,185,0.45)';
    ctx.font = `${isCur ? 'bold ' : ''}14px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(tile.id), mx, my);
  }

  // cut-edge identifications (both copies same color)
  ctx.lineWidth = 4;
  layout.cutPairs.forEach((pair, i) => {
    ctx.strokeStyle = CUT_COLORS[i % CUT_COLORS.length];
    for (const [A, B] of pair.sides) {
      ctx.beginPath(); ctx.moveTo(f.sx(A), f.sy(A)); ctx.lineTo(f.sx(B), f.sy(B)); ctx.stroke();
    }
  });

  // generator loops
  if (showGen) {
    ctx.lineWidth = 3; ctx.setLineDash([7, 5]);
    gens.forEach((segs, gi) => {
      ctx.strokeStyle = GEN_COLORS[gi % GEN_COLORS.length];
      for (const [A, B] of segs) {
        ctx.beginPath(); ctx.moveTo(f.sx(A), f.sy(A)); ctx.lineTo(f.sx(B), f.sy(B)); ctx.stroke();
      }
    });
    ctx.setLineDash([]);
  }

  // vertex labels
  ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const { pos, id } of layout.vertexLabels) {
    const x = f.sx(pos), y = f.sy(pos);
    ctx.fillStyle = '#0e0e12'; ctx.beginPath(); ctx.arc(x, y, 9, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = 'rgba(220,225,240,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(235,240,255,0.95)'; ctx.fillText(String(id), x, y);
  }

  // HUD
  const genTxt = torus.generatorLoops.map((g) => g.join('→')).join('   ');
  const lines = [
    `torus ${torus.id}/7  ${torus.name}   deg=[${torus.degreeSequence}]   (↑ ↓ switch)`,
    `develop step ${step}/16  order=[${order.join(',')}]    [← → step · Space ${playing ? 'pause' : 'play'} · g gens · r reset]`,
    `generators: ${genTxt}`,
  ];
  ctx.font = '13px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  let yy = 22;
  for (const L of lines) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(L, 13, yy + 1);
    ctx.fillStyle = '#e8e8ec'; ctx.fillText(L, 12, yy);
    yy += 19;
  }
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
    step = 1; reload(); draw(); e.preventDefault();
  } else if (e.key === 'r') { step = 1; draw(); }
  else if (e.key === 'g') { showGen = !showGen; draw(); }
});

resize();
requestAnimationFrame(tick);
