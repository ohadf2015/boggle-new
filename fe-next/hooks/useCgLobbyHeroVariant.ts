import { useRef } from 'react';

const SEEN_KEY = 'lexiclash_cg_seen';

export type CgLobbyHeroVariant = 'first-timer' | 'returning-named' | 'returning-anon';

export interface CgLobbyHeroVariantResult {
  variant: CgLobbyHeroVariant;
  displayName: string | null;
  markSeen: () => void;
}

interface CgUserLike {
  username: string | null;
}

/**
 * Computes the CrazyGames lobby hero variant ONCE on mount. The variant is
 * intentionally sticky for the lifetime of the hero — mid-session SDK
 * resolutions or storage writes do not re-trigger a variant change, which
 * would cause the greeting copy to flash mid-render.
 */
export function useCgLobbyHeroVariant(
  cgUser: CgUserLike | null,
): CgLobbyHeroVariantResult {
  const computed = useRef<CgLobbyHeroVariantResult | null>(null);

  if (computed.current === null) {
    let seen = false;
    try {
      seen = typeof window !== 'undefined' && window.localStorage.getItem(SEEN_KEY) === '1';
    } catch {
      seen = false;
    }

    let variant: CgLobbyHeroVariant;
    let displayName: string | null = null;

    if (cgUser?.username) {
      variant = 'returning-named';
      displayName = cgUser.username;
    } else if (seen) {
      variant = 'returning-anon';
    } else {
      variant = 'first-timer';
    }

    const markSeen = () => {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(SEEN_KEY, '1');
        }
      } catch {
        /* storage blocked — degrade silently */
      }
    };

    computed.current = { variant, displayName, markSeen };
  }

  return computed.current;
}
