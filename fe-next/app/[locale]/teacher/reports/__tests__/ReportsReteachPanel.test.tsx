import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ClassEvidence } from '../reteachSnapshotModel';
import type { HardWord } from '@/lib/education/wordMasteryReport';

const snapshotState: {
  value: { status: 'loading' } | { status: 'error' } | { status: 'ready'; snapshot: ClassEvidence | null };
} = {
  value: { status: 'loading' },
};
const hookInput = vi.fn();
vi.mock('../useReteachSnapshot', () => ({
  useReteachSnapshot: (classes: unknown) => {
    hookInput(classes);
    return snapshotState.value;
  },
}));

const tracked = vi.fn();
vi.mock('@/components/education/results/trackResultsAction', () => ({
  trackReteachStarted: (p: unknown) => tracked(p),
}));

const pro = { hasPro: false };
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));

const ROSTER = { s1: 'Maya', s2: 'Leo', s3: 'Noa', s4: 'Sam', s5: 'Ari' };
const roster: { names: Record<string, string> } = { names: ROSTER };
vi.mock('@/components/teacher/reports/useWordMasteryReport', () => ({
  useRosterNames: () => roster.names,
}));

vi.mock('@/components/teacher/reports/MissedPracticeAction', () => ({
  MissedPracticeAction: ({ words }: { words?: string[] }) => (
    <button type="button" data-testid="missed-practice" data-words={(words ?? []).join(',')}>
      practice
    </button>
  ),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string, fallback?: string | Record<string, unknown>, params?: Record<string, unknown>) => {
      const text = typeof fallback === 'string' ? fallback : key;
      const vars = (typeof fallback === 'object' ? fallback : params) ?? {};
      return text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
    },
  }),
}));

import { ReportsReteachPanel } from '../ReportsReteachPanel';

const word = (w: string, missRate: number): HardWord => ({
  word: w,
  display: w,
  attempts: 8,
  missed: 4,
  missRate,
  studentsMissing: 3,
  studentsAsked: 5,
});

const real = (over: Partial<ClassEvidence> = {}): ClassEvidence => ({
  classroomId: 'c1',
  classroomName: 'Grade 4 Room 12',
  sessions: 6,
  classAccuracy: 64,
  words: [word('thunder', 80), word('breeze', 60), word('rain', 0)],
  needsHelp: ['s1', 's2'],
  locked: false,
  ...over,
});

const classes = [{ id: 'c1', name: 'Grade 4 Room 12', member_count: 5 }];

describe('ReportsReteachPanel', () => {
  beforeEach(() => {
    tracked.mockClear();
    roster.names = ROSTER;
  });

  it('given a class that played, when shown, then it lists its missed words with miss rates and who needs help', () => {
    snapshotState.value = { status: 'ready', snapshot: real() };
    render(<ReportsReteachPanel classrooms={classes} onOpenClass={vi.fn()} />);
    const panel = screen.getByTestId('reports-reteach-panel');
    expect(within(panel).queryByTestId('reteach-example-pill')).toBeNull();
    const rows = within(panel).getAllByTestId('reteach-word');
    expect(rows.map((r) => r.getAttribute('data-word'))).toEqual(['thunder', 'breeze']);
    expect(rows[0]).toHaveTextContent('80% missed');
    expect(within(panel).getByTestId('reteach-needs-help')).toHaveTextContent('Maya');
    expect(within(panel).getByTestId('missed-practice')).toHaveAttribute('data-words', 'thunder,breeze');
  });

  it('given a Latin class name in a Hebrew sentence, when shown, then the name is bidi-isolated so its digits stay in place', () => {
    snapshotState.value = { status: 'ready', snapshot: real() };
    render(<ReportsReteachPanel classrooms={classes} onOpenClass={vi.fn()} />);
    expect(screen.getByTestId('reports-reteach-panel')).toHaveTextContent('Words ⁨Grade 4 Room 12⁩ missed most');
  });

  it('given five students below the goal, when shown, then three names fit one row and the rest is a count', () => {
    snapshotState.value = { status: 'ready', snapshot: real({ needsHelp: ['s1', 's2', 's3', 's4', 's5'] }) };
    render(<ReportsReteachPanel classrooms={classes} onOpenClass={vi.fn()} />);
    const help = screen.getByTestId('reteach-needs-help');
    expect(help).toHaveTextContent('Maya');
    expect(help).toHaveTextContent('Noa');
    expect(help).not.toHaveTextContent('Sam');
    expect(help).toHaveTextContent('+2 more');
  });

  it('given the roster has not loaded, when shown, then no bare "+N more" stands in for the names', () => {
    roster.names = {};
    snapshotState.value = { status: 'ready', snapshot: real({ needsHelp: ['s1', 's2', 's3', 's4', 's5'] }) };
    render(<ReportsReteachPanel classrooms={classes} onOpenClass={vi.fn()} />);
    expect(screen.getByTestId('reteach-needs-help')).not.toHaveTextContent(/more/);
  });

  it('given the practice tap, when pressed, then edu_reteach_started fires from reports', async () => {
    snapshotState.value = { status: 'ready', snapshot: real() };
    render(<ReportsReteachPanel classrooms={classes} onOpenClass={vi.fn()} />);
    await userEvent.click(screen.getByTestId('missed-practice'));
    expect(tracked).toHaveBeenCalledWith({ surface: 'reports', words: 2, plan: 'free' });
  });

  it('given the secondary action, when pressed, then it opens that class report', async () => {
    const onOpenClass = vi.fn();
    snapshotState.value = { status: 'ready', snapshot: real() };
    render(<ReportsReteachPanel classrooms={classes} onOpenClass={onOpenClass} />);
    await userEvent.click(screen.getByTestId('reteach-open-class'));
    expect(onOpenClass).toHaveBeenCalledWith('c1');
  });

  it('given a free answer, when shown, then who needs help is a labelled Pro preview and practice starts a game', () => {
    snapshotState.value = { status: 'ready', snapshot: real({ locked: true, needsHelp: [] }) };
    render(<ReportsReteachPanel classrooms={classes} onOpenClass={vi.fn()} />);
    const help = screen.getByTestId('reteach-needs-help');
    expect(within(help).getByTestId('pro-pill')).toBeInTheDocument();
    expect(screen.queryByTestId('missed-practice')).toBeNull();
    expect(screen.getByTestId('reteach-start-game')).toHaveAttribute('href', '/en/education/classroom-game?classroomId=c1');
  });

  it('given no class has played, when shown, then a clearly labelled example shows what a report holds', () => {
    snapshotState.value = { status: 'ready', snapshot: null };
    render(<ReportsReteachPanel classrooms={classes} onOpenClass={vi.fn()} />);
    const panel = screen.getByTestId('reports-reteach-panel');
    expect(within(panel).getByTestId('reteach-example-pill')).toHaveTextContent('Example');
    expect(within(panel).getAllByTestId('reteach-word').length).toBeGreaterThanOrEqual(3);
    expect(within(panel).queryByTestId('missed-practice')).toBeNull();
    expect(within(panel).getByTestId('reteach-start-game')).toHaveAttribute(
      'href',
      '/en/education/classroom-game?classroomId=c1'
    );
  });

  it('given no classes at all, when shown, then the example has no action of its own', () => {
    snapshotState.value = { status: 'ready', snapshot: null };
    render(<ReportsReteachPanel classrooms={[]} onOpenClass={vi.fn()} />);
    expect(screen.getByTestId('reteach-example-pill')).toBeInTheDocument();
    expect(screen.queryByTestId('reteach-start-game')).toBeNull();
  });

  it('given evidence still loading, when shown, then the panel holds its space without fake words', () => {
    snapshotState.value = { status: 'loading' };
    render(<ReportsReteachPanel classrooms={classes} onOpenClass={vi.fn()} />);
    expect(screen.getByTestId('reports-reteach-panel')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryAllByTestId('reteach-word')).toHaveLength(0);
  });

  it('given a class report, when focused on that class, then only it is read and the open-report action is gone', () => {
    snapshotState.value = { status: 'ready', snapshot: real() };
    const two = [...classes, { id: 'c2', name: 'Other', member_count: 9 }];
    render(<ReportsReteachPanel classrooms={two} onOpenClass={vi.fn()} focusClassroomId="c1" />);
    expect(hookInput).toHaveBeenLastCalledWith([classes[0]]);
    expect(screen.queryByTestId('reteach-open-class')).toBeNull();
    expect(screen.getByTestId('missed-practice')).toBeInTheDocument();
  });

  it('given no class could be read, when shown, then nothing renders instead of a misleading example', () => {
    snapshotState.value = { status: 'error' };
    render(<ReportsReteachPanel classrooms={classes} onOpenClass={vi.fn()} />);
    expect(screen.queryByTestId('reports-reteach-panel')).toBeNull();
    expect(screen.queryByTestId('reteach-example-pill')).toBeNull();
  });
});
