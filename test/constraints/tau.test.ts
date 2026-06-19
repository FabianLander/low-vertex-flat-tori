import { describe, it, expect } from 'vitest';
import { tau } from '@core/constraints/modulus.ts';
import { modulus } from '@core/moduli/modulus.ts';
import { RICH_REFERENCE } from '@core/sampling/reference.ts';
import { RICH } from '@core/triangulations/index.ts';

describe('tau Fn', () => {
  const fn = tau(RICH);

  it('value = the developing-map modulus τ ∈ ℍ', () => {
    const p = RICH_REFERENCE.positions;
    const out = new Float64Array(2);
    fn.value(p, out);
    const ref = modulus(RICH, p).tau;
    expect(out[0]).toBeCloseTo(ref[0], 12);
    expect(out[1]).toBeCloseTo(ref[1], 12);
    expect(out[1]).toBeGreaterThan(0);   // Im τ > 0
    expect(fn.outDim).toBe(2);
  });

  it('finite-difference Jacobian is finite and matches a manual central difference', () => {
    const p = RICH_REFERENCE.positions.slice();
    const N = p.length;
    const J = new Float64Array(2 * N);
    fn.jacobian(p, J);
    for (const v of J) expect(Number.isFinite(v)).toBe(true);

    // Spot-check a couple of columns against an independent central difference of modulus().
    const h = 1e-6;
    for (const col of [0, 7, 23]) {
      const saved = p[col];
      p[col] = saved + h; const tp = modulus(RICH, p).tau;
      p[col] = saved - h; const tm = modulus(RICH, p).tau;
      p[col] = saved;
      expect(J[0 * N + col]).toBeCloseTo((tp[0] - tm[0]) / (2 * h), 4);
      expect(J[1 * N + col]).toBeCloseTo((tp[1] - tm[1]) / (2 * h), 4);
    }
  });
});
