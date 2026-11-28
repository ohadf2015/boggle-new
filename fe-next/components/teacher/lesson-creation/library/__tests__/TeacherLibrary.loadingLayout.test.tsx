import React from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherLibrary } from '../TeacherLibrary';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/en/teacher/curriculum',
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));
vi.mock('../DiscoverPanel', () => ({ default: () => <div data-testid="discover-panel" /> }));

const builder = vi.hoisted(() => ({ report: null as null | ((n: number) => void) }));
vi.mock('@/components/teacher/LessonBuilder', () => ({
  default: ({ onListCount }: { onListCount?: (count: number) => void }) => {
    builder.report = onListCount ?? null;
    return <div data-testid="my-lists" />;
  },
}));

describe('Library while the teacher lists load', () => {
  it('adds the Discover row only once the lists above it have their final height', () => {
    // Given the teacher's own lists are still loading
    render(<TeacherLibrary />);
    expect(screen.queryByTestId('library-discover-toggle')).not.toBeInTheDocument();

    // When the list count arrives
    act(() => builder.report?.(4));

    // Then the Discover row appears below them
    expect(screen.getByTestId('library-discover-toggle')).toBeInTheDocument();
  });
});
