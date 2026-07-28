/**
 * Regression tests for the translation scanner's dynamic-key gap (t_2a97dbe4).
 *
 * Root cause of the "names cover letters" user bug (t_bc55700c): keys selected
 * via a runtime variable — `t(translationKey)` where translationKey is a ternary
 * of literals — were invisible to check:translations, so the keys went missing
 * in all 6 locales and t() rendered raw key paths over the game board.
 *
 * These tests prove the scanner now resolves the common dynamic shapes, records
 * unresolvable ones as runtime risks, and FLAGS a resolved-but-missing key.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const scanner = require('../scripts/find-missing-translations.js');

function writeFixture(name: string, content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-scan-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return file;
}

function keysOf(calls: Array<{ key: string }>): string[] {
  return [...new Set(calls.map((c) => c.key))].sort();
}

describe('translation scanner — dynamic t() key resolution', () => {
  beforeEach(() => {
    scanner.dynamicPatterns.length = 0;
  });

  it('resolves t(variable) where the variable is a ternary of string literals (the original bug)', () => {
    const file = writeFixture(
      'feed.tsx',
      `export function Feed({ item, t }: any) {
         const translationKey = item.isLongWord
           ? 'multiplayer.opponentFoundLongWord'
           : 'multiplayer.opponentFoundWord';
         return <span>{t(translationKey, { name: item.playerName })}</span>;
       }`
    );
    const keys = keysOf(scanner.extractTFunctionCalls(file));
    expect(keys).toContain('multiplayer.opponentFoundWord');
    expect(keys).toContain('multiplayer.opponentFoundLongWord');
  });

  it('resolves t(`ns.${k}`) inside (["a","b"] as const).map(k => ...)', () => {
    const file = writeFixture(
      'steps.tsx',
      `export function Steps({ t }: any) {
         return (['step1', 'step2', 'step3'] as const).map((k) => (
           <h3>{t(\`education.access.next.\${k}_title\`)}</h3>
         ));
       }`
    );
    const keys = keysOf(scanner.extractTFunctionCalls(file));
    expect(keys).toEqual([
      'education.access.next.step1_title',
      'education.access.next.step2_title',
      'education.access.next.step3_title',
    ]);
  });

  it('resolves params annotated with a string-union type', () => {
    const file = writeFixture(
      'diff.tsx',
      `type Difficulty = 'easy' | 'medium' | 'hard';
       export function label(d: Difficulty, t: any) {
         return t(\`shiritori.solo.difficulty.\${d}\`);
       }`
    );
    const keys = keysOf(scanner.extractTFunctionCalls(file));
    expect(keys).toEqual([
      'shiritori.solo.difficulty.easy',
      'shiritori.solo.difficulty.hard',
      'shiritori.solo.difficulty.medium',
    ]);
  });

  it('records unresolvable dynamic keys as runtime risks instead of dropping them silently', () => {
    const file = writeFixture(
      'dyn.tsx',
      `export function Dyn({ t, serverValue }: any) {
         return <span>{t(\`achievements.\${serverValue}.name\`)}</span>;
       }`
    );
    scanner.extractTFunctionCalls(file);
    const risks = scanner.dynamicPatterns.filter((p: any) => p.type === 'template_literal');
    expect(risks.length).toBeGreaterThan(0);
    expect(risks[0].pattern).toContain('achievements.');
  });

  it('FLAGS a resolved dynamic key that is missing from the en dictionary (intentionally broken key)', () => {
    const file = writeFixture(
      'broken.tsx',
      `export function Broken({ cond, t }: any) {
         const k = cond ? 'multiplayer.opponentFoundLongWord' : 'multiplayer.totallyMissingKey';
         return <span>{t(k)}</span>;
       }`
    );
    const calls = scanner.extractTFunctionCalls(file);
    const keysByLanguage = {
      en: ['multiplayer.opponentFoundLongWord'], // opponentFoundLongWord exists, totallyMissingKey does NOT
      he: ['multiplayer.opponentFoundLongWord'],
    };
    const reportPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-report-')), 'report.json');
    const report = scanner.generateReport(keysByLanguage, calls, {}, [], reportPath);
    const missingKeys = report.missingFromEnglish.map((m: any) => m.key);
    expect(missingKeys).toContain('multiplayer.totallyMissingKey');
    expect(missingKeys).not.toContain('multiplayer.opponentFoundLongWord');
  });

  it('end-to-end on the real repo: OpponentWordFeed keys are extracted (original gap regression)', () => {
    const calls = scanner.extractAllTFunctionCalls();
    const keys = keysOf(calls);
    expect(keys).toContain('multiplayer.opponentFoundWord');
    expect(keys).toContain('multiplayer.opponentFoundLongWord');
  }, 60000);
});
