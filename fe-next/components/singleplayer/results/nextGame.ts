/**
 * "What's next?" options for the solo results screen.
 *
 * Single player has no mode picker any more (bare /singleplayer auto-starts a
 * bots game), so the results screen is where a player chooses their next
 * game. Options are a mix of in-page actions (start a preset without leaving
 * the view — no navigation, no re-entry gate) and links to the other loops.
 */
import type { DifficultyLevel } from '@/shared/types/game';
import type { SinglePlayerMode } from '../SinglePlayerView';

export type NextGameOption =
  | { id: string; kind: 'action'; presetId: string; labelKey: string; descKey: string; accent: 'lime' | 'cyan' | 'pink' | 'amber' }
  | { id: string; kind: 'link'; href: string; labelKey: string; descKey: string; accent: 'lime' | 'cyan' | 'pink' | 'amber' };

/** The bots ladder: EASY (friendly) → MEDIUM (competitive) → HARD (battle). */
export function nextHarderPresetId(difficulty: DifficultyLevel): 'competitive' | 'battle' {
  return difficulty === 'EASY' ? 'competitive' : 'battle';
}

export interface NextGameContext {
  mode: SinglePlayerMode;
  difficulty: DifficultyLevel;
  isWinner: boolean;
  language: string;
}

export function buildNextGameOptions({ mode, difficulty, isWinner, language }: NextGameContext): NextGameOption[] {
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

  if (mode !== 'solo-bots') {
    const bots: NextGameOption = {
      id: 'bots', kind: 'action', presetId: 'friendly',
      labelKey: 'singlePlayer.nextGame.bots', descKey: 'singlePlayer.nextGame.botsDesc', accent: 'pink',
    };
    return [same, bots, daily];
  }

  const atMax = difficulty === 'HARD';
  const harder: NextGameOption = {
    id: 'rematch-harder', kind: 'action', presetId: nextHarderPresetId(difficulty),
    labelKey: atMax ? 'singlePlayer.nextGame.rematchMax' : 'singlePlayer.nextGame.rematchHarder',
    descKey: atMax ? 'singlePlayer.nextGame.rematchMaxDesc' : 'singlePlayer.nextGame.rematchHarderDesc',
    accent: 'pink',
  };
  // Won → step up the ladder first. Lost → revenge on the same setup first.
  return isWinner ? [harder, same, practice, daily] : [same, harder, practice, daily];
}
