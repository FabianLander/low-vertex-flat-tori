/**
 * The fiber search, off the main thread.
 *
 * The search is pure (`src/core/` — no DOM, no three.js), which is exactly what makes this
 * possible: the worker owns a `fiberCloud` and runs it flat out, while the page keeps a
 * smooth frame rate and just draws whatever the latest best shape is. On the main thread the
 * two competed — a batch of trials costs tens of milliseconds, so the search was throttled to
 * whatever was left of a frame. Here it runs continuously, which is what a search you leave
 * open for an hour actually needs.
 *
 * Protocol — main → worker:
 *   {kind:'start', triangId, target, seed, objective, strategy, minClearance}
 *   {kind:'pause'} · {kind:'resume'} · {kind:'reset'}
 *   {kind:'hall'}                      request the full hall (for saving)
 * worker → main:
 *   {kind:'update', best, tries, accepted, hallSize, roamed, seedScore, top}
 *   {kind:'hall', rows}                every hall member, best first
 */

import { byId } from '@core/triangulations';
import { fiberCloud, type FiberCloud, type CloudObjective, type CloudStrategy } from '@core/search/fiber-cloud.ts';
import { creaseRoom, bestHoleView, holeAlong, volumeRatio, squash } from '@core/search/shape.ts';
import { measure } from '@core/search/measure.ts';
import { totalArea } from '@core/moduli/develop.ts';
import type { Vec2 } from '@core/geometry/vec2.ts';

export interface StartMessage {
  kind: 'start';
  triangId: string;
  target: [number, number];
  seed: number[];
  objective: CloudObjective;
  strategy: CloudStrategy;
  minClearance: number;
}
export type InMessage =
  | StartMessage
  | { kind: 'pause' | 'resume' | 'reset' | 'hall' | 'holes' }
  /** Scan one configuration for a visible hole. The page asks for this while browsing the
   *  hall, where it has no direction to look down; a full scan is ~200 rasterizations and
   *  belongs off the main thread. */
  | { kind: 'scan'; positions: number[] };

export interface MemberWire {
  positions: number[];
  score: number;
  clearance: number;
  volumeRatio: number;
  squash: number;
  creaseDegrees: number;
}

/** A torus the walk passed through that you can SEE THROUGH, kept so the walk cannot lose it. */
export interface HoleFind extends MemberWire {
  /** WHICH torus these coordinates belong to. Eight points mean nothing without the face list
   *  that joins them — the same 24 numbers under another triangulation are a different, and
   *  generally self-intersecting, surface. */
  triangId: string;
  /** Radius of the visible hole, normalized by √area. */
  hole: number;
  /** The direction it is visible along — what a silhouette panel looks down. */
  direction: [number, number, number];
  atTrial: number;
}
export interface UpdateMessage {
  kind: 'update';
  best: MemberWire;
  /** the top of the hall, so the page can browse without asking */
  top: MemberWire[];
  tries: number;
  accepted: number;
  hallSize: number;
  roamed: number;
  seedScore: number;
  seedMeetsFloor: boolean;
  strategy: CloudStrategy;
  /** The champion's hole, rescanned whenever the champion changes. size 0 ⟺ closed. */
  bestHole: { size: number; direction: [number, number, number] };
  /** Distinct holed tori found so far, biggest first (the top few — `holes` gets them all). */
  holes: HoleFind[];
  holeCount: number;
}
export type OutMessage =
  | UpdateMessage
  | { kind: 'hall'; rows: MemberWire[] }
  | { kind: 'holes'; rows: HoleFind[] }
  | { kind: 'scanned'; hole: number; direction: [number, number, number] };

let cloud: FiberCloud | null = null;
let triangId = '';
let seedPositions: Float64Array | null = null;
let running = false;
let timer: ReturnType<typeof setTimeout> | null = null;

const BATCH_MS = 40;       // work for this long, then yield so messages get handled
const REPORT_MS = 120;     // how often the page hears about it
let lastReport = 0;

/**
 * THE HOLE CLOCK, running beside the walk.
 *
 * A visible hole is what makes one of these tori worth looking at, and the fiber walk passes
 * through tori that have one without any idea that it did — so something has to watch. It
 * cannot be the objective. `holeSize` is exactly 0 on every closed torus, so there is nothing
 * to climb, and it costs ~25 ms against the ~0.3 ms of a trial: scoring every trial with it
 * slowed the walk ~80× to compute a number the search never reads. (Signed relaxations that
 * would supply a gradient were tried and every one was gamed the same way — near-planar tori
 * let a rod slide past EDGE-ON, which scores beautifully and is not a hole.)
 *
 * So the walk keeps its cheap objective and the detector runs on its own schedule. A full scan
 * is ~200 rasterizations; re-checking the direction a walker last saw a hole along is ONE. Each
 * walker keeps its last good direction and is re-checked cheaply every batch — which TRACKS a
 * hole while the walk is still on it — and gets a full scan only every so often, to find new
 * ones. Holes are seen EDGE-ON here (measured: 85–89° from the flattest axis, every time), and
 * `bestHoleView` aims a dense band at that equator; sampling directions uniformly finds almost
 * nothing.
 */
const lastDir: ([number, number, number] | null)[] = [];
let sweep = 0;
const FULL_SCAN_EVERY = 6;         // batches between full scans, per walker
const MAX_FINDS = 40;
const MIN_SEP = 0.05;              // finds closer than this in the chart are the same torus
const finds: HoleFind[] = [];
let bestHole = { size: 0, direction: [0, 0, 1] as [number, number, number] };
let bestHoleScore = NaN;           // which champion `bestHole` was measured on

function chartDist(a: number[], b: number[]): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += (a[i] - b[i]) ** 2;
  return Math.sqrt(d);
}

/**
 * Keep a find only if it is a NEW torus. The walk leaves a hole as readily as it finds one, so
 * a find has to be captured the moment it appears; without the dedup the archive fills with a
 * thousand near-copies of one lucky step and the genuinely different ones fall off the end.
 */
function archive(f: HoleFind): boolean {
  const near = finds.findIndex((g) => chartDist(g.positions, f.positions) < MIN_SEP);
  if (near >= 0) {
    if (f.hole <= finds[near].hole) return false;
    finds[near] = f;
  } else finds.push(f);
  finds.sort((a, b) => b.hole - a.hole);
  if (finds.length > MAX_FINDS) finds.length = MAX_FINDS;
  return true;
}

/** Scan one configuration for its best visible hole. ~200 rasterizations — not cheap. */
function scan(positions: ArrayLike<number>): { size: number; direction: [number, number, number] } {
  const view = bestHoleView(byId(triangId), positions);
  return { size: view.size, direction: view.direction };
}

function watchWalker(i: number, full: boolean): void {
  if (!cloud) return;
  const triang = byId(triangId);
  const p = cloud.walkerPositions(i);
  const area = totalArea(triang, p);
  if (!(area > 0)) return;
  let size = 0;
  let dir = lastDir[i] ?? null;
  if (!full && dir) size = holeAlong(triang, p, dir, 96) / Math.sqrt(area);
  if (size <= 0) {
    if (!full) return;                       // cheap re-check failed; wait for the full sweep
    const v = scan(p);
    size = v.size; dir = v.direction;
  }
  lastDir[i] = size > 0 ? dir : null;
  if (size <= 0) return;
  // Measure the find properly. A walker's current position is generally NOT a hall member, so
  // there is nothing to look its metrics up from — and a find saved with zeros for clearance
  // and inflation is worse than useless, since the row still reads back as a torus.
  const r = measure(triang, p);
  archive({
    ...wire({
      positions: Float64Array.from(p),
      score: 0,                                   // the objective does not rank these
      clearance: r.clearance,
      volumeRatio: volumeRatio(triang, p),
      squash: squash(p),
    }),
    triangId, hole: size, direction: dir ?? [0, 0, 1], atTrial: cloud.tries,
  });
}

function wire(m: { positions: Float64Array; score: number; clearance: number; volumeRatio: number; squash: number }): MemberWire {
  const triang = byId(triangId);
  return {
    positions: Array.from(m.positions),
    score: m.score,
    clearance: m.clearance,
    volumeRatio: m.volumeRatio,
    squash: m.squash,
    creaseDegrees: (creaseRoom(triang, m.positions) * 180) / Math.PI,
  };
}

function report(): void {
  if (!cloud) return;
  // Rescan the champion only when it CHANGES — a full scan costs as much as ~80 trials, and
  // once a climb settles the champion can stand for minutes.
  if (cloud.best.score !== bestHoleScore) {
    bestHole = scan(cloud.best.positions);
    bestHoleScore = cloud.best.score;
  }
  const msg: UpdateMessage = {
    kind: 'update',
    best: wire(cloud.best),
    top: cloud.hall.slice(0, 24).map(wire),
    tries: cloud.tries,
    accepted: cloud.accepted,
    hallSize: cloud.hall.length,
    roamed: cloud.strategy === 'roam' ? Math.max(...cloud.walkerDistances()) : 0,
    seedScore: cloud.seedScore,
    seedMeetsFloor: cloud.seedMeetsFloor,
    strategy: cloud.strategy,
    bestHole,
    holes: finds.slice(0, 12),
    holeCount: finds.length,
  };
  postMessage(msg);
}

function pump(): void {
  if (!running || !cloud) return;
  const until = performance.now() + BATCH_MS;
  while (performance.now() < until) cloud.step();

  // one full scan per batch (rotating through the walkers), plus a cheap re-check of each
  const n = cloud.walkers.length;
  for (let i = 0; i < n; i++) watchWalker(i, i === sweep % n && sweep % FULL_SCAN_EVERY === 0);
  sweep++;

  const now = performance.now();
  if (now - lastReport > REPORT_MS) { report(); lastReport = now; }
  timer = setTimeout(pump, 0);      // yield to the message queue
}

onmessage = (e: MessageEvent<InMessage>) => {
  const msg = e.data;
  switch (msg.kind) {
    case 'start': {
      triangId = msg.triangId;
      seedPositions = Float64Array.from(msg.seed);
      cloud = fiberCloud(byId(triangId), msg.target as Vec2, seedPositions, {
        walkers: 12, hallSize: 200, trialsPerStep: 120,
        objective: msg.objective, strategy: msg.strategy, minClearance: msg.minClearance,
      });
      finds.length = 0;
      lastDir.length = 0;
      sweep = 0;
      bestHoleScore = NaN;
      running = true;
      report();
      if (timer) clearTimeout(timer);
      pump();
      break;
    }
    case 'pause': running = false; if (timer) clearTimeout(timer); break;
    case 'resume': if (!running && cloud) { running = true; pump(); } break;
    case 'reset':
      if (cloud && seedPositions) { cloud.reset(seedPositions); report(); }
      break;
    case 'hall':
      if (cloud) postMessage({ kind: 'hall', rows: cloud.hall.map(wire) } satisfies OutMessage);
      break;
    case 'holes':
      postMessage({ kind: 'holes', rows: finds } satisfies OutMessage);
      break;
    case 'scan': {
      const v = scan(Float64Array.from(msg.positions));
      postMessage({ kind: 'scanned', hole: v.size, direction: v.direction } satisfies OutMessage);
      break;
    }
  }
};
