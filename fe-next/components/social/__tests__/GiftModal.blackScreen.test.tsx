/**
 * Regression: the Hebrew "black screen" popup bug.
 *
 * GiftModal renders a dark, opaque backdrop (a plain `fixed inset-0 bg-neo-black/60`
 * div) with its actual card content inside. If the card is wrapped in a
 * framer-motion `m.div initial={{ scale: 0.9, opacity: 0 }}`, that content only
 * becomes visible once the main-thread JS animation loop (rAF) advances. When the
 * loop is starved — which happens in Hebrew because parsing the large translation
 * bundle blocks the main thread — the content stays pinned at opacity:0 while the
 * dark backdrop still paints, so the user sees only a black screen.
 *
 * This file uses the REAL framer-motion (the global test mock strips `initial`,
 * which is exactly why the suite never caught the bug) to faithfully reproduce the
 * starved-loop condition: jsdom never drives the animation clock, so an
 * `initial: opacity:0` stays at 0 — the same outcome as a blocked main thread.
 *
 * The fix: the card uses a CSS entrance (`animate-in`) instead, which runs off the
 * main thread and always settles to the natural, visible resting state.
 *
 * Given-When-Then style.
 */

import { vi } from 'vitest';
// Use the REAL framer-motion so this test reproduces the production bug.
vi.unmock('framer-motion');

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { LazyMotion, domMax } from 'framer-motion';
import GiftModal from '../GiftModal';
import { LanguageProvider } from '@/contexts/LanguageContext';

function renderModal() {
  return render(
    <LazyMotion features={domMax}>
      <LanguageProvider>
        <GiftModal
          isOpen
          onClose={vi.fn()}
          onSend={vi.fn()}
          recipientName="Bob"
          senderBalance={100}
          giftsRemaining={2}
        />
      </LanguageProvider>
    </LazyMotion>
  );
}

describe('GiftModal — Hebrew black-screen regression', () => {
  it('does not pin the card content invisible when the animation loop never runs', async () => {
    // Given the modal is open over its dark backdrop
    renderModal();
    // When the main-thread animation loop never advances (jsdom never drives it)
    await act(async () => {
      await new Promise((res) => setTimeout(res, 60));
    });
    // Then the card wrapping all the visible content is NOT stuck at opacity:0
    const backdrop = screen.getByTestId('gift-modal');
    const card = backdrop.firstElementChild as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.style.opacity).not.toBe('0');
  });

  it('keeps the send button reachable (content actually rendered, not just present)', async () => {
    renderModal();
    await act(async () => {
      await new Promise((res) => setTimeout(res, 60));
    });
    // The send button lives inside the card; it must not be inside an
    // opacity:0-pinned ancestor.
    const sendButton = screen.getByTestId('send-gift-button');
    expect(sendButton).toBeInTheDocument();
    const card = screen.getByTestId('gift-modal').firstElementChild as HTMLElement;
    expect(card.style.opacity).not.toBe('0');
  });
});
