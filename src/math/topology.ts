/**
 * Combinatorics of the 8-vertex flat torus.
 * Topology is a global constant — never changes during the run.
 *
 * Source: Rich Schwartz, rich/VertexMinimalPaper/8Vertex/Visual/TriangulationCombinatorics.java.
 * V=8, E=24, F=16. Euler χ=0. Every vertex has degree 6.
 */

export const VERTEX_COUNT = 8;

export const TRIANGLES: readonly (readonly [number, number, number])[] = [
  [3, 5, 6], [3, 2, 5], [3, 6, 4], [3, 0, 2], [3, 4, 1], [3, 1, 0],
  [5, 0, 6], [5, 2, 4], [5, 4, 7], [5, 7, 0],
  [6, 7, 4], [6, 0, 1], [6, 1, 7],
  [2, 1, 4], [2, 0, 7], [2, 7, 1],
];

function deriveEdges(): readonly (readonly [number, number])[] {
  const seen = new Set<string>();
  const out: [number, number][] = [];
  for (const [a, b, c] of TRIANGLES) {
    for (const pair of [[a, b], [b, c], [c, a]] as const) {
      const lo = Math.min(pair[0], pair[1]);
      const hi = Math.max(pair[0], pair[1]);
      const key = `${lo},${hi}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push([lo, hi]);
      }
    }
  }
  if (out.length !== 24) {
    throw new Error(`expected 24 edges, got ${out.length}`);
  }
  return out;
}

export const EDGES = deriveEdges();

/**
 * Cyclic vertex links. VERTEX_LINKS[i] lists the 6 neighbors of vertex i
 * in CCW order around i in the triangulation (consistent with the orientation
 * of the TRIANGLES list). Derived once at module load by walking the directed
 * graph induced on each 1-ring: triangle (a,b,c) contributes link edges
 * b→c at a, c→a at b, a→b at c.
 *
 * Cross-checked against Rich's hard-coded links (NewtonsMethodBig.java 234–245).
 */
function deriveVertexLinks(): readonly (readonly number[])[] {
  const next: Map<number, number>[] = Array.from(
    { length: VERTEX_COUNT },
    () => new Map<number, number>(),
  );
  for (const [a, b, c] of TRIANGLES) {
    next[a].set(b, c);
    next[b].set(c, a);
    next[c].set(a, b);
  }
  const links: number[][] = [];
  for (let i = 0; i < VERTEX_COUNT; i++) {
    const m = next[i];
    if (m.size !== 6) {
      throw new Error(`vertex ${i} has ${m.size} link neighbors, expected 6`);
    }
    const start = m.keys().next().value as number;
    const cycle: number[] = [start];
    let cur = start;
    for (let step = 0; step < 5; step++) {
      const nxt = m.get(cur);
      if (nxt === undefined) throw new Error(`broken link at vertex ${i}`);
      cycle.push(nxt);
      cur = nxt;
    }
    if (m.get(cur) !== start) {
      throw new Error(`link at vertex ${i} does not close`);
    }
    links.push(cycle);
  }
  return links;
}

export const VERTEX_LINKS = deriveVertexLinks();

// One-time sanity check against Rich's published vertex links.
const RICH_LINKS: readonly (readonly number[])[] = [
  [1, 6, 5, 7, 2, 3],
  [3, 4, 2, 7, 6, 0],
  [0, 7, 1, 4, 5, 3],
  [0, 2, 5, 6, 4, 1],
  [2, 1, 3, 6, 7, 5],
  [0, 6, 3, 2, 4, 7],
  [0, 1, 7, 4, 3, 5],
  [2, 0, 5, 4, 6, 1],
];
function sameCycle(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const n = a.length;
  for (let shift = 0; shift < n; shift++) {
    let ok = true;
    for (let k = 0; k < n; k++) {
      if (a[k] !== b[(k + shift) % n]) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}
for (let i = 0; i < VERTEX_COUNT; i++) {
  if (!sameCycle(VERTEX_LINKS[i], RICH_LINKS[i])) {
    console.warn(
      `[topology] vertex ${i} link mismatch: derived=[${VERTEX_LINKS[i]}] rich=[${RICH_LINKS[i]}]`,
    );
  }
}
