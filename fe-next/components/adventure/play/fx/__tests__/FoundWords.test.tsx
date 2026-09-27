import React from 'react';
import { render, screen } from '@testing-library/react';
import FoundWords from '../FoundWords';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguageSafe: () => ({ t: (k: string) => k }) }));

describe('FoundWords', () => {
  it('given found words, when shown, then the newest chip is first and marked as the latest', () => {
    render(<FoundWords words={['cat', 'dog']} points={[3, 3]} />);
    const chips = screen.getAllByRole('listitem');
    expect(chips[0].textContent).toContain('dog');
    expect(chips[0].getAttribute('data-latest')).toBe('true');
    expect(chips[1].getAttribute('data-latest')).toBeNull();
  });

  it('given a 6+ letter word, when it is the longest found, then its chip keeps a best-word mark for the rest of the level', () => {
    render(<FoundWords words={['stones', 'cat', 'dog']} points={[8, 3, 3]} />);
    const best = screen.getAllByRole('listitem').find((li) => li.textContent?.includes('stones'));
    expect(best?.querySelector('[data-testid="adv-best-word"]')).not.toBeNull();
  });

  it('given only short words, then nothing is marked best', () => {
    render(<FoundWords words={['cat', 'dogs']} points={[3, 4]} />);
    expect(screen.queryByTestId('adv-best-word')).toBeNull();
  });
});
