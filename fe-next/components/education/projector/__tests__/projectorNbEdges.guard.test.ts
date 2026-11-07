import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const WALL_FILES = [
  'components/education/projector/ProjectorLobby.tsx',
  'components/education/projector/ProjectorJoinPanel.tsx',
  'components/education/projector/ProjectorRoster.tsx',
  'components/education/projector/ProjectorStartBar.tsx',
  'components/education/projector/ProjectorModeCard.tsx',
  'components/education/projector/ProjectorWordPanel.tsx',
  'components/education/projector/ProjectorLobbyLock.tsx',
  'components/education/projector/ProjectorQuizBlocked.tsx',
  'components/education/projector/RehearsalBotsBlocked.tsx',
  'components/education/projector/ClassroomLivePanel.tsx',
  'components/education/live/ProjectorBoard.tsx',
  'components/education/live/ProjectorWheel.tsx',
  'components/education/live/ProjectorStageFallback.tsx',
  'components/education/live/ProjectorCrosswordStage.tsx',
  'components/education/live/ProjectorWordcraftStage.tsx',
  'components/education/live/ProjectorWordcraftPlay.tsx',
];

/** A cream edge under 50% vanishes on a washed-out projector: the old "NB-lite" look. */
const FAINT_CREAM_EDGE = /\bborder-neo-cream\/(?:[1-4]\d|[1-9])\b/g;

describe('projector wall: chunky edges, never NB-lite', () => {
  it.each(WALL_FILES)('%s has no faint cream outline', (file) => {
    expect(read(file).match(FAINT_CREAM_EDGE) ?? []).toEqual([]);
  });
});
