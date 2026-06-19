import { describe, it, expect } from 'vitest';
import { triTriChord } from '@core/geometry/intersectionChord';
import { cellTables } from '@core/embedding/index';
import { RICH_REFERENCE } from '@core/sampling/reference';
import { RICH } from '@core/triangulations';

const TRIANGLES = RICH.triangles;
const DISJOINT_TRIANGLE_PAIRS = cellTables(RICH).disjointTrianglePairs;

// triTriChord is torus-blind: it reads two triangles from a shared positions
// buffer at the six vertex offsets the caller passes. These helpers build a
// positions buffer holding exactly the 6 vertices of a chosen pair and call the
// kernel with offsets 3·vertexId (matching how the energy layer invokes it).
function posFor(triA: readonly number[], triB: readonly number[], coords: Record<number, [number, number, number]>): number[] {
  const p: number[] = new Array(8 * 3).fill(0);
  for (const v of [...triA, ...triB]) {
    const c = coords[v];
    p[3 * v] = c[0]; p[3 * v + 1] = c[1]; p[3 * v + 2] = c[2];
  }
  return p;
}

function chord(p: ArrayLike<number>, A: readonly number[], B: readonly number[]) {
  return triTriChord(p, 3 * A[0], 3 * A[1], 3 * A[2], 3 * B[0], 3 * B[1], 3 * B[2]);
}

describe('triTriChord', () => {
  it('returns null for two well-separated triangles', () => {
    const [tA, tB] = DISJOINT_TRIANGLE_PAIRS[0];
    const A = TRIANGLES[tA], B = TRIANGLES[tB];
    const p = posFor(A, B, {
      [A[0]]: [0, 0, 0], [A[1]]: [1, 0, 0], [A[2]]: [0, 1, 0],
      [B[0]]: [0, 0, 10], [B[1]]: [1, 0, 10], [B[2]]: [0, 1, 10],
    });
    expect(chord(p, A, B)).toBeNull();
  });

  it('finds the chord of two crossing triangles and is symmetric in A,B', () => {
    const [tA, tB] = DISJOINT_TRIANGLE_PAIRS[0];
    const A = TRIANGLES[tA], B = TRIANGLES[tB];
    // A in the z=0 plane; B vertical, slicing through A so the chord runs along x∈[0,1].
    const p = posFor(A, B, {
      [A[0]]: [-1, -1, 0], [A[1]]: [3, -1, 0], [A[2]]: [-1, 3, 0],
      [B[0]]: [0, 0.5, -1], [B[1]]: [1, 0.5, -1], [B[2]]: [0.5, 0.5, 2],
    });
    const ab = chord(p, A, B);
    const ba = chord(p, B, A);
    expect(ab).not.toBeNull();
    expect(ba).not.toBeNull();
    expect(ab!.length).toBeGreaterThan(0);
    expect(ab!.length).toBeCloseTo(ba!.length, 9);
  });

  it('embedded Rich has no non-adjacent chord (all null or zero-length)', () => {
    const p = RICH_REFERENCE.positions;
    for (const [tA, tB] of DISJOINT_TRIANGLE_PAIRS) {
      const c = chord(p, TRIANGLES[tA], TRIANGLES[tB]);
      if (c) expect(c.length).toBeLessThan(1e-9);
    }
  });
});
