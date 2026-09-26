/**
 * Tests for GET /api/adventure/demo
 * Verifies guest demo board generation without auth or token creation.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the loaders
vi.mock('@/lib/server/dictionarySet', () => ({
  loadWordChecker: vi.fn(async () => () => true),
}));

vi.mock('@/lib/adventure/play/server', () => ({
  loadPrefixDict: vi.fn(async () => ({
    has: () => true,
    hasPrefix: () => true,
  })),
  adventureLang: vi.fn((lang) => lang || 'en'),
}));

vi.mock('@/lib/adventure/play/commonWords', () => ({
  loadCommonWords: vi.fn(async () => ['word', 'test', 'hello']),
}));

vi.mock('@/lib/apiRateLimit', () => ({
  checkApiRateLimit: vi.fn(() => ({ success: true })),
}));

vi.mock('@/utils/utils', () => ({
  generateRandomTable: vi.fn(() => [
    ['a', 'b', 'c', 'd'],
    ['e', 'f', 'g', 'h'],
    ['i', 'j', 'k', 'l'],
    ['m', 'n', 'o', 'p'],
  ]),
}));

vi.mock('@/lib/boardSelection', () => ({
  pickRichestBoardClient: vi.fn((gen) => gen()),
}));

import { GET } from '../route';

describe('GET /api/adventure/demo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns board data without auth', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/api/adventure/demo?language=en'));
    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('grid');
    expect(data).toHaveProperty('level');
    expect(data).toHaveProperty('hints');
    expect(data).toHaveProperty('language', 'en');
    expect(data).toHaveProperty('seconds');

    // Verify no token is returned
    expect(data).not.toHaveProperty('token');
    expect(data).not.toHaveProperty('runToken');
  });

  it('enforces rate limit', async () => {
    const { checkApiRateLimit: mockRateLimit } = await import('@/lib/apiRateLimit');
    vi.mocked(mockRateLimit).mockReturnValueOnce({ success: false });

    const request = new NextRequest(new URL('http://localhost:3000/api/adventure/demo'));
    const response = await GET(request);
    expect(response.status).toBe(429);
  });

  it('handles language parameter', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/api/adventure/demo?language=ja'));
    const response = await GET(request);
    const data = await response.json();
    expect(data.language).toBe('ja');
  });

  it('defaults to en language', async () => {
    const request = new NextRequest(new URL('http://localhost:3000/api/adventure/demo'));
    const response = await GET(request);
    const data = await response.json();
    expect(data.language).toBe('en');
  });
});
