import { describe, it, expect } from 'vitest';
import { ALL_TORI } from '../tori';
import { newtonFlatten } from './newton';
import { maxConeDeficit } from './angles';
import { modulus } from './develop';
import { mulberry32 } from './perturb';

/**
 * End-to-end Teichmüller pipeline, per torus (the headline deliverable):
 *
 *   random x → newtonFlatten(t, x) → modulus(t, x) → τ ∈ ℍ
 *
 * Newton flattens the intrinsic metric of ANY torus (independent of
 * embeddedness), so each combinatorial type — not just Rich's #7 — yields a
 * genuine flat torus whose point in Teichmüller space we can read off. The
 * checks below are exactly the develop-plan's correctness gates:
 *   - rotDefect ≈ 0      ⟺ holonomy is a pure translation ⟺ the metric is flat
 *   - covolume ≈ area    ⟺ t.generatorLoops is a unit-index H₁ basis and the
 *                          developing map is consistent
 *   - Im τ > 0           ⟺ τ lands in the upper half-plane
 */
describe('per-torus Teichmüller pipeline (flatten → develop → τ)', () => {
  for (const torus of ALL_TORI) {
    it(`#${torus.id} ${torus.name}: a random flat realization has a well-defined τ`, () => {
      const N = torus.vertexCount * 3;
      const rng = mulberry32(1000 + torus.id);

      // Try a few random seeds; take the first that flattens to a non-degenerate
      // (positive-area) flat torus. Newton is a projection, not a global solver,
      // so an occasional seed may diverge/collapse — that is expected.
      let flattened: Float64Array | null = null;
      for (let attempt = 0; attempt < 12 && !flattened; attempt++) {
        const x = new Float64Array(N);
        for (let i = 0; i < N; i++) x[i] = (rng() * 2 - 1);
        const r = newtonFlatten(torus, x, { tolerance: 1e-12, maxIters: 100 });
        if (r.status === 'converged' && maxConeDeficit(torus, x) < 1e-7) {
          const m = modulus(torus, x);
          if (m.area > 1e-3) flattened = x;
        }
      }
      expect(flattened, 'newtonFlatten produced a non-degenerate flat realization').not.toBeNull();

      const m = modulus(torus, flattened!);
      expect(m.rotDefect).toBeLessThan(1e-6);                 // flat ⟹ pure-translation holonomy
      expect(Math.abs(m.covolume - m.area) / m.area).toBeLessThan(1e-6); // unit-index basis
      expect(m.tau[1]).toBeGreaterThan(0);                    // τ ∈ ℍ
    });
  }
});
