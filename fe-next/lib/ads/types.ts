/**
 * Provider-agnostic ad layer.
 *
 * Why a registry: existing hooks branch internally over CrazyGames vs AdMob
 * vs sim vs placeholder. Adding a fourth provider (AppLovin / IronSource /
 * Unity Ads) means editing every hook. Registry inverts the dependency:
 * providers self-register, hooks ask the registry which provider can serve
 * a given slot, fall through on failure. Public hook API stays unchanged.
 */

import type { RewardedSurface, BannerVariant } from '@/lib/admob-config';

export type AdSlotKind = 'rewarded' | 'interstitial' | 'banner';

export interface ShowRewardedRequest {
  surface: RewardedSurface;
  /** Analytics-only; not sent to ad network. */
  analyticsSurface?: string;
}

export interface ShowRewardedResult {
  rewarded: boolean;
  /** Provider id that serviced the request, if any. */
  provider?: string;
  error?: string;
}

export interface ShowInterstitialRequest {
  /** Free-form placement id for analytics + dedup, e.g. 'daily-complete'. */
  placement: string;
}

export interface ShowInterstitialResult {
  shown: boolean;
  provider?: string;
  error?: string;
}

export interface ShowBannerRequest {
  variant: BannerVariant;
  /** Distance from bottom in CSS pixels. */
  margin?: number;
}

export interface ShowBannerResult {
  shown: boolean;
  provider?: string;
  error?: string;
}

/**
 * One provider implements the slot kinds it supports. Missing methods =
 * not supported (registry skips). `isAvailable` is checked per slot kind
 * so a provider can be available for rewarded but not banner (e.g. CG SDK).
 */
export interface AdProvider {
  /** Stable id used for unregister + analytics, e.g. 'admob'. */
  readonly id: string;
  /** Higher = preferred. CG=100, AdMob=50, placeholder=0. Ties = registration order. */
  readonly priority: number;
  isAvailable(kind: AdSlotKind): boolean;
  showRewarded?(req: ShowRewardedRequest): Promise<ShowRewardedResult>;
  showInterstitial?(req: ShowInterstitialRequest): Promise<ShowInterstitialResult>;
  showBanner?(req: ShowBannerRequest): Promise<ShowBannerResult>;
  hideBanner?(): Promise<void>;
}
