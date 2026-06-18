/**
 * embedded — the embeddedness condition, in one place: the gate (the topological
 * truth), the margin (the geometric diagnostic + the shared cell-gap primitive),
 * the energies (overlap + near-miss potentials `flow` descends), and the `Region`
 * that bundles gate + margin. The torus-blind intersection kernels are in
 * `geometry/triangleIntersect`.
 */

export { embedded } from './region.ts';
export {
  isEmbedded, firstViolation, allViolations, violationFaceScalars,
  type EmbeddingViolation,
} from './gate.ts';
export {
  minMargin, linearSize, forEachCellGap,
  type MarginReport, type GapType,
} from './margin.ts';
export {
  makeChordLengthSquared, makeCutOffArea, makeCellMargin, makeCellBarrier,
  type CellMarginOptions, type CellBarrierOptions,
} from './energies.ts';
export {
  cellTables,
  type CellTables, type CellPairs, type SharedVertexPair,
} from './cells.ts';
