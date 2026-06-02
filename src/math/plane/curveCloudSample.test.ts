import { describe, it, expect } from 'vitest';
import { makePolyline } from './curve';
import { sampleAlongCurve, type CloudPoint } from './curveCloudSample';
import { dist } from './vec2';
import type { Vec2 } from './vec2';

// A non-trivial payload, to exercise the provenance round-trip.
type Src = { id: number; kind: 'near' | 'bg' };

describe('sampleAlongCurve (N points, nearest cloud point each)', () => {
  // Curve: the x-axis from 0 to 10 (length 10). 11 sample points at x = 0..10.
  const curve = makePolyline([[0, 0], [10, 0]]);

  const cloud: CloudPoint<Src>[] = [];
  let id = 0;
  for (let x = 0; x <= 10; x += 0.5) {
    if (x > 3.5 && x < 6.5) continue;                 // sparse stretch ⟹ gaps
    cloud.push({ p: [x, 0.1] as Vec2, payload: { id: id++, kind: 'near' } });
  }
  for (let x = 0; x <= 10; x += 1) {
    cloud.push({ p: [x, 3] as Vec2, payload: { id: id++, kind: 'bg' } }); // far off the curve
  }

  const opts = { count: 11, maxDist: 0.5 } as const;
  const res = sampleAlongCurve(curve, cloud, opts);

  it('sample points are evenly spaced in arclength', () => {
    expect(res.spacing).toBeCloseTo(1, 12);
    for (let i = 0; i < res.samples.length; i++) {
      const m = res.samples[i];
      if (m) expect(m.s).toBeCloseTo(i * 1, 12);
    }
  });

  it('each match is the nearest cloud point to its sample point, within the tube', () => {
    for (const m of res.matches) {
      expect(m.dist).toBeLessThanOrEqual(0.5);              // inside the tube
      expect(m.payload.kind).toBe('near');                  // background excluded
      // nothing in the cloud is closer to this point on the curve
      for (const c of cloud) {
        expect(dist(c.p, m.curvePoint)).toBeGreaterThanOrEqual(m.dist - 1e-12);
      }
    }
  });

  it('a sample point whose nearest cloud point is beyond maxDist is a gap', () => {
    expect(res.gaps.length).toBeGreaterThan(0);
    expect(res.gaps).toContain(5);                          // x = 5 has no near point within 0.5
    for (const g of res.gaps) expect(res.samples[g]).toBeNull();
  });
});
