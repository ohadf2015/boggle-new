import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, renderHook } from '@testing-library/react';

const share = vi.fn();
const capture = vi.fn();
const toastSuccess = vi.fn();
const auth: { user: Record<string, unknown> | null; profile: Record<string, unknown> | null; loading?: boolean } = { user: null, profile: null };
let pathname = '/en/quick-play';

vi.mock('@/utils/shareWithFallback', () => ({ shareWithFallback: (...a: unknown[]) => share(...a) }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => capture(...a) } }));
vi.mock('react-hot-toast', () => ({ default: { success: (...a: unknown[]) => toastSuccess(...a) } }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

import { BragButton, useBragSharer } from '../BragButton';

const props = { surface: 'test_surface', kind: 'level' as const, text: 'Hit level 5 on LexiClash', url: 'https://lexiclash.live/en/brag/me?kind=level' };

describe('BragButton', () => {
  beforeEach(() => {
    share.mockReset();
    capture.mockReset();
    toastSuccess.mockReset();
    auth.user = null;
    auth.profile = null;
    pathname = '/en/quick-play';
  });

  it('Given a tap, Then it opens the share sheet with the text and link and records the result', async () => {
    share.mockResolvedValue('shared');
    render(<BragButton {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /brag2.button.brag/ }));
    await waitFor(() => expect(capture).toHaveBeenCalledWith('brag_share_tapped', { surface: 'test_surface', kind: 'level', result: 'shared' }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ text: props.text, url: props.url }));
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('Given no share sheet, Then it copies the text, then the link on its own line, and shows the copied toast', async () => {
    share.mockResolvedValue('copied');
    render(<BragButton {...props} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('share.linkCopied', expect.anything()));
    expect(share.mock.calls[0][0].clipboardText).toBe(`${props.text}\n${props.url}`);
  });

  it('does not let the tap bubble to an overlay that dismisses on click', () => {
    share.mockResolvedValue('cancelled');
    const outer = vi.fn();
    render(<div onClick={outer}><BragButton {...props} /></div>);
    fireEvent.click(screen.getByRole('button'));
    expect(outer).not.toHaveBeenCalled();
  });

  it('tells the parent a share started so it can hold its auto-dismiss', () => {
    share.mockResolvedValue('shared');
    const onShareStart = vi.fn();
    render(<BragButton {...props} onShareStart={onShareStart} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onShareStart).toHaveBeenCalled();
  });

  it('renders nothing for a classroom student', () => {
    auth.user = { id: 's1', is_anonymous: true };
    const { container } = render(<BragButton {...props} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing on student routes', () => {
    pathname = '/he/student/lessons/1';
    const { container } = render(<BragButton {...props} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('useBragSharer', () => {
  beforeEach(() => {
    auth.user = null;
    auth.profile = null;
    pathname = '/en';
  });

  it('returns the chosen public name', () => {
    auth.user = { id: 'u1' };
    auth.profile = { display_name: 'Noa', username: 'noa1' };
    expect(renderHook(() => useBragSharer()).result.current).toEqual({ canBrag: true, me: 'Noa' });
  });

  it('omits a generated or placeholder name', () => {
    auth.user = { id: 'u1' };
    auth.profile = { display_name: 'Player_3fa2', username: 'Player_3fa2' };
    expect(renderHook(() => useBragSharer()).result.current.me).toBeNull();
  });

  it('stays closed while auth is still resolving', () => {
    auth.loading = true;
    expect(renderHook(() => useBragSharer()).result.current).toEqual({ canBrag: false, me: null });
    auth.loading = false;
  });

  it('blocks a student profile and never returns their name', () => {
    auth.user = { id: 'u1' };
    auth.profile = { display_name: 'Kid', user_role: 'student' };
    expect(renderHook(() => useBragSharer()).result.current).toEqual({ canBrag: false, me: null });
  });
});
