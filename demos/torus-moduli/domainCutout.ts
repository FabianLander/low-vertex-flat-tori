/**
 * domainCutout — a cut-and-fold sheet of a FUNDAMENTAL DOMAIN of the torus, the second cutout of
 * the info panel (the first, `./cutout.ts`, is the net). The sheet as data, the tiling it is cut
 * from, and the one-page PDF, all made in the page.
 *
 * THE TILING. The torus is flat, so its 16 developed faces and their translates by the period
 * lattice tile the plane (the universal cover, with the creases as a periodic pattern). The
 * lattice is spanned by the holonomies of the two generator loops (`modulus`). The sheet uses
 * its reduced basis a, b (a the shortest period, b the shortest one off its line, the angle
 * between them from 60° to 120°), and the plane is turned so that a is horizontal.
 *
 * THE DOMAIN is the parallelogram spanned by a and b, a square for the square torus. Where it
 * sits on the tiling is the reader's choice (`./domainEditor.ts`): its corner is `origin`, in
 * lattice coordinates, and only its class modulo the lattice matters.
 *
 * THE CODING of the creases is that of the net sheet: mountain green dash-dot, valley purple
 * dashed, seen from the printed side. The printed side is the outside of the torus by default,
 * as on the print sheets (`paper-tori-print-sheets`). The development shows the side the face
 * normals point to. If that is not the side asked for, the plane is mirrored and mountain and
 * valley are swapped.
 *
 * THE JOINTS. The sides of the domain run through the faces, not along creases, so the paper is
 * flat across them. The sheet is the domain THICKENED: the parallelogram with every side moved
 * out by `FLAP_W` (the depth of the glue tabs of the net sheet), and the tiling carries on in
 * that margin. Joined, the margin beyond a side lies on the strip just inside the opposite side,
 * crease on crease.
 *   gap = 0   exactly that. The creases run on into the margin as folds, nothing is cut along
 *             them, and the corners of the margin are part of the sheet.
 *   gap > 0   up to `FACE_CLEAR`, the gap of the print sheets' tabs: every face cut by a side
 *             keeps its own piece of the margin, that far from its creases, so no piece spans a
 *             crease and there is a notch at each crease.
 * Either way the margin is slit from its outer edge down to the side of the domain, at the
 * thirds of each stretch of the side between two creases (once in the middle if the stretch is
 * short, not at all if very short), at the same points on the two opposite sides. The slits end
 * on the side of the domain, so the two sides slide into each other along them until they meet,
 * and from slit to slit they take turns lying on top. A piece that ends up underneath is grey,
 * one on top white. Around a corner of the domain four layers meet (without a gap), or the
 * copies of the face over the corner (with one): these are stacked in one fixed order, and no
 * slit is made there. With `rounded`, the mouth of every slit is rounded (`slitStrip`), so that
 * the pieces find their way into each other.
 *
 * THE PAGE. The thickened domain as large as an A4 page holds it, portrait or landscape.
 *
 * Pure apart from the TextEncoder (through `Page`).
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import { developNet } from '@core/moduli/develop.ts';
import { modulus } from '@core/moduli/modulus.ts';
import {
  creaseKinds, normalsPointOut, ekey, clipLeft, area, Page,
  CUT_C, MOUNTAIN_C, VALLEY_C, CREASE_LW, MOUNTAIN_DASH, VALLEY_DASH, CUT_LW, MARGIN, TAB_H,
  type V2, type CutoutInfo,
} from './cutout';

type Rgb = readonly [number, number, number];
type Kind = 'mountain' | 'valley';

// ---- the joints, in mm ----
/** How much thicker the sheet is than the domain, on every side: the depth of the net sheet's glue tabs. */
export const FLAP_W = TAB_H;
/** The widest gap a flap keeps from the creases of its face (that of the print sheets' tabs). The reader picks one from 0 to this. */
export const FACE_CLEAR = 1.2;
const MIN_BASE = 4;                          // a flap stands on at least this much of a side
const MIN_DEPTH = 2.5;                       // and reaches at least this far beyond it (or as far as the depth allows)
const MIN_AREA = 6;                          // mm²
const MIN_HINGE = 2;                         // a corner piece hangs on at least this much of a flap
/** A stretch of a side this long gets two slits, at its thirds, or one in the middle. */
const TWO_SLITS = 15, ONE_SLIT = 10;
/** The radius of a rounded slit mouth, in mm, and the number of straight steps its quarter circle is drawn in. */
export const SLIT_ROUND = 1.5, ARC_STEPS = 6;
/** A piece of the margin that ends up underneath what it lies on. */
export const UNDER_FC: Rgb = [0.86, 0.86, 0.86];
/** Room for the header at the top of the page. */
const HEAD_ROOM = 38;
export const GUIDE_C: Rgb = [0.5, 0.5, 0.5];
export const GUIDE_LW = 0.5;                 // pt
export const GUIDE_DASH = [0.3, 1.7];        // pt, round caps: dots

const dist = (p: V2, q: V2): number => Math.hypot(p[0] - q[0], p[1] - q[1]);

/** Keep the part of a convex polygon where nx·x + ny·y ≥ c. */
export function clipHalf(poly: readonly V2[], nx: number, ny: number, c: number): V2[] {
  const out: V2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const sp = nx * p[0] + ny * p[1] - c, sq = nx * q[0] + ny * q[1] - c;
    if (sp >= 0) out.push(p);
    if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
  }
  return out;
}
/** Where a convex polygon meets the line {coordinate `axis` = value}: the range of the other coordinate. */
export function span(poly: readonly V2[], axis: 0 | 1, value: number): [number, number] | null {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], sp = p[axis] - value, sq = q[axis] - value;
    if (sp === 0) { lo = Math.min(lo, p[1 - axis]); hi = Math.max(hi, p[1 - axis]); }
    if ((sp < 0 && sq > 0) || (sp > 0 && sq < 0)) {
      const t = sp / (sp - sq), w = p[1 - axis] + t * (q[1 - axis] - p[1 - axis]);
      lo = Math.min(lo, w); hi = Math.max(hi, w);
    }
  }
  return lo <= hi ? [lo, hi] : null;
}
/** A convex polygon without repeated corners and without corners in the middle of an edge (clipping along an edge leaves such). */
export function tidy(poly: readonly V2[]): V2[] {
  let out = poly.filter((p, i) => dist(p, poly[(i + 1) % poly.length]) > 1e-9);
  for (let again = true; again && out.length >= 3;) {
    again = false;
    for (let i = 0; i < out.length; i++) {
      const p = out[(i + out.length - 1) % out.length], q = out[i], r = out[(i + 1) % out.length];
      const turn = (q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0]);
      if (Math.abs(turn) < 1e-9 * (1 + dist(p, q) * dist(q, r))) { out = out.filter((_, k) => k !== i); again = true; break; }
    }
  }
  return out;
}

/** A strip of margin cut into pieces by its slits, in the strip's own frame. */
export interface SlitStrip {
  /** The pieces between the slits, by increasing x: one more than there are slits. */
  readonly pieces: V2[][];
  /** For each edge of the strip (corner i to corner i + 1) what is left of it, as polylines: all of it, or what the mouths of the slits leave. */
  readonly edges: V2[][][];
  /** The slits and the arcs of their mouths, as polylines. */
  readonly cuts: V2[][];
}

/**
 * Slit a strip of margin. The strip is a convex polygon in its own frame: it stands on y = 0 (the
 * side or seam it hangs on) and lies in y ≤ 0. Each slit runs square to y = 0, from the strip's
 * far edge at the given x down to y = 0.
 *
 * With a radius r > 0 the mouth of a slit is ROUNDED: the two corners the slit makes with the far
 * edge are cut off along quarter circles of radius r, so the mouth opens like a funnel 2r wide and
 * the pieces of the other strip find their way in. That is done where the far edge is flat
 * (parallel to y = 0) for r on both sides of the slit and the strip is deep enough. Elsewhere the
 * slit stays a plain cut.
 */
export function slitStrip(poly: readonly V2[], slits: readonly number[], r = 0): SlitStrip {
  const eps = 1e-7, n = poly.length;
  const arc = (cx: number, cy: number, from: number, to: number): V2[] => Array.from({ length: ARC_STEPS + 1 },
    (_, i) => { const th = from + (to - from) * i / ARC_STEPS; return [cx + r * Math.cos(th), cy + r * Math.sin(th)] as V2; });
  const cuts: V2[][] = [];
  const mouths: { x: number; y: number; edge: number }[] = [];
  for (const x of slits) {
    const reach = span(poly, 0, x);
    if (!reach) continue;
    const y = reach[0];                                                         // where the far edge is, at x
    const edge = r > 0 && -y >= 2.5 * r ? poly.findIndex((p, i) => {
      const q = poly[(i + 1) % n];
      return Math.abs(p[1] - y) < eps && Math.abs(q[1] - y) < eps && Math.min(p[0], q[0]) <= x - r + eps && Math.max(p[0], q[0]) >= x + r - eps;
    }) : -1;
    if (edge < 0) { cuts.push([[x, y], [x, 0]]); continue; }
    mouths.push({ x, y, edge });
    cuts.push([[x, y + r], [x, 0]]);
    cuts.push(arc(x - r, y + r, -Math.PI / 2, 0));                            // from the far edge at x - r to the slit
    cuts.push(arc(x + r, y + r, Math.PI, 1.5 * Math.PI));                     // from the slit to the far edge at x + r
  }
  // the pieces, their corners at a rounded mouth replaced by its arc
  const pieces: V2[][] = [];
  const bounds = [-Infinity, ...slits, Infinity];
  for (let i = 0; i + 1 < bounds.length; i++) {
    let piece: V2[] = [...poly];
    if (Number.isFinite(bounds[i])) piece = clipHalf(piece, 1, 0, bounds[i]);
    if (Number.isFinite(bounds[i + 1])) piece = clipHalf(piece, -1, 0, -bounds[i + 1]);
    for (const m of mouths) {
      if (m.x !== bounds[i] && m.x !== bounds[i + 1]) continue;
      const at = piece.findIndex((p) => Math.abs(p[0] - m.x) < eps && Math.abs(p[1] - m.y) < eps);
      if (at < 0) continue;
      // the piece left of the slit loses its corner to the first arc, the piece right of it to the second
      const round = m.x === bounds[i + 1] ? arc(m.x - r, m.y + r, -Math.PI / 2, 0) : arc(m.x + r, m.y + r, 1.5 * Math.PI, Math.PI);
      // both arcs above run from the far edge to the slit: turn it round if the piece comes from the slit
      const before = piece[(at + piece.length - 1) % piece.length];
      if (Math.abs(before[0] - m.x) < eps) round.reverse();
      piece.splice(at, 1, ...round);
    }
    pieces.push(piece);
  }
  // the edges: the far edge loses 2r at every rounded mouth
  const edges = poly.map((p, i) => {
    const q = poly[(i + 1) % n], gaps = mouths.filter((m) => m.edge === i).map((m) => m.x), dir = q[0] >= p[0] ? 1 : -1;
    if (!gaps.length) return [[p, q]];
    const out: V2[][] = [];
    let from = p;
    for (const x of gaps.sort((g, h) => dir * (g - h))) {
      const stop: V2 = [x - dir * r, p[1]];
      if (dir * (stop[0] - from[0]) > eps) out.push([from, stop]);
      from = [x + dir * r, p[1]];
    }
    if (dir * (q[0] - from[0]) > eps) out.push([from, q]);
    return out;
  });
  return { pieces, edges, cuts };
}

/** The part of the segment p q inside a counter-clockwise convex polygon (its boundary included). */
function clipSeg(p: V2, q: V2, poly: readonly V2[]): [V2, V2] | null {
  let t0 = 0, t1 = 1;
  const dx = q[0] - p[0], dy = q[1] - p[1];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const nx = -(b[1] - a[1]), ny = b[0] - a[0], len = Math.hypot(nx, ny);
    const sp = ((p[0] - a[0]) * nx + (p[1] - a[1]) * ny) / len, sd = (dx * nx + dy * ny) / len;
    if (Math.abs(sd) < 1e-12) { if (sp < -1e-9) return null; continue; }
    const t = -sp / sd;
    if (sd > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    if (t0 >= t1) return null;
  }
  return [[p[0] + t0 * dx, p[1] + t0 * dy], [p[0] + t1 * dx, p[1] + t1 * dy]];
}
// ======================================================================================
// the model: the tiling and the lattice
// ======================================================================================

/** What does not depend on where the domain sits. Lengths are those of the torus. */
export interface DomainModel {
  readonly triang: Triangulation;
  /** The 16 faces in the plane, in the triangulation's corner order, a along +x. */
  readonly faces: readonly (readonly [V2, V2, V2])[];
  /** Are the faces clockwise in that order (the plane was mirrored)? */
  readonly clockwise: boolean;
  readonly kinds: ReadonlyMap<string, Kind>;
  /** The reduced basis of the period lattice: a = (|a|, 0), b in the upper half plane. */
  readonly a: V2;
  readonly b: V2;
  readonly printedSide: 'outside' | 'inside';
}

/** The reduced basis of the lattice spanned by v1, v2 (Lagrange), positively oriented. */
function reducedBasis(v1: V2, v2: V2): [V2, V2] {
  let a = v1, b = v2;
  for (let it = 0; it < 500; it++) {
    if (b[0] * b[0] + b[1] * b[1] < a[0] * a[0] + a[1] * a[1]) [a, b] = [b, a];
    const m = Math.round((a[0] * b[0] + a[1] * b[1]) / (a[0] * a[0] + a[1] * a[1]));
    if (m === 0) break;
    b = [b[0] - m * a[0], b[1] - m * a[1]];
  }
  if (a[0] * b[1] - a[1] * b[0] < 0) b = [-b[0], -b[1]];
  return [a, b];
}

export function domainModel(triang: Triangulation, positions: ArrayLike<number>, printedSide: 'outside' | 'inside' = 'outside'): DomainModel {
  const net = developNet(triang, positions);
  const mod = modulus(triang, positions);
  // the development shows the side the normals point to: mirror it if the other side is to be printed
  const flip = (printedSide === 'outside') !== normalsPointOut(triang, positions);
  const mir = (p: readonly number[]): V2 => (flip ? [-p[0], p[1]] : [p[0], p[1]]);
  const [a0, b0] = reducedBasis(mir(mod.v1), mir(mod.v2));
  const th = Math.atan2(a0[1], a0[0]), c = Math.cos(th), s = Math.sin(th);
  const rot = (p: V2): V2 => [c * p[0] + s * p[1], -s * p[0] + c * p[1]];
  const faces = net.corners.map((tri) => [rot(mir(tri[0])), rot(mir(tri[1])), rot(mir(tri[2]))] as [V2, V2, V2]);
  const a: V2 = [Math.hypot(a0[0], a0[1]), 0], b = rot(b0);

  // the translates of the faces tile the plane exactly if the lattice has the faces' area as covolume
  const total = faces.reduce((sum, tri) => sum + Math.abs(area(tri)), 0), covolume = a[0] * b[1];
  if (!(Math.abs(total - covolume) < 1e-4 * covolume)) throw new Error('the generator loops do not span the period lattice of this torus');

  const kinds = new Map<string, Kind>();
  for (const [key, kind] of creaseKinds(triang, positions)) kinds.set(key, flip ? (kind === 'mountain' ? 'valley' : 'mountain') : kind);

  return { triang, faces, clockwise: flip, kinds, a, b, printedSide };
}

/** Lattice coordinates: p = x a + y b. */
export function latticeCoords(model: DomainModel, p: V2): V2 {
  const y = p[1] / model.b[1];
  return [(p[0] - y * model.b[0]) / model.a[0], y];
}
const fromLattice = (model: DomainModel, x: number, y: number): V2 => [x * model.a[0] + y * model.b[0], y * model.b[1]];

/** A translate of a face: face t moved by i a + j b. */
interface Tile { readonly t: number; readonly i: number; readonly j: number }
type Box = readonly [number, number, number, number];           // x0, y0, x1, y1 in lattice coordinates

/** The translates of faces that meet the box of lattice coordinates in more than a point or a segment. */
function tilesMeeting(model: DomainModel, box: Box): Tile[] {
  const out: Tile[] = [];
  model.faces.forEach((tri, t) => {
    const L = tri.map((p) => latticeCoords(model, p));
    const xs = L.map((p) => p[0]), ys = L.map((p) => p[1]);
    for (let i = Math.ceil(box[0] - Math.max(...xs)); i <= Math.floor(box[2] - Math.min(...xs)); i++) {
      for (let j = Math.ceil(box[1] - Math.max(...ys)); j <= Math.floor(box[3] - Math.min(...ys)); j++) {
        let poly: V2[] = L.map((p) => [p[0] + i, p[1] + j] as V2);
        poly = clipHalf(clipHalf(clipHalf(clipHalf(poly, 1, 0, box[0]), -1, 0, -box[2]), 0, 1, box[1]), 0, -1, -box[3]);
        if (poly.length >= 3 && Math.abs(area(poly)) > 1e-12) out.push({ t, i, j });
      }
    }
  });
  return out;
}
/** A tile's corners, in the triangulation's corner order. */
function tileCorners(model: DomainModel, tile: Tile): [V2, V2, V2] {
  const d = fromLattice(model, tile.i, tile.j);
  return model.faces[tile.t].map((p) => [p[0] + d[0], p[1] + d[1]] as V2) as [V2, V2, V2];
}

export interface Crease { readonly a: V2; readonly b: V2; readonly kind: Kind; readonly edge: readonly [number, number] }

/** The edges of some tiles, each one once, with its fold. */
function tileEdges(model: DomainModel, tiles: readonly Tile[], place: (p: V2) => V2): Crease[] {
  const seen = new Set<string>(), out: Crease[] = [];
  const f = model.triang.triangles, unit = Math.min(model.a[0], model.b[1]);
  for (const tile of tiles) {
    const c = tileCorners(model, tile);
    for (let k = 0; k < 3; k++) {
      const u = f[tile.t][k], v = f[tile.t][(k + 1) % 3], p = c[k], q = c[(k + 1) % 3];
      // the same edge of the tiling comes from two tiles: tell it by where its middle is
      const key = `${ekey(u, v)}:${Math.round((p[0] + q[0]) / unit * 5e5)}:${Math.round((p[1] + q[1]) / unit * 5e5)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ a: place(p), b: place(q), kind: model.kinds.get(ekey(u, v))!, edge: [u, v] });
    }
  }
  return out;
}

/** The piece of the tiling the reader moves the domain over, in the model's plane. */
export interface Patch {
  /** Every face that meets the block, whole. */
  readonly faces: readonly (readonly V2[])[];
  readonly creases: readonly Crease[];
  /** The parallelogram the tiling is shown in: where the domain and its flaps can be. */
  readonly block: readonly [V2, V2, V2, V2];
  /** x0, y0, x1, y1 of the block. */
  readonly bounds: readonly [number, number, number, number];
}

/**
 * Just enough of the tiling: the domain's corner ranges over one period parallelogram
 * (`origin` in [0,1]²), so the domain stays in the block of 2 × 2 periods. The patch is that
 * block with `margin` (a length of the model) of room around it for the thickening, and the
 * faces that meet it (to be clipped to it).
 */
export function tilingPatch(model: DomainModel, margin = 0): Patch {
  const hMin = Math.min(model.b[1], model.a[0] * model.b[1] / Math.hypot(model.b[0], model.b[1]));
  const m = margin / hMin + 0.04;
  const tiles = tilesMeeting(model, [-m, -m, 2 + m, 2 + m]);
  const same = (p: V2): V2 => p;
  const faces = tiles.map((tile) => tileCorners(model, tile));
  const corner = (x: number, y: number): V2 => fromLattice(model, x, y);
  const block: [V2, V2, V2, V2] = [corner(-m, -m), corner(2 + m, -m), corner(2 + m, 2 + m), corner(-m, 2 + m)];
  const xs = block.map((p) => p[0]), ys = block.map((p) => p[1]);
  return { faces, creases: tileEdges(model, tiles, same), block, bounds: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
}

// ======================================================================================
// the sheet: everything on the page, in mm
// ======================================================================================

export interface DomainOptions {
  /** The gap between the margin and the creases, in mm: 0 (the default) thickens the domain and nothing more, up to `FACE_CLEAR`. */
  readonly gap?: number;
  /** How much thicker than the domain the sheet is on every side, in mm. `FLAP_W` by default, and never more than half the domain's width. */
  readonly thickness?: number;
  /** Are the mouths of the slits rounded? */
  readonly rounded?: boolean;
}

export interface Flap {
  /** One piece of the margin (between two slits, or beyond a corner), on the page. */
  readonly poly: readonly V2[];
  /** Does it end up underneath what it lies on (grey) or on top of it (white)? */
  readonly under: boolean;
  /** The side of the domain it hangs on: 0 bottom, 1 right, 2 top, 3 left. -1 for a piece beyond a corner. */
  readonly side: number;
  /** The translation, on the page, that takes it to where it lies once the sides are joined. */
  readonly glue: V2;
  /** With a gap: the face the piece continues. Without: -1, the margin runs across the faces. */
  readonly face: number;
  /**
   * What the piece belongs to and what it lies on once joined. With a gap: copies of its face, "face:i:j" (the
   * face moved by i a + j b). Without: the margin of a side lies on the opposite side ("side:k"), the one beyond
   * a corner on the opposite corner ("corner:k").
   */
  readonly tile: string;
  readonly onto: string;
}
export interface Seg { readonly a: V2; readonly b: V2 }

export interface DomainSheet {
  readonly W: number;
  readonly H: number;
  readonly page: 'portrait' | 'landscape';
  /** Millimetres per unit length of the torus. */
  readonly scale: number;
  /** The domain's corner in lattice coordinates, as used. */
  readonly origin: V2;
  /** The domain's four corners on the page, counter-clockwise from the corner `origin`. */
  readonly domain: readonly [V2, V2, V2, V2];
  /** The thickened domain's four corners: everything of the sheet lies in it, and without a gap it is the sheet. */
  readonly outline: readonly [V2, V2, V2, V2];
  /** From the plane of the model to the page, and back. */
  readonly toPage: (p: V2) => V2;
  readonly toModel: (p: V2) => V2;
  readonly creases: readonly Crease[];
  readonly cuts: readonly Seg[];
  /** The sides of the domain under the flaps: not cut, not folded. */
  readonly guides: readonly Seg[];
  /**
   * Each piece of a face inside the domain, with the face it belongs to: what a caller that
   * passes `faceColours` wants filled. A face can reach the domain in several translates, so
   * there is one entry per piece, not per face.
   */
  readonly faces: readonly { readonly poly: readonly V2[]; readonly face: number }[];
  readonly flaps: readonly Flap[];
  /** How much thicker than the domain the sheet is on every side, in mm. */
  readonly thickness: number;
  /** The gap between the margin and the creases, in mm, as used. */
  readonly gap: number;
  readonly rounded: boolean;
  /** How many slits there are (counted once per pair of opposite sides), and with a gap how many faces are joined across a side. */
  readonly slits: number;
  readonly joints: number;
  /** Pairs of sides without any flap: 0 the sides along a, 1 the sides along b. */
  readonly bare: readonly number[];
  readonly printedSide: 'outside' | 'inside';
  readonly folds: { readonly mountain: number; readonly valley: number };
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
/** The copy of the domain across side k, in lattice steps: below, right, above, left. */
const ACROSS: readonly V2[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/** Everything about the flaps, in the model's lengths, with the domain's corner at 0. */
interface Joints {
  readonly flaps: readonly { poly: V2[]; under: boolean; side: number; n: V2; tile: number; onto: number }[];
  readonly cuts: Seg[];
  readonly guides: Seg[];
  readonly bounds: [number, number, number, number];
  readonly joints: number;
  readonly slits: number;
  readonly bare: number[];
}

/**
 * The flaps of the faces `tris` (counter-clockwise, the domain's corner at 0) for a sheet printed
 * at `scale` mm per unit: the lengths given in mm are measured at that scale.
 */
function buildJoints(model: DomainModel, tiles: readonly Tile[], tris: readonly V2[][], scale: number, gapMm: number, depth: number, rounded: boolean): Joints {
  const { a, b } = model;
  const c: V2[] = [[0, 0], [a[0], 0], [a[0] + b[0], b[1]], [b[0], b[1]]];
  const tol = 1e-9 * (a[0] + Math.hypot(b[0], b[1]));
  const mm = (x: number): number => x / scale;
  const add = (p: V2, q: V2): V2 => [p[0] + q[0], p[1] + q[1]];
  const offset = (n: V2): V2 => [n[0] * a[0] + n[1] * b[0], n[1] * b[1]];
  // the sides' own frames: x along side k from its first corner, y into the domain
  const frames = c.map((P, k) => {
    const Q = c[(k + 1) % 4], L = dist(P, Q), u: V2 = [(Q[0] - P[0]) / L, (Q[1] - P[1]) / L];
    return { P, u, n: [-u[1], u[0]] as V2, L };
  });
  const toF = (k: number, p: V2): V2 => {
    const f = frames[k], dx = p[0] - f.P[0], dy = p[1] - f.P[1], y = dx * f.n[0] + dy * f.n[1];
    return [dx * f.u[0] + dy * f.u[1], Math.abs(y) < tol ? 0 : y];
  };
  const fromF = (k: number, p: V2): V2 => { const f = frames[k]; return [f.P[0] + p[0] * f.u[0] + p[1] * f.n[0], f.P[1] + p[0] * f.u[1] + p[1] * f.n[1]]; };
  /** Is the point on the line of side m? */
  const onLine = (m: number, p: V2): boolean => Math.abs((p[0] - frames[m].P[0]) * frames[m].n[0] + (p[1] - frames[m].P[1]) * frames[m].n[1]) < tol;

  // ---- the pieces of each face in the eight copies of the domain around it, as far as the depth goes ----
  interface Cell { tile: number; n: V2; side: number; poly: V2[]; f: V2[]; base: [number, number] | null; ok: boolean; done: boolean; left?: V2[][][] }
  const cells = new Map<string, Cell>();
  const cellKey = (tile: number, n: V2): string => `${tile}:${n[0]}:${n[1]}`;
  const tileIndex = new Map(tiles.map((t, k) => [`${t.t}:${t.i}:${t.j}`, k]));
  const landing = (tile: number, n: V2): number => tileIndex.get(`${tiles[tile].t}:${tiles[tile].i - n[0]}:${tiles[tile].j - n[1]}`) ?? -1;
  const around: V2[] = [...ACROSS, ...ACROSS.map((p, k) => add(ACROSS[(k + 3) % 4], p))];      // 4 across a side, then 4 beyond corner k
  if (depth > 0) tris.forEach((T, tile) => {
    let Tg: V2[] = T;
    for (let k = 0; k < 3 && Tg.length; k++) Tg = clipLeft(Tg, T[k], T[(k + 1) % 3], mm(gapMm));
    if (Tg.length < 3) return;
    around.forEach((n, at) => {
      const d = offset(n);
      let poly = Tg;
      for (let m = 0; m < 4 && poly.length; m++) poly = clipLeft(poly, add(c[m], d), add(c[(m + 1) % 4], d), 0);       // in that copy
      for (let m = 0; m < 4 && poly.length; m++) poly = clipLeft(poly, c[m], c[(m + 1) % 4], -depth);                 // no further than the depth
      poly = tidy(poly);
      if (poly.length < 3 || Math.abs(area(poly)) < mm(0.05) * mm(0.05)) return;
      const side = at < 4 ? at : -1;
      const f = side >= 0 ? poly.map((p) => toF(side, p)) : [];
      const xs = f.filter((p) => p[1] === 0).map((p) => p[0]);
      const base: [number, number] | null = xs.length >= 2 ? [Math.min(...xs), Math.max(...xs)] : null;
      // a flap stands on enough of its side and reaches far enough beyond it
      const ok = side >= 0 && base !== null && base[1] - base[0] >= mm(MIN_BASE) && Math.abs(area(poly)) >= mm(1) * mm(MIN_AREA)
        && Math.max(...f.map((p) => -p[1])) >= Math.min(mm(MIN_DEPTH), 0.9 * depth);
      cells.set(cellKey(tile, n), { tile, n, side, poly, f, base, ok, done: false });
    });
  });
  /** The length of the cell's boundary on the line of side m. */
  const along = (cell: Cell, m: number): number => {
    let sum = 0;
    cell.poly.forEach((p, i) => { const q = cell.poly[(i + 1) % cell.poly.length]; if (onLine(m, p) && onLine(m, q)) sum += dist(p, q); });
    return sum;
  };
  // The triangle continues as one piece: a piece that does not stand on a side well enough itself still
  // belongs to the sheet if it hangs on one that does. The piece beyond corner k hangs on the flap of side k
  // (across the line of side k-1) and on the flap of side k-1 (across the line of side k), and they on it.
  for (let more = true; more;) {
    more = false;
    for (const cell of cells.values()) {
      if (cell.side >= 0) continue;
      const k = around.findIndex((n) => n[0] === cell.n[0] && n[1] === cell.n[1]) - 4;
      for (const [flapSide, line] of [[k, (k + 3) % 4], [(k + 3) % 4, k]]) {
        const flap = cells.get(cellKey(cell.tile, ACROSS[flapSide]));
        if (!flap || flap.ok === cell.ok || along(cell, line) < mm(MIN_HINGE)) continue;
        flap.ok = cell.ok = true;
        more = true;
      }
    }
  }

  const flaps: { poly: V2[]; under: boolean; side: number; n: V2; tile: number; onto: number }[] = [];
  const cuts: Seg[] = [], guides: Seg[] = [];
  let joints = 0, slitCount = 0;
  const copies = new Map<number, number>();                                      // how many copies of each face meet the domain
  for (const t of tiles) copies.set(t.t, (copies.get(t.t) ?? 0) + 1);

  // ---- a face on two copies: its two flaps are slit at the same points and take turns ----
  for (const k of [0, 1]) tiles.forEach((t, tile) => {
    if (copies.get(t.t) !== 2) return;
    const mate = landing(tile, ACROSS[k]);
    if (mate < 0) return;
    const out = cells.get(cellKey(tile, ACROSS[k])), inn = cells.get(cellKey(mate, ACROSS[k + 2]));
    const L = frames[k].L;
    // the stretch both flaps stand on, measured along side k (the opposite side runs the other way)
    const bases: [number, number][] = [];
    if (out?.ok) bases.push(out.base!);
    if (inn?.ok) bases.push([L - inn.base![1], L - inn.base![0]]);
    if (!bases.length) return;
    joints++;
    const s0 = Math.max(...bases.map((r) => r[0])), s1 = Math.min(...bases.map((r) => r[1])), len = s1 - s0;
    const slits = len >= mm(TWO_SLITS) ? [s0 + len / 3, s0 + 2 * len / 3] : len >= mm(ONE_SLIT) ? [s0 + len / 2] : [];
    slitCount += slits.length;
    for (const [cell, side, onto, flip] of [[out, k, mate, false], [inn, k + 2, tile, true]] as const) {
      if (!cell?.ok) continue;
      cell.done = true;
      // in the cell's own frame; on the opposite side the slits are counted from the other end
      const own = flip ? slits.map((x) => L - x).reverse() : slits;
      const strip = slitStrip(cell.f, own, rounded ? mm(SLIT_ROUND) : 0);
      for (const line of strip.cuts) for (let i = 0; i + 1 < line.length; i++) cuts.push({ a: fromF(side, line[i]), b: fromF(side, line[i + 1]) });
      cell.left = strip.edges;                                                    // what the mouths leave of its edges
      strip.pieces.forEach((piece, i) => {
        if (piece.length < 3 || Math.abs(area(piece)) < mm(0.3) * mm(0.3)) return;
        // the pieces take turns from one end of side k: there on top first, on the opposite side underneath first
        const turn = flip ? own.length - i : i;
        flaps.push({ poly: piece.map((p) => fromF(side, p)), under: (turn % 2 === 1) !== flip, side, n: cell.n, tile: cell.tile, onto });
      });
    }
  });
  // ---- a face on three or four copies (over a corner of the domain): no slits, the copies are stacked in one order ----
  const level = (tile: number): number => tiles[tile].j * 4096 + tiles[tile].i;
  const stacked = new Set<string>();
  for (const cell of cells.values()) {
    if (!cell.ok || cell.done) continue;
    const onto = landing(cell.tile, cell.n);
    if (onto < 0) { cell.ok = false; continue; }
    stacked.add(`${Math.min(cell.tile, onto)}:${Math.max(cell.tile, onto)}`);
    flaps.push({ poly: cell.poly, under: level(cell.tile) < level(onto), side: cell.side, n: cell.n, tile: cell.tile, onto });
  }
  joints += stacked.size;

  // ---- the outline ----
  const bases: [number, number][][] = [[], [], [], []];
  for (const cell of cells.values()) {
    if (!cell.ok) continue;
    if (cell.side >= 0) bases[cell.side].push(cell.base!);
    cell.poly.forEach((p, i) => {
      const q = cell.poly[(i + 1) % cell.poly.length];
      const m = [0, 1, 2, 3].find((line) => onLine(line, p) && onLine(line, q));
      if (m === undefined) {
        // an outer edge: all of it, or what the rounded mouths of the slits leave
        if (!cell.left) cuts.push({ a: p, b: q });
        else for (const line of cell.left[i]) cuts.push({ a: fromF(cell.side, line[0]), b: fromF(cell.side, line[1]) });
        return;
      }
      // what lies across that line: the domain itself (the flap stands there), or another piece of the same face
      const beyond = cell.n[0] * ACROSS[m][0] + cell.n[1] * ACROSS[m][1] === 1;
      const other: V2 = beyond ? [cell.n[0] - ACROSS[m][0], cell.n[1] - ACROSS[m][1]] : [cell.n[0] + ACROSS[m][0], cell.n[1] + ACROSS[m][1]];
      if (other[0] === 0 && other[1] === 0) guides.push({ a: p, b: q });
      else if (!cells.get(cellKey(cell.tile, other))?.ok) cuts.push({ a: p, b: q });
    });
  }
  // the rest of the four sides is cut
  const bare: number[] = [];
  for (let k = 0; k < 4; k++) {
    let x = 0;
    for (const [p, q] of bases[k].sort((r, t) => r[0] - t[0])) {
      if (p - x > tol) cuts.push({ a: fromF(k, [x, 0]), b: fromF(k, [p, 0]) });
      x = Math.max(x, q);
    }
    if (frames[k].L - x > tol) cuts.push({ a: fromF(k, [x, 0]), b: fromF(k, [frames[k].L, 0]) });
    if (k < 2 && !bases[k].length && !bases[k + 2].length) bare.push(k);
  }
  let x0 = Math.min(0, b[0]), y0 = 0, x1 = a[0] + Math.max(0, b[0]), y1 = b[1];
  for (const f of flaps) for (const [x, y] of f.poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { flaps, cuts, guides, bounds: [x0, y0, x1, y1], joints, slits: slitCount, bare };
}

/**
 * The domain thickened and nothing more (gap 0), on the page: the margin as strips between the slits and
 * the four pieces beyond the corners. `crossings[k]` is where the creases cross side k (k = 0, 1), measured
 * along it from its first corner.
 */
function thicken(domain: readonly V2[], outline: readonly V2[], w: number, crossings: readonly (readonly number[])[], r: number): { flaps: Flap[]; cuts: Seg[]; slits: number } {
  const frames = domain.map((P, k) => {
    const Q = domain[(k + 1) % 4], L = dist(P, Q), u: V2 = [(Q[0] - P[0]) / L, (Q[1] - P[1]) / L];
    return { P, u, n: [-u[1], u[0]] as V2, L };
  });
  const toF = (k: number, p: V2): V2 => { const f = frames[k], dx = p[0] - f.P[0], dy = p[1] - f.P[1]; return [dx * f.u[0] + dy * f.u[1], dx * f.n[0] + dy * f.n[1]]; };
  const fromF = (k: number, p: V2): V2 => { const f = frames[k]; return [f.P[0] + p[0] * f.u[0] + p[1] * f.n[0], f.P[1] + p[0] * f.u[1] + p[1] * f.n[1]]; };
  const inside = (poly: V2[], k: number): V2[] => clipLeft(poly, domain[k], domain[(k + 1) % 4], 0);
  const beyond = (poly: V2[], k: number): V2[] => clipLeft(poly, domain[(k + 1) % 4], domain[k], 0);
  const sin = Math.abs(frames[0].u[0] * frames[1].u[1] - frames[0].u[1] * frames[1].u[0]);

  // ---- the slits of the two pairs of sides: thirds of each stretch between two creases, none where four layers meet at a corner ----
  const slits = [0, 1].map((k) => {
    const L = frames[k].L, marks = [0, ...crossings[k], L], out: number[] = [];
    for (let i = 0; i + 1 < marks.length; i++) {
      const p = marks[i], len = marks[i + 1] - p;
      if (len >= TWO_SLITS) out.push(p + len / 3, p + 2 * len / 3); else if (len >= ONE_SLIT) out.push(p + len / 2);
    }
    return out.filter((x) => x > w / sin + 1 && x < L - w / sin - 1);
  });

  // ---- who lies on top. Along a pair of sides the two take turns at every slit. Where the four corners of
  // the domain meet there are four layers P, Q, R, S (the sheet with its corner 0, 1, 2, 3 there), and the
  // turns at the two ends of the two pairs of sides must fit one order of the four. ----
  const odd = slits.map((x) => x.length % 2 === 1);
  const first = [true, !(odd[0] && odd[1])];                    // does the side 0 (the side 1) lie on top at its first corner?
  const last = [first[0] !== odd[0], first[1] !== odd[1]];
  let rank = [0, 1, 2, 3];
  const orders = [0, 1, 2, 3].flatMap((p) => [0, 1, 2, 3].flatMap((q) => [0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((t) => [p, q, r, t]))));
  for (const [P, Q, R, S] of orders) {
    if (new Set([P, Q, R, S]).size === 4 && (P > S) === first[0] && (Q > R) === last[0] && (Q > P) === first[1] && (R > S) === last[1]) { rank = [P, Q, R, S]; break; }
  }

  const flaps: Flap[] = [], cuts: Seg[] = [];
  const shift = (k: number): V2 => [domain[(k + 3) % 4][0] - domain[k][0], domain[(k + 3) % 4][1] - domain[k][1]];      // from side k to the opposite side, for k = 0, 1
  const across: V2[] = [shift(0), shift(1), [-shift(0)[0], -shift(0)[1]], [-shift(1)[0], -shift(1)[1]]];                  // where the margin of side k lies once joined
  for (let k = 0; k < 4; k++) {
    const pair = k % 2, L = frames[k].L, own = k < 2 ? slits[pair] : slits[pair].map((x) => L - x).reverse();
    // the margin beyond side k, between the lines of the two sides next to it: its far edge is flat, at -w
    const region = inside(inside(beyond([...outline], k), (k + 3) % 4), (k + 1) % 4).map((p): V2 => { const q = toF(k, p); return [q[0], Math.abs(q[1] + w) < 1e-9 ? -w : Math.abs(q[1]) < 1e-9 ? 0 : q[1]]; });
    const strip = slitStrip(region, own, r);
    for (const line of strip.cuts) for (let i = 0; i + 1 < line.length; i++) cuts.push({ a: fromF(k, line[i]), b: fromF(k, line[i + 1]) });
    strip.pieces.forEach((piece, i) => {
      // counted from the first corner of side `pair`: is that side on top over this stretch?
      const turn = k < 2 ? i : own.length - i, sideOnTop = first[pair] !== (turn % 2 === 1);
      flaps.push({ poly: piece.map((p) => fromF(k, p)), under: k < 2 ? !sideOnTop : sideOnTop, side: k, glue: across[k], face: -1, tile: `side:${k}`, onto: `side:${(k + 2) % 4}` });
    });
    // this side of the thickened domain, from corner to corner: all of it, or what the rounded mouths leave of the strip's far edge
    const far = region.findIndex((p, i) => p[1] === -w && region[(i + 1) % region.length][1] === -w);
    const kept = strip.edges[far].map((line) => [Math.min(line[0][0], line[1][0]), Math.max(line[0][0], line[1][0])]).sort((p, q) => p[0] - q[0]);
    let from: V2 = outline[k];
    for (let i = 0; i + 1 < kept.length; i++) { cuts.push({ a: from, b: fromF(k, [kept[i][1], -w]) }); from = fromF(k, [kept[i + 1][0], -w]); }
    cuts.push({ a: from, b: outline[(k + 1) % 4] });
    // the piece beyond corner k lies on the sheet's opposite corner
    const corner = beyond(beyond([...outline], (k + 3) % 4), k);
    flaps.push({
      poly: corner, under: rank[k] < rank[(k + 2) % 4], side: -1, face: -1, tile: `corner:${k}`, onto: `corner:${(k + 2) % 4}`,
      glue: [across[(k + 3) % 4][0] + across[k][0], across[(k + 3) % 4][1] + across[k][1]],
    });
  }
  return { flaps, cuts, slits: slits[0].length + slits[1].length };
}

export function layoutDomain(model: DomainModel, origin: V2, options: DomainOptions = {}): DomainSheet {
  const ox = clamp01(origin[0]), oy = clamp01(origin[1]);
  const o = fromLattice(model, ox, oy);
  const gap = Math.min(FACE_CLEAR, Math.max(0, options.gap ?? 0)), rounded = options.rounded ?? false;
  const { a, b } = model;

  // ---- the page: the thickened domain as large as A4 holds it under the header. Moving every side out
  // by w moves the corners along both sides' directions, by w / sin of their angle each: sideways that is
  // more than w if the domain is slanted. ----
  const lb = Math.hypot(b[0], b[1]), u: V2 = [1, 0], v: V2 = [b[0] / lb, b[1] / lb];
  const bw = a[0] + Math.abs(b[0]), bh = b[1], hMin = Math.min(b[1], a[0] * b[1] / lb);
  const fitted = (margin: number): { s: number; page: 'portrait' | 'landscape' } => {
    const at = (W: number, H: number): number => Math.min((W - 2 * MARGIN - 2 * (margin / v[1]) * (1 + Math.abs(v[0]))) / bw, (H - HEAD_ROOM - MARGIN - 2 * margin) / bh);
    const portrait = at(210, 297), landscape = at(297, 210);
    return portrait >= landscape ? { s: portrait, page: 'portrait' } : { s: landscape, page: 'landscape' };
  };
  // Joined, the margin of a side lies inside the opposite side: the two margins of a pair of sides must
  // not meet, so the margin is at most half the domain's width (this only bites on a needle of a torus,
  // whose domain is a few millimetres wide).
  let w = Math.max(0, options.thickness ?? FLAP_W), { s, page } = fitted(w);
  if (2 * w > s * hMin) { w = 0.49 * s * hMin; ({ s, page } = fitted(w)); }
  const t = w / v[1];
  const W = page === 'portrait' ? 210 : 297, H = page === 'portrait' ? 297 : 210;
  const X0 = W / 2 - s * (Math.min(0, b[0]) + a[0] + Math.max(0, b[0])) / 2, Y0 = (MARGIN + H - HEAD_ROOM) / 2 - s * b[1] / 2;
  const place = (p: V2): V2 => [X0 + s * p[0], Y0 + s * p[1]];                    // from the domain's own frame
  const toPage = (p: V2): V2 => place([p[0] - o[0], p[1] - o[1]]);
  const toModel = (p: V2): V2 => [o[0] + (p[0] - X0) / s, o[1] + (p[1] - Y0) / s];
  const domain: [V2, V2, V2, V2] = [place([0, 0]), place([a[0], 0]), place([a[0] + b[0], b[1]]), place([b[0], b[1]])];
  const out = (p: V2, su: number, sv: number): V2 => [p[0] + t * (su * u[0] + sv * v[0]), p[1] + t * (su * u[1] + sv * v[1])];
  const outline: [V2, V2, V2, V2] = [out(domain[0], -1, -1), out(domain[1], 1, -1), out(domain[2], 1, 1), out(domain[3], -1, 1)];

  // ---- the faces that reach the sheet ----
  const m = gap > 0 ? 0 : w / s / hMin + 1e-9;
  const tiles = tilesMeeting(model, [ox - m, oy - m, ox + 1 + m, oy + 1 + m]);
  const edges = tileEdges(model, tiles, toPage);

  // ---- the faces as they lie in the domain, for a caller that colours them ----
  const clipToQuad = (poly: V2[], q: readonly V2[]): V2[] => {
    let out = poly;
    for (let i = 0; i < q.length && out.length; i++) out = clipLeft(out, q[i], q[(i + 1) % q.length], 0);
    return out;
  };
  const faces = tiles
    .map((tile) => ({ poly: clipToQuad(tileCorners(model, tile).map(toPage), domain), face: tile.t }))
    .filter((f) => f.poly.length >= 3 && Math.abs(area(f.poly)) > 1e-6);

  // ---- the creases: without a gap they run on into the margin, with one they stop at the domain ----
  const creases: Crease[] = [];
  for (const e of edges) {
    const seg = clipSeg(e.a, e.b, gap > 0 ? domain : outline);
    if (seg && dist(seg[0], seg[1]) >= 0.05) creases.push({ a: seg[0], b: seg[1], kind: e.kind, edge: e.edge });
  }
  // an edge of the torus may be cut into several pieces by the sides: count edges, not pieces
  const mountain = new Set(creases.filter((l) => l.kind === 'mountain').map((l) => ekey(l.edge[0], l.edge[1]))).size;
  const valley = new Set(creases.filter((l) => l.kind === 'valley').map((l) => ekey(l.edge[0], l.edge[1]))).size;

  let flaps: Flap[], cuts: Seg[], guides: Seg[], joints = 0, slits = 0, bare: number[] = [];
  if (gap > 0) {
    // ---- every cut face keeps its own piece of the margin ----
    const tris = tiles.map((tile) => {
      const q = tileCorners(model, tile).map((p) => [p[0] - o[0], p[1] - o[1]] as V2);
      return model.clockwise ? [q[0], q[2], q[1]] : q;
    });
    const built = buildJoints(model, tiles, tris, s, gap, w / s, rounded);
    const name = (tile: number): string => `${tiles[tile].t}:${tiles[tile].i}:${tiles[tile].j}`;
    flaps = built.flaps.map((f) => ({
      poly: f.poly.map(place), under: f.under, side: f.side, face: tiles[f.tile].t, tile: name(f.tile), onto: name(f.onto),
      glue: [-s * (f.n[0] * a[0] + f.n[1] * b[0]), -s * f.n[1] * b[1]],
    }));
    const seg = (l: Seg): Seg => ({ a: place(l.a), b: place(l.b) });
    cuts = built.cuts.map(seg); guides = built.guides.map(seg);
    joints = built.joints; slits = built.slits; bare = built.bare;
  } else {
    // ---- the domain thickened, and nothing more ----
    const crossings = [0, 1].map((k) => {
      const P = domain[k], Q = domain[k + 1], L = dist(P, Q), ux = (Q[0] - P[0]) / L, uy = (Q[1] - P[1]) / L;
      const xs: number[] = [];
      for (const e of edges) {
        const da = (e.a[0] - P[0]) * -uy + (e.a[1] - P[1]) * ux, db = (e.b[0] - P[0]) * -uy + (e.b[1] - P[1]) * ux;
        if ((da < 0) === (db < 0)) continue;
        const r = da / (da - db), x = (e.a[0] + r * (e.b[0] - e.a[0]) - P[0]) * ux + (e.a[1] + r * (e.b[1] - e.a[1]) - P[1]) * uy;
        if (x > 0 && x < L) xs.push(x);
      }
      return xs.sort((p, q) => p - q);
    });
    const built = thicken(domain, outline, w, crossings, rounded ? Math.min(SLIT_ROUND, w / 3) : 0);
    flaps = w > 0 ? built.flaps : []; cuts = built.cuts; slits = w > 0 ? built.slits : 0;
    guides = w > 0 ? domain.map((p, k) => ({ a: p, b: domain[(k + 1) % 4] })) : [];
    if (w === 0) { cuts = domain.map((p, k) => ({ a: p, b: domain[(k + 1) % 4] })); bare = [0, 1]; }
  }

  return {
    W, H, page, scale: s, origin: [ox, oy], domain, outline, toPage, toModel,
    creases, cuts, guides, faces, flaps, thickness: w, gap, rounded, joints, slits, bare,
    printedSide: model.printedSide, folds: { mountain, valley },
  };
}

// ======================================================================================
// the PDF
// ======================================================================================

export function domainPdf(sheet: DomainSheet, info: CutoutInfo): Uint8Array {
  const pdf = new Page(sheet.W, sheet.H);
  // the faces first, so the grey of the pieces that go underneath still reads over them. A flap is
  // the continuation of its own face past the side, so it takes that face's colour too.
  const cols = info.faceColours;
  if (cols) {
    for (const f of sheet.faces) { const c = cols[f.face]; if (c) pdf.fill(f.poly, c); }
    // a gap-free sheet has one margin strip per side, crossing several faces: face -1, left white
    for (const f of sheet.flaps) { const c = f.under || f.face < 0 ? undefined : cols[f.face]; if (c) pdf.fill(f.poly, c); }
  }
  for (const f of sheet.flaps) {
    if (!f.under) continue;
    pdf.fill(f.poly, UNDER_FC);
    // two grey pieces of one triangle meet edge to edge: a thin line of the same grey closes the hairline between them
    f.poly.forEach((p, i) => pdf.line(p, f.poly[(i + 1) % f.poly.length], UNDER_FC, 0.3, null));
  }
  for (const l of sheet.creases) {
    pdf.line(l.a, l.b, l.kind === 'mountain' ? MOUNTAIN_C : VALLEY_C, CREASE_LW, l.kind === 'mountain' ? MOUNTAIN_DASH : VALLEY_DASH);
  }
  for (const g of sheet.guides) pdf.line(g.a, g.b, GUIDE_C, GUIDE_LW, GUIDE_DASH);
  for (const l of sheet.cuts) pdf.line(l.a, l.b, CUT_C, CUT_LW, null);
  const top = sheet.H - MARGIN, legendW = 58;
  pdf.text(info.title, [MARGIN, top - 4.5], 4.6, CUT_C, 'left');
  pdf.text(info.subtitle, [MARGIN, top - 10], 3.0, [0.3, 0.3, 0.3], 'left');
  const note = 'Print at 100%. Cut along the solid lines, the slits included. The sheet is the domain (dotted) with a margin around it. '
    + 'Opposite sides join: lay the margin of each on the other, sliding the two into each other along the slits until the dotted lines meet. '
    + `Grey pieces go underneath, white ones on top. Mountain and valley are seen from the printed side, which ends up on the ${sheet.printedSide} of the torus.`;
  pdf.text(note, [MARGIN, top - 15], 2.4, [0.35, 0.35, 0.35], 'left', sheet.W - 2 * MARGIN - legendW - 4);
  const lx = sheet.W - MARGIN - legendW;
  ([[MOUNTAIN_C, MOUNTAIN_DASH, CREASE_LW, 'mountain fold'], [VALLEY_C, VALLEY_DASH, CREASE_LW, 'valley fold'], [CUT_C, null, CUT_LW, 'cut'],
    [GUIDE_C, GUIDE_DASH, GUIDE_LW, 'side of the domain, no fold']] as const).forEach(([col, dash, lw, label], i) => {
    const y = top - 3.5 - i * 4.2;
    pdf.line([lx, y], [lx + 14, y], col, lw, dash ? [...dash] : null);
    pdf.text(label, [lx + 17, y], 2.8, [0.2, 0.2, 0.2], 'left-middle');
  });
  return pdf.bytes(info.title);
}
