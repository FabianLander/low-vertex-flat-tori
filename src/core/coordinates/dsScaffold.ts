/**
 * dsScaffold — the Doyle–Schwartz tent scaffold as a coordinate system: a 10-dimensional
 * `ConfigSpace` for the type-7 (Rich) torus whose configurations are, by construction, two
 * coplanar pinned–free segments (each split at its midpoint) plus two tent-pole vertices
 * lifted out of the z = 0 plane. It is a strict generalization of `sampling/doyleSchwartz`'s
 * closed form — the same combinatorial scaffold, with the ρ-symmetry and the specific
 * modulus dropped — so the whole DS family is the ρ-symmetric slice of this space.
 *
 * The roles map to the DS vertex labels of `v8-7` (override via `roles`):
 *   poles  [0, 7]                              — apex vertices, free in ℝ³
 *   seg 1  {pin: 1, mid: 2, free: 3}           — A = v1 pinned (0,0,0), C = v3 free, E = v2 = ½(A+C)
 *   seg 2  {pin: 4, mid: 5, free: 6}           — B = v4 pinned (1,0,0), D = v6 free, F = v5 = ½(B+D)
 *
 * Parameters θ = [c_x, c_y, d_x, d_y, g_x, g_y, g_z, h_x, h_y, h_z] (the free vertices C, D
 * and the two poles G, H). φ is AFFINE: the pins, the z = 0 plane, and the midpoints are
 * baked in, so the gauge is fully fixed inside the model (only the discrete z ↦ −z survives)
 * — do NOT compose this with `normalized`. Flatness emits 7 rows, so the flat locus is
 * generically 3-dimensional. `coords` reads C, D, G, H straight off an ambient config (an
 * exact left-inverse on the image), which is what makes perturbation in θ stay in-model.
 *
 * Full write-up (math + triangulation choice + figure): docs/ds-scaffold.md.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import type { Fn } from '@core/functions/types.ts';
import { makeConfigSpace, type ConfigSpace } from '@core/configuration/space.ts';

/** One segment's three vertices: a pinned endpoint, the midpoint, and the free endpoint. */
export interface SegmentRoles {
  readonly pin: number;
  readonly mid: number;
  readonly free: number;
}

/** Which vertex plays which role. Defaults to the DS labels of `v8-7`. */
export interface ScaffoldRoles {
  readonly poles: readonly [number, number];
  readonly seg1: SegmentRoles;
  readonly seg2: SegmentRoles;
}

/** The Doyle–Schwartz role assignment on `v8-7` (see docs/ds-scaffold.md). */
export const DS_ROLES: ScaffoldRoles = {
  poles: [0, 7],
  seg1: { pin: 1, mid: 2, free: 3 },
  seg2: { pin: 4, mid: 5, free: 6 },
};

// θ layout (inDim = 10).
const CX = 0, CY = 1, DX = 2, DY = 3, GX = 4, GY = 5, GZ = 6, HX = 7, HY = 8, HZ = 9;
const DIM = 10;

/**
 * The tent-scaffold configuration space of `triang` (8 vertices). φ : ℝ¹⁰ → ℝ²⁴ places the
 * two pinned vertices at (0,0,0) and (1,0,0), the two free vertices and two midpoints in the
 * z = 0 plane (midpoint = ½(pin + free)), and the two poles free in ℝ³.
 */
export function dsScaffold(triang: Triangulation, roles: ScaffoldRoles = DS_ROLES): ConfigSpace {
  if (triang.vertexCount !== 8) {
    throw new Error(`dsScaffold: needs an 8-vertex triangulation, got ${triang.vertexCount} (${triang.name})`);
  }
  const ambient = triang.vertexCount * 3;
  const [g0, g1] = roles.poles;
  const { pin: a1, mid: e1, free: c1 } = roles.seg1;
  const { pin: a2, mid: e2, free: c2 } = roles.seg2;

  const phi: Fn = {
    label: 'dsScaffold(10)',
    inDim: DIM,
    outDim: ambient,
    value(x, out) {
      out.fill(0);
      // pinned endpoints
      out[3 * a1] = 0; out[3 * a1 + 1] = 0;            // A = (0,0,0)
      out[3 * a2] = 1; out[3 * a2 + 1] = 0;            // B = (1,0,0)
      // free endpoints (z = 0)
      out[3 * c1] = x[CX]; out[3 * c1 + 1] = x[CY];    // C
      out[3 * c2] = x[DX]; out[3 * c2 + 1] = x[DY];    // D
      // midpoints E = ½(A+C), F = ½(B+D)  (z = 0)
      out[3 * e1] = 0.5 * x[CX];        out[3 * e1 + 1] = 0.5 * x[CY];
      out[3 * e2] = 0.5 * (1 + x[DX]);  out[3 * e2 + 1] = 0.5 * x[DY];
      // tent poles (free in ℝ³)
      out[3 * g0] = x[GX]; out[3 * g0 + 1] = x[GY]; out[3 * g0 + 2] = x[GZ];
      out[3 * g1] = x[HX]; out[3 * g1 + 1] = x[HY]; out[3 * g1 + 2] = x[HZ];
    },
    jacobian(_x, out) {
      out.fill(0);                                     // ambient×DIM, row-major (stride DIM)
      const set = (row: number, col: number, v: number) => { out[row * DIM + col] = v; };
      set(3 * c1, CX, 1);     set(3 * c1 + 1, CY, 1);
      set(3 * c2, DX, 1);     set(3 * c2 + 1, DY, 1);
      set(3 * e1, CX, 0.5);   set(3 * e1 + 1, CY, 0.5);
      set(3 * e2, DX, 0.5);   set(3 * e2 + 1, DY, 0.5);
      set(3 * g0, GX, 1);     set(3 * g0 + 1, GY, 1);  set(3 * g0 + 2, GZ, 1);
      set(3 * g1, HX, 1);     set(3 * g1 + 1, HY, 1);  set(3 * g1 + 2, HZ, 1);
    },
  };

  // coords: read the free vertices and poles straight off an ambient config — the pins,
  // midpoints, and z = 0 slots are redundant. Exact left-inverse on φ's image.
  return makeConfigSpace(triang, phi, (p, outX) => {
    outX[CX] = p[3 * c1]; outX[CY] = p[3 * c1 + 1];
    outX[DX] = p[3 * c2]; outX[DY] = p[3 * c2 + 1];
    outX[GX] = p[3 * g0]; outX[GY] = p[3 * g0 + 1]; outX[GZ] = p[3 * g0 + 2];
    outX[HX] = p[3 * g1]; outX[HY] = p[3 * g1 + 1]; outX[HZ] = p[3 * g1 + 2];
  });
}
