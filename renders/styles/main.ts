/**
 * styles — the three composable torus styles side by side (same modulus), built
 * with render/styledTorus:
 *
 *   left   grid, no creases
 *   middle creases, no grid
 *   right  grid + creases
 *
 * A deliberately simple companion to renders/portrait. Render… → path trace.
 */

import * as THREE from 'three';

import { RICH_REFERENCE } from '../../src/math/reference';
import { styledTorus, type StyledTorusOptions } from '../../src/render/styledTorus';
import { skyEnvironment } from '../../src/render/stage';
import { attachRenderControls } from '../../src/render/controls';
import { Studio } from '../../src/render/studio';

const studio = new Studio({ bounces: 6, pathTraceScale: 1, onModeChange });
skyEnvironment(studio.scene, { intensity: 0.9, background: 0xeef0f3 });

// cheap fill lights for the preview only
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
const key = new THREE.DirectionalLight(0xffffff, 0.8);
key.position.set(3, 5, 4);
studio.scene.add(ambient, key);

// the three styles
const GRID = { levels: [6, 12, 24, 48], cellColor: '#b8902a', lineColor: '#5a3415', majorWidth: 0.008 };
const STYLES: StyledTorusOptions[] = [
  { surface: 'grid', edges: false, grid: GRID },   // grid only
  { surface: 'plain', edges: true },               // creases only
  { surface: 'grid', edges: true, grid: GRID },    // both
];

// build each style, roll 90° (long side vertical), lay out in a horizontal row
const built = STYLES.map((opts) => {
  const t = styledTorus(RICH_REFERENCE, opts);   // centered ⟹ transforms are about its center
  t.rotation.z = Math.PI / 2;
  return t;
});
const size = new THREE.Box3().setFromObject(built[0]).getSize(new THREE.Vector3());
const spacing = Math.max(size.x, size.y) * 1.25;

const row = new THREE.Group();
built.forEach((t, i) => { t.position.set(i * spacing, 0, 0); row.add(t); });
row.position.x = -spacing;             // put the middle torus at the origin
studio.add(row);

studio.frame(row, { direction: new THREE.Vector3(0, 0, 1) });
studio.start();

function onModeChange(mode: 'webgl' | 'pathtracing'): void {
  const preview = mode === 'webgl';
  ambient.intensity = preview ? 0.5 : 0;
  key.intensity = preview ? 0.8 : 0;
  if (!preview) studio.notifyMaterialsChanged();
}

attachRenderControls(studio, {
  filename: 'flat-tori-styles.png',
  hudLine: () => 'grid · creases · both',
});
