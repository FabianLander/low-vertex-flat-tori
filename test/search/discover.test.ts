import { describe, it, expect } from 'vitest';
import { collect } from '../../src/search/collect.ts';
import { discoverAttempt } from '../../src/search/discover.ts';
import { perturbedSeeds, uniformSigma } from '../../src/search/seeds.ts';
import { makeCutOffArea } from '../../src/functions/energies/cutOffArea.ts';
import { RICH_REFERENCE } from '../../src/math/reference.ts';
import { mulberry32 } from '../../src/configuration/rng.ts';
import { RICH } from '../../src/triangulations/index.ts';

// These exercise the search COMPONENTS' contracts — not whether a (slow,
// stochastic) search actually finds a torus. Accepts are allowed but not required.
describe('discover search components', () => {
  it('collect drives the loop and only accepts genuine flat+embedded certs', () => {
    const rng = mulberry32(1234);
    const drawSeed = perturbedSeeds(RICH_REFERENCE.positions, uniformSigma(0.01, 0.08, rng), rng);
    const attempt = discoverAttempt(RICH, { energy: makeCutOffArea(RICH), angleTol: 1e-9, maxFlowIters: 60 });

    const accepts: number[] = [];
    const stats = collect(drawSeed, attempt, {
      maxTries: 12,
      maxAccepts: 3,
      onAccept: (cert) => {
        expect(cert.coneDeficit).toBeLessThan(1e-9);
        expect(cert.embedded).toBe(true);
        expect(cert.tauHat[1]).toBeGreaterThan(0);
        accepts.push(cert.tauHat[1]);
      },
    });

    expect(stats.tries).toBeLessThanOrEqual(12);
    expect(stats.tries).toBe(stats.accepts + stats.rejects);
    expect(stats.accepts).toBe(accepts.length);
  });

  it('seed sources produce correctly-sized configurations', () => {
    const rng = mulberry32(7);
    const seed = perturbedSeeds(RICH_REFERENCE.positions, uniformSigma(0.01, 0.05, rng), rng)();
    expect(seed.length).toBe(RICH.vertexCount * 3);
  });
});
