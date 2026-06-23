/**
 * Ref-counted `html.modal-open` flag — the single source of truth for "a modal /
 * dialog currently owns the screen", read by the native banner coordinator
 * (BannerCoordinatorMount observes `<html>` classes) to suppress the AdMob
 * SurfaceView banner while a modal is open.
 *
 * WHY a ref-counted class (not a boolean): modals can stack (one dialog opens
 * another), and several may mount/unmount in quick succession during a transition.
 * A plain set/clear would let an inner modal's close wrongly clear the flag while
 * an outer modal is still open. We count holders and only drop the class when the
 * last one releases. Mirrors the `html.onboarding-active` / `mobile-drawer-open`
 * class convention so the existing MutationObserver picks it up with no new wiring.
 *
 * SSR-safe: every operation no-ops when `document` is undefined.
 */
export const MODAL_OPEN_CLASS = 'modal-open';

let openCount = 0;

/** A modal mounted — flag the screen as modal-owned (idempotent per holder). */
export function acquireModalOpen(): void {
  if (typeof document === 'undefined') return;
  openCount += 1;
  if (openCount === 1) {
    document.documentElement.classList.add(MODAL_OPEN_CLASS);
  }
}

/** A modal unmounted — clear the flag only when no modal remains open. */
export function releaseModalOpen(): void {
  if (typeof document === 'undefined') return;
  if (openCount === 0) return; // stray release (e.g. double-unmount) — never go negative
  openCount -= 1;
  if (openCount === 0) {
    document.documentElement.classList.remove(MODAL_OPEN_CLASS);
  }
}
