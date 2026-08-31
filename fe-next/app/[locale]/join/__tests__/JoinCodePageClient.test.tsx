import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { JoinCodePageClient } from '../PageClient';

/**
 * `/[locale]/join` returned a hard 404 in production. Only `/join/[code]`
 * resolved, so:
 *   - "go to lexiclash.live/join" — the shorthand a teacher says out loud —
 *     was a dead end,
 *   - and a student who had the code but not the full URL had nowhere to type it.
 *
 * That is the same "code and nowhere to put it" failure as the QR-only banner,
 * on the most guessable address in the product.
 */
describe('<JoinCodePageClient>', () => {
  beforeEach(() => vi.clearAllMocks());

  const type = (value: string) =>
    fireEvent.change(screen.getByRole('textbox'), { target: { value } });

  it('sends a valid code to the route that actually resolves', () => {
    render(<JoinCodePageClient />);
    type('ABC123');
    fireEvent.click(screen.getByRole('button', { name: 'joinByCode.submit' }));
    expect(push).toHaveBeenCalledWith('/en/join/ABC123');
  });

  it('strips characters a student pastes or types by mistake', () => {
    render(<JoinCodePageClient />);
    // Copied out of chat with spaces and punctuation around it.
    type(' abc-123 ');
    fireEvent.click(screen.getByRole('button', { name: 'joinByCode.submit' }));
    expect(push).toHaveBeenCalledWith('/en/join/ABC123');
  });

  it('refuses a too-short code instead of routing to a 404', () => {
    render(<JoinCodePageClient />);
    type('AB1');
    fireEvent.click(screen.getByRole('button', { name: 'joinByCode.submit' }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('refuses an empty submit', () => {
    render(<JoinCodePageClient />);
    fireEvent.click(screen.getByRole('button', { name: 'joinByCode.submit' }));
    expect(push).not.toHaveBeenCalled();
  });

  it('shows a real message, never a raw translation key path', () => {
    render(<JoinCodePageClient />);
    type('AB1');
    fireEvent.click(screen.getByRole('button', { name: 'joinByCode.submit' }));
    // `t` is mocked to echo the key, so assert we ask for a defined key rather
    // than rendering validateGameCode's raw return value.
    expect(screen.getByRole('alert').textContent).toMatch(/^validation\./);
  });
});
