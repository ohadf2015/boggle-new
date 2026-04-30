import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const trackGrowthEventMock = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEventMock(...args),
}));

const tMock = vi.fn((key: string, params?: Record<string, unknown>) => {
  if (params && key === 'cg.hero.welcomeBack') return `WELCOME BACK, ${params.name}!`;
  return key;
});
let mockDir: 'ltr' | 'rtl' = 'ltr';
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: tMock, dir: mockDir, language: 'en' }),
}));

import CgLobbyHero from '../CgLobbyHero';

describe('CgLobbyHero', () => {
  beforeEach(() => {
    trackGrowthEventMock.mockClear();
    tMock.mockClear();
    mockDir = 'ltr';
  });
  afterEach(() => {
    cleanup();
  });

  it('renders first-timer copy', () => {
    render(<CgLobbyHero variant="first-timer" displayName={null} onPlay={vi.fn()} onBrowse={vi.fn()} />);
    expect(screen.getByText('cg.hero.firstGreeting')).toBeTruthy();
    expect(screen.getByText('cg.hero.firstSub')).toBeTruthy();
  });

  it('renders returning-named copy with interpolated name', () => {
    render(<CgLobbyHero variant="returning-named" displayName="OhadF" onPlay={vi.fn()} onBrowse={vi.fn()} />);
    expect(screen.getByText('WELCOME BACK, OhadF!')).toBeTruthy();
    expect(tMock).toHaveBeenCalledWith('cg.hero.welcomeBack', { name: 'OhadF' });
  });

  it('renders returning-anon copy when no name', () => {
    render(<CgLobbyHero variant="returning-anon" displayName={null} onPlay={vi.fn()} onBrowse={vi.fn()} />);
    expect(screen.getByText('cg.hero.welcomeBackAnon')).toBeTruthy();
  });

  it('emits cg_lobby_hero_view on mount with variant', () => {
    render(<CgLobbyHero variant="returning-named" displayName="X" onPlay={vi.fn()} onBrowse={vi.fn()} />);
    expect(trackGrowthEventMock).toHaveBeenCalledWith('cg_lobby_hero_view', { variant: 'returning-named' });
  });

  it('calls onPlay and emits cg_lobby_hero_play on PLAY click', () => {
    const onPlay = vi.fn();
    render(<CgLobbyHero variant="first-timer" displayName={null} onPlay={onPlay} onBrowse={vi.fn()} />);
    fireEvent.click(screen.getByTestId('cg-lobby-hero-play'));
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(trackGrowthEventMock).toHaveBeenCalledWith('cg_lobby_hero_play', { variant: 'first-timer' });
  });

  it('calls onBrowse and emits cg_lobby_hero_browse on Browse click', () => {
    const onBrowse = vi.fn();
    render(<CgLobbyHero variant="first-timer" displayName={null} onPlay={vi.fn()} onBrowse={onBrowse} />);
    fireEvent.click(screen.getByTestId('cg-lobby-hero-browse'));
    expect(onBrowse).toHaveBeenCalledTimes(1);
    expect(trackGrowthEventMock).toHaveBeenCalledWith('cg_lobby_hero_browse', { variant: 'first-timer' });
  });

  it('uses play.webp mascot for first-timer', () => {
    render(<CgLobbyHero variant="first-timer" displayName={null} onPlay={vi.fn()} onBrowse={vi.fn()} />);
    const img = screen.getByTestId('cg-lobby-hero-mascot') as HTMLImageElement;
    expect(img.src).toContain('/mascot/play.webp');
  });

  it('uses waving.webp mascot for returning variants', () => {
    render(<CgLobbyHero variant="returning-named" displayName="X" onPlay={vi.fn()} onBrowse={vi.fn()} />);
    const img = screen.getByTestId('cg-lobby-hero-mascot') as HTMLImageElement;
    expect(img.src).toContain('/mascot/waving.webp');
  });

  it('renders aria-label on section from t()', () => {
    render(<CgLobbyHero variant="first-timer" displayName={null} onPlay={vi.fn()} onBrowse={vi.fn()} />);
    const section = screen.getByLabelText('cg.hero.aria.section');
    expect(section).toBeTruthy();
  });

  it('sets dir attribute from LanguageContext (RTL)', () => {
    mockDir = 'rtl';
    render(<CgLobbyHero variant="first-timer" displayName={null} onPlay={vi.fn()} onBrowse={vi.fn()} />);
    const section = screen.getByLabelText('cg.hero.aria.section');
    expect(section.getAttribute('dir')).toBe('rtl');
  });
});
