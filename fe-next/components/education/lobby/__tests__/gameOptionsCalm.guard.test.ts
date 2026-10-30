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
  'components/education/lobby/LobbyLateJoinToggle.tsx',
  'components/education/ClassroomBattleSettings.tsx',
  'components/education/vocabQuiz/VocabQuizFocusPicker.tsx',
  'components/education/boss/ClassroomBossPicker.tsx',
];

const PRO_BADGE_MARKER = 'text-[0.65rem]';

describe('Game options modal: calm controls', () => {
  it.each(OPTION_SURFACES)('%s has no colored fills, accent text or shouting labels', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/bg-neo-(cyan|pink|purple|lime|orange)(?![\w-])/);
    expect(src).not.toMatch(/text-neo-(cyan|pink|purple|lime)(?![\w-])/);
    expect(src).not.toMatch(/\buppercase\b/);
  });

  it.each(OPTION_SURFACES)('%s uses yellow only on the small PRO badge', (rel) => {
    const lines = read(rel).split('\n').filter((l) => /bg-neo-yellow|text-neo-yellow/.test(l));
    for (const line of lines) expect(line).toContain(PRO_BADGE_MARKER);
  });
});
