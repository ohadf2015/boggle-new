/**
 * Pure logic for check-seo-freeze.mjs: given seo-freeze.json and a unified
 * diff, list the frozen pages whose <title>/meta description lines changed,
 * and the pages whose snippet already changed on the base within the grading
 * window.
 */

/** Days a title/description must stay put before it can be graded and changed again. */
export const GRADING_WINDOW_DAYS = 28;

// A changed line touches the snippet when it assigns a title or description:
// `title:`, `description:`, `SV_TITLE =`, `metaDescription:` and so on. A JSX prop
// (`title={t('x')}`, `title="x"`) is page body, not the snippet.
const SNIPPET_LINE = /(title|description)\w*['"]?\s*(:|=(?![{"'=]))/i;

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

/**
 * Split `git diff -U0` output into { file, lines: ['+...', '-...'], snippetLines } per file.
 * snippetLines are the changed lines that touch the title/description: the line itself
 * assigns one, or its hunk sits under a map of them (`const metaTitles = {` above `en: '...'`,
 * which git puts in the hunk header).
 */
export function parseDiff(diffText) {
  const files = [];
  let cur = null;
  let inSnippetHunk = false;
  for (const line of diffText.split('\n')) {
    if (line.startsWith('diff --git ')) {
      cur = null;
      continue;
    }
    if (line.startsWith('+++ ')) {
      const name = line.slice(4).replace(/^b\//, '');
      cur = { file: name, lines: [], snippetLines: [] };
      files.push(cur);
      continue;
    }
    if (line.startsWith('--- ')) continue;
    if (line.startsWith('@@')) {
      inSnippetHunk = SNIPPET_LINE.test(line.replace(/^@@[^@]*@@/, ''));
      continue;
    }
    if (cur && (line.startsWith('+') || line.startsWith('-'))) {
      cur.lines.push(line);
      if (inSnippetHunk || SNIPPET_LINE.test(line.slice(1))) cur.snippetLines.push(line);
    }
  }
  return files;
}

export const isTestFile = (file) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(file) || file.includes('/__tests__/');

export function findFreezeViolations({ freeze, diffText, today }) {
  const active = activeFreezes(freeze, today)
    .map((e) => ({ ...e, dir: routeDirFor(e.path) }))
    .filter((e) => e.dir);
  const violations = [];
  for (const { file, snippetLines } of parseDiff(diffText)) {
    if (isTestFile(file)) continue;
    const entry = active.find((e) => file.startsWith(e.dir));
    if (!entry) continue;
    if (snippetLines.length) violations.push({ path: entry.path, until: entry.until, file, lines: snippetLines });
  }
  return violations;
}

/** Non-test files under fe-next/app whose title/description lines change in `diffText`. */
export function snippetChanges(diffText) {
  return parseDiff(diffText)
    .filter(({ file }) => file.startsWith('fe-next/app/') && !isTestFile(file))
    .map(({ file, snippetLines }) => ({ file, lines: snippetLines }))
    .filter((c) => c.lines.length);
}

const addDays = (ymd, days) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Snippet changes to files whose snippet already changed on the base less than
 * GRADING_WINDOW_DAYS ago. `lastChanged` maps a file to the base commit that last
 * changed its snippet: { sha, date: 'YYYY-MM-DD' }.
 */
export function findRecentChangeViolations({ changes, lastChanged, today, skipFiles = [] }) {
  const violations = [];
  for (const { file, lines } of changes) {
    if (skipFiles.includes(file)) continue;
    const prev = lastChanged[file];
    if (!prev) continue;
    const until = addDays(prev.date, GRADING_WINDOW_DAYS);
    if (today < until) violations.push({ file, sha: prev.sha, changedOn: prev.date, until, lines });
  }
  return violations;
}
