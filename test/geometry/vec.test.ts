import { describe, it, expect } from 'vitest';
import { det2 } from '@core/geometry/vec2.ts';
import { det3, cross } from '@core/geometry/vec3.ts';

describe('det2', () => {
  it('= the 2×2 determinant / signed parallelogram area; CCW positive', () => {
    expect(det2([1, 0], [0, 1])).toBeCloseTo(1, 12);    // unit square, CCW
    expect(det2([0, 1], [1, 0])).toBeCloseTo(-1, 12);   // reversed
    expect(det2([2, 0], [3, 0])).toBeCloseTo(0, 12);    // collinear
  });
});

describe('det3', () => {
  it('= a·(b×c); the unit box gives 1, reversed pair flips sign', () => {
    expect(det3([1, 0, 0], [0, 1, 0], [0, 0, 1])).toBeCloseTo(1, 12);
    expect(det3([1, 0, 0], [0, 0, 1], [0, 1, 0])).toBeCloseTo(-1, 12);
  });
  it('is 0 for coplanar vectors', () => {
    expect(det3([1, 0, 0], [0, 1, 0], [1, 1, 0])).toBeCloseTo(0, 12);
  });
  it('agrees with dot(a, cross(b,c))', () => {
    const a: [number, number, number] = [0.3, -1.1, 0.7];
    const b: [number, number, number] = [1.2, 0.4, -0.6];
    const c: [number, number, number] = [-0.5, 0.9, 1.3];
    const bc = cross(b, c);
    expect(det3(a, b, c)).toBeCloseTo(a[0] * bc[0] + a[1] * bc[1] + a[2] * bc[2], 12);
  });
});
