import { describe, it, expect } from 'vitest';
import { makeCellMargin, minCellGap, isEmbedded } from '@core/embedding/index.ts';
import { flow } from '@core/solvers/flow.ts';
import { flat, maxConeDeficit } from '@core/constraints/flat.ts';
import { RICH_REFERENCE } from '@core/sampling/reference.ts';
import { RICH } from '@core/triangulations/index.ts';

// The fatten energy descends the cell-gap substrate (`forEachCellGap`/`minCellGap`),
// so it's calibrated against that same measure.
describe('cellMargin — the fattening energy', () => {
  it('is zero when every gap ≥ ε, positive when ε exceeds the smallest gap', () => {
    const p = RICH_REFERENCE.positions;
    const m = minCellGap(RICH, p);
    expect(makeCellMargin(RICH, { epsilon: m / 2 }).compute(p)).toBe(0);          // all gaps ≥ ε
    expect(makeCellMargin(RICH, { epsilon: m * 3 }).compute(p)).toBeGreaterThan(0); // some gaps < ε
  });

  it('descending it fattens the smallest gap while staying flat and embedded', () => {
    const x = Float64Array.from(RICH_REFERENCE.positions);
    const m0 = minCellGap(RICH, x);
    flow(x, [flat(RICH)], makeCellMargin(RICH, { epsilon: m0 * 2 }), {
      gate: (c) => isEmbedded(RICH, c), stepSize: 0.002, maxIters: 80,
    });
    expect(minCellGap(RICH, x)).toBeGreaterThan(m0); // fatter
    expect(maxConeDeficit(RICH, x)).toBeLessThan(1e-9);     // still flat
    expect(isEmbedded(RICH, x)).toBe(true);                // still embedded
  });
});
