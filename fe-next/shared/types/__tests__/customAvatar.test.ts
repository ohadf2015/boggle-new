import {
  customAvatarSchema,
  getRandomAvatarConfig,
  isValidCustomAvatar,
  DEFAULT_AVATAR_CONFIG,
  type CustomAvatarConfig,
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
    const config = { ...DEFAULT_AVATAR_CONFIG, base: 'triangle' };

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
