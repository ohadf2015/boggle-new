/**
 * "A modal overlay owns the screen" — detected from the DOM, not opted into.
 *
 * WHY: the native AdMob banner is a SurfaceView composited ABOVE the WebView, so
 * no z-index can put an overlay over it. Every overlay therefore has to stand the
 * banner down while it is open. `html.modal-open` (modalOpenSignal) only covers
 * the shared DialogContent and the few custom modals that remembered to call
 * acquireModalOpen(); ~70 hand-rolled portals (chest/prize reveals, weekly chest,
 * streak + season popups, sheets…) never did, so the banner painted over their
 * main CTA. Player report 2026-11-14: the legendary chest reveal's "wear it"
 * button sat under the banner.
 *
 * Instead of patching each overlay, we watch the DOM for the accessibility
 * contract every modal overlay already carries — `aria-modal="true"` (or
 * role="alertdialog", or an explicit `data-blocks-banner` marker) — and mirror
 * "any such element is shown" onto `<html>.blocking-overlay-open`, which
 * BannerCoordinatorMount folds into its modal suppress. New overlays get the
 * behaviour for free as long as they are marked up as modal dialogs.
 *
 * SSR-safe: callers only start the watch from an effect.
 */
export const BLOCKING_OVERLAY_CLASS = 'blocking-overlay-open';

export const BLOCKING_OVERLAY_SELECTOR =
  '[aria-modal="true"], [role="alertdialog"], [data-blocks-banner="true"]';

/** Shown = in the tree, not `hidden`, no display:none ancestor, not visibility:hidden. */
function isShown(el: Element): boolean {
  if (!el.isConnected) return false;
  const withCheck = el as Element & { checkVisibility?: (o?: { visibilityProperty?: boolean }) => boolean };
  // Native WebViews (Chrome 105+, Safari 17.4+) answer this in one call.
  if (typeof withCheck.checkVisibility === 'function') {
    return withCheck.checkVisibility({ visibilityProperty: true });
  }
  const view = el.ownerDocument?.defaultView;
  if (!view) return true;
  if (view.getComputedStyle(el).visibility === 'hidden') return false;
  for (let node: Element | null = el; node; node = node.parentElement) {
    if ((node as HTMLElement).hidden) return false;
    if (view.getComputedStyle(node).display === 'none') return false;
  }
  return true;
}

const COALESCE_MS = 50;

export function hasBlockingOverlay(doc: Document): boolean {
  const nodes = doc.querySelectorAll(BLOCKING_OVERLAY_SELECTOR);
  for (let i = 0; i < nodes.length; i += 1) {
    if (isShown(nodes[i])) return true;
  }
  return false;
}

/**
 * Keep `<html>.blocking-overlay-open` in sync with the DOM. Re-checks are
 * coalesced (one per ~50ms burst), and only node insert/remove and the few
 * attributes that can open/close a modal are observed (never class/style), so
 * gameplay animation churn does not trigger work.
 * Returns a stop function that disconnects and clears the class.
 */
export function startBlockingOverlayWatch(
  doc: Document,
  onChange?: (open: boolean) => void,
): () => void {
  const root = doc.documentElement;
  let open = false;
  let pending: ReturnType<typeof setTimeout> | null = null;

  const apply = () => {
    pending = null;
    const next = hasBlockingOverlay(doc);
    if (next === open) return;
    open = next;
    root.classList.toggle(BLOCKING_OVERLAY_CLASS, next);
    onChange?.(next);
  };

  // A short timeout (not rAF): rAF pauses in a backgrounded WebView, and one
  // re-check per burst of mutations is all we need.
  const schedule = () => {
    if (pending !== null) return;
    pending = setTimeout(apply, COALESCE_MS);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(doc.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-modal', 'role', 'hidden', 'data-blocks-banner'],
  });
  apply(); // reflect an overlay that is already open at start

  return () => {
    observer.disconnect();
    if (pending !== null) {
      clearTimeout(pending);
      pending = null;
    }
    root.classList.remove(BLOCKING_OVERLAY_CLASS);
    open = false;
  };
}
