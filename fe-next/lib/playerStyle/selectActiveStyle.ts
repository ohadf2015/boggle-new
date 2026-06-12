import { DEFAULT_STYLE_KEY, isPlayerStyleKey, type PlayerStyleKey } from './styles';

/**
 * Decide the active style key from the two persistence layers.
 *
 * Authenticated → the account value wins; if the account has none yet, fall back
 * to whatever the guest layer holds (so a style chosen before sign-up survives
 * the login). Guests use the stored value only. Anything invalid/absent → default.
 *
 * Pure so the routing rule is unit-tested without React/auth wiring.
 */
export function selectActiveStyleKey(
  isAuthenticated: boolean,
  profileStyle: unknown,
  storedStyle: unknown,
): PlayerStyleKey {
  if (isAuthenticated && isPlayerStyleKey(profileStyle)) return profileStyle;
  if (isPlayerStyleKey(storedStyle)) return storedStyle;
  return DEFAULT_STYLE_KEY;
}
