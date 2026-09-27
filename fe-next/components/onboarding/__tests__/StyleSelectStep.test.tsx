/**
 * StyleSelectStep — the final onboarding step where a new player picks a
 * music/theme style. Wraps the shared StylePicker; both "confirm" and
 * "skip for now" finish the step via onComplete.
 */
import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StyleSelectStep from '../StyleSelectStep';

// i18n passthrough: return the key so assertions are stable.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', language: 'en' }),
}));

// Stub the heavy StylePicker — expose its onConfirm so we can simulate a commit.
vi.mock('@/components/playerStyle/StylePicker', () => ({
  StylePicker: ({ onConfirm, confirmLabelKey, footerExtra }: { onConfirm?: (k: string) => void; confirmLabelKey?: string; footerExtra?: React.ReactNode }) => (
    <div>
      <button data-testid="picker-confirm" onClick={() => onConfirm?.('rock')}>
        {confirmLabelKey}
      </button>
      {footerExtra}
    </div>
  ),
}));

describe('StyleSelectStep', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the title and the style picker', () => {
    render(<StyleSelectStep onComplete={vi.fn()} />);
    expect(screen.getByText('onboarding.style.title')).toBeInTheDocument();
    expect(screen.getByTestId('picker-confirm')).toBeInTheDocument();
  });

  it('calls onComplete when the picker confirms a style', () => {
    const onComplete = vi.fn();
    render(<StyleSelectStep onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('picker-confirm'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete when the user skips for now', () => {
    const onComplete = vi.fn();
    render(<StyleSelectStep onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('onboarding-style-skip'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('passes the onboarding confirm label to the picker', () => {
    render(<StyleSelectStep onComplete={vi.fn()} />);
    expect(screen.getByTestId('picker-confirm')).toHaveTextContent('onboarding.style.confirm');
  });
});
