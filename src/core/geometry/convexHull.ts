/**
 * convexHull — classify each point of a finite ℝ³ set as on the convex-hull
 * boundary ∂H or strictly interior to H. The metric-floor primitive behind the
 * Hull-Lemma experiment (does every embedded type-2 torus have an interior vertex?).
 *
 * The test is the supporting-direction one, not a built hull. Write vⱼ = xᵢ − xⱼ.
 * Point i lies on ∂H iff some halfspace through xᵢ holds the whole set, i.e. iff
 * there is a unit direction d with vⱼ·d ≥ 0 for every j. So the signed quantity
 *
 *     m*(i) = max_{‖d‖=1}  min_{j≠i} vⱼ·d        (the SUPPORT MARGIN)
 *
 * classifies xᵢ:  m* > 0 ⟹ a strict hull vertex · m* = 0 ⟹ on ∂H but flush with a
 * face/edge · m* < 0 ⟹ strictly interior. This is exactly Schwartz's ∂H-vs-interior
 * dichotomy (Vertex-Minimal Paper Tori, §2): an interior vertex is one with m* < 0.
 *
 * f(d) = minⱼ vⱼ·d is concave (a min of linears) and positively homogeneous, so its
 * max sits on the unit sphere; we find it by projected-subgradient ascent (subgradient
 * = the active vⱼ⋆), multi-started from strong candidate directions. The method is
 * robust in the load-bearing direction: for a TRUE interior point EVERY d gives
 * f(d) < 0, so it can never be misread as on-hull regardless of iteration budget; the
 * only failure mode is a genuine hull vertex with a very thin normal cone whose
 * supporting direction the ascent misses — `interiorVertexMask` surfaces those as a
 * borderline band rather than silently rounding (see `tol`).
 *
 * Pure: no three.js, no DOM. Cold path (once per sample, not a hot kernel) — tuple ops.
 */

import type { Vec3 } from './vec3.ts';
import { sub, dot, len, normalize } from './vec3.ts';

export interface SupportMarginOptions {
  /** Ascent iterations per restart. Default 150. */
  iters?: number;
}

/** Characteristic scale of the point set: max distance of a point from the centroid.
 *  Used to make the support margin dimensionless (m̂ = m* ÷ scale). */
export function pointScale(points: readonly Vec3[]): number {
  const n = points.length;
  let cx = 0, cy = 0, cz = 0;
  for (const p of points) { cx += p[0]; cy += p[1]; cz += p[2]; }
  cx /= n; cy /= n; cz /= n;
  let s = 0;
  for (const p of points) {
    const d = Math.hypot(p[0] - cx, p[1] - cy, p[2] - cz);
    if (d > s) s = d;
  }
  return s || 1;
}

/**
 * The support margin m*(i) for point i, NORMALIZED by `pointScale` so it is
 * dimensionless. > 0: strict hull vertex · ≈ 0: on a hull face/edge · < 0: interior.
 */
export function supportMargin(points: readonly Vec3[], i: number, opts: SupportMarginOptions = {}): number {
  const iters = opts.iters ?? 150;
  const n = points.length;
  const xi = points[i];
  // vⱼ = xᵢ − xⱼ for j ≠ i.
  const v: Vec3[] = [];
  for (let j = 0; j < n; j++) if (j !== i) v.push(sub(xi, points[j]));
  if (v.length === 0) return 0;

  // f(d) = minⱼ vⱼ·d, and the active index attaining it (the subgradient direction).
  const evalF = (d: Vec3): { f: number; arg: number } => {
    let f = Infinity, arg = 0;
    for (let k = 0; k < v.length; k++) {
      const val = dot(v[k], d);
      if (val < f) { f = val; arg = k; }
    }
    return { f, arg };
  };

  // Candidate start directions: outward from the centroid of the others (the natural
  // supporting normal for a hull vertex), plus each vⱼ direction.
  let cx = 0, cy = 0, cz = 0;
  for (let j = 0; j < n; j++) if (j !== i) { cx += points[j][0]; cy += points[j][1]; cz += points[j][2]; }
  cx /= v.length; cy /= v.length; cz /= v.length;
  // Candidate directions must be genuine units; a degenerate (zero) start would
  // evaluate f at 0 and pollute the running max with a spurious 0 (the true max is
  // negative for interior points). So only keep nonzero candidates.
  const starts: Vec3[] = [];
  const fromCentroid: Vec3 = [xi[0] - cx, xi[1] - cy, xi[2] - cz];
  if (len(fromCentroid) > 1e-12) starts.push(normalize(fromCentroid));
  for (const vk of v) if (len(vk) > 1e-12) starts.push(normalize(vk));

  let best = -Infinity;
  for (const d0 of starts) {
    let d = normalize(d0);
    let localBest = evalF(d).f;
    for (let t = 0; t < iters; t++) {
      const { arg } = evalF(d);
      const g = normalize(v[arg]);               // unit subgradient of the active linear
      const eta = 1 / (t + 2);                    // diminishing step (< 1, so the update below can't cancel d)
      const step: Vec3 = [d[0] + eta * g[0], d[1] + eta * g[1], d[2] + eta * g[2]];
      if (len(step) < 1e-12) continue;            // antipodal subgradient (g ≈ −d): uninformative, skip
      d = normalize(step);
      const f = evalF(d).f;
      if (f > localBest) localBest = f;
    }
    if (localBest > best) best = localBest;
  }
  return best / pointScale(points);
}

/** Normalized support margins for every point (see `supportMargin`). */
export function supportMargins(points: readonly Vec3[], opts: SupportMarginOptions = {}): Float64Array {
  const out = new Float64Array(points.length);
  for (let i = 0; i < points.length; i++) out[i] = supportMargin(points, i, opts);
  return out;
}

/**
 * Mask of strictly-interior points: m*(i) < −tol. Points with |m*| ≤ tol sit on a hull
 * face/edge (or are a thin-cone vertex the ascent under-resolved) and are treated as
 * boundary, NOT interior — the conservative call, since the experiment looks for the
 * existence of interior vertices. `tol` is on the dimensionless margin. Default 1e-6.
 */
export function interiorVertexMask(points: readonly Vec3[], tol = 1e-6, opts: SupportMarginOptions = {}): boolean[] {
  const m = supportMargins(points, opts);
  return Array.from(m, (x) => x < -tol);
}
