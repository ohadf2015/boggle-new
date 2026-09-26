/**
 * ReadyButton — the joiner's lobby primary. The integration critic found READY UP!
 * resting as a lime OUTLINE while INVITE/SHARE were solid lime: the one thing a
 * joiner must do looked optional. Resting = the single solid-lime CTA; once ready
 * it steps down to an outlined "ready" state (tap again to un-ready).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReadyButton } from '../ReadyButton';

const t = (k: string) => k;
const SOLID_LIME = /\bbg-neo-lime(?![/\w-])/;

describe('ReadyButton — lobby CTA hierarchy', () => {
  it('resting READY UP! is the solid-lime primary', () => {
    render(<ReadyButton isReady={false} onToggle={vi.fn()} inFlight={false} t={t} />);
    const btn = screen.getByTestId('ready-button');
    expect(btn.className).toMatch(SOLID_LIME);
    expect(btn.className).toMatch(/\btext-neo-black\b/);
    expect(btn).toHaveTextContent('playerView.readyUp');
  });

  it('once ready it steps down to a lime-outline confirmed state', () => {
    render(<ReadyButton isReady onToggle={vi.fn()} inFlight={false} t={t} />);
    const btn = screen.getByTestId('ready-button');
    expect(btn.className).not.toMatch(SOLID_LIME);
    expect(btn.className).toContain('border-neo-lime');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveTextContent('playerView.readyConfirmed');
  });
});
