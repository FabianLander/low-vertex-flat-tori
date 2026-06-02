import { describe, it, expect } from 'vitest';
import { ALL_TORI, RICH } from '../tori/index';
import { harmonicLayout, tileSignedArea2, windingNet } from './harmonicLayout';

describe('harmonic winding develop net (abstract net, all tori)', () => {
  for (const torus of ALL_TORI) {
    it(`#${torus.id} ${torus.name}: a connected, non-degenerate winding spanning tree`, () => {
      const net = windingNet(torus, harmonicLayout(torus)); // throws if domain not coincident-connected
      expect(net.tiles).toHaveLength(16);
      expect([...net.order].sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, i) => i));
      // root first, every later triangle glued onto an already-placed neighbor
      expect(net.steps[0].parent).toBe(-1);
      net.order.forEach((_, i) => {
        if (i > 0) expect(net.steps[i].parent).toBeGreaterThanOrEqual(0);
      });
      // non-degenerate triangles
      for (const tile of net.tiles) expect(Math.abs(tileSignedArea2(tile.corners))).toBeGreaterThan(1e-9);
    });
  }
});

describe('harmonic lattice-patch embedding', () => {
  it('every torus develops flip-free (all 16 triangles same orientation)', () => {
    for (const torus of ALL_TORI) {
      const L = harmonicLayout(torus);
      expect(L.tiles).toHaveLength(16);
      const areas = L.tiles.map((t) => tileSignedArea2(t.corners));
      expect(areas.every((a) => a > 1e-9)).toBe(true); // positively oriented, non-degenerate
    }
  });

  it('Rich (#7, degree-6-regular) comes out equilateral', () => {
    const L = harmonicLayout(RICH);
    const lens: number[] = [];
    for (const t of L.tiles) for (const [p, q] of [[0, 1], [1, 2], [2, 0]] as const) {
      lens.push(Math.hypot(t.corners[q][0] - t.corners[p][0], t.corners[q][1] - t.corners[p][1]));
    }
    const ratio = Math.max(...lens) / Math.min(...lens);
    expect(ratio).toBeCloseTo(1, 2); // all edges equal ⟹ equilateral lattice
  });

  it('non-regular tori are genuinely distorted (not equilateral)', () => {
    for (const torus of ALL_TORI.filter((t) => t.id !== 7)) {
      const L = harmonicLayout(torus);
      const lens: number[] = [];
      for (const t of L.tiles) for (const [p, q] of [[0, 1], [1, 2], [2, 0]] as const) {
        lens.push(Math.hypot(t.corners[q][0] - t.corners[p][0], t.corners[q][1] - t.corners[p][1]));
      }
      expect(Math.max(...lens) / Math.min(...lens)).toBeGreaterThan(1.05);
    }
  });
});
