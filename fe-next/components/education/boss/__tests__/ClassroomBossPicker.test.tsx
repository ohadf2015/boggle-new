import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

let mockPro = { hasPro: false, loading: false };
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => mockPro }));

import { ClassroomBossPicker } from '../ClassroomBossPicker';

describe('ClassroomBossPicker', () => {
  beforeEach(() => {
    mockPro = { hasPro: false, loading: false };
  });

  it('given a free teacher, then only the Lexicon Dragon is pickable and the other nine show a lock with an upgrade link', () => {
    const onChange = vi.fn();
    render(<ClassroomBossPicker value="lexiconDragon" onChange={onChange} />);
    expect(screen.getAllByRole('radio')).toHaveLength(10);
    expect(screen.getByTestId('boss-option-lexiconDragon')).not.toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByTestId('boss-option-msGrammar'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('boss-option-msGrammar')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('boss-picker-pro')).toHaveAttribute('href', '/en/teacher/upgrade');
  });

  it('given a Pro teacher, then any boss can be picked and no upsell shows', () => {
    mockPro = { hasPro: true, loading: false };
    const onChange = vi.fn();
    render(<ClassroomBossPicker value="lexiconDragon" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('boss-option-spellingBee'));
    expect(onChange).toHaveBeenCalledWith('spellingBee');
    expect(screen.queryByTestId('boss-picker-pro')).toBeNull();
  });

  it('given the entitlement is still loading, then the Pro bosses stay locked and no upsell flashes', () => {
    mockPro = { hasPro: true, loading: true };
    const onChange = vi.fn();
    render(<ClassroomBossPicker value="lexiconDragon" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('boss-option-spellingBee'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('boss-picker-pro')).toBeNull();
  });

  it('given a free teacher holding a Pro boss (lapsed plan), then the choice falls back to the free boss', () => {
    const onChange = vi.fn();
    render(<ClassroomBossPicker value="spellingBee" onChange={onChange} />);
    expect(onChange).toHaveBeenCalledWith('lexiconDragon');
    expect(screen.getByTestId('boss-option-lexiconDragon')).toHaveAttribute('aria-checked', 'true');
  });
});
