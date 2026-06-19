import { describe, it, expect } from 'vitest';
import { ALL_TORI } from '@core/triangulations';
import { edgeKey } from '@core/topology/triangulation';
import { harmonicLayout } from '@core/topology/harmonicLayout';
import { exactMinCutDomain } from '@core/topology/fundamentalDomain';
import { canonicalMarking } from '@core/topology/marking';

describe('canonicalMarking (minimal-domain marking, all tori)', () => {
  for (const torus of ALL_TORI) {
    const F = torus.triangles.length;

    it(`${torus.id} ${torus.name}: developOrder is a permutation of 0..${F - 1}`, () => {
      const { developOrder } = canonicalMarking(torus);
      expect(developOrder).toHaveLength(F);
      expect([...developOrder].sort((a, b) => a - b)).toEqual(Array.from({ length: F }, (_, i) => i));
    });

    it(`${torus.id}: domain is provably minimal (exterior = 10, cut = 5)`, () => {
      const ex = exactMinCutDomain(torus, harmonicLayout(torus));
      expect(ex.exterior).toBe(10);
      expect(ex.cut).toHaveLength(5);
    });

    it(`${torus.id}: loops are closed edge-walks forming a unit-index H₁ basis`, () => {
      const layout = harmonicLayout(torus);
      const { loops } = canonicalMarking(torus);
      expect(loops).toHaveLength(2);

      // closed walks along genuine edges
      for (const loop of loops) {
        expect(loop[0]).toBe(loop[loop.length - 1]);
        for (let k = 0; k + 1 < loop.length; k++) {
          expect(torus.edgeToTris.has(edgeKey(loop[k], loop[k + 1]))).toBe(true);
        }
      }

      // each loop's class in the period basis = Σ jump; |det| = 1 ⟺ unit index
      const cls = loops.map((loop) => {
        let n = 0, m = 0;
        for (let k = 0; k + 1 < loop.length; k++) { const [a, b] = layout.jump(loop[k], loop[k + 1]); n += a; m += b; }
        return [n, m] as const;
      });
      const det = cls[0][0] * cls[1][1] - cls[0][1] * cls[1][0];
      expect(Math.abs(det)).toBe(1);
    });

    it(`${torus.id}: the loaded marking equals the freshly-computed canonical one`, () => {
      const fresh = canonicalMarking(torus);
      expect([...torus.marking.developOrder]).toEqual(fresh.developOrder);
      expect(torus.marking.cut).toEqual(fresh.cut);
      expect(torus.marking.loops).toEqual(fresh.loops);
    });
  }
});
