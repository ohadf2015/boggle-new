/**
 * Tests for Imagen Client
 * Specifically testing retry logic for 429 Resource Exhausted errors
 */

import { generateChallengeImage } from '../imagenClient';

// Mock dependencies
jest.mock('@google-cloud/vertexai');
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

jest.mock('../../redisClient', () => ({
  getRedisClient: jest.fn(() => ({
    setex: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
  })),
}));

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

// Track mock calls for generateContent
const mockGenerateContent = jest.fn();

jest.mock('@google-cloud/vertexai', () => ({
  VertexAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

describe('Imagen Client - Retry Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock environment variables
    process.env.GOOGLE_CREDENTIALS_JSON = JSON.stringify({
      project_id: 'test-project',
      private_key: 'test-key',
      client_email: 'test@test.com',
    });
    process.env.GOOGLE_CLOUD_LOCATION = 'global';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockSuccessResponse = {
    response: {
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  data: Buffer.from('test-image-data').toString('base64'),
                },
              },
            ],
          },
        },
      ],
    },
  };

  it('should succeed on first attempt when no errors', async () => {
    mockGenerateContent.mockResolvedValueOnce(mockSuccessResponse);

    const resultPromise = generateChallengeImage('test topic', 'technology', 'en');

    // Run all pending timers and microtasks
    await jest.runAllTimersAsync();

    const result = await resultPromise;

    expect(result.url).toBe('https://storage.test.com/test-image.webp');
    expect(result.category).toBe('technology');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('should retry on 429 Resource Exhausted error with exponential backoff', async () => {
    const error429 = new Error('429 Resource Exhausted: Quota exceeded');

    // Fail first 2 attempts, succeed on third
    mockGenerateContent
      .mockRejectedValueOnce(error429)
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce(mockSuccessResponse);

    const resultPromise = generateChallengeImage('test topic', 'technology', 'en');

    // Run all timers to complete retries
    await jest.runAllTimersAsync();

    const result = await resultPromise;

    expect(result.url).toBe('https://storage.test.com/test-image.webp');
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
  });

  it('should retry on quota error variants', async () => {
    const quotaError = new Error('quota limit reached for image generation');

    mockGenerateContent
      .mockRejectedValueOnce(quotaError)
      .mockResolvedValueOnce(mockSuccessResponse);

    const resultPromise = generateChallengeImage('test topic', 'sports', 'en');

    await jest.runAllTimersAsync();

    const result = await resultPromise;

    expect(result.url).toBe('https://storage.test.com/test-image.webp');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('should retry on rate limit errors', async () => {
    const rateLimitError = new Error('rate limit exceeded');

    mockGenerateContent
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce(mockSuccessResponse);

    const resultPromise = generateChallengeImage('test topic', 'finance', 'en');

    await jest.runAllTimersAsync();

    const result = await resultPromise;

    expect(result.url).toBe('https://storage.test.com/test-image.webp');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('should throw non-retryable errors immediately', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Invalid API key'));

    await jest.runAllTimersAsync();

    await expect(generateChallengeImage('test topic', 'technology', 'en')).rejects.toThrow('Invalid API key');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('should throw after max retries exceeded', async () => {
    // Fail all 6 attempts (initial + 5 retries)
    const errorMsg = '429 Resource Exhausted';
    mockGenerateContent.mockImplementation(async () => {
      throw new Error(errorMsg);
    });

    let caughtError: Error | null = null;

    // Start the image generation
    const resultPromise = generateChallengeImage('test topic', 'technology', 'en').catch((err) => {
      caughtError = err;
    });

    // Run timers incrementally to allow all retries to happen
    for (let i = 0; i < 10; i++) {
      await jest.advanceTimersByTimeAsync(35000);
    }

    await resultPromise;

    // Verify error was thrown after retries
    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toBe(errorMsg);
    // Initial attempt + 5 retries = 6 calls
    expect(mockGenerateContent).toHaveBeenCalledTimes(6);
  });

  it('should use Imagen 4 model by default', async () => {
    // Clear the env var to test default
    delete process.env.VERTEX_AI_IMAGE_MODEL;

    mockGenerateContent.mockResolvedValueOnce(mockSuccessResponse);

    const resultPromise = generateChallengeImage('test topic', 'entertainment', 'en');

    await jest.runAllTimersAsync();

    await resultPromise;

    // Verify the model was requested (VertexAI constructor is mocked)
    const { VertexAI } = require('@google-cloud/vertexai');
    const vertexInstance = VertexAI.mock.results[0].value;
    expect(vertexInstance.getGenerativeModel).toHaveBeenCalledWith({
      model: 'imagen-4.0-generate-001',
    });
  });

  it('should use global endpoint by default', async () => {
    // Clear the env var to test default
    delete process.env.GOOGLE_CLOUD_LOCATION;

    mockGenerateContent.mockResolvedValueOnce(mockSuccessResponse);

    const resultPromise = generateChallengeImage('test topic', 'weather', 'en');

    await jest.runAllTimersAsync();

    await resultPromise;

    // Verify global location was used
    const { VertexAI } = require('@google-cloud/vertexai');
    expect(VertexAI).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'global',
      })
    );
  });

  it('should return correct cost for Imagen 4', async () => {
    mockGenerateContent.mockResolvedValueOnce(mockSuccessResponse);

    const resultPromise = generateChallengeImage('test topic', 'technology', 'en');

    await jest.runAllTimersAsync();

    const result = await resultPromise;

    // Imagen 4 cost is $0.04
    expect(result.cost).toBe(0.04);
  });
});
