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
import { GradientEquirectTexture, PhysicalSpotLight } from 'three-gpu-pathtracer';

import { RICH } from '../../src/tori';
import { RICH_REFERENCE } from '../../src/math/reference';
import { parseEmbeddings } from '../../src/io/embeddings';
import { styledTorus, type StyledTorusOptions } from '../../src/render/styledTorus';
import { Studio } from '../../src/render/studio';
import seed7 from '../../data/explore-from-seeds/seed-7.csv?raw';

// ---- studio ----
const studio = new Studio({ bounces: 6, pathTraceScale: 1, onModeChange: updateForMode });
studio.renderer.shadowMap.enabled = true;
studio.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ---- environment ----
const env = new GradientEquirectTexture();
env.topColor.set(0x9fb8d6);
env.bottomColor.set(0xe9e4da);
env.update();
studio.scene.environment = env;
studio.scene.environmentIntensity = 0.5;
studio.scene.background = new THREE.Color(0xeef0f3);

// ---- back wall + light (positions re-fit per subject) ----
const wall = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 28),
  new THREE.MeshStandardMaterial({ color: 0xced3da, roughness: 0.7 }),
);
wall.receiveShadow = true;
studio.scene.add(wall);

const spot = new PhysicalSpotLight(0xffffff);
spot.angle = Math.PI / 4;
spot.penumbra = 0.8;
spot.decay = 0;
spot.distance = 0;
spot.intensity = 6;
spot.radius = 0.5;
spot.castShadow = true;
spot.shadow.mapSize.set(2048, 2048);
spot.shadow.camera.near = 0.5;
spot.shadow.camera.far = 20;
spot.shadow.radius = 8;
spot.shadow.bias = -0.0001;
studio.scene.add(spot, spot.target);

const ambient = new THREE.AmbientLight(0xffffff, 0.4);
studio.scene.add(ambient);

// ---- subjects: 3 styles × many moduli ----
const GRID = { levels: [6, 12, 24, 48], cellColor: '#b8902a', lineColor: '#5a3415', majorWidth: 0.008 };
const STYLES: { label: string; opts: StyledTorusOptions }[] = [
  { label: 'plain + creases', opts: { surface: 'plain', edges: true } },
  { label: 'grid',            opts: { surface: 'grid', edges: false, grid: GRID } },
  { label: 'grid + creases',  opts: { surface: 'grid', edges: true,  grid: GRID } },
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
    subject.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const m = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (m) { m.map?.dispose(); m.dispose(); }
    });
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

// ---- input + HUD ----
const hud = document.createElement('div');
hud.style.cssText = 'position:fixed;top:10px;left:12px;font:12px ui-monospace,monospace;color:#cdd;background:rgba(0,0,0,.45);padding:5px 9px;border-radius:6px;white-space:pre';
document.body.appendChild(hud);

window.addEventListener('keydown', (e) => {
  if (e.key === 'p' || e.key === 'P') studio.toggleMode();
  else if (e.key === 'v' || e.key === 'V') { styleIdx = (styleIdx + 1) % STYLES.length; setSubject(); }
  else if (e.key === 'ArrowRight') { modIdx = (modIdx + 1) % moduli.length; setSubject(); }
  else if (e.key === 'ArrowLeft') { modIdx = (modIdx - 1 + moduli.length) % moduli.length; setSubject(); }
  else if (e.key === 's' || e.key === 'S') studio.screenshot('flat-torus.png');
});

function tickHud(): void {
  const mode = studio.isPathTracing() ? `path trace — ${Math.floor(studio.samples)} spp` : 'webgl preview';
  const where = modIdx === 0 ? 'reference' : `seed-7 #${modIdx}`;
  hud.textContent = `${STYLES[styleIdx].label}   ·   modulus: ${where} (${modIdx + 1}/${moduli.length})\n${mode}   (V: style   ← →: modulus   P: render   S: save)`;
  requestAnimationFrame(tickHud);
}
tickHud();
