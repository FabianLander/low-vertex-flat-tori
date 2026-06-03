/**
 * render-grid — render a grid of flat tori, one per row of CSV(s) dropped in THIS folder
 * (each row = an embedding as a point in R^3V = 24 numbers, paired with the
 * combinatorics `TORUS`). Drop your own `*.csv` here; it's picked up automatically
 * (a `sample.csv` is included to start — delete it to use only yours).
 *
 *   P   WebGL preview ↔ path trace
 *
 * Built from the modular pieces: io/embeddings (load) + render/styledTorus (style)
 * + a centered TorusMesh (so each torus is just scaled / rotated / positioned).
 */

import * as THREE from 'three';
import { GradientEquirectTexture } from 'three-gpu-pathtracer';

import { RICH } from '../../src/tori';
import { RICH_REFERENCE } from '../../src/math/reference';
import { parseEmbeddings } from '../../src/io/embeddings';
import { styledTorus, gridFaceMaterial, creaseEdgeMaterial, type StyledTorusOptions } from '../../src/render/styledTorus';
import { Studio } from '../../src/render/studio';

// ---- config ----
const TORUS = RICH;                              // combinatorics the CSV rows belong to
const STYLE: StyledTorusOptions = { surface: 'grid', edges: true };
const GRID = { levels: [6, 12, 24, 48], cellColor: '#b8902a', lineColor: '#5a3415', majorWidth: 0.008 };
const MAX = 100;                                 // up to a 10×10 grid
const CELL = 1.0;                                // each torus is normalized to this size
const SPACING = 1.7;

// ---- studio + even sky lighting ----
const studio = new Studio({ bounces: 5, pathTraceScale: 1, onModeChange: updateForMode });
const env = new GradientEquirectTexture();
env.topColor.set(0x9fb8d6);
env.bottomColor.set(0xe9e4da);
env.update();
studio.scene.environment = env;
studio.scene.environmentIntensity = 0.9;
studio.scene.background = new THREE.Color(0xeef0f3);
studio.renderer.shadowMap.enabled = true;
studio.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
const key = new THREE.DirectionalLight(0xffffff, 0.8);   // positioned + shadow-configured after the grid is built
studio.scene.add(ambient, key);

// ---- load every CSV in this folder ----
const csvs = import.meta.glob('./*.csv', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
let papers = parseEmbeddings(Object.values(csvs).join('\n'), TORUS);
if (papers.length === 0) papers = [RICH_REFERENCE];
papers = papers.slice(0, MAX);

// ---- shared material (per-torus UVs live on the geometry, so the texture is shared) ----
const faceMaterial = gridFaceMaterial(GRID);
const edgeMaterial = creaseEdgeMaterial();

const cols = Math.ceil(Math.sqrt(papers.length));
const rows = Math.ceil(papers.length / cols);

const grid = new THREE.Group();
papers.forEach((paper, i) => {
  const t = styledTorus(paper, { ...STYLE, faceMaterial, edgeMaterial });
  // normalize to the cell, stand on long side, place in the grid
  const size = new THREE.Box3().setFromObject(t).getSize(new THREE.Vector3());
  t.scale.setScalar(CELL / (Math.max(size.x, size.y, size.z) || 1));
  t.rotation.z = Math.PI / 2;
  const c = i % cols, r = Math.floor(i / cols);
  t.position.set((c - (cols - 1) / 2) * SPACING, ((rows - 1) / 2 - r) * SPACING, 0);
  grid.add(t);
});
studio.add(grid);

// ---- backdrop plane behind the grid (like the other demos), catching the shadow ----
const gbox = new THREE.Box3().setFromObject(grid);
const gsize = gbox.getSize(new THREE.Vector3());
const gcenter = gbox.getCenter(new THREE.Vector3());
const reach = Math.max(gsize.x, gsize.y);

const wall = new THREE.Mesh(
  new THREE.PlaneGeometry(gsize.x * 1.4, gsize.y * 1.4),
  new THREE.MeshStandardMaterial({ color: 0xced3da, roughness: 0.85 }),
);
wall.position.set(gcenter.x, gcenter.y, gbox.min.z - 0.8);
wall.receiveShadow = true;
studio.scene.add(wall);

// directional key throws the shadow onto the wall (works in preview + path tracer)
grid.traverse((o) => { o.castShadow = true; });
key.position.set(gcenter.x + reach * 0.25, gcenter.y + reach * 0.35, gbox.max.z + reach);
key.target.position.copy(gcenter);
studio.scene.add(key.target);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
const sc = key.shadow.camera;
sc.left = -reach * 0.7; sc.right = reach * 0.7;
sc.top = reach * 0.7; sc.bottom = -reach * 0.7;
sc.near = 0.5; sc.far = reach * 3;
sc.updateProjectionMatrix();
key.shadow.bias = -0.0002;

studio.frame(grid, { direction: new THREE.Vector3(0, 0, 1) });
studio.start();

function updateForMode(mode: 'webgl' | 'pathtracing'): void {
  // ambient is preview-only (the path tracer ignores AmbientLight); the
  // directional key stays on in both modes and casts the wall shadow.
  ambient.intensity = mode === 'webgl' ? 0.4 : 0;
  if (mode === 'pathtracing') studio.notifyMaterialsChanged();
}

// ---- HUD ----
const hud = document.createElement('div');
hud.style.cssText = 'position:fixed;top:10px;left:12px;font:12px ui-monospace,monospace;color:#cdd;background:rgba(0,0,0,.45);padding:5px 9px;border-radius:6px;white-space:pre';
document.body.appendChild(hud);

window.addEventListener('keydown', (e) => {
  if (e.key === 'p' || e.key === 'P') studio.toggleMode();
  else if (e.key === 's' || e.key === 'S') studio.screenshot('flat-tori-grid.png');
});

function tickHud(): void {
  const mode = studio.isPathTracing() ? `path trace — ${Math.floor(studio.samples)} spp` : 'webgl preview';
  hud.textContent = `${papers.length} tori · ${cols}×${rows} grid\n${mode}   (P: render   S: save png)`;
  requestAnimationFrame(tickHud);
}
tickHud();
