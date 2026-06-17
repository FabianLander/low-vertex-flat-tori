/**
 * Harmonic (Tutte) embedding of any 8-vertex torus triangulation into a flat
 * torus ℝ²/Λ — the "lattice patch" picture. Works for ALL seven combinatorial
 * types, including the six with degree-5/7 vertices. For the regular torus (#7)
 * the result IS the equilateral triangular lattice.
 *
 * Construction (Gortler–Gotsman–Thurston style):
 *   1. Tree–cotree decomposition ⟹ a primal spanning tree T and exactly two
 *      leftover edges g₁, g₂ generating H₁.
 *   2. Two integer cocycles α, β (vanish on T, dual to g₁, g₂): α(e), β(e) ∈ ℤ
 *      with zero sum around every triangle. These are the period jumps.
 *   3. Fix a period basis (V₁, V₂) and solve the uniform-weight harmonic system
 *      (graph Laplacian) Lx = b for the 8 vertex positions, where each edge i→j
 *      contributes its period jump α·V₁ + β·V₂. The result is a flip-free flat
 *      embedding (positive weights ⟹ no inverted triangles).
 *   4. Whiten by the edge covariance so the average triangle is isotropic — this
 *      removes the arbitrary global shear, making #7 come out equilateral and
 *      every other torus as regular as its combinatorics allows.
 *
 * The 16 base triangles tile the plane under Λ = ⟨V₁, V₂⟩; `periodicTiles`
 * returns a window of lattice translates (the universal-cover patch).
 *
 * Pure: no DOM, no three.js.
 */

import type { Triangulation } from './triangulation';
import { edgeKey } from './triangulation';

export type XY = [number, number];

export type HarmonicTile = { readonly id: number; readonly corners: XY[] };

export type HarmonicLayout = {
  /** 8 vertex base positions (one lift each). */
  readonly vertexPos: XY[];
  /** The 16 triangles, each developed from its first vertex's lift. */
  readonly tiles: HarmonicTile[];
  /** Period lattice basis (after whitening). */
  readonly V1: XY;
  readonly V2: XY;
  /** Integer period jump of directed edge i→j, in lattice (α,β) coordinates. */
  readonly jump: (i: number, j: number) => readonly [number, number];
};

// --- small dense solver (Gauss–Jordan with partial pivoting) ---
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col];
    if (Math.abs(d) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / d;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => (Math.abs(M[i][i]) < 1e-12 ? 0 : row[n] / M[i][i]));
}

const sgn = (u: number, v: number) => (u < v ? 1 : -1); // cochain stored for min→max

/** Tree–cotree: primal spanning tree edges + the two H₁ generator edges. */
function treeCotree(torus: Triangulation): { inT: Set<number>; gens: number[] } {
  const { edges, triangles, edgeToTris, vertexCount } = torus;
  const adj: number[][] = Array.from({ length: vertexCount }, () => []);
  for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u); }
  const inT = new Set<number>();
  const seen = new Set([0]); const q = [0];
  for (let h = 0; h < q.length; h++) for (const v of adj[q[h]]) if (!seen.has(v)) { seen.add(v); inT.add(edgeKey(q[h], v)); q.push(v); }
  const inDual = new Set<number>();
  const ts = new Set([0]); const tq = [0];
  for (let h = 0; h < tq.length; h++) {
    const t = tq[h]; const tri = triangles[t];
    for (let s = 0; s < 3; s++) {
      const k = edgeKey(tri[s], tri[(s + 1) % 3]);
      if (inT.has(k)) continue;
      const [tA, tB] = edgeToTris.get(k)!; const nb = tA === t ? tB : tA;
      if (!ts.has(nb)) { ts.add(nb); inDual.add(k); tq.push(nb); }
    }
  }
  const gens: number[] = [];
  for (const [u, v] of edges) { const k = edgeKey(u, v); if (!inT.has(k) && !inDual.has(k)) gens.push(k); }
  if (gens.length !== 2) throw new Error(`tree–cotree gave ${gens.length} generators, expected 2`);
  return { inT, gens };
}

/** Integer cocycle vanishing on T with the given values on the two generators. */
function cocycle(torus: Triangulation, inT: Set<number>, gens: number[], gVals: [number, number]): Map<number, number> {
  const { edges, triangles } = torus;
  const unk: number[] = [];
  const idx = new Map<number, number>();
  const fixed = new Map<number, number>();
  for (const k of inT) fixed.set(k, 0);
  gens.forEach((g, i) => fixed.set(g, gVals[i]));
  for (const [u, v] of edges) { const k = edgeKey(u, v); if (!fixed.has(k)) { idx.set(k, unk.length); unk.push(k); } }
  const A: number[][] = []; const b: number[] = [];
  for (const [a, bb, c] of triangles) {
    const row = new Array(unk.length).fill(0); let rhs = 0;
    for (const [u, v] of [[a, bb], [bb, c], [c, a]] as const) {
      const k = edgeKey(u, v); const s = sgn(u, v);
      if (fixed.has(k)) rhs -= s * fixed.get(k)!;
      else row[idx.get(k)!] += s;
    }
    A.push(row); b.push(rhs);
  }
  A.pop(); b.pop(); // 16 triangle equations, rank 15 ⟹ drop one
  const x = solve(A, b);
  const al = new Map<number, number>();
  for (const k of fixed.keys()) al.set(k, fixed.get(k)!);
  unk.forEach((k, i) => al.set(k, Math.round(x[i])));
  return al;
}

/** C^{-1/2} for a symmetric PD 2×2 [[a,b],[b,d]], returned as a 2×2 matrix. */
function invSqrt2x2(a: number, b: number, d: number): [number, number, number, number] {
  const tr = a + d, det = a * d - b * b;
  const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
  const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
  // orthonormal eigenvectors paired with their OWN eigenvalues
  let e1: XY, e2: XY;
  if (Math.abs(b) > 1e-12) {
    e1 = [b, l1 - a]; e2 = [b, l2 - a];
  } else {
    // diagonal: x-axis has eigenvalue a, y-axis has eigenvalue d
    e1 = [1, 0]; e2 = [0, 1];
    return [1 / Math.sqrt(a || 1), 0, 0, 1 / Math.sqrt(d || 1)];
  }
  const n1 = Math.hypot(...e1) || 1, n2 = Math.hypot(...e2) || 1;
  e1 = [e1[0] / n1, e1[1] / n1]; e2 = [e2[0] / n2, e2[1] / n2];
  const s1 = 1 / Math.sqrt(l1 || 1), s2 = 1 / Math.sqrt(l2 || 1);
  // W = s1 e1 e1ᵀ + s2 e2 e2ᵀ
  return [
    s1 * e1[0] * e1[0] + s2 * e2[0] * e2[0],
    s1 * e1[0] * e1[1] + s2 * e2[0] * e2[1],
    s1 * e1[1] * e1[0] + s2 * e2[1] * e2[0],
    s1 * e1[1] * e1[1] + s2 * e2[1] * e2[1],
  ];
}

/** Develop a torus into a flat-torus harmonic embedding (see module doc). */
export function harmonicLayout(torus: Triangulation): HarmonicLayout {
  const { edges, triangles, vertexCount } = torus;
  const { inT, gens } = treeCotree(torus);
  const al = cocycle(torus, inT, gens, [1, 0]);
  const be = cocycle(torus, inT, gens, [0, 1]);

  const jump = (i: number, j: number): [number, number] => {
    const k = edgeKey(i, j), s = sgn(i, j);
    return [s * al.get(k)!, s * be.get(k)!];
  };

  // start from a 60° basis (nice for the regular case); whitening fixes the rest
  let V1: XY = [1, 0], V2: XY = [0.5, Math.sqrt(3) / 2];
  const period = (i: number, j: number): XY => {
    const [a, b] = jump(i, j);
    return [a * V1[0] + b * V2[0], a * V1[1] + b * V2[1]];
  };

  // uniform-weight harmonic solve, per coordinate, fixing vertex 0 at origin
  const adj: number[][] = Array.from({ length: vertexCount }, () => []);
  for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u); }
  const L: number[][] = Array.from({ length: vertexCount }, () => new Array(vertexCount).fill(0));
  const rx = new Array(vertexCount).fill(0), ry = new Array(vertexCount).fill(0);
  for (let i = 0; i < vertexCount; i++) for (const j of adj[i]) {
    L[i][i] += 1; L[i][j] -= 1;
    const p = period(i, j); rx[i] += p[0]; ry[i] += p[1];
  }
  L[0] = new Array(vertexCount).fill(0); L[0][0] = 1; rx[0] = 0; ry[0] = 0;
  const xs = solve(L.map((r) => [...r]), rx);
  const ys = solve(L.map((r) => [...r]), ry);
  let vertexPos: XY[] = xs.map((xv, i) => [xv, ys[i]]);

  // develop each triangle from its first vertex via period-corrected edges
  const develop = (): HarmonicTile[] => {
    const d = (i: number, j: number): XY => { const p = period(i, j); return [vertexPos[j][0] + p[0] - vertexPos[i][0], vertexPos[j][1] + p[1] - vertexPos[i][1]]; };
    return triangles.map(([a, b, c], t) => {
      const A0 = vertexPos[a];
      const dab = d(a, b), dbc = d(b, c);
      const B0: XY = [A0[0] + dab[0], A0[1] + dab[1]];
      const C0: XY = [B0[0] + dbc[0], B0[1] + dbc[1]];
      return { id: t, corners: [A0, B0, C0] as XY[] };
    });
  };
  let tiles = develop();

  // whiten by edge covariance ⟹ average triangle isotropic (removes global shear)
  let cxx = 0, cxy = 0, cyy = 0;
  for (const { corners } of tiles) for (const [p, q] of [[0, 1], [1, 2], [2, 0]] as const) {
    const ex = corners[q][0] - corners[p][0], ey = corners[q][1] - corners[p][1];
    cxx += ex * ex; cxy += ex * ey; cyy += ey * ey;
  }
  const [w00, w01, w10, w11] = invSqrt2x2(cxx, cxy, cyy);
  const W = (p: XY): XY => [w00 * p[0] + w01 * p[1], w10 * p[0] + w11 * p[1]];

  // apply whitening
  V1 = W(V1); V2 = W(V2);
  vertexPos = vertexPos.map(W);
  tiles = develop();

  // orient positively: if the triangles develop clockwise, mirror in y
  const totalArea2 = tiles.reduce((s, t) => s + tileSignedArea2(t.corners), 0);
  if (totalArea2 < 0) {
    vertexPos = vertexPos.map(([x, y]): XY => [x, -y]);
    V1 = [V1[0], -V1[1]]; V2 = [V2[0], -V2[1]];
    tiles = develop();
  }

  return { vertexPos, tiles, V1, V2, jump };
}

/** Signed (×2) area of a plane triangle. */
export function tileSignedArea2(c: readonly XY[]): number {
  return (c[1][0] - c[0][0]) * (c[2][1] - c[0][1]) - (c[1][1] - c[0][1]) * (c[2][0] - c[0][0]);
}

/**
 * Lattice translates of the 16 base tiles whose centroid falls in `win` — the
 * universal-cover patch tiling the plane.
 */
export function periodicTiles(
  layout: HarmonicLayout,
  win: { x0: number; x1: number; y0: number; y1: number },
  range = 4,
): HarmonicTile[] {
  const { tiles, V1, V2 } = layout;
  const out: HarmonicTile[] = [];
  for (let n = -range; n <= range; n++) for (let m = -range; m <= range; m++) {
    const ox = n * V1[0] + m * V2[0], oy = n * V1[1] + m * V2[1];
    for (const { id, corners } of tiles) {
      const c = corners.map(([x, y]): XY => [x + ox, y + oy]);
      const cx = (c[0][0] + c[1][0] + c[2][0]) / 3, cy = (c[0][1] + c[1][1] + c[2][1]) / 3;
      if (cx >= win.x0 && cx <= win.x1 && cy >= win.y0 && cy <= win.y1) out.push({ id, corners: c });
    }
  }
  return out;
}
