import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import TrainingAnalysisModal from '../TrainingAnalysisModal';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/utils/hapticFeedback', () => ({ triggerHaptic: vi.fn() }));

vi.mock('@/utils/trainingProgressStorage', () => ({
  getTrainingProgress: () => ({ hasPassedTraining: true }),
  getSkillSummary: () => ({
    mastered: ['diagonal', 'directionChange', 'gridCoverage', 'longWords'],
    needsWork: [],
    stats: { wordsFound: 12, longestWord: 7, directionChanges: 3 },
  }),
}));

describe('TrainingAnalysisModal', () => {
  it('renders nothing when isOpen=false', () => {
    render(<TrainingAnalysisModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders as an accessible dialog when isOpen=true', () => {
    render(<TrainingAnalysisModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TrainingAnalysisModal isOpen={true} onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close (X) button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TrainingAnalysisModal isOpen={true} onClose={onClose} />);
    await user.click(screen.getByLabelText('common.close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps focus inside the dialog', () => {
    render(<TrainingAnalysisModal isOpen={true} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});
