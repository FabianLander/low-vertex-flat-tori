import { describe, it, expect } from 'vitest';
import { collinear, signedArea2 } from '@core/constraints/collinear.ts';

describe('collinear', () => {
  it('signed area is 0 on a collinear triple, nonzero otherwise', () => {
    // P1=(0,0), P2=(1,1), P3=(2,2) collinear; z's irrelevant.
    const p = new Float64Array(24);
    p[3] = 0; p[4] = 0; p[6] = 1; p[7] = 1; p[9] = 2; p[10] = 2;
    expect(Math.abs(signedArea2(p, 1, 2, 3))).toBeLessThan(1e-15);
    p[10] = 3; // bend P3 off the line
    expect(Math.abs(signedArea2(p, 1, 2, 3))).toBeGreaterThan(0.1);
  });

  it('analytic Jacobian matches central finite differences', () => {
    const c = Float64Array.from({ length: 24 }, (_, i) => Math.sin(i * 1.3));
    const fn = collinear(1, 2, 3, 24).fn;
    const J = new Float64Array(24);
    fn.jacobian(c, J);
    const h = 1e-6;
    for (let k = 0; k < 24; k++) {
      const s = c[k];
      c[k] = s + h; const vp = signedArea2(c, 1, 2, 3);
      c[k] = s - h; const vm = signedArea2(c, 1, 2, 3);
      c[k] = s;
      expect(J[k]).toBeCloseTo((vp - vm) / (2 * h), 7);
    }
  });
});
