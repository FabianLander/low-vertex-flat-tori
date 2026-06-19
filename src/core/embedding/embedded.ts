/**
 * embedded — THE embeddedness condition: the gate (is it embedded?) and its native
 * continuous companion `clearance` (how far from the nearest crossing).
 *
 * A realization is embedded iff no two non-adjacent triangle interiors cross — and
 * *which* pairs cross is a function of the ORIENTATION signs of the vertices
 * (`geometry/intersection`), so the gate is sign-only and robust on near-flat
 * tori. `clearance` is the SAME condition read continuously: the min, over exactly
 * the pairs the gate tests, of the true distance to a crossing, normalized by √area
 * (scale-free, 0 exactly on ∂Ω). So **gate = sign(clearance)** and clearance is its
 * positive magnitude — Rich Schwartz's discrete check and its continuous form, one
 * concept. (Valid as a clearance only when embedded; on a crossing config the gate
 * is the truth and `clearance` is not meaningful — the distance kernels report the
 * boundary distance, not the penetration.)
 *
 * The general geometric "min distance between any two non-adjacent cells" is a
 * related but distinct diagnostic — `minSeparation` in `separation.ts`.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import { segmentTriangleIntersect, triangleTriangleIntersect } from '@core/geometry/intersection.ts';
import { segmentTriangleDist2, triangleTriangleDist2 } from '@core/geometry/distance.ts';
import { cellTables } from './cells.ts';
import { linearSize } from './separation.ts';

/**
 * `Region` — the OPEN-condition contract: an open feasible set Ω as a membership test, the
 * open-condition twin of `constraints/Constraint`. `contains` is the hard in/out test the
 * gated steppers refuse to leave; `margin` (optional) is the continuous distance to the
 * boundary (>0 strictly inside, 0 on ∂Ω), which a stepper can use to size a feasible step.
 * The embedded set is the instance below (`isEmbedded` → `contains`, `clearance` → `margin`);
 * `search/` pulls it onto the solver's working space ℝⁿ. Generic (any ℝⁿ) — a ball is one too.
 */
export interface Region {
  contains(x: ArrayLike<number>): boolean;
  margin?(x: ArrayLike<number>): number;
}

// ─── buffer adapters: read a face/edge's corners from `positions` and feed a
//     coordinates-only geometry kernel (the gate's twins of faceFaceDist2/edgeFaceDist2) ──

/** Do the interiors of faces `fa`, `fb` cross? (the gate's tri-tri test) */
function faceFaceIntersect(triang: Triangulation, p: ArrayLike<number>, fa: number, fb: number): boolean {
  const [a0, a1, a2] = triang.triangles[fa];
  const [b0, b1, b2] = triang.triangles[fb];
  const A0 = 3 * a0, A1 = 3 * a1, A2 = 3 * a2, B0 = 3 * b0, B1 = 3 * b1, B2 = 3 * b2;
  return triangleTriangleIntersect(
    p[A0], p[A0 + 1], p[A0 + 2], p[A1], p[A1 + 1], p[A1 + 2], p[A2], p[A2 + 1], p[A2 + 2],
    p[B0], p[B0 + 1], p[B0 + 2], p[B1], p[B1 + 1], p[B1 + 2], p[B2], p[B2 + 1], p[B2 + 2],
  );
}

/** Does the edge (u,w) pierce face `f`'s interior? (the gate's edge-tri test) */
function edgeFaceIntersect(triang: Triangulation, p: ArrayLike<number>, u: number, w: number, f: number): boolean {
  const [c0, c1, c2] = triang.triangles[f];
  const ou = 3 * u, ow = 3 * w, o0 = 3 * c0, o1 = 3 * c1, o2 = 3 * c2;
  return segmentTriangleIntersect(
    p[ou], p[ou + 1], p[ou + 2], p[ow], p[ow + 1], p[ow + 2],
    p[o0], p[o0 + 1], p[o0 + 2], p[o1], p[o1 + 1], p[o1 + 2], p[o2], p[o2 + 1], p[o2 + 2],
  );
}

// ─── the gate (the topological truth) ────────────────────────────────────────

export type EmbeddingViolation = {
  /** 'tri-tri' = disjoint pair's interiors cross; 'edge-tri' = vertex-shared pair's edge pierces the other. */
  readonly kind: 'tri-tri' | 'edge-tri';
  readonly t1: number;
  readonly t2: number;
};

/** The realization is embedded iff no two triangle interiors cross. */
export function isEmbedded(triang: Triangulation, positions: ArrayLike<number>): boolean {
  return firstViolation(triang, positions) === null;
}

/** The first crossing found, or null if embedded. */
export function firstViolation(triang: Triangulation, positions: ArrayLike<number>): EmbeddingViolation | null {
  const { disjointTrianglePairs, sharedVertexTrianglePairs } = cellTables(triang);
  for (const [t1, t2] of disjointTrianglePairs) {
    if (faceFaceIntersect(triang, positions, t1, t2)) return { kind: 'tri-tri', t1, t2 };
  }
  for (const pair of sharedVertexTrianglePairs) {
    if (edgeFaceIntersect(triang, positions, pair.aOpp[0], pair.aOpp[1], pair.b)
      || edgeFaceIntersect(triang, positions, pair.bOpp[0], pair.bOpp[1], pair.a)) {
      return { kind: 'edge-tri', t1: pair.a, t2: pair.b };
    }
  }
  return null;
}

/** Every crossing (for diagnostics / painting). */
export function allViolations(triang: Triangulation, positions: ArrayLike<number>): EmbeddingViolation[] {
  const { disjointTrianglePairs, sharedVertexTrianglePairs } = cellTables(triang);
  const out: EmbeddingViolation[] = [];
  for (const [t1, t2] of disjointTrianglePairs) {
    if (faceFaceIntersect(triang, positions, t1, t2)) out.push({ kind: 'tri-tri', t1, t2 });
  }
  for (const pair of sharedVertexTrianglePairs) {
    const hit = edgeFaceIntersect(triang, positions, pair.aOpp[0], pair.aOpp[1], pair.b)
      || edgeFaceIntersect(triang, positions, pair.bOpp[0], pair.bOpp[1], pair.a);
    if (hit) out.push({ kind: 'edge-tri', t1: pair.a, t2: pair.b });
  }
  return out;
}

/** Per-face scalar: 1 on triangles involved in any violation, 0 elsewhere (for painting). */
export function violationFaceScalars(triang: Triangulation, positions: ArrayLike<number>, out?: Float32Array): Float32Array {
  const r = out ?? new Float32Array(triang.triangles.length);
  r.fill(0);
  for (const v of allViolations(triang, positions)) { r[v.t1] = 1; r[v.t2] = 1; }
  return r;
}

// ─── clearance (the gate's continuous companion; Rich's condition, made continuous) ──

/** Squared distance between faces fa, fb (true closest-feature). */
function faceFaceDist2(triang: Triangulation, p: ArrayLike<number>, fa: number, fb: number): number {
  const [a0, a1, a2] = triang.triangles[fa];
  const [b0, b1, b2] = triang.triangles[fb];
  const A0 = 3 * a0, A1 = 3 * a1, A2 = 3 * a2, B0 = 3 * b0, B1 = 3 * b1, B2 = 3 * b2;
  return triangleTriangleDist2(
    p[A0], p[A0 + 1], p[A0 + 2], p[A1], p[A1 + 1], p[A1 + 2], p[A2], p[A2 + 1], p[A2 + 2],
    p[B0], p[B0 + 1], p[B0 + 2], p[B1], p[B1 + 1], p[B1 + 2], p[B2], p[B2 + 1], p[B2 + 2],
  );
}

/** Squared distance from edge (u,w) to face f (true closest-feature). */
function edgeFaceDist2(triang: Triangulation, p: ArrayLike<number>, u: number, w: number, f: number): number {
  const [c0, c1, c2] = triang.triangles[f];
  const ou = 3 * u, ow = 3 * w, o0 = 3 * c0, o1 = 3 * c1, o2 = 3 * c2;
  return segmentTriangleDist2(
    p[ou], p[ou + 1], p[ou + 2], p[ow], p[ow + 1], p[ow + 2],
    p[o0], p[o0 + 1], p[o0 + 2], p[o1], p[o1 + 1], p[o1 + 2], p[o2], p[o2 + 1], p[o2 + 2],
  );
}

/**
 * Clearance = (min true distance to a crossing, over exactly the pairs the gate
 * tests) / √area. The continuous form of `isEmbedded`: 0 on ∂Ω, positive inside Ω.
 * For an embedded torus it is the certified geometric room before self-contact.
 */
export function clearance(triang: Triangulation, p: ArrayLike<number>): number {
  const { disjointTrianglePairs, sharedVertexTrianglePairs } = cellTables(triang);
  let min2 = Infinity;
  // disjoint faces — face↔face gap (the gate's tri-tri test)
  for (const [t1, t2] of disjointTrianglePairs) {
    const d2 = faceFaceDist2(triang, p, t1, t2);
    if (d2 < min2) min2 = d2;
  }
  // shared-vertex pairs — each non-shared edge vs the other face (the gate's edge-tri test)
  for (const pair of sharedVertexTrianglePairs) {
    const dA = edgeFaceDist2(triang, p, pair.aOpp[0], pair.aOpp[1], pair.b);
    const dB = edgeFaceDist2(triang, p, pair.bOpp[0], pair.bOpp[1], pair.a);
    if (dA < min2) min2 = dA;
    if (dB < min2) min2 = dB;
  }
  return Math.sqrt(min2) / linearSize(triang, p);
}
