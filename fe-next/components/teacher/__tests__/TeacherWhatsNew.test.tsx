import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', isRTL: false }),
}));

import { TeacherWhatsNew } from '../TeacherWhatsNew';
import { TEACHER_CHANGELOG, WHATS_NEW_SEEN_KEY } from '@/lib/education/teacherChangelog';

describe('TeacherWhatsNew', () => {
  beforeEach(() => localStorage.clear());

  it('shows an unread dot until the teacher opens it', () => {
    render(<TeacherWhatsNew />);
    expect(screen.getByTestId('whats-new-dot')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('whats-new-button'));

    expect(screen.queryByTestId('whats-new-dot')).toBeNull();
    expect(localStorage.getItem(WHATS_NEW_SEEN_KEY)).toBe(TEACHER_CHANGELOG[0].id);
  });

  it('lists every item of the latest entry by translation key', () => {
    render(<TeacherWhatsNew />);
    fireEvent.click(screen.getByTestId('whats-new-button'));

    const latest = TEACHER_CHANGELOG[0];
    expect(screen.getByText(`education.whatsNew.entries.${latest.id}.title`)).toBeInTheDocument();
    for (const item of latest.items) {
      expect(screen.getByText(`education.whatsNew.entries.${latest.id}.${item.key}`)).toBeInTheDocument();
    }
  });

  it('shows no dot for a teacher who already saw the latest entry', () => {
    localStorage.setItem(WHATS_NEW_SEEN_KEY, TEACHER_CHANGELOG[0].id);
    render(<TeacherWhatsNew />);
    expect(screen.getByTestId('whats-new-button')).toBeInTheDocument();
    expect(screen.queryByTestId('whats-new-dot')).toBeNull();
  });
});
