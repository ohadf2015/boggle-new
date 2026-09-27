export interface NameInputs {
  ftueName: string | null | undefined;
  ftueNameEdited: boolean | undefined;
  oauthName: string | null | undefined;
  randomFallback: string;
}

export interface NameDecision {
  displayName: string;
  source: 'ftue' | 'oauth' | 'random';
  hasCustomized: boolean;
}

const isPresent = (s: string | null | undefined): s is string =>
  typeof s === 'string' && s.trim().length > 0;

/**
 * Pick the display name + decide whether to force the customize modal.
 *
 * Rules (matches product ask "force change OR default to Google account name"):
 *   1. FTUE name the user actually edited → use it, treat as customized.
 *   2. OAuth provider name available → use it, treat as customized.
 *   3. Unedited FTUE suggestion → use it but mark NOT customized so the
 *      ProfileCustomizationModal forces them to confirm/change.
 *   4. Nothing → random localized fallback, mark NOT customized.
 */
export function decideDisplayName(inputs: NameInputs): NameDecision {
  const ftueOk = isPresent(inputs.ftueName);
  const oauthOk = isPresent(inputs.oauthName);

  if (ftueOk && inputs.ftueNameEdited === true) {
    return { displayName: inputs.ftueName!.trim(), source: 'ftue', hasCustomized: true };
  }
  if (oauthOk) {
    return { displayName: inputs.oauthName!.trim(), source: 'oauth', hasCustomized: true };
  }
  if (ftueOk) {
    return { displayName: inputs.ftueName!.trim(), source: 'ftue', hasCustomized: false };
  }
  return { displayName: inputs.randomFallback, source: 'random', hasCustomized: false };
}
