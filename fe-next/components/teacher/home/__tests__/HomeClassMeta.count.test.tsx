import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/AvatarLite', () => ({ default: () => <span /> }));

import { HomeClassMeta } from '../HomeClassList';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);

describe('<HomeClassMeta> student count', () => {
  it('Given one student, Then it says "1 student", not "1 students"', () => {
    render(<HomeClassMeta previewIds={[]} memberCount={1} played={undefined} pending={false} failed={false} language="en" nowMs={0} t={t} />);
    expect(screen.getByTestId('home-desk-meta')).toHaveTextContent('eduShell.home.studentsOne');
  });

  it('Given several students, Then it uses the counted form', () => {
    render(<HomeClassMeta previewIds={[]} memberCount={4} played={undefined} pending={false} failed={false} language="en" nowMs={0} t={t} />);
    expect(screen.getByTestId('home-desk-meta')).toHaveTextContent('eduShell.home.students:{"count":4}');
  });
});
