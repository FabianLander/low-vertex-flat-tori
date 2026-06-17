import { describe, it, expect } from 'vitest';
import {
  pointPointDist2, pointSegmentDist2, pointTriangleDist2,
  segmentSegmentDist2, triangleTriangleDist2,
} from './distance';

describe('distance primitives (all return SQUARED distance)', () => {
  it('point–point', () => {
    expect(pointPointDist2(0, 0, 0, 3, 4, 0)).toBeCloseTo(25, 12);
  });

  it('point–segment: foot inside, and clamped past each end', () => {
    // segment along x from (0,0,0) to (2,0,0)
    expect(pointSegmentDist2(1, 1, 0, 0, 0, 0, 2, 0, 0)).toBeCloseTo(1, 12); // perpendicular
    expect(pointSegmentDist2(-1, 0, 0, 0, 0, 0, 2, 0, 0)).toBeCloseTo(1, 12); // past start
    expect(pointSegmentDist2(5, 0, 0, 0, 0, 0, 2, 0, 0)).toBeCloseTo(9, 12);  // past end
  });

  it('point–triangle: above interior, vertex region, edge region', () => {
    // unit right triangle in z=0 plane
    const tri = [0, 0, 0, 1, 0, 0, 0, 1, 0] as const;
    // directly above the interior at height 2
    expect(pointTriangleDist2(0.25, 0.25, 2, ...tri)).toBeCloseTo(4, 12);
    // beyond the right-angle vertex
    expect(pointTriangleDist2(-1, -1, 0, ...tri)).toBeCloseTo(2, 12);
  });

  it('segment–segment: skew perpendicular lines offset in z', () => {
    // seg1 along x at z=0, seg2 along y at z=1, crossing in xy but 1 apart in z
    const d2 = segmentSegmentDist2(-1, 0, 0, 1, 0, 0, 0, -1, 1, 0, 1, 1);
    expect(d2).toBeCloseTo(1, 12);
  });

  it('triangle–triangle: two parallel triangles a known gap apart', () => {
    const A = [0, 0, 0, 1, 0, 0, 0, 1, 0] as const;
    const B = [0, 0, 3, 1, 0, 3, 0, 1, 3] as const;
    expect(triangleTriangleDist2(...A, ...B)).toBeCloseTo(9, 12);
  });
});
