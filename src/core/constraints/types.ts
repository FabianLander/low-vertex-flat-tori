/**
 * The constraint contract — how a CLOSED condition (a level set `{fn(x) = target}`) is
 * presented to the solvers: a differentiable map `fn` paired with the value `target` the
 * solvers drive it to (every row). A constraint is *a function equated to a value*. The
 * concrete constraints (`flat`, `collinear`, `modulus`) produce these. (The OPEN condition
 * — the embedded `Region` you stay inside — lives in `embedding/`, its own first-class home.)
 *
 * `target` is length `fn.outDim`; **absent ⟺ the zero vector** (the common case — `flat`,
 * `collinear` drive to 0). The solver drives `fn(x) − target → 0`; the Jacobian is `∂fn/∂x`
 * (the constant `target` doesn't enter), so `target` only shifts the residual, never the
 * QR step / tangent projection / convergence ‖·‖∞.
 *
 * A bare `Fn` is a MAP, not a `Constraint` — maps (`coneDeficit`, `tau`, the locus
 * measurements) feed `stack`/`leastSquares`/`compose`; a constraint *pairs* a map with a
 * target. This sharpens the map↔constraint line `coneDeficit` (map) vs `flat` (constraint)
 * already embodies. A rank deficiency is stated at the source — e.g. `flat`'s `fn` emits its
 * V−1 independent cone-deficit rows (Gauss–Bonnet makes the V-th redundant).
 *
 * Pure: no three.js, no DOM.
 */

import type { Fn } from '@core/functions/types.ts';

/** A closed condition the solvers drive to its target: a map `fn` equated to `target`
 *  (a level set `{fn(x) = target}`); `target` absent ⟺ the zero vector. */
export interface Constraint {
  readonly fn: Fn;
  readonly target?: ArrayLike<number>;
}
