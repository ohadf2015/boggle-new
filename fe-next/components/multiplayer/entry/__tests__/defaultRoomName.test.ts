/**
 * The default room name used to be `t('...roomNamePlaceholder', { name })` =
 * "{{name}}'s Room", then run through sanitizeRoomName — which strips the
 * apostrophe the server's RoomNameSchema rejects, so every English default read
 * "Ohads Room". The default must be built from a template that SURVIVES the
 * sanitizer and the server schema in every locale.
 */
import { describe, it, expect } from 'vitest';
import { RoomNameSchema } from '@/shared/schemas/socketSchemas';
import { sanitizeRoomName } from '@/utils/consts';
import { defaultRoomName, DEFAULT_ROOM_NAME_MAX } from '../defaultRoomName';
import { LOCALES, bundleT } from './localeBundles';

const SAMPLES = ['Ohad', 'Björn', 'אוהד', 'Дмитрий', 'たろう', "O'Brien", 'a‮b'];

describe('defaultRoomName', () => {
  it.each(LOCALES)('%s: the default is unchanged by sanitizeRoomName and passes the server schema', (locale) => {
    const t = bundleT(locale);
    for (const name of SAMPLES) {
      const room = defaultRoomName(t, name);
      expect(room.length).toBeGreaterThan(0);
      expect(room).not.toContain('mpUi.entry');
      expect(sanitizeRoomName(room)).toBe(room);
      expect(RoomNameSchema.safeParse(room).success).toBe(true);
      expect(room.length).toBeLessThanOrEqual(DEFAULT_ROOM_NAME_MAX);
    }
  });

  it('English keeps the possessive — not "Ohads Room"', () => {
    const room = defaultRoomName(bundleT('en'), 'Ohad');
    expect(room).not.toBe('Ohads Room');
    expect(room.startsWith('Ohad')).toBe(true);
    expect(room).toMatch(/^Ohadʼs /);
  });

  it('keeps the host name inside the default in every locale', () => {
    for (const locale of LOCALES) expect(defaultRoomName(bundleT(locale), 'Björn')).toContain('Björn');
  });

  it('caps a very long host name so the default stays within the room-name cap', () => {
    const room = defaultRoomName(bundleT('he'), 'x'.repeat(40));
    expect(room.length).toBeLessThanOrEqual(DEFAULT_ROOM_NAME_MAX);
    expect(sanitizeRoomName(room)).toBe(room);
  });
});
