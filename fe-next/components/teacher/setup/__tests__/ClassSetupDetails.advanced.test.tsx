import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { packsForLanguage, recommendedPack } from '../starterPackPick';

vi.mock('@/components/education/EduMascot', () => ({ EduMascot: () => null }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (k: string) => k }) }));

import { ClassSetupDetails } from '../ClassSetupDetails';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

function renderDetails(overrides: Partial<Parameters<typeof ClassSetupDetails>[0]> = {}) {
  const pack = recommendedPack('en', null);
  return render(
    <ClassSetupDetails
      name=""
      onNameChange={vi.fn()}
      grade={null}
      onGradeChange={vi.fn()}
      language="en"
      onLanguageChange={vi.fn()}
      packs={packsForLanguage('en')}
      pack={pack}
      recommendedKey={pack.nameKey}
      onPackChange={vi.fn()}
      cap={null}
      busy={null}
      errorKey={null}
      onStartLive={vi.fn()}
      onCreateOnly={vi.fn()}
      skipHref="/en/teacher"
      t={t}
      {...overrides}
    />,
  );
}

describe('ClassSetupDetails advanced options', () => {
  it('Given a new class, Then only the name and the start buttons show, with the defaults summed up in one line', () => {
    renderDetails();
    expect(screen.getByLabelText('eduShell.setup.nameLabel')).toBeInTheDocument();
    expect(screen.getByTestId('setup-start-live')).toBeInTheDocument();
    expect(screen.queryByTestId('setup-grade-k2')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('radio').filter((r) => r.hasAttribute('data-pack'))).toHaveLength(0);
    const summary = screen.getByTestId('setup-advanced-summary');
    expect(summary.textContent).toContain('eduShell.setup.anyGrade');
    expect(summary.textContent).toContain('English');
  });

  it('When "Change grade, language or words" is tapped, Then grade, language and words open, and tapping again hides them', () => {
    renderDetails();
    const toggle = screen.getByTestId('setup-advanced-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('radio').filter((r) => r.hasAttribute('data-pack')).length).toBeGreaterThan(0);
    expect(screen.getByText('eduShell.setup.gradeLabel')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByText('eduShell.setup.gradeLabel')).not.toBeInTheDocument();
  });

  it('Given a grade was picked before the options were hidden, Then the summary names it so the choice is not lost from view', () => {
    renderDetails({ grade: 'g68' });
    expect(screen.getByTestId('setup-advanced-summary').textContent).toContain('eduShell.setup.grade.g68');
  });
});

describe('ClassSetupDetails explains the two ways out', () => {
  it('Then "Create and play" says what it opens, and the word list sticker says it is the word list', () => {
    renderDetails();
    expect(screen.getByTestId('setup-start-live')).toHaveAttribute('aria-describedby', 'setup-start-live-hint');
    expect(screen.getByTestId('setup-start-live-hint')).toHaveTextContent('eduShell.setup.words.createHint');
    expect(screen.getByTestId('setup-advanced-summary').textContent).toContain('eduShell.setup.packSticker');
  });

  it('Then the main button says it creates the class, with no play icon, since the game starts on the next screen', () => {
    renderDetails();
    const main = screen.getByTestId('setup-start-live');
    expect(main).toHaveTextContent('eduShell.setup.createClass');
    expect(main.querySelector('svg')).toBeNull();
  });

  it('Given no separate "create only" handler, Then there is one create button, not two that do the same thing', () => {
    renderDetails({ onCreateOnly: undefined });
    expect(screen.queryByTestId('setup-create')).toBeNull();
  });
});
