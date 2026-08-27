/**
 * paper-tori — Lander's two tori as a three-panel figure: the configuration folded FLAT into
 * the plane, the same torus lifted slightly off it, and one carried much further out by the
 * fiber search — far enough that you can see through it. Graph-paper look of the birthday
 * renders throughout.
 *
 * All three panels are exact:
 *
 *   1. THE FOLD          `sampling/foldedBases` at t = 0. Exactly flat, exactly at modulus,
 *                        and not embedded — it lies in a plane with eight of its sixteen
 *                        triangles folded over, so the sheet overlaps itself.
 *   2. THE SLIGHT LIFT   a rung of the inflation ladder (`npm run inflate-fold`), where the
 *                        push-off along ζ has been solved back onto {flat} ∩ {τ = τ₀}. Every
 *                        rung is verified flat AND at modulus AND embedded, so this is a
 *                        genuine paper torus, just barely off the plane.
 *   3. THE DEFORMATION   the .obj in this folder, read by `paperFromObj` — which identifies
 *                        its triangulation from its own face list rather than trusting the
 *                        filename, so a mislabelled file is rejected instead of quietly
 *                        rendering as the wrong torus. Both current files have a VISIBLE HOLE
 *                        (square 0.00515, hexagonal 0.00211), which is what makes this panel
 *                        worth showing rather than just another lumpy sheet.
 *
 * A hole here is only visible in a narrow band of directions — measured, the see-through
 * direction sits 85–89° from the flattest axis, i.e. you look through these EDGE-ON, never at
 * the broad face. Each panel's direction is printed to the console so you can aim for it;
 * DRAG a torus to turn it (G resets). `?facehole=1` snaps them there automatically.
 *
 * EVERY PANEL IS VERIFIED before it is drawn — cone deficit, embeddedness, reduced modulus
 * against its target — with results in the console and a banner on failure. Verification runs
 * on the EXACT positions, never on anything nudged for rendering; a check that reports defects
 * the renderer introduced only teaches you to ignore it.
 *
 * TWO RENDERING CONCESSIONS, both display-only and both stated in the console:
 *   - The fold's sheets are coincident, so they z-fight. `CONFIG.planarLift` separates the
 *     layers by a microscopic amount along ζ — ~0.2% of the fold's width, far below anything
 *     visible, but comfortably above depth-buffer precision.
 *   - The edges are BAKED INTO THE PAPER TEXTURE (`viewer/latticeEdgeTexture`), not drawn as
 *     crease tubes. Tubes are real geometry with a real radius, so on the fold a tube on the
 *     lower sheet pokes through the sheet above it; and a shader wireframe, while thickness-
 *     free, is an `onBeforeCompile` patch that `three-gpu-pathtracer` ignores. A texture is a
 *     material PROPERTY, so it traces. It works because the lattice UVs are the developed
 *     position in lattice coordinates, and developing takes each edge to a straight segment,
 *     so the 1-skeleton is just some straight lines in UV space. `?edges=tubes` for the old
 *     behavior, `?edges=none` for bare paper. The tile is 4096 (`?texsize=`) so a major graph
 *     cell keeps the 3:1 major/minor line contrast of the birthday renders, and it is re-baked
 *     to a PNG before use (`?tex=canvas` to skip) — a canvas-backed map traces BLACK.
 *
 * LAYOUTS are switched by the buttons across the top (or `?layout=`): triptych-square
 * (default) · triptych-hex · pair-square · pair-hex · folds · all. The hexagonal triptych is
 * the same three panels for the other torus — the flattened hexagonal base from the paper, its
 * push-off resolved back onto {flat} ∩ {τ = ρ}, and the inflated `hex.obj` beside it. Switching
 * RELOADS (the panels are built at load) and drops `?pose=`/`?scale=`, which are indexed by
 * panel and do not mean the same thing in another layout.
 *   ?facehole=0 leaves every panel in its stored orientation.
 * DRAG A TORUS to turn it in place (about its own centre); drag the background to orbit the
 * camera as usual. G puts every panel back to its framed orientation.
 *
 * SHIFT-DRAG a torus to MOVE it instead, so a stacked pair can be arranged by hand. + / −
 * RESIZE the panel you last touched — the deformed one to start with, since that is the one
 * with the hole. 0 puts every size and position back. Panels are re-spaced from their actual
 * bounding boxes, so growing one pushes its neighbours aside rather than overlapping them; the
 * console prints a `?scale=` you can paste to reproduce a layout.
 *
 * C SAVES THE WHOLE ARRANGEMENT — every panel's turn, nudge and size — as a `?pose=` printed
 * to the console and copied to the clipboard. Paste it onto the URL to come back to exactly
 * this layout. (It carries the sizes, so it supersedes `?scale=`.) Nothing is saved
 * automatically, so press C before you reload.
 *
 * The last column holds `?copies=` (default 2) copies of the SAME deformed torus, stacked, so
 * you can turn them independently and show two views of one object — the hole is only visible
 * in a narrow band, so one view can show it open while the other shows the shape.
 *
 * Render… → path trace; S saves the image, C saves the arrangement. V toggles creases;
 * ?edges= switches tubes ↔ shader edges.
 */

import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { PhysicalSpotLight } from 'three-gpu-pathtracer';

import { SQUARE_FOLD, HEXAGONAL_FOLD, liftedPositions, type FoldedBase } from '@core/sampling/foldedBases.ts';
import { makePaperTorus, type PaperTorus } from '@core/configuration/paperTorus.ts';
import { measure } from '@core/search/measure.ts';
import { shapeReport, squash, bestHoleView } from '@core/search/shape.ts';
import { makeTorusView, type TorusView } from '@display/viewer/TorusView';
import { paperMaterials } from '@display/viewer/materials';
import { latticeEdgeTexture, imageBackedTexture } from '@display/viewer/gridTexture';
import { paperFromObj } from '@display/mesh/obj';
import { skyEnvironment, backWall } from '@app/render/stage';
import { attachRenderControls } from '@app/render/controls';
import { Studio } from '@app/render/studio';
import squareLadder from '../../demos/steve-folded-tori/data/square.csv?raw';
import hexagonalLadder from '../../demos/steve-folded-tori/data/hexagonal.csv?raw';

// ============================ tweak the whole piece here ============================
const url = new URLSearchParams(location.search);
const num = (k: string, d: number) => (url.get(k) !== null ? Number(url.get(k)) : d);

const CONFIG = {
  // ===================== COLORS (matched to the birthday renders) =====================
  torusColor:     '#dcbf6f',   // the paper
  gridColor:      '#2435AF',   // thick (major) graph lines
  gridMinorColor: '#4e5988',   // thin (fine) graph lines
  wallColor:      '#eceacf',   // background plane
  lightColor:     '#ffffff',
  // ====================================================================================

  layout: (url.get('layout') ?? 'triptych-square') as
    'triptych-square' | 'triptych-hex' | 'pair-square' | 'pair-hex' | 'folds' | 'all',

  /** Off by default: panels keep their stored orientation and you aim them by hand (drag a
   *  torus to turn it, G to reset). `?facehole=1` snaps each holed panel to face its hole. */
  faceHole: url.get('facehole') === '1',

  /** The middle panel is chosen by how far off the plane it LOOKS, not by t, so the two
   *  triptychs read the same: the ladder rung whose `squash` (min/max principal extent) is
   *  nearest this. 0.10 is about a third of the deformed panels' 0.31–0.34 — clearly lifted,
   *  clearly not yet the final shape. `?t=` overrides and selects by push-off height instead. */
  liftSquash: num('squash', 0.10),
  liftT: url.get('t') !== null ? Number(url.get('t')) : null,

  aspect: 16 / 9,
  cell: 1.0,                   // each panel normalized to this size before its own multiplier
  gap: 0.55,                   // clear space between panels (× cell)
  /** Per-panel size multipliers, e.g. ?scale=1,1,1.8,1.8. Missing entries default to 1.
   *  Panels are re-spaced to fit whatever sizes are in force, so growing one never overlaps
   *  its neighbours. */
  scales: (url.get('scale') ?? '').split(',').map(Number).filter((v) => v > 0),
  /** A whole saved ARRANGEMENT — every panel's turn, nudge and size, as printed (and copied
   *  to the clipboard) by C. Paste the `?pose=` back to get the layout you had; it supplies
   *  the sizes too, so it overrides `?scale=`. */
  pose: url.get('pose') ?? '',
  /** Which .obj feeds the deformed panels: 'square2' has the bigger hole (0.0067 vs 0.0054). */
  squareObj: url.get('obj') ?? 'square2',
  /** Copies of the deformed torus, STACKED in the last column, so the same torus can be
   *  turned two different ways and read as two views of one object. */
  copies: Number(url.get('copies') ?? 2),

  /** DISPLAY ONLY: separate the fold's coincident sheets by this fraction of its width.
   *  Microscopic — invisible at any sane zoom, but above depth-buffer precision. Never
   *  touches what gets verified. ?lift=0 to see the true coincident planes fight. */
  planarLift: num('lift', 0.002),

  /** 'texture' bakes the edges into the paper (traces correctly, no thickness to poke
   *  through the fold); 'tubes' is the old real geometry; 'none' is bare paper. */
  edges: (url.get('edges') ?? 'texture') as 'texture' | 'tubes' | 'none',
  edgeColor: '#241a10',
  edgeWidth: num('ew', 0.0045),     // fraction of the fundamental domain
  creaseRadius: 0.004,

  /**
   * Texels across the WHOLE fundamental domain for the baked-edge paper. It has to be big:
   * the graph paper is subdivided INSIDE this one tile, so a major cell only gets
   * `textureSize / gridRepeat` texels, and the line widths are fractions of a major cell.
   * At 2048 with gridRepeat 16 that is 128 texels per cell, where the minor line (0.004)
   * lands at half a texel and is clamped up to one — the same width as the major line
   * (0.012 → 1.5), so the graph paper loses the 3:1 major/minor contrast that
   * rich-birthday-render has (it repeats a 1024 tile PER major cell). 4096 restores it:
   * 256 texels per cell ⟹ minor 1, major 3.
   */
  textureSize: num('texsize', 4096),
  /**
   * How the baked colour map is backed. Measured on `paper-folds`: a CANVAS-backed map
   * renders BLACK in the path trace while the image-backed normal map beside it is fine,
   * and the WebGL preview shows both correctly — so re-bake the canvas to a PNG and load it
   * back. `?tex=canvas` uses the canvas directly (faster, fine for preview-only work).
   */
  textureBacking: (url.get('tex') ?? 'image') as 'image' | 'canvas',

  // paper surface detail (same knobs as rich-birthday-render)
  roughness: 0.92,
  gridRepeat: 16,
  gridSubdivisions: 3,
  gridMinorWidth: 0.004,
  gridMajorWidth: 0.012,
  normalMapFile: 'crease-rough.png',
  normalRepeat: num('nr', 4),
  normalScale: num('ns', 1.0),

  // stage
  background: 0xeef0f3,
  showPlane: true,
  planeRoughness: 0.95,
  planeDistance: 0.35,
  planeSize: 40,
  envIntensity: 0.9,
  spotIntensity: 4,
};
// ====================================================================================

const studio = new Studio({ bounces: 5, pathTraceScale: 1, aspect: CONFIG.aspect, onModeChange: updateForMode });
studio.renderer.shadowMap.enabled = true;
studio.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
skyEnvironment(studio.scene, { intensity: CONFIG.envIntensity, background: CONFIG.background });
const ambient = new THREE.AmbientLight(0xffffff, 0.4);   // preview-only fill
studio.scene.add(ambient);

// ---- the panels ----
interface Subject {
  label: string;
  base: FoldedBase;
  /** The EXACT configuration — what gets verified. */
  paper: PaperTorus;
  /** What gets drawn: equals `paper.positions` unless a display-only nudge is in force. */
  display: Float64Array;
  displayNote?: string;
  /** The fold is not embedded by construction; don't report that as a fault. */
  expectEmbedded: boolean;
  /** Radius of the visible hole, 0 if none — and the direction it is visible along. */
  hole: number;
  holeDirection: [number, number, number];
}

const BASES: Record<string, FoldedBase> = { square: SQUARE_FOLD, hex: HEXAGONAL_FOLD };

/** Does this realization have a hole, and along which direction? (Generous sampling: the
 *  visible band is only a couple of percent of the sphere, so a coarse scan reports "none".) */
function holeOf(base: FoldedBase, p: Float64Array): { hole: number; holeDirection: [number, number, number] } {
  const v = bestHoleView(base.triang, p, { directions: 400, resolution: 160 });
  return { hole: v.size, holeDirection: v.direction };
}
const LADDERS: Record<string, string> = { square: squareLadder, hex: hexagonalLadder };
const problems: string[] = [];

/** Panel 1 — the exact fold, plus a microscopic display-only lift to break coincidence. */
function foldPanel(key: string): Subject {
  const base = BASES[key];
  const paper = makePaperTorus(base.triang, liftedPositions(base, 0));
  let display = paper.positions;
  let displayNote: string | undefined;
  if (CONFIG.planarLift > 0) {
    let lo = Infinity, hi = -Infinity;
    for (const [x] of base.planar) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
    const eps = CONFIG.planarLift * (hi - lo);
    display = Float64Array.from(paper.positions);
    for (let v = 0; v < base.triang.vertexCount; v++) display[3 * v + 2] = eps * base.lift[v];
    displayNote = `drawn with a microscopic display-only z-lift (${CONFIG.planarLift} of its width) so the coincident sheets do not z-fight`;
  }
  return { label: `${key}: the fold`, base, paper, display, displayNote, expectEmbedded: false, ...holeOf(base, paper.positions) };
}

/** Panel 2 — a ladder rung: exactly flat, exactly at modulus, embedded, just off the plane. */
function liftPanel(key: string): Subject | null {
  const base = BASES[key];
  const rows = LADDERS[key].trim().split('\n').filter(Boolean);
  if (!rows.length) { problems.push(`${key}: no inflation ladder — run \`npm run inflate-fold\``); return null; }

  // score each rung by whichever criterion is in force, and take the nearest
  const scored = rows.map((r) => {
    const v = r.split(',').map(Number);
    const positions = Float64Array.from(v.slice(5));
    return { t: v[0], positions, squash: squash(positions) };
  });
  const best = CONFIG.liftT !== null
    ? scored.reduce((a, b) => (Math.abs(b.t - CONFIG.liftT!) < Math.abs(a.t - CONFIG.liftT!) ? b : a))
    : scored.reduce((a, b) =>
      (Math.abs(b.squash - CONFIG.liftSquash) < Math.abs(a.squash - CONFIG.liftSquash) ? b : a));

  const paper = makePaperTorus(base.triang, best.positions);
  return {
    label: `${key}: slight lift (t=${best.t.toFixed(2)}, squash ${best.squash.toFixed(3)})`,
    base, paper, display: paper.positions, expectEmbedded: true, ...holeOf(base, paper.positions),
  };
}

/** Panel 3 — the deformed torus, from the .obj saved out of the fiber-cloud demo. */
const objFiles = import.meta.glob('./*.obj', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const deformed = new Map<string, Subject>();
for (const [path, text] of Object.entries(objFiles)) {
  const key = path.replace(/^\.\//, '').replace(/\.obj$/, '');
  const base = BASES[key.replace(/\d+$/, '')];        // square2.obj belongs to the square base
  if (!base) { console.warn(`paper-tori: ignoring ${path} — expected square*.obj or hex*.obj`); continue; }
  try {
    const paper = paperFromObj(text, [base.triang]);
    deformed.set(key, {
      label: `${key}: deformed`, base, paper, display: paper.positions, expectEmbedded: true,
      ...holeOf(base, paper.positions),
    });
  } catch (err) {
    problems.push(`${path}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
function deformedPanel(key: string): Subject | null {
  const s = deformed.get(key);
  if (!s) problems.push(`${key}.obj is missing — drop it in renders/steve-paper-tori/`);
  return s ?? null;
}
/** `n` copies of the same deformed torus, to be stacked and turned independently. */
function deformedCopies(key: string, n: number): (Subject | null)[] {
  const s = deformedPanel(key);
  if (!s) return [null];
  return Array.from({ length: Math.max(1, n) }, (_, i) =>
    ({ ...s, label: n > 1 ? `${s.label} (view ${i + 1})` : s.label }));
}

// A layout is a list of COLUMNS, each holding one or more panels stacked vertically.
const LAYOUTS: Record<string, () => (Subject | null)[][]> = {
  'triptych-square': () => [[foldPanel('square')], [liftPanel('square')], deformedCopies(CONFIG.squareObj, CONFIG.copies)],
  'triptych-hex':    () => [[foldPanel('hex')], [liftPanel('hex')], deformedCopies('hex', CONFIG.copies)],
  'pair-square': () => [[foldPanel('square')], [liftPanel('square')]],
  'pair-hex':    () => [[foldPanel('hex')], [liftPanel('hex')]],
  folds:         () => [[foldPanel('square')], [foldPanel('hex')]],
  all:           () => [
    [foldPanel('square')], [liftPanel('square')], deformedCopies(CONFIG.squareObj, CONFIG.copies),
    [foldPanel('hex')], [liftPanel('hex')], deformedCopies('hex', CONFIG.copies),
  ],
};
const columns = (LAYOUTS[CONFIG.layout] ?? LAYOUTS['triptych-square'])()
  .map((col) => col.filter((s): s is Subject => s !== null))
  .filter((col) => col.length > 0);
const subjects = columns.flat();
/** Which column each panel is in, so the layout can stack them. */
const columnOf = columns.flatMap((col, c) => col.map(() => c));

// ---- verify every panel, on its EXACT positions ----
console.log(`paper-tori — layout '${CONFIG.layout}', edges '${CONFIG.edges}'`);
for (const s of subjects) {
  const m = measure(s.base.triang, s.paper.positions);
  const sh = shapeReport(s.base.triang, s.paper.positions);
  const target = s.base.tauHat;
  const dTau = Math.min(
    Math.hypot(m.tauHat[0] - target[0], m.tauHat[1] - target[1]),
    Math.hypot(m.tauHat[0] + target[0], m.tauHat[1] - target[1]),   // ±Re on the wall
  );
  console.log(
    `  ${s.label.padEnd(30)} deficit ${m.coneDeficit.toExponential(2)}`
    + `  τ̂ off ${dTau.toExponential(2)}  embedded ${m.embedded}`
    + `  clearance ${m.clearance.toExponential(2)}  inflation ${sh.volumeRatio.toExponential(2)}`
    + (s.hole > 0 ? `  HOLE ${s.hole.toFixed(5)}` : ''),
  );
  if (s.hole > 0) {
    console.log(`  ${''.padEnd(30)} see through it along (${s.holeDirection.map((v) => v.toFixed(3)).join(', ')})`);
  }
  if (s.displayNote) console.log(`  ${''.padEnd(30)} ${s.displayNote}`);
  if (m.coneDeficit >= 1e-9) problems.push(`${s.label}: NOT flat (${m.coneDeficit.toExponential(2)})`);
  if (dTau >= 1e-8) problems.push(`${s.label}: modulus off by ${dTau.toExponential(2)}`);
  if (s.expectEmbedded && !m.embedded) problems.push(`${s.label}: NOT embedded`);
}
console.log(`  edges: ${CONFIG.edges}${CONFIG.edges === 'texture' ? ' (baked into the paper — traces correctly)' : ''}`);
if (problems.length) {
  const banner = document.createElement('div');
  banner.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:100',
    'background:#7a1f1f', 'color:#fff', 'font:12px/1.5 system-ui,sans-serif', 'padding:8px 14px',
  ].join(';');
  banner.innerHTML = '<b>paper-tori</b><br>' + problems.map((p) => `• ${p}`).join('<br>');
  document.body.appendChild(banner);
}

// ---- materials ----
// With baked edges the texture belongs to ONE realization's developed net, so each panel gets
// its own material; with tubes/none the paper is identical everywhere and one is shared.
const shared = paperMaterials({
  surface: 'grid',
  paperColor: CONFIG.torusColor, gridColor: CONFIG.gridColor, gridMinorColor: CONFIG.gridMinorColor,
  roughness: CONFIG.roughness, gridRepeat: CONFIG.gridRepeat, gridSubdivisions: CONFIG.gridSubdivisions,
  gridMinorWidth: CONFIG.gridMinorWidth, gridMajorWidth: CONFIG.gridMajorWidth,
  normalMapFile: CONFIG.normalMapFile, normalRepeat: CONFIG.normalRepeat, normalScale: CONFIG.normalScale,
}, () => studio.notifyMaterialsChanged());

const normalMap = shared.surface.normalMap;   // reuse the one loaded image across panels

function surfaceFor(s: Subject): THREE.MeshStandardMaterial {
  if (CONFIG.edges !== 'texture') return shared.surface;
  const canvasMap = latticeEdgeTexture(s.base.triang, s.paper.positions, {
    size: CONFIG.textureSize,
    bg: CONFIG.torusColor, minor: CONFIG.gridMinorColor, major: CONFIG.gridColor,
    gridRepeat: CONFIG.gridRepeat, gridSubdivisions: CONFIG.gridSubdivisions,
    minorWidth: CONFIG.gridMinorWidth, majorWidth: CONFIG.gridMajorWidth,
    edgeColor: CONFIG.edgeColor, edgeWidth: CONFIG.edgeWidth,
  });
  const map = CONFIG.textureBacking === 'image'
    ? imageBackedTexture(canvasMap, () => studio.notifyMaterialsChanged())
    : canvasMap;
  const m = new THREE.MeshStandardMaterial({
    map, vertexColors: true, roughness: CONFIG.roughness, metalness: 0,
    flatShading: true, side: THREE.DoubleSide,
  });
  if (normalMap) { m.normalMap = normalMap; m.normalScale.set(CONFIG.normalScale, CONFIG.normalScale); }
  return m;
}

// ---- the layout switch, across the top ----
// The three panels of a triptych are BUILT at module load — which subjects exist, their scales,
// their positions — so switching layout reloads rather than rebuilding live. `?pose=` and
// `?scale=` are dropped on the way: both are indexed BY PANEL, and a different layout is a
// different set of panels, so carrying them across would silently apply the square torus's
// arrangement to the hexagonal one's.
{
  const LAYOUT_NAMES = ['triptych-square', 'triptych-hex', 'pair-square', 'pair-hex', 'folds', 'all'];
  const bar = document.createElement('div');
  bar.style.cssText = ['position:fixed', 'top:10px', 'left:50%', 'transform:translateX(-50%)',
    'z-index:20', 'display:flex', 'gap:4px', 'padding:4px',
    'background:rgba(20,20,24,0.7)', 'border-radius:8px',
    'font:12px/1 -apple-system,system-ui,sans-serif'].join(';');
  for (const name of LAYOUT_NAMES) {
    const b = document.createElement('button');
    const on = name === CONFIG.layout;
    b.textContent = name;
    b.style.cssText = ['padding:5px 10px', 'border-radius:5px', 'cursor:pointer',
      'border:1px solid ' + (on ? '#c8a45c' : '#3a3a42'),
      'background:' + (on ? '#c8a45c' : 'transparent'),
      'color:' + (on ? '#1a1a1f' : '#c8c8d0'),
      'font:inherit'].join(';');
    b.onclick = () => {
      const q = new URLSearchParams(location.search);
      q.set('layout', name);
      q.delete('pose'); q.delete('scale');
      location.search = q.toString();
    };
    bar.appendChild(b);
  }
  document.body.appendChild(bar);
}

// ---- lay the panels out in a row ----
const row = new THREE.Group();
const panelScale = subjects.map((_, i) => CONFIG.scales[i] ?? 1);
/** Unit-cell scale for each panel, before its multiplier — set once from its own extent. */
const baseScale: number[] = [];

const views: TorusView[] = subjects.map((s, i) => {
  const view = makeTorusView(s.base.triang, {
    // uvRepeat 1: with baked edges the whole torus is ONE tile, so the paper is subdivided
    // inside it rather than by repeating a small tile
    surface: { material: surfaceFor(s), uvRepeat: CONFIG.edges === 'texture' ? 1 : CONFIG.gridRepeat },
    creases: { material: shared.crease, radius: CONFIG.creaseRadius, offset: 0 },
  });
  view.draw(s.display);
  // tubes only when they are the chosen edge style — on the fold they poke through the sheets
  view.setVisible('edge', CONFIG.edges === 'tubes');
  const g = view.group;
  if (CONFIG.faceHole && s.hole > 0) {
    // the studio frames along +z, so bring the see-through direction onto +z
    const from = new THREE.Vector3(...s.holeDirection).normalize();
    g.quaternion.setFromUnitVectors(from, new THREE.Vector3(0, 0, 1));
  }
  const size = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
  baseScale[i] = CONFIG.cell / (Math.max(size.x, size.y, size.z) || 1);
  g.scale.setScalar(baseScale[i] * panelScale[i]);
  row.add(g);
  return view;
});

/** Manual nudges from shift-dragging, applied on top of the computed layout. */
const offsets = subjects.map(() => new THREE.Vector3());

// ---- the arrangement: restore ?pose=, and hand the current one back on C ----
// Eight numbers per panel — quaternion (4), shift-drag nudge (3), size multiplier (1) — with
// panels separated by ';'. Restoring happens HERE, after `baseScale` has been measured from
// each panel's own extent, which is exactly where a drag would have applied it: measure the
// unit size first, then turn. Doing it earlier would normalize the ROTATED bounding box and
// quietly resize every panel.
if (CONFIG.pose) {
  CONFIG.pose.split(';').forEach((entry, i) => {
    const n = entry.split(',').map(Number);
    if (i >= views.length || n.length < 8 || n.some((v) => !Number.isFinite(v))) {
      console.warn(`?pose= entry ${i} ignored (want 8 finite numbers, got "${entry}")`);
      return;
    }
    views[i].group.quaternion.set(n[0], n[1], n[2], n[3]).normalize();
    offsets[i].set(n[4], n[5], n[6]);
    panelScale[i] = n[7];
    views[i].group.scale.setScalar(baseScale[i] * n[7]);
  });
}

function poseString(): string {
  return views.map((v, i) => {
    const q = v.group.quaternion, o = offsets[i];
    return [q.x, q.y, q.z, q.w, o.x, o.y, o.z, panelScale[i]]
      .map((x) => Number(x.toFixed(5))).join(',');
  }).join(';');
}

/**
 * Place the COLUMNS left to right with a constant clear gap, stacking the panels within each
 * column. Sizes are measured from each panel's actual bounding box rather than assumed from a
 * fixed pitch, so enlarging one pushes its neighbours aside instead of growing into them.
 */
function relayout(): void {
  const size = views.map((v) => {
    const keep = v.group.position.clone();
    v.group.position.set(0, 0, 0);
    const b = new THREE.Box3().setFromObject(v.group).getSize(new THREE.Vector3());
    v.group.position.copy(keep);
    return { w: b.x || CONFIG.cell, h: b.y || CONFIG.cell };
  });
  const nCols = columns.length;
  const colW: number[] = new Array(nCols).fill(0);
  const colH: number[] = new Array(nCols).fill(0);
  views.forEach((_, i) => {
    const c = columnOf[i];
    colW[c] = Math.max(colW[c], size[i].w);
    colH[c] += size[i].h;
  });
  columns.forEach((col, c) => { colH[c] += CONFIG.gap * (col.length - 1); });

  const total = colW.reduce((a, w) => a + w, 0) + CONFIG.gap * (nCols - 1);
  const colX: number[] = [];
  let x = -total / 2;
  for (let c = 0; c < nCols; c++) { colX[c] = x + colW[c] / 2; x += colW[c] + CONFIG.gap; }

  const y: number[] = colH.map((h) => h / 2);          // top of each column, walking downward
  views.forEach((v, i) => {
    const c = columnOf[i];
    const cy = y[c] - size[i].h / 2;
    y[c] -= size[i].h + CONFIG.gap;
    v.group.position.set(colX[c] + offsets[i].x, cy + offsets[i].y, offsets[i].z);
  });
}
relayout();
row.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
studio.add(row);

// ---- stage ----
const box = new THREE.Box3().setFromObject(row);
const center = box.getCenter(new THREE.Vector3());
const size = box.getSize(new THREE.Vector3());
const radius = 0.5 * Math.max(size.x, size.y);

if (CONFIG.showPlane) {
  const s = radius * CONFIG.planeSize;
  const wall = backWall({ color: CONFIG.wallColor, width: s, height: s, roughness: CONFIG.planeRoughness });
  wall.position.set(center.x, center.y, box.min.z - radius * CONFIG.planeDistance);
  studio.scene.add(wall);
}

RectAreaLightUniformsLib.init();
{
  const dir = new THREE.Vector3(-0.5, 1.2, 1).normalize();
  const dist = radius * 6;
  const light = new PhysicalSpotLight(CONFIG.lightColor);
  light.intensity = CONFIG.spotIntensity;
  light.angle = 1.3; light.penumbra = 1.3; light.decay = 0; light.distance = 0;
  light.radius = radius * 1;
  light.position.copy(center).addScaledVector(dir, dist);
  light.target.position.copy(center);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.camera.near = Math.max(0.5, dist - radius * 1.5);
  light.shadow.camera.far = dist + radius * 2;
  light.shadow.radius = 6;
  light.shadow.bias = -0.0002;
  studio.scene.add(light, light.target);
}

// ---- grab a panel and turn it ----
// Drag ON a torus rotates that torus (about its own centre — the views are built centred);
// drag anywhere else is the studio's usual orbit. The two must not both act on one gesture,
// so the orbit controls are switched off for the duration of a grab.
const grab = { view: null as THREE.Object3D | null, x: 0, y: 0 };
let selected = subjects.length - 1;      // the deformed panel — the one worth enlarging
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const canvas = studio.renderer.domElement;

function panelUnder(event: PointerEvent): THREE.Object3D | null {
  const r = canvas.getBoundingClientRect();
  ndc.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, studio.camera);
  const hit = raycaster.intersectObjects(row.children, true)[0];
  if (!hit) return null;
  let o: THREE.Object3D | null = hit.object;
  while (o && o.parent !== row) o = o.parent;      // climb to the panel group
  return o;
}

canvas.addEventListener('pointerdown', (e) => {
  const panel = panelUnder(e);
  if (!panel) return;
  grab.view = panel; grab.x = e.clientX; grab.y = e.clientY;
  const idx = row.children.indexOf(panel);
  if (idx >= 0) selected = idx;
  studio.controls.enabled = false;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!grab.view) return;
  const dx = e.clientX - grab.x, dy = e.clientY - grab.y;
  grab.x = e.clientX; grab.y = e.clientY;
  const right = new THREE.Vector3().setFromMatrixColumn(studio.camera.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(studio.camera.matrixWorld, 1);

  if (e.shiftKey) {
    // shift-drag MOVES the panel in the camera's plane, so a stack can be arranged by hand
    const i = row.children.indexOf(grab.view);
    if (i >= 0) {
      const world = new THREE.Vector3()
        .addScaledVector(right, dx * 0.004 * CONFIG.cell * 2)
        .addScaledVector(up, -dy * 0.004 * CONFIG.cell * 2);
      offsets[i].add(world);
      relayout();
    }
  } else {
    // plain drag TURNS it, about the camera's axes so dragging right spins right on screen
    const k = 0.01;
    const q = new THREE.Quaternion().setFromAxisAngle(up, dx * k)
      .multiply(new THREE.Quaternion().setFromAxisAngle(right, dy * k));
    grab.view.quaternion.premultiply(q);
  }
  studio.notifySceneChanged();
  studio.resetAccumulation();       // a moved subject invalidates the accumulated trace
});

function endGrab(e: PointerEvent): void {
  if (!grab.view) return;
  grab.view = null;
  studio.controls.enabled = true;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener('pointerup', endGrab);
canvas.addEventListener('pointercancel', endGrab);

function applyScales(): void {
  views.forEach((v, i) => v.group.scale.setScalar(baseScale[i] * panelScale[i]));
  relayout();
  studio.frame(row, { direction: new THREE.Vector3(0, 0, 1) });
  studio.notifySceneChanged();
  studio.resetAccumulation();
  console.log(`panel sizes: ${panelScale.map((v) => v.toFixed(2)).join(', ')}  (?scale=${panelScale.map((v) => v.toFixed(2)).join(',')})`);
}
function resize(by: number): void {
  panelScale[selected] = Math.max(0.2, Math.min(6, panelScale[selected] * by));
  applyScales();
}

studio.frame(row, { direction: new THREE.Vector3(0, 0, 1) });
studio.start();

function updateForMode(mode: 'webgl' | 'pathtracing'): void {
  ambient.intensity = mode === 'webgl' ? 0.4 : 0;
  if (mode === 'pathtracing') studio.notifyMaterialsChanged();
}

let tubesShown = CONFIG.edges === 'tubes';
attachRenderControls(studio, {
  filename: `paper-tori-${CONFIG.layout}.png`,
  hud: false,
  keys: {
    v: () => {
      tubesShown = !tubesShown;
      for (const v of views) v.setVisible('edge', tubesShown);
      studio.notifySceneChanged();
      studio.resetAccumulation();
    },
    // put every panel back to the orientation it was framed in
    g: () => {
      for (const o of row.children) o.quaternion.identity();
      for (const o of offsets) o.set(0, 0, 0);
      relayout();
      studio.notifySceneChanged();
      studio.resetAccumulation();
    },
    // SAVE the arrangement: print a ?pose= (and put it on the clipboard) that reproduces
    // every panel's turn, nudge and size exactly as they are now
    c: () => {
      const q = `?pose=${poseString()}`;
      console.log(`arrangement saved — paste this onto the URL:\n${q}`);
      navigator.clipboard?.writeText(q).then(
        () => console.log('  (copied to the clipboard)'),
        () => console.log('  (clipboard refused — copy it from the line above)'),
      );
    },
    // resize the panel you last grabbed (the deformed one to begin with)
    '=': () => resize(1.12),
    '+': () => resize(1.12),
    '-': () => resize(1 / 1.12),
    '_': () => resize(1 / 1.12),
    '0': () => { panelScale.fill(1); for (const o of offsets) o.set(0, 0, 0); applyScales(); },
  },
});
