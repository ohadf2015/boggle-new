import { render, screen } from '@testing-library/react';
import { VocabEarnedBadge, VocabBadgeRow } from '../VocabEarnedBadge';

const mockT = vi.fn((key: string) => key);
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en', dir: 'ltr' }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <div className={className} data-testid={props['data-testid']}>{children}</div>
    ),
  },
}));

describe('VocabEarnedBadge', () => {
  it('renders explorer badge with correct translation key', () => {
    render(<VocabEarnedBadge type="explorer" unlocked />);
    expect(mockT).toHaveBeenCalledWith('education.badges.wordExplorer');
  });

  it('renders master badge with correct translation key', () => {
    render(<VocabEarnedBadge type="master" unlocked />);
    expect(mockT).toHaveBeenCalledWith('education.badges.vocabMaster');
  });

  it('renders speed badge with correct translation key', () => {
    render(<VocabEarnedBadge type="speed" unlocked />);
    expect(mockT).toHaveBeenCalledWith('education.badges.speedScholar');
  });

  it('unlocked badge has colored background', () => {
    const { container } = render(<VocabEarnedBadge type="explorer" unlocked />);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain('bg-neo-cyan');
    expect(badge?.className).not.toContain('opacity-50');
  });

  it('locked badge has opacity class', () => {
    const { container } = render(<VocabEarnedBadge type="explorer" unlocked={false} />);
    const badge = container.firstElementChild;
    expect(badge?.className).toContain('opacity-50');
    expect(badge?.className).toContain('bg-neo-navy/50');
  });
});

describe('VocabBadgeRow', () => {
  it('unlocks explorer when wordsFound >= 5', () => {
    render(<VocabBadgeRow wordsFound={5} totalWords={10} earlyWordsCount={0} />);
    expect(mockT).toHaveBeenCalledWith('education.badges.wordExplorer');
    // explorer unlocked, master and speed locked
    const badges = screen.getAllByTestId('vocab-badge');
    expect(badges[0].className).toContain('bg-neo-cyan');
    expect(badges[1].className).toContain('opacity-50');
    expect(badges[2].className).toContain('opacity-50');
  });

  it('unlocks master when wordsFound === totalWords', () => {
    render(<VocabBadgeRow wordsFound={10} totalWords={10} earlyWordsCount={0} />);
    const badges = screen.getAllByTestId('vocab-badge');
    // explorer + master unlocked
    expect(badges[0].className).toContain('bg-neo-cyan');
    expect(badges[1].className).toContain('bg-neo-lime');
  });

  it('unlocks speed when earlyWordsCount >= 3', () => {
    render(<VocabBadgeRow wordsFound={1} totalWords={10} earlyWordsCount={3} />);
    const badges = screen.getAllByTestId('vocab-badge');
    // only speed unlocked
    expect(badges[0].className).toContain('opacity-50');
    expect(badges[1].className).toContain('opacity-50');
    expect(badges[2].className).toContain('bg-neo-pink');
  });
});
