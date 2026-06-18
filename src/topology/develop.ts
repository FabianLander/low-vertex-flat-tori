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
 *   2. developNet: unfold the triangles in `torus.fundamentalDomain.developOrder` along the
 *      spanning tree `torus.fundamentalDomain.attach`. Each triangle is laid out CCW by
 *      circle–circle intersection against its already-placed parent edge.
 *   3. the dual edges NOT in the tree are CUT edges; each appears twice on the
 *      net boundary, related by a translation τₑ (its holonomy). They generate Λ.
 *   4. modulus: the two `torus.marking.generatorLoops` form the MARKING; their holonomy
 *      gives (v₁, v₂) and τ = v₂/v₁.
 *
 * Marking consistency: whether two loops form a unit-index basis is purely
 * combinatorial (metric-independent), so a fixed marking makes τ a continuous
 * function on the dataset and each Markov walk a continuous trajectory in ℍ.
 *
 * Pure module: no three.js, no DOM.
 */

import type { Triangulation } from './triangulation.ts';
import { edgeKey, edgeEnds } from './triangulation.ts';
import { type Vec2, cross, signedArea2 } from '../geometry/vec2.ts';
import { triangleArea } from '../geometry/triangle.ts';

// ---------------------------------------------------------------------------
// Intrinsic primitives
// ---------------------------------------------------------------------------

/** Euclidean distance between vertices i and j in the 3D embedding. */
function len(p: ArrayLike<number>, i: number, j: number): number {
  const oi = 3 * i, oj = 3 * j;
  return Math.hypot(p[oj] - p[oi], p[oj + 1] - p[oi + 1], p[oj + 2] - p[oi + 2]);
}

/** Total surface area Σ ½‖(b−a)×(c−a)‖ over the F triangles (the intrinsic area;
 *  = covolume of Λ when the generators are a unit-index basis). */
export function totalArea(triang: Triangulation, p: ArrayLike<number>): number {
  let area = 0;
  for (const [a, b, c] of triang.triangles) {
    const oa = 3 * a, ob = 3 * b, oc = 3 * c;
    area += triangleArea(
      p[oa], p[oa + 1], p[oa + 2],
      p[ob], p[ob + 1], p[ob + 2],
      p[oc], p[oc + 1], p[oc + 2],
    );
  }
  return area;
}

/** Local index (0,1,2) of global vertex g within triangle t. */
function localIndex(triang: Triangulation, t: number, g: number): number {
  const tri = triang.triangles[t];
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
  readonly translation: Vec2;
  /** Rotational defect of the gluing (angle between the two edge images).
   *  ≈ 0 confirms the holonomy is a pure translation (flatness). */
  readonly rotDefect: number;
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
  readonly corners: Vec2[][];
  /** The glue (tree) edges used to unfold — coincident, not cut. */
  readonly treeEdges: number[];
  /** The cut edges, sorted by edgeKey for determinism. */
  readonly cutEdges: CutEdge[];
  /** Placement steps in developOrder (root first). */
  readonly steps: DevelopStep[];
};

/**
 * Given two placed planar points Pi, Pj and the distances rI = |third−i|,
 * rJ = |third−j|, return both circle–circle intersection candidates for the
 * third point.
 */
function placeThird(Pi: Vec2, Pj: Vec2, rI: number, rJ: number): [Vec2, Vec2] {
  const dx = Pj[0] - Pi[0], dy = Pj[1] - Pi[1];
  const d = Math.hypot(dx, dy);
  const a = (rI * rI - rJ * rJ + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, rI * rI - a * a));
  const mx = Pi[0] + (a * dx) / d, my = Pi[1] + (a * dy) / d;
  const ox = (-dy / d) * h, oy = (dx / d) * h; // (-dy,dx)/d is the left normal
  return [[mx + ox, my + oy], [mx - ox, my - oy]];
}

/**
 * Unfold all triangles into the plane along the developing chart: place the root,
 * then glue each later triangle (in `fundamentalDomain.developOrder`) onto its parent
 * across the shared edge (`fundamentalDomain.attach`). The non-tree shared edges become
 * the boundary identifications (`cutEdges`), each carrying its holonomy translation.
 */
export function developNet(triang: Triangulation, p: ArrayLike<number>): DevelopedNet {
  const { developOrder: order, attach } = triang.fundamentalDomain;
  const F = triang.triangles.length;
  const corners: Vec2[][] = new Array(F);
  const placedAt = new Array<number>(F).fill(-1);
  const treeEdges: number[] = [];
  const treeKeys = new Set<number>();
  const steps: DevelopStep[] = [];

  // --- root: developOrder[0], laid out CCW ---
  const root = order[0];
  {
    const [a, b, c] = triang.triangles[root];
    const A: Vec2 = [0, 0];
    const B: Vec2 = [len(p, a, b), 0];
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
    const Pu = corners[parent][localIndex(triang, parent, su)];
    const Pv = corners[parent][localIndex(triang, parent, sv)];
    const lu = localIndex(triang, t, su), lv = localIndex(triang, t, sv);
    const lw = 3 - lu - lv;
    const w = triang.triangles[t][lw];
    const [cand0, cand1] = placeThird(Pu, Pv, len(p, w, su), len(p, w, sv));
    const cn: Vec2[] = new Array(3);
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
  for (const [k, [t1, t2]] of triang.edgeToTris) {
    if (treeKeys.has(k)) continue;
    const [u, v] = edgeEnds(k);
    const P1u = corners[t1][localIndex(triang, t1, u)], P1v = corners[t1][localIndex(triang, t1, v)];
    const P2u = corners[t2][localIndex(triang, t2, u)], P2v = corners[t2][localIndex(triang, t2, v)];
    const translation: Vec2 = [P1u[0] - P2u[0], P1u[1] - P2u[1]];
    // rotational defect: angle between the two edge-image vectors.
    const e1x = P1v[0] - P1u[0], e1y = P1v[1] - P1u[1];
    const e2x = P2v[0] - P2u[0], e2y = P2v[1] - P2u[1];
    const rotDefect = Math.abs(Math.atan2(e1x * e2y - e1y * e2x, e1x * e2x + e1y * e2y));
    cutEdges.push({ edge: [u, v], tris: [t1, t2], translation, rotDefect });
  }
  cutEdges.sort((a, b) => edgeKey(a.edge[0], a.edge[1]) - edgeKey(b.edge[0], b.edge[1]));

  return { corners, treeEdges, cutEdges, steps };
}

// ---------------------------------------------------------------------------
// Modulus
// ---------------------------------------------------------------------------

export type Modulus = {
  /** Holonomy translations of the two generator loops, positively oriented. */
  readonly v1: Vec2;
  readonly v2: Vec2;
  /** τ = v₂/v₁ as a complex number; Im τ > 0. */
  readonly tau: Vec2;
  /** Intrinsic total area (= covolume of Λ for a unit-index basis). */
  readonly area: number;
  /** |v₁ × v₂|; equals `area` exactly when the generators are a unit-index basis. */
  readonly covolume: number;
  /** Max |net rotation| over the two loops (≈ 0 ⟺ holonomy is a pure translation ⟺ flat). */
  readonly rotDefect: number;
};


/** Complex division v₂/v₁ = (v₂ · conj v₁) / |v₁|². */
function complexDiv(v2: Vec2, v1: Vec2): Vec2 {
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
function loopHolonomy(triang: Triangulation, net: DevelopedNet, loop: readonly number[]): Vec2 {
  let x = 0, y = 0;
  for (let k = 0; k + 1 < loop.length; k++) {
    const a = loop[k], b = loop[k + 1];
    const t = triang.edgeToTris.get(edgeKey(a, b))![0];
    const Pa = net.corners[t][localIndex(triang, t, a)];
    const Pb = net.corners[t][localIndex(triang, t, b)];
    x += Pb[0] - Pa[0];
    y += Pb[1] - Pa[1];
  }
  return [x, y];
}

/** Compute the modulus τ from the holonomy of the two generator loops. */
export function modulus(triang: Triangulation, p: ArrayLike<number>): Modulus {
  const net = developNet(triang, p);
  const area = totalArea(triang, p);
  let rotDefect = 0;
  for (const c of net.cutEdges) rotDefect = Math.max(rotDefect, c.rotDefect);
  let v1 = loopHolonomy(triang, net, triang.marking.generatorLoops[0]);
  let v2 = loopHolonomy(triang, net, triang.marking.generatorLoops[1]);
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

/** An element of SL(2,ℤ) as [a, b, c, d] acting by τ ↦ (aτ + b)/(cτ + d). */
export type Sl2z = readonly [number, number, number, number];

/** Apply the Möbius transformation of m ∈ SL(2,ℤ) to τ (complex arithmetic). */
export function applyMobius(m: Sl2z, tau: Vec2): Vec2 {
  const [a, b, c, d] = m;
  const nx = a * tau[0] + b, ny = a * tau[1];
  const dx = c * tau[0] + d, dy = c * tau[1];
  const den = dx * dx + dy * dy;
  return [(nx * dx + ny * dy) / den, (ny * dx - nx * dy) / den];
}

/**
 * Reduce τ ∈ ℍ into the standard fundamental domain
 * { |Re τ| ≤ ½, |τ| ≥ 1 } via the generators T: τ↦τ+1 and S: τ↦−1/τ,
 * also returning the SL(2,ℤ) element m with applyMobius(m, τ) = τ̂.
 *
 * The matrix is what makes τ̂ usable as a smooth constraint: the reduction
 * map itself is only piecewise-smooth (it switches group elements at the
 * fundamental-domain walls), but Re/Im of applyMobius(m, τ(p)) with m FROZEN
 * is a smooth function of positions — freeze m at a seed, then constrain.
 */
export function reduceModulusWithMatrix(tau: Vec2): { tau: Vec2; m: Sl2z } {
  let re = tau[0], im = tau[1];
  let a = 1, b = 0, c = 0, d = 1;
  for (let guard = 0; guard < 1000; guard++) {
    const shift = Math.round(re);          // T^{-shift}: bring Re into [-½, ½]
    re -= shift;
    a -= shift * c; b -= shift * d;        // [1,-shift;0,1] · m
    const n = re * re + im * im;
    if (n >= 1 - 1e-15) break;             // already |τ| ≥ 1
    re = -re / n; im = im / n;             // S: τ ↦ −1/τ
    const na = -c, nb = -d;                // [0,-1;1,0] · m
    c = a; d = b; a = na; b = nb;
  }
  return { tau: [re, im], m: [a, b, c, d] };
}

/**
 * Reduce τ ∈ ℍ into the standard fundamental domain
 * { |Re τ| ≤ ½, |τ| ≥ 1 } via the generators T: τ↦τ+1 and S: τ↦−1/τ.
 */
export function reduceModulus(tau: Vec2): Vec2 {
  return reduceModulusWithMatrix(tau).tau;
}
