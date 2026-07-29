/**
 * Provider-agnostic ad registry. Holds zero knowledge of any specific
 * network — providers are injected at runtime (typically once at app boot
 * by the AdProvidersHost component). Hooks query the registry instead of
 * branching on platform.
 *
 * Fall-through semantics:
 *   - Providers tried in priority order (high → low) for the requested slot
 *   - "Failure" = method missing, isAvailable false, throws, or returns
 *     {rewarded:false} / {shown:false}
 *   - Last failure's error string is preserved on the final result for
 *     telemetry; nothing else is leaked to the caller.
 */

import type {
  AdProvider,
  AdSlotKind,
  ShowBannerRequest,
  ShowBannerResult,
  ShowInterstitialRequest,
  ShowInterstitialResult,
  ShowRewardedRequest,
  ShowRewardedResult,
} from './types';

export class AdRegistry {
  private providers: AdProvider[] = [];

  register(provider: AdProvider): void {
    const idx = this.providers.findIndex((p) => p.id === provider.id);
    if (idx >= 0) {
      this.providers[idx] = provider;
    } else {
      this.providers.push(provider);
    }
  }

  unregister(id: string): void {
    this.providers = this.providers.filter((p) => p.id !== id);
  }

  list(): readonly AdProvider[] {
    return [...this.providers];
  }

  /**
   * Returns the highest-priority provider that supports `kind`, or null.
   * "Supports" = has the slot's method AND isAvailable(kind) is true.
   */
  selectFor(kind: AdSlotKind): AdProvider | null {
    const candidates = this.candidatesFor(kind);
    return candidates[0] ?? null;
  }

  async showRewarded(req: ShowRewardedRequest): Promise<ShowRewardedResult> {
    const candidates = this.candidatesFor('rewarded');
    let lastError: string | undefined;
    for (const p of candidates) {
      try {
        const result = await p.showRewarded!(req);
        if (result.rewarded) {
          return { ...result, provider: p.id };
        }
        lastError = result.error ?? lastError;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }
    return { rewarded: false, error: lastError };
  }

  async showInterstitial(req: ShowInterstitialRequest): Promise<ShowInterstitialResult> {
    const candidates = this.candidatesFor('interstitial');
    let lastError: string | undefined;
    for (const p of candidates) {
      try {
        const result = await p.showInterstitial!(req);
        if (result.shown) {
          return { ...result, provider: p.id };
        }
        lastError = result.error ?? lastError;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }
    return { shown: false, error: lastError };
  }

  async showBanner(req: ShowBannerRequest): Promise<ShowBannerResult> {
    const candidates = this.candidatesFor('banner');
    let lastError: string | undefined;
    for (const p of candidates) {
      try {
        const result = await p.showBanner!(req);
        if (result.shown) {
          return { ...result, provider: p.id };
        }
        lastError = result.error ?? lastError;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }
    return { shown: false, error: lastError };
  }

  /**
   * Hide on ALL banner-capable providers — race conditions between provider
   * banner mounts have bitten us before (memory: AdMob banner race fix
   * 2026-04-29). Belt + suspenders.
   */
  async hideBanner(): Promise<void> {
    const targets = this.providers.filter((p) => typeof p.hideBanner === 'function');
    await Promise.all(
      targets.map(async (p) => {
        try {
          await p.hideBanner!();
        } catch {
          /* swallow — hide is best-effort */
        }
      }),
    );
  }

  private candidatesFor(kind: AdSlotKind): AdProvider[] {
    return this.providers
      .filter((p) => this.supports(p, kind) && p.isAvailable(kind))
      .sort((a, b) => b.priority - a.priority);
  }

  private supports(p: AdProvider, kind: AdSlotKind): boolean {
    switch (kind) {
      case 'rewarded':
        return typeof p.showRewarded === 'function';
      case 'interstitial':
        return typeof p.showInterstitial === 'function';
      case 'banner':
        return typeof p.showBanner === 'function';
    }
  }
}

/** Default singleton used by app code. Tests instantiate their own. */
export const adRegistry = new AdRegistry();
