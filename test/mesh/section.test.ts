import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { makeSection, perimeter, area } from '@display/mesh/section';
import { RICH_REFERENCE } from '@core/sampling/reference';
import { RICH } from '@core/triangulations';

/** Bounding-box center of the V vertices. */
function centroid(p: ArrayLike<number>, V: number): THREE.Vector3 {
  const c = new THREE.Vector3();
  for (let v = 0; v < V; v++) c.add(new THREE.Vector3(p[3 * v], p[3 * v + 1], p[3 * v + 2]));
  return c.multiplyScalar(1 / V);
}

describe('section — plane ∩ realization → ordered loops', () => {
  const pos = RICH_REFERENCE.positions;
  const section = makeSection(RICH);

  it('a plane through the interior produces ≥1 closed loop, every vertex ON the plane', () => {
    // a generic normal (avoid a vertex landing exactly on the plane)
    const n = new THREE.Vector3(0.31, 0.52, 0.79).normalize();
    const c = centroid(pos, RICH.vertexCount);
    const plane = new THREE.Plane(n, -n.dot(c));   // n·x + d = 0 through the centroid

    const loops = section.loops(pos, plane);
    expect(loops.length).toBeGreaterThanOrEqual(1);

    for (const loop of loops) {
      expect(loop.length).toBeGreaterThanOrEqual(3);   // a real polygon
      for (const pt of loop) expect(Math.abs(plane.distanceToPoint(pt))).toBeLessThan(1e-9);
      expect(perimeter(loop)).toBeGreaterThan(0);
      expect(area(loop)).toBeGreaterThanOrEqual(0);
    }
  });

  it('a plane far outside the torus produces no loops', () => {
    const c = centroid(pos, RICH.vertexCount);
    let maxR = 0;
    for (let v = 0; v < RICH.vertexCount; v++) {
      maxR = Math.max(maxR, new THREE.Vector3(pos[3 * v], pos[3 * v + 1], pos[3 * v + 2]).distanceTo(c));
    }
    const n = new THREE.Vector3(0, 0, 1);
    const plane = new THREE.Plane(n, -(n.dot(c) + maxR * 10));   // way past the surface
    expect(section.loops(pos, plane).length).toBe(0);
  });
});
