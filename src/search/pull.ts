/**
 * Pulling conditions into a working space — the bridge the search layer owns between
 * `configuration/` (the `ConfigSpace`) and the conditions (`constraints/` + `embedding/`).
 *
 * The solvers run in ℝⁿ on constraints/gates already pulled through φ. The
 * configuration space pulls *functions* (`space.pull`/`pullScalar`); the
 * condition-flavored wrappers — a `Constraint` (bare `Fn` or `Held`) and a `Region`
 * (→ a `Gate` predicate) — live here, where both layers are in scope, so neither
 * `configuration/` nor `solvers/` need to know the other's types.
 *
 * Pure: no three.js, no DOM.
 */

import type { ConfigSpace } from '../configuration/space.ts';
import type { Constraint } from '../constraints/types.ts';
import type { Gate } from '../solvers/types.ts';

/** Pull a `Constraint` (bare `Fn` or `Held`) through φ into the working space ℝⁿ. */
export function pullConstraint(space: ConfigSpace, c: Constraint): Constraint {
  if ('fn' in c) {
    const measure = c.measure;
    if (!measure) return { fn: space.pull(c.fn), drive: c.drive };
    const buf = new Float64Array(space.ambient);
    return {
      fn: space.pull(c.fn),
      drive: c.drive,
      measure: (x) => { space.push(x, buf); return measure(buf); },
    };
  }
  return space.pull(c);
}

/** Pull every constraint in a list. */
export function pullHeld(space: ConfigSpace, held: readonly Constraint[]): Constraint[] {
  return held.map((c) => pullConstraint(space, c));
}

/**
 * Pull an ambient predicate (on ℝ³ⱽ — e.g. `isEmbedded`) to a working-space `Gate`:
 * x ↦ contains(push(x)). The open-condition analogue of `pullConstraint`.
 */
export function ambientGate(space: ConfigSpace, contains: (c: ArrayLike<number>) => boolean): Gate {
  const buf = new Float64Array(space.ambient);
  return (x) => { space.push(x, buf); return contains(buf); };
}
