import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { LobbyEconomyToggles } from '../LobbyEconomyToggles';

describe('LobbyEconomyToggles', () => {
  it('shows both switches at the classroom defaults: shop on, wrong-answer cost off', () => {
    render(<LobbyEconomyToggles value={{ powerUps: true, wrongAnswerCost: false }} onChange={vi.fn()} />);
    expect(screen.getByRole('switch', { name: 'economy.teacher.powerUps' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'economy.teacher.wrongCost' })).not.toBeChecked();
  });

  it('changes one switch without touching the other', () => {
    const onChange = vi.fn();
    render(<LobbyEconomyToggles value={{ powerUps: true, wrongAnswerCost: false }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'economy.teacher.wrongCost' }));
    expect(onChange).toHaveBeenCalledWith({ powerUps: true, wrongAnswerCost: true });
  });
});
