/**
 * Studio — a small render harness with runtime-switchable backends:
 *
 *   • webgl       — fast interactive preview (default)
 *   • pathtracing — accumulating GPU path trace (three-gpu-pathtracer)
 *
 * One WebGLRenderer, one PhysicalCamera (so depth-of-field is available in PT and
 * the preview still renders it — PhysicalCamera extends PerspectiveCamera), one
 * scene the Studio owns. The whole webgl↔PT switch lives behind `render()`, which
 * dispatches on `mode`; the RAF loop never knows which backend is active.
 *
 * Accumulation reset is centralized into the few signals that matter:
 *   - camera move / resize  → handled automatically
 *   - environment changed   → auto-detected each frame
 *   - materials changed mid-trace → notifyMaterialsChanged()
 *   - geometry added/removed → notifySceneChanged()  (rebuilds the BVH)
 *
 * Deliberately NOT a framework: no UI, no lights, no floor. The stage is built
 * per-render by mutating `studio.scene`.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { WebGLPathTracer, PhysicalCamera } from 'three-gpu-pathtracer';

export type RenderMode = 'webgl' | 'pathtracing';

/** Trigger a browser download of a Blob. */
function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface StudioOptions {
  container?: HTMLElement;
  pixelRatio?: number;
  bounces?: number;
  /** Path-trace internal resolution scale. The path tracer renders the drawing
   *  buffer (which already includes pixelRatio), so at DPR 2 a scale of 1 means
   *  4× the rays. Defaults to 1/pixelRatio ⟹ trace at ~logical resolution. */
  pathTraceScale?: number;
  /** Initial backend. Default 'webgl'. */
  mode?: RenderMode;
  /** Called whenever the backend switches (e.g. to swap preview ↔ studio lights). */
  onModeChange?: (mode: RenderMode) => void;
  /** Letterbox the canvas to this width/height aspect ratio inside the window
   *  (e.g. 16/9, 1, 4/5) so it's framed precisely. Omit to fill the window. */
  aspect?: number;
}

export class Studio {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: PhysicalCamera;
  readonly controls: OrbitControls;

  private pathTracer?: WebGLPathTracer;
  private mode: RenderMode;
  private _bounces: number;
  private readonly pathTraceScale: number;
  private readonly basePixelRatio: number;
  /** High-res render multiplier (1 = screen). Drives the path tracer's offscreen
   *  target — NOT the on-screen canvas, which always stays at display size. */
  private _renderScale = 1;
  private _saveQuad?: FullScreenQuad;
  private _aspect?: number;
  private readonly onModeChange?: (mode: RenderMode) => void;

  // Auto-sync tracking (mirrors RenderManager).
  private lastEnvironment: THREE.Texture | null = null;
  private materialsDirty = false;

  // Autosave-every-N-spp.
  private _autosaveEvery = 0;
  private _autosaveNext = 0;
  private _autosaveName = 'render';

  private running = false;
  /** While a tiled export is in flight, the RAF loop's render() is a no-op so it
   *  doesn't fight the export's manual renderSample() calls. */
  private _exporting = false;

  constructor(opts: StudioOptions = {}) {
    const container = opts.container ?? document.body;
    this._bounces = opts.bounces ?? 5;
    this.mode = opts.mode ?? 'webgl';
    this.onModeChange = opts.onModeChange;

    const pixelRatio = opts.pixelRatio ?? Math.min(window.devicePixelRatio, 2);
    this.basePixelRatio = pixelRatio;
    this.pathTraceScale = opts.pathTraceScale ?? 1 / pixelRatio;
    this._aspect = opts.aspect;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);
    this.applyAspectStyle();

    this.scene = new THREE.Scene();

    this.camera = new PhysicalCamera(45, 1, 0.01, 100);
    this.camera.position.set(2.6, 1.8, 3.0);
    this.camera.fStop = 1e5;   // DOF off until the caller dials it in
    this.applySize();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.addEventListener('change', () => {
      if (this.mode === 'pathtracing') this.pathTracer?.updateCamera(); // resets accumulation
    });

    window.addEventListener('resize', this.onResize);
  }

  // ---- scene plumbing ----------------------------------------------------

  /** Add an object and (if tracing) rebuild the BVH. */
  add(obj: THREE.Object3D): void {
    this.scene.add(obj);
    this.notifySceneChanged();
  }

  /** Point the camera at an object: orbit its bounding-sphere center, back off to fit.
   *  `direction` (camera→ relative to target) sets the viewing angle, e.g.
   *  (0,0,1) for front-on; defaults to the current view direction. */
  frame(obj: THREE.Object3D, opts: { distance?: number; direction?: THREE.Vector3 } = {}): void {
    const box = new THREE.Box3().setFromObject(obj);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const r = sphere.radius || 1;
    const fov = (this.camera.fov * Math.PI) / 180;
    const dist = opts.distance ?? (r / Math.sin(fov / 2)) * 1.1;
    const dir = (opts.direction
      ? opts.direction.clone()
      : new THREE.Vector3().subVectors(this.camera.position, this.controls.target)
    ).normalize();
    this.controls.target.copy(sphere.center);
    this.camera.position.copy(sphere.center).addScaledVector(dir, dist);
    this.camera.updateProjectionMatrix();
    this.controls.update();
    if (this.mode === 'pathtracing') this.pathTracer?.updateCamera();
  }

  // ---- the loop + the one dispatch seam ----------------------------------

  start(): void {
    if (this.running) return;
    this.running = true;
    const loop = (): void => {
      if (!this.running) return;
      this.controls.update();
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop(): void { this.running = false; }

  render(): void {
    if (this._exporting) return;   // a tiled export is driving the path tracer manually
    if (this.mode === 'pathtracing' && this.pathTracer) {
      if (this.lastEnvironment !== this.scene.environment) {
        this.pathTracer.updateEnvironment();
        this.lastEnvironment = this.scene.environment;
        this.resetAccumulation();
      }
      if (this.materialsDirty) {
        this.pathTracer.updateMaterials();
        this.materialsDirty = false;
        this.resetAccumulation();
      }
      this.pathTracer.renderSample();
      if (this._autosaveEvery > 0 && this.pathTracer.samples >= this._autosaveNext) {
        const spp = Math.floor(this.pathTracer.samples);
        this._autosaveNext += this._autosaveEvery;
        this.screenshot(`${this._autosaveName}-${spp}spp.png`);
      }
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /** Samples accumulated by the path tracer (0 in preview). */
  get samples(): number {
    return this.mode === 'pathtracing' && this.pathTracer ? this.pathTracer.samples : 0;
  }

  /** Max light bounces (path-trace quality/GI). */
  get bounces(): number { return this._bounces; }
  setBounces(n: number): void {
    this._bounces = Math.max(1, Math.round(n));
    if (this.pathTracer) { this.pathTracer.bounces = this._bounces; this.resetAccumulation(); }
  }

  /** Letterbox aspect ratio (w/h), or undefined to fill the window. */
  get aspect(): number | undefined { return this._aspect; }
  setAspect(ratio: number | null): void {
    this._aspect = ratio && ratio > 0 ? ratio : undefined;
    this.applyAspectStyle();
    this.applySize();
    if (this.mode === 'pathtracing') this.pathTracer?.updateCamera();
  }

  /** Center + dark-surround the canvas when letterboxed; fill the window otherwise. */
  private applyAspectStyle(): void {
    const el = this.renderer.domElement;
    if (this._aspect) {
      el.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%)';
      document.body.style.background = '#1a1a1a';
    } else {
      el.style.cssText = '';
      document.body.style.background = '';
    }
  }

  /** Canvas size in CSS px: full window, or the largest `aspect` rect that fits. */
  private viewportSize(): { w: number; h: number } {
    const W = window.innerWidth, H = window.innerHeight;
    if (!this._aspect) return { w: W, h: H };
    let w = W, h = Math.round(W / this._aspect);
    if (h > H) { h = H; w = Math.round(H * this._aspect); }
    return { w, h };
  }

  /** Resize the renderer + camera to the current viewport (window or letterbox). */
  private applySize(): void {
    const { w, h } = this.viewportSize();
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Auto-tile the path trace: ~1 tile per ~1.2 MP of the *target* (which is
   *  renderScale× the drawing buffer), so a small render stays a single fast tile
   *  and a big one is split into enough pieces to keep each GPU draw short (no
   *  watchdog freeze). Same total work, just chunked when needed. */
  private applyTiles(): void {
    if (!this.pathTracer) return;
    const v = new THREE.Vector2();
    this.renderer.getDrawingBufferSize(v);
    const s = this.pathTracer.renderScale;
    const px = v.x * s * v.y * s;                  // target pixels
    const n = Math.max(1, Math.ceil(Math.sqrt(px / 1.2e6)));
    this.pathTracer.tiles.set(n, n);
  }

  /** Multiply the render + screenshot resolution: 1 = screen (device pixels),
   *  2 = 2× per axis (4× the pixels), etc.
   *
   *  Crucially this does NOT touch the on-screen canvas — it only scales the path
   *  tracer's offscreen accumulation target (an FBO, bounded by maxTextureSize,
   *  not by the much smaller browser/driver cap on a *canvas* drawing buffer).
   *  The canvas keeps displaying the full image, downscaled; `screenshot()` reads
   *  the full-resolution target back directly. This is what lets a 10000×5000
   *  render display normally in the browser and save at full size. Clamped to the
   *  GPU's texture-size and a total-pixel (memory) limit. */
  setResolutionScale(mult: number): void {
    const safe = this.clampMult(mult);
    if (safe < mult) {
      const s = this.predictRenderSize(mult);
      console.warn(`[studio] ${mult}× exceeds GPU limits; rendering at ${safe}× (${s.width}×${s.height}) instead.`);
    }
    this._renderScale = safe;
    if (this.pathTracer) {
      this.pathTracer.renderScale = this.pathTraceScale * safe;
      this.applyTiles();           // retile for the new target size
      this.pathTracer.reset();     // re-accumulate at the new resolution
    }
  }

  /** Largest safe integer multiplier: limited by the GPU's max texture size AND a
   *  total-pixel cap (the path tracer holds several float targets, so an over-large
   *  target exhausts memory). Measured against the *target* size (= drawing buffer
   *  × pathTraceScale × mult), since that's the FBO we actually allocate. */
  private clampMult(mult: number): number {
    const dimLimit = this.renderer.capabilities.maxTextureSize || 8192;
    const { w, h } = this.viewportSize();
    const unit = this.basePixelRatio * this.pathTraceScale;   // target px per CSS px at 1×
    const longest = Math.max(w, h) * unit;
    const byDim = Math.floor(dimLimit / longest);

    const MAX_PIXELS = 100e6; // ~100 MP cap — big exports while keeping the float targets within memory
    const baseArea = w * h * unit * unit;
    const byArea = Math.floor(Math.sqrt(MAX_PIXELS / baseArea));

    return Math.max(1, Math.min(mult, byDim, byArea));
  }

  /** Current saved-image size in pixels (the path-trace target while tracing). */
  renderSize(): { width: number; height: number } {
    if (this.mode === 'pathtracing' && this.pathTracer) {
      const t = this.pathTracer.target;
      return { width: t.width, height: t.height };
    }
    const v = new THREE.Vector2();
    this.renderer.getDrawingBufferSize(v);
    return { width: Math.round(v.x), height: Math.round(v.y) };
  }

  /** Predicted output size for a given multiplier (clamped to the GPU limit). */
  predictRenderSize(mult: number): { width: number; height: number } {
    const m = this.clampMult(mult);
    const { w, h } = this.viewportSize();
    const unit = this.basePixelRatio * this.pathTraceScale;
    return {
      width: Math.round(w * unit * m),
      height: Math.round(h * unit * m),
    };
  }

  /** Save the current frame as a PNG download. While path tracing this reads the
   *  full-resolution accumulation target back directly (so a high-`renderScale`
   *  export saves at its true size, independent of the on-screen canvas); in the
   *  preview it just grabs the canvas. */
  screenshot(filename = 'render.png'): void {
    if (this.mode === 'pathtracing' && this.pathTracer) {
      this.savePathTraceTarget(filename);
    } else {
      this.renderer.domElement.toBlob((blob) => blob && download(blob, filename), 'image/png');
    }
  }

  /** Tone-map the float accumulation target into an 8-bit sRGB target at full
   *  resolution, read the pixels back, and download them as a PNG. Avoids the
   *  browser's canvas-size cap entirely (FBO + 2D canvas, never a giant WebGL
   *  canvas). */
  private savePathTraceTarget(filename: string): void {
    const src = this.pathTracer!.target;
    const w = src.width, h = src.height;
    const buf = this.readbackSRGB(src.texture, w, h);   // bottom-up sRGB bytes

    // GL pixels are bottom-up; flip rows into a 2D canvas (no WebGL size cap here).
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(w, h);
    const row = w * 4;
    for (let y = 0; y < h; y++) img.data.set(buf.subarray((h - 1 - y) * row, (h - y) * row), y * row);
    ctx.putImageData(img, 0, 0);
    canvas.toBlob((blob) => blob && download(blob, filename), 'image/png');
  }

  /** Tone-map a float texture into 8-bit sRGB and read the pixels back (bottom-up,
   *  GL order), matching the on-screen image EXACTLY.
   *
   *  Subtlety: three.js disables tone mapping when rendering to a render target
   *  (WebGLRenderer only applies `renderer.toneMapping` when `_currentRenderTarget
   *  === null`, i.e. the canvas). Since we read back from an offscreen target, we
   *  must apply ACES OURSELVES — calling `ACESFilmicToneMapping` directly rather
   *  than the renderer's gated `toneMapping()` dispatcher — then encode to the
   *  target's sRGB colorspace via `linearToOutputTexel`. (A plain MeshBasicMaterial
   *  here would skip ACES and the saved image would look brighter / more saturated.) */
  private readbackSRGB(srcTexture: THREE.Texture, w: number, h: number): Uint8Array {
    const quad = (this._saveQuad ??= new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { map: { value: null }, toneMappingExposure: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: /* glsl */`
        uniform sampler2D map; varying vec2 vUv;
        #include <tonemapping_pars_fragment>
        void main() {
          gl_FragColor = linearToOutputTexel( vec4( ACESFilmicToneMapping( texture2D( map, vUv ).rgb ), 1.0 ) );
        }`,
    })));
    const mat = quad.material as THREE.ShaderMaterial;
    mat.uniforms.map.value = srcTexture;
    mat.uniforms.toneMappingExposure.value = this.renderer.toneMappingExposure;

    const out = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false, stencilBuffer: false });
    out.texture.colorSpace = THREE.SRGBColorSpace;
    const prevTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(out);
    quad.render(this.renderer);
    this.renderer.setRenderTarget(prevTarget);
    const buf = new Uint8Array(w * h * 4);
    this.renderer.readRenderTargetPixels(out, 0, 0, w, h, buf);
    out.dispose();
    return buf;
  }

  /** The UNCAPPED pixel size a multiplier would produce — what a tiled export
   *  yields. Unlike `predictRenderSize`, this is not clamped to the GPU's
   *  single-buffer limits, because the tiled exporter never allocates a full-size
   *  buffer. */
  exportSize(mult: number): { width: number; height: number } {
    const { w, h } = this.viewportSize();
    const unit = this.basePixelRatio * this.pathTraceScale;
    const m = Math.max(1, Math.round(mult));
    return { width: Math.round(w * unit * m), height: Math.round(h * unit * m) };
  }

  /**
   * Render an arbitrarily large image by tiling the camera and compositing on the
   * CPU, then download it as a PNG. The GPU only ever holds one tile-sized set of
   * buffers, so memory is flat regardless of the final dimensions — this is how we
   * go past the single-buffer ceiling that caps `setResolutionScale`.
   *
   * Each tile is a sub-rectangle selected with `camera.setViewOffset`, accumulated
   * to `spp` samples, read back tone-mapped, and blitted into one big 2D canvas.
   * The path tracer is driven manually here (the RAF loop is suspended), and the
   * call is async — it awaits a frame between samples so the page stays responsive
   * and `onProgress` can drive a UI.
   */
  async saveTiled(opts: {
    width: number; height: number; spp: number;
    tile?: number; filename?: string;
    onProgress?: (info: { tile: number; tiles: number; samples: number; spp: number }) => void;
  }): Promise<void> {
    const { width, height, spp } = opts;
    const filename = opts.filename ?? 'render.png';
    const cap = this.renderer.capabilities.maxTextureSize || 8192;
    const tile = Math.max(256, Math.min(opts.tile ?? 2048, cap));

    if (!this.pathTracer) this.enablePathTracing();
    const pt = this.pathTracer!;

    // ---- save state to restore afterward ----
    const prevSize = this.renderer.getSize(new THREE.Vector2());
    const prevPR = this.renderer.getPixelRatio();
    const prevScale = pt.renderScale;
    const prevTiles = pt.tiles.clone();
    const prevAspect = this.camera.aspect;
    const prevRenderToCanvas = pt.renderToCanvas;
    const wasTracing = this.mode === 'pathtracing';

    this._exporting = true;
    try {
      // ---- configure for fixed tile-size rendering ----
      this.mode = 'pathtracing';
      this.camera.aspect = width / height;
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(tile, tile, false);   // drawing buffer = tile; leave CSS size
      pt.renderScale = 1;
      pt.tiles.set(1, 1);
      pt.renderToCanvas = false;                   // we read the target directly; no on-screen blit
      pt.setScene(this.scene, this.camera);        // builds BVH + sizes targets to the tile (once)

      const big = document.createElement('canvas');
      big.width = width; big.height = height;
      const bctx = big.getContext('2d')!;
      const tmp = document.createElement('canvas');
      tmp.width = tile; tmp.height = tile;
      const tctx = tmp.getContext('2d')!;

      const cols = Math.ceil(width / tile), rows = Math.ceil(height / tile);
      const tiles = cols * rows;
      const row = tile * 4;

      for (let ry = 0; ry < rows; ry++) {
        for (let cx = 0; cx < cols; cx++) {
          const ox = cx * tile, oy = ry * tile;
          // aim the camera at this sub-rectangle of the full width×height image
          this.camera.setViewOffset(width, height, ox, oy, tile, tile);
          this.camera.updateProjectionMatrix();
          pt.updateCamera();
          pt.reset();
          while (pt.samples < spp) {
            pt.renderSample();
            if (Math.floor(pt.samples) % 8 === 0) {
              opts.onProgress?.({ tile: ry * cols + cx, tiles, samples: pt.samples, spp });
              await new Promise((r) => requestAnimationFrame(() => r(null)));
            }
          }
          // read the tile (bottom-up), flip into tmp (top-down), blit the in-bounds part
          const buf = this.readbackSRGB(pt.target.texture, tile, tile);
          const img = tctx.createImageData(tile, tile);
          for (let y = 0; y < tile; y++) img.data.set(buf.subarray((tile - 1 - y) * row, (tile - y) * row), y * row);
          tctx.putImageData(img, 0, 0);
          const cw = Math.min(tile, width - ox), ch = Math.min(tile, height - oy);
          bctx.drawImage(tmp, 0, 0, cw, ch, ox, oy, cw, ch);
          opts.onProgress?.({ tile: ry * cols + cx + 1, tiles, samples: pt.samples, spp });
          await new Promise((r) => requestAnimationFrame(() => r(null)));
        }
      }

      await new Promise<void>((res) => big.toBlob((b) => { if (b) download(b, filename); res(); }, 'image/png'));
    } finally {
      // ---- restore live state ----
      this.camera.clearViewOffset();
      this.camera.aspect = prevAspect;
      this.camera.updateProjectionMatrix();
      this.renderer.setPixelRatio(prevPR);
      this.renderer.setSize(prevSize.x, prevSize.y, true);
      pt.renderScale = prevScale;
      pt.tiles.copy(prevTiles);
      pt.renderToCanvas = prevRenderToCanvas;
      pt.setScene(this.scene, this.camera);
      this._exporting = false;
      if (!wasTracing) this.enableWebGL();
      this.resetAccumulation();
    }
  }

  // ---- mode switching ----------------------------------------------------

  enablePathTracing(): void {
    if (!this.pathTracer) {
      this.pathTracer = new WebGLPathTracer(this.renderer);
      this.pathTracer.bounces = this._bounces;
    }
    // renderScale targets an offscreen FBO: pathTraceScale is the base (e.g. 1/DPR
    // for a logical-res preview), times the high-res export multiplier.
    this.pathTracer.renderScale = this.pathTraceScale * this._renderScale;
    this.mode = 'pathtracing';
    this.pathTracer.setScene(this.scene, this.camera);     // builds the BVH
    this.applyTiles();
    this.pathTracer.updateMaterials();
    if (this.scene.environment) this.pathTracer.updateEnvironment();
    this.lastEnvironment = this.scene.environment;
    this.onModeChange?.('pathtracing');
  }

  enableWebGL(): void {
    this.mode = 'webgl';
    this.onModeChange?.('webgl');
  }

  toggleMode(): RenderMode {
    if (this.mode === 'pathtracing') this.enableWebGL();
    else this.enablePathTracing();
    return this.mode;
  }

  isPathTracing(): boolean { return this.mode === 'pathtracing'; }

  // ---- the reset / sync contract -----------------------------------------

  resetAccumulation(): void { this.pathTracer?.reset(); this._autosaveNext = this._autosaveEvery; }

  /** Auto-download a PNG every `everySpp` accumulated samples (0 = off). Filenames
   *  get the spp count, e.g. render-1000spp.png — handy for long renders. */
  setAutosave(everySpp: number, baseName = 'render'): void {
    this._autosaveEvery = Math.max(0, Math.floor(everySpp));
    this._autosaveName = baseName.replace(/\.png$/i, '');
    this._autosaveNext = this._autosaveEvery;
  }

  /** Materials changed while tracing — re-sync on the next frame. */
  notifyMaterialsChanged(): void { this.materialsDirty = true; }

  /** Geometry added/removed — rebuild the BVH (only matters while tracing). */
  notifySceneChanged(): void {
    if (this.mode === 'pathtracing' && this.pathTracer) {
      this.pathTracer.setScene(this.scene, this.camera);
      this.pathTracer.updateMaterials();
      if (this.scene.environment) this.pathTracer.updateEnvironment();
    }
  }

  private onResize = (): void => {
    this.applySize();
    if (this.mode === 'pathtracing') { this.pathTracer?.updateCamera(); this.applyTiles(); }
  };

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.controls.dispose();
    this._saveQuad?.dispose();
    this.pathTracer?.dispose();
    this.renderer.dispose();
  }
}
