import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AvatarCustomizeHint } from '../AvatarCustomizeHint';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) =>
      ({
        'avatar.nudge.title': 'Make this avatar yours',
        'avatar.nudge.body': 'Give it your colors and style.',
        'avatar.nudge.cta': 'Customize',
        'avatar.nudge.dismiss': 'Not now',
      }[key] ?? key),
  }),
}));

describe('AvatarCustomizeHint', () => {
  afterEach(() => vi.clearAllMocks());

  it('renders the warm, native customization invitation', () => {
    render(<AvatarCustomizeHint onCustomize={() => {}} onDismiss={() => {}} />);
    expect(screen.getByText('Make this avatar yours')).toBeInTheDocument();
    expect(screen.getByText('Give it your colors and style.')).toBeInTheDocument();
  });

  it('fires onCustomize when the CTA is clicked', () => {
    const onCustomize = vi.fn();
    render(<AvatarCustomizeHint onCustomize={onCustomize} onDismiss={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
    expect(onCustomize).toHaveBeenCalledTimes(1);
  });

  it('fires onDismiss when the dismiss control is clicked', () => {
    const onDismiss = vi.fn();
    render(<AvatarCustomizeHint onCustomize={() => {}} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
