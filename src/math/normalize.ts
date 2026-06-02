/**
 * Canonical pose for an 8-vertex torus under the similarity group of ℝ³
 * (translation ⊕ rotation ⊕ uniform scale = 7 continuous degrees of freedom).
 *
 * THE CONVENTION (fixed once, used everywhere):
 *   1. Translate so vertex 0 sits at the origin.
 *   2. Rotate + uniformly scale so vertex 1 sits at (1, 0, 0)
 *      (scale = 1/|v1−v0|, then rotate that direction onto +x).
 *   3. Rotate about the x-axis so vertex 2 lies in the xy-plane (z₂ = 0),
 *      choosing the half-turn that puts it on the +y side (y₂ ≥ 0).
 *
 * After this the three ANCHOR vertices are pinned:
 *   v0 = (0,0,0),  v1 = (1,0,0),  v2 = (x₂, y₂, 0) with y₂ ≥ 0,
 * which removes exactly the 7 similarity DOF (3 translation + 3 rotation +
 * 1 scale). The free data is therefore 24 − 7 = 17 numbers:
 *   [ x₂, y₂,  v3(3), v4(3), v5(3), v6(3), v7(3) ].
 *
 * Only PROPER rotations are used (e3 = e1 × e2 is right-handed), so the discrete
 * reflection / chirality is preserved, not quotiented — a reflected torus stays
 * reflected. (Reflection is a Z/2, not a continuous DOF, so it does not change
 * the count of 17.)
 *
 * Pure module: no three.js, no DOM.
 */

import { VERTEX_COUNT } from './topology';

const N = VERTEX_COUNT * 3;          // 24
export const FULL_DIM = N;           // 24
export const REDUCED_DIM = N - 7;    // 17
/** The vertices whose positions are pinned by the convention. */
export const ANCHOR_VERTICES = [0, 1, 2] as const;

type Vec3 = [number, number, number];

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
/** Vertex i minus origin o, from a flat 24-array. */
const minus = (p: ArrayLike<number>, i: number, o: Vec3): Vec3 =>
  [p[3 * i] - o[0], p[3 * i + 1] - o[1], p[3 * i + 2] - o[2]];

/**
 * Map an embedding (24 floats) to its canonical pose (24 floats) per the
 * convention above. Invariant under any prior translation/rotation/scale of the
 * input, and idempotent: normalize(normalize(p)) = normalize(p).
 */
export function normalize(p: ArrayLike<number>): Float64Array {
  if (p.length !== N) throw new Error(`normalize: expected ${N} coords, got ${p.length}`);

  const o: Vec3 = [p[0], p[1], p[2]];            // v0 → origin
  const a = minus(p, 1, o);                       // v1 − v0
  const la = Math.hypot(a[0], a[1], a[2]);
  if (la < 1e-12) throw new Error('normalize: v0 and v1 coincide (cannot fix the x-axis)');
  const s = 1 / la;
  const e1: Vec3 = [a[0] * s, a[1] * s, a[2] * s];

  const b = minus(p, 2, o);                       // v2 − v0
  const bE1 = dot(b, e1);
  const bPerp: Vec3 = [b[0] - bE1 * e1[0], b[1] - bE1 * e1[1], b[2] - bE1 * e1[2]];
  const lp = Math.hypot(bPerp[0], bPerp[1], bPerp[2]);
  if (lp < 1e-12) throw new Error('normalize: v0, v1, v2 are collinear (cannot fix the xy-plane)');
  const e2: Vec3 = [bPerp[0] / lp, bPerp[1] / lp, bPerp[2] / lp];
  const e3 = cross(e1, e2);                       // unit, right-handed

  const out = new Float64Array(N);
  for (let i = 0; i < VERTEX_COUNT; i++) {
    const d = minus(p, i, o);
    out[3 * i]     = s * dot(d, e1);
    out[3 * i + 1] = s * dot(d, e2);
    out[3 * i + 2] = s * dot(d, e3);
  }
  // Pin the values the convention fixes exactly (remove floating-point dust).
  out[0] = 0; out[1] = 0; out[2] = 0;             // v0 = (0,0,0)
  out[3] = 1; out[4] = 0; out[5] = 0;             // v1 = (1,0,0)
  out[8] = 0;                                      // v2.z = 0
  return out;
}

/** Canonical pose → the 17 free coordinates [x₂,y₂, v3,v4,v5,v6,v7]. */
export function toReduced(p: ArrayLike<number>): Float64Array {
  const c = normalize(p);
  const r = new Float64Array(REDUCED_DIM);
  r[0] = c[6]; r[1] = c[7];                        // v2 = (x₂, y₂, 0)
  for (let i = 0; i < 15; i++) r[2 + i] = c[9 + i]; // v3..v7
  return r;
}

/** 17 free coordinates → the full 24-coordinate canonical embedding. */
export function fromReduced(r: ArrayLike<number>): Float64Array {
  if (r.length !== REDUCED_DIM) throw new Error(`fromReduced: expected ${REDUCED_DIM} coords, got ${r.length}`);
  const c = new Float64Array(N);
  c[3] = 1;                                         // v0=(0,0,0) implicit; v1=(1,0,0)
  c[6] = r[0]; c[7] = r[1];                         // v2 = (x₂, y₂, 0)
  for (let i = 0; i < 15; i++) c[9 + i] = r[2 + i]; // v3..v7
  return c;
}
