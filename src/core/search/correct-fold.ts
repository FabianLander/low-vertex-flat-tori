/**
 * correct-fold — snap a pushed-off fold back to exact flatness and the exact modulus.
 *
 *   liftedPositions(base, t) → project([flat, τ = τ₀])   [→ fatten inside Ω]
 *
 * The lift of a folded base (`sampling/foldedBases`) is embedded for every t > 0 but is not
 * flat: raising the vertices changes the squared edge length of (a,b) by t²(ζ_a − ζ_b)², so
 * the cone deficits open up as O(t²) and the modulus drifts off the target. This drives both
 * back to zero by Gauss–Newton on
 *
 *   Φ = (δ₀, …, δ₆, Re τ − Re τ₀, Im τ − Im τ₀) = 0,
 *
 * nine rows: `flat` emits its V−1 = 7 independent cone-deficit rows and `pinTeichmuller` the
 * two modulus rows. τ₀ is the modulus of the FOLD itself, read at t = 0 in the repo's own
 * canonical marking — the fold IS exactly the square, respectively hexagonal, torus (Lander,
 * Prop. 1), so pinning τ there pins the right point of ℍ whatever marking names it.
 *
 * WHICH COORDINATES MOVE is the one real choice, and it decides the shape of the solve:
 *
 *   'paper'   the nine planar coordinates of Lander §6, heights and the other seven planar
 *             coordinates frozen. A SQUARE 9×9 system, invertible at the fold (Prop. 3) —
 *             this routine run at `free: 'paper'` IS the paper's implicit-function-theorem
 *             step in floating point. The solution is locally isolated: there is no tangent
 *             freedom left, so nothing can be fattened.
 *   'planar'  all sixteen planar coordinates, heights frozen — 9 rows in 16 unknowns, a
 *             7-dimensional fiber.
 *   'all'     all 24 coordinates — 9 rows in 24 unknowns, the 15-dimensional fiber of
 *             Lander's Theorem 3. `project` takes the MIN-NORM step, so it lands on the
 *             nearest point of the fiber rather than on a distinguished one.
 *
 * The min-norm step is blind to embeddedness, and that — not convergence — is what fails as t
 * grows: the solve stays exact to machine precision while the configuration skates along ∂Ω
 * and eventually falls out. `fatten: true` answers that by descending the cell barrier along
 * the fiber, GATED by `embeddedRegion` and HOLDING both flatness and τ₀, so deepening the
 * clearance cannot undo the snap. It is a no-op at `free: 'paper'`, where the fiber is a point.
 *
 * `measure` is the gate throughout — the solver only *thinks* it converged; `coneDeficit`,
 * `embedded` and `tauHat` are the truth.
 *
 * Pure: no three.js, no DOM.
 */

import type { Vec2 } from '@core/geometry/vec2.ts';
import { freeCoords } from '@core/coordinates/pin.ts';
import { flat } from '@core/constraints/flat.ts';
import { pinTeichmuller, point } from '@core/constraints/modulus.ts';
import { embeddedRegion, makeCellBarrier } from '@core/embedding/index.ts';
import { modulus } from '@core/moduli/modulus.ts';
import { project } from '@core/solvers/project.ts';
import { minimize } from '@core/solvers/minimize.ts';
import { liftedPositions, type FoldedBase } from '@core/sampling/foldedBases.ts';
import { pullHeld, ambientRegion } from './pull.ts';
import { measure, type Measurement } from './measure.ts';

/** Which coordinates the correction may move. A named set, or explicit flat indices 3v+a. */
export type FreeSet = 'paper' | 'planar' | 'all' | readonly number[];

/** All sixteen planar coordinates (x and y of every vertex); the heights stay frozen. */
const PLANAR_COORDS: readonly number[] =
  Array.from({ length: 8 }, (_, v) => [3 * v, 3 * v + 1]).flat();

function resolveFree(base: FoldedBase, free: FreeSet): readonly number[] {
  if (Array.isArray(free)) return free;
  if (free === 'paper') return base.free;
  if (free === 'planar') return PLANAR_COORDS;
  return Array.from({ length: base.triang.vertexCount * 3 }, (_, i) => i);   // 'all'
}

export interface CorrectFoldOptions {
  /** Which coordinates may move. Default `'paper'` — Lander's nine, the square system. */
  free?: FreeSet;
  /** After the snap, descend the cell barrier along the fiber, gated by `embeddedRegion` and
   *  holding [flat, τ = τ₀], to buy clearance. No-op at `free: 'paper'`. Default false. */
  fatten?: boolean;
  /** Cell-barrier activation gap for the fatten. Default 0.005. */
  barrierDelta?: number;
  /** Fatten descent iteration cap. Default 300. */
  fattenIters?: number;
  /** Newton tolerance on the stacked residual. Default 1e-13. */
  tolerance?: number;
  /** Newton iteration cap. Default 50. */
  maxIters?: number;
  /** Start from this configuration instead of the bare lift — its heights are overwritten
   *  with t·ζ, its other coordinates kept. Warm-starts a march in t. */
  seed?: ArrayLike<number>;
}

export interface CorrectFoldResult {
  /** The corrected configuration (length 3V). Returned converged or not, so a caller can draw it. */
  readonly positions: Float64Array;
  /** The verified readout — the truth about `positions`. */
  readonly measurement: Measurement;
  /** Did the Gauss–Newton snap converge? */
  readonly converged: boolean;
  /** The Teichmüller modulus the correction pinned (the fold's own τ, in this marking). */
  readonly tauTarget: Vec2;
  /** How many coordinates were free. */
  readonly freeCount: number;
}

/** The exact Teichmüller modulus of a fold, read at t = 0 in the repo's canonical marking. */
export function foldTau(base: FoldedBase): Vec2 {
  return modulus(base.triang, liftedPositions(base, 0)).tau;
}

/** Push a folded base off to height t, then snap it back to exact flatness and exact modulus. */
export function correctFold(
  base: FoldedBase,
  t: number,
  opts: CorrectFoldOptions = {},
): CorrectFoldResult {
  const { triang } = base;
  const tauTarget = foldTau(base);
  const free = resolveFree(base, opts.free ?? 'paper');

  // heights are the push-off's own; everything else starts at the seed (default: the fold)
  const positions = opts.seed ? Float64Array.from(opts.seed) : liftedPositions(base, t);
  for (let v = 0; v < triang.vertexCount; v++) positions[3 * v + 2] = t * base.lift[v];

  const space = freeCoords(triang, positions, free);
  const pinned = [flat(triang), pinTeichmuller(triang, point(tauTarget))];
  const held = pullHeld(space, pinned);

  const x = new Float64Array(space.dim);
  space.coords(positions, x);
  const r = project(x, held, { tolerance: opts.tolerance ?? 1e-13, maxIters: opts.maxIters ?? 50 });

  // Deepen the clearance along the fiber without giving up the snap: the barrier is descended
  // subject to the SAME held constraints, gated so the path never leaves Ω.
  if (opts.fatten && r.status === 'converged' && space.dim > held.reduce((s, c) => s + c.fn.outDim, 0)) {
    const barrier = space.pullScalar(makeCellBarrier(triang, { delta: opts.barrierDelta ?? 0.005 }));
    const region = ambientRegion(space, embeddedRegion(triang).contains);
    minimize(x, held, barrier, { region, maxIters: opts.fattenIters ?? 300 });
  }

  space.push(x, positions);
  return {
    positions,
    measurement: measure(triang, positions),
    converged: r.status === 'converged',
    tauTarget,
    freeCount: free.length,
  };
}
