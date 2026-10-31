#!/usr/bin/env node
/**
 * Fail a PR that rewrites the <title> or meta description of a page frozen in
 * seo-freeze.json.
 *
 * Why: the daily SEO routine kept rewriting the same pages (the Spanish scrabble
 * page 5 times in 7 days, #1373 → #1435), including after #1409 froze it, so no
 * 28-day window ever held one snippet and no rewrite could be measured. The
 * freeze was only advisory; this makes CI hold it.
 *
 * The freeze list is read from the BASE commit, so a PR can't lift its own
 * freeze. Lifting one early is a separate PR that edits seo-freeze.json.
 *
 * It also fails a PR that changes a snippet the base already changed in the
 * last 28 days, frozen or not. The daily routine doesn't always add what it
 * ships to seo-freeze.json: #1529 rewrote /ru/erudit-onlayn on 2026-10-30 and
 * #1538 rewrote it again the next day.
 *
 * Usage:
 *   node fe-next/scripts/ci/check-seo-freeze.mjs [BASE] [HEAD]
 *   (defaults: HEAD^1 HEAD, i.e. a pull_request merge commit's base and result)
 */
import { execFileSync } from 'node:child_process';
import {
  GRADING_WINDOW_DAYS,
  findFreezeViolations,
  findRecentChangeViolations,
  snippetChanges,
} from './seo-freeze/violations.mjs';

const [base = 'HEAD^1', head = 'HEAD'] = process.argv.slice(2);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

let freeze;
try {
  freeze = JSON.parse(git('show', `${base}:seo-freeze.json`));
} catch {
  console.log(`No seo-freeze.json at ${base}; nothing frozen.`);
  process.exit(0);
}

const diffText = git('diff', '-U0', '--no-color', base, head, '--', 'fe-next/app');
const today = new Date().toISOString().slice(0, 10);
const violations = findFreezeViolations({ freeze, diffText, today });

// The base commit that last changed each touched file's title/description lines.
const since = new Date(Date.now() - (GRADING_WINDOW_DAYS + 1) * 86400000).toISOString().slice(0, 10);
const changes = snippetChanges(diffText);
const lastChanged = {};
for (const { file } of changes) {
  try {
    const commits = git('log', '--format=%h%x09%cs', `--since=${since}`, base, '--', file).trim();
    for (const row of commits ? commits.split('\n') : []) {
      const [sha, date] = row.split('\t');
      if (snippetChanges(git('show', '-U0', '--no-color', '--format=', sha, '--', file)).length) {
        lastChanged[file] = { sha, date };
        break;
      }
    }
  } catch (e) {
    console.log(`::warning file=${file}::Could not read the history of ${file}: ${e.message.split('\n')[0]}`);
  }
}
const recent = findRecentChangeViolations({
  changes,
  lastChanged,
  today,
  skipFiles: violations.map((v) => v.file),
});

if (violations.length === 0 && recent.length === 0) {
  console.log('SEO freeze OK: no frozen or recently changed page title/description changed.');
  process.exit(0);
}

for (const v of violations) {
  console.error(`::error file=${v.file}::${v.path} is frozen in seo-freeze.json until ${v.until}; its title/description must not change.`);
  for (const l of v.lines) console.error(`    ${l}`);
}
for (const v of recent) {
  console.error(
    `::error file=${v.file}::${v.file}'s title/description already changed in ${v.sha} on ${v.changedOn}; leave it until ${v.until} so that change can be graded.`,
  );
  for (const l of v.lines) console.error(`    ${l}`);
}
console.error('\nRevert those lines. A seo-freeze.json freeze can be lifted in a separate PR; a recent change just has to wait out its window.');
process.exit(1);
