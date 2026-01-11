/**
 * Contrast Test for CreateChallengeModal
 * Verifies no low-contrast text on backgrounds by checking source code
 */

import fs from 'fs';
import path from 'path';

describe('CreateChallengeModal - Contrast Tests', () => {
  let sourceCode: string;

  beforeAll(() => {
    const filePath = path.join(__dirname, '../daily/CreateChallengeModal.tsx');
    sourceCode = fs.readFileSync(filePath, 'utf-8');
  });

  it('should not have text-gray-* classes on bg-neo-white background', () => {
    // Check for gray text within bg-neo-white containers
    // Lines 493, 504, 543, 556 have text-gray-* which is poor contrast on white bg
    const hasGrayOnWhite = /text-gray-(500|600|800)/.test(sourceCode);

    if (hasGrayOnWhite) {
      console.error('Found text-gray-* on bg-neo-white background in CreateChallengeModal');
      console.error('Lines 493, 504, 543, 556 use text-gray-* which creates poor contrast');
      console.error('Use text-slate-600 dark:text-slate-300 or text-neo-black instead');
    }

    expect(hasGrayOnWhite).toBe(false); // Should pass after fixes
  });

  it('should not have text-white on light backgrounds', () => {
    // Line 238 has text-white which is invisible on bg-neo-white
    const lines = sourceCode.split('\n');
    const line238 = lines[237]; // 0-indexed

    const hasWhiteOnLight = line238.includes('text-white');

    if (hasWhiteOnLight) {
      console.error('Found text-white on light background at line 238');
      console.error('Line: ' + line238.trim());
      console.error('Use text-slate-600 dark:text-slate-300 instead');
    }

    expect(hasWhiteOnLight).toBe(false); // Should pass after fixes
  });

  it('should use high-contrast colors throughout', () => {
    const lines = sourceCode.split('\n');
    const contrastIssues: Array<{line: number, issue: string}> = [];

    // Check specific known issues
    const knownIssues = [
      { line: 238, pattern: /text-white/, desc: 'text-white on bg-neo-white' },
      { line: 493, pattern: /text-gray-800/, desc: 'text-gray-800 on light background' },
      { line: 504, pattern: /text-gray-500/, desc: 'text-gray-500 on light background' },
      { line: 543, pattern: /text-gray-600/, desc: 'text-gray-600 on light background' },
      { line: 556, pattern: /text-gray-500/, desc: 'text-gray-500 on light background' },
    ];

    knownIssues.forEach(({ line, pattern, desc }) => {
      if (lines[line - 1] && pattern.test(lines[line - 1])) {
        contrastIssues.push({ line, issue: desc });
      }
    });

    if (contrastIssues.length > 0) {
      console.error('Contrast issues found in CreateChallengeModal.tsx:');
      contrastIssues.forEach(({ line, issue }) => {
        console.error(`  Line ${line}: ${issue}`);
        console.error(`    ${lines[line - 1].trim()}`);
      });
    }

    expect(contrastIssues.length).toBe(0); // Should pass after all fixes applied
  });
});
