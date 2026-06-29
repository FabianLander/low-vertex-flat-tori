/**
 * path-inspector — step through a SEQUENCE of flat 8-vertex tori and watch them
 * fold. Built for the constant-modulus descent (samples/const-mod-path.csv): all
 * the tori share one modulus τ̂, so a moduli-space scatter (curated-moduli) can't
 * separate them — instead we index by PATH STEP (slider / ← → / space to play)
 * and show, for the selected torus:
 *   • FOLDED   — the embedded 3-D surface (drag to rotate, scroll to zoom),
 *                centered on the vertex centroid so it stays put while stepping;
 *   • UNFOLDED — its developed net tiled across the universal cover, with the six
 *                planar base vertices marked by role (pinned / free / midpoint).
 * As the index advances the margin → 0: the surface folds flat onto the graceful
 * immersion while the developed tiling (the intrinsic flat torus) stays fixed.
 *
 * Self-contained: reads ./path.csv (24 positions per row). Pure demo glue.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RICH } from '@core/triangulations';
import { paperFromRow } from '@core/configuration/csv';
import { certify } from '@core/search/certify';
import { developNet } from '@core/moduli/develop';
import { makeTorusView, type TorusView } from '@display/viewer/TorusView';
import { paperMaterials } from '@display/viewer/materials';
import { skyEnvironment } from '@app/render/stage';

// ---- data: every CSV in ./data is a dataset (one constant-modulus family) ----
const files = import.meta.glob('./data/*.csv', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const parse = (t: string): Float64Array[] => t.trim().split('\n').map((l) => l.trim())
  .filter((l) => l && !/^[a-zA-Z]/.test(l)).map((l) => Float64Array.from(l.split(',').slice(0, 24), Number));
const datasets: Record<string, Float64Array[]> = {};
for (const [p, t] of Object.entries(files)) datasets[p.match(/([^/]+)\.csv$/)![1]] = parse(t);
const names = Object.keys(datasets).sort();
let rows: Float64Array[] = datasets[names[0]];
let certs = rows.map((r) => certify(RICH, r));
let N = rows.length;

// the six planar base vertices of the DS scaffold, by role (poles 0,7 omitted)
const ROLE: Record<number, { fill?: string; ring?: string; label: string }> = {
  1: { fill: '#111', label: 'pin' }, 4: { fill: '#111', label: 'pin' },
  3: { fill: '#c0392b', label: 'free' }, 6: { fill: '#c0392b', label: 'free' },
  2: { ring: '#1f5fd0', label: 'mid' }, 5: { ring: '#1f5fd0', label: 'mid' },
};

document.body.style.cssText = 'margin:0;overflow:hidden;background:#eef1f5;font:13px ui-monospace,monospace';

// layout: a fixed LEFT sidebar (the unfolded net) + the 3-D view filling the rest,
// so the folded torus is centered in its OWN region (no panel overlapping it).
const SIDEBAR = 380;
const view3dW = () => Math.max(200, window.innerWidth - SIDEBAR);

// ---- folded 3-D view (right region) ----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);
// style FIRST — setSize writes style.width/height, so a cssText afterwards would wipe them
// and the canvas would render at its device-pixel buffer size (2× on retina) → off-screen.
renderer.domElement.style.cssText = `display:block;position:fixed;top:0;left:${SIDEBAR}px;touch-action:none;cursor:grab`;
renderer.setSize(view3dW(), window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
skyEnvironment(scene, { intensity: 0.8, background: 0xeef1f5 });
scene.add(new THREE.AmbientLight(0xffffff, 0.3));
const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(-0.5, 0.9, 0.8); scene.add(key);

const cam = new THREE.PerspectiveCamera(40, view3dW() / window.innerHeight, 0.01, 100);
const controls = new OrbitControls(cam, renderer.domElement);
controls.enableDamping = true;
const { surface: face } = paperMaterials({ paperColor: '#dcbf6f', gridColor: '#2435AF', gridMinorColor: '#4e5988' });

let mesh: THREE.Object3D | null = null;
let view: TorusView | null = null;
let framed = false;
function showFolded(i: number): void {
  if (mesh) scene.remove(mesh);
  view?.dispose();
  const paper = paperFromRow(RICH, rows[i]);
  view = makeTorusView(paper.triang, { surface: { material: face } });   // center:true → bbox-centered geometry
  view.draw(paper.positions);
  mesh = view.group; mesh.updateMatrixWorld(true);
  mesh.position.sub(new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()));   // exact origin
  mesh.updateMatrixWorld(true);
  scene.add(mesh);
  if (!framed) {
    const r = new THREE.Box3().setFromObject(mesh).getBoundingSphere(new THREE.Sphere()).radius || 1;
    const dist = (r / Math.sin((cam.fov * Math.PI / 180) / 2)) * 1.6;
    cam.position.set(0.3 * dist, 0.45 * dist, dist);
    cam.near = r * 0.03; cam.far = r * 40; cam.updateProjectionMatrix();
    controls.target.set(0, 0, 0); controls.update();
    framed = true;
  }
}
(function loop(): void { requestAnimationFrame(loop); controls.update(); renderer.render(scene, cam); })();
window.addEventListener('resize', () => {
  renderer.setSize(view3dW(), window.innerHeight);
  cam.aspect = view3dW() / window.innerHeight; cam.updateProjectionMatrix();
});

// ---- unfolded developed-net panel: full tiling + the 6 base vertices ----
const S = 340;
const netCanvas = document.createElement('canvas');
netCanvas.style.cssText = `position:fixed;left:20px;top:64px;width:${S}px;height:${S}px;`
  + 'background:#fff;border:1px solid rgba(0,0,0,0.18);border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,0.15)';
document.body.appendChild(netCanvas);
const nctx = netCanvas.getContext('2d')!;
const cross = (a: number[], b: number[]) => a[0] * b[1] - a[1] * b[0];
const RANGE = 2;                                            // tile k,l ∈ [-2,2] → 5×5 cover
let netZoom = 1, netPanX = 0, netPanY = 0;                  // tiling pan/zoom (scroll + drag, dbl-click resets)

function drawNet(i: number): void {
  const dpr = window.devicePixelRatio || 1;
  netCanvas.width = S * dpr; netCanvas.height = S * dpr; nctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  nctx.clearRect(0, 0, S, S);
  const net = developNet(RICH, rows[i]);

  // lattice generators = two independent cut-edge translations (the holonomy)
  const ts = net.cutEdges.map((c) => c.translation as unknown as number[]);
  let v1 = ts.find((t) => Math.hypot(t[0], t[1]) > 1e-9) ?? [1, 0];
  let v2 = [0, 1];
  for (const t of ts) if (Math.abs(cross(v1, t)) > 1e-7) { v2 = t; break; }

  // base-vertex marks: unique developed positions of vertices 1..6 in the net
  const marks: { x: number; y: number; v: number }[] = [];
  const seen = new Set<string>();
  net.corners.forEach((tri, f) => tri.forEach((c, lc) => {
    const v = RICH.triangles[f][lc];
    if (!ROLE[v]) return;
    const k = `${v}:${c[0].toFixed(4)},${c[1].toFixed(4)}`;
    if (seen.has(k)) return; seen.add(k); marks.push({ x: c[0], y: c[1], v });
  }));

  const offsets: number[][] = [];
  for (let k = -RANGE; k <= RANGE; k++) for (let l = -RANGE; l <= RANGE; l++) offsets.push([k * v1[0] + l * v2[0], k * v1[1] + l * v2[1]]);

  // bounds over the tiled corners
  let xlo = Infinity, xhi = -Infinity, ylo = Infinity, yhi = -Infinity;
  for (const o of offsets) for (const tri of net.corners) for (const c of tri) {
    xlo = Math.min(xlo, c[0] + o[0]); xhi = Math.max(xhi, c[0] + o[0]);
    ylo = Math.min(ylo, c[1] + o[1]); yhi = Math.max(yhi, c[1] + o[1]);
  }
  const m = 14, s = Math.min((S - 2 * m) / ((xhi - xlo) || 1), (S - 2 * m) / ((yhi - ylo) || 1));
  const X = (x: number) => netPanX + netZoom * (m + (x - xlo) * s);
  const Y = (y: number) => netPanY + netZoom * (S - (m + (y - ylo) * s));

  // tiled triangles (faint)
  nctx.lineJoin = 'round';
  for (const o of offsets) for (const tri of net.corners) {
    nctx.beginPath();
    nctx.moveTo(X(tri[0][0] + o[0]), Y(tri[0][1] + o[1]));
    nctx.lineTo(X(tri[1][0] + o[0]), Y(tri[1][1] + o[1]));
    nctx.lineTo(X(tri[2][0] + o[0]), Y(tri[2][1] + o[1]));
    nctx.closePath();
    nctx.fillStyle = 'rgba(220,191,111,0.18)'; nctx.fill();
    nctx.strokeStyle = 'rgba(36,53,175,0.35)'; nctx.lineWidth = 0.8; nctx.stroke();
  }
  // the 6 base vertices, every copy in the tiling
  for (const o of offsets) for (const p of marks) {
    const px = X(p.x + o[0]), py = Y(p.y + o[1]);
    if (px < -4 || px > S + 4 || py < -4 || py > S + 4) continue;
    const r = ROLE[p.v];
    nctx.beginPath(); nctx.arc(px, py, 3.4, 0, Math.PI * 2);
    if (r.fill) { nctx.fillStyle = r.fill; nctx.fill(); }
    else { nctx.fillStyle = '#fff'; nctx.fill(); nctx.strokeStyle = r.ring!; nctx.lineWidth = 2; nctx.stroke(); }
  }
  // header + legend
  nctx.fillStyle = 'rgba(15,15,15,0.7)'; nctx.font = '11px ui-monospace,monospace';
  nctx.fillText('unfolded — full tiling · 6 base vertices', 8, 15);
  const leg = [['pin', '#111', false], ['free', '#c0392b', false], ['mid', '#1f5fd0', true]] as const;
  leg.forEach(([lab, col, ring], k) => {
    const lx = 10 + k * 70, ly = S - 10;
    nctx.beginPath(); nctx.arc(lx, ly, 4, 0, Math.PI * 2);
    if (ring) { nctx.fillStyle = '#fff'; nctx.fill(); nctx.strokeStyle = col; nctx.lineWidth = 2; nctx.stroke(); }
    else { nctx.fillStyle = col; nctx.fill(); }
    nctx.fillStyle = 'rgba(15,15,15,0.7)'; nctx.fillText(lab, lx + 8, ly + 4);
  });
}

// ---- controls ----
const bar = document.createElement('div');
bar.style.cssText = `position:fixed;top:12px;left:calc(${SIDEBAR}px + (100vw - ${SIDEBAR}px)/2);transform:translateX(-50%);display:flex;gap:10px;align-items:center;`
  + 'background:rgba(255,255,255,0.96);border:1px solid rgba(0,0,0,0.15);border-radius:8px;padding:8px 12px;box-shadow:0 4px 16px rgba(0,0,0,0.12)';
const prev = Object.assign(document.createElement('button'), { textContent: '◀' });
const next = Object.assign(document.createElement('button'), { textContent: '▶' });
const play = Object.assign(document.createElement('button'), { textContent: '▶ play' });
const slider = Object.assign(document.createElement('input'), { type: 'range', min: '0', max: String(N - 1), value: '0', step: '1' });
slider.style.width = '220px';
for (const b of [prev, next, play]) b.style.cssText = 'font:13px ui-monospace,monospace;cursor:pointer;padding:2px 8px';
const readout = document.createElement('span');
readout.style.cssText = 'font:12px/1.4 ui-monospace,monospace;color:#101014;min-width:300px';
const dd = document.createElement('select');
dd.style.cssText = 'font:12px ui-monospace,monospace;padding:2px 4px;margin-right:6px';
for (const n of names) { const o = document.createElement('option'); o.value = n; o.textContent = n; dd.appendChild(o); }
bar.append(dd, prev, slider, next, play, readout);
document.body.appendChild(bar);

let idx = 0, playing = false, acc = 0, lastT = 0;
function show(i: number): void {
  idx = Math.max(0, Math.min(N - 1, i)); slider.value = String(idx);
  showFolded(idx); drawNet(idx);
  const c = certs[idx];
  readout.innerHTML = `#${idx + 1}/${N} &nbsp; margin ${c.margin.toExponential(2)} &nbsp; `
    + `τ̂ (${c.tauHat[0].toFixed(4)}, ${c.tauHat[1].toFixed(4)}) &nbsp; coneDef ${c.coneDeficit.toExponential(1)}`;
}
prev.onclick = () => show(idx - 1);
next.onclick = () => show(idx + 1);
slider.oninput = () => show(Number(slider.value));
play.onclick = () => { playing = !playing; play.textContent = playing ? '❚❚ pause' : '▶ play'; lastT = performance.now(); };
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') show(idx + 1);
  else if (e.key === 'ArrowLeft') show(idx - 1);
  else if (e.key === ' ') { e.preventDefault(); playing = !playing; play.textContent = playing ? '❚❚ pause' : '▶ play'; lastT = performance.now(); }
});
(function tick(t: number): void {
  requestAnimationFrame(tick);
  if (!playing) return;
  acc += (t - lastT); lastT = t;
  if (acc > 320) { acc = 0; show(idx + 1 >= N ? 0 : idx + 1); }
})(0);

// ---- pan / zoom on the unfolded tiling (scroll = zoom about cursor, drag = pan, dbl-click = reset) ----
netCanvas.style.cursor = 'grab';
netCanvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = netCanvas.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  const k = Math.exp(-e.deltaY * 0.0015);
  netPanX = mx - k * (mx - netPanX); netPanY = my - k * (my - netPanY); netZoom *= k;
  drawNet(idx);
}, { passive: false });
let npan: { x: number; y: number } | null = null;
netCanvas.addEventListener('pointerdown', (e) => { netCanvas.setPointerCapture(e.pointerId); npan = { x: e.clientX, y: e.clientY }; netCanvas.style.cursor = 'grabbing'; });
netCanvas.addEventListener('pointermove', (e) => { if (!npan) return; netPanX += e.clientX - npan.x; netPanY += e.clientY - npan.y; npan = { x: e.clientX, y: e.clientY }; drawNet(idx); });
const endPan = (e: PointerEvent): void => { npan = null; try { netCanvas.releasePointerCapture(e.pointerId); } catch { /* already released */ } netCanvas.style.cursor = 'grab'; };
netCanvas.addEventListener('pointerup', endPan);
netCanvas.addEventListener('pointercancel', endPan);
netCanvas.addEventListener('dblclick', () => { netZoom = 1; netPanX = 0; netPanY = 0; drawNet(idx); });

function loadDataset(name: string): void {
  rows = datasets[name]; certs = rows.map((r) => certify(RICH, r)); N = rows.length;
  slider.max = String(N - 1); framed = false; show(0);
}
dd.onchange = () => loadDataset(dd.value);
loadDataset(names[0]);
