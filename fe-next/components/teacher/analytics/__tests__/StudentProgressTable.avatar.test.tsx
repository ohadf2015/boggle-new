import { render, screen } from '@testing-library/react';
import { StudentProgressTable } from '../StudentProgressTable';
import { useStudentProgressMetrics } from '@/hooks/useStudentProgressMetrics';
import type { StudentProgressSummary } from '@/lib/supabase/analytics';
import { en } from '../../../../translations/en.js';
import { he } from '../../../../translations/he.js';
import { sv } from '../../../../translations/sv.js';
import { ja } from '../../../../translations/ja.js';
import { es } from '../../../../translations/es.js';
import { ru } from '../../../../translations/ru.js';

vi.mock('@/hooks/useStudentProgressMetrics');
const mockMetrics = useStudentProgressMetrics as unknown as ReturnType<typeof vi.fn>;

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => null }));
vi.mock('../ShareParentReportButton', () => ({ ShareParentReportButton: () => null }));

function student(id: string, avatarUrl: unknown): StudentProgressSummary {
  return {
    studentId: id,
    displayName: `Kid ${id}`,
    avatarUrl: avatarUrl as string | null,
    totalXp: 10,
    currentLevel: 1,
    vocabularyMastery: 10,
    overallAccuracy: 50,
    wordsAttempted: 4,
    wordsMastered: 1,
    lastPracticeDate: null,
    isStruggling: false,
    currentStreak: 0,
  };
}

function renderWith(students: StudentProgressSummary[]) {
  mockMetrics.mockReturnValue({ students, isLoading: false, error: null, refresh: vi.fn() });
  return render(<StudentProgressTable classroomId="c1" />);
}

describe('StudentProgressTable avatars', () => {
  it('given the profiles default emoji avatar, renders it as text instead of handing it to next/image', () => {
    const { container } = renderWith([student('a', '😊')]);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('😊')).toBeInTheDocument();
  });

  it('given an avatar_config object, falls back to the initial without crashing', () => {
    const { container } = renderWith([student('b', { face: 'cat' })]);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('given a real image path, still renders an image', () => {
    const { container } = renderWith([student('c', '/avatars/cat.png')]);
    expect(container.querySelector('img')).not.toBeNull();
  });
});

describe('StudentProgressTable header labels', () => {
  const locales: Record<string, { education: { analytics: Record<string, string> } }> = {
    en, he, sv, ja, es, ru,
  } as never;

  it.each(Object.keys(locales))('%s level/streak headers carry no unfilled placeholders', (lang) => {
    const a = locales[lang].education.analytics;
    for (const key of ['level', 'streak']) {
      expect(a[key]).toBeTruthy();
      expect(a[key]).not.toMatch(/[{}]/);
    }
  });
});
