/**
 * The solver-owned input contract.
 *
 * The solvers run ENTIRELY in a problem's working space ℝⁿ on abstract maps. The two
 * condition contracts they consume are defined where the conditions live: the CLOSED one
 * (`Constraint` = an `Fn` driven to zero) in `constraints/`, the OPEN one (`Region`, the
 * feasible set) in `embedding/`. The one contract the solvers define themselves is `Family`
 * — not a condition, but the continuation input: a 1-parameter family of constraints. So a
 * solver still knows nothing torus-specific — only ℝⁿ, some `Fn`s, a `Region`, a `Family`.
 *
 * Pure: no three.js, no DOM.
 */

import type { Constraint } from '@core/constraints/types.ts';

/**
 * A 1-parameter family of submanifolds M_s — the input to `continuation`. `param(x)` reads
 * the current parameter value off the working point; `held(x, s)` builds the constraints
 * pinning the family to value `s`, rebuilt AT the current point (so frozen charts re-freeze
 * each step).
 */
export interface Family {
  param(x: ArrayLike<number>): number;
  held(x: ArrayLike<number>, s: number): readonly Constraint[];
}
