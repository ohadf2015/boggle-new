import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickReplies, QUICK_REPLY_KEYS } from './QuickReplies';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => `T:${key}` }),
}));

describe('QuickReplies', () => {
  it('renders one chip per phrase and sends the translated phrase on tap', () => {
    const onPick = vi.fn();
    render(<QuickReplies onPick={onPick} />);
    const chips = screen.getAllByRole('button');
    expect(chips).toHaveLength(QUICK_REPLY_KEYS.length);
    fireEvent.click(chips[1]);
    expect(onPick).toHaveBeenCalledWith('T:friendSocial.quick.gg');
  });

  it('disables every chip when the composer is disabled', () => {
    render(<QuickReplies onPick={vi.fn()} disabled />);
    for (const chip of screen.getAllByRole('button')) expect(chip).toBeDisabled();
  });
});
