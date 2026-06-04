/**
 * Reusable render controls for a Studio — drop into any render demo for a
 * consistent preview → path-trace → high-res-save flow:
 *
 *   Render… / R / P    open the resolution popup (preview only)
 *   1 2 4 / click       pick the multiplier (highlighted), Enter / "Render" starts the trace
 *   S / "Save PNG"      save the current frame, pixel-perfect at the chosen resolution
 *   Esc / "← Preview"   back to the WebGL preview (resets to 1×)
 *
 * Demo-specific keys (cycle style, step modulus, …) are passed via `keys` and are
 * active only in preview mode. `?auto=N` deep-links straight into an N× render.
 */

import type { Studio } from './studio';

export interface RenderControlsOptions {
  /** Saved-image filename. */
  filename?: string;
  /** Show the top-left HUD (status + spp). Default true. */
  hud?: boolean;
  /** Status text for the first HUD line (demo-specific; include any key hints here). */
  hudLine?: () => string;
  /** Extra key handlers, active in preview mode. Keyed by KeyboardEvent.key;
   *  single letters are matched case-insensitively. */
  keys?: Record<string, () => void>;
}

/**
 * A small fixed panel of labeled color pickers (bottom-left). Each item's
 * `onChange` fires live with the new `#rrggbb` hex as you drag.
 */
export function colorPanel(items: { label: string; value: string; onChange: (hex: string) => void }[]): void {
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;left:12px;bottom:12px;display:flex;flex-direction:column;gap:6px;font:12px ui-monospace,monospace;color:#cdd;background:rgba(0,0,0,.45);padding:8px 11px;border-radius:8px';
  for (const it of items) {
    const row = document.createElement('label');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;justify-content:space-between;cursor:pointer';
    const span = document.createElement('span');
    span.textContent = it.label;
    const input = document.createElement('input');
    input.type = 'color';
    input.value = it.value;
    input.style.cssText = 'width:30px;height:20px;border:none;background:none;padding:0;cursor:pointer';
    input.oninput = () => it.onChange(input.value);
    row.append(span, input);
    panel.appendChild(row);
  }
  document.body.appendChild(panel);
}

/** Parse an aspect-ratio string: "16:9" / "4:5" → w/h, or a plain number, else null. */
function parseAspect(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  if (t.includes(':')) {
    const [w, h] = t.split(':').map(Number);
    return w > 0 && h > 0 ? w / h : null;
  }
  const n = Number(t);
  return n > 0 ? n : null;
}

export function attachRenderControls(studio: Studio, opts: RenderControlsOptions = {}): void {
  const filename = opts.filename ?? 'render.png';

  const btn = (label: string, onClick: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'font:12px ui-monospace,monospace;color:#e8e8ec;background:#2a2a30;border:1px solid #555;border-radius:5px;padding:5px 10px;cursor:pointer';
    b.onclick = onClick;
    return b;
  };

  // ---- HUD (top-left, optional) ----
  const hud = opts.hud === false ? null : document.createElement('div');
  if (hud) {
    hud.style.cssText = 'position:fixed;top:10px;left:12px;font:12px ui-monospace,monospace;color:#cdd;background:rgba(0,0,0,.45);padding:5px 9px;border-radius:6px;white-space:pre;pointer-events:none';
    document.body.appendChild(hud);
  }
  // Minimal spp counter (when the full HUD is off) — shown only while rendering.
  const sppEl = hud ? null : document.createElement('div');
  if (sppEl) {
    sppEl.style.cssText = 'position:fixed;top:10px;left:12px;font:12px ui-monospace,monospace;color:#cdd;background:rgba(0,0,0,.45);padding:5px 9px;border-radius:6px;pointer-events:none;display:none';
    document.body.appendChild(sppEl);
  }

  // ---- toolbar (top-right): aspect box + render/save ----
  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;top:10px;right:12px;display:flex;gap:6px;align-items:stretch';
  const aspectBox = document.createElement('label');
  aspectBox.style.cssText = 'display:flex;align-items:center;gap:6px;font:12px ui-monospace,monospace;color:#cdd;background:#2a2a30;border:1px solid #555;border-radius:5px;padding:0 8px';
  const aspectInput = document.createElement('input');
  aspectInput.type = 'text';
  aspectInput.placeholder = 'w:h';
  aspectInput.value = studio.aspect ? String(+studio.aspect.toFixed(4)) : '';
  aspectInput.style.cssText = 'width:52px;background:none;border:none;color:#e8e8ec;font:12px ui-monospace,monospace;outline:none;padding:5px 0';
  aspectInput.onchange = () => studio.setAspect(parseAspect(aspectInput.value));
  aspectBox.append(document.createTextNode('aspect'), aspectInput);
  const renderBtn = btn('Render…', openModal);
  const saveBtn = btn('Save PNG', () => studio.screenshot(filename));
  const stopBtn = btn('← Preview', stopRender);
  bar.append(aspectBox, renderBtn, saveBtn, stopBtn);
  document.body.appendChild(bar);

  // ---- render popup (scale + bounces steppers) ----
  let chosenMult = 2;            // default 2×
  let chosenBounces = studio.bounces;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);z-index:50';
  const modal = document.createElement('div');
  modal.style.cssText = 'background:#1d1d22;border:1px solid #555;border-radius:10px;padding:18px 22px;color:#e8e8ec;font:13px/1.5 ui-monospace,monospace;text-align:center';
  modal.innerHTML = '<div style="font-size:15px;margin-bottom:12px">Render</div>';

  // a labeled −/value/+ stepper row
  const stepRow = (label: string, valEl: HTMLElement, onStep: (d: number) => void): HTMLDivElement => {
    const dec = btn('−', () => onStep(-1)); dec.style.padding = '2px 9px';
    const inc = btn('+', () => onStep(1));  inc.style.padding = '2px 9px';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:center;margin-bottom:8px;color:#9a9aa3;font-size:12px';
    row.append(document.createTextNode(label), dec, valEl, inc);
    return row;
  };

  // render scale — any integer factor (each pixel becomes scale² pixels)
  const sVal = document.createElement('span');
  sVal.style.cssText = 'min-width:30px;color:#e8e8ec;text-align:center';
  const dimsLine = document.createElement('div');
  dimsLine.style.cssText = 'color:#9a9aa3;font-size:11px;margin-bottom:14px';
  function setScale(n: number): void {
    chosenMult = Math.max(1, Math.round(n));
    sVal.textContent = `${chosenMult}×`;
    const d = studio.predictRenderSize(chosenMult);
    dimsLine.textContent = `${d.width} × ${d.height} px`;
  }

  const bVal = document.createElement('span');
  bVal.style.cssText = 'min-width:22px;color:#e8e8ec;text-align:center';
  function setBounces(n: number): void { chosenBounces = Math.max(1, Math.min(30, Math.round(n))); bVal.textContent = String(chosenBounces); }

  // autosave a PNG every N samples (0 = off)
  const asInput = document.createElement('input');
  asInput.type = 'number'; asInput.min = '0'; asInput.step = '100'; asInput.value = '0';
  asInput.style.cssText = 'width:64px;background:#2a2a30;border:1px solid #555;border-radius:5px;color:#e8e8ec;font:12px ui-monospace,monospace;text-align:center;padding:3px';
  const asRow = document.createElement('div');
  asRow.style.cssText = 'display:flex;gap:6px;align-items:center;justify-content:center;margin-bottom:16px;color:#9a9aa3;font-size:12px';
  asRow.append(document.createTextNode('autosave every'), asInput, document.createTextNode('spp (0=off)'));

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:4px';
  const goBtn = btn('Render', confirmRender);
  goBtn.style.background = '#3a6ea5';
  goBtn.style.borderColor = '#5f93cf';
  actions.append(goBtn, btn('Cancel', hideModal));

  modal.append(
    stepRow('scale', sVal, (d) => setScale(chosenMult + d)),
    dimsLine,
    stepRow('bounces', bVal, (d) => setBounces(chosenBounces + d)),
    asRow,
    actions,
  );
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  setScale(chosenMult);
  setBounces(chosenBounces);

  function openModal(): void { if (studio.isPathTracing()) return; setScale(chosenMult); overlay.style.display = 'flex'; }
  function hideModal(): void { overlay.style.display = 'none'; }
  function confirmRender(): void {
    hideModal();
    studio.setBounces(chosenBounces);
    studio.setAutosave(Number(asInput.value) || 0, filename);
    studio.setResolutionScale(chosenMult);
    studio.enablePathTracing();
    updateBar();
  }
  function stopRender(): void { studio.enableWebGL(); studio.setResolutionScale(1); chosenMult = 2; updateBar(); }
  function updateBar(): void {
    const tracing = studio.isPathTracing();
    renderBtn.style.display = tracing ? 'none' : '';
    saveBtn.style.display = tracing ? '' : 'none';
    stopBtn.style.display = tracing ? '' : 'none';
  }
  updateBar();

  const auto = Number(new URLSearchParams(location.search).get('auto'));
  if (auto >= 1) { setScale(auto); confirmRender(); }

  // ---- keys ----
  window.addEventListener('keydown', (e) => {
    if (overlay.style.display !== 'none') {                 // popup open
      if (e.key === 'Enter') confirmRender();
      else if (e.key === 'Escape') hideModal();
      return;
    }
    if (studio.isPathTracing()) {                            // tracing
      if (e.key === 's' || e.key === 'S') studio.screenshot(filename);
      else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') stopRender();
      return;
    }
    // preview
    if (e.key === 'r' || e.key === 'R' || e.key === 'p' || e.key === 'P') { openModal(); return; }
    const k = opts.keys;
    if (k) {
      const fn = k[e.key] ?? (e.key.length === 1 ? k[e.key.toLowerCase()] : undefined);
      if (fn) fn();
    }
  });

  // ---- HUD / spp loop ----
  const tick = (): void => {
    const tracing = studio.isPathTracing();
    if (hud) {
      const mode = tracing ? `path trace — ${Math.floor(studio.samples)} spp` : 'webgl preview';
      const hint = tracing ? 'S: save   Esc: preview' : 'R: render';
      const status = opts.hudLine ? opts.hudLine() + '\n' : '';
      hud.textContent = `${status}${mode}   (${hint})`;
    }
    if (sppEl) {
      sppEl.style.display = tracing ? '' : 'none';
      if (tracing) sppEl.textContent = `${Math.floor(studio.samples)} spp`;
    }
    requestAnimationFrame(tick);
  };
  tick();
}
