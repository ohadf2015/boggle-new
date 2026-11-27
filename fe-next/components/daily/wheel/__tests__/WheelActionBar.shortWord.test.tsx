import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WheelActionBar from '../WheelActionBar';
import { useExperiment } from '@/hooks/useExperiment';
import { trackGrowthEvent } from '@/utils/growthTracking';

vi.mock('@/hooks/useExperiment', () => ({ useExperiment: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

const base = { t: (k: string) => k, hasLetters: true, canSubmit: false, isValidating: false, onClear: vi.fn(), onSubmit: vi.fn(), onBackspace: vi.fn() };
const submit = () => screen.getByRole('button', { name: 'wordWheel.submit' });
const variant = (v: string) => vi.mocked(useExperiment).mockReturnValue({ variant: v, trackExposure: vi.fn() } as never);

describe('WheelActionBar short-word feedback (exp-wordwheel-short-word-feedback-v1)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('control: a too-short word leaves SUBMIT disabled and silent', () => {
    variant('control');
    render(<WheelActionBar {...base} />);
    expect(submit()).toBeDisabled();
  });

  it('shake: a too-short word keeps SUBMIT tappable, logs the tap, never submits', () => {
    variant('shake');
    render(<WheelActionBar {...base} />);
    expect(submit()).not.toBeDisabled();
    expect(submit()).toHaveAttribute('data-ready', 'false');
    fireEvent.click(submit());
    expect(trackGrowthEvent).toHaveBeenCalledWith('wordwheel_short_word_tap', { variant: 'shake' });
    expect(base.onSubmit).not.toHaveBeenCalled();
  });

  it('shake: a valid word submits normally', () => {
    variant('shake');
    render(<WheelActionBar {...base} canSubmit />);
    fireEvent.click(submit());
    expect(base.onSubmit).toHaveBeenCalledTimes(1);
    expect(trackGrowthEvent).not.toHaveBeenCalled();
  });
});
