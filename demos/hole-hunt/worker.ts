/**
 * The hole hunt, off the main thread — same shape as the fiber-cloud worker, but the score is
 * the SIGNED hole margin and the modulus pin is optional.
 */

import { byId } from '@core/triangulations';
import { fiberCloud, type FiberCloud, type CloudStrategy, type CloudObjective } from '@core/search/fiber-cloud.ts';
import { bestHoleView, holeAlong, volumeRatio } from '@core/search/shape.ts';
import { totalArea } from '@core/moduli/develop.ts';
import { measure } from '@core/search/measure.ts';
import type { Vec2 } from '@core/geometry/vec2.ts';

export interface StartMessage {
  kind: 'start';
  triangId: string;
  target: [number, number];
  seed: number[];
  strategy: CloudStrategy;
  /** What the walk ranks by. `'clearance'` hunts for pockets at whatever shape it is already
   *  in; `'inflation'` and `'nonplanar'` GROW the torus away from the plane, which is the way
   *  to run this from a near-flat seed. The hole detector is unaffected either way — it runs
   *  on its own clock and no walker reads it. */
  objective: CloudObjective;
  /** Reject anything thinner than this. Growth and clearance are antagonistic — an
   *  unconstrained inflation climb walks the torus right up against touching itself — so this
   *  is the counterweight. NOTE the seed is exempt: a floor above the seed's own clearance can
   *  leave the search with nothing that qualifies. */
  minClearance: number;
  holdModulus: boolean;
  /** Varied per launch, so restarting explores somewhere NEW rather than replaying the walk. */
  rngSeed: number;
}
export type InMessage = StartMessage | { kind: 'pause' | 'resume' | 'hall' };

/** A torus that actually has a hole, kept so the walk cannot lose it. */
export interface Find {
  /** WHICH TORUS this is a configuration of. Eight points mean nothing without the face list
   *  that joins them: the same 24 numbers read with another triangulation's faces are a
   *  different — and generally self-intersecting — surface. A find that travels without its
   *  triangulation cannot be drawn, scored, or archived safely. */
  triangId: string;
  positions: number[];
  size: number;
  clearance: number;
  tauHat: [number, number];
  direction: [number, number, number];
  atTrial: number;
}

export interface BestWire {
  positions: number[];
  /** radius of the visible hole; 0 when closed */
  hole: number;
  clearance: number;
  coneDeficit: number;
  tauHat: [number, number];
  /** the direction the margin was attained along — what the silhouette panel looks down */
  direction: [number, number, number];
}
export interface UpdateMessage {
  kind: 'update';
  /** the best hole found so far (frozen on the seed until one actually opens) */
  best: BestWire;
  /** where a roamer is RIGHT NOW — this is the thing that visibly moves */
  live: BestWire;
  /** every distinct holed torus kept so far, biggest first */
  finds: Find[];
  tries: number;
  accepted: number;
  /** How far the furthest roamer has got from the seed, in the chart. A search whose archive
   *  has stopped growing is either stuck or simply crossing closed ground — this is the
   *  number that tells you which. */
  spread: number;
  /** |enclosed volume| / area^{3/2} of the best member — 0 is planar, 0.094 is a sphere. The
   *  number to watch when the point of the run is to GROW away from the fold. */
  inflation: number;
  strategy: CloudStrategy;
  objective: CloudObjective;
  holdModulus: boolean;
}
export type OutMessage =
  | UpdateMessage
  | { kind: 'hall'; rows: number[][] }
  | { kind: 'find'; find: Find };

let cloud: FiberCloud | null = null;
let triangId = '';
let running = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastReport = 0;

/**
 * The archive of holed tori. The walk wanders off a hole as readily as it wanders onto one,
 * so a find has to be captured the moment it appears or it is gone. Kept DISTINCT: a new find
 * within `MIN_SEP` of one already held replaces it only if it is bigger, so the archive fills
 * with genuinely different tori instead of a thousand near-copies of one lucky step.
 */
const finds: Find[] = [];
const MAX_FINDS = 40;
const MIN_SEP = 0.05;

function chartDist(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

/** Returns true if this is a NEW keep (so the page can be told about it). */
function archive(f: Find): boolean {
  const near = finds.findIndex((g) => chartDist(g.positions, f.positions) < MIN_SEP);
  if (near >= 0) {
    if (f.size <= finds[near].size) return false;
    finds[near] = f;
  } else {
    finds.push(f);
  }
  finds.sort((a, b) => b.size - a.size);
  if (finds.length > MAX_FINDS) finds.length = MAX_FINDS;
  return true;
}

const BATCH_MS = 60;
const REPORT_MS = 200;

function report(): void {
  if (!cloud) return;
  const triang = byId(triangId);
  const wire = (positions: Float64Array, knownDir?: [number, number, number] | null): BestWire => {
    // reuse a known direction when we have one: a full scan here costs as much as ~80 steps
    const view = knownDir
      ? { size: holeAlong(triang, positions, knownDir, 96) / Math.sqrt(totalArea(triang, positions)), direction: knownDir }
      : bestHoleView(triang, positions);
    const m = measure(triang, positions);
    return {
      positions: Array.from(positions),
      hole: view.size,
      clearance: m.clearance,
      coneDeficit: m.coneDeficit,
      tauHat: [m.tauHat[0], m.tauHat[1]],
      direction: view.direction,
    };
  };
  const msg: UpdateMessage = {
    kind: 'update',
    best: wire(cloud.best.positions, lastDir[0] ?? null),
    live: wire(cloud.walkerPositions(0), lastDir[0] ?? null),
    finds: finds.slice(0, 12),
    tries: cloud.tries,
    accepted: cloud.accepted,
    spread: Math.max(...cloud.walkerDistances()),
    inflation: volumeRatio(triang, cloud.best.positions),
    strategy: cloud.strategy,
    objective: cloud.objective,
    holdModulus: cloud.holdModulus,
  };
  postMessage(msg);
}

/**
 * Per-walker hole watch. A full scan is ~120 rasterizations; re-checking the direction a
 * walker last saw a hole along is ONE. So each walker keeps its last good direction and is
 * re-checked cheaply every batch — which tracks a hole while the walk is still on it — and
 * gets a full scan only occasionally, to discover new ones.
 */
const lastDir: ([number, number, number] | null)[] = [];
let sweep = 0;
const FULL_SCAN_EVERY = 6;      // batches between full scans, per walker

function checkWalker(i: number, full: boolean): void {
  if (!cloud) return;
  const triang = byId(triangId);
  const p = cloud.walkerPositions(i);
  let size = 0;
  let dir = lastDir[i] ?? null;
  if (!full && dir) {
    const area = totalArea(triang, p);
    size = area > 0 ? holeAlong(triang, p, dir, 96) / Math.sqrt(area) : 0;
  }
  if (size <= 0) {
    if (!full) return;                       // cheap re-check failed; wait for the full sweep
    const view = bestHoleView(triang, p);
    size = view.size;
    dir = view.direction;
  }
  lastDir[i] = size > 0 ? dir : null;
  if (size <= 0) return;
  const r = measure(triang, p);
  const find: Find = {
    triangId, positions: Array.from(p), size, clearance: r.clearance,
    tauHat: [r.tauHat[0], r.tauHat[1]],
    direction: dir ?? [0, 0, 1], atTrial: cloud.tries,
  };
  // Report THIS find, not `finds[0]`. `archive` sorts by size, so the entry that was just
  // kept is rarely the first one — announcing the head of the list instead re-sent the
  // best-ever find on every keep, and the page, which appends what it is told, filled up
  // with sixty copies of one torus.
  if (archive(find)) postMessage({ kind: 'find', find } satisfies OutMessage);
}

function pump(): void {
  if (!running || !cloud) return;
  const until = performance.now() + BATCH_MS;
  while (performance.now() < until) cloud.step();

  // one full scan per batch (rotating through the walkers), plus a cheap re-check of each
  const n = cloud.walkers.length;
  const full = sweep % n;
  for (let i = 0; i < n; i++) checkWalker(i, i === full && sweep % FULL_SCAN_EVERY === 0);
  sweep++;

  const now = performance.now();
  if (now - lastReport > REPORT_MS) { report(); lastReport = now; }
  timer = setTimeout(pump, 0);
}

onmessage = (e: MessageEvent<InMessage>) => {
  const msg = e.data;
  switch (msg.kind) {
    case 'start': {
      triangId = msg.triangId;
      const triang = byId(triangId);
      const seed = Float64Array.from(msg.seed);
      cloud = fiberCloud(triang, msg.target as Vec2, seed, {
        // The score is deliberately CHEAP. Roamers are unselected — they never consult it —
        // and only the archive needs to know about holes, so scoring every trial with the
        // hole detector was paying ~24 ms a step to answer a question nobody asked. It made
        // the walk ~80× slower and it never left the seed's neighbourhood, which is why every
        // torus looked the same. Hole detection now happens on its own schedule, below.
        walkers: 6, hallSize: 20, trialsPerStep: 40,
        objective: msg.objective, strategy: msg.strategy, holdModulus: msg.holdModulus,
        minClearance: msg.minClearance,
        seed: msg.rngSeed,
      });
      finds.length = 0;
      lastDir.length = 0;
      sweep = 0;
      running = true;
      report();
      if (timer) clearTimeout(timer);
      pump();
      break;
    }
    case 'pause': running = false; if (timer) clearTimeout(timer); break;
    case 'resume': if (!running && cloud) { running = true; pump(); } break;
    case 'hall':
      // the archive of holed tori is the thing worth saving, not the whole hall
      postMessage({ kind: 'hall', rows: finds.map((f) => [...f.positions, f.size, f.clearance, f.tauHat[0], f.tauHat[1]]) } satisfies OutMessage);
      break;
  }
};
