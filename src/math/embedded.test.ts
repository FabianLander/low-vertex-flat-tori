import { describe, it, expect } from 'vitest';
import {
  isEmbedded, firstViolation, allViolations,
  DISJOINT_TRIANGLE_PAIRS, SHARED_VERTEX_TRIANGLE_PAIRS,
} from './embedded';
import { RICH_REFERENCE } from './reference';

describe('embeddedness', () => {
  it('pair classification matches the 24 / 72 / 24 split', () => {
    expect(DISJOINT_TRIANGLE_PAIRS.length).toBe(24);
    expect(SHARED_VERTEX_TRIANGLE_PAIRS.length).toBe(72);
  });

  it('Rich reference is embedded', () => {
    expect(isEmbedded(RICH_REFERENCE.positions)).toBe(true);
    expect(firstViolation(RICH_REFERENCE.positions)).toBeNull();
    expect(allViolations(RICH_REFERENCE.positions)).toHaveLength(0);
  });

  it('detects a genuine (non-coplanar) crossing', () => {
    // Pull vertex 0 (a "top" apex at z=+1) down through the body to z=−1; its
    // incident triangles then pierce the lower band — a real tri-tri crossing.
    // NB: squashing toward a *plane* would NOT trip this — embedded.ts treats
    // coplanar pairs as non-intersecting by design (the documented v1 limit).
    const p = Float64Array.from(RICH_REFERENCE.positions);
    p[2] = -1;
    expect(isEmbedded(p)).toBe(false);
    expect(firstViolation(p)).not.toBeNull();
  });

  it('firstViolation and allViolations agree on embeddedness', () => {
    const p = Float64Array.from(RICH_REFERENCE.positions);
    p[2] = -1;
    expect(firstViolation(p) !== null).toBe(allViolations(p).length > 0);
  });
});
