import { describe, it, expect } from 'vitest';
import { ALL_TORI } from '../../src/triangulations';
import { project } from '../../src/solvers/project.ts';
import { flat, maxConeDeficit } from '../../src/constraints/flat.ts';
import { modulus } from '../../src/moduli/modulus';
import { mulberry32 } from '../../src/sampling/rng';

/**
 * End-to-end Teichmüller pipeline, per torus (the headline deliverable):
 *
 *   random x → project(x, [flat]) → modulus(t, x) → τ ∈ ℍ
 *
 * Projecting onto the flat manifold flattens the intrinsic metric of ANY torus
 * (independent of embeddedness), so each combinatorial type — not just Rich's #7 —
 * yields a genuine flat torus whose point in Teichmüller space we read off. The
 * checks are the develop-plan's correctness gates:
 *   - rotDefect ≈ 0      ⟺ holonomy is a pure translation ⟺ the metric is flat
 *   - covolume ≈ area    ⟺ the H₁ basis is unit-index and the developing map consistent
 *   - Im τ > 0           ⟺ τ lands in the upper half-plane
 */
describe('per-torus Teichmüller pipeline (flatten → develop → τ)', () => {
  for (const torus of ALL_TORI) {
    it(`#${torus.id} ${torus.name}: a random flat realization has a well-defined τ`, () => {
      const N = torus.vertexCount * 3;
      const rng = mulberry32(1000 + torus.id);

      // Try a few random seeds; take the first that projects to a non-degenerate
      // (positive-area) flat torus. project is a corrector, not a global solver, so
      // an occasional seed may diverge/collapse — expected.
      let flattened: Float64Array | null = null;
      for (let attempt = 0; attempt < 12 && !flattened; attempt++) {
        const x = new Float64Array(N);
        for (let i = 0; i < N; i++) x[i] = (rng() * 2 - 1);
        const r = project(x, [flat(torus)], { tolerance: 1e-12, maxIters: 100 });
        if (r.status === 'converged' && maxConeDeficit(torus, x) < 1e-7) {
          const m = modulus(torus, x);
          if (m.area > 1e-3) flattened = x;
        }
      }
      expect(flattened, 'project produced a non-degenerate flat realization').not.toBeNull();

      const m = modulus(torus, flattened!);
      expect(m.rotDefect).toBeLessThan(1e-6);                 // flat ⟹ pure-translation holonomy
      expect(Math.abs(m.covolume - m.area) / m.area).toBeLessThan(1e-6); // unit-index basis
      expect(m.tau[1]).toBeGreaterThan(0);                    // τ ∈ ℍ
    });
  }
});
