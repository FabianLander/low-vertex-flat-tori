/**
 * rich-birthday-render — a fine-art grid of paper-textured flat tori, one per row
 * of the CSV(s) in this folder (each row = an embedding as 24 numbers of `CONFIG.torus`).
 *
 * Everything tunable lives in CONFIG below — the four main COLORS are grouped at
 * the very top, then the paper surface, layout, plane, and lighting (a soft
 * directional key by default, plus an optional array of dramatic spotlights).
 * Render… → path trace; S saves.
 */

import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { PhysicalSpotLight } from 'three-gpu-pathtracer';

import { RICH } from '../../src/tori';
import { RICH_REFERENCE } from '../../src/math/reference';
import { parseEmbeddings } from '../../src/io/embeddings';
import { styledTorus, creaseEdgeMaterial } from '../../src/render/styledTorus';
import { graphPaperTexture } from '../../src/render/grid';
import { skyEnvironment, backWall } from '../../src/render/stage';
import { loadNormalMap } from '../../src/render/textures';
import { attachRenderControls } from '../../src/render/controls';
import { Studio } from '../../src/render/studio';

// ============================ tweak the whole piece here ============================
const url = new URLSearchParams(location.search);

type LightSpec = {
  type: 'area' | 'directional' | 'spot';
  on: boolean;
  intensity: number;
  dir: [number, number, number];     // direction from the scene center to the light
  color?: THREE.ColorRepresentation;  // defaults to CONFIG.lightColor
  size?: number;                      // area: panel size (× scene radius)
  dist?: number;                      // spot: distance (× scene radius)
  angle?: number; penumbra?: number; radius?: number;  // spot
};

const CONFIG = {
  // ===================== COLORS (the palette) =====================
  torusColor:     '#dcbf6f',   // the paper
  gridColor:      '#2435AF',   // thick (major) graph lines
  gridMinorColor: '#4e5988',   // thin (fine) graph lines
  wallColor:      '#eceacf',   // background plane
  lightColor:     '#ffffff',   // light source(s)
  // ================================================================

  // frame
  aspect: 1,                   // canvas aspect ratio (w/h), letterboxed in the window (e.g. 1, 16/9, 4/5)

  // tori + layout
  torus: RICH,                 // combinatorics the CSV rows belong to
  maxTori: 100,                // cap (10×10)
  cell: 1.0,                   // each torus normalized to this size
  spacing: 1.9,                // cell-to-cell gap (× cell)
  surface: 'grid' as 'grid' | 'plain',
  creases: true,
  creaseColor: 0x5a3a1e,       // crease cylinders along the folds
  creaseRadius: 0.004,

  // paper surface detail
  roughness: 0.92,             // 0 glossy … 1 matte paper
  gridRepeat: 16,               // major blocks across each torus (INTEGER ⟹ seamless)
  gridSubdivisions: 3,         // fine squares per major block ⟹ a thick line every Nth (3 = 3×3)
  gridMinorWidth: 0.004,       // thin-line thickness (fraction of a major block)
  gridMajorWidth: 0.012,       // thick-line thickness
  normalMapFile: 'crease-rough.png',           // in assets/textures/
  normalRepeat: Number(url.get('nr')) || 4,    // low = large creases (?nr=)
  normalScale: Number(url.get('ns')) || 1.0,   // tooth strength (?ns=)

  // background plane
  background: 0xeef0f3,        // sky tint (mostly hidden by the plane)
  showPlane: true,
  planeRoughness: 0.95,         // 1 = fully matte, lower = sheen/reflection
  planeDistance: 0.0,         // how far behind the grid (× scene radius)
  planeSize: 40,               // HUGE so it fills the view even zoomed out (× scene radius)

  // lighting — env fill + a list of lights you can MIX & MATCH (toggle `on`).
  //   type: 'area' (soft softbox) · 'directional' (hard sun) · 'spot' (cone)
  //   shared: on, intensity, dir (center→light), color (defaults to lightColor)
  //   area:   size  (× radius; BIGGER = softer)
  //   spot:   dist (× radius), angle, penumbra, radius  (BIGGER radius = softer)
  envIntensity: 0.9,
  lights: [
    { type: 'area',        on: false, intensity: 4,  dir: [0.25, 0.35, 1], size: 0.6 },
    { type: 'directional', on: false, intensity: 1,  dir: [-0.4, 0.5, 0.9] },
    // above, equally left + out-of-screen, FAR away (even rays) and big & soft
    { type: 'spot',        on: true,  intensity: 4, dir: [-0.5, 1.2, 1], dist: 6, angle: 1.3, penumbra: 1.3, radius: 1 },
  ] as LightSpec[],
};
// ====================================================================================

// ---- studio ----
const studio = new Studio({ bounces: 5, pathTraceScale: 1, aspect: CONFIG.aspect, onModeChange: updateForMode });
studio.renderer.shadowMap.enabled = true;
studio.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
skyEnvironment(studio.scene, { intensity: CONFIG.envIntensity, background: CONFIG.background });
const ambient = new THREE.AmbientLight(0xffffff, 0.4);   // preview-only fill
studio.scene.add(ambient);

// ---- load every CSV in this folder ----
const csvs = import.meta.glob('./*.csv', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
let papers = parseEmbeddings(Object.values(csvs).join('\n'), CONFIG.torus);
if (papers.length === 0) papers = [RICH_REFERENCE];
papers = papers.slice(0, CONFIG.maxTori);

// ---- shared paper material (per-torus UVs live on the geometry, so it's shared) ----
let faceMaterial: THREE.MeshStandardMaterial;
if (CONFIG.surface === 'grid') {
  const tex = graphPaperTexture({
    bg: CONFIG.torusColor, minor: CONFIG.gridMinorColor, major: CONFIG.gridColor,
    squares: CONFIG.gridSubdivisions,
    minorWidth: CONFIG.gridMinorWidth, majorWidth: CONFIG.gridMajorWidth,
  });
  tex.repeat.set(CONFIG.gridRepeat, CONFIG.gridRepeat);
  faceMaterial = new THREE.MeshStandardMaterial({ map: tex, roughness: CONFIG.roughness, metalness: 0, flatShading: true, side: THREE.DoubleSide });
} else {
  faceMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(CONFIG.torusColor), roughness: CONFIG.roughness, metalness: 0, flatShading: true, side: THREE.DoubleSide });
}
const edgeMaterial = creaseEdgeMaterial(CONFIG.torusColor);   // match the paper color (for now)
const nrm = loadNormalMap(CONFIG.normalMapFile, { repeat: CONFIG.normalRepeat }, () => studio.notifyMaterialsChanged());
if (nrm) { faceMaterial.normalMap = nrm; faceMaterial.normalScale.set(CONFIG.normalScale, CONFIG.normalScale); faceMaterial.needsUpdate = true; }

// ---- build the grid (surface always 'grid' so lattice UVs exist for the normal map) ----
const cols = Math.ceil(Math.sqrt(papers.length));
const rows = Math.ceil(papers.length / cols);
const grid = new THREE.Group();
const tori = papers.map((paper, i) => {
  // edges are always built so V can reveal them; CONFIG.creases sets the initial visibility
  const t = styledTorus(paper, { surface: 'grid', edges: true, faceMaterial, edgeMaterial, edgeRadius: CONFIG.creaseRadius });
  t.setEdgesVisible(CONFIG.creases);
  const size = new THREE.Box3().setFromObject(t).getSize(new THREE.Vector3());
  t.scale.setScalar(CONFIG.cell / (Math.max(size.x, size.y, size.z) || 1));
  t.rotation.z = Math.PI / 2;
  const c = i % cols, r = Math.floor(i / cols);
  t.position.set((c - (cols - 1) / 2) * CONFIG.spacing, ((rows - 1) / 2 - r) * CONFIG.spacing, 0);
  grid.add(t);
  return t;
});
grid.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
studio.add(grid);

// ---- scene extent (grid is centered ⟹ center ≈ origin) ----
const gbox = new THREE.Box3().setFromObject(grid);
const gsize = gbox.getSize(new THREE.Vector3());
const gcenter = gbox.getCenter(new THREE.Vector3());
const radius = 0.5 * Math.max(gsize.x, gsize.y);

// ---- background plane (large, so it fills the frame at any zoom) ----
let wall: THREE.Mesh | undefined;
if (CONFIG.showPlane) {
  const s = radius * CONFIG.planeSize;
  wall = backWall({ color: CONFIG.wallColor, width: s, height: s, roughness: CONFIG.planeRoughness });
  wall.position.set(gcenter.x, gcenter.y, gbox.min.z - radius * CONFIG.planeDistance);
  studio.scene.add(wall);
}

// ---- lights: build each entry by type, all aimed at the scene center ----
RectAreaLightUniformsLib.init();   // required for RectAreaLight to light the WebGL preview
for (const L of CONFIG.lights) {
  if (!L.on) continue;
  const color = L.color ?? CONFIG.lightColor;
  const dir = new THREE.Vector3(L.dir[0], L.dir[1], L.dir[2]).normalize();

  if (L.type === 'area') {
    // soft "softbox" panel — diffuse soft shadows in the path trace (no preview shadow)
    const p = radius * (L.size ?? 0.6);
    const light = new THREE.RectAreaLight(color, L.intensity, p, p);
    light.position.copy(gcenter).addScaledVector(dir, radius * 3);
    light.lookAt(gcenter);
    studio.scene.add(light);

  } else if (L.type === 'directional') {
    // hard "sun" — crisp shadow in preview + path trace
    const light = new THREE.DirectionalLight(color, L.intensity);
    light.position.copy(gcenter).addScaledVector(dir, radius * 3);
    light.target.position.copy(gcenter);
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    const c = light.shadow.camera;
    c.left = -radius * 1.4; c.right = radius * 1.4; c.top = radius * 1.4; c.bottom = -radius * 1.4;
    c.near = 0.5; c.far = radius * 8; c.updateProjectionMatrix();
    light.shadow.bias = -0.0002;
    studio.scene.add(light, light.target);

  } else {
    // spotlight cone — soft shadows scale with `radius` (× scene radius)
    const dist = radius * (L.dist ?? 2.2);
    const light = new PhysicalSpotLight(color);
    light.intensity = L.intensity;
    light.angle = L.angle ?? 0.6;
    light.penumbra = L.penumbra ?? 0.7;
    light.decay = 0;
    light.distance = 0;
    light.radius = radius * (L.radius ?? 0.15);
    light.position.copy(gcenter).addScaledVector(dir, dist);
    light.target.position.copy(gcenter);
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.camera.near = Math.max(0.5, dist - radius * 1.5);
    light.shadow.camera.far = dist + radius * 2;
    light.shadow.radius = 6;
    light.shadow.bias = -0.0002;
    studio.scene.add(light, light.target);
  }
}

studio.frame(grid, { direction: new THREE.Vector3(0, 0, 1) });
studio.start();

function updateForMode(mode: 'webgl' | 'pathtracing'): void {
  ambient.intensity = mode === 'webgl' ? 0.4 : 0;   // AmbientLight is preview-only
  if (mode === 'pathtracing') studio.notifyMaterialsChanged();
}

// V toggles the edge tubes on every torus (preview); re-render to bake into the trace
let edgesShown = CONFIG.creases;
function toggleEdges(): void {
  edgesShown = !edgesShown;
  for (const t of tori) t.setEdgesVisible(edgesShown);
  studio.notifySceneChanged();
  studio.resetAccumulation();
}

// Clean frame: no HUD, no color pickers — just the Render button. (Colors are
// set in CONFIG above; V toggles the edge tubes.)
attachRenderControls(studio, {
  filename: 'rich-birthday-render.png',
  hud: false,
  keys: { v: toggleEdges },
});
