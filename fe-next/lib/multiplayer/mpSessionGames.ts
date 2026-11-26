/** Session-scoped MP game counter (useMultiplayerSignupNudge writes it once per results screen). */
export const MP_SESSION_GAMES_KEY = 'boggle_mp_session_games';

/** MP games recorded this tab session. Read before a results screen records its own game. */
export function readMpSessionGames(): number {
  if (typeof window === 'undefined') return 0;
  try {
    return parseInt(sessionStorage.getItem(MP_SESSION_GAMES_KEY) || '0', 10) || 0;
  } catch {
    return 0;
  }
}
