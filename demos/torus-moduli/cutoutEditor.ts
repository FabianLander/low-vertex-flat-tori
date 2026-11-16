/**
 * cutoutEditor — the step between the info panel's button and the PDF: the sheet is shown as it
 * will print, and the reader may rearrange it before opening the PDF.
 *
 *   click a triangle   it moves across its seam nearest the click onto the seam's other copy
 *                      (a translation by a period of the torus). It can move if the rest of the
 *                      sheet stays in one piece without it. The folds it hung on become seams and
 *                      the triangle carries their tabs: it takes over the tab it lands on, or
 *                      brings its own along (see `moveFace` in ./cutout.ts).
 *   click a tab        it moves to the other copy of its seam.
 *
 * Hovering shows where a triangle would go. Faces that overlap after a move are tinted red: the
 * sheet would not cut out in one piece. Undo, reset, and "open PDF" on top.
 *
 * Impure render boundary (DOM, canvas).
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import {
  cutoutModel, initialArrangement, layoutSheet, movable, seamsOf, moveFace, flipTab, sheetPdf, inside,
  CUT_C, MOUNTAIN_C, VALLEY_C, TAB_FC, LETTER_C, MOUNTAIN_DASH, VALLEY_DASH,
  type Arrangement, type Sheet, type CutoutInfo, type V2, type Copy,
} from './cutout';

const rgb = (c: readonly number[], a = 1): string => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;
const PT = 25.4 / 72;                                                   // millimetres per point

export function openCutoutEditor(triang: Triangulation, positions: ArrayLike<number>, info: CutoutInfo, openPdf: (bytes: Uint8Array) => void): void {
  const model = cutoutModel(triang, positions);
  const first = initialArrangement(model);
  let arr: Arrangement = first;
  let sheet: Sheet = layoutSheet(model, arr);
  const history: Arrangement[] = [];

  // ---- the overlay ----
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;z-index:50;background:rgba(244,243,238,0.98);display:flex;flex-direction:column;'
    + 'font:13px/1.45 ui-monospace,monospace;color:#101014';
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid rgba(0,0,0,0.1);background:#fff';
  const title = document.createElement('div');
  title.innerHTML = `<b>Arrange the cutout</b><br><span style="color:rgba(20,20,20,0.6);font-size:12px">${info.subtitle}</span>`;
  title.style.cssText = 'flex:1;min-width:220px';
  const button = (text: string, primary = false): HTMLButtonElement => {
    const b = document.createElement('button');
    b.textContent = text;
    b.style.cssText = 'padding:6px 12px;font:12px ui-monospace,monospace;cursor:pointer;border-radius:6px;'
      + (primary ? 'border:none;background:#166534;color:#fff' : 'border:1px solid #166534;background:#fff;color:#166534');
    return b;
  };
  const undoBtn = button('undo'), resetBtn = button('reset'), pdfBtn = button('open PDF ↗', true), closeBtn = button('close ✕');
  bar.append(title, undoBtn, resetBtn, pdfBtn, closeBtn);
  const hint = document.createElement('div');
  hint.style.cssText = 'padding:6px 14px;font-size:12px;color:rgba(20,20,20,0.7)';
  hint.textContent = 'Click a triangle on the outline: it moves across its seam nearest the click to the other copy of that seam, and carries the tabs of the folds it leaves (it can move if the rest of the sheet stays in one piece). '
    + 'Click a glue tab to move it to the other copy of its seam. Then open the PDF.';
  const status = document.createElement('div');
  status.style.cssText = 'padding:0 14px 6px;font-size:12px';
  const host = document.createElement('div');
  host.style.cssText = 'flex:1;min-height:0;position:relative';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none';
  host.append(canvas);
  root.append(bar, hint, status, host);
  document.body.append(root);

  // ---- page ↔ canvas ----
  let k = 1, px0 = 0, py0 = 0, dpr = 1;
  const toPx = (p: V2): V2 => [px0 + k * p[0], py0 + k * (sheet.H - p[1])];
  const toMm = (x: number, y: number): V2 => [(x - px0) / k, sheet.H - (y - py0) / k];

  let hover: { kind: 'face'; face: number; copy: Copy | null } | { kind: 'tab'; seam: string } | null = null;

  function draw(): void {
    const rect = host.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    k = Math.min((rect.width - 32) / sheet.W, (rect.height - 32) / sheet.H);
    px0 = (rect.width - k * sheet.W) / 2; py0 = (rect.height - k * sheet.H) / 2;
    // the page
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#fff'; ctx.fillRect(px0, py0, k * sheet.W, k * sheet.H);
    ctx.restore();
    const poly = (pts: readonly V2[]): void => {
      ctx.beginPath();
      pts.forEach((p, i) => { const q = toPx(p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
      ctx.closePath();
    };
    // faces: overlapping ones red, the hovered movable one marked
    const bad = new Set(sheet.overlaps.flat());
    sheet.tris.forEach((tri, f) => {
      if (bad.has(f)) { poly(tri); ctx.fillStyle = 'rgba(220,38,38,0.22)'; ctx.fill(); }
      if (hover?.kind === 'face' && hover.face === f) { poly(tri); ctx.fillStyle = 'rgba(250,204,21,0.30)'; ctx.fill(); }
    });
    // tabs
    for (const t of sheet.tabs) {
      poly(t.poly);
      ctx.fillStyle = hover?.kind === 'tab' && hover.seam === t.seam ? 'rgba(22,101,52,0.22)' : rgb(TAB_FC);
      ctx.fill();
    }
    // lines, in the PDF's styles
    const px = (pt: number): number => Math.max(0.6, pt * PT * k);
    for (const l of sheet.lines) {
      const a = toPx(l.a), b = toPx(l.b);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      ctx.lineCap = 'round';
      ctx.lineWidth = px(l.width);
      if (l.kind === 'cut') { ctx.strokeStyle = rgb(CUT_C); ctx.setLineDash([]); }
      else { ctx.strokeStyle = rgb(l.kind === 'mountain' ? MOUNTAIN_C : VALLEY_C); ctx.setLineDash((l.kind === 'mountain' ? MOUNTAIN_DASH : VALLEY_DASH).map((d) => d * PT * k)); }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // letters
    ctx.fillStyle = rgb(LETTER_C);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const l of sheet.letters) { const p = toPx(l.at); ctx.font = `${Math.max(8, l.size * k)}px Helvetica, Arial, sans-serif`; ctx.fillText(l.text, p[0], p[1]); }
    // the header of the page
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const head = (text: string, at: V2, size: number, color: string): void => { const p = toPx(at); ctx.font = `${Math.max(7, size * k)}px Helvetica, Arial, sans-serif`; ctx.fillStyle = color; ctx.fillText(text, p[0], p[1]); };
    head(info.title, [11, sheet.H - 15.5], 4.6, rgb(CUT_C));
    head(info.subtitle, [11, sheet.H - 21], 3.0, 'rgba(77,77,77,1)');
    // where the hovered triangle would go
    if (hover?.kind === 'face' && hover.copy) {
      const h = hover, cp = hover.copy;
      const other = sheet.copies.find((c) => c.seam === cp.seam && c.face !== h.face)!;
      const [u] = cp.edge;
      const from = cp.A, to = other.edge[0] === u ? other.A : other.B;
      const d: V2 = [to[0] - from[0], to[1] - from[1]];
      const ghost = sheet.tris[h.face].map((p) => [p[0] + d[0], p[1] + d[1]] as V2);
      poly(ghost);
      ctx.fillStyle = 'rgba(22,101,52,0.10)'; ctx.fill();
      ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4; ctx.strokeStyle = '#166534'; ctx.stroke(); ctx.setLineDash([]);
      // and the seam it goes across
      const a = toPx(cp.A), b = toPx(cp.B);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(22,101,52,0.55)'; ctx.stroke();
    }
    // the status line
    const parts = [`A4 ${sheet.page}`, `${sheet.scale.toFixed(1)} mm per unit`, `${sheet.seams} seams`, `${sheet.tabs.length} tabs`,
      `${sheet.creases.mountain} mountain and ${sheet.creases.valley} valley folds`, `the printed side ends up ${sheet.printedSide}`];
    const warn: string[] = [];
    if (sheet.overlaps.length) warn.push(`${sheet.overlaps.length === 1 ? 'two faces overlap' : `${sheet.overlaps.length} pairs of faces overlap`}: the sheet would not cut out in one piece`);
    if (sheet.missingTabs.length) warn.push(`no tab fits on ${sheet.missingTabs.length === 1 ? 'one seam' : `${sheet.missingTabs.length} seams`} (${sheet.missingTabs.map((s) => sheet.copies.find((c) => c.seam === s)?.letter ?? s).join(', ')})`);
    status.innerHTML = parts.join(' · ') + (warn.length ? `<br><span style="color:#b91c1c">${warn.join(' · ')}</span>` : '');
    undoBtn.disabled = history.length === 0;
    undoBtn.style.opacity = history.length ? '1' : '0.4';
  }

  // ---- what is under the pointer ----
  function pick(e: PointerEvent): typeof hover {
    const r = canvas.getBoundingClientRect();
    const at = toMm(e.clientX - r.left, e.clientY - r.top);
    const tab = sheet.tabs.find((t) => inside(at, t.poly));
    if (tab) return { kind: 'tab', seam: tab.seam };
    const face = sheet.tris.findIndex((tri) => inside(at, tri));
    if (face < 0 || !movable(sheet, face)) return null;
    return { kind: 'face', face, copy: seamsOf(sheet, face, at)[0] ?? null };
  }
  function apply(next: Arrangement): void {
    history.push(arr);
    arr = next;
    sheet = layoutSheet(model, arr);
    hover = null;
    draw();
  }
  canvas.addEventListener('pointermove', (e) => {
    const h = pick(e);
    const same = JSON.stringify(h) === JSON.stringify(hover);
    hover = h;
    canvas.style.cursor = h ? 'pointer' : 'default';
    if (!same) draw();
  });
  canvas.addEventListener('pointerleave', () => { hover = null; draw(); });
  canvas.addEventListener('click', (e) => {
    const h = pick(e as PointerEvent);
    if (!h) return;
    if (h.kind === 'tab') apply(flipTab(model, arr, h.seam));
    else if (h.copy) apply(moveFace(model, arr, sheet, h.face, h.copy));
  });
  undoBtn.onclick = () => { const prev = history.pop(); if (!prev) return; arr = prev; sheet = layoutSheet(model, arr); hover = null; draw(); };
  resetBtn.onclick = () => { if (arr === first) return; history.push(arr); arr = first; sheet = layoutSheet(model, arr); hover = null; draw(); };
  pdfBtn.onclick = () => openPdf(sheetPdf(sheet, info));
  // keys go to the editor while it is open, not to the moduli plot underneath (capture, first)
  const close = (): void => { window.removeEventListener('resize', draw); window.removeEventListener('keydown', onKey, true); root.remove(); };
  const onKey = (e: KeyboardEvent): void => {
    e.stopImmediatePropagation();
    if (e.key === 'Escape') close();
    else if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); undoBtn.click(); }
  };
  closeBtn.onclick = close;
  window.addEventListener('resize', draw);
  window.addEventListener('keydown', onKey, true);
  draw();
}
