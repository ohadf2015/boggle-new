import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/components/teacher/hq/ClassStreakLine', () => ({
  ClassStreakLine: ({ classroomId }: { classroomId: string }) => <p data-testid="streak-for">{classroomId}</p>,
}));

import { HomeClassList } from '../HomeClassList';

const props = {
  studentPreview: null,
  lastPlayedAt: {},
  activityFailed: false,
  newClassHref: '/en/teacher/classroom',
  classLimit: null,
  language: 'en',
  nowMs: Date.parse('2026-10-16T12:00:00Z'),
  t: (k: string) => k,
};

describe('<HomeClassList> class streak', () => {
  it('Given classes with students, Then each row carries its own class streak next to its play button', () => {
    render(
      <HomeClassList
        {...props}
        classrooms={[
          { id: 'c1', name: '7B', member_count: 5 },
          { id: 'c2', name: '8A', member_count: 3 },
        ]}
      />,
    );
    expect(screen.getAllByTestId('streak-for').map((n) => n.textContent)).toEqual(['c1', 'c2']);
  });

  it('Given a class with no students, Then no streak is asked for', () => {
    render(<HomeClassList {...props} classrooms={[{ id: 'c1', name: '7B', member_count: 0 }]} />);
    expect(screen.queryByTestId('streak-for')).toBeNull();
  });
});
