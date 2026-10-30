/**
 * ClassCard — the refined-surfaces contract for one class on the Classes tab.
 *
 * The bar is Kahoot's Kahoots page: ONE primary verb in the spotlight (Start
 * a game), the join code readable from the back row (ink-on-cream plate),
 * copy/share as the secondary pair, and everything rare (rename, delete,
 * Google Classroom) demoted behind a "…" menu. The shell follows the Teacher
 * HQ recipe: navy-light panel, hairline cream border, no saturated fills
 * besides the one hero.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: unknown) => (p && typeof p === 'object' ? `${k}:${JSON.stringify(p)}` : k),
    language: 'en',
  }),
}));

vi.mock('../GoogleClassroomRosterImport', () => ({
  GoogleClassroomRosterImport: () => <div data-testid="google-roster-import" />,
}));

vi.mock('@/components/teacher/ClassroomStudentList', () => ({
  default: () => <div data-testid="classroom-student-list" />,
}));

vi.mock('@/components/teacher/StudentCapMeter', () => ({
  StudentCapMeter: () => <div data-testid="student-cap-meter" />,
}));

let hasPro = false;
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro, loading: false }) }));

import { ClassCard } from '../ClassCard';

const CLASSROOM = {
  id: 'cls-1',
  name: 'Period 3',
  language: 'en',
  join_code: 'ABC123',
  member_count: 12,
};

const baseProps = {
  classroom: CLASSROOM,
  expanded: false,
  onToggleExpanded: vi.fn(),
  onCopy: vi.fn(),
  onShare: vi.fn(),
  googleHref: 'https://classroom.google.com/share?url=x',
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  startGameHref: '/en/teacher?classroomId=cls-1',
};

describe('ClassCard — refined surfaces', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPro = false;
  });

  it('Given a free teacher, Then the card shows the student cap meter', () => {
    render(<ClassCard {...baseProps} />);
    expect(screen.getByTestId('student-cap-meter')).toBeInTheDocument();
  });

  it('Given a Pro teacher, Then no cap meter repeats the student count the roster toggle already shows', () => {
    hasPro = true;
    render(<ClassCard {...baseProps} />);
    expect(screen.queryByTestId('student-cap-meter')).toBeNull();
  });

  it('is a calm navy panel: hairline cream border, no cream slab, no border-3', () => {
    render(<ClassCard {...baseProps} />);
    const cls = screen.getByTestId('classroom-card').className.toString();
    expect(cls).toContain('bg-neo-navy-light');
    expect(cls).toContain('border-neo-cream/40');
    expect(cls).not.toMatch(/border-3|border-\[3px\]/);
    expect(cls).not.toContain('bg-neo-cream');
  });

  it('keeps the join code on an ink-on-cream plate, readable from the back row', () => {
    render(<ClassCard {...baseProps} />);
    const code = screen.getByTestId('classroom-join-code');
    expect(code).toHaveTextContent('ABC123');
    expect(code.className).toMatch(/text-3xl|text-4xl|text-5xl/);
    const plate = code.closest('[data-testid="join-code-plate"]');
    expect(plate).not.toBeNull();
    expect(plate!.className).toContain('bg-neo-cream');
  });

  it('gives the card exactly ONE saturated fill: the Start-a-game hero', () => {
    render(<ClassCard {...baseProps} />);
    const start = screen.getByTestId('classroom-card-start-game');
    expect(start.className).toContain('bg-neo-lime');
    expect(start).toHaveAttribute('href', '/en/teacher?classroomId=cls-1');
    // No other lime/cyan/pink fill competes on the card.
    const card = screen.getByTestId('classroom-card');
    const saturated = Array.from(card.querySelectorAll('*')).filter((el) =>
      /bg-neo-(lime|cyan|pink)(\/|\s|$)/.test((el as HTMLElement).className?.toString?.() ?? ''),
    );
    expect(saturated).toHaveLength(1);
  });

  it('keeps copy and share visible as the secondary pair beside the code', () => {
    render(<ClassCard {...baseProps} />);
    expect(screen.getByTestId('copy-join-code')).toBeInTheDocument();
    expect(screen.getByTestId('share-join-code')).toBeInTheDocument();
  });

  it('demotes rename, delete and Google Classroom behind the "…" menu', async () => {
    const user = userEvent.setup();
    render(<ClassCard {...baseProps} />);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('classroom-card-menu'));

    expect(screen.getByRole('menuitem', { name: 'teacher.classroom.edit' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'teacher.classroom.delete' })).toBeInTheDocument();
    const google = screen.getByRole('menuitem', { name: /googleClassroom/i });
    expect(google.tagName).toBe('A');
  });

  it('runs edit/delete through the menu callbacks and closes the menu', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<ClassCard {...baseProps} onEdit={onEdit} />);

    await user.click(screen.getByTestId('classroom-card-menu'));
    await user.click(screen.getByRole('menuitem', { name: 'teacher.classroom.edit' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('names the class in a quiet sentence-case title, not the hero treatment', () => {
    render(<ClassCard {...baseProps} />);
    const title = screen.getByRole('heading', { name: 'Period 3' });
    expect(title.className).not.toMatch(/uppercase/);
    expect(title.className).not.toMatch(/text-shadow/);
  });

  it('keeps long class names recoverable: full name in title, two-line clamp', () => {
    const longName = 'Advanced Placement English Literature and Composition';
    render(<ClassCard {...baseProps} classroom={{ ...CLASSROOM, name: longName }} />);

    const title = screen.getByRole('heading', { name: longName });
    expect(title).toHaveAttribute('title', longName);
    expect(title.className).toContain('line-clamp-2');
    expect(title.className).not.toMatch(/(^|\s)truncate(\s|$)/);
  });

  it('asks to see the whole roster from the students row', async () => {
    const user = userEvent.setup();
    const onToggleExpanded = vi.fn();
    render(<ClassCard {...baseProps} onToggleExpanded={onToggleExpanded} />);

    const students = screen.getByTestId('classroom-card-students');
    expect(students).toHaveTextContent('teacher.classroom.cardSeeAllStudents:{"count":12}');
    await user.click(students);
    expect(onToggleExpanded).toHaveBeenCalledTimes(1);
  });

  it('opens the full roster in a dialog, so the page itself never grows', () => {
    render(<ClassCard {...baseProps} expanded />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toContainElement(screen.getByTestId('classroom-student-list'));
    expect(screen.getByTestId('classroom-card')).not.toContainElement(screen.getByTestId('classroom-student-list'));
  });

  it('shows a short student preview beside the roster button', () => {
    render(<ClassCard {...baseProps} studentPreview={<span data-testid="avatar-stack" />} />);
    expect(screen.getByTestId('avatar-stack')).toBeInTheDocument();
  });

  it('labels the one primary action the same as Teacher home: Pick a game', () => {
    render(<ClassCard {...baseProps} />);
    const start = screen.getByTestId('classroom-card-start-game');
    expect(start).toHaveTextContent('eduShell.home.startLive');
    expect(start.className).not.toMatch(/(^|\s)uppercase(\s|$)/);
  });

  it('never shouts: no uppercase micro-labels anywhere on the card', () => {
    render(<ClassCard {...baseProps} reportHref="/r" assignHref="/a" onOpenProjector={vi.fn()} />);
    const card = screen.getByTestId('classroom-card');
    const loud = [card, ...Array.from(card.querySelectorAll('*'))].filter((el) =>
      /(^|\s)uppercase(\s|$)/.test((el as HTMLElement).className?.toString?.() ?? ''),
    );
    expect(loud).toHaveLength(0);
  });

  it('names the class language in words, not a two-letter code', () => {
    render(<ClassCard {...baseProps} />);
    expect(screen.getByTestId('classroom-card-language')).toHaveTextContent('languages.english');
  });

  it('puts only the code on the cream tile; copy, share and show-on-board are outlined buttons on navy', () => {
    render(<ClassCard {...baseProps} onOpenProjector={vi.fn()} />);
    const plate = screen.getByTestId('join-code-plate');
    for (const id of ['copy-join-code', 'share-join-code', 'classroom-card-projector']) {
      const btn = screen.getByTestId(id);
      expect(plate).not.toContainElement(btn);
      expect(btn.className).not.toMatch(/(^|\s)bg-neo-(cream|navy|white|black)(\s|$)/);
      expect(btn.className).toMatch(/border-neo-cream/);
    }
    expect(screen.getByTestId('classroom-card-projector')).toHaveTextContent('academy.hq.openProjector');
  });

  it('never cuts a label with an ellipsis', () => {
    render(<ClassCard {...baseProps} reportHref="/r" assignHref="/a" onOpenProjector={vi.fn()} />);
    const card = screen.getByTestId('classroom-card');
    const cut = Array.from(card.querySelectorAll('*')).filter((el) =>
      /(^|\s)truncate(\s|$)/.test((el as HTMLElement).className?.toString?.() ?? ''),
    );
    expect(cut).toHaveLength(0);
  });

  it('labels the secondary links in teacher words', () => {
    render(<ClassCard {...baseProps} reportHref="/r" assignHref="/a" />);
    expect(screen.getByTestId('classroom-card-report')).toHaveTextContent('teacher.classroom.cardClassReport');
    expect(screen.getByTestId('classroom-card-assign')).toHaveTextContent('teacher.classroom.cardAssignHomework');
  });

  it('gives the icon-only menu button a name and a tooltip', () => {
    render(<ClassCard {...baseProps} />);
    const menu = screen.getByTestId('classroom-card-menu');
    expect(menu).toHaveAttribute('aria-label', 'academy.teacher.classActions');
    expect(menu).toHaveAttribute('title', 'academy.teacher.classActions');
  });
});
