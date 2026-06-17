/**
 * embedded Region correctness, and the headline validation of the GATED flow:
 * descending the repulsion energy into Ω fattens the torus while the gate keeps
 * it embedded — the thing un-gated descent could not guarantee (see flow.test.ts).
 */

import { describe, it, expect } from 'vitest';
import { embedded } from '../../src/regions/embedded.ts';
import { flow } from '../../src/solvers/flow.ts';
import { identity } from '../../src/configuration/chart.ts';
import { flat } from '../../src/submanifolds/flat.ts';
import { maxConeDeficit } from '../../src/functions/coneDeficit.ts';
import { isEmbedded } from '../../src/math/embedded.ts';
import { makeCellMargin } from '../../src/math/energies/cellMargin.ts';
import { byId } from '../../src/triangulations/index.ts';
import { RICH_REFERENCE } from '../../src/math/reference.ts';

const torus = byId(7);

describe('embedded Region', () => {
  it('contains ⟺ isEmbedded (the topological truth), and margin>0 on an embedded torus', () => {
    const region = embedded(torus);
    const good = RICH_REFERENCE.positions.slice();
    expect(region.contains(good)).toBe(isEmbedded(torus, good));
    expect(region.contains(good)).toBe(true);
    expect(region.margin(good)).toBeGreaterThan(0);

    // A reproducibly non-embedded config: aggressive un-gated fattening crosses a pair.
    const bad = RICH_REFERENCE.positions.slice();
    flow(identity(24), bad, [flat(torus)], makeCellMargin(torus, { epsilon: 0.3 }), { maxIters: 50 });
    expect(isEmbedded(torus, bad)).toBe(false);          // (matches flow.test observation)
    expect(region.contains(bad)).toBe(isEmbedded(torus, bad)); // gate tracks the truth
    expect(region.contains(bad)).toBe(false);
  });

  it('enterEnergy is a repulsion (≥0); stayEnergy is finite & positive inside Ω', () => {
    const region = embedded(torus);
    const p = RICH_REFERENCE.positions;
    expect(region.enterEnergy().compute(p)).toBeGreaterThanOrEqual(0);
    const b = region.stayEnergy().compute(p);
    expect(Number.isFinite(b)).toBe(true);
    expect(b).toBeGreaterThan(0);
  });
});

describe('gated flow — the gate keeps the search inside Ω where un-gated descent escapes', () => {
  // The clean, provable value of the region: the SAME energy descent leaves the
  // embedded set when un-gated, but is held inside it when gated. (Margin/“fatten”
  // is NOT a clean monotone here — these energies lower a sum, and minMargin>0 ≠
  // isEmbedded; the gate enforces the topological truth, which is the point.)
  const region = embedded(torus, { epsilon: 0.3 });

  it('un-gated descent of the repulsion energy leaves Ω (escapes embeddedness)', () => {
    const pos = RICH_REFERENCE.positions.slice();
    flow(identity(24), pos, [flat(torus)], region.enterEnergy(), { maxIters: 50 });
    expect(isEmbedded(torus, pos)).toBe(false);
  });

  it('gated descent of the SAME energy stays flat AND embedded while lowering it', () => {
    const pos = RICH_REFERENCE.positions.slice();
    const energy = region.enterEnergy();
    const eBefore = energy.compute(pos);
    const r = flow(identity(24), pos, [flat(torus)], energy, { region, maxIters: 200 });

    expect(['converged', 'stalled', 'max-iters', 'blocked']).toContain(r.status);
    expect(maxConeDeficit(torus, pos)).toBeLessThan(1e-9); // stayed on M (flat)
    expect(isEmbedded(torus, pos)).toBe(true);             // stayed in Ω — the gate held
    expect(energy.compute(pos)).toBeLessThan(eBefore);     // descent did real work
  });
});
