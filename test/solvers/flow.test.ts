/**
 * flow correctness, against KNOWN math:
 *  (1) descending a linear energy on the unit sphere converges to the constrained
 *      minimizer x = −â (closed form), staying on the sphere — pure Riemannian descent;
 *  (2) on the real [flat] manifold, descending the cell-margin repulsion fattens the
 *      torus (margin increases) while staying flat and embedded.
 */

import { describe, it, expect } from 'vitest';
import { flow } from '../../src/solvers/flow.ts';
import { flat, maxConeDeficit } from '../../src/conditions/flat.ts';
import type { Fn, ScalarFn } from '../../src/functions/types.ts';
import { scalarFn } from '../../src/functions/compose.ts';
import { isEmbedded } from '../../src/conditions/embedded/index.ts';
import { makeCellMargin } from '../../src/conditions/embedded/index.ts';
import { byId } from '../../src/triangulations/index.ts';
import { RICH_REFERENCE } from '../../src/sampling/reference.ts';

// --- toy: the unit sphere {‖x‖² = 1} in ℝ³ as an Fn ---
const sphere: Fn = {
  label: 'sphere',
  dim: 1,
  value(c, out) { out[0] = c[0] * c[0] + c[1] * c[1] + c[2] * c[2] - 1; },
  jacobian(c, out) { out[0] = 2 * c[0]; out[1] = 2 * c[1]; out[2] = 2 * c[2]; },
};

// --- toy: a linear energy E(x) = a·x (gradient is the constant a) ---
function linearEnergy(a: readonly [number, number, number]): ScalarFn {
  return scalarFn(
    'linear',
    (c) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2],
    (_c, out) => { out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; },
  );
}

describe('flow — toy: linear energy on the unit sphere', () => {
  it('converges to the constrained minimizer x = −a/‖a‖, staying on the sphere', () => {
    const a: [number, number, number] = [1, 2, -1];
    const norm = Math.hypot(a[0], a[1], a[2]);
    const target = [-a[0] / norm, -a[1] / norm, -a[2] / norm];

    const x = new Float64Array([0.5, 0.5, 0.5]); // off the sphere; flow lands first
    const r = flow(x, [sphere], linearEnergy(a), {
      stepSize: 0.05, maxIters: 5000, gradientTol: 1e-8,
      energyTol: -Infinity, // linear energy is unbounded below; stop on the tangent gradient, not E
    });

    // Stays on the sphere to tol (retraction).
    expect(Math.abs(x[0] * x[0] + x[1] * x[1] + x[2] * x[2] - 1)).toBeLessThan(1e-9);
    // Reaches the closed-form constrained minimizer.
    expect(Math.hypot(x[0] - target[0], x[1] - target[1], x[2] - target[2])).toBeLessThan(1e-3);
    // The tangent gradient vanishes there → stalled at a constrained critical point.
    expect(r.status).toBe('stalled');
    // Energy is the minimum −‖a‖.
    expect(r.energy).toBeCloseTo(-norm, 4);
  });
});

describe('flow — real: honest descent ALONG [flat]', () => {
  it('cell-margin descent stays exactly on the flat manifold and lowers the energy', () => {
    const torus = byId(7);
    const pos = RICH_REFERENCE.positions.slice();
    const energy = makeCellMargin(torus, { epsilon: 0.3 }); // ε large → energy active

    const eBefore = energy.compute(pos);
    expect(isEmbedded(torus, pos)).toBe(true); // start is embedded
    const r = flow(pos, [flat(torus)], energy, { maxIters: 50 });
    const eAfter = energy.compute(pos);

    expect(['converged', 'stalled', 'max-iters']).toContain(r.status);
    // The Riemannian property: we never left M (held exactly), and E decreased.
    expect(maxConeDeficit(torus, pos)).toBeLessThan(1e-9);
    expect(eAfter).toBeLessThan(eBefore);
    // NB: staying EMBEDDED while fattening is the region-gated flow's job (the gate
    // is exactly what un-gated repulsion descent can't guarantee) — validated once
    // the `embedded` region exists, with `flow(..., {region: embedded})`.
  });
});
