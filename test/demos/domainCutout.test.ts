import { describe, it, expect } from 'vitest';
import { byId } from '@core/triangulations';
import { paperFromRow } from '@core/configuration/csv';
import {
  domainModel, layoutDomain, tilingPatch, domainPdf, slitStrip, FACE_CLEAR, FLAP_W, SLIT_ROUND, ARC_STEPS,
  type DomainSheet, type DomainOptions,
} from '../../demos/torus-moduli/domainCutout';
import { area, clipLeft, pointSeg, type V2 } from '../../demos/torus-moduli/cutout';

/**
 * The fundamental-domain cutout of torus-moduli, on the first, a middle and the last row of every
 * committed data file, with the domain in several places and both printed sides: the domain
 * thickened and nothing more (no gap, two thicknesses), and with the margin kept off the creases
 * (three gaps).
 */
const files = import.meta.glob('../../demos/torus-moduli/data/*.csv', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const tori = Object.keys(files).sort().flatMap((path) => {
  const f = path.match(/([^/]+\.csv)$/)![1], type = Number(f.match(/t(\d)/)![1]);
  const rows = files[path].split('\n').map((l) => l.trim()).filter((l) => l && !/^[a-zA-Z]/.test(l));
  return [...new Set([0, Math.floor(rows.length / 2), rows.length - 1])].map((r) => ({ name: `${f} row ${r}`, type, row: rows[r].split(',').map(Number) }));
});
const origins: V2[] = [[0.5, 0.5], [0, 0], [1, 1], [0.137, 0.842], [0.71, 0.29], [0.333, 0.05]];
const settings: DomainOptions[] = [{}, { thickness: 10 }, { gap: FACE_CLEAR }, { gap: 0.5 }, { gap: 0.3, thickness: 3 }, { rounded: true }, { gap: 0.5, rounded: true }];

const ccw = (poly: readonly V2[]): V2[] => (area(poly) < 0 ? [...poly].reverse() : [...poly]);
/** The area a polygon has inside a convex one. */
function areaInside(poly: readonly V2[], convex: readonly V2[]): number {
  let out = ccw(poly);
  const Q = ccw(convex);
  for (let i = 0; i < Q.length && out.length; i++) out = clipLeft(out, Q[i], Q[(i + 1) % Q.length], 0);
  return out.length >= 3 ? Math.abs(area(out)) : 0;
}
const moved = (poly: readonly V2[], d: V2): V2[] => poly.map((p) => [p[0] + d[0], p[1] + d[1]] as V2);
const len = (s: { a: V2; b: V2 }): number => Math.hypot(s.a[0] - s.b[0], s.a[1] - s.b[1]);
/** The distance from a segment to a convex polygon, 0 if they meet. */
function segToPoly(a: V2, b: V2, poly: readonly V2[]): number {
  if (areaInside([a, b, [(a[0] + b[0]) / 2 + 1e-7, (a[1] + b[1]) / 2 + 1e-7]], poly) > 0) return 0;
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const c = poly[i], d = poly[(i + 1) % poly.length];
    const o = (p: V2, q: V2, r: V2): number => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    if (o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0) return 0;
    best = Math.min(best, pointSeg(a, c, d), pointSeg(b, c, d), pointSeg(c, a, b), pointSeg(d, a, b));
  }
  return best;
}
/** Does the segment pass through the inside of the convex polygon (not just along its boundary)? */
function throughInside(a: V2, b: V2, poly: readonly V2[]): boolean {
  const Q = ccw(poly);
  let t0 = 0, t1 = 1;
  for (let i = 0; i < Q.length; i++) {
    const p = Q[i], q = Q[(i + 1) % Q.length], nx = -(q[1] - p[1]), ny = q[0] - p[0];
    const sa = (a[0] - p[0]) * nx + (a[1] - p[1]) * ny, sd = (b[0] - a[0]) * nx + (b[1] - a[1]) * ny;
    if (Math.abs(sd) < 1e-12) { if (sa < 0) return false; continue; }
    if (sd > 0) t0 = Math.max(t0, -sa / sd); else t1 = Math.min(t1, -sa / sd);
  }
  if ((t1 - t0) * Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-6) return false;
  const mid: V2 = [a[0] + (t0 + t1) / 2 * (b[0] - a[0]), a[1] + (t0 + t1) / 2 * (b[1] - a[1])];
  return Math.min(...Q.map((p, i) => pointSeg(mid, p, Q[(i + 1) % Q.length]))) > 1e-6;
}
/** How far the point lies beyond side k of the domain (negative inside its line). */
function beyond(sheet: DomainSheet, k: number, p: V2): number {
  const P = sheet.domain[k], Q = sheet.domain[(k + 1) % 4], L = Math.hypot(Q[0] - P[0], Q[1] - P[1]);
  return -((Q[0] - P[0]) * (p[1] - P[1]) - (Q[1] - P[1]) * (p[0] - P[0])) / L;
}
/** How far along side k the point is, from the side's first corner. */
function along(sheet: DomainSheet, k: number, p: V2): number {
  const P = sheet.domain[k], Q = sheet.domain[(k + 1) % 4], L = Math.hypot(Q[0] - P[0], Q[1] - P[1]);
  return ((p[0] - P[0]) * (Q[0] - P[0]) + (p[1] - P[1]) * (Q[1] - P[1])) / L;
}
/** The stretch of side k a piece lying against it stands on: its corners on the side's line. */
function stretch(sheet: DomainSheet, k: number, poly: readonly V2[]): [number, number] {
  const on = poly.filter((p) => Math.abs(beyond(sheet, k, p)) < 1e-6).map((p) => along(sheet, k, p));
  return [Math.min(...on), Math.max(...on)];
}

function everySheet(run: (sheet: DomainSheet, where: string, onVertex: boolean) => void): void {
  for (const t of tori) for (const side of ['outside', 'inside'] as const) {
    const T = byId('v8-' + t.type);
    const model = domainModel(T, paperFromRow(T, t.row).positions, side);
    // lattice coordinates 0 or 1 put the domain's corner on a vertex of the torus (the root of the development)
    for (const o of origins) for (const options of settings) {
      run(layoutDomain(model, o, options), `${t.name}, ${side}, origin ${o}, ${JSON.stringify(options)}`, o[0] % 1 === 0 && o[1] % 1 === 0);
    }
  }
}
/** The domain's width across its longer sides, in mm. */
function width(sheet: DomainSheet): number {
  const [c0, c1, , c3] = sheet.domain;
  return Math.abs((c1[0] - c0[0]) * (c3[1] - c0[1]) - (c1[1] - c0[1]) * (c3[0] - c0[0])) / Math.max(len({ a: c0, b: c1 }), len({ a: c0, b: c3 }));
}

/** What a rounded mouth takes off one corner: the square of side r less the quarter disc as it is drawn. */
const corner = (r: number): number => r * r - (ARC_STEPS / 2) * r * r * Math.sin(Math.PI / (2 * ARC_STEPS));

describe('slitStrip: a strip of margin cut into pieces by its slits', () => {
  const strip: V2[] = [[0, 0], [0, -6], [30, -6], [30, 0]];

  it('square slits: the pieces are the strip, the slits run from the far edge to the base', () => {
    const s = slitStrip(strip, [10, 20]);
    expect(s.pieces.map((p) => Math.abs(area(p)))).toEqual([60, 60, 60]);
    expect(s.cuts).toEqual([[[10, -6], [10, 0]], [[20, -6], [20, 0]]]);
    expect(s.edges).toEqual(strip.map((p, i) => [[p, strip[(i + 1) % 4]]]));
  });

  it('rounded slits: each mouth is a funnel 2r wide, the corners cut off along quarter circles', () => {
    const r = 1.5, s = slitStrip(strip, [10, 20], r);
    const areas = s.pieces.map((p) => Math.abs(area(p)));
    expect(areas[0]).toBeCloseTo(60 - corner(r), 9);
    expect(areas[1]).toBeCloseTo(60 - 2 * corner(r), 9);
    expect(areas[2]).toBeCloseTo(60 - corner(r), 9);
    // the far edge loses 2r at each mouth, the other edges are whole
    expect(s.edges[1]).toEqual([[[0, -6], [8.5, -6]], [[11.5, -6], [18.5, -6]], [[21.5, -6], [30, -6]]]);
    expect(s.edges[0]).toEqual([[[0, 0], [0, -6]]]);
    // per slit: the straight part from r below the far edge to the base, and two arcs that meet it there
    expect(s.cuts).toHaveLength(6);
    for (const [k, x] of [10, 20].entries()) {
      const [slit, left, right] = s.cuts.slice(3 * k, 3 * k + 3);
      expect(slit).toEqual([[x, -4.5], [x, 0]]);
      expect(left[0][0]).toBeCloseTo(x - r, 12); expect(left[0][1]).toBeCloseTo(-6, 12);
      expect(left[ARC_STEPS][0]).toBeCloseTo(x, 12); expect(left[ARC_STEPS][1]).toBeCloseTo(-4.5, 12);
      expect(right[0][0]).toBeCloseTo(x, 12); expect(right[0][1]).toBeCloseTo(-4.5, 12);
      expect(right[ARC_STEPS][0]).toBeCloseTo(x + r, 12); expect(right[ARC_STEPS][1]).toBeCloseTo(-6, 12);
      for (const p of left) expect(Math.hypot(p[0] - (x - r), p[1] + 4.5)).toBeCloseTo(r, 12);
      for (const p of right) expect(Math.hypot(p[0] - (x + r), p[1] + 4.5)).toBeCloseTo(r, 12);
    }
    // a piece has no corner left where a slit meets the far edge
    for (const p of s.pieces) for (const q of p) expect([10, 20].some((x) => Math.abs(q[0] - x) < 1e-9 && Math.abs(q[1] + 6) < 1e-9)).toBe(false);
  });

  it('a slit that meets a slanted or too short stretch of the far edge, or a shallow strip, stays square', () => {
    // a trapezoid: the far edge is flat only from x = 12 to x = 18
    const trapezoid: V2[] = [[0, 0], [12, -6], [18, -6], [30, 0]];
    const s = slitStrip(trapezoid, [6, 13, 15], 1.5);
    expect(s.cuts.filter((c) => c.length === 2)).toEqual([[[6, -3], [6, 0]], [[13, -6], [13, 0]], [[15, -4.5], [15, 0]]]);
    expect(s.cuts).toHaveLength(5);                                         // only the slit at 15 has room for its two arcs
    const shallow = slitStrip([[0, 0], [0, -3], [30, -3], [30, 0]], [15], 1.5);
    expect(shallow.cuts).toEqual([[[15, -3], [15, 0]]]);
  });
});

describe('torus-moduli: the fundamental-domain cutout', () => {
  it('the faces and their translates tile the domain exactly once', () => {
    for (const t of tori) {
      const T = byId('v8-' + t.type);
      const model = domainModel(T, paperFromRow(T, t.row).positions);
      const patch = tilingPatch(model);
      for (const o of origins) {
        const sheet = layoutDomain(model, o);
        const D = sheet.domain.map(sheet.toModel);
        const covered = patch.faces.reduce((sum, tri) => sum + areaInside(tri, D), 0);
        expect(covered / Math.abs(area(D)), `${t.name}, origin ${o}`).toBeCloseTo(1, 7);
      }
    }
  });

  it('the reduced basis has its angle between 60° and 120°, and the thickened domain fills the page under the header', () => {
    const wrong: string[] = [];
    everySheet((sheet, where) => {
      const [c0, c1, , c3] = sheet.domain;
      const a: V2 = [c1[0] - c0[0], c1[1] - c0[1]], b: V2 = [c3[0] - c0[0], c3[1] - c0[1]];
      const cos = (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b));
      if (Math.abs(cos) > 0.5 + 1e-9 || Math.hypot(...a) > Math.hypot(...b) + 1e-9) wrong.push(`${where}: the basis is not reduced`);
      // every side of the thickened domain is the domain's side moved out by the thickness
      for (let k = 0; k < 4; k++) for (const p of [sheet.outline[k], sheet.outline[(k + 1) % 4]]) {
        if (Math.abs(beyond(sheet, k, p) - sheet.thickness) > 1e-6) wrong.push(`${where}: side ${k} of the thickened domain is not ${sheet.thickness} mm out`);
      }
      const xs = sheet.outline.map((p) => p[0]), ys = sheet.outline.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      if (x0 < 11 - 1e-6 || x1 > sheet.W - 11 + 1e-6 || y0 < 11 - 1e-6 || y1 > sheet.H - 38 + 1e-6) wrong.push(`${where}: the sheet is off the page body`);
      if (Math.min(x0 - 11, sheet.W - 11 - x1) > 1e-6 && Math.min(y0 - 11, sheet.H - 38 - y1) > 1e-6) wrong.push(`${where}: the sheet could be printed larger`);
      // and everything of the sheet lies in it
      for (const f of sheet.flaps) if (Math.abs(areaInside(f.poly, sheet.outline) - Math.abs(area(f.poly))) > 1e-6) wrong.push(`${where}: a piece of side ${f.side} leaves the thickened domain`);
    });
    expect(wrong).toEqual([]);
  });

  it('each side of the domain is cut or covered by the margin along its whole length', () => {
    everySheet((sheet, where) => {
      for (let e = 0; e < 4; e++) {
        const P = sheet.domain[e], Q = sheet.domain[(e + 1) % 4], L = Math.hypot(Q[0] - P[0], Q[1] - P[1]);
        const on = (s: { a: V2; b: V2 }): boolean => pointSeg(s.a, P, Q) < 1e-7 && pointSeg(s.b, P, Q) < 1e-7;
        const total = [...sheet.cuts, ...sheet.guides].filter(on).reduce((sum, s) => sum + len(s), 0);
        expect(total, `${where}, side ${e}`).toBeCloseTo(L, 6);
      }
    });
  });

  it('without a gap the sheet is the thickened domain and nothing more', () => {
    let sheets = 0, slits = 0;
    const wrong: string[] = [];
    everySheet((sheet, where) => {
      if (sheet.gap > 0 || sheet.rounded) return;
      sheets++; slits += sheet.slits;
      // the margin, all of it, in pieces that do not overlap (checked in another test)
      const margin = Math.abs(area(sheet.outline)) - Math.abs(area(sheet.domain));
      if (Math.abs(sheet.flaps.reduce((sum, f) => sum + Math.abs(area(f.poly)), 0) - margin) > 1e-6) wrong.push(`${where}: the pieces are not the whole margin`);
      // the only cuts: the four sides of the thickened domain, and each slit once on each of two opposite sides
      const sides = sheet.outline.map((p, k) => ({ a: p, b: sheet.outline[(k + 1) % 4] }));
      const isSide = (c: { a: V2; b: V2 }): boolean => sides.some((e) => Math.hypot(c.a[0] - e.a[0], c.a[1] - e.a[1]) + Math.hypot(c.b[0] - e.b[0], c.b[1] - e.b[1]) < 1e-9);
      const others = sheet.cuts.filter((c) => !isSide(c));
      if (sheet.cuts.length - others.length !== 4 || others.length !== 2 * sheet.slits) wrong.push(`${where}: ${sheet.cuts.length} cuts for ${sheet.slits} slits`);
      // a cut has no direction: its end on a side of the domain, and its other end
      const foot = (c: { a: V2; b: V2 }, side: number): [V2, V2] | null => (Math.abs(beyond(sheet, side, c.a)) < 1e-6 ? [c.a, c.b] : Math.abs(beyond(sheet, side, c.b)) < 1e-6 ? [c.b, c.a] : null);
      for (const c of others) {
        // a slit runs square from a side of the domain to the outer edge, and keeps off the corners, where four layers lie
        const k = [0, 1, 2, 3].find((side) => { const ends = foot(c, side); return ends !== null && Math.abs(beyond(sheet, side, ends[1]) - sheet.thickness) < 1e-6; });
        if (k === undefined) { wrong.push(`${where}: a slit does not run from a side to the outer edge`); continue; }
        const [on, out] = foot(c, k)!;
        const L = len({ a: sheet.domain[k], b: sheet.domain[(k + 1) % 4] }), x = along(sheet, k, on);
        if (Math.abs(along(sheet, k, out) - x) > 1e-6) wrong.push(`${where}: a slit is not square to side ${k}`);
        if (x < sheet.thickness || x > L - sheet.thickness) wrong.push(`${where}: a slit ${x} mm from a corner on side ${k}`);
        // and it has its partner on the opposite side, at the same point
        if (!others.some((d) => { const ends = foot(d, (k + 2) % 4); return ends !== null && Math.abs(along(sheet, (k + 2) % 4, ends[0]) - (L - x)) < 1e-6; })) wrong.push(`${where}: a slit of side ${k} has no partner`);
      }
      // the domain's sides are all there, uncut, and the creases run on into the margin
      if (sheet.guides.length !== 4) wrong.push(`${where}: ${sheet.guides.length} sides of the domain drawn`);
      if (width(sheet) >= 60 && !sheet.creases.some((c) => [0, 1, 2, 3].some((k) => beyond(sheet, k, c.a) > 1 || beyond(sheet, k, c.b) > 1))) wrong.push(`${where}: no crease in the margin`);

      // the four layers where the corners of the domain meet: P, Q, R, S are the sheet with its corner 0, 1, 2, 3 there
      const ends = (k: number): [boolean, boolean] => {
        const pieces = sheet.flaps.filter((f) => f.side === k).sort((f, g) => stretch(sheet, k, f.poly)[0] - stretch(sheet, k, g.poly)[0]);
        return [!pieces[0].under, !pieces[pieces.length - 1].under];
      };
      const corner = (k: number): boolean => sheet.flaps.find((f) => f.tile === `corner:${k}`)!.under;
      const [PoverS, QoverR] = ends(0), [QoverP, RoverS] = ends(1);
      const fits = [0, 1, 2, 3].some((P) => [0, 1, 2, 3].some((Q) => [0, 1, 2, 3].some((R) => [0, 1, 2, 3].some((S) => new Set([P, Q, R, S]).size === 4
        && (P > S) === PoverS && (Q > R) === QoverR && (Q > P) === QoverP && (R > S) === RoverS && (P < R) === corner(0) && (Q < S) === corner(1)))));
      if (!fits) wrong.push(`${where}: the marks at the corner fit no order of the four layers`);
    });
    expect(wrong).toEqual([]);
    expect(sheets).toBeGreaterThan(200);
    expect(slits).toBeGreaterThan(1000);
  });

  it('rounded slits take exactly their two corners off the pieces next to them, and nothing else changes', () => {
    let mouths = 0;
    for (const t of tori) {
      const T = byId('v8-' + t.type), model = domainModel(T, paperFromRow(T, t.row).positions);
      for (const o of origins) for (const gap of [0, 0.5]) {
        const square = layoutDomain(model, o, { gap }), round = layoutDomain(model, o, { gap, rounded: true }), where = `${t.name}, origin ${o}, gap ${gap}`;
        expect(round.flaps.length, where).toBe(square.flaps.length);
        expect(round.slits, where).toBe(square.slits);
        const lost = square.flaps.reduce((sum, f) => sum + Math.abs(area(f.poly)), 0) - round.flaps.reduce((sum, f) => sum + Math.abs(area(f.poly)), 0);
        // every slit is cut on two opposite sides, and each mouth has two corners
        const count = lost / (2 * corner(Math.min(SLIT_ROUND, round.thickness / 3)));
        expect(Math.abs(count - Math.round(count)), where).toBeLessThan(1e-6);
        if (gap === 0) expect(Math.round(count), where).toBe(2 * round.slits); else expect(Math.round(count), where).toBeLessThanOrEqual(2 * round.slits);
        mouths += Math.round(count);
        // no cut leaves the thickened domain
        for (const c of round.cuts) for (const p of [c.a, c.b]) for (let k = 0; k < 4; k++) expect(beyond(round, k, p), where).toBeLessThanOrEqual(round.thickness + 1e-6);
      }
    }
    expect(mouths).toBeGreaterThan(1500);
  });

  it('with a gap every piece of the margin lies in one face, clear of every crease', () => {
    let wide = 0;
    const wrong: string[] = [];
    everySheet((sheet, where, onVertex) => {
      if (!(sheet.gap > 0)) return;
      // Two kinds of sheet may lack flaps, and both say so in `bare`. A needle of a torus (modulus 26 i
      // among the data) has a domain 9 mm wide, crossed by a crease every few millimetres. And with its
      // corner on a vertex a side may run beside a chain of creases (on the square torus about 1 mm
      // beside one), where the faces it cuts are slivers. A wide domain in a generic place has flaps on
      // all four sides.
      if (width(sheet) >= 60 && !onVertex) { wide++; if (sheet.flaps.length <= 8 || sheet.bare.length) wrong.push(`${where}: ${sheet.flaps.length} flap pieces, bare ${sheet.bare}`); }
      if (!sheet.flaps.length && sheet.bare.join() !== '0,1') wrong.push(`${where}: no flaps, but bare is ${sheet.bare}`);
      for (const f of sheet.flaps) {
        const glued = moved(f.poly, f.glue);
        for (const c of sheet.creases) {
          if (segToPoly(c.a, c.b, glued) < sheet.gap - 1e-6) wrong.push(`${where}: a flap of side ${f.side} is closer than the gap to a crease`);
          if (throughInside(c.a, c.b, glued)) wrong.push(`${where}: a crease runs through a flap of side ${f.side}`);
        }
      }
    });
    expect(wrong).toEqual([]);
    expect(wide).toBeGreaterThan(100);
  });

  it('the margin lies outside the domain, and once joined inside it; its pieces never overlap on the sheet', () => {
    const wrong: string[] = [];
    everySheet((sheet, where) => {
      const flat = sheet.flaps.map((f) => ccw(f.poly)), glued = sheet.flaps.map((f) => ccw(moved(f.poly, f.glue)));
      sheet.flaps.forEach((f, i) => {
        if (areaInside(f.poly, sheet.domain) > 1e-6) wrong.push(`${where}: a piece of side ${f.side} reaches into the domain`);
        if (Math.abs(areaInside(glued[i], sheet.domain) - Math.abs(area(f.poly))) > 1e-6) wrong.push(`${where}: a piece of side ${f.side} is not inside the domain once joined`);
      });
      for (let i = 0; i < flat.length; i++) for (let j = i + 1; j < flat.length; j++) {
        if (areaInside(flat[i], flat[j]) > 1e-6) wrong.push(`${where}: pieces ${i}, ${j} overlap on the sheet`);
        const f = sheet.flaps[i], g = sheet.flaps[j];
        // joined, layers lie on each other only by design: pieces of one margin or one copy of a face stay apart, and so do different faces
        if ((f.face !== g.face || f.tile === g.tile) && areaInside(glued[i], glued[j]) > 1e-6) wrong.push(`${where}: pieces ${i}, ${j} overlap once joined`);
      }
    });
    expect(wrong).toEqual([]);
  });

  it('where two layers lie on each other, one is marked underneath and the other on top', () => {
    let alongSides = 0, atCorners = 0;
    const wrong: string[] = [];
    everySheet((sheet, where) => {
      for (const f of sheet.flaps) for (const g of sheet.flaps) {
        if (f.tile !== g.onto || f.onto !== g.tile || f.tile >= g.tile) continue;
        if (f.side >= 0 && g.side >= 0) {
          // along a pair of sides the two take turns at the slits: compare the pieces over the same stretch.
          // f hangs outside side f.side, and g, joined, lies inside against that same side.
          const [f0, f1] = stretch(sheet, f.side, f.poly), [g0, g1] = stretch(sheet, f.side, moved(g.poly, g.glue));
          if (!(Math.min(f1, g1) - Math.max(f0, g0) > 1)) continue;
          alongSides++;
        } else atCorners++;
        if (f.under === g.under) wrong.push(`${where}: ${f.tile} and ${g.tile} are both marked ${f.under ? 'underneath' : 'on top'}`);
      }
    });
    expect(wrong).toEqual([]);
    expect(alongSides).toBeGreaterThan(2000);
    expect(atCorners).toBeGreaterThan(400);
  });

  it('printing the other side mirrors the sheet and swaps mountain and valley', () => {
    for (const t of tori) {
      const T = byId('v8-' + t.type), pos = paperFromRow(T, t.row).positions;
      const out = domainModel(T, pos, 'outside'), inn = domainModel(T, pos, 'inside');
      expect(out.clockwise).toBe(!inn.clockwise);
      for (const [key, kind] of out.kinds) expect(inn.kinds.get(key)).not.toBe(kind);
      expect(out.a[0]).toBeCloseTo(inn.a[0], 9);
      expect(out.b[0]).toBeCloseTo(-inn.b[0], 9);
      expect(out.b[1]).toBeCloseTo(inn.b[1], 9);
    }
  });

  it('the PDF is one page of the sheet\'s size, and the margin is as deep as the net sheet\'s tabs', () => {
    const t = tori[0], T = byId('v8-' + t.type);
    const sheet = layoutDomain(domainModel(T, paperFromRow(T, t.row).positions), [0.5, 0.5]);
    expect(sheet.thickness).toBe(FLAP_W);
    const text = new TextDecoder().decode(domainPdf(sheet, { title: 'title', subtitle: 'subtitle' }));
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain(`/MediaBox [0 0 ${(sheet.W * 72 / 25.4).toFixed(3)} ${(sheet.H * 72 / 25.4).toFixed(3)}]`);
    expect(text).toContain('/Count 1');
  });
});
