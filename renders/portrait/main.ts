/**
 * portrait — a front-on studio render of a flat torus against a back wall, with
 * a soft shadow. Demonstrates the three composable styles × any modulus:
 *
 *   V         cycle style: plain+creases · grid · grid+creases
 *   ← / →     step through moduli (Rich's reference, then the seed-7 dataset)
 *   P         WebGL preview ↔ path trace
 *
 * Subjects are built by render/styledTorus; the grid UV adapts to each torus's
 * own modulus. The stage (env, wall, light) is built here and re-fit per torus.
 */

import * as THREE from 'three';

import { RICH } from '../../src/tori';
import { RICH_REFERENCE } from '../../src/math/reference';
import { parseEmbeddings } from '../../src/io/embeddings';
import { styledTorus, creaseEdgeMaterial, type StyledTorusOptions } from '../../src/render/styledTorus';
import { graphPaperTexture } from '../../src/render/grid';
import { skyEnvironment, softSpot, backWall } from '../../src/render/stage';
import { loadNormalMap } from '../../src/render/textures';
import { attachRenderControls } from '../../src/render/controls';
import { Studio } from '../../src/render/studio';
import seed7 from '../../data/explore-from-seeds/seed-7.csv?raw';

// ============================ tweak the whole look here ============================
const url = new URLSearchParams(location.search);
const CONFIG = {
  // paper surface
  paperColor: '#f0e8d2',          // warm cream (reads as paper, not pure white)
  roughness: 0.92,                // 0 = glossy … 1 = matte paper
  // graph lines
  gridRepeat: 6,                  // major blocks across the torus (INTEGER ⟹ seamless)
  minorColor: '#9fb4d4', majorColor: '#5f82b4',
  minorWidth: 0.006, majorWidth: 0.015,
  // paper-grain normal map (file in assets/textures/)
  normalMapFile: 'crease-rough.png',
  normalRepeat: Number(url.get('nr')) || 4,    // low = large creases (?nr=)
  normalScale: Number(url.get('ns')) || 1.,   // tooth strength (?ns=)
  // crease cylinders
  creaseColor: 0xf4f1e8, creaseRadius: 0.004,
  // stage
  background: 0xeef0f3, wallColor: 0xced3da,
  envIntensity: 0.5, spotIntensity: 6,
};
// ===================================================================================

// ---- studio + stage ----
const studio = new Studio({ bounces: 6, pathTraceScale: 1, onModeChange: updateForMode });
studio.renderer.shadowMap.enabled = true;
studio.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
skyEnvironment(studio.scene, { intensity: CONFIG.envIntensity, background: CONFIG.background });

// back wall + key spotlight (positions re-fit per subject)
const wall = backWall({ color: CONFIG.wallColor });
studio.scene.add(wall);
const spot = softSpot({ intensity: CONFIG.spotIntensity });
studio.scene.add(spot, spot.target);
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
studio.scene.add(ambient);

// ---- paper materials (all knobs come from CONFIG above) ----
const paperTex = graphPaperTexture({
  bg: CONFIG.paperColor, minor: CONFIG.minorColor, major: CONFIG.majorColor,
  minorWidth: CONFIG.minorWidth, majorWidth: CONFIG.majorWidth,
});
paperTex.repeat.set(CONFIG.gridRepeat, CONFIG.gridRepeat);
const matBase = { roughness: CONFIG.roughness, metalness: 0.0, flatShading: true, side: THREE.DoubleSide } as const;
const paperGrid = new THREE.MeshStandardMaterial({ map: paperTex, ...matBase });
const paperBlank = new THREE.MeshStandardMaterial({ color: new THREE.Color(CONFIG.paperColor), ...matBase });
const paperMats = [paperGrid, paperBlank];
const edgeMat = creaseEdgeMaterial(CONFIG.creaseColor);   // shared across subjects

// Paper-grain normal map, loaded from assets/textures by name (CONFIG.normalMapFile).
const normalTex = loadNormalMap(CONFIG.normalMapFile, { repeat: CONFIG.normalRepeat }, () => studio.notifyMaterialsChanged());
if (normalTex) {
  for (const m of paperMats) {
    m.normalMap = normalTex;
    m.normalScale.set(CONFIG.normalScale, CONFIG.normalScale);
    m.needsUpdate = true;
  }
}

// ---- styles × moduli (surface defaults to 'grid' ⟹ lattice UVs for both map + normal) ----
const STYLES: { label: string; opts: StyledTorusOptions }[] = [
  { label: 'blank paper + creases', opts: { edges: true,  faceMaterial: paperBlank, edgeMaterial: edgeMat, edgeRadius: CONFIG.creaseRadius } },
  { label: 'graph paper',           opts: { edges: false, faceMaterial: paperGrid } },
  { label: 'graph paper + creases', opts: { edges: true,  faceMaterial: paperGrid,  edgeMaterial: edgeMat, edgeRadius: CONFIG.creaseRadius } },
];
const moduli = [RICH_REFERENCE, ...parseEmbeddings(seed7, RICH)];

// initial style/modulus can be set via ?style=N&mod=M (also stepped live below)
const params = new URLSearchParams(location.search);
const idx = (v: string | null, def: number, n: number) => {
  const k = Number(v);
  return Number.isInteger(k) && k >= 0 && k < n ? k : def;
};
let styleIdx = idx(params.get('style'), 2, STYLES.length);   // grid + creases
let modIdx = idx(params.get('mod'), 0, moduli.length);       // Rich's reference
let subject: THREE.Object3D | null = null;

function setSubject(): void {
  if (subject) {
    studio.scene.remove(subject);
    // dispose only geometry — materials/textures are shared across moduli
    subject.traverse((o) => { (o as THREE.Mesh).geometry?.dispose(); });
  }

  // centered TorusMesh ⟹ rotation rolls about its own center
  const s = styledTorus(moduli[modIdx], STYLES[styleIdx].opts);
  s.rotation.z = Math.PI / 2;   // stand on the long side
  s.traverse((o: THREE.Object3D) => { o.castShadow = true; o.receiveShadow = true; });
  subject = s;
  studio.scene.add(s);

  // re-fit the stage to this torus
  const box = new THREE.Box3().setFromObject(s);
  const center = box.getCenter(new THREE.Vector3());
  wall.position.set(center.x, center.y, box.min.z - 1.5);
  spot.position.set(center.x + 1.2, center.y + 2.4, box.max.z + 2.5);
  spot.target.position.copy(center);

  studio.frame(s, { direction: new THREE.Vector3(0, 0, 1) });
  studio.notifySceneChanged();
  studio.resetAccumulation();
}

setSubject();
studio.start();

function updateForMode(mode: 'webgl' | 'pathtracing'): void {
  ambient.intensity = mode === 'pathtracing' ? 0 : 0.4;
  if (mode === 'pathtracing') studio.notifyMaterialsChanged();
}

// ---- render controls (resolution popup + high-res save + HUD), with the
//      style/modulus explorer keys passed through ----
attachRenderControls(studio, {
  filename: 'flat-torus.png',
  hudLine: () => {
    const where = modIdx === 0 ? 'reference' : `seed-7 #${modIdx}`;
    return `${STYLES[styleIdx].label}  ·  modulus: ${where} (${modIdx + 1}/${moduli.length})  ·  V: style  ← →: modulus`;
  },
  keys: {
    v: () => { styleIdx = (styleIdx + 1) % STYLES.length; setSubject(); },
    ArrowRight: () => { modIdx = (modIdx + 1) % moduli.length; setSubject(); },
    ArrowLeft: () => { modIdx = (modIdx - 1 + moduli.length) % moduli.length; setSubject(); },
  },
});
