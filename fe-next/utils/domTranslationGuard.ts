/**
 * Defensive guard against third-party DOM mutations from in-browser page
 * translators (Google Translate, Edge Translator) and similar extensions.
 *
 * When a translator swaps text nodes, React's virtual DOM and the real DOM
 * desync. React then tries to `removeChild`/`insertBefore` a node the
 * translator has already moved or detached, and the browser throws
 * `NotFoundError: Failed to execute 'removeChild' on 'Node'` — a hard,
 * full-page React crash. (Sentry has logged these on translated sessions.)
 *
 * This wraps the two offending `Node.prototype` methods so that, when the
 * target relationship no longer holds, they no-op instead of throwing. It is
 * the widely-used community mitigation for the React + Google Translate crash.
 * It changes nothing for genuine parent/child operations.
 *
 * The real fix for *why* the page is being translated lives in the native
 * language suggestion banner — this is the safety net for when the user
 * keeps the browser translation on regardless.
 */

// Marker stamped on our wrapper functions. We check the live method for this
// rather than a separate boolean so idempotency stays correct even if the
// prototype methods are swapped out from under us.
const GUARD_MARK = '__lexiclashTranslationGuard';

type MarkedFn = { [GUARD_MARK]?: boolean };

function isGuarded(fn: unknown): boolean {
  return typeof fn === 'function' && (fn as MarkedFn)[GUARD_MARK] === true;
}

export function installTranslationDomGuard(): void {
  if (typeof Node === 'undefined' || !Node.prototype) return;

  if (!isGuarded(Node.prototype.removeChild)) {
    const originalRemoveChild = Node.prototype.removeChild;
    const wrappedRemoveChild = function removeChild<T extends Node>(this: Node, child: T): T {
      if (child.parentNode !== this) {
        // The translator already detached/moved this node — pretend success.
        return child;
      }
      return originalRemoveChild.call(this, child) as T;
    };
    (wrappedRemoveChild as MarkedFn)[GUARD_MARK] = true;
    Node.prototype.removeChild = wrappedRemoveChild;
  }

  if (!isGuarded(Node.prototype.insertBefore)) {
    const originalInsertBefore = Node.prototype.insertBefore;
    const wrappedInsertBefore = function insertBefore<T extends Node>(
      this: Node,
      newNode: T,
      referenceNode: Node | null,
    ): T {
      if (referenceNode && referenceNode.parentNode !== this) {
        // The reference node was moved by the translator — append instead of throw.
        return originalInsertBefore.call(this, newNode, null) as T;
      }
      return originalInsertBefore.call(this, newNode, referenceNode) as T;
    };
    (wrappedInsertBefore as MarkedFn)[GUARD_MARK] = true;
    Node.prototype.insertBefore = wrappedInsertBefore;
  }
}
