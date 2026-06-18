/**
 * normalized — the gauge-fixed coordinate system: a SECTION of the similarity bundle
 * C = ℝ³ⱽ → C/G, where G = translation ⊕ rotation ⊕ scale (the 7-DOF similarity group).
 *
 * The canonical slice pins the three anchor vertices: v0 = (0,0,0); v1 = (1,0,0)
 * (direction + |v0v1| = 1 fix two rotations + scale); v2 = (x₂, y₂, 0) with y₂ ≥ 0 (the
 * last rotation). That kills all 7 similarity DOF, leaving **3V − 7** free coordinates
 * [x₂, y₂, v3, …, v_{V−1}].
 *
 * A coordinate system is a pair of maps; this provides both directions of the bundle:
 *   push   (φ : ℝ^{3V−7} → ℝ³ⱽ)  — write the free coords into the slice. A LINEAR scatter,
 *          so Dφ is a constant orthonormal selection ⟹ the pullback metric is exactly I.
 *   coords (ℝ³ⱽ → ℝ^{3V−7})       — the orbit projection: `normalizePose` (rotate/scale any
 *          config onto the slice), then read the free coords. The retraction / quotient map.
 *
 * This is the realization-side mirror of `moduli/reduce` (the SL(2,ℤ) quotient of ℍ): here
 * the group is the *continuous* similarity group, so C/G is a smooth manifold and the slice
 * is a global, smooth section — no chambers (unlike the moduli orbifold). Only proper
 * rotations are used, so chirality is preserved, not quotiented.
 *
 * Searching in this chart removes the 7-DOF similarity null space: the constraint Jacobian
 * is full-rank, and configs are deduplicated up to similarity. The slice is the half
 * y₂ ≥ 0 (its boundary y₂ = 0 — v0,v1,v2 collinear — is the measure-zero gauge degeneracy).
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import type { Embedding } from '../functions/compose.ts';
import { makeConfigSpace, type ConfigSpace } from '../configuration/space.ts';
import { type Vec3, dot, cross } from '../geometry/vec3.ts';

/** Vertex i minus origin o, from a flat positions array. */
const minus = (p: ArrayLike<number>, i: number, o: Vec3): Vec3 =>
  [p[3 * i] - o[0], p[3 * i + 1] - o[1], p[3 * i + 2] - o[2]];

/**
 * Project a config onto the canonical slice (its orbit representative under the similarity
 * group): translate v0 to the origin, scale + rotate so v1 = (1,0,0), rotate about the
 * x-axis so v2 lies in the xy-plane with y₂ ≥ 0. The bundle projection C → (slice) —
 * invariant under any prior translation/rotation/scale, and idempotent. Vertex count is
 * read from `p` (length 3V), so it is triangulation-agnostic.
 */
export function normalizePose(p: ArrayLike<number>): Float64Array {
  const n = p.length;
  const o: Vec3 = [p[0], p[1], p[2]];                 // v0 → origin
  const a = minus(p, 1, o);                            // v1 − v0
  const la = Math.hypot(a[0], a[1], a[2]);
  if (la < 1e-12) throw new Error('normalizePose: v0 and v1 coincide (cannot fix the x-axis)');
  const s = 1 / la;
  const e1: Vec3 = [a[0] * s, a[1] * s, a[2] * s];
  const b = minus(p, 2, o);                            // v2 − v0
  const bE1 = dot(b, e1);
  const bPerp: Vec3 = [b[0] - bE1 * e1[0], b[1] - bE1 * e1[1], b[2] - bE1 * e1[2]];
  const lp = Math.hypot(bPerp[0], bPerp[1], bPerp[2]);
  if (lp < 1e-12) throw new Error('normalizePose: v0, v1, v2 are collinear (cannot fix the xy-plane)');
  const e2: Vec3 = [bPerp[0] / lp, bPerp[1] / lp, bPerp[2] / lp];
  const e3 = cross(e1, e2);                            // unit, right-handed (proper rotation)
  const out = new Float64Array(n);
  for (let i = 0; i < n / 3; i++) {
    const d = minus(p, i, o);
    out[3 * i]     = s * dot(d, e1);
    out[3 * i + 1] = s * dot(d, e2);
    out[3 * i + 2] = s * dot(d, e3);
  }
  out[0] = 0; out[1] = 0; out[2] = 0;                  // v0 = (0,0,0)
  out[3] = 1; out[4] = 0; out[5] = 0;                  // v1 = (1,0,0)
  out[8] = 0;                                           // v2.z = 0
  return out;
}

/** Free-coord index k → its flat slot in ℝ³ⱽ: [v2.x→6, v2.y→7, then v3..v_{V−1}→9,10,…]. */
const slotOf = (k: number): number => (k === 0 ? 6 : k === 1 ? 7 : 9 + (k - 2));

/**
 * The normalized coordinate system for `triang`: the section of C → C/Sim. Free dim
 * 3V − 7; φ scatters the free coords into the slice (v0=0, v1=(1,0,0), v2.z=0 fixed),
 * `coords` projects onto the slice (`normalizePose`) and reads them back.
 */
export function normalized(triang: Triangulation): ConfigSpace {
  const free = triang.vertexCount * 3 - 7;
  const phi: Embedding = {
    inDim: free,
    outDim: triang.vertexCount * 3,
    value(x, out) {
      out.fill(0);
      out[3] = 1;                                       // v1 = (1,0,0)
      for (let k = 0; k < free; k++) out[slotOf(k)] = x[k];
    },
    jacobian(_x, out) {
      out.fill(0);                                      // (3V) × free, row-major
      for (let k = 0; k < free; k++) out[slotOf(k) * free + k] = 1;
    },
  };
  return makeConfigSpace(triang, phi, (p, outX) => {
    const c = normalizePose(p);
    for (let k = 0; k < free; k++) outX[k] = c[slotOf(k)];
  });
}
