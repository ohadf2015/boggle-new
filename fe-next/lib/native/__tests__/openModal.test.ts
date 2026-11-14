import { afterEach, describe, expect, it } from 'vitest';
import { hasOpenModal } from '../openModal';

const shownUnlessHidden = (el: Element) => !el.closest('[data-hidden]');

describe('hasOpenModal', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('Given no dialog in the page, Then false', () => {
    document.body.innerHTML = '<main><div class="fixed inset-0">fx</div></main>';
    expect(hasOpenModal(document, shownUnlessHidden)).toBe(false);
  });

  it('Given a visible aria-modal sheet, Then true', () => {
    document.body.innerHTML = '<div role="dialog" aria-modal="true">Ping</div>';
    expect(hasOpenModal(document, shownUnlessHidden)).toBe(true);
  });

  it('Given a visible alertdialog, Then true', () => {
    document.body.innerHTML = '<div role="alertdialog">Sure?</div>';
    expect(hasOpenModal(document, shownUnlessHidden)).toBe(true);
  });

  it('Given an aria-modal node that is mounted but hidden, Then false so the banner still shows', () => {
    document.body.innerHTML = '<nav data-hidden><div role="dialog" aria-modal="true">drawer</div></nav>';
    expect(hasOpenModal(document, shownUnlessHidden)).toBe(false);
  });

  it('Given the sheet is removed, Then false again', () => {
    document.body.innerHTML = '<div id="s" role="dialog" aria-modal="true">x</div>';
    expect(hasOpenModal(document, shownUnlessHidden)).toBe(true);
    document.getElementById('s')!.remove();
    expect(hasOpenModal(document, shownUnlessHidden)).toBe(false);
  });

  it('Given a non-modal dialog role, Then false', () => {
    document.body.innerHTML = '<div role="dialog" aria-modal="false">popover</div>';
    expect(hasOpenModal(document, shownUnlessHidden)).toBe(false);
  });
});
