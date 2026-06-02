import { describe, it, expect } from 'vitest';
import { triTriChord } from './intersectionChord';
import { RICH_REFERENCE } from './reference';
import { RICH } from '../tori';

const TRIANGLES = RICH.triangles;
const DISJOINT_TRIANGLE_PAIRS = RICH.disjointTrianglePairs;

// triTriChord reads its two triangles from TRIANGLES[tA], TRIANGLES[tB] and
// indexes a positions array by global vertex id — so we build a positions
// buffer holding exactly the 6 vertices the chosen triangle pair references.
function posFor(triA: readonly number[], triB: readonly number[], coords: Record<number, [number, number, number]>): number[] {
  const p: number[] = new Array(8 * 3).fill(0);
  for (const v of [...triA, ...triB]) {
    const c = coords[v];
    p[3 * v] = c[0]; p[3 * v + 1] = c[1]; p[3 * v + 2] = c[2];
  }
  return p;
}

describe('triTriChord', () => {
  it('returns null for two well-separated triangles', () => {
    const [tA, tB] = DISJOINT_TRIANGLE_PAIRS[0];
    const A = TRIANGLES[tA], B = TRIANGLES[tB];
    const p = posFor(A, B, {
      [A[0]]: [0, 0, 0], [A[1]]: [1, 0, 0], [A[2]]: [0, 1, 0],
      [B[0]]: [0, 0, 10], [B[1]]: [1, 0, 10], [B[2]]: [0, 1, 10],
    });
    expect(triTriChord(RICH, p, tA, tB)).toBeNull();
  });

  it('finds the chord of two crossing triangles and is symmetric in A,B', () => {
    const [tA, tB] = DISJOINT_TRIANGLE_PAIRS[0];
    const A = TRIANGLES[tA], B = TRIANGLES[tB];
    // A in the z=0 plane; B vertical, slicing through A so the chord runs along x∈[0,1].
    const p = posFor(A, B, {
      [A[0]]: [-1, -1, 0], [A[1]]: [3, -1, 0], [A[2]]: [-1, 3, 0],
      [B[0]]: [0, 0.5, -1], [B[1]]: [1, 0.5, -1], [B[2]]: [0.5, 0.5, 2],
    });
    const ab = triTriChord(RICH, p, tA, tB);
    const ba = triTriChord(RICH, p, tB, tA);
    expect(ab).not.toBeNull();
    expect(ba).not.toBeNull();
    expect(ab!.length).toBeGreaterThan(0);
    expect(ab!.length).toBeCloseTo(ba!.length, 9);
  });

  it('embedded Rich has no non-adjacent chord (all null or zero-length)', () => {
    const p = RICH_REFERENCE.positions;
    for (const [tA, tB] of DISJOINT_TRIANGLE_PAIRS) {
      const c = triTriChord(RICH, p, tA, tB);
      if (c) expect(c.length).toBeLessThan(1e-9);
    }
  });
});
