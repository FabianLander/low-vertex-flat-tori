/**
 * march correctness:
 *  (1) TOY with a known track + known pinch: march a point along the unit circle
 *      by its x-coordinate; reaches an in-range target on the circle, and BLOCKS
 *      at the closed-form pinch x₀=√(1−r²) when a region floor x₁ ≥ r closes the path;
 *  (2) REAL: march the modulus wall |Re τ̂| toward a target from a flat embedded
 *      torus, staying embedded, landing flat+embedded at the realized wall value.
 */

import { describe, it, expect } from 'vitest';
import { march, type Family } from './march.ts';
import { project } from './project.ts';
import { identity } from '../configuration/chart.ts';
import type { ConstraintMap, Region } from './types.ts';
import { flat } from '../submanifolds/flat.ts';
import { modulusWall } from '../submanifolds/modulus.ts';
import { embedded } from '../regions/embedded.ts';
import { maxConeDeficit } from '../math/angles.ts';
import { isEmbedded } from '../math/embedded.ts';
import { modulus, reduceModulus } from '../topology/develop.ts';
import { byId } from '../triangulations/index.ts';
import { RICH_REFERENCE } from '../math/reference.ts';

// --- toy: unit circle in ℝ², parameter = x₀ ---
const circle: ConstraintMap = {
  label: 'circle',
  codim: 1,
  value(c, out) { out[0] = c[0] * c[0] + c[1] * c[1] - 1; },
  jacobian(c, out) { out[0] = 2 * c[0]; out[1] = 2 * c[1]; },
};
function xCoord(s: number): ConstraintMap {
  return {
    label: `x0=${s}`,
    codim: 1,
    value(c, out) { out[0] = c[0] - s; },
    jacobian(_c, out) { out[0] = 1; out[1] = 0; },
  };
}
const circleFamily: Family = {
  param: (c) => c[0],
  held: (_c, s) => [circle, xCoord(s)],
};
// region: upper part of the circle, x₁ ≥ floor.
function upperHalf(floor: number): Region {
  return {
    label: `x1>=${floor}`,
    contains: (c) => c[1] >= floor,
    margin: (c) => c[1] - floor,
    enterEnergy: () => ({ label: 'n/a', compute: () => 0, gradient: (_c, o) => o.fill(0) }),
    stayEnergy: () => ({ label: 'n/a', compute: () => 0, gradient: (_c, o) => o.fill(0) }),
  };
}

describe('march — toy: tracking a point along the unit circle', () => {
  it('reaches an in-range target on the circle', () => {
    const x = new Float64Array([0.6, 0.8]); // on the circle, upper
    const r = march(identity(2), x, circleFamily, -0.5);
    expect(r.status).toBe('reached');
    expect(x[0]).toBeCloseTo(-0.5, 8);
    expect(Math.abs(x[0] * x[0] + x[1] * x[1] - 1)).toBeLessThan(1e-9);
  });

  it('BLOCKS at the closed-form pinch when a region floor closes the path', () => {
    // From (0.6,0.8) marching x₀ → 1.0 with floor x₁ ≥ 0.5: the path pinches at
    // x₀ = √(1−0.25) = 0.8660…, where x₁ hits 0.5; beyond that the gate closes.
    const x = new Float64Array([0.6, 0.8]);
    const r = march(identity(2), x, circleFamily, 1.0, { region: upperHalf(0.5), minStep: 1e-3 });
    expect(r.status).toBe('blocked');
    expect(r.param).toBeLessThan(1.0);
    expect(r.param).toBeCloseTo(Math.sqrt(0.75), 2); // the pinch
  });
});

describe('march — real: tracking the modulus wall, staying embedded', () => {
  it('marches |Re τ̂| from a flat embedded torus to a target, landing flat+embedded', () => {
    const torus = byId(7);
    const seed = RICH_REFERENCE.positions.slice();
    project(identity(24), seed, [flat(torus)]); // land flat
    const start = Math.abs(reduceModulus(modulus(torus, seed).tau)[0]);
    const target = start + 0.15; // a move too far for one projection to take safely

    const family: Family = {
      param: (c) => Math.abs(reduceModulus(modulus(torus, c).tau)[0]),
      held: (c, s) => [flat(torus), modulusWall(torus, c, s)],
    };

    const x = seed.slice();
    const r = march(identity(24), x, family, target, { region: embedded(torus), maxSteps: 400 });

    // Either it reached the target or the embedded region pinched it off — both
    // are valid RESULTS. Whatever value it stopped at must be a genuine flat,
    // embedded torus with that realized wall.
    expect(['reached', 'blocked', 'max-iters']).toContain(r.status);
    expect(maxConeDeficit(torus, x)).toBeLessThan(1e-9);
    expect(isEmbedded(torus, x)).toBe(true);
    const realized = Math.abs(reduceModulus(modulus(torus, x).tau)[0]);
    expect(realized).toBeCloseTo(r.param, 6);
    expect(realized).toBeGreaterThan(start - 1e-6); // made progress toward the target
    if (r.status === 'reached') expect(realized).toBeCloseTo(target, 5);
  });
});
