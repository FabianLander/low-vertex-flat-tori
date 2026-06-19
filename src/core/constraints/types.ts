/**
 * The constraint contract — how a CLOSED condition (a submanifold {g=0}) is presented to
 * the solvers: simply a differentiable map `Fn`, whose zero set is the submanifold and
 * which the solvers drive to zero (every row). The concrete constraints (`flat`,
 * `collinear`, `modulus`) produce these. (The OPEN condition — the embedded `Region` you
 * stay inside — lives in `embedding/`, its own first-class home.)
 *
 * `Constraint` is a bare alias for `Fn`: there is no "usage" wrapper. A constraint with a
 * rank deficiency states it at the source — e.g. `flat` emits its V−1 independent
 * cone-deficit rows directly (Gauss–Bonnet makes the V-th redundant), so the solver just
 * drives every row of every map. Convergence is ‖value‖∞.
 *
 * Pure: no three.js, no DOM.
 */

import type { Fn } from '@core/functions/types.ts';

/** A closed condition the solvers drive to zero: a differentiable map. */
export type Constraint = Fn;
