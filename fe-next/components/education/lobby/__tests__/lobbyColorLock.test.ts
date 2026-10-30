import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ARCADE_ACCENTS, ARCADE_BLOCK } from '@/lib/education/arcadeAccent';

const ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const SETUP_SURFACES = [
  'components/education/lobby/LobbyModeGrid.tsx',
  'components/education/lobby/LobbyLessonStep.tsx',
  'components/education/lobby/LobbyClassPicker.tsx',
  'components/education/lobby/LobbyQuickSummary.tsx',
  'components/education/lobby/LobbyWarmup.tsx',
  'components/education/lobby/LobbySetupDisclosure.tsx',
  'components/education/lobby/ModeSuggestion.tsx',
  'components/education/ClassroomModeSpotlight.tsx',
];

describe('Pick-a-game setup: one lime fill, everything else neutral', () => {
  it.each(SETUP_SURFACES)('%s has no colored fills or accent tints', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/ACCENT_FILL/);
    expect(src).not.toMatch(/bg-neo-(cyan|pink|purple|yellow|orange)(?![\w-])/);
    expect(src).not.toMatch(/text-neo-(cyan|purple)(?![\w-])/);
  });

  it('the only lime fill on the screen is GO LIVE', () => {
    const fills = SETUP_SURFACES.flatMap((rel) => (read(rel).match(/(?<![\w:-])bg-neo-lime(?![\w/-])/g) ?? []).map(() => rel));
    expect(fills).toEqual(['components/education/ClassroomModeSpotlight.tsx']);
  });

  it('color comes back only as arcade blocks behind game art, from the one shared helper, never lime', () => {
    expect(ARCADE_ACCENTS).not.toContain('lime');
    expect(Object.values(ARCADE_BLOCK).join(' ')).not.toMatch(/lime/);
    expect(read('components/education/lobby/LobbyModeGrid.tsx')).toMatch(/ARCADE_BLOCK/);
    expect(read('components/education/ClassroomModeSpotlight.tsx')).toMatch(/ARCADE_BLOCK/);
  });

  it('the page paints no decorative art layer behind the lobby', () => {
    expect(read('app/[locale]/education/classroom-game/PageClient.tsx')).not.toMatch(/LaunchStageBackdrop|arena-lobby-bg/);
  });
});
