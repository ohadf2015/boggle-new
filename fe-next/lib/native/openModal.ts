const MODAL_SELECTOR = '[aria-modal="true"], [role="alertdialog"]';

const isShown = (el: Element) => el.getClientRects().length > 0;

/** True while any visible modal dialog is on screen, whoever rendered it. */
export function hasOpenModal(root: ParentNode = document, shown: (el: Element) => boolean = isShown): boolean {
  for (const el of root.querySelectorAll(MODAL_SELECTOR)) {
    if (shown(el)) return true;
  }
  return false;
}
