/**
 * The entry's own header (DESIGN §b.1): [home → mpExit('back-from-entry')]
 * [logo] [language chip] [sound] [?]. It replaces the global site header, so it
 * hosts the mute control (the global FAB stands down) and the only on-demand
 * path to How to play.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const setLanguage = vi.fn();
const toggle = vi.fn();
const registerAudio = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr', setLanguage }),
}));
vi.mock('@/hooks/useMasterMute', () => ({
  useMasterMute: () => ({ allMuted: false, toggle, label: 'music.mute', title: 'music.soundOn' }),
}));
vi.mock('@/contexts/NavigationContext', () => ({ useRegisterHeaderAudioControl: () => registerAudio() }));
vi.mock('next/dynamic', () => ({ __esModule: true, default: () => () => <div data-testid="how-to-play" /> }));

import { EntryHeader } from '../EntryHeader';
import { MpExitProvider } from '@/hooks/useMpExit';

function renderHeader(exit = vi.fn()) {
  render(
    <MpExitProvider value={exit}>
      <EntryHeader />
    </MpExitProvider>,
  );
  return exit;
}

describe('EntryHeader', () => {
  beforeEach(() => vi.clearAllMocks());

  it('home leaves the section through mpExit("back-from-entry")', () => {
    const exit = renderHeader();
    fireEvent.click(screen.getByTestId('mp-back-home'));
    expect(exit).toHaveBeenCalledWith('back-from-entry');
  });

  it('hosts the mute control so the global FAB stands down', () => {
    renderHeader();
    expect(registerAudio).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'music.mute' }));
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('language chip opens a language sheet; picking one switches the app language', () => {
    renderHeader();
    fireEvent.click(screen.getByTestId('entry-language-chip'));
    const sheet = screen.getByTestId('entry-language-sheet');
    expect(sheet).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /עברית/ }));
    expect(setLanguage).toHaveBeenCalledWith('he');
    expect(screen.queryByTestId('entry-language-sheet')).toBeNull();
  });

  it('marks the current language as selected', () => {
    renderHeader();
    fireEvent.click(screen.getByTestId('entry-language-chip'));
    expect(screen.getByRole('button', { name: /English/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('? opens How to play on demand (never auto-shown)', () => {
    renderHeader();
    expect(screen.queryByTestId('how-to-play')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'mpUi.entry.howToPlay' }));
    expect(screen.getByTestId('how-to-play')).toBeInTheDocument();
  });
});
