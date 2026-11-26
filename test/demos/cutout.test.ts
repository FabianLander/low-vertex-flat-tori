import { describe, it, expect } from 'vitest';
import { byId } from '@core/triangulations';
import { paperFromRow } from '@core/configuration/csv';
import {
  cutoutModel, initialArrangement, layoutSheet, mirrorSheet, flipTab, sheetSvg, inside, SLIT_PART,
  type Sheet, type Tab, type V2,
} from '../../demos/torus-moduli/cutout';
import { domainModel, layoutDomain, domainSvg, FACE_CLEAR } from '../../demos/torus-moduli/domainCutout';

/**
 * The net cutout of torus-moduli on the first and the last row of every committed data file: the SVG of its lines
 * (and of the domain sheet's), the slide-in tabs, and a tab cut back where it would end too near another one.
 */
const files = import.meta.glob('../../demos/torus-moduli/data/*.csv', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const tori = Object.keys(files).sort().flatMap((path) => {
  const f = path.match(/([^/]+\.csv)$/)![1], T = byId('v8-' + Number(f.match(/t(\d)/)![1]));
  const rows = files[path].split('\n').map((l) => l.trim()).filter((l) => l && !/^[a-zA-Z]/.test(l));
  return [...new Set([0, rows.length - 1])].map((r) => ({ name: `${f} row ${r}`, T, positions: paperFromRow(T, rows[r].split(',').map(Number)).positions }));
});
const dist = (p: V2, q: V2): number => Math.hypot(p[0] - q[0], p[1] - q[1]);
const mid = (l: { a: V2; b: V2 }): V2 => [(l.a[0] + l.b[0]) / 2, (l.a[1] + l.b[1]) / 2];

/** What an SVG of lines must be: svg, g and line elements, nothing between the tags, every line on the page. */
function expectLinesOnly(svg: string, W: number, H: number, groups: Record<string, number>): void {
  expect([...new Set([...svg.matchAll(/<([a-zA-Z]+)/g)].map((m) => m[1]))].sort()).toEqual(['g', 'line', 'svg'].filter((t) => t !== 'g' || Object.keys(groups).length));
  expect(svg.replace(/<[^>]*>/g, '').trim()).toBe('');
  expect(svg).not.toMatch(/fill="(?!none)|stroke-dasharray|<text|<title|<path|<polygon/);
  expect(svg).toContain(`viewBox="0 0 ${W} ${H}" fill="none" stroke="#000"`);
  const got = Object.fromEntries([...svg.matchAll(/<g id="([a-z]+)">\n((?:<line [^\n]*\n)*)<\/g>/g)].map((m) => [m[1], m[2].split('\n').length - 1]));
  expect(got).toEqual(groups);
  for (const m of svg.matchAll(/x[12]="([^"]+)"/g)) { expect(Number(m[1])).toBeGreaterThanOrEqual(0); expect(Number(m[1])).toBeLessThanOrEqual(W); }
  for (const m of svg.matchAll(/y[12]="([^"]+)"/g)) { expect(Number(m[1])).toBeGreaterThanOrEqual(0); expect(Number(m[1])).toBeLessThanOrEqual(H); }
}
const counted = (entries: [string, number][]): Record<string, number> => Object.fromEntries(entries.filter(([, n]) => n > 0));

describe('the lines of a cutout sheet as an SVG', () => {
  it('holds every line of the net sheet and nothing else, with glue tabs and slide-in tabs, mirrored or not', () => {
    for (const t of tori) {
      const model = cutoutModel(t.T, t.positions), arr = initialArrangement(model);
      for (const slits of [false, true]) for (const text of [false, true]) for (const mirror of [false, true]) {
        const laid = layoutSheet(model, arr, { text, slits }), sheet = mirror ? mirrorSheet(laid) : laid;
        const n = (kind: string): number => sheet.lines.filter((l) => l.kind === kind).length;
        expectLinesOnly(sheetSvg(sheet), sheet.W, sheet.H, counted([['cut', n('cut')], ['mountain', n('mountain')], ['valley', n('valley')]]));
      }
    }
  });
  it('holds the cuts, the folds and the guides of the domain sheet and nothing else', () => {
    for (const t of tori) for (const side of ['outside', 'inside'] as const) for (const options of [{}, { gap: FACE_CLEAR, rounded: true, text: false }]) {
      const sheet = layoutDomain(domainModel(t.T, t.positions, side), [0.37, 0.61], options);
      const n = (kind: string): number => sheet.creases.filter((l) => l.kind === kind).length;
      expectLinesOnly(domainSvg(sheet), sheet.W, sheet.H, counted([['cut', sheet.cuts.length], ['mountain', n('mountain')], ['valley', n('valley')], ['guide', sheet.guides.length]]));
    }
  });
});

describe('slide-in tabs', () => {
  /** Where a point of the tab lies once the tab is on the face across its seam (as `glued` in layoutSheet). */
  const joined = (sheet: Sheet, t: Tab) => {
    const cp = t.copy, m = cp.mateFace, T = sheet.tris[m], f = sheet.copies.find((c) => c.seam === t.seam && c.face === m)!;
    // the mate's own copy of the edge runs the other way: its B is this copy's A
    const qa = f.B, qb = f.A;
    expect(T.some((p) => dist(p, qa) < 1e-9) && T.some((p) => dist(p, qb) < 1e-9)).toBe(true);
    const rot = Math.atan2(qb[1] - qa[1], qb[0] - qa[0]) - Math.atan2(cp.B[1] - cp.A[1], cp.B[0] - cp.A[0]), c = Math.cos(rot), s = Math.sin(rot);
    return (p: V2): V2 => [qa[0] + c * (p[0] - cp.A[0]) - s * (p[1] - cp.A[1]), qa[1] + s * (p[0] - cp.A[0]) + c * (p[1] - cp.A[1])];
  };
  it('are the glue tabs, slit: every slit of a tab meets a slit of the face it lies on, end to end', () => {
    let slitsSeen = 0;
    for (const t of tori) {
      const model = cutoutModel(t.T, t.positions), arr = initialArrangement(model);
      const glue = layoutSheet(model, arr, { text: false }), sheet = layoutSheet(model, arr, { text: false, slits: true });
      expect(sheet.tabs.map((x) => [x.seam, x.face, x.poly])).toEqual(glue.tabs.map((x) => [x.seam, x.face, x.poly]));
      expect(sheet.creases).toEqual(glue.creases);
      const key = (l: { a: V2; b: V2; kind: string }): string => [l.a, l.b].map((p) => p.map((x) => x.toFixed(6)).join(',')).sort().join('|') + l.kind;
      const old = new Set(glue.lines.map(key)), fresh = sheet.lines.filter((l) => !old.has(key(l)));
      expect(fresh.every((l) => l.kind === 'cut')).toBe(true);
      for (const tab of sheet.tabs) {
        const L = dist(tab.P0, tab.P1), u: V2 = [(tab.P1[0] - tab.P0[0]) / L, (tab.P1[1] - tab.P0[1]) / L];
        const x = (p: V2): number => (p[0] - tab.P0[0]) * u[0] + (p[1] - tab.P0[1]) * u[1], d = (p: V2): number => (p[0] - tab.P0[0]) * u[1] - (p[1] - tab.P0[1]) * u[0];
        const want = L >= 15 ? [L / 3, 2 * L / 3] : L >= 10 ? [L / 2] : [];
        expect(tab.pieces).toHaveLength(want.length + 1);
        const onFace = joined(sheet, tab);
        for (const at of want) {
          // the tab's slit: the new cut square to the base at this place, in the tab. Where the far edge is slanted the
          // slit starts on that edge itself, so it is the middle of the cut that is asked to lie in the tab.
          const mine = fresh.filter((l) => Math.abs(x(l.a) - at) < 1e-6 && Math.abs(x(l.b) - at) < 1e-6 && inside(mid(l), tab.poly));
          expect(mine).toHaveLength(1);
          const inner = d(mine[0].a) < d(mine[0].b) ? mine[0].a : mine[0].b, far = Math.max(...tab.poly.filter((p) => Math.abs(x(p) - at) < L).map(d));
          expect(d(inner)).toBeGreaterThan(0);
          expect(d(inner)).toBeLessThanOrEqual((1 - SLIT_PART) * far + 1e-9);
          // the face's slit ends at the very point the tab's slit ends at once the two are joined
          const end = onFace(inner);
          const theirs = fresh.filter((l) => !mine.includes(l) && (dist(l.a, end) < 1e-6 || dist(l.b, end) < 1e-6));
          expect(theirs.length).toBeGreaterThanOrEqual(1);
          expect(theirs.every((l) => inside(mid(l), sheet.tris[tab.copy.mateFace]))).toBe(true);
          slitsSeen++;
        }
      }
    }
    expect(slitsSeen).toBeGreaterThan(50);
  });
});

describe('a tab that would end too near another tab', () => {
  it('is cut back at that end, not replaced by a tab of half the seam', () => {
    // embedded-t6.csv row 0, the tab of 0-4 moved to its other copy: the tab of 0-5 then ends beside it
    const t = tori.find((x) => x.name === 'embedded-t6.csv row 0')!;
    const model = cutoutModel(t.T, t.positions), sheet = layoutSheet(model, flipTab(model, initialArrangement(model), '0-4'));
    const tab = sheet.tabs.find((x) => x.seam === '0-5')!;
    expect(dist(tab.P0, tab.P1) / dist(tab.copy.A, tab.copy.B)).toBeGreaterThan(0.85);
    expect(sheet.tabs).toHaveLength(sheet.seams);
  });
});
