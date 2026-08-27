/**
 * obj — the torus as an explicit polygon mesh on disk: a sibling of the in-memory
 * three.js realization, in Wavefront OBJ. Two faces of the same object:
 *   • `paperToObj` — the FOLDED polyhedron (the F flat triangles of the realization
 *     in ℝ³), the mathematical object droppable into Blender / a slicer;
 *   • `netToObj` — the UNFOLDED developed net (the same F triangles laid flat in the
 *     z=0 plane by `developNet`, exactly what `viewer/developedSheet` draws), the
 *     papercraft layout you print, cut, and fold back into the torus.
 *
 * Both are PURE (positions + triangulation → text, no three.js, no DOM) and carry the
 * full float64 precision of the positions (JS shortest-round-trip number formatting).
 * `downloadObj` / `downloadNetObj` are the thin DOM caps that trigger the browser save.
 */

import { makePaperTorus, type PaperTorus } from '@core/configuration/paperTorus.ts';
import type { Triangulation } from '@core/topology/triangulation.ts';
import { developNet } from '@core/moduli/develop.ts';

/** The folded realization as Wavefront OBJ text: `v x y z` per vertex, `f a b c` per triangle. */
export function paperToObj(paper: PaperTorus, name = 'flat-torus'): string {
  const p = paper.positions;
  const lines: string[] = [`# ${name} — ${paper.triang.name} (V=${paper.triang.vertexCount}, F=${paper.triang.triangles.length})`, `o ${name}`];
  for (let v = 0; v < paper.triang.vertexCount; v++) {
    lines.push(`v ${p[3 * v]} ${p[3 * v + 1]} ${p[3 * v + 2]}`);
  }
  for (const [a, b, c] of paper.triang.triangles) {
    lines.push(`f ${a + 1} ${b + 1} ${c + 1}`);   // OBJ vertices are 1-indexed
  }
  return lines.join('\n') + '\n';
}

/**
 * The UNFOLDED developed net as Wavefront OBJ text: the flat torus laid out in the
 * z=0 plane by `developNet` (root v0 at the origin, v0→v1 along +x, every triangle
 * CCW). Emitted NON-INDEXED — each triangle contributes its own three developed
 * corners — so the cut edges are genuinely separated and the tree (glue) edges are
 * coincident, matching the on-screen `developedSheet` exactly. 3·F vertices, F faces.
 */
export function netToObj(paper: PaperTorus, name = 'flat-torus-net'): string {
  const F = paper.triang.triangles.length;
  const net = developNet(paper.triang, paper.positions);
  const lines: string[] = [`# ${name} — developed net of ${paper.triang.name} (V=${paper.triang.vertexCount}, F=${F}), flat in z=0`, `o ${name}`];
  for (let t = 0; t < F; t++) {
    for (let k = 0; k < 3; k++) {
      const [x, y] = net.corners[t][k];
      lines.push(`v ${x} ${y} 0`);
    }
  }
  for (let t = 0; t < F; t++) {
    const i = 3 * t + 1;                            // OBJ vertices are 1-indexed
    lines.push(`f ${i} ${i + 1} ${i + 2}`);
  }
  return lines.join('\n') + '\n';
}

/** Trigger a browser download of `text` as `filename` (forcing a `.obj` extension). */
function triggerObjDownload(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.obj') ? filename : `${filename}.obj`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Download the folded polyhedron as a `.obj` file (DOM cap). */
export function downloadObj(paper: PaperTorus, filename = 'flat-torus.obj'): void {
  triggerObjDownload(paperToObj(paper, filename.replace(/\.obj$/i, '')), filename);
}

/** Download the unfolded developed net as a `.obj` file (DOM cap). */
export function downloadNetObj(paper: PaperTorus, filename = 'flat-torus-net.obj'): void {
  triggerObjDownload(netToObj(paper, filename.replace(/\.obj$/i, '')), filename);
}

/**
 * Read a folded realization back from OBJ — the inverse of `paperToObj`, for bringing a
 * torus saved out of a demo (or edited elsewhere) back in as a `PaperTorus`.
 *
 * A row of coordinates means nothing without its triangulation (the `PaperTorus` principle),
 * and an OBJ carries its face list, so this IDENTIFIES the triangulation instead of trusting
 * a caller-supplied one: it matches the parsed faces against `candidates` and returns the
 * bundle for whichever one agrees. `paperToObj` writes faces in the triangulation's own order
 * with its own vertex labels, so the match is exact — no combinatorial isomorphism search,
 * and a file that came from somewhere else with a different labeling is REJECTED rather than
 * silently paired with the wrong torus.
 */
export function paperFromObj(text: string, candidates: readonly Triangulation[]): PaperTorus {
  const verts: number[] = [];
  const faces: [number, number, number][] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('v ')) {
      const p = line.slice(2).trim().split(/\s+/).map(Number);
      if (p.length < 3 || p.some(Number.isNaN)) throw new Error(`bad OBJ vertex line: ${line}`);
      verts.push(p[0], p[1], p[2]);
    } else if (line.startsWith('f ')) {
      // accept the v, v/vt, v//vn and v/vt/vn forms; we only want the vertex index
      const idx = line.slice(2).trim().split(/\s+/).map((tok) => Number(tok.split('/')[0]) - 1);
      if (idx.length !== 3 || idx.some((i) => !Number.isInteger(i) || i < 0)) {
        throw new Error(`OBJ face is not a 0-based-representable triangle: ${line}`);
      }
      faces.push([idx[0], idx[1], idx[2]]);
    }
  }
  if (verts.length === 0) throw new Error('OBJ has no vertices');

  const sameCycle = (a: readonly number[], b: readonly number[]): boolean =>
    (a[0] === b[0] && a[1] === b[1] && a[2] === b[2])
    || (a[0] === b[1] && a[1] === b[2] && a[2] === b[0])
    || (a[0] === b[2] && a[1] === b[0] && a[2] === b[1]);

  const match = candidates.find((t) =>
    t.vertexCount * 3 === verts.length
    && t.triangles.length === faces.length
    // every stored face is present in the file (as the same oriented cycle), and vice versa
    && t.triangles.every((tri) => faces.some((f) => sameCycle(tri, f)))
    && faces.every((f) => t.triangles.some((tri) => sameCycle(tri, f))));

  if (!match) {
    throw new Error(
      `OBJ face list (V=${verts.length / 3}, F=${faces.length}) matches none of the `
      + `${candidates.length} candidate triangulations — the file's vertex labeling must be the `
      + 'one it was written with',
    );
  }
  return makePaperTorus(match, Float64Array.from(verts));
}
