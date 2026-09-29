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
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/components/teacher/ClassroomStudentList', () => ({
  default: () => <div data-testid="classroom-student-list" />,
}));

vi.mock('@/components/teacher/StudentCapMeter', () => ({
  StudentCapMeter: () => <div data-testid="student-cap-meter" />,
}));

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
  beforeEach(() => vi.clearAllMocks());

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

  it('opens the roster inside the card when the students row is tapped', async () => {
    const user = userEvent.setup();
    const onToggleExpanded = vi.fn();
    render(<ClassCard {...baseProps} onToggleExpanded={onToggleExpanded} />);

    await user.click(screen.getByRole('button', { name: /teacher\.classrooms\.students/ }));
    expect(onToggleExpanded).toHaveBeenCalledTimes(1);
  });
});
