import type { BannerVariant } from '@/lib/admob-config';

/**
 * Banner ad coordinator — single owner of the one native AdMob banner instance.
 *
 * WHY: `AnchoredNativeBanner` (global, anchored above the bottom nav) and
 * `InlineBannerAd` (page slot, ~50 content + results routes) both drove the
 * single plugin banner directly, with different margins AND ad-unit variants.
 * They raced: a slot owner's `hideBanner()` on unmount left the banner blank
 * because the anchor owner didn't re-assert. This coordinator makes both
 * owners declare *intent* (`setRequest`); the highest-priority intent wins, and
 * releasing the slot falls back to the anchor instead of going blank.
 *
 * It also owns recovery the per-component code couldn't: a bounded retry after
 * an initial no-fill (the native AdView is destroyed and never re-shown today —
 * see docs/2026-06-04-banner-stability-coordinator-spec.md), and a re-assert on
 * app foreground (a backgrounded WebView can drop the banner's GPU surface).
 *
 * Pure-data core (`selectActiveBannerRequest`) is split out so priority logic is
 * unit-testable without the plugin; the controller injects its `show`/`hide`
 * ops so the existing `useAdMob` repaint-kick / height-cap behavior is preserved.
 */

export interface BannerRequest {
  /** px lift from the WebView bottom (already safe-area-adjusted by the owner). */
  margin: number;
  /** Ad-unit variant the active owner wants ('game' slot vs 'content' anchor). */
  variant: BannerVariant;
  /** Higher wins. SLOT (InlineBannerAd) = 2 beats ANCHOR (AnchoredNativeBanner) = 1. */
  priority: number;
}

/** Highest-priority present request, or null when no owner wants the banner. */
export function selectActiveBannerRequest(
  requests: Record<string, BannerRequest | null | undefined>,
): BannerRequest | null {
  let best: BannerRequest | null = null;
  for (const key of Object.keys(requests)) {
    const r = requests[key];
    if (!r) continue;
    if (best === null || r.priority > best.priority) best = r;
  }
  return best;
}

/**
 * Pure suppression policy — decides whether the native banner must be globally
 * hidden, independent of which owner currently wants it. Split out so the policy
 * is unit-testable without the DOM/observer.
 *
 * Design: in-game suppression is OPT-OUT. Any fullscreen game (NavigationContext
 * sets `body.screen-fit-locked` when `isInGame`) hides the banner BY DEFAULT, so a
 * new game mode can never accidentally composite an ad over its bottom controls —
 * no route blocklist to keep in sync. A screen that genuinely reserves banner room
 * (only `/adventure` today, via `--admob-banner-height`) opts back in by flagging
 * `html.banner-allow-in-game`. The drawer always wins (an open side menu must never
 * have the SurfaceView banner painted on top of it).
 */
export function shouldSuppressBanner(input: {
  drawerOpen: boolean;
  inGame: boolean;
  allowInGame: boolean;
}): boolean {
  return input.drawerOpen || (input.inGame && !input.allowInGame);
}

export interface BannerOps {
  show: (margin: number, variant: BannerVariant) => Promise<void> | void;
  hide: () => Promise<void> | void;
}

interface AppliedState {
  visible: boolean;
  margin: number;
  variant: BannerVariant | null;
}

export interface BannerControllerConfig {
  /** Backoff schedule for re-showing after an initial no-fill. */
  retryDelaysMs?: number[];
  setTimeoutFn?: (cb: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeoutFn?: (handle: ReturnType<typeof setTimeout>) => void;
  /**
   * Max time a single native show()/hide() may block the serialization chain.
   * The @capacitor-community/admob native showBanner() does NOT resolve its
   * PluginCall on the re-show path (mAdView != null → updateExistingAdView →
   * returns without call.resolve()) — confirmed on-device: showBanner() stays
   * PENDING forever while the banner DOES render. Without a cap, the first
   * re-show's `await ops.show()` freezes `this.chain` permanently, so every
   * later suppress/hide/reassert queues behind it and never runs (the
   * app-wide "drawer doesn't hide the banner / banner never updates" bug).
   * On timeout we proceed (the banner is already painted) so the chain keeps
   * flowing. The proper native fix (resolve the call on the re-show path) is
   * release-gated; this keeps the web-deployed JS resilient meanwhile.
   */
  opTimeoutMs?: number;
}

const NO_BANNER: AppliedState = { visible: false, margin: -1, variant: null };

export class BannerController {
  private requests: Record<string, BannerRequest> = {};
  private ops: BannerOps | null = null;
  private applied: AppliedState = { ...NO_BANNER };
  // Global hide override, independent of owner intent. The native banner is a
  // SurfaceView composited ABOVE the WebView, so an open side menu / drawer
  // can't cover it with z-index — we hide it outright while suppressed and
  // re-show the active request on release. Owns both banner owners (anchor +
  // slot) uniformly, so it doesn't matter which one is currently winning.
  private suppressed = false;
  // Bumped by every "force" (reassert / retry / re-attach). reconcile coalesces
  // only when the applied state was produced at the CURRENT generation — so a
  // force that lands while a show() is mid-await can't be swallowed by that
  // show's post-await `applied` assignment (it carries the stale generation, so
  // the next queued reconcile re-shows).
  private generation = 0;
  private appliedGeneration = -1;
  // Serialize all show/hide through one promise chain so concurrent owners
  // (and retries) can never interleave a hide between a show and its reload.
  private chain: Promise<void> = Promise.resolve();
  private readonly retryDelays: number[];
  private retryAttempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly setTimeoutFn: (cb: () => void, ms: number) => ReturnType<typeof setTimeout>;
  private readonly clearTimeoutFn: (handle: ReturnType<typeof setTimeout>) => void;
  private readonly opTimeoutMs: number;

  constructor(config: BannerControllerConfig = {}) {
    this.retryDelays = config.retryDelaysMs ?? [1500, 4000, 10000];
    this.setTimeoutFn = config.setTimeoutFn ?? ((cb, ms) => setTimeout(cb, ms));
    this.clearTimeoutFn = config.clearTimeoutFn ?? ((h) => clearTimeout(h));
    this.opTimeoutMs = config.opTimeoutMs ?? 4000;
  }

  /** Inject the plugin ops (native mount) or null (web / teardown). */
  setOps(ops: BannerOps | null): Promise<void> {
    this.ops = ops;
    // DO NOT reset applied state when re-wiring ops. The native SurfaceView
    // survives a JS effect churn / re-render (e.g. BannerCoordinatorMount
    // re-running due to callback identity changes). Falsely claiming
    // "applied=NO_BANNER" causes suppress to skip hide() later because
    // reconcile() sees applied.visible===false and believes nothing is shown.
    // Instead, force a reconcile (which bumps generation so coalescing fails,
    // genuinely re-showing the active request) — the forceReconcile will
    // restore applied state to match reality per the active request.
    return ops ? this.forceReconcile() : Promise.resolve();
  }

  /** Owner declares (or, with null, withdraws) its banner intent. */
  setRequest(key: string, req: BannerRequest | null): Promise<void> {
    if (req) this.requests[key] = req;
    else delete this.requests[key];
    this.resetRetry(); // fresh intent → fresh recovery budget
    return this.schedule();
  }

  clearRequest(key: string): Promise<void> {
    return this.setRequest(key, null);
  }

  /**
   * Globally hide (true) or restore (false) the banner regardless of owner
   * intent — e.g. an open side menu / mobile drawer that the native overlay
   * would otherwise composite on top of. A release force-reconciles so the
   * active request re-shows without the owner having to re-declare it.
   */
  setSuppressed(suppressed: boolean): Promise<void> {
    if (this.suppressed === suppressed) return this.chain;
    this.suppressed = suppressed;
    // Release must re-show even when the active request is unchanged (the hide
    // left applied=NO_BANNER, but a coalesce on identical margin could still
    // bite at the same generation) — force it.
    return suppressed ? this.schedule() : this.forceReconcile();
  }

  /** A banner loaded successfully — healthy, drop any retry budget. */
  notifyLoaded(): void {
    this.resetRetry();
  }

  /**
   * The native banner failed to load. The plugin only forwards this on an
   * INITIAL no-fill (after a successful load it suppresses refresh failures via
   * the bannerHasLoaded patch), so the AdView was destroyed. If an owner still
   * wants the banner, schedule a bounded backoff re-show.
   */
  notifyFailed(): void {
    if (!selectActiveBannerRequest(this.requests)) return; // nobody wants it — nothing to recover
    if (this.retryAttempt >= this.retryDelays.length) return; // budget spent; re-armed by a natural trigger
    const delay = this.retryDelays[this.retryAttempt];
    this.retryAttempt += 1;
    if (this.retryTimer) this.clearTimeoutFn(this.retryTimer);
    this.retryTimer = this.setTimeoutFn(() => {
      this.retryTimer = null;
      void this.forceReconcile(); // banner is gone natively → force a real re-show
    }, delay);
  }

  /** App returned to foreground / tab visible — surface may be gone, force a re-show. */
  reassert(): Promise<void> {
    this.resetRetry();
    return this.forceReconcile();
  }

  /** Bump the generation so the next reconcile cannot coalesce, then run it. */
  private forceReconcile(): Promise<void> {
    this.generation += 1;
    return this.schedule();
  }

  /** Test/utility hook: resolves when the current reconcile queue drains. */
  whenIdle(): Promise<void> {
    return this.chain;
  }

  private resetRetry(): void {
    this.retryAttempt = 0;
    if (this.retryTimer) {
      this.clearTimeoutFn(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private schedule(): Promise<void> {
    this.chain = this.chain.then(() => this.reconcile()).catch(() => {});
    return this.chain;
  }

  /**
   * Await a native op but never let it block the chain longer than opTimeoutMs.
   * The plugin's showBanner() can stay PENDING forever on the re-show path
   * (native bug — see opTimeoutMs doc), which would otherwise freeze every
   * subsequent op. A real resolve/reject settles immediately (timer cleared);
   * a hang resolves on timeout so reconcile can proceed (the banner has already
   * painted by the time native would have resolved).
   */
  private withOpTimeout(op: () => Promise<void> | void): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const timer = this.setTimeoutFn(() => {
        if (settled) return;
        settled = true;
        resolve(); // native call hung — proceed so the chain isn't frozen
      }, this.opTimeoutMs);
      const finish = (err?: unknown) => {
        if (settled) return;
        settled = true;
        this.clearTimeoutFn(timer);
        if (err === undefined) resolve();
        else reject(err); // a real failure → don't mark applied
      };
      // Invoke op() SYNCHRONOUSLY (matches the prior direct `await ops.show()`
      // call timing — owners rely on the native call firing this tick), then
      // wrap whatever it returns.
      let p: Promise<void>;
      try {
        p = Promise.resolve(op());
      } catch (err) {
        finish(err ?? new Error('banner op threw'));
        return;
      }
      p.then(() => finish(), (err) => finish(err ?? new Error('banner op rejected')));
    });
  }

  private async reconcile(): Promise<void> {
    if (!this.ops) return;
    const gen = this.generation;
    // Suppressed → behave as if no owner wants the banner (hide if shown).
    const active = this.suppressed ? null : selectActiveBannerRequest(this.requests);

    if (!active) {
      // When suppressed (drawer open), always call hide() to be sure the native
      // banner is gone, even if applied.visible===false (e.g. after a churn).
      // If applied already claimed nothing shown, hide() is idempotent (plugin
      // returns benign "no banner" error which useAdMob swallows). This resilience
      // ensures suppress works even if:
      // - setOps churn left applied={visible:false} despite native showing
      // - getConfig() early-return in ops.hide() swallows the call last time
      // - A prior reconcile's applied state got out of sync with native reality
      if (this.applied.visible || this.suppressed) {
        await this.withOpTimeout(() => this.ops!.hide());
        this.applied = { ...NO_BANNER };
      }
      this.appliedGeneration = gen;
      return;
    }

    // Coalesce: identical applied state at the current generation → no native
    // churn (scroll/mutation spam). A force (reassert/retry) bumps the
    // generation so this guard fails and the banner is genuinely re-shown.
    if (
      this.applied.visible &&
      this.applied.margin === active.margin &&
      this.applied.variant === active.variant &&
      this.appliedGeneration === gen
    ) {
      return;
    }

    // showBanner() may never resolve on the native re-show path (see
    // opTimeoutMs) — bound the await so a hung show can't freeze the chain and
    // block later suppress/hide/reassert. The banner still paints; we record it
    // as applied either way.
    await this.withOpTimeout(() => this.ops!.show(active.margin, active.variant));
    this.applied = { visible: true, margin: active.margin, variant: active.variant };
    this.appliedGeneration = gen;
  }
}

/** Owner keys + priorities (single source of truth for the two banner owners). */
export const BANNER_OWNER = {
  anchor: { key: 'anchor', priority: 1 },
  slot: { key: 'slot', priority: 2 },
} as const;

/** App-wide singleton coordinating the single native banner. */
export const bannerController = new BannerController();
