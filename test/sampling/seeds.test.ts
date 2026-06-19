import { describe, it, expect } from 'vitest';
import { gridSeeds } from '@core/sampling/seeds.ts';
import { fullSpace } from '@core/coordinates/full.ts';
import { RICH } from '@core/triangulations/index.ts';
import { RICH_REFERENCE } from '@core/sampling/reference.ts';

describe('gridSeeds — deterministic Cartesian sweep over coordinate-system params', () => {
  const space = fullSpace(RICH);                // φ = id, so a param point IS the config
  const base = RICH_REFERENCE.positions;

  it('enumerates the full product, then exhausts (returns null)', () => {
    const draw = gridSeeds(space, base, [
      { axis: 2, values: [-1, 0, 1] },          // 3
      { axis: 5, values: [0.5, 0.7] },          // × 2
    ]);
    const seen: Float64Array[] = [];
    for (let s = draw(); s !== null; s = draw()) seen.push(Float64Array.from(s));
    expect(seen.length).toBe(6);                 // 3 × 2 product
    expect(draw()).toBeNull();                   // still exhausted

    // every (axis 2, axis 5) combination appears exactly once; other coords = base
    const combos = new Set(seen.map((p) => `${p[2]},${p[5]}`));
    expect(combos).toEqual(new Set(['-1,0.5', '-1,0.7', '0,0.5', '0,0.7', '1,0.5', '1,0.7']));
    for (const p of seen) {
      for (let i = 0; i < p.length; i++) {
        if (i !== 2 && i !== 5) expect(p[i]).toBe(base[i]);   // untouched axes held at base
      }
    }
  });

  it('with no axes, yields the base once (the anchor) then null', () => {
    const draw = gridSeeds(space, base, []);
    const first = draw();
    expect(first).not.toBeNull();
    expect([...first!]).toEqual([...base]);
    expect(draw()).toBeNull();
  });

  it('an empty axis makes the product empty', () => {
    const draw = gridSeeds(space, base, [{ axis: 0, values: [] }]);
    expect(draw()).toBeNull();
  });

  it('rejects a base of the wrong length', () => {
    expect(() => gridSeeds(space, new Float64Array(5), [])).toThrow();
  });
});
