import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PartyPhoneShell } from '../PartyPhoneShell';

/**
 * PartyPhoneShell — the one root wrapper every party PHONE controller sits in.
 *
 * Centralizes the three things each game's root div was getting wrong on
 * mobile: (1) text direction for Hebrew RTL, (2) notch / home-bar safe-area
 * padding, (3) a dynamic-viewport, scroll-safe column so long lists scroll
 * inside the shell instead of pushing the header off-screen.
 */

let mockDir = 'ltr';
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: mockDir }),
}));

describe('PartyPhoneShell', () => {
  it('renders its children', () => {
    mockDir = 'ltr';
    render(<PartyPhoneShell><p>hello</p></PartyPhoneShell>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('mirrors text direction from the language context (RTL for Hebrew)', () => {
    mockDir = 'rtl';
    const { container } = render(<PartyPhoneShell><span>x</span></PartyPhoneShell>);
    expect(container.firstChild).toHaveAttribute('dir', 'rtl');
  });

  it('uses ltr when the language is left-to-right', () => {
    mockDir = 'ltr';
    const { container } = render(<PartyPhoneShell><span>x</span></PartyPhoneShell>);
    expect(container.firstChild).toHaveAttribute('dir', 'ltr');
  });

  it('applies safe-area + dynamic-viewport layout classes to the root', () => {
    mockDir = 'ltr';
    const { container } = render(<PartyPhoneShell><span>x</span></PartyPhoneShell>);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('min-h-dvh');
    expect(root.className).toContain('pb-safe');
    expect(root.className).toContain('pt-safe');
  });

  it('uses min-h-dvh by default (grows so short screens never clip) and h-dvh when bounded (for internal list scroll)', () => {
    mockDir = 'ltr';
    const grow = render(<PartyPhoneShell><span>x</span></PartyPhoneShell>);
    expect((grow.container.firstChild as HTMLElement).className).toContain('min-h-dvh');
    const bound = render(<PartyPhoneShell bounded><span>x</span></PartyPhoneShell>);
    const boundEl = bound.container.firstChild as HTMLElement;
    expect(boundEl.className).toContain('h-dvh');
    expect(boundEl.className).not.toContain('min-h-dvh');
  });

  it('marks the gameplay subtree translate="no" so browsers do not scramble tiles/words', () => {
    mockDir = 'ltr';
    const { container } = render(<PartyPhoneShell><span>x</span></PartyPhoneShell>);
    // Inherited by the whole board subtree — stops Chrome/Edge auto-translation
    // (which mangles letter tiles and can crash React via DOM mutation).
    expect(container.firstChild).toHaveAttribute('translate', 'no');
  });

  it('merges caller-supplied className', () => {
    mockDir = 'ltr';
    const { container } = render(
      <PartyPhoneShell className="bg-neo-navy-elevated"><span>x</span></PartyPhoneShell>
    );
    expect((container.firstChild as HTMLElement).className).toContain('bg-neo-navy-elevated');
  });
});
