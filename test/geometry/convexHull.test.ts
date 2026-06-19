import { describe, it, expect } from 'vitest';
import { supportMargin, interiorVertexMask } from '@core/geometry/convexHull.ts';
import type { Vec3 } from '@core/geometry/vec3.ts';

describe('supportMargin / interiorVertexMask', () => {
  it('tetrahedron + centroid: the 4 corners are hull vertices, the centroid is interior', () => {
    const c: Vec3 = [
      (1 + (-1) + (-1) + 1) / 4,
      (1 + (-1) + 1 + (-1)) / 4,
      (1 + 1 + (-1) + (-1)) / 4,
    ]; // = [0,0,0]
    const pts: Vec3[] = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1], c];
    const mask = interiorVertexMask(pts);
    expect(mask).toEqual([false, false, false, false, true]);
    // signs of the raw margins
    for (let i = 0; i < 4; i++) expect(supportMargin(pts, i)).toBeGreaterThan(0);
    expect(supportMargin(pts, 4)).toBeLessThan(0);
  });

  it('cube: all 8 corners on the hull, the center interior', () => {
    const pts: Vec3[] = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) pts.push([x, y, z]);
    pts.push([0, 0, 0]);
    const mask = interiorVertexMask(pts);
    expect(mask.slice(0, 8)).toEqual(Array(8).fill(false));
    expect(mask[8]).toBe(true);
  });

  it('a point flush with a hull face reads as boundary (margin ≈ 0), not interior', () => {
    // square base in z=0, apex above; a 5th base point at the centre of the base face.
    const pts: Vec3[] = [
      [1, 1, 0], [-1, 1, 0], [-1, -1, 0], [1, -1, 0],
      [0, 0, 1],          // apex
      [0, 0, 0],          // centre of the z=0 face — on ∂H, not interior
    ];
    expect(Math.abs(supportMargin(pts, 5))).toBeLessThan(1e-3);
    expect(interiorVertexMask(pts)[5]).toBe(false);
  });

  it('an off-centre interior point is still detected', () => {
    const pts: Vec3[] = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1], [0.3, -0.2, 0.1]];
    expect(supportMargin(pts, 4)).toBeLessThan(0);
    expect(interiorVertexMask(pts)[4]).toBe(true);
  });
});
