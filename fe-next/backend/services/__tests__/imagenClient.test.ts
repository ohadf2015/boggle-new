/**
 * Tests for Imagen Client
 * Tests retry logic for 429 Resource Exhausted errors and proper API endpoint usage
 *
 * IMPORTANT: The Imagen client uses the :predict REST API, NOT generateContent.
 * This was fixed to resolve "Unexpected token '<'" errors when the wrong API was called.
 */

import { generateChallengeImage } from '../imagenClient';

// Mock sharp for image processing
jest.mock('sharp', () => {
  const mockSharp = jest.fn().mockReturnValue({
    metadata: jest.fn().mockResolvedValue({ width: 1024, height: 1024 }),
    resize: jest.fn().mockReturnThis(),
    extend: jest.fn().mockReturnThis(),
    composite: jest.fn().mockReturnThis(),
    modulate: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('test-image')),
  });
  return mockSharp;
});

// Mock Redis client
jest.mock('../../redisClient', () => ({
  getRedisClient: jest.fn(() => ({
    setex: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
  })),
}));

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://storage.test.com/test-image.webp' },
        })),
      })),
    },
    from: jest.fn(() => ({
      upsert: jest.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

// Mock Google Auth Library
const mockGetAccessToken = jest.fn().mockResolvedValue({ token: 'mock-access-token' });
jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getClient: jest.fn().mockResolvedValue({
      getAccessToken: mockGetAccessToken,
    }),
  })),
}));

// Track fetch calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Imagen Client - Retry Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock environment variables
    process.env.GOOGLE_CREDENTIALS_JSON = JSON.stringify({
      project_id: 'test-project',
      private_key: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
      client_email: 'test@test.iam.gserviceaccount.com',
    });
    process.env.GOOGLE_CLOUD_LOCATION = 'us-central1';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Helper to create successful Imagen API response
  const createSuccessResponse = () => ({
    ok: true,
    json: async () => ({
      predictions: [
        {
          bytesBase64Encoded: Buffer.from('test-image-data').toString('base64'),
          mimeType: 'image/png',
        },
      ],
    }),
  });

  // Helper to create error response
  const createErrorResponse = (status: number, message: string) => ({
    ok: false,
    status,
    text: async () => JSON.stringify({ error: { message } }),
  });

  it('should call Imagen :predict API endpoint, not generateContent', async () => {
    mockFetch.mockResolvedValueOnce(createSuccessResponse());

    const resultPromise = generateChallengeImage('test topic', 'technology', 'en');
    await jest.runAllTimersAsync();
    await resultPromise;

    // Verify fetch was called with :predict endpoint
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];

    expect(url).toContain('aiplatform.googleapis.com');
    expect(url).toContain(':predict');
    expect(url).toContain('imagen');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  it('should succeed on first attempt when no errors', async () => {
    mockFetch.mockResolvedValueOnce(createSuccessResponse());

    const resultPromise = generateChallengeImage('test topic', 'technology', 'en');
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.url).toBe('https://storage.test.com/test-image.webp');
    expect(result.category).toBe('technology');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on 429 Resource Exhausted error with exponential backoff', async () => {
    // Fail first 2 attempts, succeed on third
    mockFetch
      .mockResolvedValueOnce(createErrorResponse(429, '429 Resource Exhausted: Quota exceeded'))
      .mockResolvedValueOnce(createErrorResponse(429, '429 Resource Exhausted: Quota exceeded'))
      .mockResolvedValueOnce(createSuccessResponse());

    const resultPromise = generateChallengeImage('test topic', 'technology', 'en');
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.url).toBe('https://storage.test.com/test-image.webp');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should retry on quota error variants', async () => {
    mockFetch
      .mockResolvedValueOnce(createErrorResponse(429, 'quota limit reached'))
      .mockResolvedValueOnce(createSuccessResponse());

    const resultPromise = generateChallengeImage('test topic', 'sports', 'en');
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.url).toBe('https://storage.test.com/test-image.webp');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should retry on rate limit errors', async () => {
    mockFetch
      .mockResolvedValueOnce(createErrorResponse(429, 'rate limit exceeded'))
      .mockResolvedValueOnce(createSuccessResponse());

    const resultPromise = generateChallengeImage('test topic', 'finance', 'en');
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.url).toBe('https://storage.test.com/test-image.webp');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should throw non-retryable errors immediately', async () => {
    mockFetch.mockResolvedValueOnce(createErrorResponse(401, 'Invalid API key'));

    await jest.runAllTimersAsync();

    await expect(generateChallengeImage('test topic', 'technology', 'en')).rejects.toThrow('Invalid API key');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should throw descriptive error when API returns HTML instead of JSON', async () => {
    // Simulate HTML error page response (the original bug)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => '<!DOCTYPE html><html><body>Not Found</body></html>',
    });

    await jest.runAllTimersAsync();

    await expect(generateChallengeImage('test topic', 'technology', 'en')).rejects.toThrow(
      /HTML error page|model or endpoint is incorrect/i
    );
  });

  it('should throw after max retries exceeded', async () => {
    // Fail all 6 attempts (initial + 5 retries)
    mockFetch.mockResolvedValue(createErrorResponse(429, '429 Resource Exhausted'));

    let caughtError: Error | null = null;

    const resultPromise = generateChallengeImage('test topic', 'technology', 'en').catch((err) => {
      caughtError = err;
    });

    // Run timers incrementally to allow all retries to happen
    for (let i = 0; i < 10; i++) {
      await jest.advanceTimersByTimeAsync(35000);
    }

    await resultPromise;

    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toContain('429');
    // Initial attempt + 5 retries = 6 calls
    expect(mockFetch).toHaveBeenCalledTimes(6);
  });

  it('should use Imagen 4 model by default', async () => {
    delete process.env.VERTEX_AI_IMAGE_MODEL;

    mockFetch.mockResolvedValueOnce(createSuccessResponse());

    const resultPromise = generateChallengeImage('test topic', 'entertainment', 'en');
    await jest.runAllTimersAsync();
    await resultPromise;

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('imagen-4.0-generate-001');
  });

  it('should use configured location in API endpoint', async () => {
    process.env.GOOGLE_CLOUD_LOCATION = 'europe-west1';

    mockFetch.mockResolvedValueOnce(createSuccessResponse());

    const resultPromise = generateChallengeImage('test topic', 'weather', 'en');
    await jest.runAllTimersAsync();
    await resultPromise;

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('europe-west1-aiplatform.googleapis.com');
  });

  it('should return correct cost for Imagen 4', async () => {
    mockFetch.mockResolvedValueOnce(createSuccessResponse());

    const resultPromise = generateChallengeImage('test topic', 'technology', 'en');
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    // Imagen 4 cost is $0.04
    expect(result.cost).toBe(0.04);
  });

  it('should send correct request body to Imagen API', async () => {
    mockFetch.mockResolvedValueOnce(createSuccessResponse());

    const resultPromise = generateChallengeImage('technology trends', 'technology', 'en');
    await jest.runAllTimersAsync();
    await resultPromise;

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.instances).toHaveLength(1);
    expect(body.instances[0].prompt).toBeDefined();
    expect(body.parameters.sampleCount).toBe(1);
    expect(body.parameters.aspectRatio).toBe('1:1');
  });
});
