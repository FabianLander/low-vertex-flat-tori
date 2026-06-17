import { describe, it, expect } from 'vitest';
import { modulus, reduceModulus, reduceModulusWithMatrix, applyMobius, developNet } from './develop';
import { totalArea } from './develop';
import { RICH_REFERENCE } from './reference';
import { RICH } from '../tori';

describe('develop → modulus τ', () => {
  it('Rich: covolume = intrinsic area (unit-index basis) and holonomy is a pure translation', () => {
    const m = modulus(RICH, RICH_REFERENCE.positions);
    expect(m.rotDefect).toBeLessThan(1e-9);             // flat ⟹ no rotational holonomy
    expect(m.covolume).toBeCloseTo(m.area, 6);          // generators form a unit-index basis
    expect(m.covolume).toBeCloseTo(totalArea(RICH, RICH_REFERENCE.positions), 6);
    expect(m.tau[1]).toBeGreaterThan(0);                // τ ∈ ℍ
  });

  it('developed net has 16 triangles, 15 tree edges, 9 cut edges', () => {
    const net = developNet(RICH, RICH_REFERENCE.positions);
    expect(net.corners).toHaveLength(16);
    expect(net.treeEdges).toHaveLength(15);
    expect(net.cutEdges).toHaveLength(9);
  });

  it('reduceModulus lands in the standard fundamental domain', () => {
    const samples: [number, number][] = [
      [0.3, 1.04], [2.7, 0.4], [-3.1, 0.2], [0.49, 0.51],
    ];
    for (const tau of samples) {
      const [re, im] = reduceModulus(tau);
      expect(Math.abs(re)).toBeLessThanOrEqual(0.5 + 1e-9);
      expect(re * re + im * im).toBeGreaterThanOrEqual(1 - 1e-9);
      expect(im).toBeGreaterThan(0);
    }
  });

  it('reduceModulusWithMatrix returns the SL(2,ℤ) element realizing the reduction', () => {
    const samples: [number, number][] = [
      [0.3, 1.04], [2.7, 0.4], [-3.1, 0.2], [0.49, 0.51], [0.123, 0.077],
    ];
    for (const tau of samples) {
      const { tau: tauHat, m } = reduceModulusWithMatrix(tau);
      // same reduction as reduceModulus
      const plain = reduceModulus(tau);
      expect(tauHat[0]).toBeCloseTo(plain[0], 12);
      expect(tauHat[1]).toBeCloseTo(plain[1], 12);
      // m is an integer matrix with det 1, and applying it reproduces τ̂
      const [a, b, c, d] = m;
      for (const e of m) expect(Number.isInteger(e)).toBe(true);
      expect(a * d - b * c).toBe(1);
      const applied = applyMobius(m, tau);
      expect(applied[0]).toBeCloseTo(tauHat[0], 10);
      expect(applied[1]).toBeCloseTo(tauHat[1], 10);
    }
  });
});
