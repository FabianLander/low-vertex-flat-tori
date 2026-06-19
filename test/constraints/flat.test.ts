import { describe, it, expect } from 'vitest';
import { coneAngles, coneAngleDeficits, maxConeDeficit, coneDeficit } from '@core/constraints/flat.ts';
import { RICH_REFERENCE } from '@core/sampling/reference.ts';
import { mulberry32 } from '@core/sampling/rng.ts';
import { RICH } from '@core/triangulations/index.ts';

const TWO_PI = Math.PI * 2;

describe('cone angles', () => {
  it('Rich reference is flat (every vertex ≈ 2π)', () => {
    expect(maxConeDeficit(RICH, RICH_REFERENCE.positions)).toBeLessThan(1e-12);
  });

  it('Gauss–Bonnet: Σ cone angles ≡ 16π for ANY positions (the V−1 identity)', () => {
    const rng = mulberry32(99);
    for (let trial = 0; trial < 50; trial++) {
      const p = new Float64Array(RICH.vertexCount * 3);
      for (let i = 0; i < p.length; i++) p[i] = (rng() * 2 - 1) * 3;
      const angles = coneAngles(RICH, p);
      let sum = 0;
      for (const a of angles) sum += a;
      expect(Math.abs(sum - 16 * Math.PI)).toBeLessThan(1e-10);

      const def = coneAngleDeficits(RICH, p);
      let dsum = 0;
      for (const d of def) dsum += d;
      expect(Math.abs(dsum)).toBeLessThan(1e-10);
    }
  });

  it('deficit = 2π − coneAngle, componentwise', () => {
    const p = RICH_REFERENCE.positions;
    const ang = coneAngles(RICH, p);
    const def = coneAngleDeficits(RICH, p);
    for (let i = 0; i < RICH.vertexCount; i++) {
      expect(def[i]).toBeCloseTo(TWO_PI - ang[i], 12);
    }
  });
});

describe('coneDeficit Fn', () => {
  const fn = coneDeficit(RICH);
  const V = RICH.vertexCount;
  const N = V * 3;

  it('value = the V deficits', () => {
    const p = RICH_REFERENCE.positions;
    const out = new Float64Array(V);
    fn.value(p, out);
    const ref = coneAngleDeficits(RICH, p);
    for (let i = 0; i < V; i++) expect(out[i]).toBeCloseTo(ref[i], 14);
    expect(fn.dim).toBe(V);
  });

  it('analytic jacobian matches central finite differences', () => {
    const rng = mulberry32(7);
    const p = new Float64Array(N);
    // A generic (non-flat) config so the Jacobian is well away from degeneracy.
    for (let i = 0; i < N; i++) p[i] = (rng() * 2 - 1);
    const J = new Float64Array(V * N);
    fn.jacobian(p, J);

    const h = 1e-6, vp = new Float64Array(V), vm = new Float64Array(V), q = new Float64Array(p);
    for (let col = 0; col < N; col++) {
      const saved = q[col];
      q[col] = saved + h; fn.value(q, vp);
      q[col] = saved - h; fn.value(q, vm);
      q[col] = saved;
      for (let r = 0; r < V; r++) {
        const fd = (vp[r] - vm[r]) / (2 * h);
        expect(J[r * N + col]).toBeCloseTo(fd, 5);
      }
    }
  });

  it('jacobian columns sum to ~0 (Gauss–Bonnet on ∂R: Σ_v ∂δ_v ≡ 0)', () => {
    const p = Float64Array.from(RICH_REFERENCE.positions, (v) => v + 0.05);
    const J = new Float64Array(V * N);
    fn.jacobian(p, J);
    for (let col = 0; col < N; col++) {
      let s = 0;
      for (let r = 0; r < V; r++) s += J[r * N + col];
      expect(Math.abs(s)).toBeLessThan(1e-9);
    }
  });
});
