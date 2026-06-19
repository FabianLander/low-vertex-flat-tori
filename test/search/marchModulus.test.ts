import { describe, it, expect } from 'vitest';
import { marchToWallAttempt, wallFamily } from '@core/search/marchModulus.ts';
import { fullSpace } from '@core/coordinates/full.ts';
import { doyleSchwartzPositions } from '@core/search/doyleSchwartz.ts';
import { makeCutOffArea } from '@core/embedding/index.ts';
import { modulus } from '@core/moduli/modulus.ts';
import { reduceModulus } from '@core/moduli/reduce.ts';
import { RICH } from '@core/triangulations/index.ts';

describe('marchModulus — transport a torus onto a modulus wall', () => {
  it('the wall family reads |Re τ̂| and holds flat ∧ the wall', () => {
    const fam = wallFamily(fullSpace(RICH));
    const p = doyleSchwartzPositions(0.2, 1.1);
    expect(fam.param(p)).toBeCloseTo(Math.abs(reduceModulus(modulus(RICH, p).tau)[0]), 9);
    const held = fam.held(p, 0.1);
    expect(held.length).toBe(2); // [flat, modulusWall]
  });

  it('marching a near-rectangular DS seed toward Re τ̂ = 0 yields a flat outcome', () => {
    // |Re τ̂| ≈ 0.05 already, so the march is short.
    const attempt = marchToWallAttempt(RICH, { c: 0, energy: makeCutOffArea(RICH), angleTol: 1e-9 });
    const seed = doyleSchwartzPositions(0.05, 1.2);
    const outcome = attempt(seed);
    if (!outcome) throw new Error('expected an embedded starting torus from a DS seed');

    // Whatever happens, the result is still a flat torus, and the status is honest.
    expect(outcome.cert.coneDeficit).toBeLessThan(1e-8);
    expect(['reached', 'blocked', 'max-iters']).toContain(outcome.status);
    expect(outcome.reached).toBeGreaterThanOrEqual(0);
    if (outcome.status === 'reached') {
      expect(Math.abs(outcome.cert.tauHat[0])).toBeLessThan(1e-6);
    }
  });
});
