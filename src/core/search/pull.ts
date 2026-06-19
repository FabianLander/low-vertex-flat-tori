/**
 * Pulling conditions into a working space — the bridge the search layer owns between
 * `configuration/` (the `ConfigSpace`) and the conditions (`constraints/` + `embedding/`).
 *
 * The solvers run in ℝⁿ on constraints/regions already pulled through φ. The configuration
 * space pulls *functions* (`space.pull`/`pullScalar`); a `Constraint` is a map `fn` plus a
 * `target`, so pulling one pulls only its `fn` through φ — the `target` (a value in the
 * codomain) is unchanged. A region is pulled here too, where both layers are in scope, so
 * neither `configuration/` nor `solvers/` need to know the other's types.
 *
 * Pure: no three.js, no DOM.
 */

import type { ConfigSpace } from '@core/configuration/space.ts';
import type { Constraint } from '@core/constraints/types.ts';
import type { Region } from '@core/embedding/index.ts';

/** Pull every constraint in a list through φ into the working space ℝⁿ: reparameterize its
 *  `fn` (`fn∘φ`), carry its `target` unchanged. */
export function pullHeld(space: ConfigSpace, held: readonly Constraint[]): Constraint[] {
  return held.map((c) => ({ fn: space.pull(c.fn), target: c.target }));
}

/**
 * Pull an ambient region (on ℝ³ⱽ — its `contains`, e.g. `isEmbedded`, and optional `margin`,
 * e.g. `clearance`) to a working-space `Region`: each test is `f(push(x))`. The open-condition
 * analogue of `pullHeld`.
 */
export function ambientRegion(
  space: ConfigSpace,
  contains: (c: ArrayLike<number>) => boolean,
  margin?: (c: ArrayLike<number>) => number,
): Region {
  const buf = new Float64Array(space.ambient);
  return {
    contains: (x) => { space.push(x, buf); return contains(buf); },
    margin: margin ? (x) => { space.push(x, buf); return margin(buf); } : undefined,
  };
}
