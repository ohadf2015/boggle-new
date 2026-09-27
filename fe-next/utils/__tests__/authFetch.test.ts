/**
 * Tests for fetchWithAuth utility
 *
 * Verifies automatic token refresh and retry logic
 */

// Simple Response mock for testing (jsdom doesn't include fetch API)
class MockResponse {
  status: number;
  statusText: string;
  ok: boolean;
  headers: Headers;
  body: string;

  constructor(body: string, init: { status?: number; statusText?: string; headers?: Record<string, string> } = {}) {
    this.body = body;
    this.status = init.status ?? 200;
    this.statusText = init.statusText ?? '';
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Headers(init.headers || {});
  }

  async json() {
    return JSON.parse(this.body);
  }

  async text() {
    return this.body;
  }
}

// Set as global Response for tests
global.Response = MockResponse as any;


// Mock the supabase module with factory function
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      refreshSession: vi.fn(),
    },
  },
}));

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    log: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks are set up
import {
  fetchWithAuth,
  getWithAuth,
  postWithAuth,
  putWithAuth,
  deleteWithAuth,
} from '../authFetch';
import { supabase } from '@/lib/supabase';

describe('fetchWithAuth', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
  });

  describe('successful requests', () => {
    it('should add Authorization header and return response', async () => {
      const mockSession = {
        access_token: 'valid-token-123',
        refresh_token: 'refresh-token-123',
      };

      (supabase!.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      } as any);

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const response = await fetchWithAuth('/api/test');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      );

      const callHeaders = (global.fetch as jest.Mock).mock.calls[0][1].headers;
      expect(callHeaders.get('Authorization')).toBe('Bearer valid-token-123');
      expect(response.status).toBe(200);
    });

    it('should not override existing Authorization header', async () => {
      const mockSession = {
        access_token: 'valid-token-123',
        refresh_token: 'refresh-token-123',
      };

      (supabase!.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
      } as any);

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await fetchWithAuth('/api/test', {
        headers: { Authorization: 'Bearer custom-token' },
      });

      const callHeaders = (global.fetch as jest.Mock).mock.calls[0][1].headers;
      expect(callHeaders.get('Authorization')).toBe('Bearer custom-token');
    });
  });

  describe('401 handling and token refresh', () => {
    it('should refresh token and retry on 401 response', async () => {
      const mockSession = {
        access_token: 'expired-token',
        refresh_token: 'refresh-token',
      };

      const mockRefreshedSession = {
        access_token: 'fresh-token-456',
        refresh_token: 'new-refresh-token',
      };

      (supabase!.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (supabase!.auth.refreshSession as jest.Mock).mockResolvedValue({
        data: { session: mockRefreshedSession },
        error: null,
      });

      // First call returns 401, second call returns 200
      const mockResponse401 = new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      } as any);

      const mockResponse200 = new Response(JSON.stringify({ success: true }), {
        status: 200,
      } as any);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockResponse401)
        .mockResolvedValueOnce(mockResponse200);

      const response = await fetchWithAuth('/api/test');

      // Should have called fetch twice (initial + retry)
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // First call with expired token
      const firstCallHeaders = (global.fetch as jest.Mock).mock.calls[0][1].headers;
      expect(firstCallHeaders.get('Authorization')).toBe('Bearer expired-token');

      // Second call with fresh token
      const secondCallHeaders = (global.fetch as jest.Mock).mock.calls[1][1].headers;
      expect(secondCallHeaders.get('Authorization')).toBe('Bearer fresh-token-456');

      expect((supabase!.auth.refreshSession as jest.Mock)).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
    });

    it('should return original 401 if refresh fails', async () => {
      const mockSession = {
        access_token: 'expired-token',
        refresh_token: 'refresh-token',
      };

      (supabase!.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (supabase!.auth.refreshSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: { message: 'Refresh token expired' },
      });

      const mockResponse401 = new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      } as any);

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse401);

      const response = await fetchWithAuth('/api/test');

      // Should only call fetch once (no retry)
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect((supabase!.auth.refreshSession as jest.Mock)).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(401);
    });

    it('should not retry if skipAuthRefresh is true', async () => {
      const mockSession = {
        access_token: 'expired-token',
        refresh_token: 'refresh-token',
      };

      (supabase!.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const mockResponse401 = new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      } as any);

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse401);

      const response = await fetchWithAuth('/api/test', {
        skipAuthRefresh: true,
      });

      // Should only call fetch once (no retry)
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect((supabase!.auth.refreshSession as jest.Mock)).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });
  });

  describe('edge cases', () => {
    it('should handle missing session gracefully', async () => {
      (supabase!.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
      } as any);

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const response = await fetchWithAuth('/api/test');

      // Should make unauthenticated request
      expect(global.fetch).toHaveBeenCalledWith('/api/test', {});
      expect(response.status).toBe(200);
    });

    it('should handle session error gracefully', async () => {
      (supabase!.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' },
      });

      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
      } as any);

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const response = await fetchWithAuth('/api/test');

      // Should make unauthenticated request
      expect(global.fetch).toHaveBeenCalledWith('/api/test', {});
      expect(response.status).toBe(200);
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      const mockSession = {
        access_token: 'valid-token',
        refresh_token: 'refresh-token',
      };

      (supabase!.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
      } as any);

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
    });

    it('getWithAuth should make GET request', async () => {
      await getWithAuth('/api/test');

      const callOptions = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.method).toBe('GET');
    });

    it('postWithAuth should make POST request with JSON body', async () => {
      await postWithAuth('/api/test', { foo: 'bar' });

      const callOptions = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.method).toBe('POST');
      expect(callOptions.body).toBe(JSON.stringify({ foo: 'bar' }));
      expect(callOptions.headers.get('Content-Type')).toBe('application/json');
    });

    it('putWithAuth should make PUT request with JSON body', async () => {
      await putWithAuth('/api/test', { foo: 'bar' });

      const callOptions = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.method).toBe('PUT');
      expect(callOptions.body).toBe(JSON.stringify({ foo: 'bar' }));
      expect(callOptions.headers.get('Content-Type')).toBe('application/json');
    });

    it('deleteWithAuth should make DELETE request', async () => {
      await deleteWithAuth('/api/test');

      const callOptions = (global.fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.method).toBe('DELETE');
    });
  });
});
