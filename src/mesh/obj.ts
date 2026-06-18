/**
 * obj — the torus as an explicit polygon mesh on disk: a sibling of the in-memory
 * three.js realization, in Wavefront OBJ. Exports the bare POLYHEDRON (the F flat
 * triangles of the realization), not the tube/sphere decorations — the mathematical
 * object, droppable into Blender / a slicer.
 *
 * `paperToObj` is PURE (positions + triangle list → text, no three.js, no DOM);
 * `downloadObj` is the thin DOM cap that triggers the browser save.
 */

import type { PaperTorus } from '../configuration/paperTorus.ts';

/** The realization as Wavefront OBJ text: `v x y z` per vertex, `f a b c` per triangle. */
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

/** Trigger a browser download of the realization as a `.obj` file (DOM cap). */
export function downloadObj(paper: PaperTorus, filename = 'flat-torus.obj'): void {
  const name = filename.replace(/\.obj$/i, '');
  const blob = new Blob([paperToObj(paper, name)], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.obj') ? filename : `${filename}.obj`;
  a.click();
  URL.revokeObjectURL(url);
}
