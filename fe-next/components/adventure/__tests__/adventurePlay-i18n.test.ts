import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('adventurePlay i18n keys uniqueness', () => {
  const locales = ['en', 'es', 'he', 'ja', 'ru', 'sv'];

  locales.forEach((locale) => {
    it(`${locale}.js has no duplicate adventurePlay keys`, () => {
      const filePath = path.join(__dirname, '../../..', 'translations', `${locale}.js`);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract the adventurePlay block by finding "adventurePlay": { and matching closing }
      const startMatch = content.match(/"adventurePlay":\s*{/);
      expect(startMatch).toBeTruthy();

      const startIdx = startMatch!.index! + startMatch![0].length;
      let depth = 1;
      let endIdx = startIdx;

      // Find the matching closing brace
      for (let i = startIdx; i < content.length; i++) {
        if (content[i] === '{') depth++;
        if (content[i] === '}') {
          depth--;
          if (depth === 0) {
            endIdx = i;
            break;
          }
        }
      }

      const blockContent = content.substring(startIdx, endIdx);

      // Extract all depth-1 keys (lines with 4 spaces, then key, then colon)
      const keyMatches = blockContent.matchAll(/^\s{4}"([^"]+)":/gm);
      const keys: string[] = [];

      for (const match of keyMatches) {
        keys.push(match[1]);
      }

      // Check for duplicates
      const seen = new Set<string>();
      const duplicates: string[] = [];

      for (const key of keys) {
        if (seen.has(key)) {
          duplicates.push(key);
        }
        seen.add(key);
      }

      expect(duplicates).toEqual([], `Found duplicate keys in adventurePlay: ${duplicates.join(', ')}`);
    });
  });
});

describe('adventurePlay relic overflow key', () => {
  const locales = ['en', 'es', 'he', 'ja', 'ru', 'sv'];

  locales.forEach((locale) => {
    it(`${locale}.js has showMoreRelics key distinct from andMoreRelics`, () => {
      const filePath = path.join(__dirname, '../../..', 'translations', `${locale}.js`);
      // Use dynamic import since the file is ESM
      const moduleContent = fs.readFileSync(filePath, 'utf-8');

      // Extract and parse the loot object
      const adventureMatch = moduleContent.match(/"adventurePlay":\s*{[\s\S]*?"loot":\s*{([\s\S]*?)}\s*}/);
      expect(adventureMatch, `Could not find adventurePlay.loot in ${locale}.js`).toBeTruthy();

      const lootBlock = adventureMatch![1];

      // Extract both keys
      const showMoreMatch = lootBlock.match(/"showMoreRelics":\s*"([^"]*)"/);
      const andMoreMatch = lootBlock.match(/"andMoreRelics":\s*"([^"]*)"/);

      expect(showMoreMatch, `showMoreRelics key not found in ${locale}.js`).toBeTruthy();
      expect(andMoreMatch, `andMoreRelics key not found in ${locale}.js`).toBeTruthy();

      const showMoreValue = showMoreMatch![1];
      const andMoreValue = andMoreMatch![1];

      expect(showMoreValue).toBeTruthy(`showMoreRelics value is empty in ${locale}.js`);
      expect(andMoreValue).toBeTruthy(`andMoreRelics value is empty in ${locale}.js`);
      expect(showMoreValue).not.toBe(andMoreValue, `showMoreRelics and andMoreRelics have the same value in ${locale}.js`);
      expect(showMoreValue).toMatch(/{n}/, `showMoreRelics value does not contain {n} placeholder in ${locale}.js`);
    });
  });
});
