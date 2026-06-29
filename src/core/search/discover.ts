/**
 * discover — the foundational search: find a flat embedded torus by flowing along the
 * flatness manifold toward the embedded region.
 *
 *   seed → project([flat]) → minimize([flat], overlap energy) → verify(flat ∧ embedded)
 *
 * Land the seed ON the flatness manifold F (Newton — `flat` is solvable from any seed), then
 * flow ALONG F (tangent to F, re-projecting flat each step) descending a repulsion energy
 * whose zero set IS the embedded region Ω (Fabi's `cutOffArea` / `chordLengthSquared`).
 *
 * The flow is **ungated** on purpose: discover starts OUTSIDE Ω — a crossing torus — and is
 * trying to get IN, so it cannot refuse non-embedded steps (a region gate would forbid the
 * very transition it exists to make). The energy is what pulls it toward Ω, and embeddedness
 * EMERGES as the energy → 0. `measure` is the final gate: the flow only THINKS it arrived;
 * `coneDeficit`/`embedded` are the truth.
 *
 * Seed-agnostic — cold-uniform or warm (perturbed / pool) seeds are the orthogonal
 * `sampling/` choice; this routine only moves a seed it is handed. It does NOT fatten or
 * gate: deepening an embedded torus (`improve`) and dragging the modulus while staying
 * embedded (`walk`) are separate routines that own the `embeddedRegion` gate.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import type { ScalarFn } from '@core/functions/types.ts';
import type { ConfigSpace } from '@core/configuration/space.ts';
import { fullSpace } from '@core/coordinates/full.ts';
import { flat } from '@core/constraints/flat.ts';
import { makeCutOffArea } from '@core/embedding/index.ts';
import { project } from '@core/solvers/project.ts';
import { minimize } from '@core/solvers/minimize.ts';
import { pullHeld } from './pull.ts';
import { measure, type Measurement } from './measure.ts';

export interface DiscoverOptions {
  /** Repulsion energy whose zero set is Ω; descending it flows F → embedded.
   *  Default `cutOffArea` (Fabi's chord²-modulated cut-off area). */
  energy?: ScalarFn;
  /** Accept threshold on the flatness residual max|2π−θ|. Default 1e-10. */
  angleTol?: number;
  /** Flow tangent step length. Default 0.001. */
  stepSize?: number;
  /** Per-attempt cap on flow iterations. Default 500. */
  maxFlowIters?: number;
  /** Reduced coordinate system to search in (φ : ℝⁿ → ℝ³ⱽ). Default `fullSpace(triang)`,
   *  which short-circuits to the ambient behavior (seeds are configs in ℝ³ⱽ, zero overhead).
   *  Pass e.g. `dsScaffold(triang)` to flow in a model's own DOF; seeds are then θ ∈ ℝⁿ. */
  space?: ConfigSpace;
}

/**
 * Build the discover attempt: a seed ↦ a flat embedded `Measurement`, or `null` if the flow
 * never reached F ∩ Ω. Feed it seeds with `collect`.
 *
 * With a reduced `space`, project/flow run in ℝⁿ on the flat constraint and energy pulled
 * through φ; the seed handed in is θ ∈ ℝⁿ, and `measure` verifies the pushed realization.
 */
export function discover(
  triang: Triangulation,
  opts: DiscoverOptions = {},
): (seed: Float64Array) => Measurement | null {
  const space = opts.space ?? fullSpace(triang);
  const held = pullHeld(space, [flat(triang)]);
  const energy = space.pullScalar(opts.energy ?? makeCutOffArea(triang));
  const angleTol = opts.angleTol ?? 1e-10;
  const stepSize = opts.stepSize ?? 0.001;
  const maxIters = opts.maxFlowIters ?? 500;
  const buf = new Float64Array(space.ambient);                    // pushed realization for measure
  return (x) => {
    if (project(x, held).status !== 'converged') return null;     // land on F
    minimize(x, held, energy, { stepSize, maxIters });            // flow along F toward Ω (ungated)
    space.push(x, buf);
    const m = measure(triang, buf);
    return m.coneDeficit < angleTol && m.embedded ? m : null;     // verify (the flow only thinks it arrived)
  };
}
