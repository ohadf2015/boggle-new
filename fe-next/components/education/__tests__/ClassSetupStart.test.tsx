import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { recommendedPack } from '@/components/teacher/setup/starterPackPick';

const nav = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
const api = vi.hoisted(() => ({ create: vi.fn(), created: vi.fn(), funnel: vi.fn(), classrooms: [] as { id: string; name: string }[] }));

vi.mock('next/navigation', () => ({ useRouter: () => nav }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (k: string) => k }) }));
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => ({ classrooms: api.classrooms, createClassroom: api.create }) }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, status: null, loading: false, accessTrialExpires: null }) }));
vi.mock('@/lib/education/useTeacherAccess', () => ({ useTeacherAccess: () => ({ trial: null, isLoading: false }) }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomCreated: api.created }));
vi.mock('@/lib/education/teacherOnboardingFunnel', () => ({
  captureTeacherOnboardingFunnel: api.funnel,
  TEACHER_ONBOARDING_FUNNEL_EVENTS: { classroomCreated: 'classroom_created' },
  teacherFunnelPlan: () => 'free',
}));
vi.mock('@/components/teacher/ClassLimitUpsellModal', () => ({ default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div data-testid="limit-modal" /> : null) }));
vi.mock('@/components/education/EduMascot', () => ({ EduMascot: () => null }));

import { ClassSetupStart } from '../ClassSetupStart';

describe('ClassSetupStart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.classrooms = [];
    api.create.mockResolvedValue({ success: true, data: { id: 'new1', name: 'Class 1', join_code: 'ABC123', language: 'en' } });
  });

  it('Given details, When "Start live" is tapped, Then the class is made and the invite opens with the chosen pack, never the lobby', async () => {
    render(<ClassSetupStart />);
    fireEvent.click(screen.getByTestId('setup-start-live'));
    await waitFor(() => expect(nav.replace).toHaveBeenCalled());
    const pack = recommendedPack('en', null);
    expect(nav.replace.mock.calls[0][0]).toBe(`/en/teacher/classroom/new?classroomId=new1&pack=${encodeURIComponent(pack.nameKey)}`);
    expect(nav.push).not.toHaveBeenCalled();
    expect(api.created).toHaveBeenCalledWith(expect.objectContaining({ classroomId: 'new1' }));
    expect(api.funnel).toHaveBeenCalledWith('classroom_created', expect.anything());
  });

  it('When "Just create the class" is tapped, Then the invite opens without a pack', async () => {
    render(<ClassSetupStart />);
    fireEvent.click(screen.getByTestId('setup-create'));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/en/teacher/classroom/new?classroomId=new1', { scroll: false }));
  });

  it('Given the free class cap is hit on the server, Then the limit modal opens and nothing navigates', async () => {
    api.create.mockResolvedValue({ success: false, code: 'CLASS_LIMIT_REACHED', currentCount: 3, limit: 3 });
    render(<ClassSetupStart />);
    fireEvent.click(screen.getByTestId('setup-start-live'));
    await screen.findByTestId('limit-modal');
    expect(nav.replace).not.toHaveBeenCalled();
  });
});
