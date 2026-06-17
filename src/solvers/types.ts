/**
 * The contracts the solvers consume — the problem-agnostic core.
 *
 * A solver (`project`/`flow`/`march`) is written against these interfaces and
 * knows nothing about a `Triangulation`. Problem data lives in the
 * IMPLEMENTATIONS, each in its own kind-folder: the differentiable maps in
 * `functions/`, charts in `configuration/`, the closed conditions in
 * `submanifolds/`, the open conditions in `regions/`. Every implementation depends
 * on this module (and `functions/`) for its contract; `solvers/` depends on no
 * implementation. That inversion is what makes the solvers reusable.
 *
 * Pure: no three.js, no DOM.
 */

import type { Fn } from '../functions/types.ts';

/**
 * A closed condition to hold: a differentiable map `Fn` (from `functions/`) whose
 * zero set {fn = 0} is the submanifold, plus how to USE it — which rows to drive,
 * and how to measure convergence. The solvers accept either a bare `Fn` (drive ALL
 * its rows, converge on ‖value‖∞) or a `Held` for finer control.
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
 * A parameterization ι : X = ℝᵈ → C = ℝⁿ of a subspace of configuration space,
 * with its derivative Dι. A solver runs ENTIRELY in the chart's coordinates X;
 * conditions are evaluated on the realized config ι(x) and their derivatives
 * pulled back through Dι. This is how linear conditions (pins, symmetry,
 * gauge-fixing) hold exactly by construction rather than by projection.
 *
 * Implementations live in `configuration/`. The current ones (`identity`,
 * `pinCoords`) are linear: Dι is a constant SELECTION matrix A (orthonormal
 * columns), which is exactly why the pullback reproduces newton's frozen-columns
 * behavior. General (nonlinear / non-orthonormal) parameterizations will need
 * Dι(x) and a min-norm-metric caveat.
 */
export interface Chart {
  /** dim X = number of free parameters. */
  readonly dim: number;
  /** dim C = ambient configuration dimension (= 3·vertexCount). */
  readonly ambient: number;
  /** ι : realize a full config from chart coordinates. */
  realize(x: ArrayLike<number>, outC: Float64Array): void;
  /** π : recover chart coordinates from a config (least-squares / selection). For seeds. */
  lift(c: ArrayLike<number>, outX: Float64Array): void;
  /** Pull a `rows`×n Jacobian (row-major, in C) back to `rows`×d (in X): J·Dι.
   *  Also used with `rows=1` to pull a C-gradient back to X (Aᵀ∇). */
  pullbackRows(jc: ArrayLike<number>, rows: number, outJx: Float64Array): void;
}

/**
 * An OPEN condition Ω (the "tiny open set" the search lives inside): a predicate
 * `contains` gate and a signed `margin` diagnostic — the genuinely non-smooth parts
 * (the gate is the topological truth, e.g. exactly `isEmbedded`, NOT `margin > 0`).
 * The energies that drive a config toward Ω are plain scalar `Fn`s the condition
 * owns and `flow` takes explicitly — the Region doesn't dispense them.
 */
export interface Region {
  readonly label: string;
  contains(c: ArrayLike<number>): boolean;   // the gate
  margin(c: ArrayLike<number>): number;      // signed depth — diagnostic only
}
