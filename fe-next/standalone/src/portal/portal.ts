/**
 * Portal SDK adapter — one unified lifecycle API, one concrete impl chosen at
 * BUILD time via `VITE_PORTAL` (poki | crazygames | gamedistribution | none).
 *
 * Why build-time, not runtime: each portal requires ITS OWN external SDK script,
 * and the other portals forbid external scripts. Bundling all three (or loading
 * one at runtime) breaks the "zero external requests" rule on whichever portal
 * you're not on. So we ship one build per portal; the default `none` build loads
 * NO SDK and stays 100% self-contained (itch.io / direct / our own site).
 *
 * Each ad hook mutes game audio for its duration is the CALLER's job (we expose
 * begin/end via the returned promises). All methods are safe no-ops until ready().
 */

export type PortalName = 'poki' | 'crazygames' | 'gamedistribution' | 'none';

export interface Portal {
  readonly name: PortalName;
  /** Load + init the SDK. Resolves even on failure (game must still run). */
  ready(): Promise<void>;
  /** Fire on the player's FIRST input of a round (not on load). */
  gameplayStart(): void;
  /** Fire on any gameplay interruption: round end, pause, results. */
  gameplayStop(): void;
  /** Interstitial between rounds. Resolves when the game may resume. */
  commercialBreak(): Promise<void>;
  /** Optional rewarded ad. Resolves true iff fully watched. */
  rewardedBreak(): Promise<boolean>;
  /** Celebration moment (Poki happytime); no-op elsewhere. */
  happytime(): void;
}

function injectScript(src: string, beforeLoad?: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    if (beforeLoad) beforeLoad();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.addEventListener('load', () => resolve(), { once: true });
    s.addEventListener('error', () => reject(new Error(`sdk load failed: ${src}`)), { once: true });
    document.head.appendChild(s);
  });
}

/** Standalone: no SDK, no external requests. */
export function createNonePortal(): Portal {
  return {
    name: 'none',
    ready: () => Promise.resolve(),
    gameplayStart: () => {},
    gameplayStop: () => {},
    commercialBreak: () => Promise.resolve(),
    rewardedBreak: () => Promise.resolve(false),
    happytime: () => {},
  };
}

interface PokiSDKType {
  init: (opts?: unknown) => Promise<void>;
  setDebug?: (b: boolean) => void;
  gameLoadingStart: () => void;
  gameLoadingFinished: () => void;
  gameplayStart: () => void;
  gameplayStop: () => void;
  commercialBreak: () => Promise<void>;
  rewardedBreak: () => Promise<boolean>;
  happyTime: (v?: number) => void;
}

function createPokiPortal(): Portal {
  const get = () => (window as unknown as { PokiSDK?: PokiSDKType }).PokiSDK;
  return {
    name: 'poki',
    async ready() {
      try {
        await injectScript('https://game-cdn.poki.com/scripts/v2/poki-sdk.js');
        const sdk = get();
        if (!sdk) return;
        await sdk.init().catch(() => {});
        sdk.gameLoadingStart();
        sdk.gameLoadingFinished();
      } catch { /* game runs without ads */ }
    },
    gameplayStart: () => get()?.gameplayStart(),
    gameplayStop: () => get()?.gameplayStop(),
    commercialBreak: () => get()?.commercialBreak() ?? Promise.resolve(),
    rewardedBreak: () => get()?.rewardedBreak() ?? Promise.resolve(false),
    happytime: () => get()?.happyTime(1),
  };
}

interface CGAd { requestAd: (type: 'midgame' | 'rewarded', cbs: { adFinished?: () => void; adError?: (e: unknown) => void; rewardGranted?: () => void }) => void; }
interface CGSDK { init: (opts?: unknown) => Promise<void>; ad: CGAd; game: { gameplayStart: () => void; gameplayStop: () => void; loadingStart: () => void; loadingStop: () => void; happytime: () => void }; }

function createCrazyGamesPortal(): Portal {
  const get = () => (window as unknown as { CrazyGames?: { SDK: CGSDK } }).CrazyGames?.SDK;
  return {
    name: 'crazygames',
    async ready() {
      try {
        await injectScript('https://sdk.crazygames.com/crazygames-sdk-v3.js');
        const sdk = get();
        if (!sdk) return;
        await sdk.init().catch(() => {});
        sdk.game.loadingStart();
        sdk.game.loadingStop();
      } catch { /* game runs without ads */ }
    },
    gameplayStart: () => get()?.game.gameplayStart(),
    gameplayStop: () => get()?.game.gameplayStop(),
    commercialBreak: () => new Promise<void>((resolve) => {
      const sdk = get();
      if (!sdk) return resolve();
      sdk.ad.requestAd('midgame', { adFinished: () => resolve(), adError: () => resolve() });
    }),
    rewardedBreak: () => new Promise<boolean>((resolve) => {
      const sdk = get();
      if (!sdk) return resolve(false);
      let granted = false;
      sdk.ad.requestAd('rewarded', {
        rewardGranted: () => { granted = true; },
        adFinished: () => resolve(granted),
        adError: () => resolve(false),
      });
    }),
    happytime: () => get()?.game.happytime(),
  };
}

interface GdSdk { showAd: (type?: string) => Promise<void>; }

function createGameDistributionPortal(gameId: string): Portal {
  let rewardWatched = false;
  const get = () => (window as unknown as { gdsdk?: GdSdk }).gdsdk;
  return {
    name: 'gamedistribution',
    async ready() {
      try {
        (window as unknown as { GD_OPTIONS?: unknown }).GD_OPTIONS = {
          gameId,
          onEvent: (e: { name?: string }) => { if (e?.name === 'SDK_REWARDED_WATCH_COMPLETE') rewardWatched = true; },
        };
        await injectScript('https://html5.api.gamedistribution.com/main.min.js');
      } catch { /* game runs without ads */ }
    },
    gameplayStart: () => {},
    gameplayStop: () => {},
    async commercialBreak() {
      try { await get()?.showAd('interstitial'); } catch { /* ignore */ }
    },
    async rewardedBreak() {
      rewardWatched = false;
      try { await get()?.showAd('rewarded'); } catch { return false; }
      return rewardWatched;
    },
    happytime: () => {},
  };
}

export function createPortal(): Portal {
  // Static `import.meta.env.VITE_PORTAL` comparisons are replaced with literals at
  // build time, so rollup dead-code-eliminates every non-selected portal impl —
  // the `none`/standalone build ships ZERO portal SDK code (or URL strings).
  if (import.meta.env.VITE_PORTAL === 'poki') return createPokiPortal();
  if (import.meta.env.VITE_PORTAL === 'crazygames') return createCrazyGamesPortal();
  if (import.meta.env.VITE_PORTAL === 'gamedistribution') {
    return createGameDistributionPortal(import.meta.env.VITE_GD_GAME_ID ?? '');
  }
  return createNonePortal();
}
