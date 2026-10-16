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
  it('given any avatarUrl shape, renders the shared avatar for the student id, never an emoji or raw img src', () => {
    const { container } = renderWith([student('a', '😊'), student('b', { face: 'cat' }), student('c', '/avatars/cat.png')]);
    const avatars = screen.getAllByTestId('avatar-lite');
    expect(avatars.map((el) => el.getAttribute('data-user-id'))).toEqual(['a', 'b', 'c']);
    expect(screen.queryByText('😊')).toBeNull();
    expect(container.querySelector('img[src="/avatars/cat.png"]')).toBeNull();
  });

  it('given an avatarConfig, passes it so the face matches the lobby', () => {
    const s = { ...student('d', null), avatarConfig: { bgColor: '#abcdef' } };
    renderWith([s]);
    expect(screen.getByTestId('avatar-lite')).toHaveAttribute('data-has-custom', 'true');
  });

  it('given no avatar at all, still renders an avatar disc, not blank', () => {
    renderWith([student('e', null)]);
    expect(screen.getByTestId('avatar-lite')).toBeInTheDocument();
  });
});
