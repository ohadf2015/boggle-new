/**
 * Tests for removeApprovedWord in dictionary.ts
 * TDD: Written before implementation (RED phase)
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';

// Mock the logger to avoid noisy output
vi.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock external dependencies that dictionary.ts uses
vi.mock('an-array-of-english-words', () => ['hello', 'world'], { virtual: true });
vi.mock('an-array-of-spanish-words', () => ['hola', 'mundo'], { virtual: true });
vi.mock('../modules/communityWordManager', () => ({
  isWordCommunityValid: vi.fn(() => false),
}));

describe('removeApprovedWord', () => {
  const testDir = path.join(__dirname, '..', '__test_dict_tmp__');
  let removeApprovedWord: (word: string, language: string) => Promise<boolean>;
  let dictionary: { hebrewWords: Set<string>; englishWords: Set<string> };

  beforeAll(() => {
    // Create temp dir for test files
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  beforeEach(async () => {
    vi.resetModules();
    // Fresh import to reset singleton state
    const dictModule = await import('../dictionary');
    removeApprovedWord = dictModule.removeApprovedWord;
    dictionary = dictModule.dictionary;
  });

  afterAll(() => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should remove word from in-memory Set', async () => {
    // Manually add a word to the Hebrew set
    dictionary.hebrewWords.add('בדיקה');

    const result = await removeApprovedWord('בדיקה', 'he');

    expect(result).toBe(true);
    expect(dictionary.hebrewWords.has('בדיקה')).toBe(false);
  });

  it('should remove word from English dictionary', async () => {
    dictionary.englishWords.add('testword');

    const result = await removeApprovedWord('testword', 'en');

    expect(result).toBe(true);
    expect(dictionary.englishWords.has('testword')).toBe(false);
  });

  it('should return false if word not in dictionary', async () => {
    const result = await removeApprovedWord('nonexistent', 'he');

    expect(result).toBe(false);
  });

  it('should normalize Hebrew final letters before removal', async () => {
    // Add with normalized form (כ instead of ך)
    dictionary.hebrewWords.add('מלכ');

    // Remove with final letter form (ך)
    const result = await removeApprovedWord('מלך', 'he');

    expect(result).toBe(true);
    expect(dictionary.hebrewWords.has('מלכ')).toBe(false);
  });

  it('should not touch the approved file (audit C3: persistence is DB-only)', async () => {
    // Audit C3 (2026-05-01): runtime *_approved.txt writes were dead code on
    // Railway (ephemeral FS). The function now only mutates the in-memory Set;
    // DB (`word_scores.is_potentially_valid`) is the authoritative store.
    const approvedFile = path.join(path.resolve(__dirname, '..'), 'hebrew_words_approved.txt');

    const originalContent = 'מילה\nבדיקה\nשלום\n';
    await fsp.writeFile(approvedFile, originalContent, 'utf-8');

    dictionary.hebrewWords.add('בדיקה');
    await removeApprovedWord('בדיקה', 'he');

    // In-memory removal is the contract that matters
    expect(dictionary.hebrewWords.has('בדיקה')).toBe(false);

    // File is untouched — content preserved exactly
    const fileContent = await fsp.readFile(approvedFile, 'utf-8');
    expect(fileContent).toBe(originalContent);

    // Clean up
    await fsp.writeFile(approvedFile, '', 'utf-8');
  });

  it('should handle missing approved file gracefully', async () => {
    dictionary.hebrewWords.add('מילה');

    // Even if file doesn't exist, should still remove from memory
    const result = await removeApprovedWord('מילה', 'he');

    expect(result).toBe(true);
    expect(dictionary.hebrewWords.has('מילה')).toBe(false);
  });
});
