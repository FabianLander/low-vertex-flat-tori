/**
 * fiberWalk — a random walk that holds the MODULUS fixed: it explores the fiber
 * {flat ∧ τ = τ₀} ∩ embedded (the space of embedded flat tori at ONE Teichmüller modulus),
 * rather than all of the flat manifold. The one difference from the plain flat random walk
 * (`scripts/hunt-hex`) is an extra constraint in the held set:
 *
 *   perturb (caller) → project([flat, pinTeichmuller(point(τ₀))]) → verify (flat ∧ embedded)
 *
 * `project` re-solves onto {flat ∧ τ = τ₀} (codim V−1+2 = 9) each step, so the shape wanders
 * within the fiber while flatness AND the modulus stay pinned (raw τ — no fundamental-domain
 * fold). Feed perturbed pool members via `collect` + a feedback pool to DIFFUSE the fiber and
 * collect a "blob" of diverse embedded tori all at τ₀.
 *
 * WHY (the pinch-escape idea it's built for). A `steer-modulus` pinch is usually SHAPE-LOCAL:
 * *this* torus can't push the modulus further staying embedded, but the fiber is high-dim
 * (≈8-dim mod similarity), and a DIFFERENT embedded shape at the same modulus may still have
 * room. So the plan:
 *
 *   torus, τ = seed
 *   loop:
 *     steer(torus → target)                     # advances modulus; pinches at τ_p (or reaches → done)
 *     blob = diffuse fiberWalk(τ_p) from torus   # a spread of embedded SHAPES at τ_p
 *     retry = steer each blob torus → target     # do any get PAST τ_p?
 *     if any escaped: torus = furthest; continue # took a shape that dodged the pinch
 *     else: STOP — a genuine fiber-wide wall at τ_p (a real embeddability result)
 *
 * Either it breaks through pinches, or it rigorously certifies "no embedded flat torus at τ_p
 * continues toward the target" — both are wins.
 *
 * OPEN DECISIONS (settle when wiring the loop): blob diversity (pure diffusion for breadth, then
 * retry the HIGHEST-CLEARANCE ones first — clearance = room to move); escape margin (how far past
 * τ_p counts, so noise doesn't fake it) + cheap probe budget per blob torus; blob size N (~30–50).
 *
 * CRUX TO TEST FIRST (before the loop): at a real pinch modulus, does the embedded fiber actually
 * hold meaningfully DIFFERENT shapes (varied clearance / geometry) for retry to work with, or does
 * it collapse to ~one shape? Run fiberWalk on a known hex-hunt pinch torus and look at the spread.
 *
 * NB the hex-hunt metric caveat does NOT apply here: fiberWalk pins raw τ exactly (no reduced
 * distance, no fold). (The hex-hunt reduced-Euclidean selection folds at |τ|=1 / Re=±½ — switch
 * that to an SL(2,ℤ)-invariant hyperbolic distance separately; unrelated to this fiber walk.)
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import type { Vec2 } from '@core/geometry/vec2.ts';
import { flat } from '@core/constraints/flat.ts';
import { pinTeichmuller, point } from '@core/constraints/modulus.ts';
import { project } from '@core/solvers/project.ts';
import { measure, type Measurement } from './measure.ts';

export interface FiberWalkOptions {
  /** Accept threshold on max|2π−θ|. Default 1e-9. */
  angleTol?: number;
}

/**
 * Build the fiber-walk attempt: a (perturbed) seed ↦ a flat embedded `Measurement` AT τ₀, or
 * `null` if it can't re-solve onto the fiber or lands non-embedded. Drive it with `collect` +
 * a feedback pool (perturb accepted tori back in) to diffuse the fiber and collect a blob.
 */
export function fiberWalk(
  triang: Triangulation,
  target: Vec2,               // the fixed raw Teichmüller modulus τ₀ the walk stays on
  opts: FiberWalkOptions = {},
): (seed: Float64Array) => Measurement | null {
  const held = [flat(triang), pinTeichmuller(triang, point(target))];   // {flat ∧ raw τ = τ₀}
  const angleTol = opts.angleTol ?? 1e-9;
  return (x) => {
    if (project(x, held).status !== 'converged') return null;   // re-solve onto the fiber (modulus stays τ₀)
    const m = measure(triang, x);
    return m.coneDeficit < angleTol && m.embedded ? m : null;   // keep embedded fiber tori
  };
}
