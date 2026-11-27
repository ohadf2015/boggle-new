import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { packsForLanguage, recommendedPack } from '../starterPackPick';

vi.mock('@/components/education/EduMascot', () => ({ EduMascot: () => null }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (k: string) => k }) }));

import { ClassSetupDetails } from '../ClassSetupDetails';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

function detailsProps(overrides: Partial<Parameters<typeof ClassSetupDetails>[0]> = {}): Parameters<typeof ClassSetupDetails>[0] {
  const pack = recommendedPack('en', null);
  return {
    name: '',
    onNameChange: vi.fn(),
    grade: null,
    onGradeChange: vi.fn(),
    language: 'en',
    onLanguageChange: vi.fn(),
    packs: packsForLanguage('en'),
    pack,
    recommendedKey: pack.nameKey,
    onPackChange: vi.fn(),
    cap: null,
    busy: null,
    errorKey: null,
    onStartLive: vi.fn(),
    onCreateOnly: vi.fn(),
    skipHref: '/en/teacher',
    t,
    ...overrides,
  };
}

function renderDetails(overrides: Partial<Parameters<typeof ClassSetupDetails>[0]> = {}) {
  return render(<ClassSetupDetails {...detailsProps(overrides)} />);
}

const openFold = () => fireEvent.click(screen.getByTestId('setup-advanced-toggle'));

describe('ClassSetupDetails first frame', () => {
  it('Given a new class, Then one name field and one Create button lead, with no step rail or word box', () => {
    renderDetails({ ownWords: { text: '', onTextChange: vi.fn(), count: 0, dropped: 0, min: 4 } });
    expect(screen.getByLabelText('eduShell.setup.nameLabel')).toBeInTheDocument();
    expect(screen.getByTestId('setup-start-live')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-hero="true"]')).toHaveLength(1);
    expect(screen.queryByTestId('setup-step')).toBeNull();
    expect(screen.queryByTestId('setup-own-words')).toBeNull();
    expect(screen.queryByTestId('setup-grade-k2')).toBeNull();
    expect(screen.queryAllByRole('radio').filter((r) => r.hasAttribute('data-pack'))).toHaveLength(0);
  });

  it('Given a name typed, Then the join-code card shows that name over placeholder tiles, never a code a teacher could copy', () => {
    renderDetails({ name: '5B English' });
    const card = screen.getByTestId('setup-code-preview');
    expect(card).toHaveTextContent('5B English');
    expect(card.textContent).not.toMatch(/[A-Z0-9]{6}/);
    expect(screen.getAllByTestId('setup-code-placeholder')).toHaveLength(6);
    expect(card.querySelector('button, a, input')).toBeNull();
  });

  it('Given no name yet, Then the join-code card never shows the name example as if it were the code', () => {
    renderDetails();
    const card = screen.getByTestId('setup-code-preview');
    expect(card).not.toHaveTextContent('eduShell.setup.namePlaceholder');
    expect(card).toHaveTextContent('eduShell.setup.joinCode');
    expect(card).toHaveTextContent('eduShell.setup.codePending');
    expect(screen.getAllByTestId('setup-code-placeholder')).toHaveLength(6);
  });

  it('Given the grade picks a suggested name, Then the card still never echoes it before the teacher types', () => {
    renderDetails({ grade: 'g35' });
    expect(screen.getByTestId('setup-code-preview')).not.toHaveTextContent('eduShell.setup.gradeName.g35');
  });

  it('Then the name, the code preview and the fold are white outlined cards with a black lip, and the fold is never dashed', () => {
    renderDetails();
    const field = screen.getByTestId('setup-name-card');
    expect(field.className).toContain('edu-card');
    expect(field).toContainElement(screen.getByLabelText('eduShell.setup.nameLabel'));
    const preview = screen.getByTestId('setup-code-preview');
    expect(preview.className).toContain('edu-card');
    expect(preview.className).not.toMatch(/bg-neo-cream|shadow-hard-lime/);
    const fold = screen.getByTestId('setup-advanced-toggle');
    expect(fold.className).not.toContain('border-dashed');
    expect(fold.className).toContain('bg-edu-surface');
    expect(fold.className).toContain('shadow-edu-lip');
  });

  it('Given a name typed, Then the tiles turn solid so the card answers the typing', () => {
    const { rerender } = renderDetails();
    expect(screen.getAllByTestId('setup-code-placeholder')[0].className).toContain('border-dashed');
    rerender(<ClassSetupDetails {...detailsProps({ name: 'A' })} />);
    expect(screen.getAllByTestId('setup-code-placeholder')[0].className).toContain('border-solid');
  });

  it('Create class has one label per state: ready, busy (disabled, busy), done (disabled)', () => {
    const { rerender } = renderDetails();
    const btn = () => screen.getByTestId('setup-start-live');
    expect(btn()).toBeEnabled();
    expect(btn()).toHaveTextContent('eduShell.setup.createClass');
    rerender(<ClassSetupDetails {...detailsProps({ busy: 'live' })} />);
    expect(btn()).toBeDisabled();
    expect(btn()).toHaveAttribute('aria-busy', 'true');
    expect(btn()).toHaveTextContent('eduShell.setup.creating');
    rerender(<ClassSetupDetails {...detailsProps({ busy: 'done' })} />);
    expect(btn()).toBeDisabled();
    expect(btn()).not.toHaveAttribute('aria-busy');
    expect(btn()).toHaveTextContent('eduShell.setup.readyTitle');
  });

  it('Given the fold is closed, Then its summary stickers are not buttons of their own inside the toggle', () => {
    renderDetails();
    const summary = screen.getByTestId('setup-advanced-summary');
    expect(summary.querySelectorAll('button')).toHaveLength(0);
    expect(summary.querySelectorAll('[data-sticker]')).toHaveLength(3);
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
    expect(toggle).toBeDisabled();
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

describe('ClassSetupDetails on a short laptop screen', () => {
  const SHORT = '[@media(min-width:1024px)_and_(max-height:860px)]:';
  it('Then the title, the gaps and Create class shrink so Create stays above the fold at 1366x768', () => {
    renderDetails();
    expect(screen.getByRole('heading', { level: 1 }).className).toContain(`${SHORT}text-5xl`);
    expect(screen.getByTestId('setup-start-live').className).toContain(`${SHORT}min-h-[64px]`);
    expect(screen.getByTestId('setup-step-details').firstElementChild!.className).toContain(`${SHORT}gap-3`);
  });
});
