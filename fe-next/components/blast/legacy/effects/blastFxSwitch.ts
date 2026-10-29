/** Kill switch for the whole Blast FX layer: `?fx=off` or localStorage `blast:fx` = `off`. */
export function isBlastFxDisabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('fx') === 'off') return true;
    return window.localStorage.getItem('blast:fx') === 'off';
  } catch {
    return false;
  }
}
