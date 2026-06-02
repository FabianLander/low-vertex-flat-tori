import { describe, it, expect } from 'vitest';
import { modulus, reduceModulus, developNet } from './develop';
import { totalArea } from './energies/cellMargin';
import { RICH_REFERENCE } from './reference';

describe('develop → modulus τ', () => {
  it('Rich: covolume = intrinsic area (unit-index basis) and holonomy is a pure translation', () => {
    const m = modulus(RICH_REFERENCE.positions);
    expect(m.rotDefect).toBeLessThan(1e-9);             // flat ⟹ no rotational holonomy
    expect(m.covolume).toBeCloseTo(m.area, 6);          // generators form a unit-index basis
    expect(m.covolume).toBeCloseTo(totalArea(RICH_REFERENCE.positions), 6);
    expect(m.tau[1]).toBeGreaterThan(0);                // τ ∈ ℍ
  });

  it('developed net has 16 triangles, 15 tree edges, 9 cut edges', () => {
    const net = developNet(RICH_REFERENCE.positions);
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
});
