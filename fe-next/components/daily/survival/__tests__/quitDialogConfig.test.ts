/**
 * Bug: Daily Challenge exit → black screen / freeze, isolated to Hebrew (HE).
 *
 * The quit-confirmation dialog resolved its copy inline and UNGUARDED:
 *   title={t('daily.quitConfirmTitle')}          // no fallback at all
 *   description={t('daily.quitConfirm') || '…'}  // dead `|| fallback`: t()
 *                                                //   returns the raw key path
 *                                                //   (truthy) on a miss
 *
 * If a locale bundle resolves one of these keys to a non-string (a malformed /
 * nested node) t() hands React a non-string child → React throws DURING RENDER
 * ("Objects are not valid as a React child"). Because the Daily game surface
 * hides the bottom nav AND arms a navigation guard whose teardown can fire
 * history.go(-1) (documented to blank a Capacitor WebView), that render throw
 * presents as a fully black, frozen screen. Multiplayer uses the same dialog
 * WITHOUT the guard+hidden-nav combo, so it degrades gracefully — hence the
 * mode+locale isolation.
 *
 * Fix: buildQuitDialogConfig() resolves every field defensively and NEVER
 * throws — any failure (t throws, non-string, missing-key echo, empty) falls
 * back to a generic, locale-agnostic config so the exit flow can't crash render.
 */

import { describe, it, expect } from 'vitest';
import {
  buildQuitDialogConfig,
  GENERIC_QUIT_DIALOG,
} from '../quitDialogConfig';

describe('buildQuitDialogConfig', () => {
  it('returns localized copy when the locale wrapper resolves cleanly', () => {
    const dict: Record<string, string> = {
      'daily.quitConfirmTitle': 'לצאת באמצע המשחק?',
      'daily.quitConfirm': 'ההתקדמות שלך לא תישמר.',
      'daily.imSure': 'צא בכל זאת',
      'common.cancel': 'ביטול',
    };
    const t = (key: string) => dict[key];

    expect(buildQuitDialogConfig(t)).toEqual({
      title: 'לצאת באמצע המשחק?',
      description: 'ההתקדמות שלך לא תישמר.',
      confirmText: 'צא בכל זאת',
      cancelText: 'ביטול',
    });
  });

  it('falls back to the generic config when t() throws for a key', () => {
    const t = (key: string) => {
      if (key === 'daily.quitConfirmTitle') throw new Error('locale bundle blew up');
      return 'ok';
    };

    const config = buildQuitDialogConfig(t);
    expect(config.title).toBe(GENERIC_QUIT_DIALOG.title);
    // A throw on ONE field must not poison the others.
    expect(config.confirmText).toBe('ok');
  });

  it('falls back when t() returns a non-string (malformed nested node)', () => {
    // The exact shape that makes React throw "Objects are not valid as a React child".
    const t = (key: string) =>
      (key === 'daily.quitConfirm' ? ({ nested: 'oops' } as unknown as string) : 'ok');

    const config = buildQuitDialogConfig(t);
    expect(config.description).toBe(GENERIC_QUIT_DIALOG.description);
  });

  it('falls back when t() echoes the key path back (missing-key signal)', () => {
    // t() returns the untranslated path on a miss; that must NOT render literally.
    const t = (key: string) => key;

    expect(buildQuitDialogConfig(t)).toEqual(GENERIC_QUIT_DIALOG);
  });

  it('falls back when t() returns an empty / whitespace string', () => {
    const t = (key: string) => (key === 'daily.imSure' ? '   ' : 'ok');

    expect(buildQuitDialogConfig(t).confirmText).toBe(GENERIC_QUIT_DIALOG.confirmText);
  });

  it('never throws even when t itself is not callable', () => {
    // Defense in depth: a bad t reference must degrade, not crash the exit flow.
    const t = undefined as unknown as (key: string) => string;

    expect(() => buildQuitDialogConfig(t)).not.toThrow();
    expect(buildQuitDialogConfig(t)).toEqual(GENERIC_QUIT_DIALOG);
  });
});
