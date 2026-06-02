import { describe, it, expect } from 'vitest';
import { CHORD_LENGTH_SQUARED } from './chordLengthSquared';
import { CUTOFF_AREA } from './cutOffArea';
import { CELL_MARGIN, minMargin, totalArea, linearSize } from './cellMargin';
import { RICH_REFERENCE } from '../reference';
import { mulberry32 } from '../perturb';

describe('repulsion energies', () => {
  it('intersection energies are ~0 on embedded Rich (E=0 ⟺ embedded)', () => {
    expect(CHORD_LENGTH_SQUARED.compute(RICH_REFERENCE.positions)).toBeLessThan(1e-9);
    expect(CUTOFF_AREA.compute(RICH_REFERENCE.positions)).toBeLessThan(1e-9);
  });

  it('cell-margin: Rich has a strictly positive gap, and the energy is scale-free', () => {
    const p = RICH_REFERENCE.positions;
    const report = minMargin(p);
    expect(report.margin).toBeGreaterThan(0);

    // Scale-invariance: inflating the mesh leaves the cell-margin energy fixed.
    const scaled = Float64Array.from(p, (v) => v * 3.7);
    expect(CELL_MARGIN.compute(scaled)).toBeCloseTo(CELL_MARGIN.compute(p), 9);
    expect(linearSize(scaled)).toBeCloseTo(3.7 * linearSize(p), 9);
  });

  it('totalArea is positive and matches √-scaling of linearSize', () => {
    const a = totalArea(RICH_REFERENCE.positions);
    expect(a).toBeGreaterThan(0);
    expect(linearSize(RICH_REFERENCE.positions)).toBeCloseTo(Math.sqrt(a), 12);
  });

  it('gradient points downhill: a small step along −∇E lowers E', () => {
    // Use a perturbed (slightly non-embedded-prone) config so the energy is live.
    const rng = mulberry32(5);
    const p = Float64Array.from(RICH_REFERENCE.positions, (v) => v + 0.15 * (rng() * 2 - 1));
    const e0 = CUTOFF_AREA.compute(p);
    if (e0 > 1e-6) {
      const g = new Float64Array(24);
      CUTOFF_AREA.gradient(p, g);
      const step = Float64Array.from(p, (v, i) => v - 1e-4 * g[i]);
      expect(CUTOFF_AREA.compute(step)).toBeLessThanOrEqual(e0 + 1e-12);
    }
  });
});
