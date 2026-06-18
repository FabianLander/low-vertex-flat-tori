import { describe, it, expect } from 'vitest';
import { fullSpace } from '../../src/coordinates/full.ts';
import { pinVertices } from '../../src/coordinates/pin.ts';
import { symmetry, RICH_SYMMETRY } from '../../src/coordinates/symmetry.ts';
import { coneDeficit, coneAngleDeficits } from '../../src/constraints/flat.ts';
import { RICH } from '../../src/triangulations/index.ts';
import { RICH_REFERENCE } from '../../src/sampling/reference.ts';

const N = RICH.vertexCount * 3; // 24

describe('fullSpace', () => {
  const space = fullSpace(RICH);

  it('is the whole space: dim = ambient = 3V, push/coords are the identity', () => {
    expect(space.dim).toBe(N);
    expect(space.ambient).toBe(N);
    const x = RICH_REFERENCE.positions;
    const p = new Float64Array(N);
    space.push(x, p);
    expect([...p]).toEqual([...x]);
    const back = new Float64Array(N);
    space.coords(p, back);
    expect([...back]).toEqual([...x]);
  });

  it('pull(coneDeficit) on the full space is the ambient map itself (value + Jacobian)', () => {
    const g = coneDeficit(RICH);
    const pulled = space.pull(g);
    const x = RICH_REFERENCE.positions;

    const vp = new Float64Array(g.dim);
    pulled.value(x, vp);
    const va = coneAngleDeficits(RICH, x);
    for (let i = 0; i < g.dim; i++) expect(vp[i]).toBeCloseTo(va[i], 10);

    const Jp = new Float64Array(g.dim * N);
    const Ja = new Float64Array(g.dim * N);
    pulled.jacobian(x, Jp);
    g.jacobian(x, Ja);
    for (let i = 0; i < Jp.length; i++) expect(Jp[i]).toBeCloseTo(Ja[i], 8);
  });

  it('metric is the identity', () => {
    const G = new Float64Array(N * N);
    space.metric(RICH_REFERENCE.positions, G);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      expect(G[i * N + j]).toBeCloseTo(i === j ? 1 : 0, 12);
    }
  });
});

describe('pinVertices', () => {
  // pin z (axis 2) of vertices 0..5 → 6 frozen coords, dim = 24 − 6 = 18.
  const base = [0, 1, 2, 3, 4, 5];
  const space = pinVertices(RICH, base, [2], 0);

  it('drops one coordinate per (vertex, axis) and round-trips coords∘push', () => {
    expect(space.dim).toBe(N - base.length);
    const x = new Float64Array(space.dim).map((_, k) => Math.sin(k));
    const p = new Float64Array(N);
    space.push(x, p);
    // frozen z-coords are pinned to 0
    for (const v of base) expect(p[3 * v + 2]).toBe(0);
    // coords(push(x)) === x
    const back = new Float64Array(space.dim);
    space.coords(p, back);
    for (let k = 0; k < space.dim; k++) expect(back[k]).toBeCloseTo(x[k], 12);
  });

  it('pull(coneDeficit).value(x) = ambient deficits at push(x)', () => {
    // start from the (projected) reference so the config is meaningful
    const x = new Float64Array(space.dim);
    space.coords(RICH_REFERENCE.positions, x);
    const pulled = space.pull(coneDeficit(RICH));
    const p = new Float64Array(N);
    space.push(x, p);
    const vp = new Float64Array(RICH.vertexCount);
    pulled.value(x, vp);
    const va = coneAngleDeficits(RICH, p);
    for (let i = 0; i < RICH.vertexCount; i++) expect(vp[i]).toBeCloseTo(va[i], 10);
  });
});

describe('symmetry', () => {
  const { pairing, reflection } = RICH_SYMMETRY;
  const space = symmetry(RICH, pairing, reflection);

  it('halves the dimension (8-vertex 4-pair ρ: 24 → 12)', () => {
    expect(space.dim).toBe(12);
    expect(space.ambient).toBe(N);
  });

  it('push produces an EXACTLY symmetric config: P_partner = R·P_rep', () => {
    const x = new Float64Array(space.dim);
    space.coords(RICH_REFERENCE.positions, x);    // project onto the invariant subspace
    const p = new Float64Array(N);
    space.push(x, p);
    for (const [a, b] of pairing) {
      expect(p[3 * b + 0]).toBeCloseTo(reflection[0] * p[3 * a + 0], 12);
      expect(p[3 * b + 1]).toBeCloseTo(reflection[1] * p[3 * a + 1], 12);
      expect(p[3 * b + 2]).toBeCloseTo(reflection[2] * p[3 * a + 2], 12);
    }
  });

  it('round-trips coords∘push and has pullback metric 2·I (all coords paired)', () => {
    const x = new Float64Array(space.dim).map((_, k) => 0.3 * k - 1);
    const p = new Float64Array(N);
    space.push(x, p);
    const back = new Float64Array(space.dim);
    space.coords(p, back);
    for (let k = 0; k < space.dim; k++) expect(back[k]).toBeCloseTo(x[k], 12);

    const G = new Float64Array(space.dim * space.dim);
    space.metric(x, G);
    for (let i = 0; i < space.dim; i++) for (let j = 0; j < space.dim; j++) {
      expect(G[i * space.dim + j]).toBeCloseTo(i === j ? 2 : 0, 12);
    }
  });
});
