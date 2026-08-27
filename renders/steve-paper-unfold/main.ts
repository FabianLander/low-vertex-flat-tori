/**
 * paper-unfold — the squashing figure of Lander's paper: for ONE torus (`?torus=square`
 * or `?torus=hex`), three panels left to right — topology, then geometry, then the crush:
 *
 *   1. the COMBINATORIAL net (`?topo=0` hides it): the same unfolding drawn in the
 *      harmonic (Tutte) metric — the triangulation before OUR geometry, exactly
 *      equilateral on the degree-regular v8-7 (a patch of the {3,6} tiling), as
 *      symmetric as the combinatorics allows on v8-3. No graph grid: no metric yet.
 *   2. the NET — the sixteen faces unfolded flat at their true intrinsic sizes, the
 *      actual sheet of paper, in the graph-paper look of `paper-folds`;
 *   3. the FOLDED-FLAT configuration the sheet crushes into.
 *
 * The net is the paper's own §4 unfolding (`unfold.ts` — breadth-first on the dual,
 * reproducing Figure 5's nets, here at true scale so every net face is congruent to its
 * face in the fold). After unfolding, nine gluings remain, each a cut edge placed twice:
 *
 *   - a SEPARATED pair gets one strong color on BOTH of its boundary segments — the two
 *     same-colored edges are the ones the sheet glues together (5 pairs for the square
 *     net, 6 for the hexagonal);
 *   - a CLOSED-UP gluing (deck translation zero — the net folds back shut there, the
 *     edges the paper's Figures 2 and 5 draw dashed) has its two copies COINCIDENT, so
 *     it is visually indistinguishable from an interior edge and is drawn as one (4 for
 *     the square, 3 for the hexagonal — the counts the paper states, verified below).
 *
 * ALL of that is drawn INTO the baked paper texture (`latticeEdgeTexture`'s edge styles),
 * not as geometry. The texture lives in lattice coordinates, which are intrinsic, so one
 * bake marks every placement of a styled edge at once: both boundary copies on the net,
 * AND the same seam on the folded torus (`?seams=0` gives the fold a plain bake instead).
 * That is also what lets the figure PATH TRACE — measured on this very page with a live
 * scene bisect: adding any custom merged/baked tube geometry to the scene turned every
 * `vertexColors` paper surface black in `three-gpu-pathtracer` (WebGL preview fine), and
 * removing the tubes cured it with the same materials, textures, and vertex colors. So:
 * marks go in the texture (a material property traces), never in overlay geometry. The
 * other standing rule (also re-measured here): a canvas-backed color map traces black —
 * the bake is re-encoded to a PNG (`imageBackedTexture`) before use.
 *
 * Both panels are at TRUE scale — the net and the fold are the same sheet, so their
 * triangles are congruent, and the figure should say so. The fold gets the microscopic
 * display-only ζ-lift of `paper-folds` so its coincident sheets do not z-fight;
 * everything VERIFIED is verified on the exact planar positions.
 *
 * `?layout=row` (net left of the fold, default) or `?layout=column` (net above it).
 * [ / ] move the backdrop. Render… → path trace; S saves.
 */

import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { PhysicalSpotLight } from 'three-gpu-pathtracer';

import type { Vec2 } from '@core/geometry/vec2.ts';
import { SQUARE_FOLD, HEXAGONAL_FOLD, liftedPositions } from '@core/sampling/foldedBases.ts';
import { edgeKey } from '@core/topology/triangulation.ts';
import { harmonicLayout } from '@core/topology/harmonicLayout.ts';
import { modulus } from '@core/moduli/modulus.ts';
import { measure } from '@core/search/measure.ts';
import { makeTorusView } from '@display/viewer/TorusView';
import { latticeEdgeTexture, imageBackedTexture, type LatticeEdgeTextureOptions } from '@display/viewer/gridTexture';
import { loadNormalMap } from '@display/viewer/normalMap';
import { latticeUV } from '@display/mesh/uv.ts';
import { skyEnvironment, backWall } from '@app/render/stage';
import { attachRenderControls } from '@app/render/controls';
import { Studio } from '@app/render/studio';
import { unfoldPaper, unfoldShapes, type Gluing, type PaperNet } from './unfold.ts';

// ============================ tweak the whole piece here ============================
const url = new URLSearchParams(location.search);
const num = (k: string, d: number) => (url.get(k) !== null ? Number(url.get(k)) : d);

const CONFIG = {
  // ===================== COLORS (paper look matched to paper-folds) ==================
  torusColor:     '#dcbf6f',   // the paper
  /** The combinatorial panel's sheet — GRAY, not paper: it is a topological picture,
   *  before the geometry (and before the graph paper), in the light blue-gray of the
   *  paper's own Figure 2 shading. `?tc=` overrides (e.g. `%23ffffff` for white). */
  topoColor:      url.get('tc') ?? '#dde1e8',
  gridColor:      '#2435AF',   // thick (major) graph lines
  gridMinorColor: '#4e5988',   // thin (fine) graph lines
  wallColor:      '#eceacf',   // background plane
  lightColor:     '#ffffff',
  /** BLUE and RED are reserved for the two marking loops, muted to match the rest:
   *  blue = the FIRST loop (v₁), red = the second (v₂) — the paper's Figure 2/5 colors. */
  loopColors: ['#3f5fa8', '#ac4141'],
  /** One muted, non-red/blue color per separated gluing, in edgeKey order. */
  pairColors: ['#54805f', '#b0783f', '#7e6390', '#4e7f88', '#a96d80', '#8a6f46'],
  // ====================================================================================

  /** Which torus: 'square' (Q⁰ on v8-7, τ̂ = i) or 'hex' (P⁰ on v8-3, τ̂ = ρ). */
  torus: url.get('torus') === 'hex' ? 'hex' : 'square',
  /** 'row' = net left of the fold; 'column' = net above it. */
  layout: url.get('layout') === 'column' ? 'column' : 'row',
  /** Clear space between the panels, × the fold's width. */
  gap: num('gap', 0.35),
  aspect: num('ar', url.get('layout') === 'column' ? 0.8 : 16 / 9),

  /** DISPLAY ONLY (as in paper-folds): microscopic ζ-lift separating the fold's
   *  coincident sheets so they do not z-fight. ?lift=0 for the true planes. */
  planarLift: num('lift', 0.002),

  /** Mark the gluing colors on the fold too (?seams=0 bakes the fold a plain map). */
  seamsOnFold: url.get('seams') !== '0',
  /** ?flip=1 turns the folded panel 180° about the vertical axis, showing its BACK —
   *  a different subset of sheets is on top from behind, so different seams show
   *  (useful on the hexagonal fold, which buries most of its cut edges front-side). */
  flip: url.get('flip') === '1',
  /** Baked lines — plain edges and seam pairs — share one weight (color alone carries
   *  the meaning; thicker marks obscured the triangles). Defaults to `edgeWidth`; the
   *  cut-edge doubling of `buildStyles` is not a thickness choice but the
   *  boundary-clipping compensation that keeps them LOOKING equal. */
  seamWidth: num('sw', 0.006),
  /** The marking loops ride ON TOP of the paper as thin TUBES — real geometry, a
   *  slight 3-D lift and a cast shadow (?loops=0 hides them; ?lr= radius × fold
   *  width). Built STRICTLY as individual primitive meshes with mesh-level
   *  transforms: merged or matrix-baked tube geometry was measured to blacken every
   *  vertexColors surface in the path tracer, individual primitives were measured
   *  safe (see the header). */
  markingLoops: url.get('loops') !== '0',
  loopRadius: num('lr', 0.006),

  // paper surface detail (same knobs as paper-folds / paper-tori, edges softened
  // from near-black to a quiet sepia so the whole sheet reads calmer)
  edgeColor: '#51473a',
  edgeWidth: num('ew', 0.006),
  roughness: 0.92,
  gridRepeat: 16,
  gridSubdivisions: 3,
  gridMinorWidth: 0.004,
  gridMajorWidth: 0.012,
  normalMapFile: 'crease-rough.png',
  normalRepeat: num('nr', 4),
  normalScale: num('ns', 1.0),
  /** Texels across the whole fundamental domain — 4096 keeps the 3:1 major/minor graph-line
   *  contrast (see paper-tori's derivation: a major cell gets textureSize/gridRepeat texels). */
  textureSize: num('texsize', 4096),

  // path-trace BISECT knobs (diagnostic only, in the spirit of paper-folds' ?mat/?nm/?tex):
  /** ?mat=flat strips the color map + vertex colors — bare paper color. */
  debugFlat: url.get('mat') === 'flat',
  /** ?nm=0 strips the normal map. */
  normalMapOn: url.get('nm') !== '0',
  /**
   * How the baked color maps are backed. 'canvas' uses the canvas texture directly —
   * SYNCHRONOUS, so the ?auto=1 path trace can never race a decode. 'image' re-encodes
   * to a PNG and loads it back (the paper-tori recipe), which is asynchronous: a decode
   * landing after the trace has begun was MEASURED (on this page) to leave every
   * vertexColors surface black about half the time, even with a full scene resync on
   * decode. A live-swap test showed the canvas map tracing correctly, so the old
   * "canvas-backed maps trace black" lore looks like it was this same race.
   */
  textureBacking: (url.get('tex') ?? 'canvas') as 'canvas' | 'image',
  /** ?net=0 omits the geometric net panel. */
  netPanel: url.get('net') !== '0',
  /** ?topo=0 omits the combinatorial panel (leftmost): the SAME §4 unfolding drawn in
   *  the harmonic (Tutte) metric — the topological network before geometrizing. On the
   *  degree-regular v8-7 that metric is exactly equilateral (the {3,6} tiling); on
   *  v8-3 it is as symmetric as the combinatorics allows. */
  topoPanel: url.get('topo') !== '0',

  // stage
  background: 0xeef0f3,
  planeRoughness: 0.95,
  planeDistance: num('plane', 0.12),
  planeSize: 40,
  envIntensity: 0.9,
  spotIntensity: 4,
};
// ====================================================================================

const base = CONFIG.torus === 'hex' ? HEXAGONAL_FOLD : SQUARE_FOLD;
const triang = base.triang;
const exact = liftedPositions(base, 0);
const net = unfoldPaper(triang, base.planar);

// the fold's width — the single scale unit for gaps and the display lift (net and fold
// share it, being the same sheet at true scale)
let foldLoX = Infinity, foldHiX = -Infinity, foldLoY = Infinity, foldHiY = -Infinity;
for (const [x, y] of base.planar) {
  foldLoX = Math.min(foldLoX, x); foldHiX = Math.max(foldHiX, x);
  foldLoY = Math.min(foldLoY, y); foldHiY = Math.max(foldHiY, y);
}
const w = foldHiX - foldLoX;

// The gluings, split by whether the net closes back up there. Colors are assigned to
// the separated ones in their (deterministic, edgeKey-sorted) order.
const separated: Gluing[] = [];
const closedUp: Gluing[] = [];
for (const g of net.gluings) {
  (Math.hypot(g.translation[0], g.translation[1]) < 1e-9 * w ? closedUp : separated).push(g);
}

// The MARKING: the paper's own two loops (§4 — their classes are a basis of H₁, their
// holonomies are the periods v₁, v₂, and v₂/v₁ is the modulus). Drawn blue (v₁) and
// red (v₂), the paper's Figure 2/5 colors; verified below to give τ = i / ρ exactly.
const PAPER_LOOPS: readonly (readonly number[])[] = CONFIG.torus === 'hex'
  ? [[1, 4, 0, 1], [1, 5, 6, 1]]
  : [[4, 2, 3, 4], [5, 2, 0, 5]];

// The combinatorial panel: the SAME §4 unfolding, but of the harmonic (Tutte) metric —
// the triangulation before OUR geometry, drawn as symmetrically as its combinatorics
// allows (exactly equilateral on the degree-regular v8-7). Exactly flat by the
// flip-free-embedding theorem, which the verification below re-checks.
const harmonic = harmonicLayout(triang);
const topoShapes: Vec2[][] = new Array(triang.triangles.length);
for (const tile of harmonic.tiles) topoShapes[tile.id] = tile.corners;
const topoNet = unfoldShapes(triang, topoShapes);

/** Bounds + area of a set of net corners, in their own coordinates. */
function netBounds(corners: readonly (readonly Vec2[])[]): { lo: [number, number]; hi: [number, number]; area: number } {
  const lo: [number, number] = [Infinity, Infinity], hi: [number, number] = [-Infinity, -Infinity];
  let area = 0;
  for (const tri of corners) {
    for (const [x, y] of tri) {
      lo[0] = Math.min(lo[0], x); lo[1] = Math.min(lo[1], y);
      hi[0] = Math.max(hi[0], x); hi[1] = Math.max(hi[1], y);
    }
    area += Math.abs((tri[1][0] - tri[0][0]) * (tri[2][1] - tri[0][1])
                   - (tri[2][0] - tri[0][0]) * (tri[1][1] - tri[0][1])) / 2;
  }
  return { lo, hi, area };
}

// Gauge-align the combinatorial net with the geometric one: both are the SAME unfolding
// (same tree, same nine cut edges, colors keyed by the edge itself), but each sits in an
// arbitrary frame — the harmonic layout's, respectively the fold's. Turning the harmonic
// net so its root edge is parallel to the true net's makes the correspondence visible:
// same colors in the same cyclic order around both outlines, roughly the same headings.
const topoCorners: Vec2[][] = (() => {
  const g = net.corners[0], h = topoNet.corners[0];
  const th = Math.atan2(g[1][1] - g[0][1], g[1][0] - g[0][0])
           - Math.atan2(h[1][1] - h[0][1], h[1][0] - h[0][0]);
  const c = Math.cos(th), s = Math.sin(th);
  return topoNet.corners.map((tri) => tri.map(([x, y]): Vec2 => [c * x - s * y, s * x + c * y]));
})();

const netB = netBounds(net.corners);
const topoB = netBounds(topoCorners);
/** The harmonic layout's scale is arbitrary — draw it at the true net's total area. */
const topoScale = Math.sqrt(netB.area / topoB.area);

// ---- verify, on the exact positions ----
const problems: string[] = [];
{
  const m = measure(triang, exact);
  const target = base.tauHat;
  const dTau = Math.min(
    Math.hypot(m.tauHat[0] - target[0], m.tauHat[1] - target[1]),
    Math.hypot(m.tauHat[0] + target[0], m.tauHat[1] - target[1]),   // ±Re on the wall
  );
  const maxDefect = Math.max(...net.gluings.map((g) => g.rotDefect));
  const expectClosed = CONFIG.torus === 'hex' ? 3 : 4;   // Lander §1: four vanish / three vanish
  console.log(`paper-unfold — ${base.label}`);
  console.log(`  fold: cone deficit ${m.coneDeficit.toExponential(2)}  τ̂ off ${dTau.toExponential(2)}  area ${m.area.toFixed(4)}`);
  console.log(`  net (Lander §4 unfolding): shape error ${net.maxShapeError.toExponential(2)}, `
    + `max gluing rotation ${maxDefect.toExponential(2)}, `
    + `${net.gluings.length} gluings of which ${closedUp.length} closed up`);
  if (m.coneDeficit >= 1e-9) problems.push(`fold is NOT flat (${m.coneDeficit.toExponential(2)})`);
  if (dTau >= 1e-8) problems.push(`modulus off by ${dTau.toExponential(2)}`);
  if (net.maxShapeError >= 1e-9) problems.push(`net faces not congruent to the fold's (${net.maxShapeError.toExponential(2)})`);
  if (maxDefect >= 1e-8) problems.push(`a gluing is not a translation (rotation ${maxDefect.toExponential(2)})`);
  if (closedUp.length !== expectClosed) problems.push(`${closedUp.length} gluings closed up, the paper says ${expectClosed}`);

  // the combinatorial panel: harmonic metric flat, and its closed-up gluings match —
  // otherwise the shared seam coloring would mislead across panels
  const topoDefect = Math.max(...topoNet.gluings.map((g) => g.rotDefect));
  const zeroSet = (n: PaperNet): string => n.gluings
    .filter((g) => Math.hypot(g.translation[0], g.translation[1]) < 1e-7 * Math.hypot(...netBounds(n.corners).hi))
    .map((g) => g.edge.join('')).sort().join(',');
  const lens = topoShapes.flatMap((s) => [0, 1, 2].map((i) =>
    Math.hypot(s[(i + 1) % 3][0] - s[i][0], s[(i + 1) % 3][1] - s[i][1])));
  console.log(`  combinatorial (harmonic) net: max gluing rotation ${topoDefect.toExponential(2)}, `
    + `edge-length spread ${(Math.max(...lens) / Math.min(...lens)).toFixed(3)}`
    + `${CONFIG.torus === 'square' ? ' (1.000 = equilateral)' : ''}`);
  if (topoDefect >= 1e-8) problems.push(`harmonic net gluing is not a translation (${topoDefect.toExponential(2)})`);
  if (zeroSet(topoNet) !== zeroSet(net)) {
    problems.push(`harmonic net closes up along [${zeroSet(topoNet)}] but the true net along [${zeroSet(net)}]`);
  }

  // the marking loops: τ = v₂/v₁ read off THE DRAWN LOOPS in the net must be the target
  // exactly — this pins that the red/blue bands really are the marking of the paper
  const vecOf = (a: number, b: number): [number, number] => {
    const [t1] = triang.edgeToTris.get(edgeKey(a, b))!;
    const tri = triang.triangles[t1];
    const c = net.corners[t1];
    const la = tri.indexOf(a), lb = tri.indexOf(b);
    return [c[lb][0] - c[la][0], c[lb][1] - c[la][1]];
  };
  const [v1, v2] = PAPER_LOOPS.map((loop) => {
    let x = 0, y = 0;
    for (let k = 0; k + 1 < loop.length; k++) { const e = vecOf(loop[k], loop[k + 1]); x += e[0]; y += e[1]; }
    return [x, y];
  });
  const d2 = v1[0] * v1[0] + v1[1] * v1[1];
  const loopTau = [(v2[0] * v1[0] + v2[1] * v1[1]) / d2, (v2[1] * v1[0] - v2[0] * v1[1]) / d2];
  const dLoop = Math.hypot(loopTau[0] - target[0], loopTau[1] - target[1]);
  console.log(`  marking loops ${PAPER_LOOPS.map((l) => l.join('→')).join(' and ')}: `
    + `τ = ${loopTau[0].toFixed(6)} + ${loopTau[1].toFixed(6)}i (off by ${dLoop.toExponential(2)})`);
  if (dLoop >= 1e-9) problems.push(`marking loops give τ off the target by ${dLoop.toExponential(2)}`);
}
if (problems.length) {
  const banner = document.createElement('div');
  banner.style.cssText = ['position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:100',
    'background:#7a1f1f', 'color:#fff', 'font:12px/1.5 system-ui,sans-serif', 'padding:8px 14px'].join(';');
  banner.innerHTML = '<b>paper-unfold</b><br>' + problems.map((p) => `• ${p}`).join('<br>');
  document.body.appendChild(banner);
}

// ---- studio + stage ----
const studio = new Studio({ bounces: 5, pathTraceScale: 1, aspect: CONFIG.aspect, onModeChange: updateForMode });
studio.renderer.shadowMap.enabled = true;
studio.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
skyEnvironment(studio.scene, { intensity: CONFIG.envIntensity, background: CONFIG.background });
const ambient = new THREE.AmbientLight(0xffffff, 0.4);   // preview-only fill
studio.scene.add(ambient);

// ---- the paper materials: seam marks live IN the bake (see header) ----
// One styled edge marks every placement at once: both boundary copies on the net, and
// the same seam on the fold. The fold shares the seamed material unless ?seams=0.
type EdgeStyle = { color: string; width?: number; dash?: readonly [number, number] };
// Only the SEPARATED cut edges lie on the net's true boundary (a closed-up cut edge's
// two copies coincide, sheet on both sides — it reads as interior and shows the full
// band, so widening it would fatten the mark; that was measured, not guessed).
const separatedKeys = new Set(separated.map((g) => edgeKey(g.edge[0], g.edge[1])));

/**
 * The styled-edge map for one bake: the seam pairs, then the marking loops OVER them
 * (a loop crossing a cut edge marks BOTH boundary placements, so the pair stays visibly
 * identified — just in the loop's color). On the NET (and combinatorial) bake a styled
 * CUT edge gets DOUBLE width: it lies on the sheet boundary, where half the band is
 * clipped off the sheet, and doubling restores the drawn half to full weight — so e.g.
 * the red loop's run along the hex net's boundary reads as strongly as its interior
 * legs. The fold's bake keeps true widths (there every edge is interior).
 */
function buildStyles(doubleCutWidths: boolean): Map<number, EdgeStyle> {
  const styles = new Map<number, EdgeStyle>();
  const put = (key: number, color: string, width: number): void => {
    styles.set(key, { color, width: doubleCutWidths && separatedKeys.has(key) ? width * 2 : width });
  };
  separated.forEach((g, i) =>
    put(edgeKey(g.edge[0], g.edge[1]), CONFIG.pairColors[i % CONFIG.pairColors.length], CONFIG.seamWidth));
  return styles;
}
const netStyles = buildStyles(true);

// Texture decodes are asynchronous, and a decode landing AFTER the path trace has
// begun leaves every surface black — MEASURED here, flaky, and no resync on arrival
// (notifyMaterialsChanged or a full notifySceneChanged) reliably cures it. The color
// maps are canvas-backed (synchronous) by default, which removes the big race; the
// normal map is still a file load, so the render controls — and with them the ?auto=1
// auto-trace — only attach once nothing is pending (3 s timeout as a fallback so a
// missing asset degrades gracefully).
let pendingTextures = 0;
let onAllTextures: () => void = () => {};
function trackTexture(): () => void {
  pendingTextures++;
  return () => {
    pendingTextures--;
    studio.notifySceneChanged();
    if (pendingTextures === 0) onAllTextures();
  };
}

const normalMap = CONFIG.normalMapOn
  ? loadNormalMap(CONFIG.normalMapFile, { repeat: CONFIG.normalRepeat }, trackTexture())
  : null;

function paperMaterial(edgeStyles?: LatticeEdgeTextureOptions['edgeStyles']): THREE.MeshStandardMaterial {
  if (CONFIG.debugFlat) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(CONFIG.torusColor),
      roughness: CONFIG.roughness, metalness: 0, flatShading: true, side: THREE.DoubleSide,
    });
  }
  const canvasMap = latticeEdgeTexture(triang, exact, {
    size: CONFIG.textureSize,
    bg: CONFIG.torusColor, minor: CONFIG.gridMinorColor, major: CONFIG.gridColor,
    gridRepeat: CONFIG.gridRepeat, gridSubdivisions: CONFIG.gridSubdivisions,
    minorWidth: CONFIG.gridMinorWidth, majorWidth: CONFIG.gridMajorWidth,
    edgeColor: CONFIG.edgeColor, edgeWidth: CONFIG.edgeWidth,
    edgeStyles,
  });
  const m = new THREE.MeshStandardMaterial({
    map: CONFIG.textureBacking === 'image'
      ? imageBackedTexture(canvasMap, trackTexture())
      : canvasMap,
    vertexColors: true, roughness: CONFIG.roughness, metalness: 0,
    flatShading: true, side: THREE.DoubleSide,
  });
  if (normalMap) {
    m.normalMap = normalMap;
    m.normalScale.set(CONFIG.normalScale, CONFIG.normalScale);
  }
  return m;
}

const netMat = paperMaterial(netStyles);
const foldMat = CONFIG.seamsOnFold ? paperMaterial(buildStyles(false)) : paperMaterial();

// ---- the marking loops as thin tubes riding on the paper ----
// Real geometry for a slight 3-D lift and a cast shadow. STRICTLY individual primitive
// meshes with mesh-level transforms — the measured-safe pattern (see header).
const UP = new THREE.Vector3(0, 1, 0);
const loopMats = CONFIG.loopColors.map((c) => new THREE.MeshStandardMaterial({
  color: new THREE.Color(c), roughness: 0.45, metalness: 0.05,
}));

/** Every placement of the loops' edges in a net: a tree edge once (its two placements
 *  coincide), a cut edge at both — so on the net a loop visibly crosses the cut. */
function loopSegments(corners: readonly (readonly Vec2[])[]): { a: Vec2; b: Vec2; loop: number }[] {
  const segs: { a: Vec2; b: Vec2; loop: number }[] = [];
  PAPER_LOOPS.forEach((loop, i) => {
    for (let k = 0; k + 1 < loop.length; k++) {
      const p = loop[k], q = loop[k + 1];
      const [t1, t2] = triang.edgeToTris.get(edgeKey(p, q))!;
      const place = (t: number): { a: Vec2; b: Vec2; loop: number } => {
        const tri = triang.triangles[t], c = corners[t];
        return { a: c[tri.indexOf(p)], b: c[tri.indexOf(q)], loop: i };
      };
      const s1 = place(t1), s2 = place(t2);
      segs.push(s1);
      if (Math.hypot(s2.a[0] - s1.a[0], s2.a[1] - s1.a[1]) > 1e-6) segs.push(s2);
    }
  });
  return segs;
}

/** One cylinder per segment plus a cap sphere per distinct endpoint. Caps dedupe by
 *  POSITION alone — the two loops share a vertex, and two exactly-coincident spheres
 *  with different materials are the coincident-geometry class the path tracer chokes
 *  on, so the first loop's cap wins there. Sub-diameter stubs are skipped. */
function addLoopTubes(parent: THREE.Group, segs: readonly { a: THREE.Vector3; b: THREE.Vector3; loop: number }[], r: number): void {
  if (!CONFIG.markingLoops) return;
  const capsSeen = new Set<string>();
  const dir = new THREE.Vector3();
  for (const { a, b, loop } of segs) {
    dir.subVectors(b, a);
    const len = dir.length();
    if (len < 2.5 * r) continue;   // a tube shorter than its own diameter is a blob
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16, 1, true), loopMats[loop]);
    tube.quaternion.setFromUnitVectors(UP, dir.divideScalar(len));
    tube.position.addVectors(a, b).multiplyScalar(0.5);
    parent.add(tube);
    for (const p of [a, b]) {
      const key = `${Math.round(p.x * 1e5)},${Math.round(p.y * 1e5)},${Math.round(p.z * 1e5)}`;
      if (capsSeen.has(key)) continue;
      capsSeen.add(key);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), loopMats[loop]);
      cap.position.copy(p);
      parent.add(cap);
    }
  }
}

/**
 * The combinatorial panel's bake: plain paper — NO graph grid, since this panel shows
 * the triangulation before a metric — with the edges and the same seam colors, drawn in
 * the net's own bbox coordinates (the sheet is simply connected, so no lattice
 * wrapping). Stroke widths are converted from the other panels' tile fractions so the
 * lines carry the same physical weight on screen.
 */
function topoMaterial(): THREE.MeshStandardMaterial {
  if (CONFIG.debugFlat) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(CONFIG.topoColor),
      roughness: CONFIG.roughness, metalness: 0, flatShading: true, side: THREE.DoubleSide,
    });
  }
  const size = CONFIG.textureSize;
  const span = Math.max(topoB.hi[0] - topoB.lo[0], topoB.hi[1] - topoB.lo[1]);
  const worldPerTile = Math.hypot(...modulus(triang, exact).v1);   // one lattice cell, world units
  const pxPerTileFrac = size * worldPerTile / (span * topoScale);  // tile fraction → px here
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = CONFIG.topoColor;
  ctx.fillRect(0, 0, size, size);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const px = ([x, y]: readonly number[]): [number, number] =>
    [((x - topoB.lo[0]) / span) * size, (1 - (y - topoB.lo[1]) / span) * size];
  const stroke = (a: readonly number[], b: readonly number[], color: string, width: number): void => {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, width);
    ctx.beginPath();
    ctx.moveTo(...px(a));
    ctx.lineTo(...px(b));
    ctx.stroke();
  };
  const styledPass: [Vec2, Vec2, string, number][] = [];
  for (let t = 0; t < triang.triangles.length; t++) {
    const tri = triang.triangles[t], c = topoCorners[t];
    for (let k = 0; k < 3; k++) {
      const style = netStyles.get(edgeKey(tri[k], tri[(k + 1) % 3]));
      if (style) {
        styledPass.push([c[k], c[(k + 1) % 3], style.color, (style.width ?? CONFIG.edgeWidth * 2) * pxPerTileFrac]);
      } else {
        stroke(c[k], c[(k + 1) % 3], CONFIG.edgeColor, CONFIG.edgeWidth * pxPerTileFrac);
      }
    }
  }
  for (const [a, b, color, width] of styledPass) stroke(a, b, color, width);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshStandardMaterial({
    map: CONFIG.textureBacking === 'image'
      ? imageBackedTexture(tex, trackTexture())
      : tex,
    vertexColors: true, roughness: CONFIG.roughness, metalness: 0,
    flatShading: true, side: THREE.DoubleSide,
  });
  if (normalMap) {
    m.normalMap = normalMap;
    m.normalScale.set(CONFIG.normalScale, CONFIG.normalScale);
  }
  return m;
}

// ---- the combinatorial panel: the same net, harmonic shapes, area-matched ----
const topoGroup = new THREE.Group();
if (CONFIG.topoPanel) {
  const F = triang.triangles.length;
  const span = Math.max(topoB.hi[0] - topoB.lo[0], topoB.hi[1] - topoB.lo[1]);
  const pos = new Float32Array(F * 3 * 3);
  const uv = new Float32Array(F * 3 * 2);
  for (let t = 0; t < F; t++) {
    for (let k = 0; k < 3; k++) {
      const [x, y] = topoCorners[t][k];
      const o = t * 3 + k;
      pos[o * 3] = x * topoScale; pos[o * 3 + 1] = y * topoScale; pos[o * 3 + 2] = 0;
      uv[o * 2] = (x - topoB.lo[0]) / span;
      uv[o * 2 + 1] = (y - topoB.lo[1]) / span;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const white = new Float32Array(F * 3 * 3); white.fill(1);
  geo.setAttribute('color', new THREE.BufferAttribute(white, 3));
  geo.computeVertexNormals();
  const inner = new THREE.Group();
  inner.position.set(-topoScale * (topoB.lo[0] + topoB.hi[0]) / 2, -topoScale * (topoB.lo[1] + topoB.hi[1]) / 2, 0);
  inner.add(new THREE.Mesh(geo, topoMaterial()));
  const r = CONFIG.loopRadius * w;
  addLoopTubes(inner, loopSegments(topoCorners).map(({ a, b, loop }) => ({
    a: new THREE.Vector3(a[0] * topoScale, a[1] * topoScale, r * 1.25),
    b: new THREE.Vector3(b[0] * topoScale, b[1] * topoScale, r * 1.25),
    loop,
  })), r);
  topoGroup.add(inner);
  topoGroup.userData.size = [topoScale * (topoB.hi[0] - topoB.lo[0]), topoScale * (topoB.hi[1] - topoB.lo[1])];
}

// ---- the net panel: one flat mesh, nothing else ----
const netGroup = new THREE.Group();
if (CONFIG.netPanel) {
  const F = triang.triangles.length;
  // the sheet at the net's true-scale corners, with the torus's own per-face lattice
  // UVs so the shared baked texture decorates it identically to the fold
  const pos = new Float32Array(F * 3 * 3);
  for (let t = 0; t < F; t++) {
    for (let k = 0; k < 3; k++) {
      const [x, y] = net.corners[t][k];
      const o = (t * 3 + k) * 3;
      pos[o] = x; pos[o + 1] = y; pos[o + 2] = 0;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(latticeUV(triang, exact, { repeat: 1 }), 2));
  const white = new Float32Array(F * 3 * 3); white.fill(1);
  geo.setAttribute('color', new THREE.BufferAttribute(white, 3));
  geo.computeVertexNormals();

  // center the panel on the origin (offset carried by the group, so the loop tubes
  // share it)
  const inner = new THREE.Group();
  inner.position.set(-(netB.lo[0] + netB.hi[0]) / 2, -(netB.lo[1] + netB.hi[1]) / 2, 0);
  inner.add(new THREE.Mesh(geo, netMat));
  const r = CONFIG.loopRadius * w;
  addLoopTubes(inner, loopSegments(net.corners).map(({ a, b, loop }) => ({
    a: new THREE.Vector3(a[0], a[1], r * 1.25),
    b: new THREE.Vector3(b[0], b[1], r * 1.25),
    loop,
  })), r);
  netGroup.add(inner);
  netGroup.userData.size = [netB.hi[0] - netB.lo[0], netB.hi[1] - netB.lo[1]];
}

// ---- the fold panel ----
// drawn with the display-only ζ-lift (verification above used the exact planes)
const display = Float64Array.from(exact);
if (CONFIG.planarLift > 0) {
  const eps = CONFIG.planarLift * w;
  for (let v = 0; v < triang.vertexCount; v++) display[3 * v + 2] = eps * base.lift[v];
}
const view = makeTorusView(triang, { surface: { material: foldMat, uvRepeat: 1 } });
view.draw(display);

// The loops on the fold too — but ONLY where an edge is actually the TOP sheet as
// seen (bottom sheet when flipped): most of the fold's edges are buried inside the
// stack, and a tube floating over a buried edge reads as noise. Each edge is sampled
// against every face covering the point; the visible stretches become tubes riding
// just above their own crease, so partially-covered edges get partial tubes.
{
  const r = CONFIG.loopRadius * w;
  const side = CONFIG.flip ? -1 : 1;    // which side of the stack faces the camera
  const K = 64;                          // samples per edge
  const zTol = 1e-9 * w;

  /** Height of face t's sheet over planar point (x,y), or null if the point is outside. */
  const faceZAt = (t: number, x: number, y: number): number | null => {
    const [i, j, k] = triang.triangles[t];
    const [xi, yi] = base.planar[i], [xj, yj] = base.planar[j], [xk, yk] = base.planar[k];
    const det = (xj - xi) * (yk - yi) - (xk - xi) * (yj - yi);
    const lj = ((x - xi) * (yk - yi) - (xk - xi) * (y - yi)) / det;
    const lk = ((xj - xi) * (y - yi) - (x - xi) * (yj - yi)) / det;
    const li = 1 - lj - lk;
    if (li < -1e-9 || lj < -1e-9 || lk < -1e-9) return null;
    return li * display[3 * i + 2] + lj * display[3 * j + 2] + lk * display[3 * k + 2];
  };

  const c = [0, 0, 0];
  {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let v = 0; v < triang.vertexCount; v++) {
      for (let a = 0; a < 3; a++) {
        lo[a] = Math.min(lo[a], display[3 * v + a]);
        hi[a] = Math.max(hi[a], display[3 * v + a]);
      }
    }
    for (let a = 0; a < 3; a++) c[a] = (lo[a] + hi[a]) / 2;
  }

  const segs: { a: THREE.Vector3; b: THREE.Vector3; loop: number }[] = [];
  PAPER_LOOPS.forEach((loop, i) => {
    for (let k = 0; k + 1 < loop.length; k++) {
      const p = loop[k], q = loop[k + 1];
      const [px, py] = base.planar[p], [qx, qy] = base.planar[q];
      const pz = display[3 * p + 2], qz = display[3 * q + 2];
      // visibility per sample: no covering sheet on the camera's side of the edge
      const visible: boolean[] = [];
      for (let s = 0; s < K; s++) {
        const t = (s + 0.5) / K;
        const x = px + (qx - px) * t, y = py + (qy - py) * t;
        const ze = pz + (qz - pz) * t;
        let onTop = true;
        for (let f = 0; f < triang.triangles.length && onTop; f++) {
          const zf = faceZAt(f, x, y);
          if (zf !== null && side * (zf - ze) > zTol) onTop = false;
        }
        visible.push(onTop);
      }
      // maximal visible runs → sub-tubes riding just above their own crease
      const at = (t: number): THREE.Vector3 => new THREE.Vector3(
        px + (qx - px) * t - c[0],
        py + (qy - py) * t - c[1],
        pz + (qz - pz) * t - c[2] + side * r * 1.25,
      );
      // an occlusion cut (a run end that is not a true edge endpoint) is pulled back
      // by one tube radius, so the tube and its cap stay clear of the covering sheet
      const edgeLen = Math.hypot(qx - px, qy - py);
      const pull = (r * 1.25) / Math.max(edgeLen, 1e-9);
      let s = 0;
      while (s < K) {
        if (!visible[s]) { s++; continue; }
        let e = s;
        while (e + 1 < K && visible[e + 1]) e++;
        const t0 = s === 0 ? 0 : s / K + pull;
        const t1 = e === K - 1 ? 1 : (e + 1) / K - pull;
        if (e - s + 1 >= 3 && t1 > t0) segs.push({ a: at(t0), b: at(t1), loop: i });
        s = e + 1;
      }
    }
  });
  addLoopTubes(view.group, segs, r);
}
if (CONFIG.flip) view.group.rotateY(Math.PI);   // the parts are centred, so it turns in place

// ---- layout: [combinatorics | net | fold] left to right (or top to bottom) ----
const root = new THREE.Group();
const panels: { group: THREE.Group; size: [number, number] }[] = [];
if (CONFIG.topoPanel) panels.push({ group: topoGroup, size: topoGroup.userData.size as [number, number] });
if (CONFIG.netPanel) panels.push({ group: netGroup, size: netGroup.userData.size as [number, number] });
panels.push({ group: view.group, size: [w, foldHiY - foldLoY] });
{
  const gap = CONFIG.gap * w;
  if (CONFIG.layout === 'row') {
    const total = panels.reduce((a, p) => a + p.size[0], 0) + gap * (panels.length - 1);
    let x = -total / 2;
    for (const p of panels) { p.group.position.x = x + p.size[0] / 2; x += p.size[0] + gap; }
  } else {
    const total = panels.reduce((a, p) => a + p.size[1], 0) + gap * (panels.length - 1);
    let y = total / 2;
    for (const p of panels) { p.group.position.y = y - p.size[1] / 2; y -= p.size[1] + gap; }
  }
  for (const p of panels) root.add(p.group);
}
root.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
studio.add(root);

// ---- backdrop + light (as in paper-folds) ----
const box = new THREE.Box3().setFromObject(root);
const center = box.getCenter(new THREE.Vector3());
const extent = box.getSize(new THREE.Vector3());
const radius = 0.5 * Math.max(extent.x, extent.y);

let planeDistance = CONFIG.planeDistance;
const wall = backWall({
  color: CONFIG.wallColor,
  width: radius * CONFIG.planeSize, height: radius * CONFIG.planeSize,
  roughness: CONFIG.planeRoughness,
});
studio.scene.add(wall);
function placeWall(): void {
  wall.position.set(center.x, center.y, box.min.z - radius * planeDistance);
  studio.notifySceneChanged();
  studio.resetAccumulation();
}
placeWall();

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

// ---- the switches, across the top ----
// Buttons over URL params (which all still work): each rewrites the query and RELOADS,
// since the panels and their baked textures are built at load — the paper-tori pattern.
{
  const bar = document.createElement('div');
  bar.style.cssText = ['position:fixed', 'top:10px', 'left:50%', 'transform:translateX(-50%)',
    'z-index:20', 'display:flex', 'gap:4px', 'align-items:center', 'padding:4px',
    'background:rgba(20,20,24,0.7)', 'border-radius:8px',
    'font:12px/1 -apple-system,system-ui,sans-serif'].join(';');
  const setParam = (k: string, v: string | null): void => {
    const q = new URLSearchParams(location.search);
    if (v === null) q.delete(k); else q.set(k, v);
    location.search = q.toString();
  };
  const button = (label: string, on: boolean, onClick: () => void): void => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = ['padding:5px 10px', 'border-radius:5px', 'cursor:pointer',
      'border:1px solid ' + (on ? '#c8a45c' : '#3a3a42'),
      'background:' + (on ? '#c8a45c' : 'transparent'),
      'color:' + (on ? '#1a1a1f' : '#c8c8d0'),
      'font:inherit'].join(';');
    b.onclick = onClick;
    bar.appendChild(b);
  };
  const divider = (): void => {
    const d = document.createElement('div');
    d.style.cssText = 'width:1px;height:18px;background:#3a3a42;margin:0 3px';
    bar.appendChild(d);
  };
  button('square', CONFIG.torus === 'square', () => setParam('torus', null));
  button('hex', CONFIG.torus === 'hex', () => setParam('torus', 'hex'));
  divider();
  button('row', CONFIG.layout === 'row', () => setParam('layout', null));
  button('column', CONFIG.layout === 'column', () => setParam('layout', 'column'));
  divider();
  button('combinatorics', CONFIG.topoPanel, () => setParam('topo', CONFIG.topoPanel ? '0' : null));
  button('net', CONFIG.netPanel, () => setParam('net', CONFIG.netPanel ? '0' : null));
  button('fold seams', CONFIG.seamsOnFold, () => setParam('seams', CONFIG.seamsOnFold ? '0' : null));
  button('loops', CONFIG.markingLoops, () => setParam('loops', CONFIG.markingLoops ? '0' : null));
  button('flip fold', CONFIG.flip, () => setParam('flip', CONFIG.flip ? null : '1'));
  document.body.appendChild(bar);
}

// framed along +z: both panels are planar, so straight on is the figure
studio.frame(root, { direction: new THREE.Vector3(0, 0, 1) });
studio.start();

function updateForMode(mode: 'webgl' | 'pathtracing'): void {
  ambient.intensity = mode === 'webgl' ? 0.4 : 0;
  if (mode === 'pathtracing') studio.notifyMaterialsChanged();
}

// attach only once every texture is in (so ?auto=1 cannot start a trace that would
// bake an undecoded texture black) — see the pendingTextures machinery above
const attachControls = (): void => attachRenderControls(studio, {
  filename: `paper-unfold-${CONFIG.torus}.png`,
  hud: false,
  keys: {
    '[': () => { planeDistance = Math.max(0, planeDistance - 0.04); placeWall(); console.log(`?plane=${planeDistance.toFixed(2)}`); },
    ']': () => { planeDistance = Math.min(3, planeDistance + 0.04); placeWall(); console.log(`?plane=${planeDistance.toFixed(2)}`); },
  },
});
if (pendingTextures === 0) {
  attachControls();
} else {
  let attached = false;
  const go = (): void => { if (!attached) { attached = true; attachControls(); } };
  onAllTextures = go;
  setTimeout(() => {
    if (!attached) console.warn(`paper-unfold: ${pendingTextures} texture(s) still pending after 3s — attaching controls anyway`);
    go();
  }, 3000);
}
