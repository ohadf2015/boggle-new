/**
 * shadowRoleLabel — single source of truth for displaying a Shadow Clash role.
 *
 * Bug it fixes: the TV reveal screens (dawn / verdict / game-over) and a couple
 * of phone badges printed hardcoded English ("🐺 Shadow") or the raw enum
 * ("shadow") instead of the translated name. This helper pairs the canonical
 * emoji with the existing `party.role*` translation keys so every surface agrees.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shadowRoleEmoji, shadowRoleName, shadowRoleLabel } from '../shadowRoleLabel';

describe('shadowRoleLabel', () => {
  const t = vi.fn((key: string) => `t:${key}`);
  beforeEach(() => t.mockClear());

  it('translates each role via its party.role* key (never the raw enum)', () => {
    expect(shadowRoleName('shadow', t)).toBe('t:party.roleShadow');
    expect(shadowRoleName('seer', t)).toBe('t:party.roleSeer');
    expect(shadowRoleName('medic', t)).toBe('t:party.roleMedic');
    expect(shadowRoleName('citizen', t)).toBe('t:party.roleCitizen');
  });

  it('exposes the canonical emoji per role', () => {
    expect(shadowRoleEmoji('shadow')).toBe('🐺');
    expect(shadowRoleEmoji('seer')).toBe('👁️');
    expect(shadowRoleEmoji('medic')).toBe('🛡️');
    expect(shadowRoleEmoji('citizen')).toBe('👤');
  });

  it('combines emoji + translated name for the full label', () => {
    expect(shadowRoleLabel('shadow', t)).toBe('🐺 t:party.roleShadow');
    expect(t).toHaveBeenCalledWith('party.roleShadow');
  });

  it('falls back gracefully on an unknown role', () => {
    expect(shadowRoleName('ghost' as never, t)).toBe('ghost');
    expect(shadowRoleEmoji('ghost' as never)).toBe('');
    expect(shadowRoleLabel('ghost' as never, t)).toBe('ghost');
  });
});
