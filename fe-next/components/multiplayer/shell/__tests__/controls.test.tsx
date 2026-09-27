import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MpPrimaryCta } from '../MpPrimaryCta';
import { MpRoomCode } from '../MpRoomCode';
import { MpBackButton } from '../MpBackButton';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

describe('MpPrimaryCta', () => {
  it('fires onPress, shows label/sublabel/badge', () => {
    const onPress = vi.fn();
    render(<MpPrimaryCta label="START" sublabel="3/8" badge="NEW" tone="lime" onPress={onPress} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalled();
    expect(screen.getByRole('button').textContent).toContain('START');
    expect(screen.getByRole('button').textContent).toContain('3/8');
    expect(screen.getByRole('button').textContent).toContain('NEW');
  });

  it('does not fire while disabled or loading, and says it is busy', () => {
    const onPress = vi.fn();
    const { rerender } = render(<MpPrimaryCta label="GO" tone="pink" onPress={onPress} disabled />);
    fireEvent.click(screen.getByRole('button'));
    rerender(<MpPrimaryCta label="GO" tone="pink" onPress={onPress} loading />);
    fireEvent.click(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('true');
  });

  it('is at least 64px tall (thumb target) and scales on TV', () => {
    render(<MpPrimaryCta label="GO" tone="cyan" onPress={() => {}} />);
    expect(screen.getByRole('button').className).toMatch(/64px\*var\(--mp-u/);
  });
});

describe('MpRoomCode', () => {
  it('shows the code letter-spaced and copies it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const onCopy = vi.fn();
    render(<MpRoomCode code="XWUCT4" size="chip" onCopy={onCopy} />);
    const btn = screen.getByRole('button');
    expect(btn.textContent).toContain('XWUCT4');
    await act(async () => { fireEvent.click(btn); });
    expect(writeText).toHaveBeenCalledWith('XWUCT4');
    expect(onCopy).toHaveBeenCalledWith('XWUCT4');
    expect(btn.getAttribute('data-copied')).toBe('true');
  });

  it('hero size is the big projector variant', () => {
    render(<MpRoomCode code="AB12CD" size="hero" onCopy={() => {}} />);
    expect(screen.getByRole('button').getAttribute('data-size')).toBe('hero');
  });
});

describe('MpBackButton', () => {
  it('uses a direction-aware icon and an accessible label', () => {
    const onPress = vi.fn();
    render(<MpBackButton onPress={onPress} kind="back" />);
    const btn = screen.getByRole('button', { name: 'mpUi.shell.back' });
    fireEvent.click(btn);
    expect(onPress).toHaveBeenCalled();
    // DirectionalIcon flips symmetric arrows in RTL.
    expect(btn.querySelector('svg')?.getAttribute('class')).toContain('rtl:rotate-180');
  });

  it('leave kind mirrors the door icon instead of rotating it', () => {
    render(<MpBackButton onPress={() => {}} kind="leave" />);
    const btn = screen.getByRole('button', { name: 'mpUi.shell.leave' });
    expect(btn.querySelector('svg')?.getAttribute('class')).toContain('rtl:scale-x-[-1]');
  });
});
