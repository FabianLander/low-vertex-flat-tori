/**
 * certify — turn a configuration into a recorded mathematical fact: the standard
 * measurement of "what torus is this." Every search ends here.
 *
 * It bundles the conditions' measurements into one honest record, computed from a
 * single develop pass plus the cheap predicates. Crucially it records BOTH moduli:
 *   - `tau`    — the RAW modulus τ ∈ ℍ (Teichmüller; marking-dependent), and
 *   - `tauHat` — the REDUCED modulus τ̂ ∈ ℍ/SL(2,ℤ) (moduli; the SL(2,ℤ) quotient).
 * Keeping both kills the recurring confusion of storing only the reduced point and
 * later mistaking it for the Teichmüller one.
 *
 * Pure: no three.js, no DOM. Reuses the existing measurement primitives.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import { modulus } from '@core/moduli/modulus.ts';
import { reduceModulus } from '@core/moduli/reduce.ts';
import type { Vec2 } from '@core/geometry/vec2.ts';
import { maxConeDeficit } from '@core/constraints/flat.ts';
import { isEmbedded, clearance } from '@core/embedding/index.ts';

export interface Certificate {
  /** Flatness residual: max |2π − θ_v| over vertices. ~0 ⟺ flat. */
  readonly coneDeficit: number;
  /** Topological truth: no two triangle interiors cross. */
  readonly embedded: boolean;
  /** Clearance: gate-aligned distance to the nearest crossing / √area (robustness; 0 on ∂Ω). NOT the boolean `embedded`. */
  readonly margin: number;
  /** RAW modulus τ ∈ ℍ — Teichmüller, depends on the marking. */
  readonly tau: Vec2;
  /** REDUCED modulus τ̂ — moduli, in the standard fundamental domain. */
  readonly tauHat: Vec2;
  /** Intrinsic total area (= covolume of Λ for a unit-index marking). */
  readonly area: number;
  /** Max holonomy rotation over the cut edges; ~0 confirms the holonomy is a pure translation (flatness). */
  readonly rotDefect: number;
}

export function certify(triang: Triangulation, positions: ArrayLike<number>): Certificate {
  const m = modulus(triang, positions);
  return {
    coneDeficit: maxConeDeficit(triang, positions),
    embedded: isEmbedded(triang, positions),
    margin: clearance(triang, positions),
    tau: m.tau,
    tauHat: reduceModulus(m.tau),
    area: m.area,
    rotDefect: m.rotDefect,
  };
}
