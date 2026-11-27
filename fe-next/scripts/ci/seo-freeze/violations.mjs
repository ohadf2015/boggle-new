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

const TOP_LEVEL = /^(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:async\s+)?(function\*?|const|let|var|class|type|interface|enum|import)\b\s*(\w*)/;
const TITLE_NAME = /title|description/i;

/**
 * Which lines of a file can hold its <title>/description. Returns a predicate over
 * 1-based line numbers: true = any change there counts, 'line' = only a line that
 * assigns a title/description counts, false = page body. Top-level statements are
 * found by their column-0 keyword (the code is prettier-formatted).
 */
export function metadataScope(file, content) {
  if (content == null) return () => 'line';
  if (/^(?:\s*(?:\/\/.*|\/\*[\s\S]*?\*\/))*\s*['"]use client['"]/.test(content)) return () => false;
  const lines = content.split('\n');
  const stmts = [];
  lines.forEach((text, i) => {
    const m = TOP_LEVEL.exec(text);
    if (m) stmts.push({ name: m[2], isVar: /^(const|let|var)$/.test(m[1]), start: i + 1, isDefault: /^export\s+default\b/.test(text), text: '' });
    if (stmts.length) stmts[stmts.length - 1].text += `${text}\n`;
  });
  const isMetadataFile = stmts.some((s) => s.name === 'generateMetadata' || s.name === 'metadata');
  if (!isMetadataFile && !/\.[jt]sx$/.test(file)) return () => 'line';
  const inScope = new Set(stmts.filter((s) => s.name === 'generateMetadata' || s.name === 'metadata'));
  for (let grew = true; grew; ) {
    grew = false;
    for (const s of stmts) {
      if (inScope.has(s) || s.isDefault || !s.name) continue;
      const word = new RegExp(`\\b${s.name}\\b`);
      if ([...inScope].some((m) => word.test(m.text))) {
        inScope.add(s);
        grew = true;
      }
    }
  }
  return (n) => {
    const s = stmts.findLast((st) => st.start <= n);
    if (!s || s.isDefault) return false;
    if (s.isVar && TITLE_NAME.test(s.name)) return true;
    return inScope.has(s) ? 'line' : false;
  };
}

/**
 * Split `git diff -U0` output into { file, lines: ['+...', '-...'], snippetLines } per file.
 * snippetLines are the changed lines that touch the title/description: the line itself
 * assigns one, or its hunk sits under a map of them (`const metaTitles = {` above `en: '...'`,
 * which git puts in the hunk header). With `readFile(side, path)` ('base' | 'head'), a line
 * also has to sit in the file's metadata scope (see metadataScope).
 */
export function parseDiff(diffText, readFile) {
  const files = [];
  let cur = null;
  let oldName = null;
  let inSnippetHunk = false;
  let baseScope, headScope, baseLine, headLine;
  for (const line of diffText.split('\n')) {
    if (line.startsWith('diff --git ')) {
      cur = null;
      continue;
    }
    if (line.startsWith('--- ')) {
      oldName = line.slice(4).replace(/^a\//, '');
      continue;
    }
    if (line.startsWith('+++ ')) {
      const name = line.slice(4).replace(/^b\//, '');
      cur = { file: name, lines: [], snippetLines: [] };
      files.push(cur);
      baseScope = readFile ? metadataScope(oldName, readFile('base', oldName)) : () => 'line';
      headScope = readFile ? metadataScope(name, readFile('head', name)) : () => 'line';
      continue;
    }
    if (line.startsWith('@@')) {
      inSnippetHunk = SNIPPET_LINE.test(line.replace(/^@@[^@]*@@/, ''));
      const m = /^@@ -(\d+)(?:,\d+)? \+(\d+)/.exec(line);
      baseLine = m ? Number(m[1]) : 0;
      headLine = m ? Number(m[2]) : 0;
      continue;
    }
    if (cur && (line.startsWith('+') || line.startsWith('-'))) {
      cur.lines.push(line);
      const scope = line[0] === '-' ? baseScope(baseLine++) : headScope(headLine++);
      if (scope === true || (scope && (inSnippetHunk || SNIPPET_LINE.test(line.slice(1))))) cur.snippetLines.push(line);
    }
  }
  return files;
}

export const isTestFile = (file) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(file) || file.includes('/__tests__/');

export function findFreezeViolations({ freeze, diffText, today, readFile }) {
  const active = activeFreezes(freeze, today)
    .map((e) => ({ ...e, dir: routeDirFor(e.path) }))
    .filter((e) => e.dir);
  const violations = [];
  for (const { file, snippetLines } of parseDiff(diffText, readFile)) {
    if (isTestFile(file)) continue;
    const entry = active.find((e) => file.startsWith(e.dir));
    if (!entry) continue;
    if (snippetLines.length) violations.push({ path: entry.path, until: entry.until, file, lines: snippetLines });
  }
  return violations;
}

/** Non-test files under fe-next/app whose title/description lines change in `diffText`. */
export function snippetChanges(diffText, readFile) {
  return parseDiff(diffText, readFile)
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
