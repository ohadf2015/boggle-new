import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-1' } }) }));
vi.mock('@/components/teacher/hq/QuickLaunchStage', () => ({ QuickLaunchStage: () => <div data-testid="quick-stage" /> }));
const getClassrooms = vi.fn();
const getLesson = vi.fn();
const createLesson = vi.fn();
vi.mock('@/lib/supabase/education', () => ({
  getClassrooms: (...a: unknown[]) => getClassrooms(...a),
  getLesson: (...a: unknown[]) => getLesson(...a),
  createLesson: (...a: unknown[]) => createLesson(...a),
}));
const trackEduClassroomCreated = vi.fn();
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomCreated: (...a: unknown[]) => trackEduClassroomCreated(...a) }));

import { QuickLaunchProvisioner, PROVISION_TIMEOUT_MS, resetProvisionsForTest } from '../QuickLaunchProvisioner';
import type { QuickLaunchIntent } from '@/components/teacher/dashboard/quickLaunchIntent';

const LESSON = { id: 'l-1', name: 'Unit 4', language: 'en', words: [{ word: 'river' }, { word: 'stone' }] };
const intent: QuickLaunchIntent = { source: 'lesson', lessonId: 'l-1', title: 'Unit 4', language: 'en', mode: 'blast', createdAt: 1 };

function renderProvisioner(over: Partial<QuickLaunchIntent> = {}, strict = false) {
  const onReady = vi.fn();
  const onOpenFullSetup = vi.fn();
  const ui = <QuickLaunchProvisioner intent={{ ...intent, ...over }} onReady={onReady} onOpenFullSetup={onOpenFullSetup} />;
  render(strict ? <StrictMode>{ui}</StrictMode> : ui);
  return { onReady, onOpenFullSetup };
}

describe('<QuickLaunchProvisioner>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProvisionsForTest();
    getClassrooms.mockResolvedValue({ data: [{ id: 'c-1', name: '5A', language: 'en' }] });
    getLesson.mockResolvedValue({ data: LESSON });
  });
  afterEach(() => vi.useRealTimers());

  it('Given a quick launch, Then it shows the launch stage and hands the lobby a decided class, list and mode', async () => {
    const { onReady } = renderProvisioner();
    expect(screen.getByTestId('quick-stage')).toBeInTheDocument();
    await waitFor(() => expect(onReady).toHaveBeenCalledWith({ classroomId: 'c-1', lessonId: 'l-1', mode: 'blast' }));
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('Given a double mount, Then the class and list are provisioned once', async () => {
    getClassrooms.mockResolvedValue({ data: [] });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ data: { id: 'c-new', name: 'My Class' } }) })));
    const { onReady } = renderProvisioner({}, true);
    await waitFor(() => expect(onReady).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(getClassrooms).toHaveBeenCalledTimes(1);
    expect(trackEduClassroomCreated).toHaveBeenCalledWith({ classroomId: 'c-new', createdVia: 'express_lobby' });
    vi.unstubAllGlobals();
  });

  it('Given the list is gone, Then it says so and offers retry and the full setup', async () => {
    getLesson.mockResolvedValue({ data: null });
    const { onReady, onOpenFullSetup } = renderProvisioner();
    expect(await screen.findByTestId('quick-launch-failure')).toHaveTextContent('teacher.playNow.failure.lesson');
    expect(onReady).not.toHaveBeenCalled();

    getLesson.mockResolvedValue({ data: LESSON });
    fireEvent.click(screen.getByTestId('quick-launch-retry'));
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
    expect(getLesson).toHaveBeenCalledTimes(2);

    expect(onOpenFullSetup).not.toHaveBeenCalled();
  });

  it('Given a failure, When the teacher picks full setup, Then the lobby opens without the intent', async () => {
    getLesson.mockResolvedValue({ data: null });
    const { onOpenFullSetup } = renderProvisioner();
    fireEvent.click(await screen.findByTestId('quick-launch-open-full-setup'));
    expect(onOpenFullSetup).toHaveBeenCalledTimes(1);
  });

  it('Given a step that hangs, Then it gives up out loud instead of spinning', async () => {
    vi.useFakeTimers();
    getClassrooms.mockReturnValue(new Promise(() => {}));
    renderProvisioner();
    await act(async () => { vi.advanceTimersByTime(PROVISION_TIMEOUT_MS + 10); });
    expect(screen.getByTestId('quick-launch-failure')).toHaveTextContent('teacher.playNow.failure.classroom');
  });
});
