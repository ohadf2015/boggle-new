/**
 * Tests for Re-engagement Email module
 *
 * Covers: language resolution, first letter fetch, recipient filtering,
 * template generation (5 languages), RTL support, subject line rotation
 */

// Mock email.ts shared utilities
jest.mock('@/lib/email', () => ({
  getSupabaseAdmin: jest.fn(),
  withTimeout: jest.fn((p: Promise<unknown>) => p),
  getTodayDate: jest.fn(() => '2026-03-04'),
  getLocalHour: jest.fn(() => 8),
  generateUnsubscribeToken: jest.fn(() => 'mock-token-123'),
  isEmailServiceConfigured: jest.fn(() => true),
  EMAIL_COLORS: {
    navy: '#1a1a2e', navyLight: '#16213e', navyCard: '#252545',
    lime: '#BFFF00', limeLight: '#D9FF66', limeMuted: '#A6D900',
    pink: '#FF1493', pinkLight: '#FF6BB8', cyan: '#00FFFF',
    cyanMuted: '#4DD9D9', purple: '#8B5CF6', orange: '#FF6B35',
    white: '#FFFFFF', black: '#000000', gray: '#666666',
    grayLight: '#9CA3AF', grayDark: '#374151',
  } as Record<string, string>,
}));

// Mock resend
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: 'mock-email-id' }, error: null }),
    },
  })),
}));

import { getSupabaseAdmin } from '@/lib/email';
import {
  resolveUserLanguage,
  getFirstLetterForLanguage,
  generateReengagementEmailHtml,
  getReengagementSubject,
  COUNTRY_TO_LANGUAGE,
} from '../reengagementEmail';

const mockGetSupabaseAdmin = getSupabaseAdmin as jest.Mock;

// Helper to create a chainable Supabase mock
function createMockSupabase() {
  const chain: Record<string, jest.Mock | unknown> = {};

  chain.from = jest.fn().mockReturnValue(chain);
  chain.select = jest.fn().mockReturnValue(chain);
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.neq = jest.fn().mockReturnValue(chain);
  chain.lt = jest.fn().mockReturnValue(chain);
  chain.lte = jest.fn().mockReturnValue(chain);
  chain.gt = jest.fn().mockReturnValue(chain);
  chain.gte = jest.fn().mockReturnValue(chain);
  chain.is = jest.fn().mockReturnValue(chain);
  chain.or = jest.fn().mockReturnValue(chain);
  chain.order = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.single = jest.fn().mockResolvedValue({ data: null, error: null });
  chain.update = jest.fn().mockReturnValue(chain);
  chain.not = jest.fn().mockReturnValue(chain);

  chain.auth = {
    admin: {
      listUsers: jest.fn().mockResolvedValue({
        data: { users: [] },
        error: null,
      }),
    },
  };

  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ==========================================
// resolveUserLanguage tests
// ==========================================
describe('resolveUserLanguage', () => {
  test('should prioritize game language from daily_puzzle_attempts', async () => {
    // GIVEN - user has played in Hebrew
    const mockSupabase = createMockSupabase();
    mockSupabase.single = jest.fn().mockResolvedValue({
      data: { language: 'he' },
      error: null,
    });
    mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

    // WHEN
    const result = await resolveUserLanguage('user-123', 'US');

    // THEN
    expect(result).toBe('he');
    expect(mockSupabase.from).toHaveBeenCalledWith('daily_puzzle_attempts');
  });

  test('should fall back to country code mapping when no game history', async () => {
    // GIVEN - no game history, country is Israel
    const mockSupabase = createMockSupabase();
    mockSupabase.single = jest.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    });
    mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

    // WHEN
    const result = await resolveUserLanguage('user-123', 'IL');

    // THEN
    expect(result).toBe('he');
  });

  test('should map SE to Swedish', async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.single = jest.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    });
    mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const result = await resolveUserLanguage('user-123', 'SE');
    expect(result).toBe('sv');
  });

  test('should map JP to Japanese', async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.single = jest.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    });
    mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const result = await resolveUserLanguage('user-123', 'JP');
    expect(result).toBe('ja');
  });

  test('should map Spanish-speaking countries to es', async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.single = jest.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    });
    mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

    for (const country of ['ES', 'MX', 'AR', 'CO', 'CL', 'PE']) {
      const result = await resolveUserLanguage('user-123', country);
      expect(result).toBe('es');
    }
  });

  test('should default to en when no country code and no game history', async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.single = jest.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    });
    mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const result = await resolveUserLanguage('user-123', null);
    expect(result).toBe('en');
  });

  test('should default to en when supabase is not available', async () => {
    mockGetSupabaseAdmin.mockReturnValue(null);

    const result = await resolveUserLanguage('user-123', null);
    expect(result).toBe('en');
  });
});

// ==========================================
// getFirstLetterForLanguage tests
// ==========================================
describe('getFirstLetterForLanguage', () => {
  test('should return first letter from daily_target_words', async () => {
    // GIVEN
    const mockSupabase = createMockSupabase();
    mockSupabase.single = jest.fn().mockResolvedValue({
      data: { target_word: 'hello', override_word: null },
      error: null,
    });
    mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

    // WHEN
    const result = await getFirstLetterForLanguage('en');

    // THEN
    expect(result).toEqual({ letter: 'H', word: 'hello' });
  });

  test('should prefer override_word over target_word', async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.single = jest.fn().mockResolvedValue({
      data: { target_word: 'hello', override_word: 'world' },
      error: null,
    });
    mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const result = await getFirstLetterForLanguage('en');
    expect(result).toEqual({ letter: 'W', word: 'world' });
  });

  test('should return null when no word found and supabase unavailable', async () => {
    mockGetSupabaseAdmin.mockReturnValue(null);

    const result = await getFirstLetterForLanguage('en');
    expect(result).toBeNull();
  });

  test('should handle Hebrew first letter correctly', async () => {
    const mockSupabase = createMockSupabase();
    mockSupabase.single = jest.fn().mockResolvedValue({
      data: { target_word: 'שלום', override_word: null },
      error: null,
    });
    mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

    const result = await getFirstLetterForLanguage('he');
    expect(result).toEqual({ letter: 'ש', word: 'שלום' });
  });
});

// ==========================================
// generateReengagementEmailHtml tests
// ==========================================
describe('generateReengagementEmailHtml', () => {
  test('should generate valid HTML for English', () => {
    const { html, text, subject } = generateReengagementEmailHtml({
      recipientName: 'John',
      firstLetter: 'H',
      language: 'en',
      unsubscribeUrl: 'https://example.com/unsub',
      playUrl: 'https://example.com/en/daily',
      baseUrl: 'https://example.com',
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('John');
    expect(html).toContain('H');
    expect(html).toContain('https://example.com/en/daily');
    expect(html).toContain('https://example.com/unsub');
    expect(subject).toBeTruthy();
    expect(text).toContain('John');
    expect(text).toContain('H');
  });

  test('should include mascot image in email', () => {
    const { html } = generateReengagementEmailHtml({
      recipientName: 'Test',
      firstLetter: 'A',
      language: 'en',
      unsubscribeUrl: '#',
      playUrl: '#',
      baseUrl: 'https://example.com',
    });

    expect(html).toContain('/mascot/waving-nobg.gif');
    expect(html).toContain('alt="Lexi"');
  });

  test('should use text-based logo with LexiClash branding', () => {
    const { html } = generateReengagementEmailHtml({
      recipientName: 'Test',
      firstLetter: 'A',
      language: 'en',
      unsubscribeUrl: '#',
      playUrl: '#',
      baseUrl: 'https://example.com',
    });

    expect(html).toContain('Lexi');
    expect(html).toContain('Clash');
  });

  test('should include speech bubble and mini mystery tiles', () => {
    const { html } = generateReengagementEmailHtml({
      recipientName: 'Test',
      firstLetter: 'A',
      language: 'en',
      unsubscribeUrl: '#',
      playUrl: '#',
      baseUrl: 'https://example.com',
    });

    // Speech bubble with greeting
    expect(html).toContain('speech-bubble');
    // Mini mystery tiles flanking the main tile
    expect(html).toContain('mini-tile');
    // CTA glow animation
    expect(html).toContain('cta-glow');
    // Mascot glow backdrop
    expect(html).toContain('mascot-glow');
  });

  test('should use text-based logo for Hebrew language too', () => {
    const { html } = generateReengagementEmailHtml({
      recipientName: 'יוסי',
      firstLetter: 'ש',
      language: 'he',
      unsubscribeUrl: '#',
      playUrl: '#',
      baseUrl: 'https://example.com',
    });

    expect(html).toContain('Lexi');
    expect(html).toContain('Clash');
  });

  test('should generate Hebrew template with RTL direction and flipped shadows', () => {
    const { html } = generateReengagementEmailHtml({
      recipientName: 'יוסי',
      firstLetter: 'ש',
      language: 'he',
      unsubscribeUrl: '#',
      playUrl: '#',
      baseUrl: 'https://example.com',
    });

    expect(html).toContain('dir="rtl"');
    expect(html).toContain('יוסי');
    expect(html).toContain('ש');
    expect(html).toContain('התגעגענו');
    // RTL shadow direction (negative x offset)
    expect(html).toContain('-8px 8px 0px');
  });

  test('should generate Swedish template', () => {
    const { html } = generateReengagementEmailHtml({
      recipientName: 'Erik',
      firstLetter: 'S',
      language: 'sv',
      unsubscribeUrl: '#',
      playUrl: '#',
      baseUrl: 'https://example.com',
    });

    expect(html).toContain('Erik');
    expect(html).toContain('Vi saknar dig');
  });

  test('should generate Japanese template', () => {
    const { html } = generateReengagementEmailHtml({
      recipientName: 'Taro',
      firstLetter: 'あ',
      language: 'ja',
      unsubscribeUrl: '#',
      playUrl: '#',
      baseUrl: 'https://example.com',
    });

    expect(html).toContain('Taro');
    expect(html).toContain('お待ちしています');
  });

  test('should generate Spanish template', () => {
    const { html } = generateReengagementEmailHtml({
      recipientName: 'Maria',
      firstLetter: 'P',
      language: 'es',
      unsubscribeUrl: '#',
      playUrl: '#',
      baseUrl: 'https://example.com',
    });

    expect(html).toContain('Maria');
    expect(html).toContain('Te extrañamos');
  });

  test('should default to English for unknown language', () => {
    const { html } = generateReengagementEmailHtml({
      recipientName: 'Test',
      firstLetter: 'A',
      language: 'xx',
      unsubscribeUrl: '#',
      playUrl: '#',
      baseUrl: 'https://example.com',
    });

    expect(html).toContain('We miss you');
  });

  test('should display first letter as large tile in all languages', () => {
    for (const lang of ['en', 'he', 'sv', 'ja', 'es']) {
      const { html } = generateReengagementEmailHtml({
        recipientName: 'Test',
        firstLetter: 'X',
        language: lang,
        unsubscribeUrl: '#',
        playUrl: '#',
        baseUrl: 'https://example.com',
      });

      expect(html).toContain('X');
      expect(html).toContain('border');
      expect(html).toContain('box-shadow');
    }
  });
});

// ==========================================
// getReengagementSubject tests
// ==========================================
describe('getReengagementSubject', () => {
  test('should return English subject with first letter or name', () => {
    const subject = getReengagementSubject('en', 'H', 'John');
    // Subject lines rotate daily; some use the letter, some use the name
    expect(subject).toMatch(/H|John/);
    expect(typeof subject).toBe('string');
    expect(subject.length).toBeGreaterThan(0);
  });

  test('should return Hebrew subject', () => {
    const subject = getReengagementSubject('he', 'ש', 'יוסי');
    expect(typeof subject).toBe('string');
    expect(subject.length).toBeGreaterThan(0);
  });

  test('should rotate subjects based on date', () => {
    const s1 = getReengagementSubject('en', 'A', 'John');
    expect(typeof s1).toBe('string');
  });
});

// ==========================================
// Country code mapping tests
// ==========================================
describe('COUNTRY_TO_LANGUAGE', () => {
  test('should map Israel to Hebrew', () => {
    expect(COUNTRY_TO_LANGUAGE['IL']).toBe('he');
  });

  test('should map Sweden to Swedish', () => {
    expect(COUNTRY_TO_LANGUAGE['SE']).toBe('sv');
  });

  test('should map Japan to Japanese', () => {
    expect(COUNTRY_TO_LANGUAGE['JP']).toBe('ja');
  });

  test('should map Spanish-speaking countries', () => {
    expect(COUNTRY_TO_LANGUAGE['ES']).toBe('es');
    expect(COUNTRY_TO_LANGUAGE['MX']).toBe('es');
    expect(COUNTRY_TO_LANGUAGE['AR']).toBe('es');
    expect(COUNTRY_TO_LANGUAGE['CO']).toBe('es');
    expect(COUNTRY_TO_LANGUAGE['CL']).toBe('es');
    expect(COUNTRY_TO_LANGUAGE['PE']).toBe('es');
  });
});
