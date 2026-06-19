import { describe, it, expect } from 'vitest';
import { ALL_TORI } from '@core/triangulations';
import { collapse, isReducible } from '@core/topology/pachner';

/** How many triangulations on V vertices are 1→3 subdivisions of a smaller one. */
const reducibleCount = (V: number) =>
  ALL_TORI.filter((t) => t.vertexCount === V && isReducible(t.triangles)).length;

describe('pachner — 1→3 subdivisions vs irreducible ("new") triangulations', () => {
  it('the 7-vertex Császár torus is irreducible', () => {
    const c7 = ALL_TORI.filter((t) => t.vertexCount === 7);
    expect(c7.every((t) => !isReducible(t.triangles))).toBe(true);
  });

  it('exactly one of the seven 8-vertex types is a subdivision (the other six, incl. Rich, are new)', () => {
    expect(reducibleCount(8)).toBe(1);
    expect(isReducible(ALL_TORI.find((t) => t.id === 'v8-7')!.triangles)).toBe(false); // Rich is irreducible
  });

  it('37 of the 112 nine-vertex triangulations are subdivisions; 75 are genuinely new', () => {
    expect(reducibleCount(9)).toBe(37);
  });

  it('collapsing the lone reducible 8-vertex (v8-1) yields a 7-vertex torus', () => {
    const t = ALL_TORI.find((x) => x.id === 'v8-1')!;
    let collapsed: ReturnType<typeof collapse> = null;
    for (let v = 0; v < t.vertexCount; v++) { const c = collapse(t.triangles, v); if (c) { collapsed = c; break; } }
    expect(collapsed).not.toBeNull();
    expect(Math.max(...collapsed!.flat()) + 1).toBe(7);   // collapse validated it's a valid torus
  });
});
