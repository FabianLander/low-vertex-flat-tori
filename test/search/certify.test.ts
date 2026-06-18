/**
 * certify records the honest measurement, including BOTH raw τ and reduced τ̂.
 */

import { describe, it, expect } from 'vitest';
import { certify } from '../../src/search/certify.ts';
import { makeCellMargin, isEmbedded, minMargin } from '../../src/embedding/index.ts';
import { project } from '../../src/solvers/project.ts';
import { flow } from '../../src/solvers/flow.ts';
import { flat, maxConeDeficit } from '../../src/constraints/flat.ts';
import { modulus, reduceModulus } from '../../src/topology/develop.ts';
import { byId } from '../../src/triangulations/index.ts';
import { RICH_REFERENCE } from '../../src/sampling/reference.ts';

const torus = byId(7);

describe('certify', () => {
  it('agrees with the underlying primitives on a flat embedded torus', () => {
    const p = RICH_REFERENCE.positions.slice();
    project(p, [flat(torus)]);
    const cert = certify(torus, p);

    expect(cert.coneDeficit).toBe(maxConeDeficit(torus, p));
    expect(cert.coneDeficit).toBeLessThan(1e-9);
    expect(cert.embedded).toBe(isEmbedded(torus, p));
    expect(cert.embedded).toBe(true);
    expect(cert.margin).toBe(minMargin(torus, p).margin);
    expect(cert.area).toBeGreaterThan(0);
    expect(cert.rotDefect).toBeLessThan(1e-9); // holonomy is a pure translation (flat)
  });

  it('records the RAW τ and the REDUCED τ̂ as distinct, consistent fields', () => {
    const p = RICH_REFERENCE.positions.slice();
    project(p, [flat(torus)]);
    const cert = certify(torus, p);

    // Raw τ is exactly the develop holonomy ratio (Teichmüller).
    const raw = modulus(torus, p).tau;
    expect(cert.tau[0]).toBe(raw[0]);
    expect(cert.tau[1]).toBe(raw[1]);

    // τ̂ is the SL(2,ℤ)-reduction of that raw τ (moduli), in the standard domain.
    const red = reduceModulus(raw);
    expect(cert.tauHat[0]).toBe(red[0]);
    expect(cert.tauHat[1]).toBe(red[1]);
    expect(Math.abs(cert.tauHat[0])).toBeLessThanOrEqual(0.5 + 1e-9); // |Re τ̂| ≤ ½
    expect(cert.tauHat[0] * cert.tauHat[0] + cert.tauHat[1] * cert.tauHat[1]).toBeGreaterThanOrEqual(1 - 1e-9); // |τ̂| ≥ 1
    expect(cert.tauHat[1]).toBeGreaterThan(0); // in ℍ
  });

  it('reports embedded:false honestly when descent escapes Ω', () => {
    const p = RICH_REFERENCE.positions.slice();
    // Un-gated repulsion descent leaves the embedded set (see flow/region tests).
    flow(p, [flat(torus)], makeCellMargin(torus, { epsilon: 0.3 }), { maxIters: 50 });
    const cert = certify(torus, p);
    expect(cert.embedded).toBe(false);
    expect(cert.coneDeficit).toBeLessThan(1e-9); // still flat (held), just not embedded
  });
});
