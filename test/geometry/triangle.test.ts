import { describe, it, expect } from 'vitest';
import {
  cornerAngle, cornerAngleGrad, triangleNormal, triangleArea,
  triangleSignedArea2, signedVolume6, planeCutRatio,
} from '@core/geometry/triangle.ts';
import type { Vec3 } from '@core/geometry/vec3.ts';

describe('cornerAngle', () => {
  it('right angle at the apex of (origin, +x, +y) is π/2', () => {
    expect(cornerAngle(0, 0, 0, 1, 0, 0, 0, 1, 0)).toBeCloseTo(Math.PI / 2, 12);
  });
  it('equal arms 60° apart → π/3', () => {
    expect(cornerAngle(0, 0, 0, 1, 0, 0, 0.5, Math.sqrt(3) / 2, 0)).toBeCloseTo(Math.PI / 3, 12);
  });
});

describe('cornerAngleGrad', () => {
  it('matches central finite differences of cornerAngle (all 9 coords)', () => {
    // a generic, non-degenerate corner in 3D
    const P = [0.2, -0.1, 0.4, 1.1, 0.3, -0.2, -0.3, 0.9, 0.7];
    const ga: Vec3 = [0, 0, 0], gb: Vec3 = [0, 0, 0], gc: Vec3 = [0, 0, 0];
    const ok = cornerAngleGrad(P[0], P[1], P[2], P[3], P[4], P[5], P[6], P[7], P[8], ga, gb, gc);
    expect(ok).toBe(true);
    const analytic = [...ga, ...gb, ...gc];

    const h = 1e-6;
    const f = (q: number[]) => cornerAngle(q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7], q[8]);
    for (let i = 0; i < 9; i++) {
      const qp = [...P], qm = [...P];
      qp[i] += h; qm[i] -= h;
      const fd = (f(qp) - f(qm)) / (2 * h);
      expect(analytic[i]).toBeCloseTo(fd, 6);
    }
  });

  it('returns false (skip) for a degenerate/collinear corner', () => {
    const ga: Vec3 = [9, 9, 9], gb: Vec3 = [9, 9, 9], gc: Vec3 = [9, 9, 9];
    // arms b−a and c−a parallel ⟹ zero area
    const ok = cornerAngleGrad(0, 0, 0, 1, 0, 0, 2, 0, 0, ga, gb, gc);
    expect(ok).toBe(false);
    expect(ga).toEqual([9, 9, 9]); // outs left untouched
  });
});

describe('triangleNormal', () => {
  it('is unit-length and perpendicular to both edges', () => {
    const n: Vec3 = [0, 0, 0];
    triangleNormal(0, 0, 0, 1.3, 0.2, -0.4, -0.1, 0.9, 0.6, n);
    expect(Math.hypot(n[0], n[1], n[2])).toBeCloseTo(1, 12);
    const e1 = [1.3, 0.2, -0.4], e2 = [-0.1, 0.9, 0.6];
    expect(n[0] * e1[0] + n[1] * e1[1] + n[2] * e1[2]).toBeCloseTo(0, 12);
    expect(n[0] * e2[0] + n[1] * e2[1] + n[2] * e2[2]).toBeCloseTo(0, 12);
  });
});

describe('triangleArea', () => {
  it('right triangle with legs 3,4 has area 6', () => {
    expect(triangleArea(0, 0, 0, 3, 0, 0, 0, 4, 0)).toBeCloseTo(6, 12);
  });
});

describe('triangleSignedArea2', () => {
  it('CCW positive, CW negative, magnitude = 2·area', () => {
    expect(triangleSignedArea2(0, 0, 1, 0, 0, 1)).toBeCloseTo(1, 12);   // 2·(½) = 1
    expect(triangleSignedArea2(0, 0, 0, 1, 1, 0)).toBeCloseTo(-1, 12);  // reversed winding
  });
});

describe('signedVolume6', () => {
  it('= a·(b×c); unit box corner gives 1', () => {
    expect(signedVolume6(1, 0, 0, 0, 1, 0, 0, 0, 1)).toBeCloseTo(1, 12);
  });
});

describe('planeCutRatio', () => {
  it('plane through a median splits a triangle (ratio in (0, 0.5])', () => {
    // triangle (0,0,0),(2,0,0),(0,2,0); plane x = 1 (normal +x, ref (1,0,0)) cuts it
    const r = planeCutRatio(0, 0, 0, 2, 0, 0, 0, 2, 0, 1, 0, 0, 1, 0, 0);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThanOrEqual(0.5);
  });
  it('is 0 when the plane misses the triangle (all vertices one side)', () => {
    const r = planeCutRatio(0, 0, 0, 2, 0, 0, 0, 2, 0, 1, 0, 0, -1, 0, 0); // plane x = −1
    expect(r).toBe(0);
  });
});
