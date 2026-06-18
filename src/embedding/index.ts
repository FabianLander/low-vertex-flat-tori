/**
 * embedding — the open condition Ω you stay inside, in one place:
 *   embedded.ts    the gate (`isEmbedded`, the topological truth + violations) and its
 *                  continuous companion `clearance` (Rich's condition, made continuous)
 *   separation.ts  `minSeparation` — true min distance between any two non-adjacent
 *                  cells (the geometric diagnostic) + the cell-gap substrate the energies use
 *   energies.ts    the forces: overlap (drive onto Ω) + fatten (push deeper in)
 *   cells.ts       the substrate: which non-adjacent cell pairs to test
 * The torus-blind intersection/distance kernels are in `geometry/`.
 */

export {
  isEmbedded, firstViolation, allViolations, violationFaceScalars, clearance,
  type EmbeddingViolation,
} from './embedded.ts';
export {
  minSeparation, minCellGap, linearSize, forEachCellGap,
  type SeparationReport, type GapType,
} from './separation.ts';
export {
  makeChordLengthSquared, makeCutOffArea, makeCellMargin, makeCellBarrier,
  type CellMarginOptions, type CellBarrierOptions,
} from './energies.ts';
export {
  cellTables,
  type CellTables, type CellPairs, type SharedVertexPair,
} from './cells.ts';
