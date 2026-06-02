/**
 * Develop a flat torus into the Euclidean plane and read off its modulus
 * τ ∈ ℍ (its point in Teichmüller space).
 *
 * Because every vertex has cone angle exactly 2π the intrinsic metric has no
 * cone points, so the surface is a smooth flat torus ℝ²/Λ. We recover Λ by
 * unfolding the triangulation into the plane and reading the holonomy of the
 * developing map: the deck group of the universal cover is, by flatness, a
 * group of pure TRANSLATIONS, and the two generators of π₁(T²)=ℤ² map to a
 * basis (v₁, v₂) of Λ. Then τ = v₂/v₁ (as complex numbers).
 *
 * Only the INTRINSIC data enters: the edge lengths and corner angles, both
 * computed from the 3D embedding. The 3D coordinates appear only through these.
 * (Orientation comes from the fixed CCW order in `torus.triangles`.)
 *
 * Pipeline:
 *   1. intrinsic primitives: edge lengths ℓ_ij, corner angles α[t][k].
 *   2. developNet: unfold the triangles in `torus.developOrder` along the
 *      spanning tree `torus.attach`. Each triangle is laid out CCW by
 *      circle–circle intersection against its already-placed parent edge.
 *   3. the dual edges NOT in the tree are CUT edges; each appears twice on the
 *      net boundary, related by a translation τₑ (its holonomy). They generate Λ.
 *   4. modulus: the two `torus.generatorLoops` form the MARKING; their holonomy
 *      gives (v₁, v₂) and τ = v₂/v₁.
 *
 * Marking consistency: whether two loops form a unit-index basis is purely
 * combinatorial (metric-independent), so a fixed marking makes τ a continuous
 * function on the dataset and each Markov walk a continuous trajectory in ℍ.
 *
 * Pure module: no three.js, no DOM.
 */

import type { Torus, Attach } from '../tori/defineTorus';
import { edgeKey } from '../tori/defineTorus';
import { totalArea } from './energies/cellMargin';

export type V2 = readonly [number, number];

// ---------------------------------------------------------------------------
// Intrinsic primitives
// ---------------------------------------------------------------------------

/** Euclidean distance between vertices i and j in the 3D embedding. */
function len(p: ArrayLike<number>, i: number, j: number): number {
  const oi = 3 * i, oj = 3 * j;
  return Math.hypot(p[oj] - p[oi], p[oj + 1] - p[oi + 1], p[oj + 2] - p[oi + 2]);
}

/**
 * Interior angles of every triangle at each of its three corners.
 * Returns angle[t][k] for triangle t, local corner k (matching torus.triangles[t]).
 * The third angle is taken as π − α − β so each triangle closes exactly,
 * avoiding float drift from three independent acos calls.
 */
export function cornerAngles(torus: Torus, p: ArrayLike<number>): number[][] {
  const out: number[][] = [];
  for (const [a, b, c] of torus.triangles) {
    const lab = len(p, a, b), lbc = len(p, b, c), lca = len(p, c, a);
    // law of cosines at corners a and b; c gets the remainder.
    const angA = Math.acos(clamp((lab * lab + lca * lca - lbc * lbc) / (2 * lab * lca)));
    const angB = Math.acos(clamp((lab * lab + lbc * lbc - lca * lca) / (2 * lab * lbc)));
    out.push([angA, angB, Math.PI - angA - angB]);
  }
  return out;
}

function clamp(x: number): number {
  return x < -1 ? -1 : x > 1 ? 1 : x;
}

/** Local index (0,1,2) of global vertex g within triangle t. */
function localIndex(torus: Torus, t: number, g: number): number {
  const tri = torus.triangles[t];
  if (tri[0] === g) return 0;
  if (tri[1] === g) return 1;
  if (tri[2] === g) return 2;
  throw new Error(`vertex ${g} not in triangle ${t}`);
}

// ---------------------------------------------------------------------------
// Developing map
// ---------------------------------------------------------------------------

export type CutEdge = {
  /** The shared global edge, as (u, v) with u < v. */
  readonly edge: readonly [number, number];
  /** The two triangles sharing it (t1 < t2). */
  readonly tris: readonly [number, number];
  /** Holonomy of this cut edge's fundamental loop: the translation taking the
   *  t2-development of the edge onto the t1-development. */
  readonly translation: V2;
  /** Rotational defect of the gluing (angle between the two edge images).
   *  ≈ 0 confirms the holonomy is a pure translation (flatness). */
  readonly rotDefect: number;
  /** True for a contractible "fold" (trivial holonomy: the two developed
   *  copies coincide). The two non-fold cut edges are the H₁ generators. */
  readonly isFold: boolean;
};

/** One unfolding step: triangle `t` attached across edge `edge` to `parent`
 *  (parent = -1 for the root). In developOrder sequence — for animation. */
export type DevelopStep = {
  readonly t: number;
  readonly parent: number;
  readonly edge: readonly [number, number];
};

export type DevelopedNet = {
  /** corners[t] = [P0, P1, P2], planar points of triangle t's corners
   *  (in torus.triangles[t] order). A glued vertex appears once per incident tri. */
  readonly corners: V2[][];
  /** The glue (tree) edges used to unfold — coincident, not cut. */
  readonly treeEdges: number[];
  /** The cut edges, sorted by edgeKey for determinism. */
  readonly cutEdges: CutEdge[];
  /** Placement steps in developOrder (root first). */
  readonly steps: DevelopStep[];
};

/** Signed (×2) area of the planar triangle P0→P1→P2; >0 means CCW. */
function signedArea2(P0: V2, P1: V2, P2: V2): number {
  return (P1[0] - P0[0]) * (P2[1] - P0[1]) - (P1[1] - P0[1]) * (P2[0] - P0[0]);
}

/**
 * Given two placed planar points Pi, Pj and the distances rI = |third−i|,
 * rJ = |third−j|, return both circle–circle intersection candidates for the
 * third point.
 */
function placeThird(Pi: V2, Pj: V2, rI: number, rJ: number): [V2, V2] {
  const dx = Pj[0] - Pi[0], dy = Pj[1] - Pi[1];
  const d = Math.hypot(dx, dy);
  const a = (rI * rI - rJ * rJ + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, rI * rI - a * a));
  const mx = Pi[0] + (a * dx) / d, my = Pi[1] + (a * dy) / d;
  const ox = (-dy / d) * h, oy = (dx / d) * h; // (-dy,dx)/d is the left normal
  return [[mx + ox, my + oy], [mx - ox, my - oy]];
}

/**
 * Unfold all triangles into the plane, following torus.developOrder and the
 * given attachment tree. `attach` defaults to the torus's combinatorial spanning
 * tree; pass a layout-consistent attach (e.g. `latticeLayout(torus).developAttach`
 * or `harmonicLayout` equivalent) to make the developed net glue triangles the
 * same way the abstract net does — required for the develop animation to match
 * the abstract picture. τ/holonomy are independent of this choice.
 */
export function developNet(
  torus: Torus,
  p: ArrayLike<number>,
  attach: readonly Attach[] = torus.attach,
): DevelopedNet {
  const F = torus.triangles.length;
  const order = torus.developOrder;
  const corners: V2[][] = new Array(F);
  const placedAt = new Array<number>(F).fill(-1);
  const treeEdges: number[] = [];
  const treeKeys = new Set<number>();
  const steps: DevelopStep[] = [];

  // --- root: developOrder[0], laid out CCW ---
  const root = order[0];
  {
    const [a, b, c] = torus.triangles[root];
    const A: V2 = [0, 0];
    const B: V2 = [len(p, a, b), 0];
    const [cand0, cand1] = placeThird(A, B, len(p, c, a), len(p, c, b));
    const C = signedArea2(A, B, cand0) > 0 ? cand0 : cand1;
    corners[root] = [A, B, C];
    placedAt[root] = 0;
    steps.push({ t: root, parent: -1, edge: [-1, -1] });
  }

  // --- each later triangle glues onto its attach parent ---
  for (let i = 1; i < order.length; i++) {
    const t = order[i];
    const { parent, u: su, v: sv } = attach[t];
    const Pu = corners[parent][localIndex(torus, parent, su)];
    const Pv = corners[parent][localIndex(torus, parent, sv)];
    const lu = localIndex(torus, t, su), lv = localIndex(torus, t, sv);
    const lw = 3 - lu - lv;
    const w = torus.triangles[t][lw];
    const [cand0, cand1] = placeThird(Pu, Pv, len(p, w, su), len(p, w, sv));
    const cn: V2[] = new Array(3);
    cn[lu] = Pu; cn[lv] = Pv; cn[lw] = cand0;
    cn[lw] = signedArea2(cn[0], cn[1], cn[2]) > 0 ? cand0 : cand1;
    corners[t] = cn;
    placedAt[t] = i;
    const k = edgeKey(su, sv);
    treeKeys.add(k);
    treeEdges.push(k);
    steps.push({ t, parent, edge: [su, sv] });
  }

  // --- cut edges: every shared edge not used by the tree ---
  const cutEdges: CutEdge[] = [];
  for (const [k, [t1, t2]] of torus.edgeToTris) {
    if (treeKeys.has(k)) continue;
    const u = Math.floor(k / torus.vertexCount), v = k % torus.vertexCount;
    const P1u = corners[t1][localIndex(torus, t1, u)], P1v = corners[t1][localIndex(torus, t1, v)];
    const P2u = corners[t2][localIndex(torus, t2, u)], P2v = corners[t2][localIndex(torus, t2, v)];
    const translation: V2 = [P1u[0] - P2u[0], P1u[1] - P2u[1]];
    // rotational defect: angle between the two edge-image vectors.
    const e1x = P1v[0] - P1u[0], e1y = P1v[1] - P1u[1];
    const e2x = P2v[0] - P2u[0], e2y = P2v[1] - P2u[1];
    const rotDefect = Math.abs(Math.atan2(e1x * e2y - e1y * e2x, e1x * e2x + e1y * e2y));
    cutEdges.push({ edge: [u, v], tris: [t1, t2], translation, rotDefect, isFold: false });
  }
  cutEdges.sort((a, b) => edgeKey(a.edge[0], a.edge[1]) - edgeKey(b.edge[0], b.edge[1]));

  // Classify folds: contractible cut edges have ~zero holonomy. Threshold
  // relative to the largest holonomy on this torus, so it is scale-free.
  let maxT = 0;
  for (const c of cutEdges) maxT = Math.max(maxT, Math.hypot(c.translation[0], c.translation[1]));
  const foldTol = 1e-6 * (maxT || 1);
  for (const c of cutEdges) {
    (c as { isFold: boolean }).isFold = Math.hypot(c.translation[0], c.translation[1]) < foldTol;
  }

  return { corners, treeEdges, cutEdges, steps };
}

// ---------------------------------------------------------------------------
// Modulus
// ---------------------------------------------------------------------------

export type Modulus = {
  /** Holonomy translations of the two generator loops, positively oriented. */
  readonly v1: V2;
  readonly v2: V2;
  /** τ = v₂/v₁ as a complex number; Im τ > 0. */
  readonly tau: V2;
  /** Intrinsic total area (= covolume of Λ for a unit-index basis). */
  readonly area: number;
  /** |v₁ × v₂|; equals `area` exactly when the generators are a unit-index basis. */
  readonly covolume: number;
  /** Max |net rotation| over the two loops (≈ 0 ⟺ holonomy is a pure translation ⟺ flat). */
  readonly rotDefect: number;
};

const cross = (a: V2, b: V2) => a[0] * b[1] - a[1] * b[0];

/** Complex division v₂/v₁ = (v₂ · conj v₁) / |v₁|². */
function complexDiv(v2: V2, v1: V2): V2 {
  const d = v1[0] * v1[0] + v1[1] * v1[1];
  return [(v2[0] * v1[0] + v2[1] * v1[1]) / d, (v2[1] * v1[0] - v2[0] * v1[1]) / d];
}

/**
 * Holonomy translation of an oriented edge-loop, read off the developed net.
 * Because the surface is flat the holonomy is a pure translation, so the
 * developed vector (b − a) of a directed edge is the SAME in every lift — we
 * sum those edge vectors around the loop. The sum over a closed loop is the net
 * displacement between the start and end lifts, i.e. the holonomy translation.
 */
function loopHolonomy(torus: Torus, net: DevelopedNet, loop: readonly number[]): V2 {
  let x = 0, y = 0;
  for (let k = 0; k + 1 < loop.length; k++) {
    const a = loop[k], b = loop[k + 1];
    const t = torus.edgeToTris.get(edgeKey(a, b))![0];
    const Pa = net.corners[t][localIndex(torus, t, a)];
    const Pb = net.corners[t][localIndex(torus, t, b)];
    x += Pb[0] - Pa[0];
    y += Pb[1] - Pa[1];
  }
  return [x, y];
}

/**
 * Developed polyline of one generator loop, laid head-to-tail from the
 * developed edge vectors (same vectors loopHolonomy sums). Continuous; its net
 * displacement is the loop's holonomy. For drawing the marking on the net.
 */
function loopPolyline(torus: Torus, net: DevelopedNet, loop: readonly number[]): V2[] {
  const t0 = torus.edgeToTris.get(edgeKey(loop[0], loop[1]))![0];
  let cur: V2 = net.corners[t0][localIndex(torus, t0, loop[0])];
  const pts: V2[] = [cur];
  for (let k = 0; k + 1 < loop.length; k++) {
    const a = loop[k], b = loop[k + 1];
    const t = torus.edgeToTris.get(edgeKey(a, b))![0];
    const Pa = net.corners[t][localIndex(torus, t, a)];
    const Pb = net.corners[t][localIndex(torus, t, b)];
    cur = [cur[0] + (Pb[0] - Pa[0]), cur[1] + (Pb[1] - Pa[1])];
    pts.push(cur);
  }
  return pts;
}

/** Developed polyline (plane points) of each generator loop on a given net. */
export function generatorPaths(torus: Torus, net: DevelopedNet): V2[][] {
  return torus.generatorLoops.map((loop) => loopPolyline(torus, net, loop));
}

/** Compute the modulus τ from the holonomy of the two generator loops. */
export function modulus(torus: Torus, p: ArrayLike<number>): Modulus {
  const net = developNet(torus, p);
  const area = totalArea(torus, p);
  let rotDefect = 0;
  for (const c of net.cutEdges) rotDefect = Math.max(rotDefect, c.rotDefect);
  let v1 = loopHolonomy(torus, net, torus.generatorLoops[0]);
  let v2 = loopHolonomy(torus, net, torus.generatorLoops[1]);
  if (cross(v1, v2) < 0) [v1, v2] = [v2, v1]; // orient so τ ∈ ℍ (consistent across dataset)
  return {
    v1, v2,
    tau: complexDiv(v2, v1),
    area,
    covolume: Math.abs(cross(v1, v2)),
    rotDefect,
  };
}

// ---------------------------------------------------------------------------
// SL(2,ℤ) reduction (for the moduli-space view)
// ---------------------------------------------------------------------------

/**
 * Reduce τ ∈ ℍ into the standard fundamental domain
 * { |Re τ| ≤ ½, |τ| ≥ 1 } via the generators T: τ↦τ+1 and S: τ↦−1/τ.
 */
export function reduceModulus(tau: V2): V2 {
  let re = tau[0], im = tau[1];
  for (let guard = 0; guard < 1000; guard++) {
    const shift = Math.round(re);          // T: bring Re into [-½, ½]
    re -= shift;
    const n = re * re + im * im;
    if (n >= 1 - 1e-15) break;             // already |τ| ≥ 1
    re = -re / n; im = im / n;             // S: τ ↦ −1/τ
  }
  return [re, im];
}
