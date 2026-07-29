/**
 * Codemod: app-wide framer-motion `motion` -> `m` migration for LazyMotion.
 *
 * Source files (.ts/.tsx/.js/.jsx, non-test):
 *   - rewrites the `framer-motion` import clause: `motion` -> `m`
 *   - rewrites usages: `motion.X` -> `m.X`, `motion(` -> `m(`
 *
 * Test files (__tests__ / *.test.* / *.spec.*):
 *   - rewrites mock object keys + in-body mock refs: `motion:` -> `m:`, `motion.` -> `m.`
 *     (so `vi.mock('framer-motion', ...)` factories expose `m` for converted components)
 *
 * `motion` inside the literal `framer-motion` is never touched (`(?<!-)` guard + the
 * import-clause replace is scoped strictly inside the `{ ... }` braces).
 *
 * Usage: node scripts/migrate-lazy-motion.mjs [--dry]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const dry = process.argv.includes('--dry');
const onlySource = process.argv.includes('--source');
const onlyTest = process.argv.includes('--test');

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'coverage', 'android', 'ios']);
const EXT = /\.(tsx?|jsx?)$/;

function walk(dir, acc) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full, acc);
    } else if (EXT.test(entry) && !full.includes('migrate-lazy-motion')) {
      acc.push(full);
    }
  }
  return acc;
}

const files = walk('.', []);
const isTest = (f) => /(__tests__|\.test\.|\.spec\.)/.test(f);

let srcChanged = 0;
let testChanged = 0;
const changed = [];

for (const file of files) {
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (!content.includes('framer-motion')) continue;

  const fileIsTest = isTest(file);
  if (onlySource && fileIsTest) continue;
  if (onlyTest && !fileIsTest) continue;

  let out = content;

  if (fileIsTest) {
    out = out.replace(/\bmotion\s*:/g, 'm:');
    out = out.replace(/(?<!-)\bmotion\.(?=[a-zA-Z_$])/g, 'm.');
  } else {
    // 1. Import clause — replace the `motion` token only inside the { ... } braces.
    out = out.replace(
      /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*(['"])framer-motion\2/g,
      (full, clause) => full.replace(clause, clause.replace(/\bmotion\b/g, 'm')),
    );
    // 2. Usages.
    out = out.replace(/(?<!-)\bmotion\.(?=[a-zA-Z_$])/g, 'm.');
    out = out.replace(/(?<!-)\bmotion\(/g, 'm(');
  }

  if (out !== content) {
    if (!dry) writeFileSync(file, out);
    if (isTest(file)) testChanged++;
    else srcChanged++;
    changed.push(file);
  }
}

console.log(changed.join('\n'));
console.log(`\n${dry ? '[DRY] ' : ''}source changed: ${srcChanged} | test changed: ${testChanged} | total: ${changed.length}`);
