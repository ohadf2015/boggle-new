import {
  customAvatarSchema,
  getRandomAvatarConfig,
  getSeededAvatarConfig,
  isValidCustomAvatar,
  DEFAULT_AVATAR_CONFIG,
  type CustomAvatarConfig,
  isPremiumPart,
  isEpicPart,
  isLegendaryPart,
  getPremiumParts,
  getPartPrice,
  PREMIUM_PART_PRICES,
  EPIC_PART_PRICES,
  FEMALE_HAIR_STYLES,
  MALE_HAIR_STYLES,
  PREMIUM_EYE_STYLES,
  EPIC_EYE_STYLES,
  PREMIUM_MOUTH_STYLES,
  EPIC_MOUTH_STYLES,
  PREMIUM_ACCESSORIES,
  EPIC_ACCESSORIES,
  PREMIUM_HAIR_STYLES,
  EPIC_HAIR_STYLES,
  PREMIUM_BASES,
  EPIC_BASES,
  PREMIUM_BG_COLORS,
} from '../customAvatar';

describe('customAvatarSchema', () => {
  it('should validate a valid config', () => {
    // Given a valid avatar config
    const config: CustomAvatarConfig = { ...DEFAULT_AVATAR_CONFIG };

    // When parsing
    const result = customAvatarSchema.safeParse(config);

    // Then it succeeds
    expect(result.success).toBe(true);
  });

  it('should reject invalid base type', () => {
    // Given a config with an invalid base
    const config = { ...DEFAULT_AVATAR_CONFIG, base: 'nonexistent' };

    // When parsing
    const result = customAvatarSchema.safeParse(config);

    // Then it fails
    expect(result.success).toBe(false);
  });

  it('should default gender to male when missing (backward compat)', () => {
    // Given an old config without gender
    const { gender, ...oldConfig } = DEFAULT_AVATAR_CONFIG;

    // When parsing
    const result = customAvatarSchema.safeParse(oldConfig);

    // Then it succeeds with default gender
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gender).toBe('male');
    }
  });

  it('should accept non-palette hex colors (backward compat)', () => {
    // Given a config with valid hex colors not in the predefined palette
    const config = { ...DEFAULT_AVATAR_CONFIG, hairColor: '#AABBCC', bgColor: '#112233' };

    // When parsing
    const result = customAvatarSchema.safeParse(config);

    // Then it succeeds — palette is a UI constraint, not a data constraint
    expect(result.success).toBe(true);
  });

  it('should reject invalid hex color format', () => {
    // Given a config with an invalid color string
    const config = { ...DEFAULT_AVATAR_CONFIG, hairColor: 'not-a-color' };

    // When parsing
    const result = customAvatarSchema.safeParse(config);

    // Then it fails
    expect(result.success).toBe(false);
  });

  it('should reject missing required field', () => {
    // Given a config missing the eyes field
    const { eyes, ...partial } = DEFAULT_AVATAR_CONFIG;

    // When parsing
    const result = customAvatarSchema.safeParse(partial);

    // Then it fails
    expect(result.success).toBe(false);
  });

  it('should accept none for eyes and mouth', () => {
    // Given a config with no eyes and no mouth
    const config = { ...DEFAULT_AVATAR_CONFIG, eyes: 'none', mouth: 'none' };

    // When parsing
    const result = customAvatarSchema.safeParse(config);

    // Then it succeeds
    expect(result.success).toBe(true);
  });

  it('should include fantasy skin colors', () => {
    // Given a config with a fantasy skin color (light blue)
    const config = { ...DEFAULT_AVATAR_CONFIG, skinColor: '#87CEEB' };

    // When parsing
    const result = customAvatarSchema.safeParse(config);

    // Then it succeeds — skin color accepts any valid hex
    expect(result.success).toBe(true);
  });
});

describe('getRandomAvatarConfig', () => {
  it('should return a valid config', () => {
    // When generating a random config
    const config = getRandomAvatarConfig();

    // Then it passes validation
    const result = customAvatarSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should contain all required keys', () => {
    const config = getRandomAvatarConfig();
    expect(config).toHaveProperty('gender');
    expect(config).toHaveProperty('base');
    expect(config).toHaveProperty('skinColor');
    expect(config).toHaveProperty('hair');
    expect(config).toHaveProperty('hairColor');
    expect(config).toHaveProperty('eyes');
    expect(config).toHaveProperty('mouth');
    expect(config).toHaveProperty('accessory');
    expect(config).toHaveProperty('accessoryColor');
    expect(config).toHaveProperty('bgColor');
  });
});

describe('clean silhouette generation (anti-slop)', () => {
  // Most auto-generated avatars should read as "one strong character", NOT
  // "every slot filled with a random hat" — the generated-slop tell.
  const SAMPLE = 300;
  const configs = Array.from({ length: SAMPLE }, (_, i) =>
    getSeededAvatarConfig(i * 2654435761),
  );

  it('leaves most heads accessory-free (statement piece, not default)', () => {
    const withAccessory = configs.filter(c => c.accessory !== 'none').length;
    const frac = withAccessory / SAMPLE;
    // Accessories should be a minority highlight, with real variety.
    expect(frac).toBeGreaterThan(0.1);
    expect(frac).toBeLessThan(0.5);
  });

  it('keeps facial hair a minority on male avatars', () => {
    const males = configs.filter(c => c.gender === 'male');
    const withBeard = males.filter(c => c.facialHair && c.facialHair !== 'none').length;
    expect(withBeard / males.length).toBeLessThan(0.5);
  });

  it('never stacks a loud accessory AND facial hair on the same face', () => {
    const cluttered = configs.filter(
      c => c.accessory !== 'none' && c.facialHair && c.facialHair !== 'none',
    );
    expect(cluttered.length).toBe(0);
  });

  it('still always renders a complete face (eyes + mouth present)', () => {
    for (const c of configs) {
      expect(c.eyes).not.toBe('none');
      expect(c.mouth).not.toBe('none');
    }
  });

  it('is deterministic — same seed yields identical config', () => {
    expect(getSeededAvatarConfig(12345)).toEqual(getSeededAvatarConfig(12345));
  });

  it('still produces accessory variety across the population', () => {
    const kinds = new Set(configs.map(c => c.accessory).filter(a => a !== 'none'));
    expect(kinds.size).toBeGreaterThan(3);
  });
});

describe('isValidCustomAvatar', () => {
  it('should return true for valid config', () => {
    expect(isValidCustomAvatar(DEFAULT_AVATAR_CONFIG)).toBe(true);
  });

  it('should return false for invalid value', () => {
    expect(isValidCustomAvatar({ base: 'nope' })).toBe(false);
  });

  it('should return false for null', () => {
    expect(isValidCustomAvatar(null)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(isValidCustomAvatar('string')).toBe(false);
  });
});

describe('Premium Parts', () => {
  describe('isPremiumPart', () => {
    test('identifies premium eye styles', () => {
      expect(isPremiumPart('eyes', 'laser')).toBe(true);
      expect(isPremiumPart('eyes', 'hypno')).toBe(true);
      expect(isPremiumPart('eyes', 'money')).toBe(true);
      expect(isPremiumPart('eyes', 'alien')).toBe(true);
      expect(isPremiumPart('eyes', 'cyclops')).toBe(true);
      expect(isPremiumPart('eyes', 'monocleEye')).toBe(true);
    });
    test('identifies free eye styles (including moved-to-free)', () => {
      expect(isPremiumPart('eyes', 'round')).toBe(false);
      expect(isPremiumPart('eyes', 'happy')).toBe(false);
      expect(isPremiumPart('eyes', 'sleepy')).toBe(false);
      expect(isPremiumPart('eyes', 'star')).toBe(false);
      expect(isPremiumPart('eyes', 'sparkle')).toBe(false);
      expect(isPremiumPart('eyes', 'hearts')).toBe(false);
      expect(isPremiumPart('eyes', 'catPupils')).toBe(false);
    });
    test('identifies premium mouth styles', () => {
      expect(isPremiumPart('mouth', 'goldTooth')).toBe(true);
      expect(isPremiumPart('mouth', 'pipe')).toBe(true);
      expect(isPremiumPart('mouth', 'vampire')).toBe(true);
      expect(isPremiumPart('mouth', 'zipper')).toBe(true);
      expect(isPremiumPart('mouth', 'blowfish')).toBe(true);
    });
    test('identifies free mouth styles (including moved-to-free)', () => {
      expect(isPremiumPart('mouth', 'smile')).toBe(false);
      expect(isPremiumPart('mouth', 'grin')).toBe(false);
      expect(isPremiumPart('mouth', 'cat')).toBe(false);
      expect(isPremiumPart('mouth', 'kiss')).toBe(false);
      expect(isPremiumPart('mouth', 'mustache')).toBe(false);
    });
    test('identifies premium accessories', () => {
      expect(isPremiumPart('accessory', 'crown')).toBe(true);
      expect(isPremiumPart('accessory', 'tiara')).toBe(true);
      expect(isPremiumPart('accessory', 'viking')).toBe(true);
      expect(isPremiumPart('accessory', 'devilHorns')).toBe(true);
      expect(isPremiumPart('accessory', 'headphones')).toBe(true);
      expect(isPremiumPart('accessory', 'monocle')).toBe(true);
      expect(isPremiumPart('accessory', 'eyepatch')).toBe(true);
      expect(isPremiumPart('accessory', 'mask')).toBe(true);
      expect(isPremiumPart('accessory', 'sombrero')).toBe(true);
      expect(isPremiumPart('accessory', 'flowerCrown')).toBe(true);
    });
    test('identifies free accessories (including moved-to-free)', () => {
      expect(isPremiumPart('accessory', 'glasses')).toBe(false);
      expect(isPremiumPart('accessory', 'none')).toBe(false);
      expect(isPremiumPart('accessory', 'hat')).toBe(false);
      expect(isPremiumPart('accessory', 'halo')).toBe(false);
      expect(isPremiumPart('accessory', 'chefHat')).toBe(false);
      expect(isPremiumPart('accessory', 'cucumberFace')).toBe(false);
      expect(isPremiumPart('accessory', 'plunger')).toBe(false);
      expect(isPremiumPart('accessory', 'mustacheGlasses')).toBe(false);
      expect(isPremiumPart('accessory', 'propellerHat')).toBe(false);
      expect(isPremiumPart('accessory', 'catEars')).toBe(false);
      expect(isPremiumPart('accessory', 'bunnyEars')).toBe(false);
      expect(isPremiumPart('accessory', 'beanie')).toBe(false);
      expect(isPremiumPart('accessory', 'goggles')).toBe(false);
      expect(isPremiumPart('accessory', 'pearls')).toBe(false);
      expect(isPremiumPart('accessory', 'heartGlasses')).toBe(false);
      expect(isPremiumPart('accessory', 'choker')).toBe(false);
      expect(isPremiumPart('accessory', 'monkeyEars')).toBe(false);
    });
    test('identifies premium hair styles', () => {
      expect(isPremiumPart('hair', 'elvis')).toBe(true);
      expect(isPremiumPart('hair', 'ramen')).toBe(true);
      expect(isPremiumPart('hair', 'twintails')).toBe(true);
      expect(isPremiumPart('hair', 'undercut')).toBe(true);
      expect(isPremiumPart('hair', 'spaceBuns')).toBe(true);
    });
    test('identifies free hair styles (including moved-to-free)', () => {
      expect(isPremiumPart('hair', 'spiky')).toBe(false);
      expect(isPremiumPart('hair', 'curly')).toBe(false);
      expect(isPremiumPart('hair', 'mohawk')).toBe(false);
      expect(isPremiumPart('hair', 'sideshave')).toBe(false);
    });
    test('identifies premium bg colors', () => {
      expect(isPremiumPart('bgColor', '#FF0000')).toBe(true);
      expect(isPremiumPart('bgColor', '#000000')).toBe(true);
      expect(isPremiumPart('bgColor', '#4B0082')).toBe(true);
      expect(isPremiumPart('bgColor', '#FFD700')).toBe(true);
    });
    test('identifies free bg colors', () => {
      expect(isPremiumPart('bgColor', '#1a1a2e')).toBe(false);
    });
    test('identifies premium bases', () => {
      expect(isPremiumPart('base', 'diamond')).toBe(true);
    });
    test('identifies free bases (including moved-to-free)', () => {
      expect(isPremiumPart('base', 'round')).toBe(false);
      expect(isPremiumPart('base', 'hexagon')).toBe(false);
      expect(isPremiumPart('base', 'blob')).toBe(false);
      expect(isPremiumPart('base', 'heart')).toBe(false);
    });
    test('returns false for unknown categories', () => {
      expect(isPremiumPart('unknown' as any, 'anything')).toBe(false);
    });
  });

  describe('getPremiumParts', () => {
    // These assert the BEHAVIOR (VIP list then Epic list, in order) against the
    // source constants — so adding new premium parts updates them automatically
    // instead of re-breaking a hardcoded snapshot on every catalog change.
    test('returns all premium eye styles (VIP + Epic)', () => {
      expect(getPremiumParts('eyes')).toEqual([...PREMIUM_EYE_STYLES, ...EPIC_EYE_STYLES]);
    });
    test('returns all premium mouth styles (VIP + Epic)', () => {
      expect(getPremiumParts('mouth')).toEqual([...PREMIUM_MOUTH_STYLES, ...EPIC_MOUTH_STYLES]);
    });
    test('returns all premium accessories (VIP + Epic)', () => {
      expect(getPremiumParts('accessory')).toEqual([...PREMIUM_ACCESSORIES, ...EPIC_ACCESSORIES]);
    });
    test('returns all premium hair styles (VIP + Epic)', () => {
      expect(getPremiumParts('hair')).toEqual([...PREMIUM_HAIR_STYLES, ...EPIC_HAIR_STYLES]);
    });
    test('returns premium bg colors', () => {
      expect(getPremiumParts('bgColor')).toEqual([...PREMIUM_BG_COLORS]);
    });
    test('returns all premium bases (VIP + Epic)', () => {
      expect(getPremiumParts('base')).toEqual([...PREMIUM_BASES, ...EPIC_BASES]);
    });
    test('returns empty for unknown category', () => {
      expect(getPremiumParts('unknown' as any)).toEqual([]);
    });
  });

  describe('isEpicPart', () => {
    test('identifies epic eye styles', () => {
      expect(isEpicPart('eyes', 'galaxy')).toBe(true);
      expect(isEpicPart('eyes', 'void')).toBe(true);
    });
    test('VIP parts are not epic', () => {
      expect(isEpicPart('eyes', 'laser')).toBe(false);
    });
    test('free parts are not epic', () => {
      expect(isEpicPart('eyes', 'round')).toBe(false);
    });
    test('identifies epic accessories', () => {
      expect(isEpicPart('accessory', 'samurai')).toBe(true);
      expect(isEpicPart('accessory', 'astronaut')).toBe(true);
    });
    test('identifies epic bases', () => {
      expect(isEpicPart('base', 'skull')).toBe(true);
      expect(isEpicPart('base', 'shield')).toBe(true);
      expect(isEpicPart('base', 'dragonHead')).toBe(true);
    });
    test('identifies legendary parts as epic', () => {
      expect(isEpicPart('eyes', 'infinity')).toBe(true);
      expect(isEpicPart('accessory', 'phoenixCrown')).toBe(true);
      expect(isEpicPart('base', 'dragonHead')).toBe(true);
    });
  });

  describe('isLegendaryPart', () => {
    test('identifies the 3 legendary items', () => {
      expect(isLegendaryPart('eyes', 'infinity')).toBe(true);
      expect(isLegendaryPart('accessory', 'phoenixCrown')).toBe(true);
      expect(isLegendaryPart('base', 'dragonHead')).toBe(true);
    });
    test('epic parts are not legendary', () => {
      expect(isLegendaryPart('eyes', 'galaxy')).toBe(false);
      expect(isLegendaryPart('accessory', 'samurai')).toBe(false);
      expect(isLegendaryPart('base', 'skull')).toBe(false);
    });
    test('VIP/free parts are not legendary', () => {
      expect(isLegendaryPart('eyes', 'laser')).toBe(false);
      expect(isLegendaryPart('eyes', 'round')).toBe(false);
    });
  });

  describe('pricing', () => {
    test('PREMIUM_PART_PRICES has category defaults', () => {
      expect(PREMIUM_PART_PRICES.eyes).toBeDefined();
      expect(PREMIUM_PART_PRICES.base).toBeDefined();
    });
    test('all VIP prices are positive', () => {
      Object.values(PREMIUM_PART_PRICES).forEach(price => {
        expect(price).toBeGreaterThan(0);
      });
    });
    test('epic parts have individual pricing via EPIC_PART_PRICES', () => {
      expect(EPIC_PART_PRICES['base:skull']).toBe(3000);
      expect(EPIC_PART_PRICES['accessory:samurai']).toBe(2500);
      expect(EPIC_PART_PRICES['eyes:void']).toBe(2000);
    });
    test('legendary parts are the most expensive', () => {
      expect(EPIC_PART_PRICES['eyes:infinity']).toBe(7500);
      expect(EPIC_PART_PRICES['accessory:phoenixCrown']).toBe(10000);
      expect(EPIC_PART_PRICES['base:dragonHead']).toBe(10000);
    });
    test('getPartPrice returns epic override for epic parts', () => {
      expect(getPartPrice('base', 'skull')).toBe(3000);
      expect(getPartPrice('eyes', 'galaxy')).toBe(1500);
    });
    test('getPartPrice returns per-part price for VIP parts', () => {
      expect(getPartPrice('eyes', 'laser')).toBe(500);
      expect(getPartPrice('base', 'diamond')).toBe(900);
      expect(getPartPrice('hair', 'elvis')).toBe(600);
      expect(getPartPrice('accessory', 'crown')).toBe(800);
      expect(getPartPrice('mouth', 'goldTooth')).toBe(500);
    });
    test('all epic prices are higher than VIP category defaults', () => {
      Object.entries(EPIC_PART_PRICES).forEach(([key, price]) => {
        const category = key.split(':')[0];
        const vipPrice = PREMIUM_PART_PRICES[category] ?? 0;
        expect(price).toBeGreaterThan(vipPrice);
      });
    });
  });

  describe('random avatars exclude premium parts', () => {
    test('getRandomAvatarConfig never returns premium parts', () => {
      // Run 200 times to be statistically confident
      for (let i = 0; i < 200; i++) {
        const config = getRandomAvatarConfig();
        expect(isPremiumPart('base', config.base)).toBe(false);
        expect(isPremiumPart('eyes', config.eyes)).toBe(false);
        expect(isPremiumPart('mouth', config.mouth)).toBe(false);
        expect(isPremiumPart('accessory', config.accessory)).toBe(false);
        expect(isPremiumPart('hair', config.hair)).toBe(false);
      }
    });

    test('getSeededAvatarConfig never returns premium parts', () => {
      for (let seed = 0; seed < 200; seed++) {
        const config = getSeededAvatarConfig(seed);
        expect(isPremiumPart('base', config.base)).toBe(false);
        expect(isPremiumPart('eyes', config.eyes)).toBe(false);
        expect(isPremiumPart('mouth', config.mouth)).toBe(false);
        expect(isPremiumPart('accessory', config.accessory)).toBe(false);
        expect(isPremiumPart('hair', config.hair)).toBe(false);
      }
    });
  });

  describe('random avatars use gender-appropriate hair', () => {
    test('getRandomAvatarConfig returns hair valid for the generated gender', () => {
      for (let i = 0; i < 500; i++) {
        const config = getRandomAvatarConfig();
        const validList: readonly string[] = config.gender === 'female' ? FEMALE_HAIR_STYLES : MALE_HAIR_STYLES;
        expect(validList).toContain(config.hair);
      }
    });

    test('getSeededAvatarConfig returns hair valid for the generated gender', () => {
      for (let seed = 0; seed < 500; seed++) {
        const config = getSeededAvatarConfig(seed);
        const validList: readonly string[] = config.gender === 'female' ? FEMALE_HAIR_STYLES : MALE_HAIR_STYLES;
        expect(validList).toContain(config.hair);
      }
    });
  });

  describe('random avatars always have all visible face parts', () => {
    test('getRandomAvatarConfig never returns none for eyes, mouth, or hair', () => {
      for (let i = 0; i < 200; i++) {
        const config = getRandomAvatarConfig();
        expect(config.eyes).not.toBe('none');
        expect(config.mouth).not.toBe('none');
        expect(config.hair).not.toBe('none');
      }
    });

    test('getSeededAvatarConfig never returns none for eyes, mouth, or hair', () => {
      for (let seed = 0; seed < 200; seed++) {
        const config = getSeededAvatarConfig(seed);
        expect(config.eyes).not.toBe('none');
        expect(config.mouth).not.toBe('none');
        expect(config.hair).not.toBe('none');
      }
    });
  });
});
