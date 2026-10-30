import type { WordWheelGameResult } from '../WordWheelGame';
import { saveWordWheelResult } from '@/utils/dailyChallenge';
import { markWordWheelResultSubmitted } from '@/utils/dailyChallenge/wordWheelRun';
import { getGuestFingerprint, getGuestDailyPlayer } from '@/utils/dailyChallenge/guestPlayer';
import { createClient } from '@/utils/supabase/client';
import type { Language } from '@/types';

// Embedded hosts can block the session cookie, so signed-in submits also carry the token.
async function authHeader(): Promise<Record<string, string>> {
  try {
    const { data } = await createClient().auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

interface SubmitProfile {
  id: string;
  display_name?: string | null;
  avatar_emoji?: string | null;
  avatar_color?: string | null;
  avatar_image?: string | null;
  country_code?: string | null;
}

interface SubmitWordWheelDailyResultArgs {
  result: WordWheelGameResult;
  date: string;
  puzzleNumber: number;
  language: Language;
  centerLetter: string | undefined;
  isAuthenticated: boolean;
  profile: SubmitProfile | null | undefined;
  guestFingerprint: string | null;
  isCatchup: boolean;
  streakDays: number;
  /** The server already held a row for today: show the canonical one instead of this replay. */
  onReconciled: (canonical: WordWheelGameResult) => void;
  onSettled: () => void;
}

export async function submitWordWheelDailyResult({
  result, date, puzzleNumber, language, centerLetter, isAuthenticated, profile,
  guestFingerprint, isCatchup, streakDays, onReconciled, onSettled,
}: SubmitWordWheelDailyResultArgs): Promise<void> {
  const longestWord = result.wordsFound.reduce((a, b) => b.length > a.length ? b : a, '');
  try {
    // Guests submit under the daily guest identity so the board lists their generated name, not "Guest".
    const guest = isAuthenticated ? null : await getGuestDailyPlayer();
    const guestFp = isAuthenticated ? undefined : (guestFingerprint ?? (await getGuestFingerprint()) ?? undefined);
    const submitBody = {
      puzzleDate: date,
      puzzleNumber,
      language,
      playerId: isAuthenticated && profile ? profile.id : undefined,
      guestFingerprint: guestFp || undefined,
      displayName: profile?.display_name || guest?.displayName || 'Guest',
      avatarEmoji: profile?.avatar_emoji || guest?.avatarEmoji || '🎯',
      avatarColor: profile?.avatar_color || guest?.avatarColor || '#6366f1',
      avatarImage: profile?.avatar_image || undefined,
      countryCode: profile?.country_code || undefined,
      score: result.score,
      wordCount: result.wordsFound.length,
      wordsFound: result.wordsFound,
      longestWord: longestWord || undefined,
      timeSeconds: result.timeSeconds,
      centerLetter: centerLetter || undefined,
      isCatchup,
    };
    const resp = await fetch('/api/daily-challenge/word-wheel/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(isAuthenticated ? await authHeader() : {}) },
      body: JSON.stringify(submitBody),
    });
    // A 400 (out-of-window date, bad body) will never succeed, so stop retrying it.
    if (resp.status === 400) markWordWheelResultSubmitted(language, date);
    if (!resp.ok) return;
    markWordWheelResultSubmitted(language, date);
    const json = (await resp.json()) as {
      alreadySubmitted?: boolean;
      result?: {
        score: number;
        wordCount: number;
        wordsFound: string[];
        longestWord: string | null;
        timeSeconds: number;
        centerLetter: string | null;
        completedAt: string | null;
      } | null;
    };
    if (json?.alreadySubmitted && json.result) {
      const c = json.result;
      saveWordWheelResult({
        puzzleNumber,
        puzzleDate: date,
        language,
        centerLetter: c.centerLetter || '',
        wordsFound: c.wordsFound,
        totalPossible: 0,
        score: c.score,
        timeSeconds: c.timeSeconds,
        streakDays,
        completedAt: c.completedAt || new Date().toISOString(),
      }, { submitted: true });
      onReconciled({ wordsFound: c.wordsFound, score: c.score, timeSeconds: c.timeSeconds });
    }
  } catch {
    /* leaderboard submission is best-effort */
  } finally {
    // In `finally` so a failed submit still refreshes the board rather than silently excluding the player.
    onSettled();
  }
}
