import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const user = { current: { id: 'teacher-1' } as { id: string } | null };
const track = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: user.current }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => track(...a) }));

import { LessonPlanPrompt } from '../LessonPlanPrompt';
import { defaultLessonAt } from '@/lib/education/lessonPlan';
import { toDatetimeLocal } from '@/lib/education/firstGamePlan';

const K = 'eduLiveRoom.hostResults.lessonPlan';
const fetchMock = vi.fn();
const postMock = vi.fn();
const getMock = vi.fn();

const okResponse = (lessonAt: string) => ({ ok: true, status: 200, json: async () => ({ ok: true, lessonAt }) });
const failResponse = () => ({ ok: false, status: 500, json: async () => ({ error: 'save_failed' }) });

function lastBody() {
  const [, init] = postMock.mock.calls.at(-1)!;
  return JSON.parse((init as RequestInit).body as string);
}

beforeEach(() => {
  user.current = { id: 'teacher-1' };
  track.mockReset();
  fetchMock.mockReset();
  postMock.mockReset();
  getMock.mockReset();
  getMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, lessonAt: null }) });
  fetchMock.mockImplementation((url: string, init?: RequestInit) => (init?.method === 'POST' ? postMock(url, init) : getMock(url, init)));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('<LessonPlanPrompt>', () => {
  it('Given no signed-in teacher, When mounted, Then renders nothing and tracks nothing', () => {
    user.current = null;
    const { container } = render(<LessonPlanPrompt classroomId="class-1" />);
    expect(container).toBeEmptyDOMElement();
    expect(track).not.toHaveBeenCalled();
  });

  it('Given a signed-in teacher, When shown and re-rendered, Then asks when the real lesson is and tracks the impression once', async () => {
    const { rerender } = render(<LessonPlanPrompt classroomId="class-1" />);
    expect(await screen.findByRole('heading', { name: `${K}.title` })).toBeInTheDocument();
    rerender(<LessonPlanPrompt classroomId="class-1" />);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('lesson_plan_prompt_shown', { source: 'practice_results' });
  });

  it('Given the teacher taps tomorrow at 9, When the save succeeds, Then posts tomorrow 9:00 with the browser timezone, says when the email comes and tracks it', async () => {
    const at = defaultLessonAt(new Date());
    postMock.mockResolvedValue(okResponse(at.toISOString()));
    render(<LessonPlanPrompt classroomId="class-1" />);
    fireEvent.click(await screen.findByTestId('lesson-plan-tomorrow'));

    await waitFor(() => expect(screen.getByTestId('lesson-plan-saved')).toBeInTheDocument());
    expect(postMock).toHaveBeenCalledWith('/api/education/lesson-plan', expect.objectContaining({ method: 'POST' }));
    expect(lastBody()).toEqual({
      classroomId: 'class-1',
      lessonAt: at.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: 'en',
    });
    expect(screen.getByTestId('lesson-plan-saved')).toHaveTextContent(`${K}.saved`);
    expect(track).toHaveBeenCalledWith('lesson_planned', expect.objectContaining({ source: 'practice_results', hours_ahead: expect.any(Number) }));
  });

  it('Given the teacher picks a time, When they tap remind me, Then posts that time', async () => {
    const at = new Date(Date.now() + 3 * 86_400_000);
    at.setSeconds(0, 0);
    postMock.mockResolvedValue(okResponse(at.toISOString()));
    render(<LessonPlanPrompt classroomId="class-1" />);
    fireEvent.change(await screen.findByLabelText(`${K}.pickLabel`), { target: { value: toDatetimeLocal(at) } });
    fireEvent.click(screen.getByTestId('lesson-plan-remind'));
    await waitFor(() => expect(screen.getByTestId('lesson-plan-saved')).toBeInTheDocument());
    expect(lastBody().lessonAt).toBe(at.toISOString());
  });

  it('Given a time ten minutes away, When they tap remind me, Then explains it is too soon and sends nothing', async () => {
    render(<LessonPlanPrompt classroomId="class-1" />);
    fireEvent.change(await screen.findByLabelText(`${K}.pickLabel`), { target: { value: toDatetimeLocal(new Date(Date.now() + 10 * 60_000)) } });
    fireEvent.click(screen.getByTestId('lesson-plan-remind'));
    expect(screen.getByRole('alert')).toHaveTextContent(`${K}.tooSoon`);
    expect(postMock).not.toHaveBeenCalled();
  });

  it('Given the server fails, When saving, Then shows an error with retry, never saved, and retry sends again', async () => {
    postMock.mockResolvedValueOnce(failResponse());
    render(<LessonPlanPrompt classroomId="class-1" />);
    fireEvent.click(await screen.findByTestId('lesson-plan-tomorrow'));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(`${K}.error`));
    expect(screen.queryByTestId('lesson-plan-saved')).not.toBeInTheDocument();
    expect(track).not.toHaveBeenCalledWith('lesson_planned', expect.anything());

    postMock.mockResolvedValueOnce(okResponse(defaultLessonAt(new Date()).toISOString()));
    fireEvent.click(screen.getByTestId('lesson-plan-retry'));
    await waitFor(() => expect(screen.getByTestId('lesson-plan-saved')).toBeInTheDocument());
    expect(postMock).toHaveBeenCalledTimes(2);
  });

  it('Given the network drops, When saving, Then shows the error state', async () => {
    postMock.mockRejectedValue(new Error('offline'));
    render(<LessonPlanPrompt classroomId="class-1" />);
    fireEvent.click(await screen.findByTestId('lesson-plan-tomorrow'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(`${K}.error`));
    expect(screen.queryByTestId('lesson-plan-saved')).not.toBeInTheDocument();
  });

  it('Given a 200 without ok, When saving, Then it is treated as a failure', async () => {
    postMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    render(<LessonPlanPrompt classroomId="class-1" />);
    fireEvent.click(await screen.findByTestId('lesson-plan-tomorrow'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByTestId('lesson-plan-saved')).not.toBeInTheDocument();
  });

  it('Given a saved plan, When the teacher taps change, Then the choices come back', async () => {
    postMock.mockResolvedValue(okResponse(defaultLessonAt(new Date()).toISOString()));
    render(<LessonPlanPrompt classroomId="class-1" />);
    fireEvent.click(await screen.findByTestId('lesson-plan-tomorrow'));
    await waitFor(() => expect(screen.getByTestId('lesson-plan-saved')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: `${K}.change` }));
    expect(screen.getByTestId('lesson-plan-tomorrow')).toBeInTheDocument();
  });

  it('Given a save in flight, When rendered, Then both buttons are disabled and marked busy', async () => {
    let resolve: (v: unknown) => void = () => {};
    postMock.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<LessonPlanPrompt classroomId="class-1" />);
    fireEvent.click(await screen.findByTestId('lesson-plan-tomorrow'));
    expect(screen.getByTestId('lesson-plan-tomorrow')).toBeDisabled();
    expect(screen.getByTestId('lesson-plan-remind')).toBeDisabled();
    expect(screen.getByTestId('lesson-plan')).toHaveAttribute('aria-busy', 'true');
    resolve(okResponse(defaultLessonAt(new Date()).toISOString()));
    await waitFor(() => expect(screen.getByTestId('lesson-plan-saved')).toBeInTheDocument());
  });

  it('Given the existing plan is still loading, When mounted, Then nothing renders that could flip', () => {
    getMock.mockReturnValue(new Promise(() => {}));
    const { container } = render(<LessonPlanPrompt classroomId="class-1" />);
    expect(container).toBeEmptyDOMElement();
    expect(getMock).toHaveBeenCalledWith('/api/education/lesson-plan?classroomId=class-1', undefined);
  });

  it('Given a plan already saved for this class, When mounted, Then starts in the saved state with Change, without asking again', async () => {
    getMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, lessonAt: defaultLessonAt(new Date()).toISOString() }) });
    render(<LessonPlanPrompt classroomId="class-1" />);
    expect(await screen.findByTestId('lesson-plan-saved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `${K}.change` })).toBeInTheDocument();
    expect(screen.queryByTestId('lesson-plan-tomorrow')).toBeNull();
    expect(track).not.toHaveBeenCalledWith('lesson_plan_prompt_shown', expect.anything());
  });

  it.each([
    ['a 500', () => getMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'read_failed' }) })],
    ['a network drop', () => getMock.mockRejectedValue(new Error('offline'))],
  ])('Given the plan read fails with %s, When mounted, Then it falls back to the ask, never to saved', async (_label, fail) => {
    fail();
    render(<LessonPlanPrompt classroomId="class-1" />);
    expect(await screen.findByTestId('lesson-plan-tomorrow')).toBeInTheDocument();
    expect(screen.queryByTestId('lesson-plan-saved')).toBeNull();
  });

  it.each([
    ['too_soon', 'tooSoon'],
    ['too_far', 'tooFar'],
  ])('Given the server answers 400 %s, When saving, Then shows that message with no retry', async (code, key) => {
    postMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: code }) });
    render(<LessonPlanPrompt classroomId="class-1" />);
    fireEvent.click(await screen.findByTestId('lesson-plan-tomorrow'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(`${K}.${key}`));
    expect(screen.queryByTestId('lesson-plan-retry')).toBeNull();
    expect(screen.queryByTestId('lesson-plan-saved')).toBeNull();
  });

  describe('on the class invite screen', () => {
    it('Given source class_setup, When shown, Then asks about the next lesson with this class, not the rehearsal, and tracks that source', async () => {
      render(<LessonPlanPrompt classroomId="class-1" source="class_setup" />);
      expect(await screen.findByRole('heading', { name: `${K}.setupTitle` })).toBeInTheDocument();
      expect(screen.getByTestId('lesson-plan')).toHaveTextContent(`${K}.setupBody`);
      expect(screen.queryByText(`${K}.title`)).toBeNull();
      expect(track).toHaveBeenCalledWith('lesson_plan_prompt_shown', { source: 'class_setup' });
    });

    it('Given source class_setup, When the teacher saves tomorrow at 9, Then the plan is stored for this class and tracked as class_setup', async () => {
      const at = defaultLessonAt(new Date());
      postMock.mockResolvedValue(okResponse(at.toISOString()));
      render(<LessonPlanPrompt classroomId="class-1" source="class_setup" />);
      fireEvent.click(await screen.findByTestId('lesson-plan-tomorrow'));
      await waitFor(() => expect(screen.getByTestId('lesson-plan-saved')).toBeInTheDocument());
      expect(lastBody()).toMatchObject({ classroomId: 'class-1', lessonAt: at.toISOString() });
      expect(track).toHaveBeenCalledWith('lesson_planned', expect.objectContaining({ source: 'class_setup' }));
    });

    it('Given a className, When rendered, Then the section carries it so the slot can place it', async () => {
      render(<LessonPlanPrompt classroomId="class-1" source="class_setup" className="lg:col-span-2" />);
      expect(await screen.findByTestId('lesson-plan')).toHaveClass('lg:col-span-2');
    });
  });
});
