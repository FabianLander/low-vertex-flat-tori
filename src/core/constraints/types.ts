/**
 * The constraint contracts — how a CLOSED condition (a submanifold {g=0}) is
 * presented to the solvers: a differentiable map `Fn` driven to zero, optionally
 * wrapped in a `Held` saying which rows to drive and how to measure convergence. The
 * concrete constraints (`flat`, `collinear`, `modulus`) produce these; the solvers
 * consume them. (The OPEN condition — the embedded `Region` you stay inside — lives
 * in `embedding/`, its own first-class home.)
 *
 * Pure: no three.js, no DOM.
 */

import type { Fn } from '@core/functions/types.ts';

/**
 * A closed condition to hold: a differentiable map `Fn` whose zero set {fn = 0} is
 * the submanifold, plus how to USE it — which rows to drive, and how to measure
 * convergence. The solvers accept either a bare `Fn` (drive ALL rows, converge on
 * ‖value‖∞) or a `Held` for finer control.
 *
 * `drive` lets a constraint advertise its true rank: `flat` exposes all V deficits
 * but drives only V−1 (Gauss–Bonnet makes the V-th redundant), keeping `project`'s
 * normal matrix full-rank. Convergence still measures ALL `fn.outDim` rows by default
 * (‖value‖∞), so the dropped row can't hide above tolerance — for `flat` that
 * default IS `maxConeDeficit`, so no custom `measure` is needed.
 */
export interface Held {
  readonly fn: Fn;
  /** Number of leading rows of `fn` to drive. Default `fn.outDim`. */
  readonly drive?: number;
  /** Convergence measure. Default ‖fn.value‖∞ over all `fn.outDim` rows. */
  readonly measure?: (c: ArrayLike<number>) => number;
}

/** What the solvers accept per held constraint: a bare `Fn`, or an `Fn` + usage. */
export type Constraint = Fn | Held;
