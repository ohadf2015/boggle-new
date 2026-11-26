/**
 * One class on the Classes tab: name, one fact, one primary action, one menu.
 * Everything else a teacher can do with the class lives in the menu.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
  StudentCapMeter: ({ studentCount, source }: { studentCount: number; source?: string }) => (
    <div data-testid="student-cap-meter" data-source={source} data-count={studentCount} />
  ),
}));

let hasPro = false;
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro, loading: false }) }));

import { ClassCard } from '../ClassCard';

const CLASSROOM = { id: 'cls-1', name: 'Period 3', language: 'en', join_code: 'ABC123', member_count: 12 };

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
  classHref: '/en/teacher/classroom/cls-1',
};

const fullProps = {
  ...baseProps,
  assignHref: '/a',
  reportHref: '/r',
  insightHref: '/i',
  onOpenProjector: vi.fn(),
  rehearse: <button type="button" data-testid="rehearse-button">rehearse</button>,
};

const openMenu = () => userEvent.click(screen.getByTestId('classroom-card-menu'));

describe('ClassCard face', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPro = false;
  });

  it('Given every action exists, Then the row shows only the name, the code chip, the round Start and the menu', () => {
    render(<ClassCard {...fullProps} />);
    const card = screen.getByTestId('classroom-card');
    const controls = Array.from(card.querySelectorAll('a, button')).map((el) => el.getAttribute('data-testid'));
    expect(controls).toEqual(['classroom-card-open', 'join-code-plate', 'classroom-card-start-game', 'classroom-card-menu']);
  });

  it('is a compact row with a colour edge, not a colour band over a big body', () => {
    render(<ClassCard {...baseProps} color="cyan" />);
    const card = screen.getByTestId('classroom-card');
    expect(screen.queryByTestId('list-card-band')).toBeNull();
    expect(card.className).toContain('border-s-neo-cyan');
    expect(card.className).not.toMatch(/(^|\s)bg-neo-cyan(\s|$)/);
    expect(within(card).getByRole('heading', { name: 'Period 3' })).toBeInTheDocument();
    expect(within(card).getByTestId('classroom-card-language')).toHaveTextContent('languages.english');
  });

  it('shows the join code as a small chip that copies when tapped, never a big plate', async () => {
    const onCopy = vi.fn().mockResolvedValue(true);
    render(<ClassCard {...baseProps} onCopy={onCopy} />);
    const chip = screen.getByTestId('join-code-plate');
    expect(chip.tagName).toBe('BUTTON');
    expect(within(chip).getByTestId('classroom-join-code')).toHaveTextContent('ABC123');
    expect(within(chip).getByTestId('classroom-join-code').className).not.toMatch(/text-3xl/);
    expect(screen.getByTestId('join-code-plate-caption')).toHaveTextContent('teacher.classroom.tapToCopy');
    await userEvent.click(chip);
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('join-code-plate-caption')).toHaveTextContent('teacher.classroom.codeCopiedShort');
  });

  it('When the clipboard refuses, Then the chip does not claim the code was copied', async () => {
    render(<ClassCard {...baseProps} onCopy={vi.fn().mockResolvedValue(false)} />);
    await userEvent.click(screen.getByTestId('join-code-plate'));
    expect(screen.getByTestId('join-code-plate-caption')).toHaveTextContent('teacher.classroom.tapToCopy');
  });

  it('Given the lead card, Then Start is a round lime button into the host flow, named in words', () => {
    render(<ClassCard {...baseProps} />);
    const start = screen.getByTestId('classroom-card-start-game');
    expect(start.className).toContain('bg-neo-lime');
    expect(start.className).toContain('rounded-full');
    expect(start).toHaveAttribute('href', '/en/teacher?classroomId=cls-1');
    expect(start).toHaveAccessibleName('eduShell.home.startLive');
  });

  it('Given students and activity, Then the fact is the activity line with the faces beside it', () => {
    render(<ClassCard {...baseProps} activity={<span>played</span>} studentPreview={<span data-testid="faces" />} />);
    const fact = screen.getByTestId('classroom-card-fact');
    expect(fact).toHaveTextContent('played');
    expect(within(fact).getByTestId('faces')).toBeInTheDocument();
  });

  it('Given students but no activity line, Then the fact is the student count', () => {
    render(<ClassCard {...baseProps} />);
    expect(screen.getByTestId('classroom-card-fact')).toHaveTextContent('teacher.classroom.studentCountPro_other');
  });

  it('Given no students, Then the fact says so instead of the activity, and the plate carries the code', () => {
    render(<ClassCard {...baseProps} classroom={{ ...CLASSROOM, member_count: 0 }} activity={<span>played</span>} />);
    const fact = screen.getByTestId('classroom-card-fact');
    expect(fact).toHaveTextContent('teacher.pulse.state.noRoster');
    expect(fact).not.toHaveTextContent('ABC123');
    expect(fact).not.toHaveTextContent('played');
  });

  it('keeps long class names recoverable: full name in title, one-line clamp in the row', () => {
    const longName = 'Advanced Placement English Literature and Composition';
    render(<ClassCard {...baseProps} classroom={{ ...CLASSROOM, name: longName }} />);
    const title = screen.getByRole('heading', { name: longName });
    expect(title).toHaveAttribute('title', longName);
    expect(title.className).toContain('line-clamp-1');
    expect(title.className).not.toMatch(/(^|\s)(truncate|uppercase)(\s|$)/);
  });

  it('gives the icon-only menu button a name and a tooltip', () => {
    render(<ClassCard {...baseProps} />);
    const menu = screen.getByTestId('classroom-card-menu');
    expect(menu).toHaveAttribute('aria-label', 'academy.teacher.classActions');
    expect(menu).toHaveAttribute('title', 'academy.teacher.classActions');
  });
});

describe('ClassCard menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPro = false;
  });

  it('is closed until asked for', () => {
    render(<ClassCard {...fullProps} />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('holds every class action, so nothing left the card for good', async () => {
    render(<ClassCard {...fullProps} />);
    await openMenu();
    for (const id of [
      'copy-join-code',
      'share-join-code',
      'classroom-card-projector',
      'share-to-google-classroom',
      'classroom-card-students',
      'classroom-card-assign',
      'classroom-card-report',
      'classroom-card-insight',
      'classroom-card-rehearse',
      'classroom-card-edit',
      'classroom-card-delete',
    ]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
  });

  it.each([
    ['copy-join-code', 'onCopy'],
    ['share-join-code', 'onShare'],
    ['classroom-card-projector', 'onOpenProjector'],
    ['classroom-card-students', 'onToggleExpanded'],
    ['classroom-card-edit', 'onEdit'],
    ['classroom-card-delete', 'onDelete'],
  ] as const)('When %s is picked, Then %s runs and the menu closes', async (id, handler) => {
    render(<ClassCard {...fullProps} />);
    await openMenu();
    await userEvent.click(screen.getByTestId(id));
    expect(fullProps[handler]).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('When rehearse is picked, Then the rehearse button itself runs', async () => {
    const onRehearse = vi.fn();
    render(<ClassCard {...fullProps} rehearse={<button type="button" onClick={onRehearse}>rehearse</button>} />);
    await openMenu();
    await userEvent.click(screen.getByTestId('classroom-card-rehearse'));
    expect(onRehearse).toHaveBeenCalledTimes(1);
  });

  it('names the students, and keeps links as links', async () => {
    render(<ClassCard {...fullProps} />);
    await openMenu();
    expect(screen.getByTestId('classroom-card-students')).toHaveTextContent('teacher.classroom.cardSeeAllStudents_other:{"count":12}');
    expect(screen.getByTestId('classroom-card-students')).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.getByTestId('classroom-card-report')).toHaveAttribute('href', '/r');
    expect(screen.getByTestId('classroom-card-assign')).toHaveAttribute('href', '/a');
    expect(screen.getByRole('menuitem', { name: /googleClassroom/i }).tagName).toBe('A');
  });
});

describe('ClassCard roster dialog', () => {
  beforeEach(() => {
    hasPro = false;
  });

  it('opens the full roster in a dialog, so the page itself never grows', () => {
    render(<ClassCard {...baseProps} expanded />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toContainElement(screen.getByTestId('classroom-student-list'));
    expect(screen.getByTestId('classroom-card')).not.toContainElement(screen.getByTestId('classroom-student-list'));
  });

  it('Given a free teacher, Then the student cap sits on the roster, not on the card', () => {
    render(<ClassCard {...baseProps} expanded />);
    const meter = within(screen.getByRole('dialog')).getByTestId('student-cap-meter');
    expect(meter).toHaveAttribute('data-source', 'classroom_card');
    expect(meter).toHaveAttribute('data-count', '12');
  });

  it('Given a Pro teacher, Then the roster has no cap meter', () => {
    hasPro = true;
    render(<ClassCard {...baseProps} expanded />);
    expect(screen.queryByTestId('student-cap-meter')).toBeNull();
  });
});
