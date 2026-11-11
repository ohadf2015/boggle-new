import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const OPTION_SURFACES = [
  'components/education/lobby/LobbySetupPanel.tsx',
  'components/education/lobby/LobbyRoundSettings.tsx',
  'components/education/lobby/LobbyChoiceRow.tsx',
  'components/education/lobby/LobbyPressureDials.tsx',
  'components/education/lobby/LobbyEconomyToggles.tsx',
  'components/education/lobby/LobbyOptionParts.tsx',
  'components/education/lobby/LobbyGameOptions.tsx',
  'components/education/vocabQuiz/VocabQuizFocusPicker.tsx',
  'components/education/boss/ClassroomBossPicker.tsx',
];

const PRO_BADGE_TESTID = /data-testid="[\w-]*pro-badge"/;

describe('Game options modal: calm controls', () => {
  it.each(OPTION_SURFACES)('%s has no colored fills, accent text or shouting labels', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/bg-neo-(cyan|pink|purple|lime|orange)(?![\w-])/);
    expect(src).not.toMatch(/text-neo-(cyan|pink|purple|lime)(?![\w-])/);
    expect(src).not.toMatch(/\buppercase\b/);
  });

  it.each(OPTION_SURFACES)('%s uses yellow only on the small PRO badge', (rel) => {
    const lines = read(rel).split('\n');
    lines.forEach((line, i) => {
      if (!/bg-neo-yellow|text-neo-yellow/.test(line)) return;
      expect(line).toMatch(/\btext-xs\b/);
      expect(lines.slice(Math.max(0, i - 2), i + 1).join('\n')).toMatch(PRO_BADGE_TESTID);
    });
  });
});
