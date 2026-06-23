import { describe, it, expect, beforeEach } from 'vitest';
import { acquireModalOpen, releaseModalOpen, MODAL_OPEN_CLASS } from './modalOpenSignal';

const hasClass = () => document.documentElement.classList.contains(MODAL_OPEN_CLASS);

describe('modalOpenSignal (ref-counted html.modal-open)', () => {
  beforeEach(() => {
    // Drain any leftover count between tests so each starts clean.
    while (hasClass()) releaseModalOpen();
    document.documentElement.classList.remove(MODAL_OPEN_CLASS);
  });

  it('adds the class on the first acquire', () => {
    expect(hasClass()).toBe(false);
    acquireModalOpen();
    expect(hasClass()).toBe(true);
  });

  it('removes the class only when the last holder releases (stacked modals)', () => {
    acquireModalOpen();
    acquireModalOpen(); // a second modal opened on top of the first
    expect(hasClass()).toBe(true);

    releaseModalOpen(); // top modal closed — first is still open
    expect(hasClass()).toBe(true);

    releaseModalOpen(); // last modal closed
    expect(hasClass()).toBe(false);
  });

  it('never lets the count go negative (extra release is a no-op)', () => {
    releaseModalOpen();
    expect(hasClass()).toBe(false);
    acquireModalOpen();
    expect(hasClass()).toBe(true);
    releaseModalOpen();
    releaseModalOpen(); // stray release must not flip the class back off-by-one
    expect(hasClass()).toBe(false);
  });
});
