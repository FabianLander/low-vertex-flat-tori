import { describe, it, expect } from 'vitest';
import {
  fdFn, affine, postcompose, precompose, precomposeScalar, scalarFn, stack, leastSquares,
  type Embedding,
} from '@core/functions/compose.ts';
import type { Fn } from '@core/functions/types.ts';

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

// A NONLINEAR embedding φ : ℝ² → ℝ², φ(x) = [x0², x0·x1]; Dφ = [[2x0, 0], [x1, x0]].
const phiNL: Embedding = {
  inDim: 2,
  outDim: 2,
  value(x, out) { out[0] = x[0] * x[0]; out[1] = x[0] * x[1]; },
  jacobian(x, out) { out[0] = 2 * x[0]; out[1] = 0; out[2] = x[1]; out[3] = x[0]; },
};

describe('precompose', () => {
  it('chain rule on a LINEAR embedding: value f(φ(x)) and Jacobian Df·Dφ', () => {
    // φ : ℝ² → ℝ³, φ(x) = [x0, 2x1, x0+x1]  (affine, constant Dφ = A).
    const phi = affine([1, 0, 0, 2, 1, 1], [0, 0, 0]);
    const fphi = precompose(f, phi);                  // f : ℝ³→ℝ², so f∘φ : ℝ²→ℝ²
    expect(fphi.dim).toBe(2);
    const x = new Float64Array([1.3, -0.7]);

    // f∘φ(x) = [x0², (2x1)(x0+x1)]
    const v = new Float64Array(2);
    fphi.value(x, v);
    expect(v[0]).toBeCloseTo(1.3 * 1.3, 9);
    expect(v[1]).toBeCloseTo(2 * -0.7 * (1.3 - 0.7), 9);

    // J = [[2x0, 0], [2x1, 2x0 + 4x1]]
    const J = new Float64Array(2 * 2);
    fphi.jacobian(x, J);
    expect(J[0]).toBeCloseTo(2 * 1.3, 4);
    expect(J[1]).toBeCloseTo(0, 4);
    expect(J[2]).toBeCloseTo(2 * -0.7, 4);
    expect(J[3]).toBeCloseTo(2 * 1.3 + 4 * -0.7, 4);
  });

  it('precompose with the identity embedding is the original map', () => {
    const id = affine([1, 0, 0, 0, 1, 0, 0, 0, 1], [0, 0, 0]); // ℝ³→ℝ³ identity
    const fid = precompose(f, id);
    const c = new Float64Array([1.3, -0.7, 2.1]);

    const v0 = new Float64Array(2), v1 = new Float64Array(2);
    f.value(c, v0); fid.value(c, v1);
    expect([...v1]).toEqual([...v0]);

    const J0 = new Float64Array(6), J1 = new Float64Array(6);
    f.jacobian(c, J0); fid.jacobian(c, J1);
    for (let i = 0; i < 6; i++) expect(J1[i]).toBeCloseTo(J0[i], 6);
  });

  it('Jacobian on a NONLINEAR embedding matches finite differences of its own value', () => {
    // g : ℝ² → ℝ², g(c) = [c0², c1²]; precompose with the nonlinear φ.
    const g: Fn = fdFn('g', 2, (c, out) => { out[0] = c[0] * c[0]; out[1] = c[1] * c[1]; });
    const gphi = precompose(g, phiNL);
    const x = new Float64Array([1.1, -0.6]);

    const J = new Float64Array(2 * 2);
    gphi.jacobian(x, J);

    // central difference of gphi.value
    const h = 1e-6, vp = new Float64Array(2), vm = new Float64Array(2), xx = Float64Array.from(x);
    for (let col = 0; col < 2; col++) {
      xx[col] = x[col] + h; gphi.value(xx, vp);
      xx[col] = x[col] - h; gphi.value(xx, vm);
      xx[col] = x[col];
      for (let r = 0; r < 2; r++) expect(J[r * 2 + col]).toBeCloseTo((vp[r] - vm[r]) / (2 * h), 5);
    }
  });
});

describe('stack', () => {
  it('concatenates value and Jacobian into one higher-dim Fn', () => {
    // g : ℝ³ → ℝ¹, g(c) = c0 + c1 + c2. stack(f, g) : ℝ³ → ℝ³.
    const g: Fn = fdFn('sum', 1, (c, out) => { out[0] = c[0] + c[1] + c[2]; });
    const fg = stack(f, g);
    expect(fg.dim).toBe(3);
    const c = new Float64Array([1.3, -0.7, 2.1]);

    const v = new Float64Array(3);
    fg.value(c, v);
    expect(v[0]).toBeCloseTo(1.3 * 1.3, 9);          // f row 0
    expect(v[1]).toBeCloseTo(-0.7 * 2.1, 9);         // f row 1
    expect(v[2]).toBeCloseTo(1.3 - 0.7 + 2.1, 9);    // g row

    // Jacobian = [ f's 2×3 block ; g's 1×3 block ]
    const J = new Float64Array(3 * 3);
    fg.jacobian(c, J);
    expect(J[0]).toBeCloseTo(2 * 1.3, 4); expect(J[1]).toBeCloseTo(0, 4); expect(J[2]).toBeCloseTo(0, 4);
    expect(J[3]).toBeCloseTo(0, 4); expect(J[4]).toBeCloseTo(2.1, 4); expect(J[5]).toBeCloseTo(-0.7, 4);
    expect(J[6]).toBeCloseTo(1, 4); expect(J[7]).toBeCloseTo(1, 4); expect(J[8]).toBeCloseTo(1, 4);
  });
});

describe('leastSquares', () => {
  it('compute = ½‖f‖² and grad = Jᵀ·f (checked against the closed form and FD)', () => {
    const E = leastSquares(f);          // ½(f0² + f1²) = ½((c0²)² + (c1 c2)²)
    const c = new Float64Array([1.3, -0.7, 2.1]);

    expect(E.compute(c)).toBeCloseTo(0.5 * ((1.3 ** 2) ** 2 + (-0.7 * 2.1) ** 2), 6);

    // Jᵀf with J = [[2c0,0,0],[0,c2,c1]], f = [c0², c1 c2]:
    //   [2c0·c0², c2·c1c2, c1·c1c2] = [2c0³, c1 c2², c1² c2]
    const g = new Float64Array(3);
    E.grad(c, g);
    expect(g[0]).toBeCloseTo(2 * 1.3 ** 3, 4);
    expect(g[1]).toBeCloseTo(-0.7 * 2.1 ** 2, 4);
    expect(g[2]).toBeCloseTo(0.7 ** 2 * 2.1, 4);

    // and against central differences of compute
    const h = 1e-6, cc = Float64Array.from(c);
    for (let j = 0; j < 3; j++) {
      cc[j] = c[j] + h; const ep = E.compute(cc);
      cc[j] = c[j] - h; const em = E.compute(cc);
      cc[j] = c[j];
      expect(g[j]).toBeCloseTo((ep - em) / (2 * h), 5);
    }
  });
});

describe('precomposeScalar', () => {
  it('pulls a scalar through a nonlinear φ: ∇(f∘φ) = Dφᵀ·∇f', () => {
    // f : ℝ² → ℝ, f(c) = c0 + c1²; ∇f = [1, 2c1].
    const fs = scalarFn(
      'fs',
      (c) => c[0] + c[1] * c[1],
      (c, out) => { out[0] = 1; out[1] = 2 * c[1]; },
    );
    const fsphi = precomposeScalar(fs, phiNL);
    const x = new Float64Array([1.3, -0.7]);

    // f∘φ(x) = x0² + (x0 x1)²
    expect(fsphi.compute(x)).toBeCloseTo(1.3 * 1.3 + (1.3 * -0.7) ** 2, 9);

    // grad = [2x0 + 2x0 x1², 2x0² x1]
    const g = new Float64Array(2);
    fsphi.grad(x, g);
    expect(g[0]).toBeCloseTo(2 * 1.3 + 2 * 1.3 * 0.49, 6);
    expect(g[1]).toBeCloseTo(2 * 1.69 * -0.7, 6);
  });
});
