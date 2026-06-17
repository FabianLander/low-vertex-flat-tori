/**
 * The condition contracts — how a condition is presented to the solvers.
 *
 * A *closed* condition (a submanifold {g=0}) is a differentiable map `Fn` driven to
 * zero, optionally wrapped in a `Held` saying which rows to drive and how to measure
 * convergence. An *open* condition (a region you stay inside) is a `Region`: a gate
 * predicate + a signed margin. These live here, with the conditions, because the
 * concrete conditions (`flat`, `embedded`, …) produce them; the solvers consume them
 * from below. (The solvers add only the runtime `Gate` form of a region — see
 * `solvers/types.ts`.)
 *
 * Pure: no three.js, no DOM.
 */

import type { Fn } from '../functions/types.ts';

/**
 * A closed condition to hold: a differentiable map `Fn` whose zero set {fn = 0} is
 * the submanifold, plus how to USE it — which rows to drive, and how to measure
 * convergence. The solvers accept either a bare `Fn` (drive ALL rows, converge on
 * ‖value‖∞) or a `Held` for finer control.
 *
 * `drive` lets a constraint advertise its true rank: `flat` exposes all V deficits
 * but drives only V−1 (Gauss–Bonnet makes the V-th redundant), keeping `project`'s
 * normal matrix full-rank. Convergence still measures ALL `fn.dim` rows by default
 * (‖value‖∞), so the dropped row can't hide above tolerance — for `flat` that
 * default IS `maxConeDeficit`, so no custom `measure` is needed.
 */
export interface Held {
  readonly fn: Fn;
  /** Number of leading rows of `fn` to drive. Default `fn.dim`. */
  readonly drive?: number;
  /** Convergence measure. Default ‖fn.value‖∞ over all `fn.dim` rows. */
  readonly measure?: (c: ArrayLike<number>) => number;
}

/** What the solvers accept per held constraint: a bare `Fn`, or an `Fn` + usage. */
export type Constraint = Fn | Held;

/**
 * An OPEN condition Ω (the "tiny open set" the search lives inside): a predicate
 * `contains` gate and a signed `margin` diagnostic — the genuinely non-smooth parts
 * (the gate is the topological truth, e.g. exactly `isEmbedded`, NOT `margin > 0`).
 * The energies that drive a config toward Ω are plain scalar `Fn`s the condition
 * owns and `flow` takes explicitly — the Region doesn't dispense them. A `Region` is
 * an AMBIENT condition (on ℝ³ⱽ); the search pulls its `contains` to a working-space
 * `Gate` via the configuration space.
 */
export interface Region {
  readonly label: string;
  contains(c: ArrayLike<number>): boolean;   // the gate
  margin(c: ArrayLike<number>): number;      // signed depth — diagnostic only
}
