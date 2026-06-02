/**
 * Develop the 8-vertex flat torus into the Euclidean plane and read off its
 * modulus τ ∈ ℍ (its point in Teichmüller space).
 *
 * Because every vertex has cone angle exactly 2π the intrinsic metric has no
 * cone points, so the surface is a smooth flat torus ℝ²/Λ. We recover Λ by
 * unfolding the triangulation into the plane and reading the holonomy of the
 * developing map: the deck group of the universal cover is, by flatness, a
 * group of pure TRANSLATIONS, and the two generators of π₁(T²)=ℤ² map to a
 * basis (v₁, v₂) of Λ. Then τ = v₂/v₁ (as complex numbers).
 *
 * Only the INTRINSIC data enters: the 24 edge lengths and the 16×3 corner
 * angles, both computed from the 3D embedding. The 3D coordinates appear only
 * through these. (Orientation comes from the fixed CCW order in TRIANGLES.)
 *
 * Pipeline:
 *   1. intrinsic primitives: edge lengths ℓ_ij, corner angles α[t][k].
 *   2. developNet: unfold the 16 triangles in a fixed, hand-authored order
 *      (DEVELOP_ORDER) along the spanning tree induced by the abstract
 *      hexagonal fundamental domain (ATTACH, derived from latticeLayout.hexDomain
 *      — NOT a generic BFS, so the net matches the abstract figure exactly).
 *      Each triangle is laid out CCW by circle–circle intersection against its
 *      already-placed parent edge. Every (triangle, local-corner) gets a planar
 *      point.
 *   3. The 24 − 15 = 9 dual edges NOT in the tree are CUT edges; each appears
 *      twice on the net boundary, related by a translation τₑ (its holonomy).
 *      The 9 τₑ generate Λ.
 *   4. modulus: pick two cut edges whose fundamental loops form a unit-index
 *      basis of H₁ (the MARKING), giving (v₁, v₂) and τ = v₂/v₁.
 *
 * Marking consistency: whether two cut edges form a unit-index basis is purely
 * combinatorial (metric-independent), so the deterministic "first valid pair"
 * is the SAME marking for every torus — τ is then a continuous function on the
 * dataset and each Markov walk is a continuous trajectory in ℍ.
 *
 * Pure module: no three.js, no DOM.
 */

import { TRIANGLES, VERTEX_COUNT } from './topology';
import { totalArea } from './energies/cellMargin';
import { hexDomain, tracePath } from './latticeLayout';

const F = TRIANGLES.length; // 16

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
 * Returns angle[t][k] for triangle t, local corner k (matching TRIANGLES[t]).
 * The third angle is taken as π − α − β so each triangle closes exactly,
 * avoiding float drift from three independent acos calls.
 */
export function cornerAngles(p: ArrayLike<number>): number[][] {
  const out: number[][] = [];
  for (let t = 0; t < F; t++) {
    const [a, b, c] = TRIANGLES[t];
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

// ---------------------------------------------------------------------------
// Dual-graph adjacency (combinatorial, embedding-independent — built once)
// ---------------------------------------------------------------------------

function edgeKey(u: number, v: number): number {
  return u < v ? u * VERTEX_COUNT + v : v * VERTEX_COUNT + u;
}

/** edgeKey → the (exactly two) triangles sharing that edge, sorted ascending. */
const EDGE_TO_TRIS: Map<number, [number, number]> = (() => {
  const m = new Map<number, number[]>();
  for (let t = 0; t < F; t++) {
    const tri = TRIANGLES[t];
    for (let s = 0; s < 3; s++) {
      const k = edgeKey(tri[s], tri[(s + 1) % 3]);
      const arr = m.get(k);
      if (arr) arr.push(t); else m.set(k, [t]);
    }
  }
  const out = new Map<number, [number, number]>();
  for (const [k, arr] of m) {
    if (arr.length !== 2) throw new Error(`edge ${k} shared by ${arr.length} triangles, expected 2`);
    out.set(k, arr[0] < arr[1] ? [arr[0], arr[1]] : [arr[1], arr[0]]);
  }
  return out;
})();

/**
 * Explicit unfolding order, written down by reading the fundamental domain off
 * the figure (scripts/draw-figures.mjs) rather than computed from a spanning
 * tree. Triangle 3 is the root; each later triangle is attached to its
 * earliest-already-placed neighbor. The first six (3,14,15,13,7,1) are the
 * 6-triangle star of vertex 2 — they fan around vertex 2 and, by flatness,
 * close up to exactly 2π — then 12,0 cap and the rest fill outward.
 *
 * Every entry must be edge-adjacent to an earlier one (validated at runtime).
 * Edit this to re-cut the fundamental domain.
 */
export const DEVELOP_ORDER: readonly number[] = [
  3, 14, 15, 13, 7, 1, 0, 6, 9, 8, 10, 2, 4, 5, 11, 12,
];

/** Local index (0,1,2) of global vertex g within triangle t. */
function localIndex(t: number, g: number): number {
  const tri = TRIANGLES[t];
  if (tri[0] === g) return 0;
  if (tri[1] === g) return 1;
  if (tri[2] === g) return 2;
  throw new Error(`vertex ${g} not in triangle ${t}`);
}

/**
 * Attachment tree, precomputed once from the ABSTRACT hexagonal fundamental
 * domain (latticeLayout.hexDomain) and DEVELOP_ORDER. attach[t] = {parent, u, v}
 * means triangle t is glued onto `parent` across global edge (u,v) — and that
 * gluing is the one COINCIDENT in the abstract hexagon (the two tiles share
 * that lattice edge), not merely the earliest graph-neighbor. Using it makes
 * the developed net combinatorially identical to the abstract picture (e.g.
 * triangle 9 attaches to 6, the triangle it actually sits beside, not to 14).
 * Purely combinatorial ⟹ the same for every torus.
 */
type Attach = { parent: number; u: number; v: number };
const ATTACH: Attach[] = (() => {
  const tiles = hexDomain();
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const latOf = (t: number, g: number) => byId.get(t)!.lat[TRIANGLES[t].indexOf(g)];
  const same = (a: readonly number[], b: readonly number[]) => a[0] === b[0] && a[1] === b[1];
  const placedAt = new Array<number>(F).fill(-1);
  const out = new Array<Attach>(F);
  const root = DEVELOP_ORDER[0];
  out[root] = { parent: -1, u: -1, v: -1 };
  placedAt[root] = 0;
  for (let i = 1; i < DEVELOP_ORDER.length; i++) {
    const t = DEVELOP_ORDER[i], tri = TRIANGLES[t];
    let parent = -1, best = Infinity, su = -1, sv = -1;
    for (let s = 0; s < 3; s++) {
      const u = tri[s], v = tri[(s + 1) % 3];
      const [tA, tB] = EDGE_TO_TRIS.get(edgeKey(u, v))!;
      const nbr = tA === t ? tB : tA;
      if (placedAt[nbr] >= 0 && placedAt[nbr] < best
        && same(latOf(t, u), latOf(nbr, u)) && same(latOf(t, v), latOf(nbr, v))) {
        best = placedAt[nbr]; parent = nbr; su = u; sv = v;
      }
    }
    if (parent < 0) throw new Error(`DEVELOP_ORDER: triangle ${t} has no coincident placed neighbor in the abstract domain`);
    out[t] = { parent, u: su, v: sv };
    placedAt[t] = i;
  }
  return out;
})();

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
   *  copies coincide). Folds are interior to the fundamental polygon; the two
   *  non-fold cut edges are the H₁ generators that bound it. */
  readonly isFold: boolean;
};

/** One unfolding step: triangle `t` attached across edge `edge` to `parent`
 *  (parent = -1 for the root). In DEVELOP_ORDER sequence — for animation. */
export type DevelopStep = {
  readonly t: number;
  readonly parent: number;
  readonly edge: readonly [number, number];
};

export type DevelopedNet = {
  /** corners[t] = [P0, P1, P2], planar points of triangle t's corners
   *  (in TRIANGLES[t] order). A glued vertex appears once per incident triangle. */
  readonly corners: V2[][];
  /** The 15 glue (tree) edges used to unfold — coincident, not cut. */
  readonly treeEdges: number[];
  /** The 9 cut edges, sorted by edgeKey for determinism. */
  readonly cutEdges: CutEdge[];
  /** Placement steps in DEVELOP_ORDER (root first). */
  readonly steps: DevelopStep[];
};

/** Signed (×2) area of the planar triangle P0→P1→P2; >0 means CCW. */
function signedArea2(P0: V2, P1: V2, P2: V2): number {
  return (P1[0] - P0[0]) * (P2[1] - P0[1]) - (P1[1] - P0[1]) * (P2[0] - P0[0]);
}

/**
 * Given two placed planar points Pi, Pj (images of triangle corners i, j) and
 * the distances rI = |third−i|, rJ = |third−j|, return the third point on the
 * side chosen so the triangle is CCW. We compute both circle–circle
 * intersection candidates and pick the CCW one for the caller's corner order.
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

/** Unfold all 16 triangles into the plane, following DEVELOP_ORDER. */
export function developNet(p: ArrayLike<number>): DevelopedNet {
  const corners: V2[][] = new Array(F);
  const placedAt = new Array<number>(F).fill(-1); // placement step, -1 = unplaced
  const treeEdges: number[] = [];
  const treeKeys = new Set<number>();
  const steps: DevelopStep[] = [];

  // --- root: DEVELOP_ORDER[0], laid out CCW ---
  const root = DEVELOP_ORDER[0];
  {
    const [a, b, c] = TRIANGLES[root];
    const A: V2 = [0, 0];
    const B: V2 = [len(p, a, b), 0];
    const [cand0, cand1] = placeThird(A, B, len(p, c, a), len(p, c, b));
    const C = signedArea2(A, B, cand0) > 0 ? cand0 : cand1;
    corners[root] = [A, B, C];
    placedAt[root] = 0;
    steps.push({ t: root, parent: -1, edge: [-1, -1] });
  }

  // --- each later triangle glues onto its abstract-coincident parent ---
  for (let i = 1; i < DEVELOP_ORDER.length; i++) {
    const t = DEVELOP_ORDER[i];
    const { parent, u: su, v: sv } = ATTACH[t];
    const Pu = corners[parent][localIndex(parent, su)];
    const Pv = corners[parent][localIndex(parent, sv)];
    const lu = localIndex(t, su), lv = localIndex(t, sv);
    const lw = 3 - lu - lv;
    const w = TRIANGLES[t][lw];
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
  for (const [k, [t1, t2]] of EDGE_TO_TRIS) {
    if (treeKeys.has(k)) continue;
    const u = Math.floor(k / VERTEX_COUNT), v = k % VERTEX_COUNT;
    const P1u = corners[t1][localIndex(t1, u)], P1v = corners[t1][localIndex(t1, v)];
    const P2u = corners[t2][localIndex(t2, u)], P2v = corners[t2][localIndex(t2, v)];
    const translation: V2 = [P1u[0] - P2u[0], P1u[1] - P2u[1]];
    // rotational defect: angle between the two edge-image vectors.
    const e1x = P1v[0] - P1u[0], e1y = P1v[1] - P1u[1];
    const e2x = P2v[0] - P2u[0], e2y = P2v[1] - P2u[1];
    const rotDefect = Math.abs(Math.atan2(e1x * e2y - e1y * e2x, e1x * e2x + e1y * e2y));
    cutEdges.push({ edge: [u, v], tris: [t1, t2], translation, rotDefect, isFold: false });
  }
  cutEdges.sort((a, b) => edgeKey(a.edge[0], a.edge[1]) - edgeKey(b.edge[0], b.edge[1]));

  // Classify folds: contractible cut edges have ~zero holonomy (their two
  // developed copies coincide). Threshold relative to the largest holonomy on
  // this torus, so it is scale-free.
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
 * The marking: two oriented edge-loops on the triangulation, each based at
 * vertex 0, generating H₁(T²). Their holonomy translations are the lattice
 * basis (v₁, v₂) and define τ. Chosen by hand (see scripts/draw-figures.mjs):
 *   γ₁ = 0→3→6→0   (developed displacement ≈ lattice (1,2))
 *   γ₂ = 0→2→1→0   (developed displacement ≈ lattice (3,-2))
 * They share only vertex 0 (no common edge). Swap/edit to re-mark.
 */
export const GENERATOR_LOOPS: readonly (readonly number[])[] = [
  [0, 3, 6, 0],
  [0, 2, 1, 0],
];

/**
 * Holonomy translation of an oriented edge-loop, read off the developed net.
 * Because the surface is flat the holonomy is a pure translation, so the
 * developed vector (b − a) of a directed edge is the SAME in every lift — we
 * can just sum those edge vectors around the loop. The sum over a closed loop
 * is the net displacement between the start and end lifts of vertex 0, i.e. the
 * holonomy translation.
 */
function loopHolonomy(net: DevelopedNet, loop: readonly number[]): V2 {
  let x = 0, y = 0;
  for (let k = 0; k + 1 < loop.length; k++) {
    const a = loop[k], b = loop[k + 1];
    const t = EDGE_TO_TRIS.get(edgeKey(a, b))![0];
    const Pa = net.corners[t][localIndex(t, a)];
    const Pb = net.corners[t][localIndex(t, b)];
    x += Pb[0] - Pa[0];
    y += Pb[1] - Pa[1];
  }
  return [x, y];
}

/**
 * Corner references (triangle, local-corner) for each GENERATOR_LOOP vertex,
 * located once on the abstract hexagonal domain. Lets us draw the generators on
 * any torus's developed net by looking up net.corners[t][k] — the loop follows
 * the same combinatorial path as in the abstract figure.
 */
const GENERATOR_REFS: { t: number; k: number }[][] = (() => {
  const map = new Map<string, { t: number; k: number }>();
  for (const tile of hexDomain()) for (let k = 0; k < 3; k++) {
    map.set(`${tile.lat[k][0]},${tile.lat[k][1]}`, { t: tile.id, k });
  }
  return GENERATOR_LOOPS.map((loop) => tracePath(loop).map((P) => {
    const ref = map.get(`${P[0]},${P[1]}`);
    if (!ref) throw new Error(`generator vertex at lattice (${P}) is not a corner of the hexagonal domain`);
    return ref;
  }));
})();

/** Developed polyline (plane points) of each generator loop on a given net. */
export function generatorPaths(net: DevelopedNet): V2[][] {
  return GENERATOR_REFS.map((refs) => refs.map(({ t, k }) => net.corners[t][k]));
}

/** Compute the modulus τ from the holonomy of the two GENERATOR_LOOPS. */
export function modulus(p: ArrayLike<number>): Modulus {
  const net = developNet(p);
  const area = totalArea(p);
  let rotDefect = 0;
  for (const c of net.cutEdges) rotDefect = Math.max(rotDefect, c.rotDefect);
  let v1 = loopHolonomy(net, GENERATOR_LOOPS[0]);
  let v2 = loopHolonomy(net, GENERATOR_LOOPS[1]);
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
