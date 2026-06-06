export type AdPlatform = 'android' | 'ios';
export type RewardedSurface = 'generic' | 'hint' | 'doubleGold' | 'freeze' | 'retry' | 'timeLow' | 'catchup';
export type BannerVariant = 'game' | 'content';

export interface AdmobConfig {
  /** Generic rewarded unit (legacy field). Mirrors rewardedUnits.generic. */
  rewardedAdId: string;
  interstitialAdId: string;
  /** Game banner unit (legacy field). Mirrors bannerUnits.game. */
  bannerAdId: string;
  /** Per-surface rewarded unit IDs for AdMob waterfall segmentation. */
  rewardedUnits: Record<RewardedSurface, string>;
  /** Per-surface banner unit IDs (game vs content browsing). */
  bannerUnits: Record<BannerVariant, string>;
  /**
   * Surfaces whose AdMob unit is a Rewarded INTERSTITIAL (the "Ad 1 of 2"
   * creative) and must be driven through the rewarded-interstitial API instead
   * of the rewarded-video API. Empty by default — set
   * NEXT_PUBLIC_ADMOB_REWARDED_INTERSTITIAL_SURFACES (comma list, or "all")
   * to match the dashboard unit types. See useAdMob.showRewarded.
   */
  rewardedInterstitialSurfaces: RewardedSurface[];
}

const ALL_REWARDED_SURFACES: RewardedSurface[] = [
  'generic', 'hint', 'doubleGold', 'freeze', 'retry', 'timeLow', 'catchup',
];

/** Parse the comma-separated surface allowlist; "all" expands to every surface. */
function parseRewardedInterstitialSurfaces(): RewardedSurface[] {
  const raw = process.env.NEXT_PUBLIC_ADMOB_REWARDED_INTERSTITIAL_SURFACES;
  if (typeof raw !== 'string' || raw.trim().length === 0) return [];
  const valid = new Set<string>(ALL_REWARDED_SURFACES);
  const tokens = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (tokens.includes('all')) return [...ALL_REWARDED_SURFACES];
  return tokens.filter((t): t is RewardedSurface => valid.has(t));
}

// Production AdMob unit IDs for publisher ca-pub-1896836706464880.
// iOS falls back to the Android production unit IDs when iOS-specific env
// vars are not provided — keeps real ads serving on both platforms.
type DefaultsEntry = {
  rewardedAdId: string;
  interstitialAdId: string;
  bannerAdId: string;
  contentBannerAdId: string;
  rewardedSurfaceIds: Record<Exclude<RewardedSurface, 'generic'>, string>;
};

const ANDROID_DEFAULTS: DefaultsEntry = {
  rewardedAdId: 'ca-app-pub-1896836706464880/3688045325',
  interstitialAdId: 'ca-app-pub-1896836706464880/2374963657',
  bannerAdId: 'ca-app-pub-1896836706464880/7714920248',
  contentBannerAdId: 'ca-app-pub-1896836706464880/7143409299',
  rewardedSurfaceIds: {
    hint: 'ca-app-pub-1896836706464880/7663863052',
    doubleGold: 'ca-app-pub-1896836706464880/9769572636',
    freeze: 'ca-app-pub-1896836706464880/5950581279',
    retry: 'ca-app-pub-1896836706464880/5028381841',
    timeLow: 'ca-app-pub-1896836706464880/3715300178',
    // Catch-up reuses the retry unit (same "unlock a play" semantics) until a
    // dedicated unit is wanted — override via NEXT_PUBLIC_ADMOB_REWARDED_CATCHUP.
    catchup: 'ca-app-pub-1896836706464880/5028381841',
  },
};

export const DEFAULTS: Record<AdPlatform, DefaultsEntry> = {
  android: ANDROID_DEFAULTS,
  ios: ANDROID_DEFAULTS,
};

const REWARDED_SURFACE_ENV_KEY: Record<Exclude<RewardedSurface, 'generic'>, string> = {
  hint: 'HINT',
  doubleGold: 'DOUBLE_GOLD',
  freeze: 'FREEZE',
  retry: 'RETRY',
  timeLow: 'TIME_LOW',
  catchup: 'CATCHUP',
};

function pickEnv(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

function resolveRewardedSurface(
  surface: RewardedSurface,
  platform: AdPlatform,
  platformSuffix: 'ANDROID' | 'IOS',
  fallbackGeneric: string,
): string {
  if (surface === 'generic') return fallbackGeneric;
  const segment = REWARDED_SURFACE_ENV_KEY[surface];
  // Per-surface chain: platform env → cross-platform env → hard-coded
  // surface default → generic. The hard-coded default lets new units serve
  // immediately without env-var deploys, and keeps the legacy generic as a
  // last resort if a unit is later removed from AdMob.
  return (
    pickEnv(
      `NEXT_PUBLIC_ADMOB_REWARDED_${segment}_${platformSuffix}`,
      `NEXT_PUBLIC_ADMOB_REWARDED_${segment}`,
    ) ??
    DEFAULTS[platform].rewardedSurfaceIds[surface] ??
    fallbackGeneric
  );
}

export function getAdmobConfig(platform: AdPlatform): AdmobConfig {
  const suffix = platform === 'android' ? 'ANDROID' : 'IOS';

  const genericRewarded =
    pickEnv(`NEXT_PUBLIC_ADMOB_REWARDED_${suffix}`, 'NEXT_PUBLIC_ADMOB_REWARDED_ID') ??
    DEFAULTS[platform].rewardedAdId;

  const interstitial =
    pickEnv(`NEXT_PUBLIC_ADMOB_INTERSTITIAL_${suffix}`, 'NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID') ??
    DEFAULTS[platform].interstitialAdId;

  const gameBanner =
    pickEnv(`NEXT_PUBLIC_ADMOB_BANNER_${suffix}`, 'NEXT_PUBLIC_ADMOB_BANNER_ID') ??
    DEFAULTS[platform].bannerAdId;

  const contentBanner =
    pickEnv(
      `NEXT_PUBLIC_ADMOB_BANNER_CONTENT_${suffix}`,
      'NEXT_PUBLIC_ADMOB_BANNER_CONTENT',
    ) ??
    DEFAULTS[platform].contentBannerAdId ??
    gameBanner;

  const rewardedUnits: Record<RewardedSurface, string> = {
    generic: genericRewarded,
    hint: resolveRewardedSurface('hint', platform, suffix, genericRewarded),
    doubleGold: resolveRewardedSurface('doubleGold', platform, suffix, genericRewarded),
    freeze: resolveRewardedSurface('freeze', platform, suffix, genericRewarded),
    retry: resolveRewardedSurface('retry', platform, suffix, genericRewarded),
    timeLow: resolveRewardedSurface('timeLow', platform, suffix, genericRewarded),
    catchup: resolveRewardedSurface('catchup', platform, suffix, genericRewarded),
  };

  return {
    rewardedAdId: rewardedUnits.generic,
    interstitialAdId: interstitial,
    bannerAdId: gameBanner,
    rewardedUnits,
    bannerUnits: { game: gameBanner, content: contentBanner },
    rewardedInterstitialSurfaces: parseRewardedInterstitialSurfaces(),
  };
}
