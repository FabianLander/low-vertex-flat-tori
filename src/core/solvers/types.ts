/**
 * The solver-side input contract.
 *
 * After the configuration-space refactor the solvers run ENTIRELY in a problem's
 * working space ℝⁿ: they take constraints already pulled to ℝⁿ (`Constraint`, from
 * `constraints/`) and, for the gated steppers, a `Gate` — the runtime predicate form
 * of an open region, already pulled to the working space (`x ↦ region.contains(push(x))`,
 * built in `search/`). The solvers know nothing about a `Triangulation`, a coordinate
 * system, or a `Region` type — only ℝⁿ, some `Fn`s, and a predicate. That is what makes
 * them reusable and toy-testable (a sphere/circle is just ℝⁿ + functions).
 *
 * Pure: no three.js, no DOM.
 */

/** An open region as the solver sees it: a predicate on the working space ℝⁿ. */
export type Gate = (x: ArrayLike<number>) => boolean;
