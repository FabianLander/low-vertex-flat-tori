import { describe, it, expect } from 'vitest';
import { makeCurve, makePolyline } from './curve';
import type { Vec2 } from './vec2';

describe('PlaneCurve', () => {
  it('straight line: length, projection, uniform spacing', () => {
    const line = makePolyline([[0, 0], [1, 0]]);
    expect(line.length).toBeCloseTo(1, 12);

    const pr = line.project([0.5, 0.5]);
    expect(pr.s).toBeCloseTo(0.5, 12);
    expect(pr.dist).toBeCloseTo(0.5, 12);
    expect(pr.foot[0]).toBeCloseTo(0.5, 12);
    expect(pr.foot[1]).toBeCloseTo(0, 12);

    // off-the-end point clamps to the nearer endpoint
    const off = line.project([-1, 0]);
    expect(off.s).toBeCloseTo(0, 12);
    expect(off.dist).toBeCloseTo(1, 12);

    const u = line.uniform(5);
    for (let i = 0; i < 5; i++) expect(u[i].s).toBeCloseTo(i * 0.25, 12);
    expect(u[2].p[0]).toBeCloseTo(0.5, 12);
  });

  it('closed unit circle: length ≈ 2π, wrap, projection to the rim', () => {
    const circle = makeCurve((t) => [Math.cos(2 * Math.PI * t), Math.sin(2 * Math.PI * t)] as Vec2,
      { samples: 4000, closed: true });
    expect(circle.length).toBeCloseTo(2 * Math.PI, 2); // polyline underestimates slightly
    expect(circle.closed).toBe(true);

    // a point outside the circle projects to the rim at distance ≈ |p|−1
    const pr = circle.project([2, 0]);
    expect(pr.dist).toBeCloseTo(1, 2);
    expect(pr.foot[0]).toBeCloseTo(1, 2);
    expect(pr.foot[1]).toBeCloseTo(0, 2);

    // arclength wraps for a closed curve
    const a = circle.pointAt(0.1);
    const b = circle.pointAt(circle.length + 0.1);
    expect(b[0]).toBeCloseTo(a[0], 9);
    expect(b[1]).toBeCloseTo(a[1], 9);
  });

  it('uniform(n) is equally spaced in arclength on a non-uniform polyline', () => {
    // segments of length 1, 2, 1 — arclength uniform must cross them evenly
    const c = makePolyline([[0, 0], [1, 0], [3, 0], [4, 0]]);
    expect(c.length).toBeCloseTo(4, 12);
    const u = c.uniform(9);
    for (let i = 1; i < u.length; i++) {
      expect(u[i].s - u[i - 1].s).toBeCloseTo(0.5, 12); // 4 / 8
    }
  });
});
