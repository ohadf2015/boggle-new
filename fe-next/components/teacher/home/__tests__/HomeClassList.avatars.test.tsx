import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { HomeClassList } from '../HomeClassList';

const t = (k: string, p?: Record<string, string | number>) => (p?.count !== undefined ? `${k}:${p.count}` : k);

function renderList(studentPreview: Record<string, string[]> | null, memberCount = 6) {
  return render(
    <HomeClassList
      classrooms={[{ id: 'c1', name: 'Room 7B English', member_count: memberCount }]}
      studentPreview={studentPreview}
      lastPlayedAt={{}}
      activityFailed={false}
      newClassHref="/en/teacher/classroom"
      classLimit={null}
      language="en"
      nowMs={Date.parse('2026-10-16T12:00:00Z')}
      t={t}
    />,
  );
}

describe('<HomeClassList> student avatar stack', () => {
  it('Given a class with students, Then it shows up to 4 shared avatars and a +N for the rest', () => {
    renderList({ c1: ['s1', 's2', 's3', 's4'] }, 6);
    const stack = screen.getByTestId('home-class-avatars');
    expect(within(stack).getAllByTestId('avatar-lite')).toHaveLength(4);
    expect(stack).toHaveTextContent('+2');
  });

  it('Given exactly 3 students, Then 3 avatars and no +N', () => {
    renderList({ c1: ['s1', 's2', 's3'] }, 3);
    const stack = screen.getByTestId('home-class-avatars');
    expect(within(stack).getAllByTestId('avatar-lite')).toHaveLength(3);
    expect(stack).not.toHaveTextContent('+');
  });

  it('Given an empty class, Then a fallback badge replaces the stack', () => {
    renderList({ c1: [] }, 0);
    expect(screen.queryByTestId('home-class-avatars')).toBeNull();
    expect(screen.getByTestId('home-class-badge')).toHaveTextContent('ROO');
  });

  it('Given the preview is still loading, Then the badge shows rather than a blank slot', () => {
    renderList(null, 6);
    expect(screen.queryByTestId('home-class-avatars')).toBeNull();
    expect(screen.getByTestId('home-class-badge')).toBeInTheDocument();
  });
});
