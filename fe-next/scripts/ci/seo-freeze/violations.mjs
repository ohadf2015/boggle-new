/**
 * Pure logic for check-seo-freeze.mjs: given seo-freeze.json and a unified
 * diff, list the frozen pages whose <title>/meta description lines changed.
 */

// A changed line touches the snippet when it assigns a title or description:
// `title:`, `description:`, `SV_TITLE =`, `metaDescription:` and so on.
const SNIPPET_LINE = /(title|description)\w*['"]?\s*[:=]/i;

/** Frozen entries still in force on `today` (YYYY-MM-DD). `until` is exclusive. */
export function activeFreezes(freeze, today) {
  return (freeze?.frozen ?? []).filter((e) => typeof e.until === 'string' && today < e.until);
}

/** '/es/juego-de-palabras-multijugador' -> 'fe-next/app/[locale]/juego-de-palabras-multijugador/' */
export function routeDirFor(path) {
  const parts = path.split('/').filter(Boolean);
  const slug = parts.slice(1).join('/');
  return slug ? `fe-next/app/[locale]/${slug}/` : null;
}

/** Split `git diff -U0` output into { file, lines: ['+...', '-...'] } per file. */
export function parseDiff(diffText) {
  const files = [];
  let cur = null;
  for (const line of diffText.split('\n')) {
    if (line.startsWith('diff --git ')) {
      cur = null;
      continue;
    }
    if (line.startsWith('+++ ')) {
      const name = line.slice(4).replace(/^b\//, '');
      cur = { file: name, lines: [] };
      files.push(cur);
      continue;
    }
    if (line.startsWith('--- ')) continue;
    if (cur && (line.startsWith('+') || line.startsWith('-'))) cur.lines.push(line);
  }
  return files;
}

const isTestFile = (file) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(file) || file.includes('/__tests__/');

export function findFreezeViolations({ freeze, diffText, today }) {
  const active = activeFreezes(freeze, today)
    .map((e) => ({ ...e, dir: routeDirFor(e.path) }))
    .filter((e) => e.dir);
  const violations = [];
  for (const { file, lines } of parseDiff(diffText)) {
    if (isTestFile(file)) continue;
    const entry = active.find((e) => file.startsWith(e.dir));
    if (!entry) continue;
    const hits = lines.filter((l) => SNIPPET_LINE.test(l.slice(1)));
    if (hits.length) violations.push({ path: entry.path, until: entry.until, file, lines: hits });
  }
  return violations;
}
