/**
 * embedded Region + the headline gated-flow validation: descending the repulsion
 * energy into Ω while the gate keeps it embedded — what un-gated descent can't
 * guarantee (minMargin>0 ≠ isEmbedded). The Region is gate + margin; the energies
 * are taken by flow explicitly.
 */

import { describe, it, expect } from 'vitest';
import { embedded, isEmbedded, makeCellMargin, makeCutOffArea } from '../../../src/conditions/embedded/index.ts';
import { flow } from '../../../src/solvers/flow.ts';
import { identity } from '../../../src/configuration/chart.ts';
import { flat, maxConeDeficit } from '../../../src/conditions/flat.ts';
import { byId } from '../../../src/triangulations/index.ts';
import { RICH_REFERENCE } from '../../../src/math/reference.ts';

const torus = byId(7);

describe('embedded Region', () => {
  it('contains ⟺ isEmbedded (the topological truth); margin>0 on an embedded torus', () => {
    const region = embedded(torus);
    const good = RICH_REFERENCE.positions.slice();
    expect(region.contains(good)).toBe(isEmbedded(torus, good));
    expect(region.contains(good)).toBe(true);
    expect(region.margin(good)).toBeGreaterThan(0);

    // Aggressive un-gated fattening crosses a pair → reproducibly non-embedded.
    const bad = RICH_REFERENCE.positions.slice();
    flow(identity(24), bad, [flat(torus)], makeCellMargin(torus, { epsilon: 0.3 }), { maxIters: 50 });
    expect(region.contains(bad)).toBe(isEmbedded(torus, bad)); // gate tracks the truth
    expect(region.contains(bad)).toBe(false);
  });

  it('the overlap energy is ~0 on embedded Rich; the near-miss energy is ≥ 0', () => {
    expect(makeCutOffArea(torus).compute(RICH_REFERENCE.positions)).toBeLessThan(1e-9);
    expect(makeCellMargin(torus).compute(RICH_REFERENCE.positions)).toBeGreaterThanOrEqual(0);
  });
});

describe('gated flow — the gate keeps the search inside Ω where un-gated descent escapes', () => {
  it('un-gated descent of the repulsion energy leaves Ω', () => {
    const pos = RICH_REFERENCE.positions.slice();
    flow(identity(24), pos, [flat(torus)], makeCellMargin(torus, { epsilon: 0.3 }), { maxIters: 50 });
    expect(isEmbedded(torus, pos)).toBe(false);
  });

  it('gated descent of the SAME energy stays flat AND embedded while lowering it', () => {
    const region = embedded(torus);
    const energy = makeCellMargin(torus, { epsilon: 0.3 });
    const pos = RICH_REFERENCE.positions.slice();
    const eBefore = energy.compute(pos);
    const r = flow(identity(24), pos, [flat(torus)], energy, { region, maxIters: 200 });

    expect(['converged', 'stalled', 'max-iters', 'blocked']).toContain(r.status);
    expect(maxConeDeficit(torus, pos)).toBeLessThan(1e-9); // stayed on M (flat)
    expect(isEmbedded(torus, pos)).toBe(true);             // stayed in Ω — the gate held
    expect(energy.compute(pos)).toBeLessThan(eBefore);     // descent did real work
  });
});
