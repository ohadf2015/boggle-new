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
 * Usage:
 *   node fe-next/scripts/ci/check-seo-freeze.mjs [BASE] [HEAD]
 *   (defaults: HEAD^1 HEAD, i.e. a pull_request merge commit's base and result)
 */
import { execFileSync } from 'node:child_process';
import { findFreezeViolations } from './seo-freeze/violations.mjs';

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

if (violations.length === 0) {
  console.log('SEO freeze OK: no frozen page title/description changed.');
  process.exit(0);
}

for (const v of violations) {
  console.error(`::error file=${v.file}::${v.path} is frozen in seo-freeze.json until ${v.until}; its title/description must not change.`);
  for (const l of v.lines) console.error(`    ${l}`);
}
console.error('\nRevert those lines, or lift the freeze in a separate PR that edits seo-freeze.json.');
process.exit(1);
