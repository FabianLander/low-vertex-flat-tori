/**
 * Modulus submanifolds, checked against the REALIZED geometry: after projecting
 * onto [flat, modulus…], re-measure τ̂ with a FRESH reduction (not the frozen
 * chart) and confirm the target is hit. Small nearby targets keep us in the
 * seed's SL(2,ℤ) chamber (reaching far targets is `march`'s job).
 */

import { describe, it, expect } from 'vitest';
import { project } from '../../src/solvers/project.ts';
import { identity } from '../../src/configuration/chart.ts';
import { flat } from '../../src/conditions/flat.ts';
import { fixedModulus, modulusWall } from '../../src/submanifolds/modulus.ts';
import { maxConeDeficit } from '../../src/conditions/flat.ts';
import { modulus, reduceModulus, type V2 } from '../../src/topology/develop.ts';
import { byId } from '../../src/triangulations/index.ts';
import { RICH_REFERENCE } from '../../src/math/reference.ts';

const torus = byId(7);

// A flat seed and its reduced modulus.
function flatSeed(): { pos: Float64Array; tauHat: V2 } {
  const pos = RICH_REFERENCE.positions.slice();
  project(identity(24), pos, [flat(torus)]);
  return { pos, tauHat: reduceModulus(modulus(torus, pos).tau) };
}

describe('modulus submanifolds', () => {
  it('project onto [flat, modulusWall(c)] realizes |Re τ̂| = c', () => {
    const { pos: seed, tauHat } = flatSeed();
    const c = Math.abs(tauHat[0]) + 0.02; // a small, in-chamber move
    const p = seed.slice();
    const r = project(identity(24), p, [flat(torus), modulusWall(torus, seed, c)]);

    expect(r.status).toBe('converged');
    expect(maxConeDeficit(torus, p)).toBeLessThan(1e-9);
    const got = reduceModulus(modulus(torus, p).tau);
    expect(Math.abs(Math.abs(got[0]) - c)).toBeLessThan(1e-6); // realized wall, fresh reduction
  });

  it('project onto [flat, fixedModulus(τ̂₀)] realizes τ̂ = τ̂₀', () => {
    const { pos: seed, tauHat } = flatSeed();
    const target: V2 = [tauHat[0] + 0.01, tauHat[1] + 0.01];
    const p = seed.slice();
    const r = project(identity(24), p, [flat(torus), fixedModulus(torus, seed, target)]);

    expect(r.status).toBe('converged');
    expect(maxConeDeficit(torus, p)).toBeLessThan(1e-9);
    const got = reduceModulus(modulus(torus, p).tau);
    expect(got[0]).toBeCloseTo(target[0], 5);
    expect(got[1]).toBeCloseTo(target[1], 5);
  });
});
