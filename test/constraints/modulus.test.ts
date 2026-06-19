/**
 * The modulus constraints, as the 2 × 3 grid: pin τ to a point / vertical line / circle,
 * in Teichmüller space (raw τ, `pinTeichmuller`) or moduli space (reduced τ̂, `pinModuli`).
 * Each cell is checked against the REALIZED geometry — after projecting onto
 * [flat, constraint], re-measure with a FRESH modulus/reduction (not the frozen chart) and
 * confirm the locus is hit. Small, in-chamber moves (reaching far targets is `march`'s job).
 * Plus FD spot-checks that the analytic Jacobians (the postcompose chain) match FD.
 */

import { describe, it, expect } from 'vitest';
import { project } from '@core/solvers/project.ts';
import { flat, maxConeDeficit } from '@core/constraints/flat.ts';
import {
  fixedModulus, modulusWall, pinTeichmuller, pinModuli, point, verticalLine, circle,
} from '@core/constraints/modulus.ts';
import { modulus } from '@core/moduli/modulus.ts';
import { reduceModulus } from '@core/moduli/reduce.ts';
import type { Vec2 } from '@core/geometry/vec2.ts';
import type { Constraint } from '@core/constraints/types.ts';
import { byId } from '@core/triangulations/index.ts';
import { RICH_REFERENCE } from '@core/sampling/reference.ts';

const torus = byId('v8-7');

/** A flat seed and its modulus, raw (τ) and reduced (τ̂). */
function flatSeed(): { pos: Float64Array; tauHat: Vec2; tauRaw: Vec2 } {
  const pos = RICH_REFERENCE.positions.slice();
  project(pos, [flat(torus)]);
  const m = modulus(torus, pos);
  return { pos, tauHat: reduceModulus(m.tau), tauRaw: [m.tau[0], m.tau[1]] };
}

/** Max |analytic ∂g − central-FD ∂g| over a constraint's Jacobian at p. */
function jacVsFd(c: Constraint, p: ArrayLike<number>, h = 1e-7): number {
  const fn = c.fn;
  const n = p.length, k = fn.outDim;
  const J = new Float64Array(k * n); fn.jacobian(p, J);
  const vp = new Float64Array(k), vm = new Float64Array(k);
  const q = Float64Array.from(p);
  let err = 0;
  for (let j = 0; j < n; j++) {
    const s = q[j];
    q[j] = s + h; fn.value(q, vp); q[j] = s - h; fn.value(q, vm); q[j] = s;
    for (let r = 0; r < k; r++) err = Math.max(err, Math.abs(J[r * n + j] - (vp[r] - vm[r]) / (2 * h)));
  }
  return err;
}

describe('modulus constraints — moduli space (reduced τ̂)', () => {
  it('point: fixedModulus(τ̂₀) realizes τ̂ = τ̂₀', () => {
    const { pos: seed, tauHat } = flatSeed();
    const target: Vec2 = [tauHat[0] + 0.01, tauHat[1] + 0.01];
    const p = seed.slice();
    expect(project(p, [flat(torus), fixedModulus(torus, seed, target)]).status).toBe('converged');
    expect(maxConeDeficit(torus, p)).toBeLessThan(1e-9);
    const got = reduceModulus(modulus(torus, p).tau);
    expect(got[0]).toBeCloseTo(target[0], 5);
    expect(got[1]).toBeCloseTo(target[1], 5);
  });

  it('vertical line: modulusWall(c) realizes |Re τ̂| = c', () => {
    const { pos: seed, tauHat } = flatSeed();
    const c = Math.abs(tauHat[0]) + 0.02;
    const p = seed.slice();
    expect(project(p, [flat(torus), modulusWall(torus, seed, c)]).status).toBe('converged');
    expect(maxConeDeficit(torus, p)).toBeLessThan(1e-9);
    const got = reduceModulus(modulus(torus, p).tau);
    expect(Math.abs(Math.abs(got[0]) - c)).toBeLessThan(1e-6);
  });

  it('circle: pinModuli(circle(center, r)) realizes |τ̂ − center| = r', () => {
    const { pos: seed, tauHat } = flatSeed();
    const r = 0.03;
    const p = seed.slice();
    expect(project(p, [flat(torus), pinModuli(torus, seed, circle(tauHat, r))]).status).toBe('converged');
    expect(maxConeDeficit(torus, p)).toBeLessThan(1e-9);
    const got = reduceModulus(modulus(torus, p).tau);
    expect(Math.hypot(got[0] - tauHat[0], got[1] - tauHat[1])).toBeCloseTo(r, 5);
  });
});

describe('modulus constraints — Teichmüller space (raw τ)', () => {
  it('point: pinTeichmuller(point(τ₀)) realizes τ = τ₀ (raw)', () => {
    const { pos: seed, tauRaw } = flatSeed();
    const target: Vec2 = [tauRaw[0] + 0.01, tauRaw[1] + 0.01];
    const p = seed.slice();
    expect(project(p, [flat(torus), pinTeichmuller(torus, point(target))]).status).toBe('converged');
    expect(maxConeDeficit(torus, p)).toBeLessThan(1e-9);
    const got = modulus(torus, p).tau;     // raw τ, no reduction
    expect(got[0]).toBeCloseTo(target[0], 5);
    expect(got[1]).toBeCloseTo(target[1], 5);
  });

  it('vertical line: pinTeichmuller(verticalLine(c)) realizes Re τ = c (raw)', () => {
    const { pos: seed, tauRaw } = flatSeed();
    const c = tauRaw[0] + 0.02;
    const p = seed.slice();
    expect(project(p, [flat(torus), pinTeichmuller(torus, verticalLine(c))]).status).toBe('converged');
    expect(maxConeDeficit(torus, p)).toBeLessThan(1e-9);
    expect(modulus(torus, p).tau[0]).toBeCloseTo(c, 5);
  });

  it('circle: pinTeichmuller(circle(center, r)) realizes |τ − center| = r (raw)', () => {
    const { pos: seed, tauRaw } = flatSeed();
    const r = 0.03;
    const p = seed.slice();
    expect(project(p, [flat(torus), pinTeichmuller(torus, circle(tauRaw, r))]).status).toBe('converged');
    expect(maxConeDeficit(torus, p)).toBeLessThan(1e-9);
    const got = modulus(torus, p).tau;
    expect(Math.hypot(got[0] - tauRaw[0], got[1] - tauRaw[1])).toBeCloseTo(r, 5);
  });
});

describe('modulus constraints — analytic Jacobian (postcompose chain) matches FD', () => {
  it('Teichmüller point, moduli arc, moduli point all match central differences', () => {
    const { pos: seed, tauHat, tauRaw } = flatSeed();
    expect(jacVsFd(pinTeichmuller(torus, point([tauRaw[0] + 0.05, tauRaw[1]])), seed)).toBeLessThan(1e-5);
    expect(jacVsFd(pinModuli(torus, seed, circle([0, 0], 1)), seed)).toBeLessThan(1e-5);
    expect(jacVsFd(fixedModulus(torus, seed, tauHat), seed)).toBeLessThan(1e-5);
  });
});
