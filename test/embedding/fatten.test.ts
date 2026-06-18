import { describe, it, expect } from 'vitest';
import { makeCellMargin, minMargin, isEmbedded } from '../../src/embedding/index.ts';
import { flow } from '../../src/solvers/flow.ts';
import { flat, maxConeDeficit } from '../../src/constraints/flat.ts';
import { RICH_REFERENCE } from '../../src/sampling/reference.ts';
import { RICH } from '../../src/triangulations/index.ts';

describe('cellMargin — the fattening energy', () => {
  it('is zero when every gap ≥ ε, positive when ε exceeds the margin', () => {
    const p = RICH_REFERENCE.positions;
    const m = minMargin(RICH, p).margin;
    expect(makeCellMargin(RICH, { epsilon: m / 2 }).compute(p)).toBe(0);          // all gaps ≥ ε
    expect(makeCellMargin(RICH, { epsilon: m * 3 }).compute(p)).toBeGreaterThan(0); // some gaps < ε
  });

  it('descending it fattens the margin while staying flat and embedded', () => {
    const x = Float64Array.from(RICH_REFERENCE.positions);
    const m0 = minMargin(RICH, x).margin;
    flow(x, [flat(RICH)], makeCellMargin(RICH, { epsilon: m0 * 2 }), {
      gate: (c) => isEmbedded(RICH, c), stepSize: 0.002, maxIters: 80,
    });
    expect(minMargin(RICH, x).margin).toBeGreaterThan(m0); // fatter
    expect(maxConeDeficit(RICH, x)).toBeLessThan(1e-9);     // still flat
    expect(isEmbedded(RICH, x)).toBe(true);                // still embedded
  });
});
