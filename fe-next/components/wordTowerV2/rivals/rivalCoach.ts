const KEY = 'lc:wt-rival-coach-v1';

export function shouldShowRivalCoach(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(KEY) !== '1';
  } catch {
    return true;
  }
}

export function dismissRivalCoach(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, '1');
  } catch {
    /* storage blocked — the tip just returns next time */
  }
}
