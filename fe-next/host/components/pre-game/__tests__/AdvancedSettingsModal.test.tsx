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
  return { m: { button: MotionButton } };
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

const openModal = () => fireEvent.click(screen.getByLabelText('hostView.advancedSettings'));

describe('AdvancedSettingsModal language chips', () => {
  beforeEach(() => {
    baseProps.onRoomLanguageChange.mockClear();
    baseProps.setTimerValue.mockClear();
    baseProps.setDifficulty.mockClear();
    baseProps.setMinWordLength.mockClear();
  });

  it('renders one chip per supported language when opened', () => {
    render(<AdvancedSettingsModal {...baseProps} />);
    openModal();

    expect(screen.getByRole('button', { name: /joinView\.english/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /joinView\.hebrew/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /joinView\.swedish/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /joinView\.japanese/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /joinView\.spanish/i })).toBeTruthy();
  });

  it('marks the current language as selected via aria-pressed', () => {
    render(<AdvancedSettingsModal {...baseProps} roomLanguage="he" />);
    openModal();

    const hebrewChip = screen.getByRole('button', { name: /joinView\.hebrew/i });
    expect(hebrewChip.getAttribute('aria-pressed')).toBe('true');
    const englishChip = screen.getByRole('button', { name: /joinView\.english/i });
    expect(englishChip.getAttribute('aria-pressed')).toBe('false');
  });

  it('does not commit language change until Save is clicked', () => {
    render(<AdvancedSettingsModal {...baseProps} />);
    openModal();

    fireEvent.click(screen.getByRole('button', { name: /joinView\.swedish/i }));
    expect(baseProps.onRoomLanguageChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /common\.save/i }));
    expect(baseProps.onRoomLanguageChange).toHaveBeenCalledWith('sv');
  });
});

describe('AdvancedSettingsModal save/cancel', () => {
  beforeEach(() => {
    baseProps.setTimerValue.mockClear();
    baseProps.setDifficulty.mockClear();
    baseProps.setMinWordLength.mockClear();
    baseProps.onRoomLanguageChange.mockClear();
  });

  it('renders Save and Cancel buttons when opened', () => {
    render(<AdvancedSettingsModal {...baseProps} />);
    openModal();

    expect(screen.getByRole('button', { name: /common\.save/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /common\.cancel/i })).toBeTruthy();
  });

  it('Save commits drafted timer/difficulty/minWordLength changes to parent setters', () => {
    render(<AdvancedSettingsModal {...baseProps} />);
    openModal();

    fireEvent.click(screen.getByRole('button', { name: '1 hostView.min' }));
    fireEvent.click(screen.getByRole('button', { name: '7×7' }));
    fireEvent.click(screen.getByRole('button', { name: '4 hostView.presetDrawerLetters' }));

    expect(baseProps.setTimerValue).not.toHaveBeenCalled();
    expect(baseProps.setDifficulty).not.toHaveBeenCalled();
    expect(baseProps.setMinWordLength).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /common\.save/i }));

    expect(baseProps.setTimerValue).toHaveBeenCalledWith(1);
    expect(baseProps.setDifficulty).toHaveBeenCalledWith('HARD');
    expect(baseProps.setMinWordLength).toHaveBeenCalledWith(4);
  });

  it('offers a 1:30 (90-second) timer option rendered as MM:SS, not "1.5 min"', () => {
    render(<AdvancedSettingsModal {...baseProps} />);
    openModal();

    expect(screen.getByRole('button', { name: '1:30' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /1\.5/ })).toBeNull();
  });

  it('Save commits the 1:30 timer selection as 1.5 minutes', () => {
    render(<AdvancedSettingsModal {...baseProps} />);
    openModal();

    fireEvent.click(screen.getByRole('button', { name: '1:30' }));
    fireEvent.click(screen.getByRole('button', { name: /common\.save/i }));

    expect(baseProps.setTimerValue).toHaveBeenCalledWith(1.5);
  });

  it('marks 1:30 as the active chip when timerValue is the 1.5-min default', () => {
    render(<AdvancedSettingsModal {...baseProps} timerValue={1.5} />);
    openModal();

    const chip = screen.getByRole('button', { name: '1:30' });
    expect(chip.getAttribute('class') || '').toMatch(/neo-lime/);
  });

  it('Cancel discards drafts — no setters called', () => {
    render(<AdvancedSettingsModal {...baseProps} />);
    openModal();

    fireEvent.click(screen.getByRole('button', { name: '1 hostView.min' }));
    fireEvent.click(screen.getByRole('button', { name: /joinView\.swedish/i }));

    fireEvent.click(screen.getByRole('button', { name: /common\.cancel/i }));

    expect(baseProps.setTimerValue).not.toHaveBeenCalled();
    expect(baseProps.onRoomLanguageChange).not.toHaveBeenCalled();
  });

  it('reopening after Cancel resets drafts to current props', () => {
    render(<AdvancedSettingsModal {...baseProps} />);
    openModal();

    fireEvent.click(screen.getByRole('button', { name: '7×7' }));
    fireEvent.click(screen.getByRole('button', { name: /common\.cancel/i }));

    openModal();
    const mediumChip = screen.getByRole('button', { name: '6×6' });
    expect(mediumChip.getAttribute('class') || '').toMatch(/neo-lime/);
  });

  it('Save skips onRoomLanguageChange when language is unchanged (avoids redundant socket emit)', () => {
    render(<AdvancedSettingsModal {...baseProps} />);
    openModal();
    fireEvent.click(screen.getByRole('button', { name: '1 hostView.min' }));
    fireEvent.click(screen.getByRole('button', { name: /common\.save/i }));

    expect(baseProps.onRoomLanguageChange).not.toHaveBeenCalled();
  });
});
