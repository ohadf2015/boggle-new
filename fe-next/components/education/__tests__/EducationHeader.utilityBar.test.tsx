/**
 * The header's controls sit in ONE borderless utility bar — Sound, Language,
 * Help, then the profile/menu — instead of a row of separately boxed buttons.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, profile: { user_role: 'teacher', is_admin: false, display_name: 'Tori' } }),
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'he' }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/he/education/classroom-game' }));
vi.mock('@/lib/supabase', () => ({ signOut: vi.fn() }));
vi.mock('@/components/MusicControls', () => ({ default: () => <button data-testid="sound" /> }));
vi.mock('@/components/QuickLanguageSwitcher', () => ({ QuickLanguageSwitcher: () => <button data-testid="language" /> }));
vi.mock('@/hooks/useSafeArea', () => ({ useSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
vi.mock('../EducationBreadcrumbs', () => ({ EducationBreadcrumbs: () => null }));
vi.mock('@/components/teacher/TeacherWhatsNew', () => ({ TeacherWhatsNew: () => <button data-testid="whats-new" /> }));
vi.mock('@/components/teacher/TeacherHelpButton', () => ({ TeacherHelpButton: () => <button data-testid="help" /> }));

import { EducationHeader } from '../EducationHeader';

const follows = (a: HTMLElement, b: HTMLElement) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('EducationHeader — utility bar', () => {
  it('Given a teacher, When the header renders, Then Sound, Language, Help and Menu live in one bar in that order', () => {
    render(<EducationHeader />);
    const bar = screen.getByTestId('edu-utility-bar');
    const sound = screen.getAllByTestId('sound');
    expect(sound).toHaveLength(1);
    const [s, lang, help, menu] = [sound[0], screen.getByTestId('language'), screen.getByTestId('help'), screen.getByLabelText('common.menu')];
    [s, lang, help, menu].forEach((el) => expect(bar).toContainElement(el));
    expect(follows(s, lang)).toBe(true);
    expect(follows(lang, help)).toBe(true);
    expect(follows(help, menu)).toBe(true);
  });

  it('Given the bar, When it renders, Then it strips each control’s own border and hard shadow', () => {
    render(<EducationHeader />);
    const cls = screen.getByTestId('edu-utility-bar').className;
    expect(cls).toContain('[&>*>button]:border-0!');
    expect(cls).toContain('[&>*>button]:shadow-none!');
    expect(cls).toContain('[&>*>*>button]:border-0!');
  });

  it('Given a Hebrew page, When the header renders, Then the bar follows the page direction instead of a manual reverse', () => {
    render(<EducationHeader />);
    const bar = screen.getByTestId('edu-utility-bar');
    expect(bar).toHaveAttribute('dir', 'rtl');
    expect(bar.className).not.toContain('flex-row-reverse');
  });
});
