/**
 * Energy: cell-margin (near-miss repulsion).
 *
 * Penalizes non-adjacent cells of the PL torus that come closer than ε, to
 * push a barely-embedded surface toward a fatter, more robustly embedded one.
 * For each penalized pair we form a distance d, normalize it by the torus's
 * linear size L = √(total area) so the energy is scale-free, and feed d̃ = d/L
 * through a truncated-linear hinge:
 *
 *     φ(d̃) = c · max(0, (ε − d̃)/ε)
 *
 * so φ = c when cells touch (d̃ = 0), decreases linearly, and is 0 once
 * d̃ ≥ ε. The total energy E = Σ φ over all pairs is 0 exactly when every
 * non-adjacent pair is ≥ ε apart (in units of L) — "embedded with margin ε."
 *
 * SCALE-INVARIANCE. d and L both scale linearly with a uniform inflation of
 * the mesh, so E is invariant under scaling. By Euler's identity a degree-0
 * homogeneous energy has gradient ⊥ the inflation direction, so the descent
 * flow has no component that simply grows the mesh to clear ε — it must change
 * shape. (Hence no per-iteration renormalization is needed.)
 *
 * The six pair types and their metrics (see cellPairs.ts for the tables):
 *   vertex–vertex : point→point
 *   vertex–edge   : point→segment
 *   vertex–face   : point→triangle
 *   edge–edge     : midpoint(A)→segB and midpoint(B)→segA, both (symmetric)
 *   edge–face     : midpoint(edge)→triangle
 *   face–face     : triangle→triangle (min over vertex-face / edge-edge)
 *
 * Gradient is finite-difference (the hinge kink at d̃ = ε and the argmin
 * switches in the distance routines are fine for central differences).
 */

import { TRIANGLES, EDGES } from '../topology';
import {
  VERTEX_VERTEX_PAIRS, VERTEX_EDGE_PAIRS, VERTEX_FACE_PAIRS,
  EDGE_EDGE_PAIRS, EDGE_FACE_PAIRS, FACE_FACE_PAIRS,
} from '../cellPairs';
import {
  pointPointDist2, pointSegmentDist2, pointTriangleDist2, triangleTriangleDist2,
} from '../distance';
import { fdGradient } from './finiteDiffGradient';
import type { RepulsionEnergy } from './types';

export const DEFAULT_EPSILON = 0.1; // margin target, in units of √(total area)
export const DEFAULT_WEIGHT = 1;    // per-pair penalty height c

/** Total surface area Σ ½‖(b−a)×(c−a)‖ over the 16 triangles. */
export function totalArea(p: ArrayLike<number>): number {
  let area = 0;
  for (const [a, b, c] of TRIANGLES) {
    const oa = 3 * a, ob = 3 * b, oc = 3 * c;
    const e1x = p[ob] - p[oa], e1y = p[ob + 1] - p[oa + 1], e1z = p[ob + 2] - p[oa + 2];
    const e2x = p[oc] - p[oa], e2y = p[oc + 1] - p[oa + 1], e2z = p[oc + 2] - p[oa + 2];
    const cx = e1y * e2z - e1z * e2y;
    const cy = e1z * e2x - e1x * e2z;
    const cz = e1x * e2y - e1y * e2x;
    area += 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
  }
  return area;
}

/** Linear size of the torus: √(total area). The normalizing length L. */
export function linearSize(p: ArrayLike<number>): number {
  return Math.sqrt(totalArea(p));
}

// --- per-pair-type distance accessors (return true Euclidean distance) ---

function vv(p: ArrayLike<number>, i: number, j: number): number {
  const oi = 3 * i, oj = 3 * j;
  return Math.sqrt(pointPointDist2(p[oi], p[oi + 1], p[oi + 2], p[oj], p[oj + 1], p[oj + 2]));
}

function ve(p: ArrayLike<number>, v: number, e: number): number {
  const ov = 3 * v;
  const [a, b] = EDGES[e];
  const oa = 3 * a, ob = 3 * b;
  return Math.sqrt(pointSegmentDist2(
    p[ov], p[ov + 1], p[ov + 2],
    p[oa], p[oa + 1], p[oa + 2], p[ob], p[ob + 1], p[ob + 2],
  ));
}

function vf(p: ArrayLike<number>, v: number, f: number): number {
  const ov = 3 * v;
  const [a, b, c] = TRIANGLES[f];
  const oa = 3 * a, ob = 3 * b, oc = 3 * c;
  return Math.sqrt(pointTriangleDist2(
    p[ov], p[ov + 1], p[ov + 2],
    p[oa], p[oa + 1], p[oa + 2], p[ob], p[ob + 1], p[ob + 2], p[oc], p[oc + 1], p[oc + 2],
  ));
}

/** Edge–edge is two measurements: midpoint of each edge to the other segment. */
function ee(p: ArrayLike<number>, e1: number, e2: number): [number, number] {
  const [a1, b1] = EDGES[e1];
  const [a2, b2] = EDGES[e2];
  const oa1 = 3 * a1, ob1 = 3 * b1, oa2 = 3 * a2, ob2 = 3 * b2;
  const m1x = 0.5 * (p[oa1] + p[ob1]), m1y = 0.5 * (p[oa1 + 1] + p[ob1 + 1]), m1z = 0.5 * (p[oa1 + 2] + p[ob1 + 2]);
  const m2x = 0.5 * (p[oa2] + p[ob2]), m2y = 0.5 * (p[oa2 + 1] + p[ob2 + 1]), m2z = 0.5 * (p[oa2 + 2] + p[ob2 + 2]);
  const d1 = Math.sqrt(pointSegmentDist2(m1x, m1y, m1z, p[oa2], p[oa2 + 1], p[oa2 + 2], p[ob2], p[ob2 + 1], p[ob2 + 2]));
  const d2 = Math.sqrt(pointSegmentDist2(m2x, m2y, m2z, p[oa1], p[oa1 + 1], p[oa1 + 2], p[ob1], p[ob1 + 1], p[ob1 + 2]));
  return [d1, d2];
}

function ef(p: ArrayLike<number>, e: number, f: number): number {
  const [a, b] = EDGES[e];
  const oa = 3 * a, ob = 3 * b;
  const mx = 0.5 * (p[oa] + p[ob]), my = 0.5 * (p[oa + 1] + p[ob + 1]), mz = 0.5 * (p[oa + 2] + p[ob + 2]);
  const [c0, c1, c2] = TRIANGLES[f];
  const o0 = 3 * c0, o1 = 3 * c1, o2 = 3 * c2;
  return Math.sqrt(pointTriangleDist2(
    mx, my, mz,
    p[o0], p[o0 + 1], p[o0 + 2], p[o1], p[o1 + 1], p[o1 + 2], p[o2], p[o2 + 1], p[o2 + 2],
  ));
}

function ff(p: ArrayLike<number>, fa: number, fb: number): number {
  const [a0, a1, a2] = TRIANGLES[fa];
  const [b0, b1, b2] = TRIANGLES[fb];
  const A0 = 3 * a0, A1 = 3 * a1, A2 = 3 * a2;
  const B0 = 3 * b0, B1 = 3 * b1, B2 = 3 * b2;
  return Math.sqrt(triangleTriangleDist2(
    p[A0], p[A0 + 1], p[A0 + 2], p[A1], p[A1 + 1], p[A1 + 2], p[A2], p[A2 + 1], p[A2 + 2],
    p[B0], p[B0 + 1], p[B0 + 2], p[B1], p[B1 + 1], p[B1 + 2], p[B2], p[B2 + 1], p[B2 + 2],
  ));
}

export interface CellMarginOptions {
  epsilon?: number;
  weight?: number;
}

export function makeCellMargin(opts: CellMarginOptions = {}): RepulsionEnergy {
  const eps = opts.epsilon ?? DEFAULT_EPSILON;
  const weight = opts.weight ?? DEFAULT_WEIGHT;
  const invEps = 1 / eps;

  // hinge on the NORMALIZED distance d̃; d̃ ≥ 0 always (unsigned distance).
  const hinge = (dt: number) => (dt >= eps ? 0 : weight * (1 - dt * invEps));

  function compute(p: ArrayLike<number>): number {
    const invL = 1 / linearSize(p);
    let E = 0;
    for (const [i, j] of VERTEX_VERTEX_PAIRS) E += hinge(vv(p, i, j) * invL);
    for (const [v, e] of VERTEX_EDGE_PAIRS) E += hinge(ve(p, v, e) * invL);
    for (const [v, f] of VERTEX_FACE_PAIRS) E += hinge(vf(p, v, f) * invL);
    for (const [e1, e2] of EDGE_EDGE_PAIRS) {
      const [d1, d2] = ee(p, e1, e2);
      E += hinge(d1 * invL) + hinge(d2 * invL);
    }
    for (const [e, f] of EDGE_FACE_PAIRS) E += hinge(ef(p, e, f) * invL);
    for (const [fa, fb] of FACE_FACE_PAIRS) E += hinge(ff(p, fa, fb) * invL);
    return E;
  }

  return {
    label: `cell-margin (ε=${eps}, c=${weight}, L=√area)`,
    compute,
    gradient(positions, out) {
      fdGradient(compute, positions, out);
    },
  };
}

/** Default cell-margin energy with ε = 0.1, c = 1. */
export const CELL_MARGIN: RepulsionEnergy = makeCellMargin();

export type MarginReport = {
  /** Smallest normalized gap d̃ = d/√area over all penalized pairs. */
  margin: number;
  /** Which pair type realizes it. */
  type: 'vv' | 've' | 'vf' | 'ee' | 'ef' | 'ff';
  /** The two cell indices (meaning depends on type; see cellPairs.ts). */
  cells: [number, number];
};

/**
 * Diagnostic: the minimum normalized gap and which pair achieves it.
 * Independent of ε/weight — pure geometry. A margin ≥ ε means E = 0.
 */
export function minMargin(p: ArrayLike<number>): MarginReport {
  const invL = 1 / linearSize(p);
  let best: MarginReport = { margin: Infinity, type: 'vv', cells: [-1, -1] };
  const consider = (d: number, type: MarginReport['type'], a: number, b: number) => {
    const dt = d * invL;
    if (dt < best.margin) best = { margin: dt, type, cells: [a, b] };
  };
  for (const [i, j] of VERTEX_VERTEX_PAIRS) consider(vv(p, i, j), 'vv', i, j);
  for (const [v, e] of VERTEX_EDGE_PAIRS) consider(ve(p, v, e), 've', v, e);
  for (const [v, f] of VERTEX_FACE_PAIRS) consider(vf(p, v, f), 'vf', v, f);
  for (const [e1, e2] of EDGE_EDGE_PAIRS) {
    const [d1, d2] = ee(p, e1, e2);
    consider(Math.min(d1, d2), 'ee', e1, e2);
  }
  for (const [e, f] of EDGE_FACE_PAIRS) consider(ef(p, e, f), 'ef', e, f);
  for (const [fa, fb] of FACE_FACE_PAIRS) consider(ff(p, fa, fb), 'ff', fa, fb);
  return best;
}
