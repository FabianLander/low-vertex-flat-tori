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

import type { Triangulation } from '../topology/triangulation.ts';
import { modulus, reduceModulus, type V2 } from '../topology/develop.ts';
import { maxConeDeficit } from '../conditions/flat.ts';
import { isEmbedded } from '../conditions/embedded/index.ts';
import { minMargin } from '../conditions/embedded/index.ts';

export interface Certificate {
  /** Flatness residual: max |2π − θ_v| over vertices. ~0 ⟺ flat. */
  readonly coneDeficit: number;
  /** Topological truth: no two triangle interiors cross. */
  readonly embedded: boolean;
  /** Smallest normalized cell gap (diagnostic; NOT the same as `embedded`). */
  readonly margin: number;
  /** RAW modulus τ ∈ ℍ — Teichmüller, depends on the marking. */
  readonly tau: V2;
  /** REDUCED modulus τ̂ — moduli, in the standard fundamental domain. */
  readonly tauHat: V2;
  /** Intrinsic total area (= covolume of Λ for a unit-index marking). */
  readonly area: number;
  /** Max holonomy rotation over the cut edges; ~0 confirms the holonomy is a pure translation (flatness). */
  readonly rotDefect: number;
}

export function certify(torus: Triangulation, positions: ArrayLike<number>): Certificate {
  const m = modulus(torus, positions);
  return {
    coneDeficit: maxConeDeficit(torus, positions),
    embedded: isEmbedded(torus, positions),
    margin: minMargin(torus, positions).margin,
    tau: m.tau,
    tauHat: reduceModulus(m.tau),
    area: m.area,
    rotDefect: m.rotDefect,
  };
}
