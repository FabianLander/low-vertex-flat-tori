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

import type { PaperTorus } from '@core/configuration/paperTorus.ts';
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
