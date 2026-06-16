import { describe, it, expect } from 'vitest';
import { newtonFlatten } from './newton';
import { maxConeDeficit, coneAngleDeficits, coneAngleJacobian } from './angles';
import { modulus, reduceModulus, reduceModulusWithMatrix, applyMobius } from './develop';
import { RICH_REFERENCE } from './reference';
import { mulberry32 } from './perturb';
import { RICH } from '../tori';

const VERTEX_COUNT = RICH.vertexCount;
const N = VERTEX_COUNT * 3;

describe('coneAngleJacobian (analytic ∂R/∂x)', () => {
  it('matches central finite differences row-by-row', () => {
    const rng = mulberry32(17);
    for (let trial = 0; trial < 10; trial++) {
      // A generic (non-flat) config so the Jacobian is nondegenerate.
      const p = Float64Array.from(RICH_REFERENCE.positions, (v) => v + 0.1 * (rng() * 2 - 1));
      const J = new Float64Array(VERTEX_COUNT * N);
      coneAngleJacobian(RICH, p, J);

      const h = 1e-7;
      const Fp = new Float64Array(VERTEX_COUNT);
      const Fm = new Float64Array(VERTEX_COUNT);
      for (let c = 0; c < N; c++) {
        const saved = p[c];
        p[c] = saved + h; coneAngleDeficits(RICH, p, Fp);
        p[c] = saved - h; coneAngleDeficits(RICH, p, Fm);
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
    coneAngleJacobian(RICH, p, J);
    for (let c = 0; c < N; c++) {
      let colSum = 0;
      for (let r = 0; r < VERTEX_COUNT; r++) colSum += J[r * N + c];
      expect(Math.abs(colSum)).toBeLessThan(1e-9);
    }
  });
});

describe('newtonFlatten (K=7 projection onto the flat manifold)', () => {
  it('rejects wrong-length input', () => {
    expect(() => newtonFlatten(RICH, new Float64Array(23))).toThrow();
  });

  it('is a no-op on the already-flat Rich reference', () => {
    const x = Float64Array.from(RICH_REFERENCE.positions);
    const r = newtonFlatten(RICH, x);
    expect(r.status).toBe('converged');
    expect(r.residualNorm).toBeLessThan(1e-12);
  });

  it('flattens kicked seeds — and the dropped 8th vertex is flat too', () => {
    const rng = mulberry32(2024);
    for (let trial = 0; trial < 25; trial++) {
      const x = Float64Array.from(RICH_REFERENCE.positions);
      for (let i = 0; i < 24; i++) x[i] += 0.06 * (rng() * 2 - 1);
      const r = newtonFlatten(RICH, x);
      expect(r.status).toBe('converged');
      // Honest check over ALL 8 vertices: the constraint we dropped from the
      // solve must still be satisfied (Gauss–Bonnet guarantees it).
      expect(maxConeDeficit(RICH, x)).toBeLessThan(1e-9);
      const def = coneAngleDeficits(RICH, x);
      expect(Math.abs(def[7])).toBeLessThan(1e-9); // the dropped vertex
    }
  });

  it('reports max-iters without throwing when capped too low', () => {
    const x = Float64Array.from(RICH_REFERENCE.positions);
    for (let i = 0; i < 24; i++) x[i] += 0.5 * Math.sin(i);
    const r = newtonFlatten(RICH, x, { maxIters: 0 });
    expect(['max-iters', 'diverged']).toContain(r.status);
  });

  it('analytic (default) and FD converge to the same flat point', () => {
    const rng = mulberry32(2024);
    for (let trial = 0; trial < 25; trial++) {
      const seed = Float64Array.from(RICH_REFERENCE.positions, (v) => v + 0.06 * (rng() * 2 - 1));
      const xAn = Float64Array.from(seed);   // default = analytic
      const xFd = Float64Array.from(seed);
      const rAn = newtonFlatten(RICH, xAn);
      const rFd = newtonFlatten(RICH, xFd, { jacobian: 'fd' });
      expect(rAn.status).toBe('converged');
      expect(maxConeDeficit(RICH, xAn)).toBeLessThan(1e-9);
      // Min-norm projection is the same map, so both land on the same point.
      if (rFd.status === 'converged') {
        for (let i = 0; i < 24; i++) expect(Math.abs(xAn[i] - xFd[i])).toBeLessThan(1e-7);
      }
    }
  });
});

describe('newtonFlatten with extraConstraints', () => {
  it('drives an extra coordinate constraint to 0 alongside flatness', () => {
    const rng = mulberry32(7);
    for (let trial = 0; trial < 10; trial++) {
      const x = Float64Array.from(RICH_REFERENCE.positions, (v) => v + 0.05 * (rng() * 2 - 1));
      const target = x[0] + 0.02;
      const r = newtonFlatten(RICH, x, {
        extraConstraints: [{ label: 'x0', value: (p) => p[0] - target }],
      });
      expect(r.status).toBe('converged');
      expect(maxConeDeficit(RICH, x)).toBeLessThan(1e-9);
      expect(Math.abs(x[0] - target)).toBeLessThan(1e-9);
    }
  });

  it('projects onto the rectangular-modulus locus: flat AND Re τ̂ = 0', () => {
    const rng = mulberry32(99);
    let converged = 0;
    for (let trial = 0; trial < 10; trial++) {
      const x = Float64Array.from(RICH_REFERENCE.positions, (v) => v + 0.03 * (rng() * 2 - 1));
      // Freeze the SL(2,ℤ) chart at the seed so the constraint is smooth.
      const { m } = reduceModulusWithMatrix(modulus(RICH, x).tau);
      const r = newtonFlatten(RICH, x, {
        extraConstraints: [{ label: 'Re(g·τ)', value: (p) => applyMobius(m, modulus(RICH, p).tau)[0] }],
      });
      if (r.status !== 'converged') continue; // far seeds may legitimately fail
      converged++;
      expect(maxConeDeficit(RICH, x)).toBeLessThan(1e-9);
      expect(Math.abs(reduceModulus(modulus(RICH, x).tau)[0])).toBeLessThan(1e-9);
    }
    expect(converged).toBeGreaterThan(5);
  });

  it('with no extras, behaves exactly like the plain flattening', () => {
    const seed = Float64Array.from(RICH_REFERENCE.positions, (v) => v + 0.04 * Math.sin(7 * v));
    const xPlain = Float64Array.from(seed);
    const xEmpty = Float64Array.from(seed);
    const rPlain = newtonFlatten(RICH, xPlain);
    const rEmpty = newtonFlatten(RICH, xEmpty, { extraConstraints: [] });
    expect(rEmpty.status).toBe(rPlain.status);
    for (let i = 0; i < 24; i++) expect(xEmpty[i]).toBe(xPlain[i]);
  });
});

describe('newtonFlatten with frozenCoords', () => {
  it('holds frozen coordinates exactly fixed while flattening the rest', () => {
    const rng = mulberry32(31);
    const FROZEN = [5, 8, 11, 14, 17, 20];   // the six planar z-coords
    for (let trial = 0; trial < 10; trial++) {
      const x = Float64Array.from(RICH_REFERENCE.positions, (v) => v + 0.04 * (rng() * 2 - 1));
      const frozenEntry = FROZEN.map((c) => x[c]);
      const r = newtonFlatten(RICH, x, { frozenCoords: FROZEN });
      if (r.status !== 'converged') continue;
      // Frozen coords are byte-for-byte unchanged (no step ever touches them).
      FROZEN.forEach((c, i) => expect(x[c]).toBe(frozenEntry[i]));
    }
  });

  it('default (no frozenCoords) is identical to passing an empty list', () => {
    const seed = Float64Array.from(RICH_REFERENCE.positions, (v) => v + 0.03 * Math.cos(5 * v));
    const xa = Float64Array.from(seed);
    const xb = Float64Array.from(seed);
    newtonFlatten(RICH, xa);
    newtonFlatten(RICH, xb, { frozenCoords: [] });
    for (let i = 0; i < 24; i++) expect(xb[i]).toBe(xa[i]);
  });

  it('composes with extraConstraints (freeze a column AND satisfy an extra row)', () => {
    const rng = mulberry32(53);
    const FROZEN = [5, 8, 11, 14, 17, 20];
    let converged = 0;
    for (let trial = 0; trial < 10; trial++) {
      const x = Float64Array.from(RICH_REFERENCE.positions, (v) => v + 0.03 * (rng() * 2 - 1));
      for (const c of FROZEN) x[c] = 0;
      const target = x[0] + 0.015;
      const r = newtonFlatten(RICH, x, {
        frozenCoords: FROZEN,
        extraConstraints: [{ label: 'x0', value: (p) => p[0] - target }],
      });
      if (r.status !== 'converged') continue;
      converged++;
      expect(maxConeDeficit(RICH, x)).toBeLessThan(1e-9);
      expect(Math.abs(x[0] - target)).toBeLessThan(1e-9);  // extra row satisfied
      for (const c of FROZEN) expect(x[c]).toBe(0);          // column stayed frozen
    }
    expect(converged).toBeGreaterThan(5);
  });
});
