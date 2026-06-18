/**
 * The headline gated-flow validation: descending the repulsion energy into Ω while
 * the gate (`isEmbedded`) keeps it embedded — what un-gated descent can't guarantee
 * (clearance > 0 ≠ isEmbedded). The energies are taken by flow explicitly.
 */

import { describe, it, expect } from 'vitest';
import { isEmbedded, clearance, makeCellMargin, makeCutOffArea } from '../../src/embedding/index.ts';
import { flow } from '../../src/solvers/flow.ts';
import { flat, maxConeDeficit } from '../../src/constraints/flat.ts';
import { byId } from '../../src/triangulations/index.ts';
import { RICH_REFERENCE } from '../../src/sampling/reference.ts';

const torus = byId(7);

describe('the embedded condition: gate + clearance', () => {
  it('embedded Rich is embedded with positive clearance', () => {
    const good = RICH_REFERENCE.positions.slice();
    expect(isEmbedded(torus, good)).toBe(true);
    expect(clearance(torus, good)).toBeGreaterThan(0);

    // Aggressive un-gated fattening crosses a pair → reproducibly non-embedded.
    const bad = RICH_REFERENCE.positions.slice();
    flow(bad, [flat(torus)], makeCellMargin(torus, { epsilon: 0.3 }), { maxIters: 50 });
    expect(isEmbedded(torus, bad)).toBe(false);
  });

  it('the overlap energy is ~0 on embedded Rich; the near-miss energy is ≥ 0', () => {
    expect(makeCutOffArea(torus).compute(RICH_REFERENCE.positions)).toBeLessThan(1e-9);
    expect(makeCellMargin(torus).compute(RICH_REFERENCE.positions)).toBeGreaterThanOrEqual(0);
  });
});

describe('gated flow — the gate keeps the search inside Ω where un-gated descent escapes', () => {
  it('un-gated descent of the repulsion energy leaves Ω', () => {
    const pos = RICH_REFERENCE.positions.slice();
    flow(pos, [flat(torus)], makeCellMargin(torus, { epsilon: 0.3 }), { maxIters: 50 });
    expect(isEmbedded(torus, pos)).toBe(false);
  });

  it('gated descent of the SAME energy stays flat AND embedded while lowering it', () => {
    const energy = makeCellMargin(torus, { epsilon: 0.3 });
    const pos = RICH_REFERENCE.positions.slice();
    const eBefore = energy.compute(pos);
    const r = flow(pos, [flat(torus)], energy, { gate: (c) => isEmbedded(torus, c), maxIters: 200 });

    expect(['converged', 'stalled', 'max-iters', 'blocked']).toContain(r.status);
    expect(maxConeDeficit(torus, pos)).toBeLessThan(1e-9); // stayed on M (flat)
    expect(isEmbedded(torus, pos)).toBe(true);             // stayed in Ω — the gate held
    expect(energy.compute(pos)).toBeLessThan(eBefore);     // descent did real work
  });
});
