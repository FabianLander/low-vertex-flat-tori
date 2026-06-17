import { describe, it, expect } from 'vitest';
import { fdFn, affine, postcompose } from '../../src/functions/compose.ts';
import type { Fn } from '../../src/functions/types.ts';

// Toy map f : ℝ³ → ℝ², f(c) = [c0², c1·c2]; analytic Df = [[2c0,0,0],[0,c2,c1]].
// Supplied value-only, so its Jacobian comes from fdFn (central differences).
const f: Fn = fdFn('toy', 2, (c, out) => {
  out[0] = c[0] * c[0];
  out[1] = c[1] * c[2];
});

describe('fdFn', () => {
  it('finite-differences the Jacobian of a value-only map', () => {
    const c = new Float64Array([1.3, -0.7, 2.1]);
    const J = new Float64Array(2 * 3);
    f.jacobian(c, J);
    // row 0: [2c0, 0, 0]; row 1: [0, c2, c1]
    expect(J[0]).toBeCloseTo(2 * 1.3, 5);
    expect(J[1]).toBeCloseTo(0, 5);
    expect(J[2]).toBeCloseTo(0, 5);
    expect(J[3]).toBeCloseTo(0, 5);
    expect(J[4]).toBeCloseTo(2.1, 5);
    expect(J[5]).toBeCloseTo(-0.7, 5);
  });

  it('does not mutate its input config', () => {
    const c = new Float64Array([1, 2, 3]);
    const J = new Float64Array(6);
    f.jacobian(c, J);
    expect([...c]).toEqual([1, 2, 3]);
  });
});

describe('affine', () => {
  it('value = A·x + b and Jacobian = A (constant)', () => {
    // g : ℝ² → ℝ², A = [[2,0],[0,3]], b = [1,-1].
    const g = affine([2, 0, 0, 3], [1, -1]);
    const out = new Float64Array(2);
    g.value([5, 4], out);
    expect([...out]).toEqual([2 * 5 + 1, 3 * 4 - 1]);
    const J = new Float64Array(4);
    g.jacobian([0, 0], J);
    expect([...J]).toEqual([2, 0, 0, 3]);
  });
});

describe('postcompose', () => {
  it('chain rule: value g(f(c)) and Jacobian Dg·Df', () => {
    const g = affine([2, 0, 0, 3], [1, -1]);          // ℝ²→ℝ²
    const gf = postcompose(g, f);
    const c = new Float64Array([1.3, -0.7, 2.1]);

    const v = new Float64Array(2);
    gf.value(c, v);
    expect(v[0]).toBeCloseTo(2 * (1.3 * 1.3) + 1, 9);
    expect(v[1]).toBeCloseTo(3 * (-0.7 * 2.1) - 1, 9);

    // Dg·Df = [[2,0],[0,3]] · [[2c0,0,0],[0,c2,c1]] = [[4c0,0,0],[0,3c2,3c1]]
    const J = new Float64Array(2 * 3);
    gf.jacobian(c, J);
    expect(J[0]).toBeCloseTo(4 * 1.3, 4);
    expect(J[1]).toBeCloseTo(0, 4);
    expect(J[2]).toBeCloseTo(0, 4);
    expect(J[3]).toBeCloseTo(0, 4);
    expect(J[4]).toBeCloseTo(3 * 2.1, 4);
    expect(J[5]).toBeCloseTo(3 * -0.7, 4);
  });

  it('a dimension-reducing outer map (take first component, like the wall)', () => {
    const re = affine([1, 0], [0]);                   // ℝ²→ℝ¹, x ↦ x0
    const gf = postcompose(re, f);
    expect(gf.dim).toBe(1);
    const c = new Float64Array([1.3, -0.7, 2.1]);
    const v = new Float64Array(1);
    gf.value(c, v);
    expect(v[0]).toBeCloseTo(1.3 * 1.3, 9);
    const J = new Float64Array(3);
    gf.jacobian(c, J);
    expect(J[0]).toBeCloseTo(2 * 1.3, 4);
    expect(J[1]).toBeCloseTo(0, 4);
    expect(J[2]).toBeCloseTo(0, 4);
  });

  it('throws when the inner/outer dimensions disagree', () => {
    const g = affine([2, 0, 0, 3], [1, -1]);          // inDim 2
    const h: Fn = fdFn('h3', 3, (_c, out) => { out[0] = 0; out[1] = 0; out[2] = 0; });
    expect(() => postcompose(g, h)).toThrow();
  });
});
