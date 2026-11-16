import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/lib/education/waitingStudents', async () => {
  const actual = await vi.importActual<typeof import('@/lib/education/waitingStudents')>('@/lib/education/waitingStudents');
  return { ...actual, fetchWaitingInputs: fetchMock };
});

import { WaitingStudentsNudge } from '../WaitingStudentsNudge';

const t = (key: string, params?: Record<string, string | number>) =>
  params?.count != null ? `${key}:${params.count}` : key;

describe('WaitingStudentsNudge', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('says how many students are waiting and links to starting a round for that class', async () => {
    fetchMock.mockResolvedValue({
      joins: [{ classroomId: 'c1', joinedAt: new Date(Date.now() - 8 * 60_000).toISOString() }],
      rounds: [],
    });
    render(
      <WaitingStudentsNudge
        classroomIds={['c1']}
        selectedId="c1"
        language="he"
        t={t}
        nowMs={Date.now()}
      />,
    );
    const link = await screen.findByTestId('waiting-students-nudge');
    expect(link).toHaveAttribute('href', '/he/education/classroom-game?classroomId=c1');
    expect(link).toHaveTextContent('eduShell.home.waitingNudgeOne');
  });

  it('renders nothing while nobody has been waiting', async () => {
    fetchMock.mockResolvedValue({ joins: [], rounds: [] });
    const { container } = render(
      <WaitingStudentsNudge classroomIds={['c1']} selectedId="c1" language="en" t={t} nowMs={Date.now()} />,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('waiting-students-nudge')).not.toBeInTheDocument();
  });
});
