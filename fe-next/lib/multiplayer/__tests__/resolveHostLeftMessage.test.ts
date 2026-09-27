import { describe, expect, it, vi } from 'vitest';
import { resolveHostLeftMessage } from '../resolveHostLeftMessage';

describe('resolveHostLeftMessage (i18n envelope, audit 2026-05-10)', () => {
  it('prefers i18nKey when present (translated, with params)', () => {
    const t = vi.fn((key: string, params?: Record<string, string | number>) =>
      key === 'multiplayerFlow.hostLeftReason.explicitNoSuccessor'
        ? `מארח עזב (${params?.host ?? ''})`
        : key,
    );

    const out = resolveHostLeftMessage(
      {
        message: 'Host left and no other players available. Room is closing.',
        i18nKey: 'multiplayerFlow.hostLeftReason.explicitNoSuccessor',
        i18nParams: { host: 'Alice' },
        reason: 'explicit_no_successor',
      },
      t,
      'multiplayerFlow.roomClosed',
    );

    expect(out).toBe('מארח עזב (Alice)');
    expect(t).toHaveBeenCalledWith(
      'multiplayerFlow.hostLeftReason.explicitNoSuccessor',
      { host: 'Alice' },
    );
  });

  it('falls back to legacy message string when i18nKey missing', () => {
    const t = vi.fn();
    const out = resolveHostLeftMessage(
      { message: 'Server English fallback' },
      t,
      'multiplayerFlow.roomClosed',
    );
    expect(out).toBe('Server English fallback');
    expect(t).not.toHaveBeenCalled();
  });

  it('falls back to default key when both i18nKey and message missing', () => {
    const t = vi.fn((key: string) => key === 'multiplayerFlow.roomClosed' ? 'Room closed' : key);
    const out = resolveHostLeftMessage({}, t, 'multiplayerFlow.roomClosed');
    expect(out).toBe('Room closed');
  });

  it('uses default key when t() of i18nKey returns the key (untranslated)', () => {
    // t() is expected to return the key when no translation is found in some i18n libs.
    const t = vi.fn((key: string) =>
      key === 'multiplayerFlow.hostLeftReason.explicitNoSuccessor'
        ? key  // simulate untranslated
        : key === 'multiplayerFlow.roomClosed'
          ? 'Room closed'
          : key,
    );

    const out = resolveHostLeftMessage(
      {
        i18nKey: 'multiplayerFlow.hostLeftReason.explicitNoSuccessor',
        message: 'Host left.',
      },
      t,
      'multiplayerFlow.roomClosed',
    );

    // When translation lookup returns the key itself, fall through to message.
    expect(out).toBe('Host left.');
  });

  it('returns empty string only as last resort (no message, no default key)', () => {
    const t = vi.fn((key: string) => key);
    const out = resolveHostLeftMessage({}, t, '');
    expect(out).toBe('');
  });
});
