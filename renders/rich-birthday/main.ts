/**
 * rich-birthday — rich-birthday-render's 10×10 wall of paper tori, but stripped back to a
 * plain WebGL scene you can ORBIT: no path tracer, no back wall, no UI. A grid/
 * individual slider switches between the whole 10×10 wall and a single torus shown
 * hovering above its developed net (the flat sheet it folds from, laid on the
 * ground); ← → / on-screen arrows step through the census. Lit by one raking key +
 * soft sky fill, with a dedication top-left and credits bottom-right.
 *
 * Same paper/grid/normal-map surface as rich-birthday-render; the census is the CSV in
 * this folder. Knobs live in CONFIG below.
 */

import * as THREE from 'three';

import { RICH } from '../../src/tori';
import { RICH_REFERENCE } from '../../src/math/reference';
import { parseEmbeddings } from '../../src/io/embeddings';
import { styledTorus, creaseEdgeMaterial } from '../../src/render/styledTorus';
import { developedSheet } from '../../src/render/developedSheet';
import { graphPaperTexture } from '../../src/render/grid';
import { skyEnvironment } from '../../src/render/stage';
import { loadNormalMap } from '../../src/render/textures';
import { Studio } from '../../src/render/studio';

// ============================ tweak the whole piece here ============================
const url = new URLSearchParams(location.search);

const CONFIG = {
  // ===================== COLORS (match rich-birthday-render) =====================
  torusColor:     '#dcbf6f',   // the paper (also the crease / fold-line color)
  gridColor:      '#2435AF',   // thick (major) graph lines
  gridMinorColor: '#4e5988',   // thin (fine) graph lines
  background:     0xf7f5f0,    // matches stevejtrettel.site (--bg: #F7F5F0)
  lightColor:     '#ffffff',
  // ======================================================================

  // tori + layout
  torus: RICH,                 // combinatorics the CSV rows belong to
  maxTori: 100,                // cap (10×10)
  cell: 1.0,                   // each torus normalized to this size
  spacing: 1.9,                // cell-to-cell gap (× cell)
  creases: true,
  creaseRadius: 0.004,
  // developed (flat) mode: thin dark-gray crease/fold lines
  foldLineColor: '#4d4d4d',
  foldLineRadius: 0.0022,

  // paper surface detail (same as rich-birthday-render)
  roughness: 0.92,
  gridRepeat: 16,
  gridSubdivisions: 3,
  gridMinorWidth: 0.004,
  gridMajorWidth: 0.012,
  normalMapFile: 'crease-rough.png',
  normalRepeat: Number(url.get('nr')) || 4,
  normalScale: Number(url.get('ns')) || 1.0,

  // lighting — one raking key (no cast shadows) over a dimmer sky/ambient fill:
  // the folds get their form from diffuse facet shading, backsides never go black.
  envIntensity: 0.55,
  ambientIntensity: 0.22,
  keyIntensity: 2.4,
  keyDir: [-0.4, 0.7, 0.7] as [number, number, number],   // center → light
};
// ====================================================================================

// ---- studio (WebGL preview only — never enable path tracing) ----
const studio = new Studio();
skyEnvironment(studio.scene, { intensity: CONFIG.envIntensity, background: CONFIG.background });
studio.scene.add(new THREE.AmbientLight(0xffffff, CONFIG.ambientIntensity));

// a single raking key light — NO cast shadows (thin folded sheets self-shadow into
// acne, and a hard cast shadow on the net read too dark/sharp). The strong key over
// a dim fill gives the folds their form purely through diffuse facet shading.
const key = new THREE.DirectionalLight(CONFIG.lightColor, CONFIG.keyIntensity);
studio.scene.add(key, key.target);

/** Aim the key light at an object's center, from the CONFIG.keyDir side. */
function aimKey(obj: THREE.Object3D): void {
  const sphere = new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere());
  const dir = new THREE.Vector3(...CONFIG.keyDir).normalize();
  key.position.copy(sphere.center).addScaledVector(dir, (sphere.radius || 1) * 3);
  key.target.position.copy(sphere.center);
}

// ---- load every CSV in this folder ----
const csvs = import.meta.glob('./*.csv', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
let papers = parseEmbeddings(Object.values(csvs).join('\n'), CONFIG.torus);
if (papers.length === 0) papers = [RICH_REFERENCE];
papers = papers.slice(0, CONFIG.maxTori);

// ---- shared paper material (per-torus UVs live on the geometry, so it's shared) ----
const tex = graphPaperTexture({
  bg: CONFIG.torusColor, minor: CONFIG.gridMinorColor, major: CONFIG.gridColor,
  squares: CONFIG.gridSubdivisions,
  minorWidth: CONFIG.gridMinorWidth, majorWidth: CONFIG.gridMajorWidth,
});
tex.repeat.set(CONFIG.gridRepeat, CONFIG.gridRepeat);
const faceMaterial = new THREE.MeshStandardMaterial({ map: tex, roughness: CONFIG.roughness, metalness: 0, flatShading: true, side: THREE.DoubleSide });
const edgeMaterial = creaseEdgeMaterial(CONFIG.torusColor);     // 3D torus creases match the paper
const foldLineMaterial = creaseEdgeMaterial(CONFIG.foldLineColor);   // flat-net fold lines: thin dark gray
const nrm = loadNormalMap(CONFIG.normalMapFile, { repeat: CONFIG.normalRepeat });
if (nrm) { faceMaterial.normalMap = nrm; faceMaterial.normalScale.set(CONFIG.normalScale, CONFIG.normalScale); faceMaterial.needsUpdate = true; }

// ---- build the grid (same layout as rich-birthday-render) ----
const cols = Math.ceil(Math.sqrt(papers.length));
const rows = Math.ceil(papers.length / cols);
const grid = new THREE.Group();
papers.forEach((paper, i) => {
  const t = styledTorus(paper, { surface: 'grid', edges: true, faceMaterial, edgeMaterial, edgeRadius: CONFIG.creaseRadius });
  t.setEdgesVisible(CONFIG.creases);
  const size = new THREE.Box3().setFromObject(t).getSize(new THREE.Vector3());
  t.scale.setScalar(CONFIG.cell / (Math.max(size.x, size.y, size.z) || 1));
  t.rotation.z = Math.PI / 2;
  const c = i % cols, r = Math.floor(i / cols);
  t.position.set((c - (cols - 1) / 2) * CONFIG.spacing, ((rows - 1) / 2 - r) * CONFIG.spacing, 0);
  grid.add(t);
});
studio.add(grid);

// ---- single-subject view: the folded torus hovering ABOVE its developed net,
//      which lies flat on the "ground" (the XZ plane). Built on demand and
//      centered at the origin so stepping the census keeps the camera/orbit put. ----
const TORUS_SIZE = 1.7;    // folded torus, floating above
const NET_SIZE = 2.6;      // developed sheet, on the ground
const TORUS_LIFT = 1.6;    // gap between the ground net and the torus
let single: THREE.Object3D | null = null;
let soloIdx = (() => { const k = Number(url.get('i')); return Number.isInteger(k) && k >= 0 && k < papers.length ? k : 0; })();

/** Scale obj so its largest extent = size, then recenter it on its local origin. */
function fitInPlace(obj: THREE.Object3D, size: number): void {
  const s = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  obj.scale.setScalar(size / (Math.max(s.x, s.y, s.z) || 1));
  obj.updateMatrixWorld(true);
  obj.position.sub(new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3()));
}

function buildSubject(reframe: boolean): void {
  if (single) { studio.scene.remove(single); single.traverse((o) => (o as THREE.Mesh).geometry?.dispose()); }
  const group = new THREE.Group();

  // folded torus, hovering above the ground
  const torus = styledTorus(papers[soloIdx], { surface: 'grid', edges: true, faceMaterial, edgeMaterial, edgeRadius: CONFIG.creaseRadius });
  torus.setEdgesVisible(CONFIG.creases);
  torus.rotation.z = Math.PI / 2;
  fitInPlace(torus, TORUS_SIZE);
  torus.position.y += TORUS_LIFT;
  group.add(torus);

  // developed net, laid flat on the "ground" (rotate its XY plane down into XZ)
  const sheet = developedSheet(papers[soloIdx], { faceMaterial, edgeMaterial: CONFIG.creases ? foldLineMaterial : undefined, edgeRadius: CONFIG.foldLineRadius });
  fitInPlace(sheet, NET_SIZE);
  sheet.rotation.x = -Math.PI / 2;
  group.add(sheet);

  // center the whole composite on the origin (stable framing as you step)
  group.updateMatrixWorld(true);
  group.position.sub(new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3()));
  single = group;
  studio.scene.add(group);
  aimKey(group);
  if (reframe) studio.frame(group, { direction: new THREE.Vector3(0, 0.6, 1) });   // elevated front, so the ground reads
}

// ---- mode: grid (10×10) ↔ individual (torus above its developed net) ----
type Mode = 'grid' | 'individual';
let mode: Mode = url.get('view') === 'individual' ? 'individual' : 'grid';

function setMode(next: Mode): void {
  mode = next;
  const solo = mode === 'individual';
  grid.visible = !solo;
  chevrons.style.display = solo ? '' : 'none';
  if (solo) buildSubject(true);
  else { if (single) single.visible = false; studio.frame(grid, { direction: new THREE.Vector3(0, 0, 1) }); aimKey(grid); }
  syncToggle();
}

function step(d: number): void { if (mode === 'individual') { soloIdx = (soloIdx + d + papers.length) % papers.length; buildSubject(false); } }

studio.frame(grid, { direction: new THREE.Vector3(0, 0, 1) });
studio.start();

// ---- dedication (top-left, small) ----
const caption = document.createElement('div');
caption.style.cssText = 'position:fixed;top:12px;left:14px;font:11px/1.5 ui-serif,Georgia,serif;color:#555;letter-spacing:.02em;pointer-events:none;white-space:pre';
caption.textContent = 'One Hundred Vertex-Minimal Paper Tori\nHappy Birthday Rich. 2026';
document.body.appendChild(caption);

// ---- minimal sliders, just under the dedication (clickable — no keyboard needed) ----
function makeSlider(left: string, right: string, top: number, onToggle: () => void): { el: HTMLDivElement; sync: (right: boolean) => void } {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;top:${top}px;left:14px;display:flex;align-items:center;gap:8px;font:11px ui-serif,Georgia,serif;letter-spacing:.02em;cursor:pointer;user-select:none`;
  const l = document.createElement('span'); l.textContent = left;
  const r = document.createElement('span'); r.textContent = right;
  const track = document.createElement('span');
  track.style.cssText = 'position:relative;width:32px;height:16px;border-radius:8px;background:#fff;border:1px solid #cfcfcf;box-shadow:inset 0 1px 2px rgba(0,0,0,.06)';
  const knob = document.createElement('span');
  knob.style.cssText = 'position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:50%;background:#b08d57;transition:transform .18s ease';
  track.appendChild(knob);
  el.append(l, track, r);
  el.onclick = onToggle;
  document.body.appendChild(el);
  return {
    el,
    sync: (isRight) => {
      knob.style.transform = isRight ? 'translateX(16px)' : 'translateX(0)';
      l.style.color = isRight ? '#aaa' : '#333';
      r.style.color = isRight ? '#333' : '#aaa';
    },
  };
}

const gridSlider = makeSlider('grid', 'individual', 54, () => setMode(mode === 'grid' ? 'individual' : 'grid'));
function syncToggle(): void { gridSlider.sync(mode === 'individual'); }
syncToggle();

// ---- subtle ‹ › arrows (individual mode only) ----
const chevrons = document.createElement('div');
chevrons.style.display = 'none';
const makeChevron = (glyph: string, side: 'left' | 'right', onClick: () => void): HTMLElement => {
  const el = document.createElement('div');
  el.textContent = glyph;
  el.style.cssText = `position:fixed;top:50%;${side}:12%;transform:translateY(-50%);font:300 40px ui-serif,Georgia,serif;color:rgba(80,80,80,.35);cursor:pointer;user-select:none;transition:color .15s`;
  el.onmouseenter = () => (el.style.color = 'rgba(80,80,80,.85)');
  el.onmouseleave = () => (el.style.color = 'rgba(80,80,80,.35)');
  el.onclick = onClick;
  chevrons.appendChild(el);
  return el;
};
makeChevron('‹', 'left', () => step(-1));
makeChevron('›', 'right', () => step(1));
document.body.appendChild(chevrons);

// ---- arrow keys step through the census (individual mode) ----
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
});

// apply the initial mode (honors ?view=individual & ?i=N)
setMode(mode);

// ---- subtle credits (bottom-right). Names link to our sites but read as plain
//      text — no underline, a color barely off the background. Fill in the URLs. ----
const CREDITS = [
  { name: 'Fabian Lander', url: 'https://fabianlander.github.io/' },
  { name: 'Steve Trettel', url: 'https://stevejtrettel.site' },
];
const credits = document.createElement('div');
credits.style.cssText = 'position:fixed;bottom:12px;right:14px;text-align:right;font:11px/1.5 ui-serif,Georgia,serif;letter-spacing:.02em;color:#bdb697';
for (const { name, url: href } of CREDITS) {
  const a = document.createElement('a');
  a.textContent = name;
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  a.style.cssText = 'display:block;color:inherit;text-decoration:none;cursor:pointer';
  credits.appendChild(a);
}
document.body.appendChild(credits);
