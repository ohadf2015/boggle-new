import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { act } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { fireEvent, waitFor } from '@testing-library/react';

const { mockJoin, mockResolve, mockUseAuth } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockResolve: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => (k === 'eduStudent.join.funNames' ? 'Pixel Panda|Captain Otter|Turbo Toast' : k),
    dir: 'ltr',
    language: 'en',
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useJoinClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn(), trackStudentJoinStarted: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/utils/profileStorage', () => ({ getStoredUsername: () => null, setStoredUsername: vi.fn() }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));

import JoinFlow from '../JoinFlow';

const goIn = (root: HTMLElement) => root.querySelector('button[type="submit"]') as HTMLButtonElement;
const nameIn = (root: HTMLElement) => root.querySelector('#join-nickname') as HTMLInputElement;

describe('<JoinFlow> before hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'game', label: 'Ms Levy', gameCode: 'P45KRT' });
    mockJoin.mockReturnValue(new Promise(() => {}));
  });

  it('Given the server markup, Then GO is disabled so a tap before hydration cannot fire a native form submit that reloads the page', () => {
    const html = renderToString(<JoinFlow initialCode="P45KRT" />);
    const host = document.createElement('div');
    host.innerHTML = html;
    expect(goIn(host).disabled).toBe(true);
  });

  it('Given a name typed before hydration, When the page hydrates and the invite link would seed a fun name, Then the typed name is kept and joined with', async () => {
    const host = document.createElement('div');
    host.innerHTML = renderToString(<JoinFlow initialCode="P45KRT" />);
    document.body.appendChild(host);
    nameIn(host).value = 'Maya';

    await act(async () => {
      hydrateRoot(host, <JoinFlow initialCode="P45KRT" />, { onRecoverableError: () => {} });
    });
    await waitFor(() => expect(host.textContent).toContain('Ms Levy'));

    expect(nameIn(host).value).toBe('Maya');
    expect(goIn(host).disabled).toBe(false);
    await act(async () => {
      fireEvent.click(goIn(host));
    });
    expect(mockJoin).toHaveBeenCalledWith('P45KRT', { guestName: 'Maya' });
    host.remove();
  });
});
