import { render, screen } from '@testing-library/react';
import { GameSidebar } from '../GameSidebar';
import type { LevelObjective } from '@/types/adventure';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

// Mock AdventureObjectives so it doesn't duplicate testids from desktop layout
vi.mock('../../AdventureObjectives', () => ({
  __esModule: true,
  default: () => <div data-testid="adventure-objectives-mock" />,
}));

const objectives: LevelObjective[] = [
  { type: 'wordCount', target: 10, current: 3, isPrimary: true },
  { type: 'scoreTarget', target: 500, current: 120 },
];

describe('GameSidebar mobile layout', () => {
  it('renders objectives with data-testid in chip form', () => {
    render(
      <GameSidebar
        objectives={objectives}
        hasHintsAvailable={true}
        onHintClick={vi.fn()}
        showAutoHint={false}
        currentHint={null}
        hintLevel="none"
      />
    );
    expect(screen.getByTestId('objective-wordCount')).toBeInTheDocument();
    expect(screen.getByTestId('objective-scoreTarget')).toBeInTheDocument();
  });

  it('shows progress fraction for each objective', () => {
    render(
      <GameSidebar
        objectives={objectives}
        hasHintsAvailable={false}
        onHintClick={vi.fn()}
        showAutoHint={false}
        currentHint={null}
        hintLevel="none"
      />
    );
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });
});
