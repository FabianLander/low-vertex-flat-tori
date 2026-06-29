import { describe, it, expect } from 'vitest';
import { dsScaffold, DS_ROLES } from '@core/coordinates/dsScaffold.ts';
import { RICH, byId } from '@core/triangulations/index.ts';
import { flat, maxConeDeficit } from '@core/constraints/flat.ts';
import { doyleSchwartzPositions } from '@core/search/doyleSchwartz.ts';
import { pullHeld } from '@core/search/pull.ts';
import { project } from '@core/solvers/project.ts';

const space = dsScaffold(RICH);
const { poles: [g0, g1], seg1, seg2 } = DS_ROLES;

/** A generic, non-degenerate θ (two spread segments, lifted poles). */
const sampleTheta = () => Float64Array.from([0.2, 1.5, 1.3, 1.2, 0.5, 0.4, 1.6, 0.45, -0.3, 1.25]);

/** Gauge-fix an ambient config into the model frame (pin1 → 0, pin2 → (1,0)); used to land
 *  a closed-form DS torus inside φ's image. Mirrors the helper in scripts/discover-ds.mjs. */
function gaugeFix(p: ArrayLike<number>): Float64Array {
  const a1 = seg1.pin, a2 = seg2.pin;
  const Ax = p[3 * a1], Ay = p[3 * a1 + 1];
  const dx = p[3 * a2] - Ax, dy = p[3 * a2 + 1] - Ay;
  const L = Math.hypot(dx, dy), s = 1 / L, c = dx / L, sn = dy / L;
  const q = new Float64Array(RICH.vertexCount * 3);
  for (let v = 0; v < RICH.vertexCount; v++) {
    const X = p[3 * v] - Ax, Y = p[3 * v + 1] - Ay;
    q[3 * v] = s * (c * X + sn * Y);
    q[3 * v + 1] = s * (-sn * X + c * Y);
    q[3 * v + 2] = s * p[3 * v + 2];
  }
  return q;
}

describe('dsScaffold', () => {
  it('is 10-dimensional inside ℝ²⁴ and rejects non-8-vertex triangulations', () => {
    expect(space.dim).toBe(10);
    expect(space.ambient).toBe(24);
    expect(() => dsScaffold(byId('v7-1'))).toThrow();
  });

  it('φ places the pins, midpoints, and z = 0 plane correctly', () => {
    const th = sampleTheta();
    const p = new Float64Array(24);
    space.push(th, p);
    const V = (v: number) => [p[3 * v], p[3 * v + 1], p[3 * v + 2]];
    const [cx, cy, dx, dy, gx, gy, gz, hx, hy, hz] = th;
    // pinned endpoints
    expect(V(seg1.pin)).toEqual([0, 0, 0]);
    expect(V(seg2.pin)).toEqual([1, 0, 0]);
    // free endpoints
    expect(V(seg1.free)).toEqual([cx, cy, 0]);
    expect(V(seg2.free)).toEqual([dx, dy, 0]);
    // midpoints = ½(pin + free)
    expect(V(seg1.mid)).toEqual([cx / 2, cy / 2, 0]);
    expect(V(seg2.mid)).toEqual([(1 + dx) / 2, dy / 2, 0]);
    // poles free in ℝ³
    expect(V(g0)).toEqual([gx, gy, gz]);
    expect(V(g1)).toEqual([hx, hy, hz]);
  });

  it('coords ∘ push = id (exact left inverse)', () => {
    const th = sampleTheta();
    const p = new Float64Array(24);
    space.push(th, p);
    const back = new Float64Array(10);
    space.coords(p, back);
    for (let i = 0; i < 10; i++) expect(back[i]).toBeCloseTo(th[i], 12);
  });

  it('jacobian matches a finite-difference of φ', () => {
    const th = sampleTheta();
    const J = new Float64Array(24 * 10);
    space.phi.jacobian(th, J);
    const h = 1e-6, fp = new Float64Array(24), fm = new Float64Array(24);
    for (let j = 0; j < 10; j++) {
      const a = Float64Array.from(th); a[j] += h; space.push(a, fp);
      const b = Float64Array.from(th); b[j] -= h; space.push(b, fm);
      for (let r = 0; r < 24; r++) {
        expect(J[r * 10 + j]).toBeCloseTo((fp[r] - fm[r]) / (2 * h), 7);
      }
    }
  });

  it('pullback metric is diag(5/4 ×4 on c,d ; 1 ×6 on the poles)', () => {
    const G = new Float64Array(10 * 10);
    space.metric(sampleTheta(), G);
    const expected = [1.25, 1.25, 1.25, 1.25, 1, 1, 1, 1, 1, 1];
    for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) {
      expect(G[i * 10 + j]).toBeCloseTo(i === j ? expected[i] : 0, 12);
    }
  });

  it('contains the Doyle–Schwartz family: a gauge-fixed DS torus lies on φ and is flat', () => {
    const q = gaugeFix(doyleSchwartzPositions(0.3, 1.0));
    // it is flat (DS is flat by construction; similarity preserves cone angles)
    expect(maxConeDeficit(RICH, q)).toBeLessThan(1e-9);
    // it lies in φ's image: push(coords(q)) reproduces q
    const th = new Float64Array(10), p = new Float64Array(24);
    space.coords(q, th);
    space.push(th, p);
    for (let i = 0; i < 24; i++) expect(p[i]).toBeCloseTo(q[i], 9);
  });

  it('project onto pulled flat lands a generic θ on the flat locus', () => {
    const held = pullHeld(space, [flat(RICH)]);
    const x = sampleTheta();
    expect(project(x, held).status).toBe('converged');
    const p = new Float64Array(24);
    space.push(x, p);
    expect(maxConeDeficit(RICH, p)).toBeLessThan(1e-8);
  });
});
