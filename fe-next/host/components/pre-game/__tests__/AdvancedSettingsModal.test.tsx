import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdvancedSettingsModal } from '../AdvancedSettingsModal';

vi.mock('framer-motion', () => {
  const MotionButton = React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'> & Record<string, unknown>>(
    ({ children, whileTap, animate, transition, initial, exit, ...props }, ref) => (
      <button ref={ref} {...props}>{children}</button>
    ),
  );
  MotionButton.displayName = 'MotionButton';
  return { motion: { button: MotionButton } };
});

const t = (key: string) => key;

const baseProps = {
  timerValue: 2,
  setTimerValue: vi.fn(),
  difficulty: 'MEDIUM' as const,
  setDifficulty: vi.fn(),
  minWordLength: 3,
  setMinWordLength: vi.fn(),
  roomLanguage: 'en' as const,
  onRoomLanguageChange: vi.fn(),
  t,
};

describe('AdvancedSettingsModal language chips', () => {
  beforeEach(() => {
    baseProps.onRoomLanguageChange.mockClear();
  });

  it('renders one chip per supported language when opened', () => {
    render(<AdvancedSettingsModal {...baseProps} />);
    fireEvent.click(screen.getByLabelText('hostView.advancedSettings'));

    expect(screen.getByRole('button', { name: /joinView\.english/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /joinView\.hebrew/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /joinView\.swedish/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /joinView\.japanese/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /joinView\.spanish/i })).toBeTruthy();
  });

  it('marks the current language as selected via aria-pressed', () => {
    render(<AdvancedSettingsModal {...baseProps} roomLanguage="he" />);
    fireEvent.click(screen.getByLabelText('hostView.advancedSettings'));

    const hebrewChip = screen.getByRole('button', { name: /joinView\.hebrew/i });
    expect(hebrewChip.getAttribute('aria-pressed')).toBe('true');
    const englishChip = screen.getByRole('button', { name: /joinView\.english/i });
    expect(englishChip.getAttribute('aria-pressed')).toBe('false');
  });

  it('fires onRoomLanguageChange with the chosen language code on chip click', () => {
    render(<AdvancedSettingsModal {...baseProps} />);
    fireEvent.click(screen.getByLabelText('hostView.advancedSettings'));

    fireEvent.click(screen.getByRole('button', { name: /joinView\.swedish/i }));
    expect(baseProps.onRoomLanguageChange).toHaveBeenCalledWith('sv');

    fireEvent.click(screen.getByRole('button', { name: /joinView\.japanese/i }));
    expect(baseProps.onRoomLanguageChange).toHaveBeenCalledWith('ja');
  });
});
