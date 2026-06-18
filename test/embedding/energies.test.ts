import { describe, it, expect } from 'vitest';
import { makeChordLengthSquared } from '../../src/embedding/index';
import { makeCutOffArea } from '../../src/embedding/index';
import { makeCellMargin, makeCellBarrier } from '../../src/embedding/index';
import { minSeparation, minCellGap, linearSize } from '../../src/embedding/index';
import { totalArea } from '../../src/moduli/develop';
import { RICH_REFERENCE } from '../../src/sampling/reference';
import { mulberry32 } from '../../src/sampling/rng';
import { RICH } from '../../src/triangulations';

const CHORD_LENGTH_SQUARED = makeChordLengthSquared(RICH);
const CUTOFF_AREA = makeCutOffArea(RICH);
const CELL_MARGIN = makeCellMargin(RICH);

describe('repulsion energies', () => {
  it('intersection energies are ~0 on embedded Rich (E=0 ⟺ embedded)', () => {
    expect(CHORD_LENGTH_SQUARED.compute(RICH_REFERENCE.positions)).toBeLessThan(1e-9);
    expect(CUTOFF_AREA.compute(RICH_REFERENCE.positions)).toBeLessThan(1e-9);
  });

  it('cell-margin: Rich has a strictly positive gap, and the energy is scale-free', () => {
    const p = RICH_REFERENCE.positions;
    const report = minSeparation(RICH, p);
    expect(report.distance).toBeGreaterThan(0);

    // Scale-invariance: inflating the mesh leaves the cell-margin energy fixed.
    const scaled = Float64Array.from(p, (v) => v * 3.7);
    expect(CELL_MARGIN.compute(scaled)).toBeCloseTo(CELL_MARGIN.compute(p), 9);
    expect(linearSize(RICH, scaled)).toBeCloseTo(3.7 * linearSize(RICH, p), 9);
  });

  it('cell-barrier: 0 when nothing is within δ, positive once δ exceeds the min gap, scale-free', () => {
    const p = RICH_REFERENCE.positions;
    const m = minCellGap(RICH, p);
    // δ tiny → no gap is within it → barrier inactive.
    expect(makeCellBarrier(RICH, { delta: 1e-9 }).compute(p)).toBe(0);
    // δ past the smallest cell gap → at least that pair is active → barrier > 0.
    expect(makeCellBarrier(RICH, { delta: 10 * m }).compute(p)).toBeGreaterThan(0);
    // scale-free: gaps are normalized by √area, so inflation leaves the barrier fixed.
    const scaled = Float64Array.from(p, (v) => v * 3.7);
    const B = makeCellBarrier(RICH, { delta: 0.2 });
    expect(B.compute(scaled)).toBeCloseTo(B.compute(p), 9);
  });

  it('cell-barrier blows up as δ grows (more pairs caught, log → larger)', () => {
    const p = RICH_REFERENCE.positions;
    const m = minCellGap(RICH, p);
    const small = makeCellBarrier(RICH, { delta: 1.5 * m }).compute(p);
    const big = makeCellBarrier(RICH, { delta: 5 * m }).compute(p);
    expect(big).toBeGreaterThan(small);
  });

  it('totalArea is positive and matches √-scaling of linearSize', () => {
    const a = totalArea(RICH, RICH_REFERENCE.positions);
    expect(a).toBeGreaterThan(0);
    expect(linearSize(RICH, RICH_REFERENCE.positions)).toBeCloseTo(Math.sqrt(a), 12);
  });

  it('gradient points downhill: a small step along −∇E lowers E', () => {
    // Use a perturbed (slightly non-embedded-prone) config so the energy is live.
    const rng = mulberry32(5);
    const p = Float64Array.from(RICH_REFERENCE.positions, (v) => v + 0.15 * (rng() * 2 - 1));
    const e0 = CUTOFF_AREA.compute(p);
    if (e0 > 1e-6) {
      const g = new Float64Array(24);
      CUTOFF_AREA.grad(p, g);
      const step = Float64Array.from(p, (v, i) => v - 1e-4 * g[i]);
      expect(CUTOFF_AREA.compute(step)).toBeLessThanOrEqual(e0 + 1e-12);
    }
  });
});
