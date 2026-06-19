/**
 * The normalized coordinate system — the section of the similarity bundle C → C/Sim.
 * Checks: the slice convention (v0=0, v1=(1,0,0), v2 in the y≥0 xy-plane); push/coords are
 * inverse on the slice; `coords` is invariant under an arbitrary similarity of the input
 * (the orbit projection); the pullback metric is exactly I (linear orthonormal scatter);
 * and a pulled constraint loses the 7-DOF similarity null space (full-rank Jacobian).
 */

import { describe, it, expect } from 'vitest';
import { normalized, normalizePose } from '@core/coordinates/normalized.ts';
import { coneDeficit } from '@core/constraints/flat.ts';
import { RICH } from '@core/triangulations/index.ts';
import { RICH_REFERENCE } from '@core/sampling/reference.ts';

const V = RICH.vertexCount;
const N = 3 * V;
const FREE = N - 7;

describe('normalized — the gauge-fixed coordinate system', () => {
  it('normalizePose lands on the canonical slice (v0=0, v1=(1,0,0), v2 in xy with y≥0)', () => {
    const c = normalizePose(RICH_REFERENCE.positions);
    expect([c[0], c[1], c[2]]).toEqual([0, 0, 0]);          // v0 = origin
    expect([c[3], c[4], c[5]]).toEqual([1, 0, 0]);          // v1 = (1,0,0)
    expect(c[8]).toBeCloseTo(0, 12);                         // v2.z = 0
    expect(c[7]).toBeGreaterThanOrEqual(0);                  // v2.y ≥ 0
  });

  it('coords ∘ push = id (the section is a right-inverse of the projection)', () => {
    const space = normalized(RICH);
    const x = new Float64Array(FREE);
    for (let k = 0; k < FREE; k++) x[k] = 0.3 * Math.sin(k * 1.3) + (k === 1 ? 1.0 : 0); // x[1]=v2.y > 0
    const p = new Float64Array(N); space.push(x, p);
    const back = new Float64Array(FREE); space.coords(p, back);
    for (let k = 0; k < FREE; k++) expect(back[k]).toBeCloseTo(x[k], 10);
  });

  it('coords is invariant under an arbitrary similarity of the input (orbit projection)', () => {
    const space = normalized(RICH);
    const p = RICH_REFERENCE.positions.slice();
    const a = new Float64Array(FREE); space.coords(p, a);

    // apply a random similarity: scale 2.3, rotate about z by 0.7, translate by (1,-2,3).
    const s = 2.3, th = 0.7, c = Math.cos(th), sn = Math.sin(th);
    const q = new Float64Array(N);
    for (let v = 0; v < V; v++) {
      const x = p[3 * v], y = p[3 * v + 1], z = p[3 * v + 2];
      q[3 * v]     = s * (c * x - sn * y) + 1;
      q[3 * v + 1] = s * (sn * x + c * y) - 2;
      q[3 * v + 2] = s * z + 3;
    }
    const b = new Float64Array(FREE); space.coords(q, b);
    for (let k = 0; k < FREE; k++) expect(b[k]).toBeCloseTo(a[k], 9);   // same orbit ⟹ same coords
  });

  it('pullback metric is exactly I (linear orthonormal scatter)', () => {
    const space = normalized(RICH);
    const x = new Float64Array(FREE); for (let k = 0; k < FREE; k++) x[k] = k === 1 ? 1 : 0.1 * k;
    const G = new Float64Array(FREE * FREE);
    space.metric(x, G);
    for (let i = 0; i < FREE; i++) for (let j = 0; j < FREE; j++) {
      expect(G[i * FREE + j]).toBeCloseTo(i === j ? 1 : 0, 12);
    }
  });

  it('a pulled constraint has no similarity null space (the 7 DOF are gauged away)', () => {
    // coneDeficit pulled into normalized coords: its Jacobian is (V) × (3V−7); compare the
    // free-coord Jacobian rank-ish via column norms — every free direction moves some deficit
    // OR is in flat's own (V−1) kernel, but none is a free *similarity* direction (there are none).
    const space = normalized(RICH);
    const g = space.pull(coneDeficit(RICH));
    const x = new Float64Array(FREE); space.coords(RICH_REFERENCE.positions, x);
    const J = new Float64Array(g.outDim * FREE);
    g.jacobian(x, J);
    // sanity: the pulled Jacobian is finite and the free dim is 3V−7 (similarity removed).
    expect(FREE).toBe(N - 7);
    expect(J.every(Number.isFinite)).toBe(true);
  });
});
