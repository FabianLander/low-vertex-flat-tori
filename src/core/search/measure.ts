/**
 * measure — read the standard invariants off a realization: the one honest record of
 * "what torus is this." Every routine in `search/` ends here, and so does any test or
 * render that wants the facts about a configuration.
 *
 * It is pure VERIFICATION, not a routine's output: a search only *thinks* it converged
 * (its solver reported a small residual), so `measure` re-reads the truth independently —
 * including the quantities the search did NOT target. A `discover` result still records
 * its modulus; a modulus `walk` still records whether it is genuinely flat and embedded.
 * Because of that, `measure` computes the FULL readout always (one develop pass + the
 * cheap predicates — paid once per result, never in a hot loop), so a `Measurement` is
 * self-describing no matter which routine produced it.
 *
 * It records BOTH moduli on purpose:
 *   - `tau`    — the RAW modulus τ ∈ ℍ (Teichmüller; marking-dependent), and
 *   - `tauHat` — the REDUCED modulus τ̂ ∈ ℍ/SL(2,ℤ) (moduli; the SL(2,ℤ) quotient).
 * Keeping both kills the recurring confusion of storing only the reduced point and later
 * mistaking it for the Teichmüller one.
 *
 * Lives in `search/` because it is the lowest layer allowed to import all three condition
 * folders at once — flatness (`constraints/`), embeddedness (`embedding/`), and the
 * modulus (`moduli/`) — which are otherwise sibling, mutually-blind folders.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import { modulus } from '@core/moduli/modulus.ts';
import { reduceModulus } from '@core/moduli/reduce.ts';
import type { Vec2 } from '@core/geometry/vec2.ts';
import { maxConeDeficit } from '@core/constraints/flat.ts';
import { isEmbedded, clearance } from '@core/embedding/index.ts';

export interface Measurement {
  /** Flatness residual: max |2π − θ_v| over vertices. ~0 ⟺ flat. */
  readonly coneDeficit: number;
  /** Topological truth: no two triangle interiors cross. */
  readonly embedded: boolean;
  /** Clearance: gate-aligned distance to the nearest crossing / √area (robustness; 0 on ∂Ω).
   *  Only meaningful when `embedded` — on a crossing config the gate is the truth, not this. */
  readonly clearance: number;
  /** RAW modulus τ ∈ ℍ — Teichmüller, depends on the marking. */
  readonly tau: Vec2;
  /** REDUCED modulus τ̂ — moduli, in the standard fundamental domain. */
  readonly tauHat: Vec2;
  /** Intrinsic total area (= covolume of Λ for a unit-index marking). */
  readonly area: number;
  /** Max holonomy rotation over the cut edges; ~0 confirms the holonomy is a pure
   *  translation — a second, independent flatness witness alongside `coneDeficit`. */
  readonly rotDefect: number;
}

/** The standard readout of a realization (length-3V `positions`). */
export function measure(triang: Triangulation, positions: ArrayLike<number>): Measurement {
  const m = modulus(triang, positions);
  return {
    coneDeficit: maxConeDeficit(triang, positions),
    embedded: isEmbedded(triang, positions),
    clearance: clearance(triang, positions),
    tau: m.tau,
    tauHat: reduceModulus(m.tau),
    area: m.area,
    rotDefect: m.rotDefect,
  };
}
