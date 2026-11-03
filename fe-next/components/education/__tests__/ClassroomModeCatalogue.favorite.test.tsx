import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { he } from '@/translations/he';
import { ClassroomModeCardRow } from '../ClassroomModeCatalogue';

const t = (key: string) => key;
const heT = (key: string) => {
  const v = key.split('.').reduce<unknown>((n, p) => (n && typeof n === 'object' ? (n as Record<string, unknown>)[p] : undefined), he);
  return typeof v === 'string' ? v : key;
};

describe('<ClassroomModeCardRow> class favourites', () => {
  it('Given the most-played modes, Then their cards carry a Most popular tag and the others do not', () => {
    render(<ClassroomModeCardRow selected="wheel-rush" onPick={vi.fn()} t={t} />);
    for (const id of ['vocab-quiz', 'classic', 'blast']) {
      expect(within(screen.getByTestId(`mode-tile-${id}`)).getByTestId('mode-favorite')).toHaveTextContent('Most popular');
    }
    for (const id of ['wheel-rush', 'word-hunt', 'wordcraft', 'boss-battle']) {
      expect(within(screen.getByTestId(`mode-tile-${id}`)).queryByTestId('mode-favorite')).toBeNull();
    }
  });

  it('Given a Hebrew teacher, Then the tag is Hebrew copy, never an English fallback', () => {
    render(<ClassroomModeCardRow selected="wheel-rush" onPick={vi.fn()} t={heT} />);
    const tag = within(screen.getByTestId('mode-tile-classic')).getByTestId('mode-favorite');
    expect(tag).toHaveTextContent(heT('teacher.subscription.popular'));
    expect(tag.textContent).not.toMatch(/[A-Za-z]/);
  });

  it('Given a favourite that is also the best fit, Then only one tag shows (the best fit)', () => {
    render(<ClassroomModeCardRow selected="wheel-rush" recommended="classic" onPick={vi.fn()} t={t} />);
    const tile = screen.getByTestId('mode-tile-classic');
    expect(within(tile).getByTestId('mode-recommended')).toBeTruthy();
    expect(within(tile).queryByTestId('mode-favorite')).toBeNull();
  });

  it('Then card tags are at least 12px (text-xs), never the 0.6rem micro text', () => {
    render(<ClassroomModeCardRow selected="wheel-rush" recommended="word-hunt" onPick={vi.fn()} t={t} />);
    for (const el of [screen.getByTestId('mode-recommended'), ...screen.getAllByTestId('mode-favorite')]) {
      expect(el.className).not.toMatch(/text-\[0\.6/);
      expect(el.className).toMatch(/\btext-xs\b/);
    }
  });
});
