import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

const openFold = () => fireEvent.click(screen.getByTestId('setup-advanced-toggle'));

describe('ClassSetupDetails first frame', () => {
  it('Given a new class, Then one name field and one Create button lead, with no step rail, join-code preview or word box', () => {
    renderDetails({ ownWords: { text: '', onTextChange: vi.fn(), count: 0, dropped: 0, min: 4 } });
    expect(screen.getByLabelText('eduShell.setup.nameLabel')).toBeInTheDocument();
    expect(screen.getByTestId('setup-start-live')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-hero="true"]')).toHaveLength(1);
    expect(screen.queryByTestId('setup-step')).toBeNull();
    expect(screen.queryByTestId('setup-code-preview')).toBeNull();
    expect(screen.queryByTestId('setup-own-words')).toBeNull();
    expect(screen.queryByTestId('setup-grade-k2')).toBeNull();
    expect(screen.queryAllByRole('radio').filter((r) => r.hasAttribute('data-pack'))).toHaveLength(0);
  });

  it('Given the fold is closed, Then its one line still says which language, word list and grade the class gets', () => {
    renderDetails();
    const summary = screen.getByTestId('setup-advanced-summary');
    expect(within(screen.getByTestId('setup-advanced-toggle')).getByTestId('setup-advanced-summary')).toBe(summary);
    expect(summary.textContent).toContain('English');
    expect(summary.textContent).toContain('eduShell.setup.packSticker');
    expect(summary.textContent).toContain('eduShell.setup.anyGrade');
  });

  it('Given the fold is opened, Then it says a starter list comes with the class, so the assignment is never silent', () => {
    renderDetails();
    openFold();
    const pack = recommendedPack('en', null);
    expect(screen.getByTestId('setup-starter-list-hint')).toHaveTextContent(`eduShell.setup.starterListHint:${JSON.stringify({ name: pack.nameKey })}`);
  });

  it('When the fold is tapped, Then grade, language and words open, and tapping again hides them', () => {
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

  it('Given a grade was picked before the fold closed, Then the summary names it so the choice is not lost from view', () => {
    renderDetails({ grade: 'g68' });
    expect(screen.getByTestId('setup-advanced-summary').textContent).toContain('eduShell.setup.grade.g68');
  });
});

describe('ClassSetupDetails explains the way out', () => {
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

describe('ClassSetupDetails own words field', () => {
  const own = (count: number, dropped = 0, droppedWords: string[] = [], text = 'x') => ({ text, onTextChange: vi.fn(), count, dropped, droppedWords, min: 4 });

  it('Given the fold is opened, Then one optional words box shows and the starter list is announced', () => {
    renderDetails({ ownWords: own(0, 0, [], '') });
    openFold();
    expect(screen.getByTestId('setup-own-words')).toBeInTheDocument();
    expect(screen.getByText(/common\.optional/)).toBeInTheDocument();
    expect(screen.getByTestId('setup-starter-list-hint')).toBeInTheDocument();
    expect(screen.getAllByRole('button').filter((b) => b.getAttribute('type') === 'submit')).toHaveLength(1);
  });

  it('Given 4 valid words, Then the hint says the class gets the teacher words, not a starter list', () => {
    renderDetails({ ownWords: own(4) });
    openFold();
    expect(screen.queryByTestId('setup-starter-list-hint')).toBeNull();
    expect(screen.getByTestId('setup-own-list-hint')).toHaveTextContent('eduShell.setup.ownWords.listHint:{"count":4}');
    expect(screen.getByTestId('setup-advanced-summary')).toHaveTextContent('eduShell.setup.ownWords.sticker:{"count":4}');
  });

  it('Given too few words typed, Then the fold cannot hide them: it stays open saying how many more are needed', () => {
    renderDetails({ ownWords: own(2) });
    const toggle = screen.getByTestId('setup-advanced-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('setup-own-words-status')).toHaveTextContent('eduShell.setup.ownWords.needMore:{"count":2}');
    expect(screen.getByTestId('setup-starter-list-hint')).toBeInTheDocument();
  });

  it('Given words that cannot be played, Then a yellow chip says how many were left out and names each one', () => {
    renderDetails({ ownWords: own(4, 3, ['electromagnetism-induction', 'x', '42']) });
    openFold();
    const chip = screen.getByTestId('setup-own-words-dropped');
    expect(chip).toHaveTextContent('eduShell.setup.ownWords.dropped:{"count":3}');
    expect(chip.className).toMatch(/bg-neo-yellow/);
    expect(screen.getAllByTestId('setup-dropped-word').map((w) => w.textContent)).toEqual(['electromagnetism-induction', 'x', '42']);
  });
});
