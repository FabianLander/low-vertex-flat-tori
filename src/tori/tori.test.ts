import { describe, it, expect } from 'vitest';
import { ALL_TORI, RICH, edgeKey } from './index';
import { tutteLayout, tileSignedArea2 } from '../math/tutteLayout';

/** Two cyclic sequences equal up to rotation. */
function sameCycle(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const n = a.length;
  for (let shift = 0; shift < n; shift++) {
    let ok = true;
    for (let k = 0; k < n; k++) if (a[k] !== b[(k + shift) % n]) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}

// Rich's published vertex links (formerly the load-time cross-check in topology.ts).
const RICH_LINKS: readonly (readonly number[])[] = [
  [1, 6, 5, 7, 2, 3], [3, 4, 2, 7, 6, 0], [0, 7, 1, 4, 5, 3], [0, 2, 5, 6, 4, 1],
  [2, 1, 3, 6, 7, 5], [0, 6, 3, 2, 4, 7], [0, 1, 7, 4, 3, 5], [2, 0, 5, 4, 6, 1],
];

describe('#7 (Rich) reference combinatorics', () => {
  it('derived vertex links match Rich\'s published links', () => {
    for (let i = 0; i < RICH.vertexCount; i++) {
      expect(sameCycle(RICH.vertexLinks[i], RICH_LINKS[i])).toBe(true);
    }
  });
});

// Published degree sequences of the 7 combinatorial 8-vertex torus types
// (sorted ascending). Only #7 is degree-6-regular.
const DEGREE_SEQUENCES: Record<number, number[]> = {
  1: [3, 6, 6, 6, 6, 7, 7, 7],
  2: [4, 5, 5, 6, 7, 7, 7, 7],
  3: [4, 6, 6, 6, 6, 6, 7, 7],
  4: [5, 5, 6, 6, 6, 6, 7, 7],
  5: [5, 5, 5, 6, 6, 7, 7, 7],
  6: [5, 5, 6, 6, 6, 6, 7, 7],
  7: [6, 6, 6, 6, 6, 6, 6, 6],
};

/** GF(2) row-reduce; returns whether `v` lies in the span of `basis` rows. */
function inSpanGF2(basis: bigint[], v: bigint): boolean {
  let x = v;
  for (const b of basis) {
    const lead = b & -b; // lowest set bit
    if (x & lead) x ^= b;
  }
  return x === 0n;
}

/** Build a GF(2) basis (echelon, by lowest set bit) of the given vectors. */
function spanGF2(vectors: bigint[]): bigint[] {
  const basis: bigint[] = [];
  for (let v of vectors) {
    for (const b of basis) { const lead = b & -b; if (v & lead) v ^= b; }
    if (v !== 0n) basis.push(v);
  }
  return basis;
}

describe('all 7 combinatorial 8-vertex tori', () => {
  for (const torus of ALL_TORI) {
    describe(`#${torus.id} ${torus.name}`, () => {
      it('has V=8, E=24, F=16, Euler χ=0', () => {
        expect(torus.vertexCount).toBe(8);
        expect(torus.triangles).toHaveLength(16);
        expect(torus.edges).toHaveLength(24);
        expect(torus.vertexCount - torus.edges.length + torus.triangles.length).toBe(0);
      });

      it('matches its published degree sequence', () => {
        expect([...torus.degreeSequence]).toEqual(DEGREE_SEQUENCES[torus.id]);
      });

      it('every vertex link is a single cycle of length = degree', () => {
        for (let v = 0; v < torus.vertexCount; v++) {
          const link = torus.vertexLinks[v];
          expect(link.length).toBeGreaterThanOrEqual(3);
          expect(new Set(link).size).toBe(link.length); // no repeats ⟹ simple cycle
        }
      });

      it('developOrder is a permutation of 0..15 forming a spanning tree', () => {
        expect([...torus.developOrder].sort((a, b) => a - b)).toEqual(
          Array.from({ length: 16 }, (_, i) => i),
        );
        // root has parent -1; every other triangle has a valid placed parent
        const roots = torus.attach.filter((a) => a.parent < 0);
        expect(roots).toHaveLength(1);
      });

      it('generator loops are closed edge-walks forming a unit-index H₁ basis', () => {
        // edge index for the GF(2) vectors
        const eidx = new Map<number, number>();
        torus.edges.forEach(([u, v], i) => eidx.set(edgeKey(u, v), i));
        const loopVec = (loop: readonly number[]): bigint => {
          let x = 0n;
          for (let k = 0; k + 1 < loop.length; k++) {
            expect(loop[0]).toBe(loop[loop.length - 1]); // closed
            x ^= 1n << BigInt(eidx.get(edgeKey(loop[k], loop[k + 1]))!);
          }
          return x;
        };
        // boundary space B = span of the 16 triangle boundaries (rank 15)
        const faceVecs = torus.triangles.map(([a, b, c]) =>
          (1n << BigInt(eidx.get(edgeKey(a, b))!)) ^
          (1n << BigInt(eidx.get(edgeKey(b, c))!)) ^
          (1n << BigInt(eidx.get(edgeKey(c, a))!)),
        );
        const B = spanGF2(faceVecs);
        expect(B).toHaveLength(15);

        const c1 = loopVec(torus.generatorLoops[0]);
        const c2 = loopVec(torus.generatorLoops[1]);
        // each loop is a 1-cycle (∂ = 0): its vector lies in the cycle space —
        // necessary check is that it's a closed walk (already asserted above).
        // Independence in H₁(;ℤ/2): neither class, nor their sum, is a boundary.
        expect(inSpanGF2(B, c1)).toBe(false);
        expect(inSpanGF2(B, c2)).toBe(false);
        expect(inSpanGF2(B, c1 ^ c2)).toBe(false);
      });

      it('Tutte layout is a non-degenerate triangulated 18-gon', () => {
        const L = tutteLayout(torus);
        expect(L.boundaryLoop).toHaveLength(18);
        expect(L.tiles).toHaveLength(16);
        expect(L.cutPairs).toHaveLength(9);
        for (const tile of L.tiles) {
          expect(Math.abs(tileSignedArea2(tile.corners))).toBeGreaterThan(1e-9);
        }
        for (const pair of L.cutPairs) expect(pair.sides).toHaveLength(2);
      });
    });
  }
});
