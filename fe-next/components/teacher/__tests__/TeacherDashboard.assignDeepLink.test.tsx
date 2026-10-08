import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockSearchParams, mockUseAuth, mockReplace } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockSearchParams: new URLSearchParams(),
  mockUseAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
  // EducationShell reads the path to decide which tab set the screen gets.
  usePathname: () => '/en/teacher',
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: [{ id: 'c1', name: 'A' }, { id: 'c2', name: 'B' }],
    isLoading: false, error: null, refresh: vi.fn(),
  }),
}));
vi.mock('@/hooks/useRecentGameSettings', () => ({
  useRecentGameSettings: () => ({ getMostRecent: () => null, hasRecentConfig: false }),
}));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ grant: null, loading: false, hasPro: false }) }));

// Stub every heavy child; the deep link is the whole subject here.
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => null }));
vi.mock('@/components/education/TeacherOnboarding', () => ({ TeacherOnboarding: () => null }));
vi.mock('../ClassroomManager', () => ({ __esModule: true, default: () => null }));
vi.mock('../PlayTabFirstRunCard', () => ({ __esModule: true, default: () => null }));
vi.mock('../StudentsPresentStrip', () => ({ __esModule: true, default: () => null }));
vi.mock('../assignments', () => ({
  AssignmentTrackingPanel: () => null,
  AssignmentCreator: ({ isOpen, classroomId }: { isOpen: boolean; classroomId: string }) =>
    isOpen ? <div data-testid="assignment-creator" data-classroom={classroomId} /> : null,
}));
vi.mock('../analytics/AnalyticsDashboard', () => ({ AnalyticsDashboard: () => null }));
vi.mock('../analytics/LastGameInsights', () => ({ LastGameInsights: () => null }));
vi.mock('../ProGate', () => ({ ProGate: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../curriculum/CurriculumWordListBrowser', () => ({ CurriculumWordListBrowser: () => null }));
vi.mock('../TeacherPlanBadge', () => ({ TeacherPlanBadge: () => null }));
vi.mock('../ProWelcomeCelebration', () => ({ ProWelcomeCelebration: () => null }));
vi.mock('../LessonBuilder', () => ({
  __esModule: true,
  default: ({ initialReviewWords }: { initialReviewWords?: string[] }) => (
    <div data-testid="lesson-builder" data-review-words={(initialReviewWords ?? []).join('|')} />
  ),
}));
vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...p }: { children?: React.ReactNode; [k: string]: unknown }) =>
      React.createElement('div', p, children as React.ReactNode),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  useReducedMotion: () => false,
}));

// The PLAY NOW panel has its own suite (dashboard/__tests__/PlayNowLauncher);
// here it is only the thing that must sit above everything else.
vi.mock('@/components/teacher/dashboard/PlayNowLauncher', () => ({
  PlayNowLauncher: () => <div data-testid="play-now-launcher" />,
}));


import TeacherDashboard from '../TeacherDashboard';

function setParams(query: string) {
  for (const key of Array.from(mockSearchParams.keys())) mockSearchParams.delete(key);
  new URLSearchParams(query).forEach((v, k) => mockSearchParams.set(k, v));
}

describe('TeacherDashboard — ?assign=1 opens the assignment creator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ profile: { user_role: 'teacher', is_admin: false }, user: { id: 'teacher-1' } });
  });

  it('opens the creator for the class the analytics page named', async () => {
    setParams('classroomId=c2&assign=1');
    render(<TeacherDashboard />);
    const creator = await screen.findByTestId('assignment-creator');
    expect(creator).toHaveAttribute('data-classroom', 'c2');
  });

  it('strips ?assign=1 once the creator is open, so a refresh does not reopen it', async () => {
    setParams('classroomId=c2&assign=1');
    render(<TeacherDashboard />);
    await screen.findByTestId('assignment-creator');
    expect(mockReplace).toHaveBeenCalledWith('/en/teacher?classroomId=c2', { scroll: false });
    expect(screen.getByTestId('assignment-creator')).toBeInTheDocument();
  });

  it('stays closed without the flag', () => {
    setParams('classroomId=c2');
    render(<TeacherDashboard />);
    expect(screen.queryByTestId('assignment-creator')).not.toBeInTheDocument();
  });
});
