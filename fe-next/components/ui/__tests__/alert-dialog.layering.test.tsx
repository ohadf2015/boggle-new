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

  it('clips horizontal overflow on the fixed modal layer so RTL cannot push it off-screen', () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>לצאת מהמשחק?</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );

    // The dialog renders into a portal at <body> with position:fixed children,
    // which ESCAPE the body's overflow clip (their containing block is the
    // viewport) — and html is `overflow: visible`. So a child wider than the
    // viewport adds document-level horizontal scroll; under RTL the page anchors
    // to the right and the whole game slides off-screen behind a black gap.
    // Clipping x + binding to 100vw on this fixed layer makes that impossible.
    const layer = document.querySelector('.z-\\[101\\]');
    expect(layer).not.toBeNull();
    expect(layer).toHaveClass('overflow-x-hidden');
    expect(layer).toHaveClass('max-w-[100vw]');
  });
});
