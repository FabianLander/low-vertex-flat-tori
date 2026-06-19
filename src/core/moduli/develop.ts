/**
 * develop — the developing map: unfold a flat torus into the Euclidean plane.
 *
 * This is the GEOMETRIC realization of one of OUR metric tori (edge lengths from a 3D
 * embedding) into ℝ² ≅ ℂ. `topology/` supplies the finite COMBINATORIAL data it walks
 * along (the develop order, gluing tree, generator loops, cut); this module turns that
 * into planar geometry. The MEASUREMENT read off it — the modulus τ — lives in its
 * sibling `./modulus.ts` (computed directly from the frames here, no positions needed);
 * `./reduce.ts` takes that τ down to moduli space.
 *
 * The core is per-triangle FRAMES (`developFrames`): each triangle's canonical shape
 * (`canonicalShape`/`canonicalCorners`, from its own three edge lengths) carried into a
 * unit-complex rotation `R_t` built along the gluing tree —
 *   `R_root = 1`,   `R_t = (R_parent · canEdge_parent) / canEdge_t`
 * (both shared-edge vectors have length ℓ_{su,sv}, so |R_t| = 1). Pure ℂ products over
 * the develop tree — no circle–circle intersection, no candidate selection (every
 * triangle is CCW by construction; the manifold's opposite orientation of a shared edge
 * places each glued triangle on the correct side automatically).
 *
 * From the frames:
 *   - `developNet` walks vertex POSITIONS (for the rendered developed sheet + cut edges);
 *   - `modulus` (in `./modulus.ts`) sums developed edge vectors `R_t·c^t` over the two
 *     generator loops → the holonomy → τ, with NO position walk;
 *   - `tauFromNet` reads τ off the developed positions — the alternate route, kept for the
 *     consistency check that the two agree.
 *
 * Only the INTRINSIC data enters (edge lengths). `framePlan` precomputes the
 * position-independent combinatorial recipe (develop steps + loop/cut reads) once per
 * triangulation, shared by the net, the modulus, and the τ-Jacobian.
 *
 * Pure module: no three.js, no DOM.
 */

import type { Triangulation, DevelopStep } from '@core/topology/triangulation.ts';
import { edgeKey, edgeEnds } from '@core/topology/triangulation.ts';
import { type Vec2, det2 } from '@core/geometry/vec2.ts';
import { triangleArea } from '@core/geometry/triangle.ts';

// ─── complex arithmetic on Vec2 (a Vec2 is a complex number) ──────────────────

/** Complex product a·b. */
export const cmul = (a: Vec2, b: Vec2): Vec2 => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
/** Complex quotient a/b = (a · conj b)/|b|². */
export const cdiv = (a: Vec2, b: Vec2): Vec2 => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};

// ─── intrinsic primitives ─────────────────────────────────────────────────────

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

// ─── canonical triangle shape (the law-of-cosines kernel, single source) ──────

/** Provisional fold guard: `∂y₂` divides by the height; floored so it never NaNs at a
 *  collinear triangle. The VALUE keeps the true `y₂` (`√(max(0,·))`). DELIBERATE
 *  PLACEHOLDER — TODO(numerics): choose the most numerically stable treatment of this
 *  fold on purpose (reformulate to avoid `1/y₂`, robust area handling, or scale norm.). */
const HEIGHT_FLOOR = 1e-9;

/** A triangle's canonical shape from its three edge lengths, with the per-length
 *  derivatives (`d_/dℓ` w.r.t. `[ℓ01, ℓ02, ℓ12]`). The single source of the
 *  law-of-cosines formula — the value path reads `x2,y2`; the dual (∂τ/∂p) path chains
 *  `dx2,dy2` with `∂ℓ/∂p`. `y2` is the triangle height; its derivative is height-floored. */
export type Shape = {
  readonly x2: number; readonly y2: number;
  readonly dx2: readonly [number, number, number];
  readonly dy2: readonly [number, number, number];
};
export function canonicalShape(l01: number, l02: number, l12: number): Shape {
  const num = l01 * l01 + l02 * l02 - l12 * l12;
  const den = 2 * l01;
  const x2 = num / den;
  const y2 = Math.sqrt(Math.max(0, l02 * l02 - x2 * x2));
  const yFloor = Math.max(y2, HEIGHT_FLOOR);
  const dnum: [number, number, number] = [2 * l01, 2 * l02, -2 * l12];   // ∂num/∂ℓ
  const dden: [number, number, number] = [2, 0, 0];                       // ∂den/∂ℓ
  const dx2: [number, number, number] = [0, 0, 0];
  const dy2: [number, number, number] = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    dx2[k] = (dnum[k] * den - num * dden[k]) / (den * den);
    const dl02 = k === 1 ? 1 : 0;                                         // ∂ℓ02/∂ℓ_k
    dy2[k] = (2 * l02 * dl02 - 2 * x2 * dx2[k]) / (2 * yFloor);
  }
  return { x2, y2, dx2, dy2 };
}

/** Triangle `t`'s canonical corners (value): v0 at the origin, v1 along +x at ℓ01, v2 in
 *  the upper half-plane (CCW). Uses `canonicalShape` so the formula lives in one place. */
function canonicalCorners(triang: Triangulation, p: ArrayLike<number>, t: number): [Vec2, Vec2, Vec2] {
  const [a, b, c] = triang.triangles[t];
  const l01 = len(p, a, b), l02 = len(p, a, c), l12 = len(p, b, c);
  const s = canonicalShape(l01, l02, l12);
  return [[0, 0], [l01, 0], [s.x2, s.y2]];
}

// ─── the combinatorial recipe (position-independent, cached) ──────────────────

/** One develop-tree gluing step: triangle `t` onto `parent` across edge (su,sv), with the
 *  local indices of su,sv in both (so the frame walk needs no `localIndex` lookups). */
export type FrameStep = {
  readonly t: number; readonly parent: number;
  readonly su: number; readonly sv: number;
  readonly ltSu: number; readonly ltSv: number;   // local indices of su,sv in t
  readonly lpSu: number; readonly lpSv: number;    // local indices of su,sv in parent
};
/** One directed loop edge a→b, read in triangle `t = edgeToTris(a,b)[0]`. */
export type LoopRead = { readonly t: number; readonly la: number; readonly lb: number };
/** One cut edge (u,v) and the local indices of u,v in each of its two triangles. */
export type CutRead = {
  readonly edge: readonly [number, number];
  readonly t1: number; readonly t2: number;
  readonly lu1: number; readonly lv1: number; readonly lu2: number; readonly lv2: number;
};
/** The position-independent recipe: what `developNet`, `modulus`, and `tauJacobian` all
 *  walk. The single source of the combinatorial bookkeeping (so it can't drift between
 *  the value and the τ-Jacobian). */
export type FramePlan = {
  readonly root: number;
  readonly steps: readonly FrameStep[];        // non-root, in develop order
  readonly loops: readonly (readonly LoopRead[])[]; // the two generator loops
  readonly cuts: readonly CutRead[];           // cut edges, sorted by edgeKey
  readonly treeKeys: ReadonlySet<number>;
};

const planCache = new WeakMap<Triangulation, FramePlan>();

/** The frame recipe for `triang`, derived once and memoized. */
export function framePlan(triang: Triangulation): FramePlan {
  const hit = planCache.get(triang);
  if (hit) return hit;
  const { developOrder: order, attach } = triang.fundamentalDomain;
  const root = order[0];
  const treeKeys = new Set<number>();
  const steps: FrameStep[] = [];
  for (let i = 1; i < order.length; i++) {
    const t = order[i];
    const { parent, u: su, v: sv } = attach[t];
    steps.push({
      t, parent, su, sv,
      ltSu: localIndex(triang, t, su), ltSv: localIndex(triang, t, sv),
      lpSu: localIndex(triang, parent, su), lpSv: localIndex(triang, parent, sv),
    });
    treeKeys.add(edgeKey(su, sv));
  }
  const loops: LoopRead[][] = triang.marking.generatorLoops.map((loop) => {
    const reads: LoopRead[] = [];
    for (let k = 0; k + 1 < loop.length; k++) {
      const a = loop[k], b = loop[k + 1];
      const t = triang.edgeToTris.get(edgeKey(a, b))![0];
      reads.push({ t, la: localIndex(triang, t, a), lb: localIndex(triang, t, b) });
    }
    return reads;
  });
  const cuts: CutRead[] = [];
  for (const [k, [t1, t2]] of triang.edgeToTris) {
    if (treeKeys.has(k)) continue;
    const [u, v] = edgeEnds(k);
    cuts.push({
      edge: [u, v], t1, t2,
      lu1: localIndex(triang, t1, u), lv1: localIndex(triang, t1, v),
      lu2: localIndex(triang, t2, u), lv2: localIndex(triang, t2, v),
    });
  }
  cuts.sort((a, b) => edgeKey(a.edge[0], a.edge[1]) - edgeKey(b.edge[0], b.edge[1]));
  const plan: FramePlan = { root, steps, loops, cuts, treeKeys };
  planCache.set(triang, plan);
  return plan;
}

// ─── the frame core (value) ───────────────────────────────────────────────────

/** Per-triangle developing frames: the rotation `R_t` (unit complex) and the canonical
 *  corners `canon_t`. The shared value core — `developNet` (positions) and `modulus`
 *  (holonomy) both build on it. No vertex positions; just the intrinsic frame data. */
export type Frames = { readonly R: Vec2[]; readonly canon: [Vec2, Vec2, Vec2][] };

/** Build the frames: canonical shape per triangle + the `R_t` recurrence over the tree. */
export function developFrames(triang: Triangulation, p: ArrayLike<number>): Frames {
  const plan = framePlan(triang);
  const F = triang.triangles.length;
  const R: Vec2[] = new Array(F);
  const canon: [Vec2, Vec2, Vec2][] = new Array(F);
  canon[plan.root] = canonicalCorners(triang, p, plan.root);
  R[plan.root] = [1, 0];
  for (const s of plan.steps) {
    const q = canonicalCorners(triang, p, s.t);
    canon[s.t] = q;
    const cp = canon[s.parent];
    const ep: Vec2 = [cp[s.lpSv][0] - cp[s.lpSu][0], cp[s.lpSv][1] - cp[s.lpSu][1]]; // canEdge_parent
    const et: Vec2 = [q[s.ltSv][0] - q[s.ltSu][0], q[s.ltSv][1] - q[s.ltSu][1]];     // canEdge_t
    R[s.t] = cdiv(cmul(R[s.parent], ep), et);                                        // |R_t| = 1
  }
  return { R, canon };
}

// ─── the developed net (positions, for rendering) ─────────────────────────────

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
 * Develop the triangulation into the plane as vertex POSITIONS — for the rendered
 * developed sheet (`viewer/developedSheet`, `mesh/uv`) and the cut-edge translations.
 * Walks the frames: root at the origin (R = 1), each glued triangle placed by its frame
 * `corners[t][L] = P_su + R_t·(canon[t][L] − canon[t][su])`. Gauge: root v0 at the origin,
 * v0→v1 along +x, every triangle CCW. (The modulus does NOT need this — see `modulus`.)
 */
export function developNet(triang: Triangulation, p: ArrayLike<number>): DevelopedNet {
  const plan = framePlan(triang);
  const { R, canon } = developFrames(triang, p);
  const F = triang.triangles.length;
  const corners: Vec2[][] = new Array(F);
  const treeEdges: number[] = [];
  const steps: DevelopStep[] = [{ t: plan.root, parent: -1, edge: [-1, -1] }];

  corners[plan.root] = canon[plan.root].map((c): Vec2 => [c[0], c[1]]);   // R = 1, origin 0
  for (const s of plan.steps) {
    const q = canon[s.t], Rt = R[s.t];
    const Psu = corners[s.parent][s.lpSu];
    const cn: Vec2[] = new Array(3);
    for (let L = 0; L < 3; L++) {
      const dx = q[L][0] - q[s.ltSu][0], dy = q[L][1] - q[s.ltSu][1];
      cn[L] = [Psu[0] + (Rt[0] * dx - Rt[1] * dy), Psu[1] + (Rt[1] * dx + Rt[0] * dy)];
    }
    corners[s.t] = cn;
    treeEdges.push(edgeKey(s.su, s.sv));
    steps.push({ t: s.t, parent: s.parent, edge: [s.su, s.sv] });
  }

  const cutEdges: CutEdge[] = plan.cuts.map((cut) => {
    const P1u = corners[cut.t1][cut.lu1], P1v = corners[cut.t1][cut.lv1];
    const P2u = corners[cut.t2][cut.lu2], P2v = corners[cut.t2][cut.lv2];
    const translation: Vec2 = [P1u[0] - P2u[0], P1u[1] - P2u[1]];
    const e1x = P1v[0] - P1u[0], e1y = P1v[1] - P1u[1];
    const e2x = P2v[0] - P2u[0], e2y = P2v[1] - P2u[1];
    const rotDefect = Math.abs(Math.atan2(e1x * e2y - e1y * e2x, e1x * e2x + e1y * e2y));
    return { edge: cut.edge, tris: [cut.t1, cut.t2] as const, translation, rotDefect };
  });

  return { corners, treeEdges, cutEdges, steps };
}

/**
 * τ read off the developed IMAGE — the holonomy summed from net positions
 * (`P_b − P_a` over each generator loop), `τ = v₂/v₁` (orientation-swapped). The
 * ALTERNATE route to the direct `modulus`; kept for the consistency check that
 * developing-then-reading agrees with the direct frame computation to machine precision.
 */
export function tauFromNet(triang: Triangulation, net: DevelopedNet): Vec2 {
  const plan = framePlan(triang);
  const holo = (reads: readonly LoopRead[]): Vec2 => {
    let x = 0, y = 0;
    for (const { t, la, lb } of reads) {
      const c = net.corners[t];
      x += c[lb][0] - c[la][0];
      y += c[lb][1] - c[la][1];
    }
    return [x, y];
  };
  let v1 = holo(plan.loops[0]);
  let v2 = holo(plan.loops[1]);
  if (det2(v1, v2) < 0) [v1, v2] = [v2, v1];
  return cdiv(v2, v1);
}

/**
 * The lifted polyline of an oriented edge-loop, drawn in the developing map and
 * anchored so it STARTS at `origin`. Consecutive points differ by the developed
 * vector of each directed edge — the same translation-invariant vectors that the
 * holonomy sums — so the polyline is connected end-to-end and its last point
 * minus its first is exactly the loop's holonomy translation. Use it to draw a
 * generator loop and its lattice translate in the universal cover. Returns
 * `loop.length` points.
 */
export function developLoop(
  triang: Triangulation,
  net: DevelopedNet,
  loop: readonly number[],
  origin: Vec2 = [0, 0],
): Vec2[] {
  const pts: Vec2[] = [[origin[0], origin[1]]];
  let x = origin[0], y = origin[1];
  for (let k = 0; k + 1 < loop.length; k++) {
    const a = loop[k], b = loop[k + 1];
    const t = triang.edgeToTris.get(edgeKey(a, b))![0];
    const Pa = net.corners[t][localIndex(triang, t, a)];
    const Pb = net.corners[t][localIndex(triang, t, b)];
    x += Pb[0] - Pa[0];
    y += Pb[1] - Pa[1];
    pts.push([x, y]);
  }
  return pts;
}
