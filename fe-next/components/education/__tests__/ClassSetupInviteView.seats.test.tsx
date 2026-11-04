import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { RosterStudent } from '@/components/teacher/hq/rosterModel';

vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => false }));
vi.mock('@/components/education/EduMascot', () => ({ EduMascot: () => null }));

import { ClassSetupInviteView } from '../ClassSetupInviteView';

const realMatchMedia = window.matchMedia;

function setWide(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide && query.includes('min-width'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const students = (n: number): RosterStudent[] => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, name: `Kid ${i}`, avatar: null }));

function renderView(list: RosterStudent[], arrivals: string[] = [], reduced = false) {
  return render(
    <ClassSetupInviteView
      classroom={{ name: '7B', join_code: 'BLDA7Q' }}
      roster={{ students: list, arrivals, loading: false }}
      joinUrl="https://x.test/en/join/BLDA7Q"
      displayHost="x.test/en/join"
      startHref="#"
      homeHref="/en/teacher"
      reduced={reduced}
      onShare={vi.fn()}
      onOpenProjector={vi.fn()}
      t={(k) => k}
    />,
  );
}

describe('ClassSetupInviteView roster seats', () => {
  afterEach(() => {
    window.matchMedia = realMatchMedia;
  });

  it('Given a wide screen and six students, Then every student has a named seat and nobody hides behind a +N chip', () => {
    setWide(true);
    renderView(students(6));
    const roster = screen.getByTestId('invite-roster');
    expect(within(roster).getAllByTestId('hq-roster-seat')).toHaveLength(6);
    expect(within(roster).queryByText(/^\+\d+$/)).toBeNull();
  });

  it('Given a phone and six students, Then the row stays one line of five with a +N chip', () => {
    setWide(false);
    renderView(students(6));
    const roster = screen.getByTestId('invite-roster');
    expect(within(roster).getAllByTestId('hq-roster-seat')).toHaveLength(4);
    expect(within(roster).getByText('+2')).toBeInTheDocument();
  });

  it('Given a student just arrived, Then the roster sparkles once for them', () => {
    setWide(false);
    renderView(students(2), ['s1']);
    expect(within(screen.getByTestId('invite-roster')).getAllByTestId('edu-burst-piece').length).toBeGreaterThan(0);
  });

  it('Given no new arrival or reduced motion, Then nothing sparkles', () => {
    setWide(false);
    const quiet = renderView(students(2));
    expect(screen.queryAllByTestId('edu-burst-piece')).toHaveLength(0);
    quiet.unmount();
    renderView(students(2), ['s1'], true);
    expect(screen.queryAllByTestId('edu-burst-piece')).toHaveLength(0);
  });
});
