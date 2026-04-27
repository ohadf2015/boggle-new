import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PracticeCompletionPopup } from '@/components/training';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackModeSelected: vi.fn(),
}));

const t = (k: string) => {
  const map: Record<string, string> = {
    'training.completion.title': 'Nailed it!',
    'training.completion.message': 'Great work!',
    'training.completion.nextChallenge': "What's next?",
    'training.completion.tryDaily': 'Daily',
    'training.completion.tryQuickMatch': 'QuickMatch',
    'training.completion.continuePractice': 'Keep Practicing',
  };
  return map[k] ?? k;
};

describe('PracticeCompletionPopup', () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it('renders all three CTAs when open', () => {
    render(<PracticeCompletionPopup open onOpenChange={() => {}} language="en" t={t} />);
    expect(screen.getByText('Nailed it!')).toBeInTheDocument();
    expect(screen.getByTestId('practice-completion-daily')).toBeInTheDocument();
    expect(screen.getByTestId('practice-completion-quickplay')).toBeInTheDocument();
    expect(screen.getByTestId('practice-completion-keep-practicing')).toBeInTheDocument();
  });

  it('navigates to daily challenge for current locale', () => {
    const onOpenChange = vi.fn();
    render(<PracticeCompletionPopup open onOpenChange={onOpenChange} language="he" t={t} />);
    fireEvent.click(screen.getByTestId('practice-completion-daily'));
    expect(pushMock).toHaveBeenCalledWith('/he/daily');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('navigates to multiplayer quickplay', () => {
    const onOpenChange = vi.fn();
    render(<PracticeCompletionPopup open onOpenChange={onOpenChange} language="en" t={t} />);
    fireEvent.click(screen.getByTestId('practice-completion-quickplay'));
    expect(pushMock).toHaveBeenCalledWith('/en/multiplayer?quickPlay=true');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keep practicing only closes popup, does not navigate', () => {
    const onOpenChange = vi.fn();
    render(<PracticeCompletionPopup open onOpenChange={onOpenChange} language="en" t={t} />);
    fireEvent.click(screen.getByTestId('practice-completion-keep-practicing'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
