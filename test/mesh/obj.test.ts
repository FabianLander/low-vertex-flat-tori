import { describe, it, expect } from 'vitest';
import { paperToObj } from '@display/mesh/obj';
import { RICH_REFERENCE } from '@core/sampling/reference';
import { RICH } from '@core/triangulations';

describe('paperToObj — the realization as a Wavefront OBJ polyhedron', () => {
  const obj = paperToObj(RICH_REFERENCE);
  const lines = obj.trim().split('\n');

  it('emits one v per vertex and one f per triangle', () => {
    expect(lines.filter((l) => l.startsWith('v ')).length).toBe(RICH.vertexCount);
    expect(lines.filter((l) => l.startsWith('f ')).length).toBe(RICH.triangles.length);
  });

  it('faces are 1-indexed and reference the authored triangle vertices', () => {
    const faces = lines.filter((l) => l.startsWith('f ')).map((l) => l.slice(2).split(' ').map(Number));
    faces.forEach((f, t) => {
      const [a, b, c] = RICH.triangles[t];
      expect(f).toEqual([a + 1, b + 1, c + 1]);
      for (const idx of f) expect(idx).toBeGreaterThanOrEqual(1);
    });
  });
});
