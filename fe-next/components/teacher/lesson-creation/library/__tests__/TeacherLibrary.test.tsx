import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { LibraryItem } from '@/lib/education/libraryTypes';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const myLessons: { id: string; name: string }[] = [];
const copyToMine = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/en/teacher/curriculum',
  useSearchParams: () => new URLSearchParams('tab=discover'),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'teacher-1' }, isAuthenticated: true, loading: false }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/useVocabularyLesson', () => ({
  useLessons: () => ({ lessons: myLessons, isLoading: false }),
}));
vi.mock('@/components/teacher/LessonBuilder', () => ({
  default: () => (
    <ul data-testid="my-lists">
      {myLessons.map((l) => (
        <li key={l.id}>{l.name}</li>
      ))}
    </ul>
  ),
}));
vi.mock('@/lib/education/libraryClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/education/libraryClient')>()),
  copyToMine: (...args: unknown[]) => copyToMine(...args),
}));

const item: LibraryItem = {
  id: 'pub-1',
  source: 'teacher',
  name: 'Ocean Animals',
  description: null,
  language: 'en',
  words: [{ word: 'whale' }, { word: 'squid' }],
  wordCount: 2,
  authorName: 'Ms. Rivera',
  gradeBand: null,
  topic: null,
  copyCount: 3,
  playCount: 7,
  createdAt: null,
  isMine: false,
  remixedFrom: null,
};

vi.mock('../useDiscoverLibrary', () => ({
  useDiscoverLibrary: () => ({
    filters: { language: 'en', query: '', grade: null, topic: null, source: 'all', sort: 'popular' },
    update: vi.fn(),
    total: 1,
    items: [item],
    teacherCount: 1,
    page: 0,
    pageCount: 1,
    setPage: vi.fn(),
    patchItem: vi.fn(),
    reload: vi.fn(),
    status: 'ready',
  }),
}));

import { TeacherLibrary } from '../TeacherLibrary';

describe('TeacherLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    myLessons.length = 0;
    copyToMine.mockImplementation(async () => {
      const lesson = { id: 'copy-1', name: 'Ocean Animals' };
      myLessons.push(lesson);
      return { lesson, reused: false };
    });
  });

  it('lands a Discover copy in My lists without routing anywhere', async () => {
    const onImportSuccess = vi.fn();
    render(<TeacherLibrary teacherId="teacher-1" onImportSuccess={onImportSuccess} />);

    fireEvent.click(screen.getByTestId('library-card'));
    fireEvent.click(await screen.findByTestId('preview-copy'));
    const copied = await screen.findByTestId('preview-copied');

    expect(copyToMine).toHaveBeenCalledWith(item, 'teacher-1', { reuse: false });
    expect(onImportSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: 'copy-1' }));

    fireEvent.click(copied);

    await waitFor(() => expect(screen.getByTestId('my-lists')).toHaveTextContent('Ocean Animals'));
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('tab=mine'), { scroll: false });
    expect(mockReplace).not.toHaveBeenCalledWith(expect.stringContaining('/lesson/'), expect.anything());
  });
});
