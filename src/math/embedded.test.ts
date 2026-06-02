import { describe, it, expect } from 'vitest';
import { isEmbedded, firstViolation, allViolations } from './embedded';
import { RICH_REFERENCE } from './reference';
import { RICH } from '../tori';

describe('embeddedness', () => {
  it('pair classification matches the 24 / 72 split for Rich', () => {
    expect(RICH.disjointTrianglePairs.length).toBe(24);
    expect(RICH.sharedVertexTrianglePairs.length).toBe(72);
  });

  it('Rich reference is embedded', () => {
    expect(isEmbedded(RICH, RICH_REFERENCE.positions)).toBe(true);
    expect(firstViolation(RICH, RICH_REFERENCE.positions)).toBeNull();
    expect(allViolations(RICH, RICH_REFERENCE.positions)).toHaveLength(0);
  });

  it('detects a genuine (non-coplanar) crossing', () => {
    // Pull vertex 0 (a "top" apex at z=+1) down through the body to z=−1; its
    // incident triangles then pierce the lower band — a real tri-tri crossing.
    // NB: squashing toward a *plane* would NOT trip this — embedded.ts treats
    // coplanar pairs as non-intersecting by design (the documented v1 limit).
    const p = Float64Array.from(RICH_REFERENCE.positions);
    p[2] = -1;
    expect(isEmbedded(RICH, p)).toBe(false);
    expect(firstViolation(RICH, p)).not.toBeNull();
  });

  it('firstViolation and allViolations agree on embeddedness', () => {
    const p = Float64Array.from(RICH_REFERENCE.positions);
    p[2] = -1;
    expect(firstViolation(RICH, p) !== null).toBe(allViolations(RICH, p).length > 0);
  });
});
