/**
 * The embedding margin — "how close does the surface come to touching itself?" The
 * shared cell-gap primitive `forEachCellGap` (every non-adjacent cell pair's 3D gap,
 * normalized by √area so it is scale-free), reduced two ways:
 *
 *   minMargin = MIN over the gaps   — the diagnostic (certificate + Region margin)
 *   an energy = Σ penalty(gap)      — the fattening energy (see energies.ts)
 *
 * The six pair types are written ONCE here. `minMargin` is NOT the embeddedness
 * gate — the geometric gap and the topological `isEmbedded` disagree at the
 * boundary (a config can have margin > 0 yet self-cross). The gate is `gate.ts`.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../../topology/triangulation.ts';
import { totalArea } from '../../topology/develop.ts';
import {
  pointPointDist2, pointSegmentDist2, pointTriangleDist2, triangleTriangleDist2,
} from '../../geometry/distance.ts';

/** Linear size of the torus, L = √(total area) — the normalizing length. */
export function linearSize(triang: Triangulation, p: ArrayLike<number>): number {
  return Math.sqrt(totalArea(triang, p));
}

export type GapType = 'vv' | 've' | 'vf' | 'ee' | 'ef' | 'ff';

// --- per-pair-type Euclidean gaps (normalization happens in forEachCellGap) ---

function vv(p: ArrayLike<number>, i: number, j: number): number {
  const oi = 3 * i, oj = 3 * j;
  return Math.sqrt(pointPointDist2(p[oi], p[oi + 1], p[oi + 2], p[oj], p[oj + 1], p[oj + 2]));
}

function ve(triang: Triangulation, p: ArrayLike<number>, v: number, e: number): number {
  const ov = 3 * v;
  const [a, b] = triang.edges[e];
  const oa = 3 * a, ob = 3 * b;
  return Math.sqrt(pointSegmentDist2(
    p[ov], p[ov + 1], p[ov + 2],
    p[oa], p[oa + 1], p[oa + 2], p[ob], p[ob + 1], p[ob + 2],
  ));
}

function vf(triang: Triangulation, p: ArrayLike<number>, v: number, f: number): number {
  const ov = 3 * v;
  const [a, b, c] = triang.triangles[f];
  const oa = 3 * a, ob = 3 * b, oc = 3 * c;
  return Math.sqrt(pointTriangleDist2(
    p[ov], p[ov + 1], p[ov + 2],
    p[oa], p[oa + 1], p[oa + 2], p[ob], p[ob + 1], p[ob + 2], p[oc], p[oc + 1], p[oc + 2],
  ));
}

/** Edge–edge: midpoint of each edge to the other segment (two gaps). */
function ee(triang: Triangulation, p: ArrayLike<number>, e1: number, e2: number): [number, number] {
  const [a1, b1] = triang.edges[e1];
  const [a2, b2] = triang.edges[e2];
  const oa1 = 3 * a1, ob1 = 3 * b1, oa2 = 3 * a2, ob2 = 3 * b2;
  const m1x = 0.5 * (p[oa1] + p[ob1]), m1y = 0.5 * (p[oa1 + 1] + p[ob1 + 1]), m1z = 0.5 * (p[oa1 + 2] + p[ob1 + 2]);
  const m2x = 0.5 * (p[oa2] + p[ob2]), m2y = 0.5 * (p[oa2 + 1] + p[ob2 + 1]), m2z = 0.5 * (p[oa2 + 2] + p[ob2 + 2]);
  const d1 = Math.sqrt(pointSegmentDist2(m1x, m1y, m1z, p[oa2], p[oa2 + 1], p[oa2 + 2], p[ob2], p[ob2 + 1], p[ob2 + 2]));
  const d2 = Math.sqrt(pointSegmentDist2(m2x, m2y, m2z, p[oa1], p[oa1 + 1], p[oa1 + 2], p[ob1], p[ob1 + 1], p[ob1 + 2]));
  return [d1, d2];
}

function ef(triang: Triangulation, p: ArrayLike<number>, e: number, f: number): number {
  const [a, b] = triang.edges[e];
  const oa = 3 * a, ob = 3 * b;
  const mx = 0.5 * (p[oa] + p[ob]), my = 0.5 * (p[oa + 1] + p[ob + 1]), mz = 0.5 * (p[oa + 2] + p[ob + 2]);
  const [c0, c1, c2] = triang.triangles[f];
  const o0 = 3 * c0, o1 = 3 * c1, o2 = 3 * c2;
  return Math.sqrt(pointTriangleDist2(
    mx, my, mz,
    p[o0], p[o0 + 1], p[o0 + 2], p[o1], p[o1 + 1], p[o1 + 2], p[o2], p[o2 + 1], p[o2 + 2],
  ));
}

function ff(triang: Triangulation, p: ArrayLike<number>, fa: number, fb: number): number {
  const [a0, a1, a2] = triang.triangles[fa];
  const [b0, b1, b2] = triang.triangles[fb];
  const A0 = 3 * a0, A1 = 3 * a1, A2 = 3 * a2;
  const B0 = 3 * b0, B1 = 3 * b1, B2 = 3 * b2;
  return Math.sqrt(triangleTriangleDist2(
    p[A0], p[A0 + 1], p[A0 + 2], p[A1], p[A1 + 1], p[A1 + 2], p[A2], p[A2 + 1], p[A2 + 2],
    p[B0], p[B0 + 1], p[B0 + 2], p[B1], p[B1 + 1], p[B1 + 2], p[B2], p[B2 + 1], p[B2 + 2],
  ));
}

/**
 * Visit the normalized gap d̃ = d/√area of every non-adjacent cell pair. Six pair
 * types in order; edge–edge yields two gaps (one per midpoint). Allocation-free.
 */
export function forEachCellGap(
  triang: Triangulation,
  p: ArrayLike<number>,
  visit: (gap: number, type: GapType, a: number, b: number) => void,
): void {
  const invL = 1 / linearSize(triang, p);
  const { vertexVertex, vertexEdge, vertexFace, edgeEdge, edgeFace, faceFace } = triang.cellPairs;
  for (const [i, j] of vertexVertex) visit(vv(p, i, j) * invL, 'vv', i, j);
  for (const [v, e] of vertexEdge) visit(ve(triang, p, v, e) * invL, 've', v, e);
  for (const [v, f] of vertexFace) visit(vf(triang, p, v, f) * invL, 'vf', v, f);
  for (const [e1, e2] of edgeEdge) {
    const [d1, d2] = ee(triang, p, e1, e2);
    visit(d1 * invL, 'ee', e1, e2);
    visit(d2 * invL, 'ee', e1, e2);
  }
  for (const [e, f] of edgeFace) visit(ef(triang, p, e, f) * invL, 'ef', e, f);
  for (const [fa, fb] of faceFace) visit(ff(triang, p, fa, fb) * invL, 'ff', fa, fb);
}

export type MarginReport = {
  /** Smallest normalized gap d̃ = d/√area over all penalized pairs. */
  margin: number;
  /** Which pair type realizes it. */
  type: GapType;
  /** The two cell indices (meaning depends on type). */
  cells: [number, number];
};

/** The minimum normalized gap and which pair achieves it. Pure geometry. */
export function minMargin(triang: Triangulation, p: ArrayLike<number>): MarginReport {
  let best: MarginReport = { margin: Infinity, type: 'vv', cells: [-1, -1] };
  forEachCellGap(triang, p, (gap, type, a, b) => {
    if (gap < best.margin) best = { margin: gap, type, cells: [a, b] };
  });
  return best;
}
