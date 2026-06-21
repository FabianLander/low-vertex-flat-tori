/**
 * improve — deepen a flat embedded torus: push it further inside the embedded region Ω while
 * staying flat. The mirror of `discover` (discover flows INTO Ω ungated; improve moves WITHIN
 * Ω gated), and the first consumer of `embeddedRegion`.
 *
 *   seed (flat, embedded) → project([flat]) → minimize([flat], barrier, region=embeddedRegion) → measure
 *
 * Hold `flat`, descend the `cellBarrier` energy GATED by the embedded region. The gate is the
 * honest tool here: improve is ABOUT not leaving Ω, and it guarantees embeddedness by
 * construction — a discrete barrier step that would jump across contact is rejected and the
 * step shrunk.
 *
 * WHY THE BARRIER, WHY A SINGLE DESCENT (measured, not assumed):
 *   - The barrier ties or beats every alternative we tested (a max-min-clearance energy ties at
 *     best and is finicky), so the simple barrier wins.
 *   - Clearance plateaus at the basin's INTRINSIC ceiling — two energies hit the same ~2e-3 on
 *     Rich's basin, and 20× the iteration budget didn't move it. So there is no point looping or
 *     perturbing within a basin: deeper clearance is an EXPLORATION problem (other moduli), not
 *     an improve problem. One honest descent, report where it lands.
 *
 * IT IS FINE THAT SOME SEEDS DON'T DEEPEN. A very marginal seed (clearance ~1e-7, effectively on
 * ∂Ω, where the log-barrier is stiffest) may simply not lift — the gated step blocks and the
 * torus comes back unchanged. That's not a failure: it's still flat and embedded, just not
 * deeper. Lifting those pinned boundary tori is a separate, harder problem (the same one as DS
 * boundary seeds) that does NOT belong welded into this routine — it will be its own future
 * "push-off-boundary" routine (gated `cellMargin` reposition + barrier retry; experiments
 * showed it rescues much of the pinned tail but WRECKS the non-stuck majority if applied to
 * everyone, so it must be its own deliberate step, not a clause here).
 *
 * PRECONDITION — the seed must already be flat AND embedded. Improve DEEPENS within Ω; it does
 * not ENTER Ω (that is `discover`). The gate needs `embeddedRegion.contains(x)` true at step
 * one, so a non-embedded seed returns null.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import type { ScalarFn } from '@core/functions/types.ts';
import { flat } from '@core/constraints/flat.ts';
import { makeCellBarrier, embeddedRegion, isEmbedded } from '@core/embedding/index.ts';
import { project } from '@core/solvers/project.ts';
import { minimize } from '@core/solvers/minimize.ts';
import { measure, type Measurement } from './measure.ts';

export interface ImproveOptions {
  /** Fattening energy descended (gated) to deepen clearance. Default `cellBarrier` with the
   *  cutoff δ matched to the clearance scale (0.005) — measured sweet spot, not the 0.1 default. */
  energy?: ScalarFn;
  /** Descent step length. Default 0.001. */
  stepSize?: number;
  /** Iteration cap. Default 400. */
  maxIters?: number;
}

/**
 * Build the improve attempt: a flat embedded seed ↦ its deepened `Measurement` (deeper or
 * not), or `null` if the seed is not actually flat + embedded. Feed it a pool of known tori
 * (e.g. `discover`'s CSV output) with `collect`.
 */
export function improve(
  triang: Triangulation,
  opts: ImproveOptions = {},
): (seed: Float64Array) => Measurement | null {
  const held = [flat(triang)];
  const region = embeddedRegion(triang);
  const energy = opts.energy ?? makeCellBarrier(triang, { delta: 0.005 });
  const stepSize = opts.stepSize ?? 0.001;
  const maxIters = opts.maxIters ?? 400;
  return (x) => {
    if (project(x, held).status !== 'converged') return null;   // re-flatten (a tiny correction for a real seed)
    if (!isEmbedded(triang, x)) return null;                    // must START in Ω — improve deepens, doesn't enter
    minimize(x, held, energy, { region, stepSize, maxIters });  // deepen, GATED (stays embedded by construction)
    return measure(triang, x);                                  // blocked or not, it is still flat + embedded
  };
}
