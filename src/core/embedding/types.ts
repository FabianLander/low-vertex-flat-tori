/**
 * The region contract — how the OPEN condition (the feasible set Ω you stay inside) is
 * presented to the solvers, the open-condition twin of `constraints/Constraint`. Its sole
 * instance is the embedded set (`embedded.ts`: `isEmbedded` → `contains`, `clearance` →
 * `margin`); `search/pull`'s `ambientRegion` pulls it onto the solver's working space ℝⁿ
 * for `minimize`/`continuation`. Generic over any ℝⁿ — a ball is a `Region` too.
 *
 * Pure: no three.js, no DOM.
 */

/**
 * `Region` — an open feasible set Ω as a membership test. `contains` is the hard in/out
 * test the gated steppers refuse to leave; `margin` (optional) is the continuous distance
 * to the boundary (>0 strictly inside, 0 on ∂Ω), which a stepper can use to size a feasible
 * step.
 */
export interface Region {
  contains(x: ArrayLike<number>): boolean;
  margin?(x: ArrayLike<number>): number;
}
