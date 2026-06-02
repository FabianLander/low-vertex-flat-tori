import { describe, it, expect } from 'vitest';
import { modulus, reduceModulus, developNet } from './develop';
import { totalArea } from './energies/cellMargin';
import { latticeLayout } from './latticeLayout';
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

  it('lattice developAttach unfolds the metric net with the abstract net\'s gluing', () => {
    // Regression: the developed net must glue triangles the same way the abstract
    // lattice picture does (else the develop animation desyncs from the left
    // panel). Every tree edge must be COINCIDENT in the hexagonal domain.
    const L = latticeLayout(RICH);
    const attach = L.developAttach(RICH.developOrder);
    expect(attach[9].parent).toBe(6); // the canonical case: T9 sits beside T6, not T14

    const tiles = L.hexDomain();
    const byId = new Map(tiles.map((t) => [t.id, t]));
    const latOf = (t: number, g: number) => byId.get(t)!.lat[RICH.triangles[t].indexOf(g)];
    const net = developNet(RICH, RICH_REFERENCE.positions, attach);
    for (const { t, parent, edge } of net.steps) {
      if (parent < 0) continue;
      const [u, v] = edge;
      // shared edge endpoints land on the same lattice point in both triangles
      expect(latOf(t, u)).toEqual(latOf(parent, u));
      expect(latOf(t, v)).toEqual(latOf(parent, v));
    }
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
});
