import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher-1' } }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: (k: string) => k }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { HomeNextLesson } from '../HomeNextLesson';

const lessonAt = (value: string | null) =>
  vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, lessonAt: value }) });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('<HomeNextLesson>', () => {
  it('Given a class with no students, When it mounts before the saved plan arrives, Then nothing renders so no sibling moves', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const { container } = render(<HomeNextLesson classroomId="c1" memberCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Given a class with no students and no plan, When the plan resolves, Then the reminder prompt is offered', async () => {
    vi.stubGlobal('fetch', lessonAt(null));
    render(<HomeNextLesson classroomId="c1" memberCount={0} />);
    expect(await screen.findByTestId('lesson-plan-tomorrow')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'eduLiveRoom.hostResults.lessonPlan.homeTitle' })).toBeInTheDocument();
  });

  it('Given a class with no students and a saved plan, When the plan resolves, Then the compact saved state shows', async () => {
    vi.stubGlobal('fetch', lessonAt(new Date(Date.now() + 86_400_000).toISOString()));
    render(<HomeNextLesson classroomId="c1" memberCount={0} />);
    expect(await screen.findByTestId('lesson-plan-saved')).toBeInTheDocument();
    expect(screen.queryByTestId('lesson-plan-tomorrow')).toBeNull();
  });

  it('Given a class with a student, When it mounts, Then nothing renders and nothing is fetched', () => {
    const fetchMock = lessonAt(null);
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<HomeNextLesson classroomId="c1" memberCount={1} />);
    expect(container).toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Given a member count that is not known yet, When it mounts, Then nothing renders', () => {
    vi.stubGlobal('fetch', lessonAt(null));
    const { container } = render(<HomeNextLesson classroomId="c1" memberCount={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
