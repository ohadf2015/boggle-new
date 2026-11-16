import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: mockFetch }));

import { LobbyLateJoinNotice } from '../LobbyLateJoinNotice';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);

describe('<LobbyLateJoinNotice>', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given no recent refusals, Then the lobby stays quiet', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ count: 4, recentCount: 0 }) });
    const { container } = render(<LobbyLateJoinNotice classroomId="c1" t={t} language="en" />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('Given 2 students refused in the last 10 minutes, Then the teacher is told to start a new game', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ count: 0, recentCount: 2 }) });
    render(<LobbyLateJoinNotice classroomId="c1" t={t} language="en" />);
    expect(await screen.findByTestId('lobby-late-joins')).toHaveTextContent('eduLive.lobby.lateJoins:{"count":2}');
  });

  it('Given no class yet, Then it does not ask the server', () => {
    render(<LobbyLateJoinNotice classroomId={null} t={t} language="en" />);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
