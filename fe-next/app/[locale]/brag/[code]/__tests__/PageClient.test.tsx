import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BragPageClient from '../PageClient';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

describe('BragPageClient', () => {
  it('Given a room result, Then the CTA joins that room', () => {
    render(<BragPageClient locale="en" code="ABC123" imageQuery="score=1" hasRival kind="result" />);
    expect(screen.getByText('brag.page.cta').closest('a')?.getAttribute('href')).toContain('room=ABC123');
  });

  it('Given a personal moment, Then the CTA goes to play, never to a room join', () => {
    render(<BragPageClient locale="he" code="me" imageQuery="kind=level&score=12" hasRival={false} kind="level" />);
    const href = screen.getByText('brag2.page.ctaPlay').closest('a')?.getAttribute('href') ?? '';
    expect(href.startsWith('/he?')).toBe(true);
    expect(href).not.toContain('room=');
    expect(screen.getByText('brag2.page.title.level')).toBeTruthy();
  });

  it('Given a solo result, Then the CTA goes to play, since there is no room to join', () => {
    render(<BragPageClient locale="en" code="solo" imageQuery="score=300&mode=singleplayer" hasRival={false} kind="result" />);
    const href = screen.getByText('brag2.page.ctaPlay').closest('a')?.getAttribute('href') ?? '';
    expect(href).not.toContain('room=');
  });
});
