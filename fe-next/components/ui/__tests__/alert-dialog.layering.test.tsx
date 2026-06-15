import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from '../alert-dialog';

describe('AlertDialogContent layering', () => {
  it('stacks the content wrapper ABOVE the overlay with a real z-[101] class', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Leave game?</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );

    // The centering wrapper must use a VALID Tailwind arbitrary utility so it
    // actually emits a z-index above the overlay (z-[100]). The old `z-101`
    // class is not in the tailwind config and emits no CSS, leaving the dialog
    // behind the opaque black overlay (the "black backdrop on exit" bug).
    expect(document.querySelector('.z-\\[101\\]')).not.toBeNull();
    expect(document.querySelector('.z-101')).toBeNull();
  });
});
