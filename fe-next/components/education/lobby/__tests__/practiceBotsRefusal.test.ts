import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';
import { AUTO_FILL_REFUSAL_REASONS } from '@/shared/types/autoFillRefusal';
import { practiceBotsRefusalKey, usePracticeBotsRefusal, PRACTICE_BOTS_FALLBACK_KEY, autoFillRefusalRejoinCode, arcadeAutoFillToastKey } from '../practiceBotsRefusal';

function lookup(dict: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dict);
}

function fakeSocket() {
  const handlers = new Map<string, (p: unknown) => void>();
  return {
    handlers,
    on: vi.fn((e: string, h: (p: unknown) => void) => { handlers.set(e, h); }),
    off: vi.fn((e: string) => { handlers.delete(e); }),
  };
}

describe('practice bots refusal', () => {
  it('Given every reason the server can send, When it is mapped, Then each locale has its own message', () => {
    for (const reason of AUTO_FILL_REFUSAL_REASONS) {
      const key = practiceBotsRefusalKey(reason);
      expect(key).not.toBe(PRACTICE_BOTS_FALLBACK_KEY);
      for (const [name, dict] of Object.entries({ en, he, es, sv, ja, ru })) {
        expect(typeof lookup(dict, key), `${name} ${key}`).toBe('string');
      }
    }
  });

  it('Given an unknown reason, When it is mapped, Then the generic connection message is used', () => {
    expect(practiceBotsRefusalKey('weird')).toBe(PRACTICE_BOTS_FALLBACK_KEY);
    expect(practiceBotsRefusalKey(undefined)).toBe(PRACTICE_BOTS_FALLBACK_KEY);
  });

  it('Given a pending request, When the server refuses it, Then the lobby hears the matching message key', () => {
    const socket = fakeSocket();
    const onRefused = vi.fn();
    renderHook(() => usePracticeBotsRefusal(socket as never, true, onRefused));
    socket.handlers.get('autoFillRefused')?.({ reason: 'not_host' });
    expect(onRefused).toHaveBeenCalledWith('tvLobby.practiceRefused.not_host');
  });

  it('Given a pending request, When the server says the bots are already seated, Then the lobby is told to start', () => {
    const socket = fakeSocket();
    const onRefused = vi.fn();
    const onSeated = vi.fn();
    renderHook(() => usePracticeBotsRefusal(socket as never, true, onRefused, onSeated));
    socket.handlers.get('autoFillComplete')?.({ botsAdded: 0, alreadySeated: true });
    socket.handlers.get('autoFillComplete')?.({ botsAdded: 2 });
    expect(onSeated).toHaveBeenCalledTimes(1);
    expect(onRefused).not.toHaveBeenCalled();
  });

  it('Given no pending request, When a refusal arrives, Then nothing listens', () => {
    const socket = fakeSocket();
    renderHook(() => usePracticeBotsRefusal(socket as never, false, vi.fn()));
    expect(socket.handlers.has('autoFillRefused')).toBe(false);
  });

  it('Given the server lost the host seat, When a fill is refused as not_in_room, Then the socket rejoin runs as it did for the old error', () => {
    expect(autoFillRefusalRejoinCode('not_in_room')).toBe('PLAYER_NOT_IN_GAME');
    expect(autoFillRefusalRejoinCode('room_gone')).toBeNull();
  });

  it('Given an arcade lobby fill is refused, Then only failures the host can act on get a toast', () => {
    expect(arcadeAutoFillToastKey('rate_limited')).toBe('errors.rateLimited');
    expect(arcadeAutoFillToastKey('room_gone')).toBe('errors.gameNotFound');
    expect(arcadeAutoFillToastKey('not_host')).toBe('errors.generic');
    expect(arcadeAutoFillToastKey('room_full')).toBeNull();
    expect(arcadeAutoFillToastKey('not_in_room')).toBeNull();
  });
});
