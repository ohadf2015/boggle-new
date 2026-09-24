import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';
import { DEFAULT_AVATAR_CONFIG, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { LEVEL_UNLOCK_LADDER, partKey } from '@/lib/avatar/unlocks';
import { getPartRarity } from '@/lib/avatar/rarity';
import { getCatalogPart } from '@/lib/avatar/catalog';
import { HEADS } from '@/components/avatar/art/heads';
import {
  COSTUME_HANDS,
  REVEAL_ATTITUDES,
  REVEAL_FX_KINDS,
  REVEAL_POSES,
  attitudeConfig,
  handColor,
  revealAttitude,
  revealVoiceKey,
} from '../revealAttitude';

const LOCALES = { en, he, sv, ja, es, ru } as Record<string, Record<string, unknown>>;

function resolve(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

const find = (id: string) => {
  const u = LEVEL_UNLOCK_LADDER.find(x => x.partId === id);
  if (!u) throw new Error(`not on the ladder: ${id}`);
  return u;
};

describe('revealAttitude — every ladder unlock gets its own moment', () => {
  it('every ladder unlock has an explicit attitude (no silent category fallback)', () => {
    for (const u of LEVEL_UNLOCK_LADDER) {
      expect(REVEAL_ATTITUDES[partKey(u.category, u.partId)], partKey(u.category, u.partId)).toBeDefined();
    }
  });

  it('a part that is not on the ladder yet falls back to a drawable default instead of throwing', () => {
    const a = revealAttitude({ category: 'hair', partId: 'someFutureHair' });
    expect(REVEAL_FX_KINDS).toContain(a.fx);
    expect(REVEAL_POSES).toContain(a.pose);
    expect(a.backdrop).toBe(false);
  });

  it('fx, pose and tilt stay inside what the stage can draw', () => {
    for (const u of LEVEL_UNLOCK_LADDER) {
      const a = revealAttitude(u);
      expect(REVEAL_FX_KINDS, u.partId).toContain(a.fx);
      expect(REVEAL_POSES, u.partId).toContain(a.pose);
      expect(Math.abs(a.tilt), u.partId).toBeLessThanOrEqual(8);
    }
  });

  it('is not one moment on repeat: several fx kinds and every pose get used', () => {
    const fx = new Set(LEVEL_UNLOCK_LADDER.map(u => revealAttitude(u).fx));
    expect(fx.size).toBeGreaterThanOrEqual(6);
    const poses = new Set(LEVEL_UNLOCK_LADDER.map(u => revealAttitude(u).pose));
    expect(poses.size).toBe(REVEAL_POSES.length);
  });

  it('a background unlock is shown as a backdrop in the new color; parts are not', () => {
    expect(revealAttitude(find('#000000')).backdrop).toBe(true);
    expect(revealAttitude(find('#4B0082')).backdrop).toBe(true);
    expect(revealAttitude(find('headphones')).backdrop).toBe(false);
    expect(revealAttitude(find('heartEye')).backdrop).toBe(false);
  });
});

describe('attitude faces', () => {
  it('only uses free, drawn expression parts (never flashes a paid face the player does not own)', () => {
    for (const [key, a] of Object.entries(REVEAL_ATTITUDES)) {
      for (const [category, id] of Object.entries(a.face)) {
        expect(getPartRarity(category, id as string), `${key} ${category}:${id}`).toBe('common');
        const part = getCatalogPart(category, id as string);
        expect(part && !part.isHidden, `${key} ${category}:${id} is drawn`).toBe(true);
      }
    }
  });

  it('faces differ between items (personality, not one stock grin)', () => {
    const faces = new Set(LEVEL_UNLOCK_LADDER.map(u => JSON.stringify(revealAttitude(u).face)));
    expect(faces.size).toBeGreaterThanOrEqual(6);
  });
});

describe('attitudeConfig (the avatar as staged on the reveal)', () => {
  it('wears the unlocked accessory with that item\'s own face', () => {
    const u = find('headphones');
    const face = revealAttitude(u).face;
    const next = attitudeConfig(DEFAULT_AVATAR_CONFIG, u);
    expect(next.accessory).toBe('headphones');
    expect(next.eyes).toBe(face.eyes);
    expect(next.mouth).toBe(face.mouth);
    expect(next.eyebrows).toBe(face.eyebrows);
  });

  it('an eyes unlock keeps the NEW eyes (the face never hides the reward)', () => {
    const u = find('heartEye');
    const next = attitudeConfig(DEFAULT_AVATAR_CONFIG, u);
    expect(next.eyes).toBe('heartEye');
    expect(next.mouth).toBe(revealAttitude(u).face.mouth);
  });

  it('a mouth unlock keeps the NEW mouth', () => {
    const next = attitudeConfig(DEFAULT_AVATAR_CONFIG, find('fangs'));
    expect(next.mouth).toBe('fangs');
  });

  it('a face-shape unlock keeps the NEW base', () => {
    const next = attitudeConfig(DEFAULT_AVATAR_CONFIG, find('slime'));
    expect(next.base).toBe('slime');
  });

  it('a background unlock paints the new color and keeps the rest of the look', () => {
    const saved: CustomAvatarConfig = { ...DEFAULT_AVATAR_CONFIG, accessory: 'cowboyHat', hair: 'cottonCandy' };
    const next = attitudeConfig(saved, find('#000000'));
    expect(next.bgColor).toBe('#000000');
    expect(next.accessory).toBe('cowboyHat');
    expect(next.hair).toBe('cottonCandy');
  });

  it('never mutates the saved config', () => {
    const saved = { ...DEFAULT_AVATAR_CONFIG };
    attitudeConfig(saved, find('duckHat'));
    expect(saved).toEqual(DEFAULT_AVATAR_CONFIG);
  });
});

describe('voice lines (copy with a joke, like "such a purr-fect fit")', () => {
  it('the voice key mirrors the part-name key', () => {
    expect(revealVoiceKey(find('headphones'))).toBe('revealUnlock.voice.headphones');
    expect(revealVoiceKey(find('#000000'))).toBe('revealUnlock.voice.bg000000');
    expect(revealVoiceKey(find('#4B0082'))).toBe('revealUnlock.voice.bg4B0082');
  });

  it('every ladder unlock has a voice line in all 6 locales', () => {
    for (const u of LEVEL_UNLOCK_LADDER) {
      const key = revealVoiceKey(u);
      for (const [loc, msgs] of Object.entries(LOCALES)) {
        const v = resolve(msgs, key);
        expect(typeof v === 'string' && v.trim().length > 0, `${loc} ${key}`).toBe(true);
      }
    }
  });

  it('lines are written per locale, not pasted English', () => {
    for (const u of LEVEL_UNLOCK_LADDER) {
      const key = revealVoiceKey(u);
      const vals = Object.values(LOCALES).map(m => resolve(m, key));
      expect(new Set(vals).size, key).toBeGreaterThanOrEqual(5);
    }
  });

  it('lines stay short enough for two lines under the name on a phone', () => {
    for (const u of LEVEL_UNLOCK_LADDER) {
      for (const [loc, msgs] of Object.entries(LOCALES)) {
        const v = String(resolve(msgs, revealVoiceKey(u)) ?? '');
        expect(v.length, `${loc} ${revealVoiceKey(u)}`).toBeLessThanOrEqual(64);
      }
    }
  });

  it('lines never repeat the part name (the name is already shown big above them)', () => {
    for (const u of LEVEL_UNLOCK_LADDER) {
      const name = String(resolve(en, `revealUnlock.parts.${u.category === 'bgColor' ? `bg${u.partId.slice(1).toUpperCase()}` : u.partId}`));
      const line = String(resolve(en, revealVoiceKey(u)));
      expect(line.toLowerCase().includes(name.toLowerCase()), `${u.partId}: "${line}"`).toBe(false);
    }
  });
});

describe('handColor (the hands on the box rim match the face)', () => {
  it('uses the player\'s skin color on a normal head', () => {
    expect(handColor({ ...DEFAULT_AVATAR_CONFIG, base: 'round', skinColor: '#8D5524' })).toBe('#8D5524');
  });

  it('a costume head (slime, ghost...) gets hands in the costume color, not peach hands on a green face', () => {
    expect(handColor({ ...DEFAULT_AVATAR_CONFIG, base: 'slime', skinColor: '#FFDBB4' })).toBe(COSTUME_HANDS.slime);
    expect(handColor({ ...DEFAULT_AVATAR_CONFIG, base: 'ghostFace', skinColor: '#FFDBB4' })).toBe(COSTUME_HANDS.ghostFace);
  });

  it('mirrors every costume color the art draws (test-only coupling: fails loudly if the art changes)', () => {
    const costumes = Object.entries(HEADS).filter(([, h]) => h.costume).map(([id, h]) => [id, h.costume]);
    expect(costumes.length).toBeGreaterThan(0);
    for (const [id, color] of costumes) expect(COSTUME_HANDS[id as string], id as string).toBe(color);
    expect(Object.keys(COSTUME_HANDS).sort()).toEqual(costumes.map(([id]) => id).sort());
  });
});
