import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

let pathname = '/en/teacher/nope';
let language = 'en';
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

vi.mock('next/navigation', () => ({ usePathname: () => pathname, notFound: () => notFound() }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language }) }));
vi.mock('@/components/education/EduMascot', () => ({ EduMascot: () => null }));

import { EduNotFound } from '../EduNotFound';
import TeacherNotFound from '@/app/[locale]/teacher/not-found';
import ClassroomGameNotFound from '@/app/[locale]/education/classroom-game/not-found';
import TeacherMissing from '@/app/[locale]/teacher/[...missing]/page';
import ClassroomGameMissing from '@/app/[locale]/education/classroom-game/[...missing]/page';

afterEach(cleanup);

describe('<EduNotFound>', () => {
  it.each([
    ['/he/teacher/nope', 'he', '/he/teacher', 'eduShell.error.backToClasses'],
    ['/en/education/classroom-game/old', 'en', '/en/teacher', 'eduShell.error.backToClasses'],
    ['/es/join/AB/x', 'es', '/es/join', 'eduShell.error.enterCode'],
    ['/sv/student/nope', 'sv', '/sv/student', 'eduShell.error.backToClass'],
  ])('Given a missing page at %s, Then its only action returns to %s', (path, lang, target, label) => {
    pathname = path;
    language = lang;
    render(<EduNotFound />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('eduShell.notFound.title');
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', target);
    expect(links[0]).toHaveTextContent(label);
  });

  it('the teacher and classroom-game boundaries render it', () => {
    pathname = '/en/teacher/nope';
    language = 'en';
    render(<TeacherNotFound />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/en/teacher');
    cleanup();
    pathname = '/en/education/classroom-game/nope';
    render(<ClassroomGameNotFound />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/en/teacher');
  });

  it('an unknown URL under those sections raises the section 404 instead of the site-wide one', () => {
    expect(() => TeacherMissing()).toThrow('NEXT_NOT_FOUND');
    expect(() => ClassroomGameMissing()).toThrow('NEXT_NOT_FOUND');
  });
});
