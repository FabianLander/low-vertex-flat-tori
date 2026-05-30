/**
 * Rich Schwartz's canonical 8-vertex flat-torus embedding in R³.
 *
 * Decimal coordinates from
 *   rich/VertexMinimalPaper/8Vertex/mathematica_plotter (lines 7–16).
 *
 * The construction has a manifest Z/2 symmetry: 180° rotation about the z-axis
 * pairs vertices (0,7), (1,6), (2,5), (3,4) (x,y negated; z fixed).
 * Source: rich/VertexMinimalPaper/8Vertex/flatness_test (lines 17–19).
 */

import { PaperTorus, type Vec3 } from './embedding';

const RICH_COORDS: readonly Vec3[] = [
  [ 0.64, -0.20, 1.0],
  [-1.09,  0.38, 0.0206663266698444],
  [-0.25,  0.51, 0.0048531277065193],
  [ 0.78,  0.62, 0.0082275214556137],
  [-0.78, -0.62, 0.0082275214556137],
  [ 0.25, -0.51, 0.0048531277065193],
  [ 1.09, -0.38, 0.0206663266698444],
  [-0.64,  0.20, 1.0],
];

export const RICH_REFERENCE: PaperTorus = PaperTorus.fromVec3s(RICH_COORDS);

export const SYMMETRY_PAIRING: readonly (readonly [number, number])[] = [
  [0, 7], [1, 6], [2, 5], [3, 4],
];

/**
 * Project a torus onto its Z/2-symmetric subspace in place by averaging each
 * paired vertex against R_z(π) of its partner. After this call, the embedding
 * is exactly Z/2-invariant.
 */
export function applyZ2(t: PaperTorus): void {
  for (const [a, b] of SYMMETRY_PAIRING) {
    const oa = 3 * a;
    const ob = 3 * b;
    const ax = t.positions[oa], ay = t.positions[oa + 1], az = t.positions[oa + 2];
    const bx = t.positions[ob], by = t.positions[ob + 1], bz = t.positions[ob + 2];
    const nax = 0.5 * (ax - bx);
    const nay = 0.5 * (ay - by);
    const naz = 0.5 * (az + bz);
    t.positions[oa] = nax;
    t.positions[oa + 1] = nay;
    t.positions[oa + 2] = naz;
    t.positions[ob] = -nax;
    t.positions[ob + 1] = -nay;
    t.positions[ob + 2] = naz;
  }
}
