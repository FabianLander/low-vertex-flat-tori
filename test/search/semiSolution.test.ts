import { describe, it, expect } from 'vitest';
import { semiSolutionAttempt, doyleSchwartzTentSeeds } from '../../src/search/semiSolution.ts';
import { doyleSchwartzPositions } from '../../src/search/doyleSchwartz.ts';
import { maxConeDeficit } from '../../src/constraints/flat.ts';
import { modulus } from '../../src/moduli/modulus.ts';
import { mulberry32 } from '../../src/sampling/rng.ts';
import { RICH } from '../../src/triangulations/index.ts';

describe('semiSolution — DS semi-solution scan on the new stack', () => {
  it('the DS family is an exact flat torus of modulus x+iy (#7)', () => {
    const p = doyleSchwartzPositions(0.2, 1.0);
    expect(maxConeDeficit(RICH, p)).toBeLessThan(1e-12);
    const tau = modulus(RICH, p).tau;
    expect(tau[0]).toBeCloseTo(0.2, 6);
    expect(tau[1]).toBeCloseTo(1.0, 6);
  });

  it('attempt projects a (σ=0) DS seed to a flat certificate at its modulus', () => {
    const attempt = semiSolutionAttempt(RICH, { angleTol: 1e-9 });
    const seed = doyleSchwartzPositions(0.15, 1.1);
    const cert = attempt(seed);
    if (!cert) throw new Error('DS seed should project to a flat certificate');
    expect(cert.coneDeficit).toBeLessThan(1e-9);
    expect(cert.tau[0]).toBeCloseTo(0.15, 4);
    expect(cert.tau[1]).toBeCloseTo(1.1, 4);
  });

  it('a tent-pole-perturbed seed re-projects to a flat semi-solution (or rejects)', () => {
    const rng = mulberry32(3);
    const attempt = semiSolutionAttempt(RICH, { angleTol: 1e-9 });
    const seed = doyleSchwartzTentSeeds(rng, { sigmaMin: 0.01, sigmaMax: 0.03 })();
    const cert = attempt(seed);
    if (cert !== null) {
      expect(cert.coneDeficit).toBeLessThan(1e-9);
      expect(cert.tau[1]).toBeGreaterThan(0);
    }
  });
});
