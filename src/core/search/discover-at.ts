/**
 * discoverAt — find a flat embedded torus AT a prescribed Teichmüller modulus τ₀, by flowing
 * toward embeddedness WITHIN the fiber {flat ∧ τ = τ₀}. The modulus-pinned twin of `discover`.
 *
 *   seed → project([flat, τ = τ₀]) → minimize([flat, τ = τ₀], overlap energy) → verify(flat ∧ τ₀ ∧ embedded)
 *
 * Land the seed on the FIBER (Newton onto {flat ∧ τ = τ₀}, codim V−1+2), then flow ALONG the
 * fiber (tangent to it, re-projecting each step so flatness AND the modulus stay pinned) descending
 * a repulsion energy that pulls a crossing torus toward Ω (Fabi's `cutOffArea` / `chordLengthSquared`).
 *
 * Like `discover`, the flow is **ungated** — it starts OUTSIDE Ω (an immersed torus at τ₀) and is
 * trying to get IN, so it cannot refuse non-embedded steps. Embeddedness is meant to EMERGE as the
 * energy → 0 — but the overlap energies are imperfect surrogates (their zero-set is not exactly Ω;
 * e.g. `chordLengthSquared` can hit 0 with crossings still present), so **`measure`/`isEmbedded` is
 * the only acceptance test** — never the energy value. A result is kept iff it is genuinely flat,
 * at τ₀, and embedded.
 *
 * This is the honest existence probe for "does the τ₀-fiber contain an embedded torus": run it over
 * MANY seeds and collect the ones the truth gate accepts. A pinch or a non-embedded local min from
 * any single seed says nothing about the (high-dimensional) fiber — only an accepted result is a
 * claim, and it is a constructive one (the torus in hand).
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import type { Vec2 } from '@core/geometry/vec2.ts';
import type { ScalarFn } from '@core/functions/types.ts';
import type { ConfigSpace } from '@core/configuration/space.ts';
import { fullSpace } from '@core/coordinates/full.ts';
import { flat } from '@core/constraints/flat.ts';
import { pinTeichmuller, point } from '@core/constraints/modulus.ts';
import { makeCutOffArea } from '@core/embedding/index.ts';
import { project } from '@core/solvers/project.ts';
import { minimize } from '@core/solvers/minimize.ts';
import { pullHeld } from './pull.ts';
import { measure, type Measurement } from './measure.ts';

export interface DiscoverAtOptions {
  /** Repulsion energy whose descent flows the fiber toward Ω. Default `cutOffArea`. */
  energy?: ScalarFn;
  /** Accept threshold on the flatness residual max|2π−θ|. Default 1e-10. */
  angleTol?: number;
  /** Accept threshold on |τ − τ₀| (the fiber is held, so this is just a guard). Default 1e-6. */
  modulusTol?: number;
  /** Flow tangent step length. Default 0.001. */
  stepSize?: number;
  /** Per-attempt cap on flow iterations. Default 2000 (fiber flow is slower than free discover). */
  maxFlowIters?: number;
  /** Reduced coordinate system to search in. Default `fullSpace(triang)` (ambient, zero overhead). */
  space?: ConfigSpace;
}

/**
 * Build the discoverAt attempt: a seed ↦ a flat embedded `Measurement` AT τ₀, or `null` if the
 * fiber flow did not reach an embedded config there. Feed it seeds with `collect`; accept ONLY
 * what the truth gate (`measure`) certifies — the energy is a force, not a certificate.
 */
export function discoverAt(
  triang: Triangulation,
  target: Vec2,
  opts: DiscoverAtOptions = {},
): (seed: Float64Array) => Measurement | null {
  const space = opts.space ?? fullSpace(triang);
  const held = pullHeld(space, [flat(triang), pinTeichmuller(triang, point([target[0], target[1]]))]);
  const energy = space.pullScalar(opts.energy ?? makeCutOffArea(triang));
  const angleTol = opts.angleTol ?? 1e-10;
  const modulusTol = opts.modulusTol ?? 1e-6;
  const stepSize = opts.stepSize ?? 0.001;
  const maxIters = opts.maxFlowIters ?? 2000;
  const buf = new Float64Array(space.ambient);
  return (x) => {
    if (project(x, held).status !== 'converged') return null;     // land on the fiber {flat ∧ τ = τ₀}
    minimize(x, held, energy, { stepSize, maxIters });            // flow within the fiber toward Ω (ungated)
    space.push(x, buf);
    const m = measure(triang, buf);
    const atTarget = Math.hypot(m.tau[0] - target[0], m.tau[1] - target[1]) < modulusTol;
    return m.coneDeficit < angleTol && m.embedded && atTarget ? m : null;   // truth gate, not the energy
  };
}
