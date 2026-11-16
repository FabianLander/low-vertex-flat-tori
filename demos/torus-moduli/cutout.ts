/**
 * cutout — a cut-and-fold sheet of the net in the info panel: the sheet as data, an arrangement
 * the reader may change (`./cutoutEditor.ts`), and the one-page PDF, all made in the page.
 *
 * THE ARRANGEMENT starts as the net of the panel exactly: `developNet` of the same positions, the
 * same tree of faces, seen from the side the panel's camera sees it from (the net's +z side, the
 * plane drawn with x to the right and y up), scaled to fill an A4 page, portrait or landscape,
 * whichever holds it larger. It is not turned or mirrored. The reader may then move a face
 * across one of its seams: the torus is flat, so the two copies of a seam differ by a
 * translation, a period of the torus, and the face is translated by it. An arrangement is
 * therefore one translation per face and, for each seam, which of its two copies carries the
 * glue tab. Which edges are folds and which are seams is read off the page: an edge whose two
 * copies land on the same line is a fold (the paper stays joined there), every other one is a
 * seam with two copies on the outline.
 *
 * THE CODING is that of the fold nets of the square and hex paper
 * (`square-exact/paper-dev/figgen/make-fold-nets.py`) and of the print sheets
 * (`paper-tori-print-sheets`): a mountain crease is green dash-dot, a valley purple dashed,
 * 1.05 pt wide with the dash lengths of those sheets, and a cut line is solid black. Mountain
 * and valley are seen from the printed side: the angle between the two faces measured on that
 * side is above 180° for a mountain (fold away from you) and below for a valley. Two independent
 * tests decide it, as in `dihedral_table` there, and they must agree.
 *
 * The printed side is the side the panel shows. Those sheets always print the outside of the
 * torus and mirror the net to do so. Here the arrangement wins: the sheet says whether its
 * printed side ends up outside or inside, which depends on the orientation of the row's
 * coordinates (the signed volume).
 *
 * GLUE TABS follow the rule of those sheets: a tab sits on one of the two copies of a seam, it
 * is a ledge clipped to the face it is glued behind (laid across the seam), 1.2 mm clear of that
 * face's other two edges, so no tab ever spans a crease. It keeps 0.5 mm from every face of the
 * net but its own and 1 mm from every other tab, and it is at least 2.5 mm deep and 4 mm long
 * with 20 mm² of area, or it is left out. Its base is the fold the seam takes once glued and is
 * drawn as that crease. A seam's two copies carry the same letter. On the first layout the
 * tabs' sides are chosen as in `place_tabs` there (fewest options first, backtracking); after
 * that the arrangement says on which copy each tab sits.
 *
 * Pure apart from the TextEncoder.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import { developNet } from '@core/moduli/develop.ts';

export type V2 = readonly [number, number];
type V3 = readonly [number, number, number];

export interface CutoutInfo {
  /** First line of the header. */
  readonly title: string;
  /** Second line: which torus, its modulus. ASCII only (the standard PDF font). */
  readonly subtitle: string;
}

// ---- the coding of the fold nets ----
type Rgb = readonly [number, number, number];
export const CUT_C: Rgb = [0x11 / 255, 0x11 / 255, 0x11 / 255];
export const MOUNTAIN_C: Rgb = [0x1b / 255, 0x78 / 255, 0x37 / 255];
export const VALLEY_C: Rgb = [0x76 / 255, 0x2a / 255, 0x83 / 255];
export const TAB_FC: Rgb = [0xf2 / 255, 0xf2 / 255, 0xf2 / 255];
export const LETTER_C: Rgb = [0.45, 0.45, 0.45];
export const CREASE_LW = 1.05;                                 // pt
// matplotlib scales a dash pattern by the line width: (7.5, 2.2, 1.2, 2.2) and (5, 3) at 1.05 pt
export const MOUNTAIN_DASH = [7.5, 2.2, 1.2, 2.2].map((x) => x * CREASE_LW);
export const VALLEY_DASH = [5.0, 3.0].map((x) => x * CREASE_LW);
export const CUT_LW = 0.4, TAB_LW = 0.35;

// ---- the page, in mm ----
const A4: V2 = [210, 297];
const MARGIN = 11, TAB_ROOM = 6, HEADER = 26;
const TAB_H = 6, TAB_MIN_DEPTH = 2.5, TAB_MIN_BASE = 4, TAB_MIN_AREA = 20;
const TAB_FACE_CLEAR = 1.2, TAB_NET_CLEAR = 0.5, TAB_TAB_CLEAR = 1.0;

const sub3 = (p: V3, q: V3): V3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const cross3 = (p: V3, q: V3): V3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
const dot3 = (p: V3, q: V3): number => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross = (o: V2, a: V2, b: V2): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const dist = (p: V2, q: V2): number => Math.hypot(p[0] - q[0], p[1] - q[1]);
export const ekey = (u: number, v: number): string => (u < v ? `${u}-${v}` : `${v}-${u}`);

/** Mountain or valley for every edge, seen from the side the faces' normals point to. */
export function creaseKinds(triang: Triangulation, positions: ArrayLike<number>): Map<string, 'mountain' | 'valley'> {
  const P = (v: number): V3 => [positions[3 * v], positions[3 * v + 1], positions[3 * v + 2]];
  const faces = triang.triangles;
  const byEdge = new Map<string, number[]>();
  faces.forEach((f, t) => { for (let k = 0; k < 3; k++) { const key = ekey(f[k], f[(k + 1) % 3]); byEdge.set(key, [...(byEdge.get(key) ?? []), t]); } });
  const out = new Map<string, 'mountain' | 'valley'>();
  for (const [key, ts] of byEdge) {
    if (ts.length !== 2) throw new Error(`edge ${key} lies in ${ts.length} faces`);
    const [t1, t2] = ts, f1 = faces[t1], f2 = faces[t2];
    const [u, w] = key.split('-').map(Number);
    const i = f1.indexOf(u);
    const [U, W] = f1[(i + 1) % 3] === w ? [u, w] : [w, u];
    const pA = f1.find((x) => x !== u && x !== w)!, pB = f2.find((x) => x !== u && x !== w)!;
    const nA = cross3(sub3(P(W), P(U)), sub3(P(pA), P(U)));
    const nB = cross3(sub3(P(U), P(W)), sub3(P(pB), P(W)));
    const s = dot3(cross3(nA, nB), sub3(P(W), P(U)));
    // second opinion: does the neighbour's apex sit on the printed side of this face's plane?
    const apexSide = dot3(sub3(P(pB), P(W)), nA);
    if ((s < 0) !== (apexSide > 0)) throw new Error(`the two dihedral sign tests disagree on edge ${key}`);
    out.set(key, s < 0 ? 'valley' : 'mountain');
  }
  return out;
}

/** The printed side is the side the face normals point to: is that the outside of the solid? */
function normalsPointOut(triang: Triangulation, positions: ArrayLike<number>): boolean {
  let vol = 0;
  for (const [a, b, c] of triang.triangles) {
    const A: V3 = [positions[3 * a], positions[3 * a + 1], positions[3 * a + 2]];
    const B: V3 = [positions[3 * b], positions[3 * b + 1], positions[3 * b + 2]];
    const C: V3 = [positions[3 * c], positions[3 * c + 1], positions[3 * c + 2]];
    vol += dot3(A, cross3(B, C));
  }
  return vol > 0;
}

// ---- convex polygons ----
/** Keep the part of `poly` on the left of the directed line a → b, moved left by `off`. */
function clipLeft(poly: V2[], a: V2, b: V2, off: number): V2[] {
  const L = dist(a, b), nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
  const side = (p: V2): number => (p[0] - a[0]) * nx + (p[1] - a[1]) * ny - off;
  const out: V2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], sp = side(p), sq = side(q);
    if (sp >= 0) out.push(p);
    if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
  }
  return out;
}
function area(poly: readonly V2[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; s += p[0] * q[1] - q[0] * p[1]; }
  return s / 2;
}
export function pointSeg(p: V2, a: V2, b: V2): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function segsCross(a: V2, b: V2, c: V2, d: V2): boolean {
  const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
export function inside(p: V2, poly: readonly V2[]): boolean {
  let pos = false, neg = false;
  for (let i = 0; i < poly.length; i++) { const c = cross(poly[i], poly[(i + 1) % poly.length], p); if (c > 0) pos = true; if (c < 0) neg = true; }
  return !(pos && neg);
}
/** The distance between two convex polygons, 0 if they meet. */
function polyDistance(P: readonly V2[], Q: readonly V2[]): number {
  if (inside(P[0], Q) || inside(Q[0], P)) return 0;
  let best = Infinity;
  for (let i = 0; i < P.length; i++) for (let j = 0; j < Q.length; j++) {
    const a = P[i], b = P[(i + 1) % P.length], c = Q[j], d = Q[(j + 1) % Q.length];
    if (segsCross(a, b, c, d)) return 0;
    best = Math.min(best, pointSeg(a, c, d), pointSeg(b, c, d), pointSeg(c, a, b), pointSeg(d, a, b));
  }
  return best;
}
/** The area two counter-clockwise convex polygons have in common. */
function overlapArea(P: readonly V2[], Q: readonly V2[]): number {
  let poly = P.slice();
  for (let i = 0; i < Q.length && poly.length; i++) poly = clipLeft(poly, Q[i], Q[(i + 1) % Q.length], 0);
  return poly.length >= 3 ? Math.abs(area(poly)) : 0;
}

// ======================================================================================
// the model and the arrangement
// ======================================================================================

/** What does not change while the reader rearranges: the torus, its development, its folds. */
export interface CutoutModel {
  readonly triang: Triangulation;
  /** Each face's corners in the engine's development, in the triangulation's corner order. */
  readonly corners: readonly (readonly V2[])[];
  readonly kinds: ReadonlyMap<string, 'mountain' | 'valley'>;
  readonly printedOutside: boolean;
  /** The two faces of each edge. */
  readonly edgeFaces: ReadonlyMap<string, readonly [number, number]>;
}

export function cutoutModel(triang: Triangulation, positions: ArrayLike<number>): CutoutModel {
  const net = developNet(triang, positions);
  const edgeFaces = new Map<string, [number, number]>();
  triang.triangles.forEach((f, t) => {
    for (let k = 0; k < 3; k++) {
      const key = ekey(f[k], f[(k + 1) % 3]), got = edgeFaces.get(key);
      edgeFaces.set(key, got ? [got[0], t] : [t, -1]);
    }
  });
  return {
    triang, corners: net.corners.map((tri) => tri.map((p) => [p[0], p[1]] as V2)),
    kinds: creaseKinds(triang, positions), printedOutside: normalsPointOut(triang, positions), edgeFaces,
  };
}

/** One translation per face (in the development's units), and the face whose copy of each seam carries its tab. */
export interface Arrangement {
  readonly offset: readonly V2[];
  /** Seam (edge key) → the face carrying its tab. A seam missing here is placed automatically. */
  readonly tabFace: ReadonlyMap<string, number>;
}

export function initialArrangement(model: CutoutModel): Arrangement {
  const blank: Arrangement = { offset: model.corners.map(() => [0, 0] as V2), tabFace: new Map() };
  // the first layout chooses the tabs' sides; from then on the arrangement keeps them
  const sheet = layoutSheet(model, blank);
  return { offset: blank.offset, tabFace: new Map(sheet.tabs.map((t) => [t.seam, t.face])) };
}

// ======================================================================================
// the sheet: everything on the page, in mm
// ======================================================================================

export interface Copy {
  readonly seam: string;                 // the edge key
  readonly letter: string;
  readonly edge: readonly [number, number];
  readonly face: number;
  readonly A: V2;                        // the copy's two ends on the page, A then B with the face on the left
  readonly B: V2;
  readonly mate: readonly [V2, V2, V2];  // the face glued here, laid across the seam: A, B, apex
  readonly mateFace: number;
}
export interface Tab { readonly seam: string; readonly face: number; readonly copy: Copy; readonly poly: V2[]; readonly P0: V2; readonly P1: V2 }
export interface Line { readonly a: V2; readonly b: V2; readonly kind: 'mountain' | 'valley' | 'cut'; readonly width: number; readonly edge?: readonly [number, number] }

export interface Sheet {
  readonly W: number;
  readonly H: number;
  readonly page: 'portrait' | 'landscape';
  /** Millimetres per unit length of the torus. */
  readonly scale: number;
  /** From the development (with a face's translation added) to the page. */
  readonly toPage: (p: V2) => V2;
  /** Each face on the page. */
  readonly tris: readonly (readonly [V2, V2, V2])[];
  /** Each face's folds: how many of its edges join it to another face on the page. */
  readonly folds: readonly number[];
  /** For each face, the faces it is joined to by a fold. */
  readonly adjacency: readonly (readonly number[])[];
  readonly copies: readonly Copy[];
  readonly tabs: readonly Tab[];
  /** Seams the arrangement wants a tab on but where none fits. */
  readonly missingTabs: readonly string[];
  readonly lines: readonly Line[];
  readonly letters: readonly { readonly text: string; readonly at: V2; readonly size: number }[];
  /** Pairs of faces that overlap on the page: the sheet would not cut out in one piece. */
  readonly overlaps: readonly (readonly [number, number])[];
  readonly printedSide: 'outside' | 'inside';
  readonly creases: { readonly mountain: number; readonly valley: number };
  readonly seams: number;
}

/** The faces of an arrangement in the development's units. */
function placed(model: CutoutModel, arr: Arrangement): V2[][] {
  return model.corners.map((tri, f) => tri.map((p) => [p[0] + arr.offset[f][0], p[1] + arr.offset[f][1]] as V2));
}
/** Is the edge `key` a fold on the page (its two copies on one line) in these placed faces? */
function joined(model: CutoutModel, faces: V2[][], key: string): boolean {
  const [t1, t2] = model.edgeFaces.get(key)!;
  const [u, v] = key.split('-').map(Number), T = model.triang.triangles;
  const P = (t: number, w: number): V2 => faces[t][T[t].indexOf(w)];
  const tol = 1e-7 * (1 + Math.abs(P(t1, u)[0]) + Math.abs(P(t1, u)[1]));
  return dist(P(t1, u), P(t2, u)) < tol && dist(P(t1, v), P(t2, v)) < tol;
}

export function layoutSheet(model: CutoutModel, arr: Arrangement): Sheet {
  const T = model.triang.triangles;
  const faces = placed(model, arr);
  const local = (t: number, v: number): number => T[t].indexOf(v);

  // ---- the page: the arrangement as it is, as large as an A4 page holds it ----
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const tri of faces) for (const [x, y] of tri) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const fitIn = (W: number, H: number): number => Math.min((W - 2 * (MARGIN + TAB_ROOM)) / (x1 - x0), (H - 2 * (MARGIN + TAB_ROOM) - HEADER) / (y1 - y0));
  const portrait = fitIn(A4[0], A4[1]), landscape = fitIn(A4[1], A4[0]);
  const page: 'portrait' | 'landscape' = portrait >= landscape ? 'portrait' : 'landscape';
  const [PW, PH] = page === 'portrait' ? A4 : [A4[1], A4[0]] as V2;
  const s = Math.max(portrait, landscape);
  const bodyH = PH - HEADER;
  const ox = PW / 2 - s * (x0 + x1) / 2, oy = bodyH / 2 - s * (y0 + y1) / 2;
  const toPage = (p: V2): V2 => [ox + s * p[0], oy + s * p[1]];
  const tris = faces.map((tri) => [toPage(tri[0]), toPage(tri[1]), toPage(tri[2])] as [V2, V2, V2]);

  // ---- folds and seams, read off the page ----
  const allKeys = [...model.edgeFaces.keys()];
  const seamKeys = allKeys.filter((k) => !joined(model, faces, k)).sort();
  const seamSet = new Set(seamKeys);
  const folds = T.map((f) => [0, 1, 2].filter((k) => !seamSet.has(ekey(f[k], f[(k + 1) % 3]))).length);
  const adjacency = T.map((f, t) => [0, 1, 2].map((k) => ekey(f[k], f[(k + 1) % 3])).filter((key) => !seamSet.has(key))
    .map((key) => { const [a, b] = model.edgeFaces.get(key)!; return a === t ? b : a; }));
  const letterOf = new Map(seamKeys.map((k, i) => [k, i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26))]));
  const copies: Copy[] = [];
  for (const seam of seamKeys) {
    const [u, v] = seam.split('-').map(Number);
    const [f1, f2] = model.edgeFaces.get(seam)!;
    for (const [t, m] of [[f1, f2], [f2, f1]] as const) {
      // A → B with the face on the left: the face's own order of u and v
      const i = local(t, u);
      const [a, b] = T[t][(i + 1) % 3] === v ? [u, v] : [v, u];
      const A = tris[t][local(t, a)], B = tris[t][local(t, b)];
      // the mate, moved rigidly so that its copy of the edge lies on this one
      const Q = tris[m], qa = Q[local(m, a)], qb = Q[local(m, b)], qc = Q[3 - local(m, a) - local(m, b)];
      const rot = Math.atan2(B[1] - A[1], B[0] - A[0]) - Math.atan2(qb[1] - qa[1], qb[0] - qa[0]);
      const c = Math.cos(rot), sn = Math.sin(rot);
      const apex: V2 = [A[0] + c * (qc[0] - qa[0]) - sn * (qc[1] - qa[1]), A[1] + sn * (qc[0] - qa[0]) + c * (qc[1] - qa[1])];
      copies.push({ seam, letter: letterOf.get(seam)!, edge: [a, b], face: t, A, B, mate: [A, B, apex], mateFace: m });
    }
  }

  // ---- tabs: candidates on the copy the arrangement names (on both where it names none) ----
  const offPage = (poly: V2[]): boolean => poly.some((p) => p[0] < 5 || p[0] > PW - 5 || p[1] < 5 || p[1] > bodyH);
  const clearOfNet = (cp: Copy, poly: V2[]): number => Math.min(...tris.map((tri, k) => (k === cp.face ? Infinity : polyDistance(tri, poly))));
  /** Where a tab lies once glued: moved with the mate from across the seam to the mate's place on the page. */
  const glued = (cp: Copy, poly: V2[]): V2[] => {
    const m = cp.mateFace, [a, b] = cp.edge, qa = tris[m][local(m, a)], qb = tris[m][local(m, b)];
    const rot = Math.atan2(qb[1] - qa[1], qb[0] - qa[0]) - Math.atan2(cp.B[1] - cp.A[1], cp.B[0] - cp.A[0]);
    const c = Math.cos(rot), sn = Math.sin(rot);
    return poly.map((p) => [qa[0] + c * (p[0] - cp.A[0]) - sn * (p[1] - cp.A[1]), qa[1] + sn * (p[0] - cp.A[0]) + c * (p[1] - cp.A[1])] as V2);
  };
  interface Candidate extends Tab { readonly score: number; readonly glued: V2[] }
  const candidates = (cp: Copy): Candidate[] => {
    const { A, B } = cp, L = dist(A, B);
    const u: V2 = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
    const n: V2 = [u[1], -u[0]];                                          // to the right of A → B: away from the face
    const along = (p: V2): number => (p[0] - A[0]) * u[0] + (p[1] - A[1]) * u[1];
    const depthOf = (poly: V2[]): number => Math.max(...poly.map((p) => (p[0] - A[0]) * n[0] + (p[1] - A[1]) * n[1]));
    const [mA, mB, mC] = cp.mate;                                         // the mate runs B → A → apex counter-clockwise
    const out: Candidate[] = [];
    const accept = (poly: V2[], P0: V2, P1: V2, kind: number, h: number): void => {
      const i0 = poly.indexOf(P0);
      let cyc = [...poly.slice(i0), ...poly.slice(0, i0)];
      if (cyc[1] !== P1) cyc = [cyc[0], ...cyc.slice(1).reverse()];
      if (cyc[1] !== P1) return;
      out.push({ seam: cp.seam, face: cp.face, copy: cp, poly: cyc, P0, P1, score: kind * 1e6 + Math.round(h * 1000) * 1e2 + Math.min(99, along(P1) - along(P0)), glued: glued(cp, cyc) });
    };
    // the full-edge ledge, best height first, shaved back from whatever face it touches
    for (const h of [TAB_H, 0.8 * TAB_H, 0.62 * TAB_H, 0.48 * TAB_H, 0.36 * TAB_H, 0.28 * TAB_H]) {
      if (h < TAB_MIN_DEPTH) break;
      let found = false;
      for (const taper of [1.4, 1.0, 0.7]) {
        let shaveA = 0, shaveB = 0;
        for (let it = 0; it < 16; it++) {
          if (L - shaveA - shaveB < TAB_MIN_BASE) break;
          const A1: V2 = [A[0] + shaveA * u[0], A[1] + shaveA * u[1]], B1: V2 = [B[0] - shaveB * u[0], B[1] - shaveB * u[1]];
          const inset = Math.min(taper * h, 0.25 * (L - shaveA - shaveB));
          let poly: V2[] = [A1, B1, [B1[0] + h * n[0] - inset * u[0], B1[1] + h * n[1] - inset * u[1]], [A1[0] + h * n[0] + inset * u[0], A1[1] + h * n[1] + inset * u[1]]];
          poly = clipLeft(clipLeft(poly, mA, mC, TAB_FACE_CLEAR), mC, mB, TAB_FACE_CLEAR);
          if (poly.length < 3) break;
          const onBase = poly.filter((p) => Math.abs((p[0] - A[0]) * n[0] + (p[1] - A[1]) * n[1]) < 1e-9);
          if (onBase.length !== 2) break;
          const [P0, P1] = onBase.sort((p, q) => along(p) - along(q));
          if (along(P1) - along(P0) < TAB_MIN_BASE || depthOf(poly) < TAB_MIN_DEPTH || Math.abs(area(poly)) < TAB_MIN_AREA || offPage(poly)) break;
          const offenders = tris.map((tri, k) => (k === cp.face ? Infinity : polyDistance(tri, poly)));
          const worst = offenders.reduce((bi, d, k) => (d < offenders[bi] ? k : bi), 0);
          if (offenders[worst] >= TAB_NET_CLEAR) { accept(poly, P0, P1, 2, h); found = true; break; }
          // shave the end nearer the closest offending face
          const tri = tris[worst], cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
          if (along([cx, cy]) < (along(P0) + along(P1)) / 2) shaveA += Math.max(2, 0.05 * L); else shaveB += Math.max(2, 0.05 * L);
        }
        if (found) break;
      }
    }
    // the centred trapezoid ladder, wholly inside the mate
    for (const h of [TAB_H, 0.8 * TAB_H, 0.62 * TAB_H, 0.48 * TAB_H, 0.36 * TAB_H, 0.28 * TAB_H, 0.22 * TAB_H]) {
      if (h < TAB_MIN_DEPTH) break;
      for (const frac of [0.5, 0.42, 0.34, 0.28, 0.22, 0.17]) {
        const base = frac * L;
        if (base < TAB_MIN_BASE) continue;
        const t0 = 0.5 * (1 - frac);
        const P0: V2 = [A[0] + t0 * L * u[0], A[1] + t0 * L * u[1]], P1: V2 = [B[0] - t0 * L * u[0], B[1] - t0 * L * u[1]];
        for (const taper of [1.4, 1.0, 0.7]) {
          const inset = Math.min(taper * h, 0.4 * base);
          const poly: V2[] = [P0, P1, [P1[0] + h * n[0] - inset * u[0], P1[1] + h * n[1] - inset * u[1]], [P0[0] + h * n[0] + inset * u[0], P0[1] + h * n[1] + inset * u[1]]];
          const clipped = clipLeft(clipLeft(poly, mA, mC, 1.0), mC, mB, 1.0);
          if (clipped.length !== 4 || Math.abs(area(clipped) - area(poly)) > 1e-9) continue;   // wholly inside
          if (Math.abs(area(poly)) < TAB_MIN_AREA || offPage(poly) || clearOfNet(cp, poly) < TAB_NET_CLEAR) continue;
          accept(poly, P0, P1, 1, h);
          break;
        }
      }
    }
    return out.sort((p, q) => q.score - p.score);
  };
  const seamOptions = seamKeys.map((seam) => {
    const want = arr.tabFace.get(seam);
    return copies.filter((c) => c.seam === seam && (want === undefined || c.face === want)).flatMap(candidates).sort((p, q) => q.score - p.score);
  });
  const order = seamOptions.map((_, k) => k).sort((p, q) => seamOptions[p].length - seamOptions[q].length);
  const compatible = (c: Candidate, placedTabs: Candidate[]): boolean => placedTabs.every((o) => polyDistance(o.poly, c.poly) >= TAB_TAB_CLEAR
    && (o.copy.mateFace !== c.copy.mateFace || polyDistance(o.glued, c.glued) >= 0.5));
  // depth first, best option first; a seam may stay without a tab if nothing fits
  let best: Candidate[] = [], bestCount = -1, nodes = 0;
  const search = (k: number, placedTabs: Candidate[]): void => {
    if (++nodes > 50000) return;
    if (k === order.length) { if (placedTabs.length > bestCount) { best = placedTabs.slice(); bestCount = placedTabs.length; } return; }
    if (placedTabs.length + (order.length - k) <= bestCount) return;
    for (const c of seamOptions[order[k]]) if (compatible(c, placedTabs)) { placedTabs.push(c); search(k + 1, placedTabs); placedTabs.pop(); if (bestCount === order.length) return; }
    search(k + 1, placedTabs);
  };
  search(0, []);
  const tabs: Tab[] = best;
  const tabOf = new Map<Copy, Tab>(tabs.map((t) => [t.copy, t]));
  const missingTabs = seamKeys.filter((k) => arr.tabFace.has(k) && !tabs.some((t) => t.seam === k));

  // ---- the lines ----
  const lines: Line[] = [];
  let mountain = 0, valley = 0;
  const drawn = new Set<string>();
  T.forEach((f, t) => {
    for (let k = 0; k < 3; k++) {
      const key = ekey(f[k], f[(k + 1) % 3]);
      if (seamSet.has(key) || drawn.has(key)) continue;
      drawn.add(key);
      const kind = model.kinds.get(key)!;
      if (kind === 'mountain') mountain++; else valley++;
      lines.push({ a: tris[t][k], b: tris[t][(k + 1) % 3], kind, width: CREASE_LW, edge: [f[k], f[(k + 1) % 3]] });
    }
  });
  for (const cp of copies) {
    const tab = tabOf.get(cp);
    if (!tab) { lines.push({ a: cp.A, b: cp.B, kind: 'cut', width: CUT_LW }); continue; }
    if (dist(cp.A, tab.P0) > 0.15) lines.push({ a: cp.A, b: tab.P0, kind: 'cut', width: CUT_LW });
    if (dist(tab.P1, cp.B) > 0.15) lines.push({ a: tab.P1, b: cp.B, kind: 'cut', width: CUT_LW });
    lines.push({ a: tab.P0, b: tab.P1, kind: model.kinds.get(cp.seam)!, width: CREASE_LW, edge: cp.edge });
    for (let k = 1; k < tab.poly.length; k++) lines.push({ a: tab.poly[k], b: tab.poly[(k + 1) % tab.poly.length], kind: 'cut', width: TAB_LW });
  }
  // a seam's two copies carry the same letter, just inside their faces
  const letters = copies.map((cp) => {
    const mid: V2 = [(cp.A[0] + cp.B[0]) / 2, (cp.A[1] + cp.B[1]) / 2];
    const L = dist(cp.A, cp.B), inw: V2 = [-(cp.B[1] - cp.A[1]) / L, (cp.B[0] - cp.A[0]) / L];
    const size = Math.max(2.2, Math.min(3.2, 0.12 * L));
    return { text: cp.letter, at: [mid[0] + inw[0] * (size + 0.6), mid[1] + inw[1] * (size + 0.6)] as V2, size };
  });
  // faces that overlap on the page
  const overlaps: [number, number][] = [];
  for (let i = 0; i < tris.length; i++) for (let j = i + 1; j < tris.length; j++) if (overlapArea(tris[i], tris[j]) > 1e-3) overlaps.push([i, j]);

  return {
    W: PW, H: PH, page, scale: s, toPage, tris, folds, adjacency, copies, tabs, missingTabs, lines, letters, overlaps,
    printedSide: model.printedOutside ? 'outside' : 'inside', creases: { mountain, valley }, seams: seamKeys.length,
  };
}

// ======================================================================================
// the reader's moves
// ======================================================================================

/**
 * Can `face` be moved? It needs a seam to cross, and the sheet must not come apart without it:
 * the other faces have to stay joined to each other by folds.
 */
export function movable(sheet: Sheet, face: number): boolean {
  if (!sheet.copies.some((c) => c.face === face)) return false;
  const n = sheet.tris.length, start = face === 0 ? 1 : 0;
  const seen = new Set([face, start]), stack = [start];
  while (stack.length) for (const g of sheet.adjacency[stack.pop()!]) if (!seen.has(g)) { seen.add(g); stack.push(g); }
  return seen.size === n;
}

/** The seams of `face` on the page, nearest to `at` (mm on the page) first. */
export function seamsOf(sheet: Sheet, face: number, at?: V2): Copy[] {
  const own = sheet.copies.filter((c) => c.face === face);
  return at ? own.sort((p, q) => pointSeg(at, p.A, p.B) - pointSeg(at, q.A, q.B)) : own;
}

/**
 * Move `face` across its copy `copy` of a seam onto the seam's other copy: translate it by the
 * period that takes one copy to the other. The folds it hung on become seams, and the face
 * carries their tabs: if it lands on the tab of the seam it crossed it takes that one over, if
 * not (the face had that tab itself) it brings its own along. Its other tabs stay with it. A
 * face that hung on two folds leaves two seams and carries a tab on each.
 */
export function moveFace(model: CutoutModel, arr: Arrangement, sheet: Sheet, face: number, copy: Copy): Arrangement {
  const T = model.triang.triangles;
  const other = sheet.copies.find((c) => c.seam === copy.seam && c.face !== face)!;
  // the translation, in the development's units: one end of this copy onto the same vertex of the other
  const faces = placed(model, arr);
  const [u] = copy.edge;
  const here = faces[face][T[face].indexOf(u)], there = faces[other.face][T[other.face].indexOf(u)];
  const offset = arr.offset.map((o, f) => (f === face ? [o[0] + there[0] - here[0], o[1] + there[1] - here[1]] as V2 : o));
  // the folds the face hung on
  const f = T[face];
  const seamKeys = new Set(sheet.copies.map((c) => c.seam));
  const hung = [0, 1, 2].map((k) => ekey(f[k], f[(k + 1) % 3])).filter((k) => !seamKeys.has(k));
  const tabFace = new Map(arr.tabFace);
  tabFace.delete(copy.seam);
  for (const k of hung) tabFace.set(k, face);
  // seams that the move closed (the face landed against another one) need no tab
  const next: Arrangement = { offset, tabFace };
  const nextFaces = placed(model, next);
  for (const k of [...tabFace.keys()]) if (joined(model, nextFaces, k)) tabFace.delete(k);
  return next;
}

/** Move the tab of `seam` to the seam's other copy. */
export function flipTab(model: CutoutModel, arr: Arrangement, seam: string): Arrangement {
  const [f1, f2] = model.edgeFaces.get(seam)!;
  const now = arr.tabFace.get(seam);
  const tabFace = new Map(arr.tabFace);
  tabFace.set(seam, now === f1 ? f2 : f1);
  return { offset: arr.offset, tabFace };
}

// ======================================================================================
// the PDF
// ======================================================================================

export function sheetPdf(sheet: Sheet, info: CutoutInfo): Uint8Array {
  const pdf = new Page(sheet.W, sheet.H);
  for (const t of sheet.tabs) pdf.fill(t.poly, TAB_FC);
  for (const l of sheet.lines) {
    if (l.kind === 'cut') pdf.line(l.a, l.b, CUT_C, l.width, null);
    else pdf.line(l.a, l.b, l.kind === 'mountain' ? MOUNTAIN_C : VALLEY_C, l.width, l.kind === 'mountain' ? MOUNTAIN_DASH : VALLEY_DASH);
  }
  for (const l of sheet.letters) pdf.text(l.text, l.at, l.size, LETTER_C, 'center-middle');
  const top = sheet.H - MARGIN;
  pdf.text(info.title, [MARGIN, top - 4.5], 4.6, CUT_C, 'left');
  pdf.text(info.subtitle, [MARGIN, top - 10], 3.0, [0.3, 0.3, 0.3], 'left');
  const note = `Print at 100%. Cut along the solid lines, tabs included, fold, and glue each tab behind the edge with the same letter. `
    + `Mountain and valley are seen from the printed side, which ends up on the ${sheet.printedSide} of the torus.`;
  pdf.text(note, [MARGIN, top - 15], 2.4, [0.35, 0.35, 0.35], 'left', sheet.W - 2 * MARGIN);
  const lx = sheet.W - MARGIN - 52;
  ([[MOUNTAIN_C, MOUNTAIN_DASH, 'mountain fold'], [VALLEY_C, VALLEY_DASH, 'valley fold'], [CUT_C, null, 'cut']] as const).forEach(([col, dash, label], i) => {
    const y = top - 3.5 - i * 4.2;
    pdf.line([lx, y], [lx + 14, y], col, dash ? CREASE_LW : CUT_LW, dash ? [...dash] : null);
    pdf.text(label, [lx + 17, y], 2.8, [0.2, 0.2, 0.2], 'left-middle');
  });
  return pdf.bytes(info.title);
}

/** The sheet of the panel's net as it is, as PDF bytes (no rearranging). */
export function cutoutPdf(triang: Triangulation, positions: ArrayLike<number>, info: CutoutInfo): { bytes: Uint8Array; sheet: Sheet } {
  const model = cutoutModel(triang, positions);
  const sheet = layoutSheet(model, initialArrangement(model));
  return { bytes: sheetPdf(sheet, info), sheet };
}

// ---- a one-page PDF with lines, fills and Helvetica text, in mm ----
class Page {
  private ops: string[] = [];
  private readonly W: number;
  private readonly H: number;
  constructor(W: number, H: number) { this.W = W; this.H = H; }
  private static pt(mm: number): string { return (mm * 72 / 25.4).toFixed(3); }
  line(a: V2, b: V2, rgb: Rgb, widthPt: number, dashPt: readonly number[] | null): void {
    this.ops.push(`${rgb.map((x) => x.toFixed(4)).join(' ')} RG ${widthPt.toFixed(3)} w 1 J 1 j `
      + `[${(dashPt ?? []).map((x) => x.toFixed(3)).join(' ')}] 0 d `
      + `${Page.pt(a[0])} ${Page.pt(a[1])} m ${Page.pt(b[0])} ${Page.pt(b[1])} l S`);
  }
  fill(poly: readonly V2[], rgb: Rgb): void {
    this.ops.push(`${rgb.map((x) => x.toFixed(4)).join(' ')} rg ${poly.map((p, i) => `${Page.pt(p[0])} ${Page.pt(p[1])} ${i ? 'l' : 'm'}`).join(' ')} h f`);
  }
  /** Text in Helvetica, `size` the font size in mm; wrapped at `wrap` mm if given (by an estimate of the width). */
  text(str: string, at: V2, size: number, rgb: Rgb, align: 'left' | 'left-middle' | 'center-middle', wrap?: number): void {
    const clean = str.replace(/[^\x20-\x7e]/g, '?').replace(/([()\\])/g, '\\$1');
    const em = 0.5 * size;                                          // a rough average width of a Helvetica character
    const rows: string[] = [];
    if (wrap) {
      let row = '';
      for (const word of clean.split(' ')) {
        if (row && (row.length + 1 + word.length) * em > wrap) { rows.push(row); row = word; } else row = row ? `${row} ${word}` : word;
      }
      if (row) rows.push(row);
    } else rows.push(clean);
    rows.forEach((r, i) => {
      let x = at[0], y = at[1] - i * size * 1.3;
      if (align !== 'left') y -= size * 0.35;
      if (align === 'center-middle') x -= (r.length * em) / 2;
      this.ops.push(`BT /F1 ${Page.pt(size)} Tf ${rgb.map((v) => v.toFixed(4)).join(' ')} rg ${Page.pt(x)} ${Page.pt(y)} Td (${r}) Tj ET`);
    });
  }
  bytes(title: string): Uint8Array {
    const content = this.ops.join('\n');
    const objs = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${Page.pt(this.W)} ${Page.pt(this.H)}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      `<< /Title (${title.replace(/[^\x20-\x7e]/g, '?').replace(/([()\\])/g, '\\$1')}) /Producer (low-vertex-flat-tori torus-moduli) >>`,
    ];
    let out = '%PDF-1.4\n';
    const offsets: number[] = [];
    objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
    out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return new TextEncoder().encode(out);
  }
}
