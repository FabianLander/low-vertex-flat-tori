import { describe, it, expect } from 'vitest';
import { triTriChord, planeCutRatio } from '@core/geometry/intersection.ts';
import { cellTables } from '@core/embedding/index.ts';
import { RICH_REFERENCE } from '@core/sampling/reference.ts';
import { RICH } from '@core/triangulations/index.ts';

const TRIANGLES = RICH.triangles;
const DISJOINT_TRIANGLE_PAIRS = cellTables(RICH).disjointTrianglePairs;

// triTriChord is torus-blind and coordinates-only. These helpers build a positions
// buffer holding the 6 vertices of a chosen pair, then read the corners out of it —
// exactly the buffer adapter the energy layer (overlap.ts `pairChord`) uses.
function posFor(triA: readonly number[], triB: readonly number[], coords: Record<number, [number, number, number]>): number[] {
  const p: number[] = new Array(8 * 3).fill(0);
  for (const v of [...triA, ...triB]) {
    const c = coords[v];
    p[3 * v] = c[0]; p[3 * v + 1] = c[1]; p[3 * v + 2] = c[2];
  }
  return p;
}

function chord(p: ArrayLike<number>, A: readonly number[], B: readonly number[]) {
  const a0 = 3 * A[0], a1 = 3 * A[1], a2 = 3 * A[2], b0 = 3 * B[0], b1 = 3 * B[1], b2 = 3 * B[2];
  return triTriChord(
    p[a0], p[a0 + 1], p[a0 + 2], p[a1], p[a1 + 1], p[a1 + 2], p[a2], p[a2 + 1], p[a2 + 2],
    p[b0], p[b0 + 1], p[b0 + 2], p[b1], p[b1 + 1], p[b1 + 2], p[b2], p[b2 + 1], p[b2 + 2],
  );
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

describe('planeCutRatio', () => {
  it('plane through a median splits a triangle (ratio in (0, 0.5])', () => {
    // triangle (0,0,0),(2,0,0),(0,2,0); plane x = 1 (normal +x, ref (1,0,0)) cuts it
    const r = planeCutRatio(0, 0, 0, 2, 0, 0, 0, 2, 0, 1, 0, 0, 1, 0, 0);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThanOrEqual(0.5);
  });
  it('is 0 when the plane misses the triangle (all vertices one side)', () => {
    const r = planeCutRatio(0, 0, 0, 2, 0, 0, 0, 2, 0, 1, 0, 0, -1, 0, 0); // plane x = −1
    expect(r).toBe(0);
  });
});
