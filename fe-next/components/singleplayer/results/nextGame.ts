/**
 * "What's next?" options for the solo results screen.
 *
 * Single player has no mode picker any more (bare /singleplayer auto-starts a
 * bots game), so the results screen is where a player chooses their next
 * game. Options are a mix of in-page actions (start a preset without leaving
 * the view — no navigation, no re-entry gate) and links to the other loops.
 */
import type { DifficultyLevel } from '@/shared/types/game';
import { buildSoloRotation } from '@/lib/soloRotation';
import type { SinglePlayerMode } from '../SinglePlayerView';

export type NextGameAccent = 'lime' | 'cyan' | 'pink' | 'amber';

export type NextGameOption =
  | { id: string; kind: 'action'; presetId: string; labelKey: string; descKey: string; accent: NextGameAccent; badgeKey?: string }
  | { id: string; kind: 'link'; href: string; labelKey: string; descKey: string; accent: NextGameAccent; badgeKey?: string };

/** The bots ladder: EASY (friendly) → MEDIUM (competitive) → HARD (battle). */
export function nextHarderPresetId(difficulty: DifficultyLevel): 'competitive' | 'battle' {
  return difficulty === 'EASY' ? 'competitive' : 'battle';
}

export interface NextGameContext {
  mode: SinglePlayerMode;
  difficulty: DifficultyLevel;
  isWinner: boolean;
  language: string;
  /**
   * Solo rounds finished before this results screen. Omit both fields to keep
   * the pre-rotation ladder (existing callers and tests).
   */
  gamesPlayed?: number;
  dailyDoneEver?: boolean;
}

const FIRST_DAILY_HREF = '/daily/word-hunt?from=solo_results';

function promoteToFront(options: NextGameOption[], id: string): NextGameOption[] {
  const index = options.findIndex((option) => option.id === id);
  if (index <= 0) return options;
  const next = options.slice();
  const [item] = next.splice(index, 1);
  next.unshift(item);
  return next;
}

function applyNewPlayerRotation(
  options: NextGameOption[],
  gamesPlayed: number,
  dailyDoneEver: boolean,
  language: string,
): NextGameOption[] {
  const rotation = buildSoloRotation({ gamesPlayed, dailyDoneEver });
  let next = options.map((option) => {
    if (option.kind === 'action' && option.id === 'rematch-same' && rotation.rematchPresetId) {
      return { ...option, presetId: rotation.rematchPresetId };
    }
    if (option.kind === 'link' && option.id === 'daily' && rotation.promote === 'daily') {
      return {
        ...option,
        href: FIRST_DAILY_HREF,
        labelKey: 'singlePlayer.nextGame.firstDaily',
        descKey: 'singlePlayer.nextGame.firstDailyDesc',
        badgeKey: 'singlePlayer.nextGame.firstDailyBadge',
      };
    }
    return option;
  });
  if (rotation.promote === 'daily') next = promoteToFront(next, 'daily');
  if (rotation.promote === 'multiplayer') {
    const multiplayer: NextGameOption = {
      id: 'multiplayer',
      kind: 'link',
      href: `/${language}/multiplayer`,
      labelKey: 'singlePlayer.nextGame.multiplayer',
      descKey: 'singlePlayer.nextGame.multiplayerDesc',
      accent: 'pink',
    };
    next = [multiplayer, ...next];
  }
  return next;
}

export function buildNextGameOptions({
  mode, difficulty, isWinner, language, gamesPlayed, dailyDoneEver,
}: NextGameContext): NextGameOption[] {
  const practice: NextGameOption = {
    id: 'practice', kind: 'link', href: `/${language}/singleplayer?autoStart=practice`,
    labelKey: 'singlePlayer.nextGame.practice', descKey: 'singlePlayer.nextGame.practiceDesc', accent: 'cyan',
  };
  const daily: NextGameOption = {
    id: 'daily', kind: 'link', href: `/${language}/daily`,
    labelKey: 'singlePlayer.nextGame.daily', descKey: 'singlePlayer.nextGame.dailyDesc', accent: 'amber',
  };
  // Same setup again is an in-page replay; `presetId: ''` tells the caller to
  // reuse the current settings instead of loading a preset.
  const same: NextGameOption = {
    id: 'rematch-same', kind: 'action', presetId: '',
    labelKey: 'singlePlayer.nextGame.rematchSame', descKey: 'singlePlayer.nextGame.rematchSameDesc', accent: 'lime',
  };

  const rotate = typeof gamesPlayed === 'number' && typeof dailyDoneEver === 'boolean'
    ? (options: NextGameOption[]) => applyNewPlayerRotation(options, gamesPlayed, dailyDoneEver, language)
    : (options: NextGameOption[]) => options;

  if (mode !== 'solo-bots') {
    const bots: NextGameOption = {
      id: 'bots', kind: 'action', presetId: 'friendly',
      labelKey: 'singlePlayer.nextGame.bots', descKey: 'singlePlayer.nextGame.botsDesc', accent: 'pink',
    };
    return rotate([same, bots, daily]);
  }

  const atMax = difficulty === 'HARD';
  const harder: NextGameOption = {
    id: 'rematch-harder', kind: 'action', presetId: nextHarderPresetId(difficulty),
    labelKey: atMax ? 'singlePlayer.nextGame.rematchMax' : 'singlePlayer.nextGame.rematchHarder',
    descKey: atMax ? 'singlePlayer.nextGame.rematchMaxDesc' : 'singlePlayer.nextGame.rematchHarderDesc',
    accent: 'pink',
  };
  // Won → step up the ladder first. Lost → revenge on the same setup first.
  const ladder = isWinner ? [harder, same, practice, daily] : [same, harder, practice, daily];
  return rotate(ladder);
}
