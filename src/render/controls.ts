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
  /** Resolution multipliers offered in the popup. Default [1, 2, 4]. */
  multipliers?: number[];
  /** Status text for the first HUD line (demo-specific; include any key hints here). */
  hudLine?: () => string;
  /** Extra key handlers, active in preview mode. Keyed by KeyboardEvent.key;
   *  single letters are matched case-insensitively. */
  keys?: Record<string, () => void>;
}

export function attachRenderControls(studio: Studio, opts: RenderControlsOptions = {}): void {
  const filename = opts.filename ?? 'render.png';
  const multipliers = opts.multipliers ?? [1, 2, 4];

  const btn = (label: string, onClick: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'font:12px ui-monospace,monospace;color:#e8e8ec;background:#2a2a30;border:1px solid #555;border-radius:5px;padding:5px 10px;cursor:pointer';
    b.onclick = onClick;
    return b;
  };

  // ---- HUD (top-left) ----
  const hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;top:10px;left:12px;font:12px ui-monospace,monospace;color:#cdd;background:rgba(0,0,0,.45);padding:5px 9px;border-radius:6px;white-space:pre;pointer-events:none';
  document.body.appendChild(hud);

  // ---- toolbar (top-right) ----
  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;top:10px;right:12px;display:flex;gap:6px';
  const renderBtn = btn('Render…', openModal);
  const saveBtn = btn('Save PNG', () => studio.screenshot(filename));
  const stopBtn = btn('← Preview', stopRender);
  bar.append(renderBtn, saveBtn, stopBtn);
  document.body.appendChild(bar);

  // ---- resolution popup ----
  let chosenMult = 1;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);z-index:50';
  const modal = document.createElement('div');
  modal.style.cssText = 'background:#1d1d22;border:1px solid #555;border-radius:10px;padding:18px 22px;color:#e8e8ec;font:13px/1.5 ui-monospace,monospace;text-align:center';
  modal.innerHTML = '<div style="font-size:15px;margin-bottom:2px">Render</div><div style="color:#9a9aa3;font-size:11px;margin-bottom:14px">resolution</div>';
  const resRow = document.createElement('div');
  resRow.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-bottom:12px';
  const resBtns = multipliers.map((m) => {
    const b = btn(`${m}×`, () => selectMult(m));
    b.style.minWidth = '46px';
    resRow.appendChild(b);
    return { m, b };
  });
  const dimsLine = document.createElement('div');
  dimsLine.style.cssText = 'color:#9a9aa3;font-size:11px;margin-bottom:16px';
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:8px;justify-content:center';
  const goBtn = btn('Render', confirmRender);
  goBtn.style.background = '#3a6ea5';
  goBtn.style.borderColor = '#5f93cf';
  actions.append(goBtn, btn('Cancel', hideModal));
  modal.append(resRow, dimsLine, actions);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  function selectMult(m: number): void {
    chosenMult = m;
    for (const { m: bm, b } of resBtns) {
      const on = bm === m;
      b.style.background = on ? '#3a6ea5' : '#2a2a30';
      b.style.borderColor = on ? '#5f93cf' : '#555';
    }
    const s = studio.predictRenderSize(m);
    dimsLine.textContent = `${s.width} × ${s.height} px`;
  }
  function openModal(): void { if (studio.isPathTracing()) return; selectMult(chosenMult); overlay.style.display = 'flex'; }
  function hideModal(): void { overlay.style.display = 'none'; }
  function confirmRender(): void { hideModal(); studio.setResolutionScale(chosenMult); studio.enablePathTracing(); updateBar(); }
  function stopRender(): void { studio.enableWebGL(); studio.setResolutionScale(1); chosenMult = 1; updateBar(); }
  function updateBar(): void {
    const tracing = studio.isPathTracing();
    renderBtn.style.display = tracing ? 'none' : '';
    saveBtn.style.display = tracing ? '' : 'none';
    stopBtn.style.display = tracing ? '' : 'none';
  }
  updateBar();

  const auto = Number(new URLSearchParams(location.search).get('auto'));
  if (auto >= 1) { selectMult(auto); confirmRender(); }

  // ---- keys ----
  window.addEventListener('keydown', (e) => {
    if (overlay.style.display !== 'none') {                 // popup open
      if (e.key === 'Enter') confirmRender();
      else if (e.key === 'Escape') hideModal();
      else if (multipliers.includes(Number(e.key))) selectMult(Number(e.key));
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

  // ---- HUD loop ----
  function tick(): void {
    const mode = studio.isPathTracing() ? `path trace — ${Math.floor(studio.samples)} spp` : 'webgl preview';
    const hint = studio.isPathTracing() ? 'S: save   Esc: preview' : 'R: render';
    const status = opts.hudLine ? opts.hudLine() + '\n' : '';
    hud.textContent = `${status}${mode}   (${hint})`;
    requestAnimationFrame(tick);
  }
  tick();
}
