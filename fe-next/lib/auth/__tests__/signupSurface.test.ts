// @vitest-environment happy-dom
/**
 * One surface id per signup prompt, shared by shown / clicked / dismissed /
 * signup_completed, and still present after an OAuth redirect drops
 * sessionStorage (t_39705c3f).
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  canonicalSignupSurface,
  consumeShownSurface,
  consumeSignupSurface,
  latchSignupSurface,
  promptSurfaceId,
  rememberShownSurface,
  resolveSignupSource,
} from '../signupSurface';

describe('canonicalSignupSurface', () => {
  it('collapses sheet click aliases onto the id shown already fires', () => {
    expect(canonicalSignupSurface('soft-sheet')).toBe('soft-sheet');
    expect(canonicalSignupSurface('soft_sheet')).toBe('soft-sheet');
    expect(canonicalSignupSurface('multi_games_sheet')).toBe('soft-sheet');
    expect(canonicalSignupSurface('first_win_sheet')).toBe('soft-sheet');
    expect(canonicalSignupSurface('first_win_prompt')).toBe('soft-sheet');
  });

  it('collapses dialog click aliases onto the control shown id', () => {
    expect(canonicalSignupSurface('control')).toBe('control');
    expect(canonicalSignupSurface('multi_games_dialog')).toBe('control');
    expect(canonicalSignupSurface('first_win_dialog')).toBe('control');
  });

  it('keeps mp_sheet, edu_access, and header_or_menu', () => {
    expect(canonicalSignupSurface('mp_sheet')).toBe('mp_sheet');
    expect(canonicalSignupSurface('edu_access')).toBe('edu_access');
    expect(canonicalSignupSurface('header_or_menu')).toBe('header_or_menu');
  });

  it('keeps the results card id, whatever its case', () => {
    expect(canonicalSignupSurface(' Results_Card ')).toBe('results_card');
    expect(resolveSignupSource({ latched: 'results_card', shown: 'soft-sheet', stashed: null })).toBe('results_card');
  });

  it('drops garbage and blank values', () => {
    expect(canonicalSignupSurface('Teacher Page!')).toBeNull();
    expect(canonicalSignupSurface('  ')).toBeNull();
    expect(canonicalSignupSurface(null)).toBeNull();
  });
});

describe('promptSurfaceId', () => {
  it('matches the id useSignupPrompt emits on shown', () => {
    expect(promptSurfaceId('sheet')).toBe('soft-sheet');
    expect(promptSurfaceId('dialog')).toBe('control');
  });
});

describe('signup surface latch survives the OAuth round-trip', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('writes session and local, and local still resolves after sessionStorage is wiped', () => {
    latchSignupSurface('multi_games_sheet');
    expect(sessionStorage.getItem('lexiclash_signup_source_pending')).toBe('soft-sheet');
    expect(localStorage.getItem('lexiclash_signup_source_pending')).toBe('soft-sheet');

    sessionStorage.clear();
    expect(consumeSignupSurface()).toBe('soft-sheet');
    expect(localStorage.getItem('lexiclash_signup_source_pending')).toBeNull();
  });

  it('remembers the shown surface for this tab only — a wiped session does not attribute a later signup', () => {
    rememberShownSurface('mp_sheet');
    expect(sessionStorage.getItem('lexiclash_signup_surface_shown')).toBe('mp_sheet');
    expect(localStorage.getItem('lexiclash_signup_surface_shown')).toBeNull();
    sessionStorage.clear();
    expect(consumeShownSurface()).toBeNull();
  });
});

describe('resolveSignupSource', () => {
  it('prefers the click latch, then the shown surface, then metadata', () => {
    expect(resolveSignupSource({
      latched: 'multi_games_sheet',
      shown: 'mp_sheet',
      stashed: 'edu_access',
    })).toBe('soft-sheet');
    expect(resolveSignupSource({
      latched: null,
      shown: 'mp_sheet',
      stashed: null,
    })).toBe('mp_sheet');
    expect(resolveSignupSource({
      latched: null,
      shown: null,
      stashed: 'edu_access',
    })).toBe('edu_access');
    expect(resolveSignupSource({
      latched: null,
      shown: null,
      stashed: null,
    })).toBe('header_or_menu');
  });

  it('maps an in-flight funnel pending value only when no surface was stored', () => {
    expect(resolveSignupSource({
      latched: null,
      shown: null,
      stashed: null,
      funnelPending: 'first_win',
    })).toBe('soft-sheet');
  });
});
