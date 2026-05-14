import { render, screen } from '@testing-library/react';
import { ChapterQuestPanel } from '../ChapterQuestPanel';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
  m: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const quests = [
  { id: 'w1c1-words', chapterNumber: 1, worldId: 1, type: 'wordCountChapter' as const, titleKey: 'adventure.quests.chapter.wordCount.title', descriptionKey: 'adventure.quests.chapter.wordCount.desc', target: 20, reward: { coins: 100, xp: 50 } },
];
const progress = [{ questId: 'w1c1-words', current: 10, isComplete: false, rewardClaimed: false }];

describe('ChapterQuestPanel', () => {
  it('renders quest title', () => {
    render(<ChapterQuestPanel quests={quests} progress={progress} />);
    expect(screen.getByText('adventure.quests.chapter.wordCount.title')).toBeInTheDocument();
  });

  it('shows progress fraction', () => {
    render(<ChapterQuestPanel quests={quests} progress={progress} />);
    expect(screen.getByText('10/20')).toBeInTheDocument();
  });
});
