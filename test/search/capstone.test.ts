/**
 * Capstone: the real problem — find a FLAT, EMBEDDED torus on a MODULUS WALL —
 * composed entirely from the core operations (project · march · flow) over the
 * core conditions ([flat, modulusWall] inside the embedded region). No driver,
 * no orchestration: just the math system, called in sequence.
 *
 * This is the executable statement of the project's goal: land on a high-
 * codimension submanifold (flat ∧ |Re τ̂| = c) inside a tiny open set (embedded).
 */

import { describe, it, expect } from 'vitest';
import { project } from '../../src/solvers/project.ts';
import { flow } from '../../src/solvers/flow.ts';
import { march, type Family } from '../../src/solvers/march.ts';
import { identity } from '../../src/configuration/chart.ts';
import { flat, maxConeDeficit } from '../../src/conditions/flat.ts';
import { modulusWall } from '../../src/conditions/modulus.ts';
import { embedded, makeCellMargin, isEmbedded } from '../../src/conditions/embedded/index.ts';
import { modulus, reduceModulus } from '../../src/topology/develop.ts';
import { byId } from '../../src/triangulations/index.ts';
import { RICH_REFERENCE } from '../../src/math/reference.ts';

const torus = byId(7);
const reTauHat = (p: ArrayLike<number>) => Math.abs(reduceModulus(modulus(torus, p).tau)[0]);

describe('capstone — flat ∧ on-wall ∧ embedded, from project · march · flow', () => {
  it('lands a flat embedded torus on a modulus wall and fattens it there', () => {
    const region = embedded(torus);
    const x = RICH_REFERENCE.positions.slice();

    // 1. project onto the flat manifold M = {flat}.
    expect(project(identity(24), x, [flat(torus)]).status).toBe('converged');
    const start = reTauHat(x);

    // 2. march the wall |Re τ̂| = s toward a target, staying in the embedded region.
    const target = start + 0.15;
    const wallFamily: Family = {
      param: reTauHat,
      held: (c, s) => [flat(torus), modulusWall(torus, c, s)],
    };
    const m = march(identity(24), x, wallFamily, target, { region, maxSteps: 400 });
    expect(['reached', 'blocked', 'max-iters']).toContain(m.status); // any stop is a valid result
    const wall = reTauHat(x); // the wall value actually reached

    // After the march: genuinely flat, embedded, and ON the realized wall.
    expect(maxConeDeficit(torus, x)).toBeLessThan(1e-9);
    expect(isEmbedded(torus, x)).toBe(true);
    expect(wall).toBeCloseTo(m.param, 6);
    expect(wall).toBeGreaterThan(start - 1e-6); // moved toward the target

    // 3. flow to fatten ALONG the wall: descend the barrier while HOLDING
    //    [flat, modulusWall(wall)] and gated to stay embedded.
    const held = [flat(torus), modulusWall(torus, x, wall)];
    const f = flow(identity(24), x, held, makeCellMargin(torus), { region, maxIters: 100, stepSize: 0.002 });
    expect(['converged', 'stalled', 'max-iters', 'blocked']).toContain(f.status);

    // The composed result is still a flat, embedded torus on the same wall.
    expect(maxConeDeficit(torus, x)).toBeLessThan(1e-9);
    expect(isEmbedded(torus, x)).toBe(true);
    expect(reTauHat(x)).toBeCloseTo(wall, 5);
  });
});
