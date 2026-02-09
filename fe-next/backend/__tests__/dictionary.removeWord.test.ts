/**
 * Tests for removeApprovedWord in dictionary.ts
 * TDD: Written before implementation (RED phase)
 */

import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';

// Mock the logger to avoid noisy output
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock external dependencies that dictionary.ts uses
jest.mock('an-array-of-english-words', () => ['hello', 'world'], { virtual: true });
jest.mock('an-array-of-spanish-words', () => ['hola', 'mundo'], { virtual: true });
jest.mock('../modules/communityWordManager', () => ({
  isWordCommunityValid: jest.fn(() => false),
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

  beforeEach(() => {
    jest.resetModules();
    // Fresh import to reset singleton state
    const dictModule = require('../dictionary');
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

  it('should rewrite approved file without the word', async () => {
    // Create a mock approved file with multiple words
    const approvedFile = path.join(path.dirname(require.resolve('../dictionary')), 'hebrew_words_approved.txt');

    // Ensure the file exists with test content
    const originalContent = 'מילה\nבדיקה\nשלום\n';
    await fsp.writeFile(approvedFile, originalContent, 'utf-8');

    // Add word to in-memory dict
    dictionary.hebrewWords.add('בדיקה');

    await removeApprovedWord('בדיקה', 'he');

    // Read the file back
    const updatedContent = await fsp.readFile(approvedFile, 'utf-8');
    expect(updatedContent).not.toContain('בדיקה');
    expect(updatedContent).toContain('מילה');
    expect(updatedContent).toContain('שלום');

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
