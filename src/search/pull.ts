/**
 * Pulling conditions into a working space — the bridge the search layer owns between
 * `configuration/` (the `ConfigSpace`) and `conditions/` (constraints + regions).
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
import type { Constraint, Region } from '../conditions/types.ts';
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

/** Pull an ambient `Region` to a working-space `Gate`: x ↦ region.contains(push(x)). */
export function regionGate(space: ConfigSpace, region: Region): Gate {
  const buf = new Float64Array(space.ambient);
  return (x) => { space.push(x, buf); return region.contains(buf); };
}
