import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-1' }, profile: null }) }));
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => ({ createClassroom: vi.fn() }) }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false }) }));
vi.mock('@/hooks/useRecentGameSettings', () => ({ useRecentGameSettings: () => ({ saveConfig: vi.fn() }) }));
vi.mock('@/components/teacher/StarterPacksSection', () => ({ StarterPacksSection: () => null }));
vi.mock('../lobby/useRepeatLastSetup', () => ({ useRepeatLastSetup: () => ({ pending: false }) }));
vi.mock('../lobby/useTeacherLobbyData', () => ({
  useTeacherLobbyData: () => ({
    lessons: [{ id: '1', name: 'Unit 3', words: [{ word: 'candid' }] }],
    classrooms: [{ id: 'c1', name: 'Class' }],
    isLoading: false, isCreatingFromPack: false, selectedLessonIds: ['1'], setSelectedLessonIds: vi.fn(),
    selectedClassroomId: 'c1', setSelectedClassroomId: vi.fn(), createLessonFromPack: vi.fn(), fetchTeacherData: vi.fn(),
  }),
}));
vi.mock('../lobby/useClassroomLaunchSocket', () => ({
  useClassroomLaunchSocket: () => ({
    gameCode: 'A2Y79C', isStarting: false, startError: null, setStartError: vi.fn(), launch: vi.fn(),
    socket: {}, roomCreatedGameCode: 'A2Y79C', startLiveGame: vi.fn(),
  }),
}));

import { ClassroomGameLobby } from '../ClassroomGameLobby';

describe('ClassroomGameLobby — after GO LIVE', () => {
  it('goes straight to the projector lobby, like the express launch, with no second join screen in between', () => {
    render(<ClassroomGameLobby onBack={vi.fn()} />);
    expect(replace).toHaveBeenCalledWith('/en/multiplayer?room=A2Y79C&classroom=true&host=true');
    expect(screen.queryByText('education.classroomGame.joinTheGame')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
  });
});
