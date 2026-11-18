/**
 * domainEditor — the step between the info panel's "domain" button and the PDF: just enough of
 * the tiling of the plane by the torus's faces, and the fundamental domain floating over it.
 * The reader drags the domain to where it should be cut from. The sheet is the domain thickened
 * by a margin, drawn as it will print: the creases, the margin with its slits
 * (`./domainCutout.ts`).
 *
 *   drag the domain    it moves over the tiling. Its corner stays within one period of the
 *                      tiling, which loses nothing: a period further the picture repeats.
 *   arrow keys         move it by 1 mm of the page, with shift by 0.2 mm.
 *   scroll, drag       scrolling zooms the view about the pointer, dragging the tiling pans it.
 *                      "centre" puts the domain and the view back.
 *   printed side       outside (as on the print sheets) or inside: the tiling is mirrored and
 *                      mountain and valley swap.
 *   slits              the mouths of the slits rounded (the default) or square.
 *   gap                how far the margin stays from the creases: at 0 (the default) the domain
 *                      is thickened and nothing more, up to the 1.2 mm of the print sheets, where
 *                      every cut face keeps its own piece of the margin.
 *
 * Impure render boundary (DOM, canvas).
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import { inside, CUT_C, MOUNTAIN_C, VALLEY_C, CREASE_LW, MOUNTAIN_DASH, VALLEY_DASH, CUT_LW, type CutoutInfo, type V2 } from './cutout';
import {
  domainModel, tilingPatch, layoutDomain, domainPdf, latticeCoords, FACE_CLEAR, UNDER_FC, GUIDE_C, GUIDE_LW, GUIDE_DASH,
  type DomainModel, type DomainSheet, type Patch,
} from './domainCutout';

const rgb = (c: readonly number[], a = 1): string => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;
const PT = 25.4 / 72;                                                   // millimetres per point

export function openDomainEditor(triang: Triangulation, positions: ArrayLike<number>, info: CutoutInfo, openPdf: (bytes: Uint8Array) => void): void {
  let side: 'outside' | 'inside' = 'outside';
  let model: DomainModel = domainModel(triang, positions, side);
  let gap = 0;                                                          // mm between the margin and the creases
  let rounded = true;                                                   // the mouths of the slits
  let origin: V2 = [0.5, 0.5];
  let sheet: DomainSheet = layoutDomain(model, origin, { gap, rounded });
  let patch: Patch = tilingPatch(model, sheet.thickness / sheet.scale);

  // ---- the overlay ----
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;z-index:50;background:rgba(244,243,238,0.98);display:flex;flex-direction:column;'
    + 'font:13px/1.45 ui-monospace,monospace;color:#101014';
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid rgba(0,0,0,0.1);background:#fff';
  const title = document.createElement('div');
  title.innerHTML = `<b>Place the fundamental domain</b><br><span style="color:rgba(20,20,20,0.6);font-size:12px">${info.subtitle}</span>`;
  title.style.cssText = 'flex:1;min-width:220px';
  const button = (text: string, primary = false): HTMLButtonElement => {
    const b = document.createElement('button');
    b.textContent = text;
    b.style.cssText = 'padding:6px 12px;font:12px ui-monospace,monospace;cursor:pointer;border-radius:6px;'
      + (primary ? 'border:none;background:#166534;color:#fff' : 'border:1px solid #166534;background:#fff;color:#166534');
    return b;
  };
  const sideBtn = button(''), slitBtn = button(''), centreBtn = button('centre'), pdfBtn = button('open PDF ↗', true), closeBtn = button('close ✕');
  sideBtn.title = 'which side of the torus the printed side ends up on';
  slitBtn.title = 'the mouths of the slits: rounded, so that the pieces find their way in, or square';
  const slider = (hover: string, max: number, step: number, value: number, width: number): { box: HTMLLabelElement; text: HTMLSpanElement; input: HTMLInputElement } => {
    const box = document.createElement('label');
    box.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;color:#166534';
    box.title = hover;
    const text = document.createElement('span');
    text.style.cssText = `min-width:${width}px;text-align:right`;
    const input = document.createElement('input');
    input.type = 'range'; input.min = '0'; input.max = String(max); input.step = String(step); input.value = String(value);
    input.style.cssText = 'width:120px;accent-color:#166534';
    box.append(text, input);
    return { box, text, input };
  };
  // the gap between the margin and the creases: 0 = the domain thickened and nothing more, up to the gap of the print sheets
  const gapS = slider('how far the margin stays from the creases: at 0 the domain is simply thickened, the creases run on into the margin', FACE_CLEAR, 0.05, gap, 200);
  bar.append(title, gapS.box, slitBtn, sideBtn, centreBtn, pdfBtn, closeBtn);
  const hint = document.createElement('div');
  hint.style.cssText = 'padding:6px 14px;font-size:12px;color:rgba(20,20,20,0.7)';
  hint.textContent = 'Drag the domain over the tiling (arrow keys move it by 1 mm of the page, with shift by 0.2 mm). What is inside it is the sheet. '
    + 'The sheet is the domain with a margin around it, in which the tiling carries on. The margin is slit, so that opposite sides slide into each other: grey pieces end up underneath, white ones on top. '
    + 'The slider keeps the margin off the creases. Scroll to zoom, drag the tiling to pan. Then open the PDF.';
  const status = document.createElement('div');
  status.style.cssText = 'padding:0 14px 6px;font-size:12px';
  const host = document.createElement('div');
  host.style.cssText = 'flex:1;min-height:0;position:relative';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:default';
  host.append(canvas);
  root.append(bar, hint, status, host);
  document.body.append(root);

  // ---- the model's plane (y up) ↔ canvas: k pixels per unit, (cx, cy) in the middle of the canvas ----
  let k = 1, cx = 0, cy = 0, cw = 1, ch = 1;
  let fitted = true;                                                    // until the reader zooms or pans, the view shows the patch
  const fitK = (): number => Math.min((cw - 40) / (patch.bounds[2] - patch.bounds[0]), (ch - 40) / (patch.bounds[3] - patch.bounds[1]));
  const toPx = (p: V2): V2 => [cw / 2 + k * (p[0] - cx), ch / 2 - k * (p[1] - cy)];
  const toMm = (x: number, y: number): V2 => [cx + (x - cw / 2) / k, cy - (y - ch / 2) / k];

  let hover = false, drag: { at: V2; origin: V2 } | null = null, pan: { x: number; y: number } | null = null;

  function draw(): void {
    const rect = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    cw = rect.width; ch = rect.height;
    if (fitted) { k = fitK(); cx = (patch.bounds[0] + patch.bounds[2]) / 2; cy = (patch.bounds[1] + patch.bounds[3]) / 2; }
    const path = (pts: readonly V2[], place: (p: V2) => V2 = toPx): void => {
      ctx.beginPath();
      pts.forEach((p, i) => { const q = place(p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
      ctx.closePath();
    };
    const mm = k / sheet.scale;                                         // canvas pixels per millimetre of the page
    const px = (pt: number): number => Math.max(0.6, pt * PT * mm);
    const stroke = (a: V2, b: V2, place: (p: V2) => V2): void => {
      const p = place(a), q = place(b);
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    };
    const fold = (kind: 'mountain' | 'valley', alpha: number, width: number): void => {
      ctx.strokeStyle = rgb(kind === 'mountain' ? MOUNTAIN_C : VALLEY_C, alpha);
      ctx.lineWidth = width;
      ctx.setLineDash((kind === 'mountain' ? MOUNTAIN_DASH : VALLEY_DASH).map((d) => d * PT * mm));
    };
    ctx.lineCap = 'round';

    // ---- the tiling, as far as the domain can go: paper, with its creases lighter than on the sheet ----
    ctx.save();
    path(patch.block); ctx.clip();
    ctx.fillStyle = '#fbfaf6';
    for (const tri of patch.faces) { path(tri); ctx.fill(); }
    for (const l of patch.creases) { fold(l.kind, 0.5, Math.max(1, px(CREASE_LW) * 0.8)); stroke(l.a, l.b, toPx); }
    ctx.setLineDash([]);
    ctx.restore();

    // ---- the sheet, floating over it ----
    const place = (p: V2): V2 => toPx(sheet.toModel(p));
    // one shadow for the whole sheet: the domain and its flaps as one shape
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.28)'; ctx.shadowBlur = drag ? 22 : 14; ctx.shadowOffsetY = drag ? 6 : 3;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    for (const poly of [sheet.domain, ...sheet.flaps.map((f) => f.poly)]) {
      poly.forEach((p, i) => { const q = place(p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
      ctx.closePath();
    }
    ctx.fill('nonzero');
    ctx.restore();
    for (const f of sheet.flaps) {
      path(f.poly, place);
      ctx.fillStyle = ctx.strokeStyle = f.under ? rgb(UNDER_FC) : '#fff';
      ctx.fill(); ctx.lineWidth = 1; ctx.stroke();                        // the stroke closes the hairline between two pieces of one triangle
    }
    for (const l of sheet.creases) { fold(l.kind, 1, px(CREASE_LW)); stroke(l.a, l.b, place); }
    ctx.strokeStyle = rgb(GUIDE_C); ctx.lineWidth = px(GUIDE_LW); ctx.setLineDash(GUIDE_DASH.map((d) => Math.max(d * PT * mm, d * 1.5)));
    for (const g of sheet.guides) stroke(g.a, g.b, place);
    ctx.setLineDash([]);
    ctx.strokeStyle = rgb(CUT_C); ctx.lineWidth = px(CUT_LW);
    for (const l of sheet.cuts) stroke(l.a, l.b, place);
    // the domain itself, the thing the reader moves: always outlined, stronger under the pointer
    path(sheet.domain, place);
    ctx.lineWidth = hover || drag ? 2.5 : 1.5; ctx.strokeStyle = hover || drag ? 'rgba(22,101,52,0.85)' : 'rgba(22,101,52,0.6)'; ctx.stroke();

    // ---- the status line ----
    const A = Math.hypot(sheet.domain[1][0] - sheet.domain[0][0], sheet.domain[1][1] - sheet.domain[0][1]);
    const B = Math.hypot(sheet.domain[3][0] - sheet.domain[0][0], sheet.domain[3][1] - sheet.domain[0][1]);
    const angle = Math.atan2(model.b[1], model.b[0]) * 180 / Math.PI;
    const parts = [`A4 ${sheet.page}`, `${sheet.scale.toFixed(1)} mm per unit`, `sides ${A.toFixed(1)} mm and ${B.toFixed(1)} mm at ${angle.toFixed(1)}°`,
      `a margin of ${sheet.thickness.toFixed(0)} mm, ${sheet.slits} slits`, `${sheet.folds.mountain} mountain and ${sheet.folds.valley} valley folds`,
      `the printed side ends up ${sheet.printedSide}`];
    const warn = sheet.bare.map((e) => `no flap fits on the two sides ${e === 0 ? `of ${A.toFixed(0)} mm` : `of ${B.toFixed(0)} mm`}: they run along a crease or too close to it`);
    status.innerHTML = parts.join(' · ') + (warn.length ? `<br><span style="color:#b91c1c">${warn.join(' · ')}</span>` : '');
    sideBtn.textContent = `printed side: ${side}`;
    slitBtn.textContent = `slits: ${rounded ? 'rounded' : 'square'}`;
    gapS.text.textContent = sheet.gap > 0 ? `margin ${sheet.gap.toFixed(2)} mm off the creases` : 'the domain, thickened';
  }

  function moveTo(next: V2): void {
    origin = [Math.min(1, Math.max(0, next[0])), Math.min(1, Math.max(0, next[1]))];
    sheet = layoutDomain(model, origin, { gap, rounded });
    draw();
  }

  // ---- the pointer ----
  const at = (e: PointerEvent): V2 => { const r = canvas.getBoundingClientRect(); return toMm(e.clientX - r.left, e.clientY - r.top); };
  const overSheet = (p: V2): boolean => {
    const q = sheet.toPage(p);
    return inside(q, sheet.domain) || sheet.flaps.some((f) => inside(q, f.poly));
  };
  canvas.addEventListener('pointerdown', (e) => {
    const p = at(e);
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
    // on the sheet: move the domain. On the tiling: move the view.
    if (overSheet(p)) drag = { at: p, origin }; else pan = { x: e.clientX, y: e.clientY };
    draw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pan) {
      cx -= (e.clientX - pan.x) / k; cy += (e.clientY - pan.y) / k;
      pan = { x: e.clientX, y: e.clientY };
      fitted = false;
      draw();
      return;
    }
    const p = at(e);
    if (drag) {
      const d = latticeCoords(model, [p[0] - drag.at[0], p[1] - drag.at[1]]);
      moveTo([drag.origin[0] + d[0], drag.origin[1] + d[1]]);
      return;
    }
    const over = overSheet(p);
    canvas.style.cursor = over ? 'grab' : 'default';
    if (over !== hover) { hover = over; draw(); }
  });
  const drop = (e: PointerEvent): void => {
    if (!drag && !pan) return;
    drag = null; pan = null;
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    hover = overSheet(at(e));
    canvas.style.cursor = hover ? 'grab' : 'default';
    draw();
  };
  canvas.addEventListener('pointerup', drop);
  canvas.addEventListener('pointercancel', drop);
  canvas.addEventListener('pointerleave', () => { if (!drag && hover) { hover = false; draw(); } });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const under = toMm(x, y);
    k = Math.min(12 * fitK(), Math.max(0.4 * fitK(), k * Math.exp(-e.deltaY * 0.0015)));
    // the point under the pointer stays under it
    cx = under[0] - (x - cw / 2) / k; cy = under[1] + (y - ch / 2) / k;
    fitted = false;
    draw();
  }, { passive: false });

  // ---- the buttons and the keys ----
  sideBtn.onclick = () => {
    side = side === 'outside' ? 'inside' : 'outside';
    model = domainModel(triang, positions, side);
    patch = tilingPatch(model, sheet.thickness / sheet.scale);
    moveTo(origin);
  };
  centreBtn.onclick = () => { fitted = true; moveTo([0.5, 0.5]); };
  gapS.input.oninput = () => { gap = Number(gapS.input.value); moveTo(origin); };
  slitBtn.onclick = () => { rounded = !rounded; moveTo(origin); };
  pdfBtn.onclick = () => openPdf(domainPdf(sheet, info));
  // keys go to the editor while it is open, not to the moduli plot underneath (capture, first)
  const close = (): void => { window.removeEventListener('resize', draw); window.removeEventListener('keydown', onKey, true); root.remove(); };
  const onKey = (e: KeyboardEvent): void => {
    e.stopImmediatePropagation();
    const step = e.shiftKey ? 0.2 : 1;
    const dir: V2 | null = e.key === 'ArrowLeft' ? [-1, 0] : e.key === 'ArrowRight' ? [1, 0] : e.key === 'ArrowUp' ? [0, 1] : e.key === 'ArrowDown' ? [0, -1] : null;
    if (e.key === 'Escape') close();
    else if (dir) { e.preventDefault(); const d = latticeCoords(model, [dir[0] * step / sheet.scale, dir[1] * step / sheet.scale]); moveTo([origin[0] + d[0], origin[1] + d[1]]); }
  };
  closeBtn.onclick = close;
  window.addEventListener('resize', draw);
  window.addEventListener('keydown', onKey, true);
  draw();
}
