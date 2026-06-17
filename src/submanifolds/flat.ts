/**
 * flat — the flatness submanifold {all cone-angle deficits = 0}, as a `Held`
 * constraint (the closed-condition usage from `solvers/types.ts`).
 *
 * All the geometry lives in the `coneDeficit` map in `functions/` (the V deficits
 * and their analytic Jacobian); `flat` only says how to USE it: drive V−1 rows.
 *
 * Pure: no three.js, no DOM.
 */

import { coneDeficit } from '../functions/coneDeficit.ts';
import type { Triangulation } from '../topology/triangulation.ts';
import type { Held } from '../solvers/types.ts';

/**
 * Flatness: every cone-angle deficit = 0. **codim = V−1, the true codimension.**
 *
 * Gauss–Bonnet forces Σ deficits ≡ 0, so the flat locus is codim V−1, not V: the
 * V-th deficit is `−(sum of the others)` and carries no independent information.
 * Driving the first V−1 deficits keeps `project`'s normal matrix full-rank and
 * well-conditioned (vs the rank-deficient, cond≈1e13 system all V rows would
 * force), and reproduces `newtonFlatten` exactly (which drops the same row).
 *
 * The drop is only of a DRIVING row: convergence still measures ALL V deficits.
 * No custom `measure` is needed — the solver's default ‖value‖∞ over all `fn.dim`
 * rows of `coneDeficit` IS `maxConeDeficit`, so the dropped deficit cannot lag
 * above tolerance unnoticed.
 */
export function flat(torus: Triangulation): Held {
  return { fn: coneDeficit(torus), drive: torus.vertexCount - 1 };
}
