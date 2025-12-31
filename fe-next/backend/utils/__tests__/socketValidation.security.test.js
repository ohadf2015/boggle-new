/**
 * Security Tests for Socket Validation
 * Tests input validation against common attack vectors
 */

const {
  usernameSchema,
  roomNameSchema,
  playerIdSchema,
  guestTokenHashSchema,
  avatarSchema,
  ALLOWED_IMAGE_DOMAINS
} = require('../socketValidation');

describe('Security - Input Validation', () => {

  describe('Username Validation', () => {
    it('should accept valid usernames', () => {
      const validUsernames = ['Player1', 'User_123', 'שלום', '日本語', 'test-user'];
      validUsernames.forEach(username => {
        const result = usernameSchema.safeParse(username);
        expect(result.success).toBe(true);
      });
    });

    it('should accept usernames with spaces for multi-word names', () => {
      // Design decision: spaces are allowed for names like "Sneaky Pickle", "מלפפון חמקמק"
      // Matches frontend NAME_VALID_PATTERN for consistency
      const result = usernameSchema.safeParse('user name');
      expect(result.success).toBe(true);
    });

    it('should reject usernames with HTML tags', () => {
      const maliciousUsernames = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        'user<b>bold</b>'
      ];
      maliciousUsernames.forEach(username => {
        const result = usernameSchema.safeParse(username);
        expect(result.success).toBe(false);
      });
    });

    it('should reject usernames with control characters', () => {
      const result = usernameSchema.safeParse('user\u0000name');
      expect(result.success).toBe(false);
    });

    it('should reject usernames with zero-width characters', () => {
      // These are correctly rejected by the regex
      const rejectedUsernames = [
        'user\u200Bname',  // Zero-width space
        'user\u200Dname',  // Zero-width joiner
      ];
      rejectedUsernames.forEach(username => {
        const result = usernameSchema.safeParse(username);
        expect(result.success).toBe(false);
      });
    });

    // SECURITY: BOM character (\uFEFF) is now explicitly rejected
    it('should reject BOM character', () => {
      const result = usernameSchema.safeParse('user\uFEFFname');
      expect(result.success).toBe(false);
    });

    it('should enforce max length of 30 characters', () => {
      const longUsername = 'a'.repeat(31);
      const result = usernameSchema.safeParse(longUsername);
      expect(result.success).toBe(false);
    });
  });

  describe('Room Name Validation', () => {
    it('should accept valid room names', () => {
      const validRoomNames = ['MyRoom', 'Room_123', 'חדר', '部屋', 'sala-de-juegos'];
      validRoomNames.forEach(roomName => {
        const result = roomNameSchema.safeParse(roomName);
        expect(result.success).toBe(true);
      });
    });

    it('should reject room names with HTML tags (XSS prevention)', () => {
      const maliciousRoomNames = [
        '<script>alert(1)</script>',
        'Room<img src=x>',
        'test<b>room</b>'
      ];
      maliciousRoomNames.forEach(roomName => {
        const result = roomNameSchema.safeParse(roomName);
        expect(result.success).toBe(false);
      });
    });

    it('should enforce max length of 50 characters', () => {
      const longRoomName = 'a'.repeat(51);
      const result = roomNameSchema.safeParse(longRoomName);
      expect(result.success).toBe(false);
    });
  });

  describe('Avatar Schema - Profile Picture URL Validation (SSRF Prevention)', () => {
    it('should accept HTTPS URLs from whitelisted domains', () => {
      const validUrls = [
        'https://i.imgur.com/abc123.jpg',
        'https://cdn.discordapp.com/avatars/123.png',
        'https://lh3.googleusercontent.com/photo.jpg',
        'https://avatars.githubusercontent.com/u/123'
      ];

      // Add Supabase URL if environment is configured
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
        validUrls.push(`https://${url.hostname}/storage/v1/object/public/profile_pictures/user123/profile.jpg`);
      }

      validUrls.forEach(url => {
        const result = avatarSchema.safeParse({
          emoji: '😀',
          color: '#FF5733',
          profilePictureUrl: url
        });
        expect(result.success).toBe(true);
      });
    });

    // SECURITY: HTTP URLs are now rejected (HTTPS required)
    it('should reject HTTP URLs (require HTTPS only)', () => {
      const result = avatarSchema.safeParse({
        emoji: '😀',
        color: '#FF5733',
        profilePictureUrl: 'http://i.imgur.com/abc123.jpg'
      });
      expect(result.success).toBe(false);
    });

    // SECURITY: javascript: URLs are now rejected (XSS prevention)
    it('should reject javascript: URLs (XSS prevention)', () => {
      const result = avatarSchema.safeParse({
        emoji: '😀',
        color: '#FF5733',
        profilePictureUrl: 'javascript:alert(1)'
      });
      expect(result.success).toBe(false);
    });

    // SECURITY: data: URLs are now rejected (SSRF protection)
    it('should reject data: URLs (SSRF protection)', () => {
      const result = avatarSchema.safeParse({
        emoji: '😀',
        color: '#FF5733',
        profilePictureUrl: 'data:text/html,<script>alert(1)</script>'
      });
      expect(result.success).toBe(false);
    });

    // SECURITY: file: URLs are now rejected (local file access prevention)
    it('should reject file: URLs (local file access prevention)', () => {
      const result = avatarSchema.safeParse({
        emoji: '😀',
        color: '#FF5733',
        profilePictureUrl: 'file:///etc/passwd'
      });
      expect(result.success).toBe(false);
    });

    // SECURITY: Non-whitelisted domains are now rejected
    it('should reject URLs from non-whitelisted domains', () => {
      const urls = [
        'https://evil.com/image.jpg',
        'https://attacker.net/photo.png'
      ];

      urls.forEach(url => {
        const result = avatarSchema.safeParse({
          emoji: '😀',
          color: '#FF5733',
          profilePictureUrl: url
        });
        expect(result.success).toBe(false);
      });
    });

    it('should reject emoji bombs (excessive emojis)', () => {
      const emojiBomb = '😀'.repeat(10);
      const result = avatarSchema.safeParse({
        emoji: emojiBomb,
        color: '#FF5733'
      });
      expect(result.success).toBe(false);
    });

    it('should reject excessive zero-width joiners', () => {
      const zwjBomb = '👨' + '\u200D'.repeat(10) + '👩';
      const result = avatarSchema.safeParse({
        emoji: zwjBomb,
        color: '#FF5733'
      });
      expect(result.success).toBe(false);
    });

    it('should accept simple emojis and emojis with skin tone modifiers', () => {
      // Only emojis with max 4 codepoints are accepted
      // Complex family emojis (👨‍👩‍👧) have 5+ codepoints and are rejected to prevent emoji bombs
      const validEmojis = ['😀', '👍', '👍🏻', '🎮'];
      validEmojis.forEach(emoji => {
        const result = avatarSchema.safeParse({
          emoji,
          color: '#FF5733'
        });
        expect(result.success).toBe(true);
      });
    });

    it('should reject complex ZWJ sequences to prevent emoji bombs', () => {
      // These emojis have 5+ codepoints and are intentionally rejected
      const complexEmojis = ['👨‍👩‍👧', '👨‍👩‍👧‍👦'];
      complexEmojis.forEach(emoji => {
        const result = avatarSchema.safeParse({
          emoji,
          color: '#FF5733'
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Player ID Validation', () => {
    it('should accept valid UUID v4 format', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      ];

      validUUIDs.forEach(uuid => {
        const result = playerIdSchema.safeParse(uuid);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '12345',
        'abcd-efgh-ijkl-mnop-qrst',
        '550e8400-e29b-11d4-a716-446655440000', // UUID v1
      ];

      invalidUUIDs.forEach(uuid => {
        const result = playerIdSchema.safeParse(uuid);
        expect(result.success).toBe(false);
      });
    });

    it('should accept null player ID', () => {
      const result = playerIdSchema.safeParse(null);
      expect(result.success).toBe(true);
    });
  });

  describe('Guest Token Hash Validation', () => {
    it('should accept valid SHA-256 hash format', () => {
      const validHashes = [
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
      ];

      validHashes.forEach(hash => {
        const result = guestTokenHashSchema.safeParse(hash);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid hash formats', () => {
      const invalidHashes = [
        'not-a-hash',
        '12345',
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855extra', // Too long
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85', // Too short
        'g3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'  // Invalid char 'g'
      ];

      invalidHashes.forEach(hash => {
        const result = guestTokenHashSchema.safeParse(hash);
        expect(result.success).toBe(false);
      });
    });

    it('should accept null guest token hash', () => {
      const result = guestTokenHashSchema.safeParse(null);
      expect(result.success).toBe(true);
    });
  });
});

describe('Security - ALLOWED_IMAGE_DOMAINS Configuration', () => {
  it('should include common trusted image CDN domains', () => {
    const expectedDomains = [
      'i.imgur.com',
      'cdn.discordapp.com',
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com'
    ];

    expectedDomains.forEach(domain => {
      expect(ALLOWED_IMAGE_DOMAINS).toContain(domain);
    });
  });

  it('should not include wildcard or overly permissive domains', () => {
    expect(ALLOWED_IMAGE_DOMAINS).not.toContain('*');
    expect(ALLOWED_IMAGE_DOMAINS).not.toContain('*.com');
  });

  it('should NOT include broad "supabase.co" domain for security', () => {
    // SECURITY: We should never allow all *.supabase.co domains
    // Only specific project domains should be whitelisted
    expect(ALLOWED_IMAGE_DOMAINS).not.toContain('supabase.co');
  });

  it('should include specific Supabase project domain from environment if configured', () => {
    // If NEXT_PUBLIC_SUPABASE_URL is set, the specific project domain should be included
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
      expect(ALLOWED_IMAGE_DOMAINS).toContain(url.hostname);
    }
    // If not set, test passes (domain won't be in list, which is fine)
  });
});
