/**
 * Profile fixtures for the /avatar-test capture harness (Track B). Deterministic
 * players at any level so critics can capture the real profile stage:
 *   ?view=profile&level=N            own profile
 *   &public=1                        public /u/[username] look
 *   &noname=1                        auto-generated "Player_xxxx" name
 */
import type { ProfileData } from '@/contexts/auth/authTypes';
import { getHeadlineStats, type HeadlineStat } from '@/components/profile/showcase/profileShowcaseModel';
import { fixtureConfigForLevel, FIXTURE_PLAYER_ID } from './fixtures';

export interface ProfileLabKnobs {
  isPublic: boolean;
  placeholderName: boolean;
}

export function parseProfileLabKnobs(search: string | null | undefined): ProfileLabKnobs {
  const q = new URLSearchParams((search ?? '').replace(/^\?/, ''));
  return { isPublic: q.get('public') === '1', placeholderName: q.get('noname') === '1' };
}

const WORDS = ['CAT', 'PLANE', 'GARDEN', 'MONSTER', 'QUIXOTIC', 'LABYRINTHS', 'EXTRAORDINARY'];

/** A believable player at `level`: a brand-new L1 has played nothing yet. */
export function fixtureProfileForLevel(level: number, knobs: Partial<ProfileLabKnobs> = {}): ProfileData {
  const lv = Math.max(1, Math.floor(level));
  const games = lv <= 1 ? 0 : lv * 6;
  const wins = lv <= 1 ? 0 : Math.floor(lv * 1.8);
  const word = lv <= 1 ? null : WORDS[Math.min(WORDS.length - 1, Math.floor(lv / 5))];
  return {
    id: FIXTURE_PLAYER_ID,
    username: knobs.placeholderName ? 'Player_3f9a2c1d' : 'ronny',
    display_name: knobs.placeholderName ? undefined : 'Ronny',
    avatar_config: fixtureConfigForLevel(lv),
    country_code: 'IL',
    current_level: lv,
    total_xp: Math.round(90 * lv * lv),
    total_games: games,
    total_score: lv * 950,
    total_words: games * 14,
    casual_wins: wins,
    ranked_wins: 0,
    casual_games: games,
    longest_word: word,
    longest_word_length: word?.length ?? 0,
    total_coins: 1500,
    created_at: '2025-11-02T00:00:00Z',
    achievement_counts: lv <= 1 ? {} : {
      FIRST_BLOOD: 1,
      WORDSMITH: Math.min(400, lv * 3),
      SPEED_DEMON: Math.max(1, Math.floor(lv / 2)),
      ...(lv >= 7 ? { RARE_GEM: 1 } : {}),
      ...(lv >= 15 ? { COMBO_GOD: 2 } : {}),
    },
  };
}

export function fixtureHeadlineStats(profile: ProfileData, isPublic: boolean): HeadlineStat[] {
  const wins = (profile.casual_wins ?? 0) + (profile.ranked_wins ?? 0);
  const games = profile.total_games ?? 0;
  return getHeadlineStats({
    longestWord: profile.longest_word,
    wins,
    streak: isPublic ? null : Math.min(12, profile.current_level ?? 0) - 1,
    games,
    winRate: isPublic && games > 0 ? Math.round((wins / games) * 100) : null,
  });
}
