/**
 * Minimal shared helpers for the search runner scripts: argv parsing and
 * full-precision CSV row formatting. The scripts stay thin — the search logic
 * lives in src/search/.
 */

export function makeArgs(argv) {
  const args = argv.slice(2);
  return {
    flag: (n) => { const i = args.indexOf(n); return i === -1 ? undefined : args[i + 1]; },
    has: (n) => args.indexOf(n) !== -1,
    num: (n, d) => { const i = args.indexOf(n); return i === -1 ? d : Number(args[i + 1]); },
  };
}

/** A positions array as a CSV row of shortest exact-round-trip floats. */
export function csvRow(p) {
  let s = p[0].toString();
  for (let i = 1; i < p.length; i++) s += ',' + p[i].toString();
  return s;
}

/** Parse a CSV of embeddings into Float64Array rows (each must have `n` columns). */
export function readCsv(text, n) {
  const t = text.trim();
  if (!t) return [];
  return t.split('\n').map((line, idx) => {
    const parts = line.split(',');
    if (parts.length !== n) throw new Error(`row ${idx + 1} has ${parts.length} cols, expected ${n}`);
    const a = new Float64Array(n);
    for (let i = 0; i < n; i++) a[i] = Number(parts[i]);
    return a;
  });
}
