import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassStrip } from '../academy/ClassStrip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key), language: 'en' }),
}));

const hubState = { streak: 3, playedToday: false, rematchRequestedToday: false };

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  vi.stubGlobal('fetch', fn);
  return fn;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('ClassStrip', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('given a class with a streak, then it shows the streak count from the hub endpoint', async () => {
    mockFetch(() => json(hubState));
    render(<ClassStrip classroomId="c1" reducedMotion />);
    expect(await screen.findByText(/classStrip\.streakDays/)).toHaveTextContent('"count":3');
  });

  it('given the class has not played today, then the strip says how to keep the streak alive', async () => {
    mockFetch(() => json(hubState));
    render(<ClassStrip classroomId="c1" reducedMotion />);
    expect(await screen.findByText('student.classStrip.notPlayedToday')).toBeInTheDocument();
  });

  it('given the student asks for a rematch, then it posts once and shows the sent state', async () => {
    const fetchMock = mockFetch((url, init) => {
      if (init?.method === 'POST') return json({ status: 'requested' });
      return json(hubState);
    });
    render(<ClassStrip classroomId="c1" reducedMotion />);
    fireEvent.click(await screen.findByRole('button', { name: 'student.classStrip.askRematch' }));
    expect(await screen.findByText('student.classStrip.askedToday')).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST');
    expect(post?.[0]).toBe('/api/education/classroom/c1/rematch');
  });

  it('given a rematch request that fails, then the student is told in a persistent alert', async () => {
    mockFetch((_url, init) => (init?.method === 'POST' ? json({ error: 'boom' }, 500) : json(hubState)));
    render(<ClassStrip classroomId="c1" reducedMotion />);
    fireEvent.click(await screen.findByRole('button', { name: 'student.classStrip.askRematch' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('student.classStrip.askFailed'));
  });

  it('given the request was already made today, then the button is not offered again', async () => {
    mockFetch(() => json({ ...hubState, rematchRequestedToday: true }));
    render(<ClassStrip classroomId="c1" reducedMotion />);
    expect(await screen.findByText('student.classStrip.askedToday')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'student.classStrip.askRematch' })).not.toBeInTheDocument();
  });
});
