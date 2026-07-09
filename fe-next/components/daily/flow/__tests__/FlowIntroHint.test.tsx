import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FlowIntroHint } from '../FlowIntroHint';

// Real explanation copy for a first-time visitor; production wraps it in t()
// with this exact string as the fallback, so asserting on it also protects
// against the fallback silently drifting from the translation key.
const INTRO_TEXT =
  "Daily Flow chains today's challenges into one tap-through run — hold the button to skip the breathers.";

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
    language: 'en',
  }),
}));

describe('FlowIntroHint', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('shows the explainer on a first-time visit', () => {
    render(<FlowIntroHint />);
    expect(screen.getByText(INTRO_TEXT)).toBeInTheDocument();
  });

  it('marks the hint as seen so it never shows again', () => {
    const { unmount } = render(<FlowIntroHint />);
    expect(screen.getByText(INTRO_TEXT)).toBeInTheDocument();
    unmount();

    render(<FlowIntroHint />);
    expect(screen.queryByText(INTRO_TEXT)).not.toBeInTheDocument();
  });

  it('renders nothing on a repeat visit where the flag is already set', () => {
    localStorage.setItem('lexiclash_daily_flow_intro_seen', '1');
    render(<FlowIntroHint />);
    expect(screen.queryByText(INTRO_TEXT)).not.toBeInTheDocument();
  });
});
