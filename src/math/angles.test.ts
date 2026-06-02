import { describe, it, expect } from 'vitest';
import { coneAngles, coneAngleDeficits, maxConeDeficit } from './angles';
import { RICH_REFERENCE } from './reference';
import { mulberry32 } from './perturb';
import { VERTEX_COUNT } from './topology';

const TWO_PI = Math.PI * 2;

describe('cone angles', () => {
  it('Rich reference is flat (every vertex ≈ 2π)', () => {
    expect(maxConeDeficit(RICH_REFERENCE.positions)).toBeLessThan(1e-12);
  });

  it('Gauss–Bonnet: Σ cone angles ≡ 16π for ANY positions (the K=7 identity)', () => {
    // This identity is why newton.ts uses 7 constraints, not 8: the 8 deficits
    // sum to zero identically, so only 7 are independent.
    const rng = mulberry32(99);
    for (let trial = 0; trial < 50; trial++) {
      const p = new Float64Array(VERTEX_COUNT * 3);
      for (let i = 0; i < p.length; i++) p[i] = (rng() * 2 - 1) * 3;
      const angles = coneAngles(p);
      let sum = 0;
      for (const a of angles) sum += a;
      expect(Math.abs(sum - 16 * Math.PI)).toBeLessThan(1e-10);

      // Equivalently, the deficits sum to ~0.
      const def = coneAngleDeficits(p);
      let dsum = 0;
      for (const d of def) dsum += d;
      expect(Math.abs(dsum)).toBeLessThan(1e-10);
    }
  });

  it('deficit = 2π − coneAngle, componentwise', () => {
    const p = RICH_REFERENCE.positions;
    const ang = coneAngles(p);
    const def = coneAngleDeficits(p);
    for (let i = 0; i < VERTEX_COUNT; i++) {
      expect(def[i]).toBeCloseTo(TWO_PI - ang[i], 12);
    }
  });
});
