import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Dialog, DialogContent, DialogTitle } from '../dialog';
import { MODAL_OPEN_CLASS } from '@/lib/native/modalOpenSignal';

const hasModalClass = () => document.documentElement.classList.contains(MODAL_OPEN_CLASS);

// This project does NOT auto-cleanup React Testing Library between tests, and the
// modal-open flag is a module-level ref count, so each test unmounts explicitly and
// we hard-reset the class to keep tests independent.
beforeEach(() => {
  document.documentElement.classList.remove(MODAL_OPEN_CLASS);
});

describe('DialogContent → html.modal-open (native banner suppression)', () => {
  it('does NOT flag modal-open while the dialog is closed', () => {
    const { unmount } = render(
      <Dialog open={false}>
        <DialogContent>
          <DialogTitle>Hi</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(hasModalClass()).toBe(false);
    unmount();
  });

  it('flags modal-open while the dialog is open', () => {
    const { unmount } = render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Hi</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(hasModalClass()).toBe(true);
    unmount();
    expect(hasModalClass()).toBe(false); // unmount releases the flag
  });

  it('clears modal-open when the dialog closes (Content unmounts)', () => {
    const { rerender, unmount } = render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Hi</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(hasModalClass()).toBe(true);

    rerender(
      <Dialog open={false}>
        <DialogContent>
          <DialogTitle>Hi</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(hasModalClass()).toBe(false);
    unmount();
  });

  it('keeps the flag until the last of two stacked dialogs closes', () => {
    const { unmount: unmountInner } = render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Inner</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const { unmount: unmountOuter } = render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Outer</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(hasModalClass()).toBe(true);

    unmountInner();
    expect(hasModalClass()).toBe(true); // one dialog still open

    unmountOuter();
    expect(hasModalClass()).toBe(false); // last one closed
  });
});
