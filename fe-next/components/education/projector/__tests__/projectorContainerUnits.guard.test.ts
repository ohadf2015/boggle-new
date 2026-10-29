import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const LOBBY_FILES = [
  'components/education/projector/ProjectorLobby.tsx',
  'components/education/projector/ProjectorJoinPanel.tsx',
  'components/education/projector/ProjectorRoster.tsx',
  'components/education/projector/ProjectorStartBar.tsx',
  'components/education/projector/ProjectorModeCard.tsx',
  'components/education/projector/ProjectorQuizBlocked.tsx',
  'components/education/projector/RehearsalBotsBlocked.tsx',
  'components/education/live/EduPhoneTestPrompt.tsx',
];

const WALL_FILES = [
  ...LOBBY_FILES,
  'components/education/projector/ClassroomLivePanel.tsx',
  'components/education/live/ProjectorRoundStage.tsx',
  'components/education/live/ProjectorBoard.tsx',
  'components/education/live/ProjectorWheel.tsx',
  'components/education/boss/ProjectorBossStage.tsx',
];

/** A Tailwind arbitrary value sized off the viewport, e.g. `text-[3vw]` or `h-[min(18vh,10vw)]`. */
const VIEWPORT_UNIT = /\[[^\]\s"']*\d(?:vw|vh|dvh|svh|lvh)\b[^\]\s"']*\]/g;
const VIEWPORT_VARIANT = /(?:^|[\s"'`])(?:max-)?(?:sm|md|lg|xl|2xl|portrait|landscape):/gm;

describe('projector surfaces size from their frame, not the viewport', () => {
  it.each(WALL_FILES)('%s has no vw/vh sizes', (file) => {
    expect(read(file).match(VIEWPORT_UNIT) ?? []).toEqual([]);
  });

  it.each(LOBBY_FILES)('%s has no viewport breakpoints (the lobby root is the container)', (file) => {
    expect(read(file).match(VIEWPORT_VARIANT) ?? []).toEqual([]);
  });
});
