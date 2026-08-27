import { describe, it, expect } from 'vitest';
import { paperToObj, paperFromObj } from '@display/mesh/obj';
import { makePaperTorus } from '@core/configuration/paperTorus.ts';
import { RICH_REFERENCE } from '@core/sampling/reference';
import { RICH, byId, ALL_TORI } from '@core/triangulations';
import { SQUARE_FOLD, HEXAGONAL_FOLD, liftedPositions } from '@core/sampling/foldedBases.ts';

const EIGHT = ALL_TORI.filter((t) => t.vertexCount === 8);

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

describe('paperFromObj', () => {
  it('round-trips positions at full precision', () => {
    const original = makePaperTorus(SQUARE_FOLD.triang, liftedPositions(SQUARE_FOLD, 0.3));
    const back = paperFromObj(paperToObj(original), [SQUARE_FOLD.triang]);
    expect(back.triang.id).toBe(SQUARE_FOLD.triang.id);
    for (let i = 0; i < original.positions.length; i++) {
      expect(back.positions[i]).toBe(original.positions[i]);   // exact: shortest round-trip formatting
    }
  });

  it('identifies which triangulation a file belongs to, given the whole census', () => {
    for (const base of [SQUARE_FOLD, HEXAGONAL_FOLD]) {
      const paper = makePaperTorus(base.triang, liftedPositions(base, 0.05));
      const back = paperFromObj(paperToObj(paper), EIGHT);
      expect(back.triang.id).toBe(base.triang.id);
    }
  });

  it('rejects a file whose faces match none of the candidates', () => {
    // v8-7's coordinates written out, but offered only v8-3 as a candidate
    const paper = makePaperTorus(byId('v8-7'), liftedPositions(SQUARE_FOLD, 0.1));
    expect(() => paperFromObj(paperToObj(paper), [byId('v8-3')])).toThrow(/matches none/);
  });

  it('accepts the v/vt/vn face forms', () => {
    const paper = makePaperTorus(SQUARE_FOLD.triang, liftedPositions(SQUARE_FOLD, 0.2));
    const decorated = paperToObj(paper).replace(/^f (\d+) (\d+) (\d+)$/gm, 'f $1/1/1 $2/1/1 $3/1/1');
    const back = paperFromObj(decorated, [SQUARE_FOLD.triang]);
    expect(Array.from(back.positions)).toEqual(Array.from(paper.positions));
  });
});
