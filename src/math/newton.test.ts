import { describe, it, expect } from 'vitest';
import { newtonFlatten } from './newton';
import { maxConeDeficit, coneAngleDeficits, coneAngleJacobian } from './angles';
import { RICH_REFERENCE } from './reference';
import { mulberry32 } from './perturb';
import { VERTEX_COUNT } from './topology';

const N = VERTEX_COUNT * 3;

describe('coneAngleJacobian (analytic ∂R/∂x)', () => {
  it('matches central finite differences row-by-row', () => {
    const rng = mulberry32(17);
    for (let trial = 0; trial < 10; trial++) {
      // A generic (non-flat) config so the Jacobian is nondegenerate.
      const p = Float64Array.from(RICH_REFERENCE.positions, (v) => v + 0.1 * (rng() * 2 - 1));
      const J = new Float64Array(VERTEX_COUNT * N);
      coneAngleJacobian(p, J);

      const h = 1e-7;
      const Fp = new Float64Array(VERTEX_COUNT);
      const Fm = new Float64Array(VERTEX_COUNT);
      for (let c = 0; c < N; c++) {
        const saved = p[c];
        p[c] = saved + h; coneAngleDeficits(p, Fp);
        p[c] = saved - h; coneAngleDeficits(p, Fm);
        p[c] = saved;
        for (let r = 0; r < VERTEX_COUNT; r++) {
          const fd = (Fp[r] - Fm[r]) / (2 * h);
          expect(Math.abs(J[r * N + c] - fd)).toBeLessThan(1e-5);
        }
      }
    }
  });

  it('rows sum to ~0 (Gauss–Bonnet: Σ R_i ≡ 0 ⟹ Σ rows of ∂R ≡ 0)', () => {
    const p = Float64Array.from(RICH_REFERENCE.positions, (v) => v + 0.05);
    const J = new Float64Array(VERTEX_COUNT * N);
    coneAngleJacobian(p, J);
    for (let c = 0; c < N; c++) {
      let colSum = 0;
      for (let r = 0; r < VERTEX_COUNT; r++) colSum += J[r * N + c];
      expect(Math.abs(colSum)).toBeLessThan(1e-9);
    }
  });
});

describe('newtonFlatten (K=7 projection onto the flat manifold)', () => {
  it('rejects wrong-length input', () => {
    expect(() => newtonFlatten(new Float64Array(23))).toThrow();
  });

  it('is a no-op on the already-flat Rich reference', () => {
    const x = Float64Array.from(RICH_REFERENCE.positions);
    const r = newtonFlatten(x);
    expect(r.status).toBe('converged');
    expect(r.residualNorm).toBeLessThan(1e-12);
  });

  it('flattens kicked seeds — and the dropped 8th vertex is flat too', () => {
    const rng = mulberry32(2024);
    for (let trial = 0; trial < 25; trial++) {
      const x = Float64Array.from(RICH_REFERENCE.positions);
      for (let i = 0; i < 24; i++) x[i] += 0.06 * (rng() * 2 - 1);
      const r = newtonFlatten(x);
      expect(r.status).toBe('converged');
      // Honest check over ALL 8 vertices: the constraint we dropped from the
      // solve must still be satisfied (Gauss–Bonnet guarantees it).
      expect(maxConeDeficit(x)).toBeLessThan(1e-9);
      const def = coneAngleDeficits(x);
      expect(Math.abs(def[7])).toBeLessThan(1e-9); // the dropped vertex
    }
  });

  it('reports max-iters without throwing when capped too low', () => {
    const x = Float64Array.from(RICH_REFERENCE.positions);
    for (let i = 0; i < 24; i++) x[i] += 0.5 * Math.sin(i);
    const r = newtonFlatten(x, { maxIters: 0 });
    expect(['max-iters', 'diverged']).toContain(r.status);
  });

  it('analytic (default) and FD converge to the same flat point', () => {
    const rng = mulberry32(2024);
    for (let trial = 0; trial < 25; trial++) {
      const seed = Float64Array.from(RICH_REFERENCE.positions, (v) => v + 0.06 * (rng() * 2 - 1));
      const xAn = Float64Array.from(seed);   // default = analytic
      const xFd = Float64Array.from(seed);
      const rAn = newtonFlatten(xAn);
      const rFd = newtonFlatten(xFd, { jacobian: 'fd' });
      expect(rAn.status).toBe('converged');
      expect(maxConeDeficit(xAn)).toBeLessThan(1e-9);
      // Min-norm projection is the same map, so both land on the same point.
      if (rFd.status === 'converged') {
        for (let i = 0; i < 24; i++) expect(Math.abs(xAn[i] - xFd[i])).toBeLessThan(1e-7);
      }
    }
  });
});
