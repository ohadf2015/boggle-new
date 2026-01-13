/**
 * Google Vertex AI Imagen Client for Abstract Concept Images
 * Generates neo-brutalist style images that show concepts WITHOUT revealing actual words
 *
 * IMPORTANT: Imagen models use the :predict REST API endpoint, NOT the
 * generateContent API used by Gemini text models.
 */

import { GoogleAuth } from 'google-auth-library';
import sharp from 'sharp';
import { getRedisClient } from '../redisClient';

interface ImageGenerationResult {
  url: string;
  prompt: string;
  category: string;
  cost: number;
}

interface CachedImage {
  url: string;
  times_reused: number;
}

// Cost tracking
const IMAGEN_4_COST = 0.04; // $0.04 per image (Imagen 4)
const CACHE_TTL = 86400; // 24 hours in seconds
const REDIS_IMAGE_PREFIX = 'buzz:image:';

// Retry configuration for 429 Resource Exhausted errors
const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelayMs: 1000, // Start at 1 second
  maxDelayMs: 32000, // Cap at 32 seconds
  backoffMultiplier: 2, // Double each retry
};

// Neo-brutalist color palette
const COLOR_MAP: Record<string, string> = {
  sports: '#FF6B35', // neo-orange
  finance: '#FFE135', // neo-yellow
  entertainment: '#FF1493', // neo-pink
  technology: '#00FFFF', // neo-cyan
  weather: '#00FFFF', // neo-cyan
  politics: '#1a1a2e', // neo-navy
  general: '#FFE135', // neo-yellow (default)
};

const MOOD_MAP: Record<string, string> = {
  sports: 'energetic and dynamic',
  finance: 'bold and confident',
  entertainment: 'playful and exciting',
  technology: 'modern and sleek',
  weather: 'dramatic and atmospheric',
  politics: 'serious and structured',
  general: 'engaging and vibrant',
};

interface GoogleCredentials {
  project_id: string;
  private_key: string;
  client_email: string;
}

/**
 * Get Vertex AI credentials from environment (shared approach with buzzGenerator)
 */
function getVertexAICredentials(): GoogleCredentials & { location: string } {
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
  if (!credentialsJson) {
    throw new Error('GOOGLE_CREDENTIALS_JSON environment variable is not set');
  }

  const credentials = JSON.parse(credentialsJson) as GoogleCredentials;

  // Handle escaped newlines in private_key
  if (credentials.private_key?.includes('\\n')) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }

  return {
    ...credentials,
    // Use global endpoint for maximum capacity and availability
    location: process.env.GCP_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
  };
}

/**
 * Get Google Auth client for Imagen API calls
 */
function getGoogleAuthClient(): GoogleAuth {
  const credentials = getVertexAICredentials();

  return new GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    projectId: credentials.project_id,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
}

/**
 * Get access token for Imagen API
 */
async function getAccessToken(): Promise<string> {
  const auth = getGoogleAuthClient();
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();

  if (!tokenResponse.token) {
    throw new Error('Failed to get Google Cloud access token');
  }

  return tokenResponse.token;
}

/**
 * Get Supabase client for storage operations
 */
async function getSupabaseClient() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Build neo-brutalist image prompt that shows ABSTRACT concepts only
 * CRITICAL: Images must NOT reveal the actual words from the challenge
 */
function buildImagePrompt(
  topic: string,
  category: string,
  _language: string
): string {
  const primaryColor = COLOR_MAP[category] || COLOR_MAP.general;
  const mood = MOOD_MAP[category] || MOOD_MAP.general;

  // Extract abstract concept from topic (remove specific names/words)
  // For example: "Bitcoin $150K" → "cryptocurrency concept", "Oscars 2026" → "awards ceremony concept"
  const abstractConcept = extractAbstractConcept(topic, category);

  return `Create a neo-brutalist graphic illustration representing the ABSTRACT CONCEPT of ${abstractConcept}.

CRITICAL CONSTRAINT: This is for a word game puzzle. The image must show the GENERAL CONCEPT ONLY, without revealing any specific words, names, or text. Show the essence or theme, not literal representations.

Visual Style:
- Neo-brutalist aesthetic with BOLD geometric shapes
- Flat design with NO gradients, NO shadows on main elements
- Hard black borders (4px thick) around major shapes
- Primary color: ${primaryColor}
- Maximum 3 colors total (primary + black + white)
- Chunky, angular shapes and forms
- Asymmetric composition
- Clean negative space
- Icon-style illustration

Mood: ${mood}

Technical Specs:
- Square format (1024×1024px)
- Abstract, symbolic representation
- Simple, recognizable silhouettes
- NO text, NO words, NO letters
- NO photorealistic elements
- NO specific brand logos or identifiable marks
- Focus on shapes, symbols, and geometric forms

Example abstraction:
- If topic is about sports → generic sports equipment shapes
- If topic is about weather → geometric weather symbols
- If topic is about entertainment → abstract stage/screen shapes
- If topic is about technology → circuit-like patterns

Remember: This image should evoke the concept without revealing the specific words players need to find.`;
}

/**
 * Extract abstract concept from trending topic
 * This ensures we don't reveal specific words that might be in the puzzle
 */
function extractAbstractConcept(topic: string, category: string): string {
  // Map topic to abstract concepts based on category
  const lowercaseTopic = topic.toLowerCase();

  // Sports abstractions
  if (category === 'sports') {
    if (lowercaseTopic.includes('championship') || lowercaseTopic.includes('finals')) {
      return 'championship competition';
    }
    if (lowercaseTopic.includes('olympics') || lowercaseTopic.includes('games')) {
      return 'international sports event';
    }
    return 'athletic competition';
  }

  // Finance abstractions
  if (category === 'finance') {
    if (lowercaseTopic.includes('crypto') || lowercaseTopic.includes('bitcoin')) {
      return 'digital currency';
    }
    if (lowercaseTopic.includes('stock') || lowercaseTopic.includes('market')) {
      return 'financial markets';
    }
    return 'economic trends';
  }

  // Entertainment abstractions
  if (category === 'entertainment') {
    if (lowercaseTopic.includes('awards') || lowercaseTopic.includes('oscars') || lowercaseTopic.includes('grammy')) {
      return 'awards ceremony';
    }
    if (lowercaseTopic.includes('movie') || lowercaseTopic.includes('film')) {
      return 'cinema and film';
    }
    if (lowercaseTopic.includes('music') || lowercaseTopic.includes('concert')) {
      return 'musical performance';
    }
    return 'entertainment event';
  }

  // Technology abstractions
  if (category === 'technology') {
    if (lowercaseTopic.includes('ai') || lowercaseTopic.includes('artificial intelligence')) {
      return 'artificial intelligence';
    }
    if (lowercaseTopic.includes('smartphone') || lowercaseTopic.includes('phone')) {
      return 'mobile technology';
    }
    return 'technology innovation';
  }

  // Weather abstractions
  if (category === 'weather') {
    if (lowercaseTopic.includes('storm') || lowercaseTopic.includes('hurricane')) {
      return 'severe weather';
    }
    if (lowercaseTopic.includes('heat') || lowercaseTopic.includes('temperature')) {
      return 'weather conditions';
    }
    return 'weather patterns';
  }

  // Politics abstractions
  if (category === 'politics') {
    if (lowercaseTopic.includes('election') || lowercaseTopic.includes('vote')) {
      return 'democratic process';
    }
    if (lowercaseTopic.includes('summit') || lowercaseTopic.includes('meeting')) {
      return 'political gathering';
    }
    return 'political event';
  }

  // General fallback - extract core concept
  return `${category} topic`;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is a retryable 429 Resource Exhausted error
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('429') ||
      message.includes('resource exhausted') ||
      message.includes('quota') ||
      message.includes('rate limit')
    );
  }
  return false;
}

/**
 * Build Imagen API endpoint URL
 */
function getImagenApiUrl(): string {
  const credentials = getVertexAICredentials();
  const model = process.env.VERTEX_AI_IMAGE_MODEL || 'imagen-4.0-generate-001';

  // Imagen uses the :predict endpoint, NOT generateContent
  // https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api
  return `https://${credentials.location}-aiplatform.googleapis.com/v1/projects/${credentials.project_id}/locations/${credentials.location}/publishers/google/models/${model}:predict`;
}

/**
 * Call Imagen API with proper REST endpoint
 */
async function callImagenApi(prompt: string): Promise<Buffer> {
  const url = getImagenApiUrl();
  const accessToken = await getAccessToken();

  const requestBody = {
    instances: [
      {
        prompt,
      },
    ],
    parameters: {
      sampleCount: 1,
      aspectRatio: '1:1',
      addWatermark: false, // We add our own neo-brutalist styling
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();

    // Check if we got HTML (error page) instead of JSON
    if (errorText.startsWith('<!DOCTYPE') || errorText.startsWith('<html')) {
      throw new Error(`Imagen API returned HTML error page (status ${response.status}). This usually means the model or endpoint is incorrect.`);
    }

    // Try to parse as JSON error
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(`Imagen API error: ${errorJson.error?.message || response.statusText}`);
    } catch {
      throw new Error(`Imagen API error (${response.status}): ${errorText.substring(0, 200)}`);
    }
  }

  const data = await response.json();

  // Imagen API returns predictions array with bytesBase64Encoded
  const prediction = data.predictions?.[0];
  if (!prediction?.bytesBase64Encoded) {
    throw new Error('No image data returned from Imagen API');
  }

  return Buffer.from(prediction.bytesBase64Encoded, 'base64');
}

/**
 * Generate challenge image using Google Vertex AI Imagen 4
 * Returns Supabase Storage public URL
 * Includes retry mechanism with exponential backoff for 429 errors
 *
 * IMPORTANT: Uses the Imagen :predict REST API, not the generateContent API
 * which is only for Gemini text models.
 */
export async function generateChallengeImage(
  trendingTopic: string,
  category: string,
  language: string
): Promise<ImageGenerationResult> {
  console.log(`[IMAGEN] Generating image for topic: ${trendingTopic}, category: ${category}`);

  // Build abstract prompt
  const prompt = buildImagePrompt(trendingTopic, category, language);

  let lastError: Error | null = null;
  let delayMs = RETRY_CONFIG.initialDelayMs;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[IMAGEN] Retry attempt ${attempt}/${RETRY_CONFIG.maxRetries} after ${delayMs}ms delay`);
        await sleep(delayMs);
      }

      // Call Imagen API with proper :predict endpoint
      const rawImageBuffer = await callImagenApi(prompt);

      // Post-process image with Sharp (add neo-brutalist effects)
      const processedImage = await postProcessImage(rawImageBuffer, category);

      // Upload to Supabase Storage
      const imageUrl = await uploadToSupabase(processedImage, trendingTopic);

      // Cache image for reuse
      await cacheImage(trendingTopic, category, imageUrl, prompt);

      console.log(`[IMAGEN] Image generated and uploaded: ${imageUrl}`);

      return {
        url: imageUrl,
        prompt,
        category,
        cost: IMAGEN_4_COST,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      lastError = error instanceof Error ? error : new Error(errorMessage);

      if (isRetryableError(error) && attempt < RETRY_CONFIG.maxRetries) {
        console.warn(`[IMAGEN] Retryable error (attempt ${attempt + 1}): ${errorMessage}`);
        // Exponential backoff with cap
        delayMs = Math.min(delayMs * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelayMs);
      } else {
        console.error('[IMAGEN] Error generating image:', errorMessage);
        throw lastError;
      }
    }
  }

  // Should not reach here, but TypeScript needs this
  throw lastError || new Error('Max retries exceeded for image generation');
}

/**
 * Post-process image with Sharp for neo-brutalist styling
 */
async function postProcessImage(
  imageBuffer: Buffer,
  _category: string
): Promise<Buffer> {
  try {
    let img = sharp(imageBuffer);

    // 1. Ensure square format and resize if needed
    const metadata = await img.metadata();
    if (metadata.width !== 1024 || metadata.height !== 1024) {
      img = img.resize(1024, 1024, {
        fit: 'cover',
        position: 'center',
      });
    }

    // 2. Add hard shadow border (neo-brutalist signature)
    const withBorder = await addHardShadowBorder(img);

    // 3. Add halftone texture overlay (subtle)
    const withTexture = await addHalftoneOverlay(withBorder);

    // 4. Boost saturation for bold neo-brutalist look
    const enhanced = sharp(withTexture).modulate({
      saturation: 1.2,
      brightness: 1.05,
    });

    // 5. Compress to WebP for efficiency
    return enhanced
      .webp({ quality: 90 })
      .toBuffer();
  } catch (error: any) {
    console.error('[IMAGEN] Error post-processing image:', error.message);
    // Return original if post-processing fails
    return imageBuffer;
  }
}

/**
 * Add hard shadow border effect (4px black border + 8px offset shadow)
 */
async function addHardShadowBorder(img: sharp.Sharp): Promise<Buffer> {
  const metadata = await img.metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;

  // Create SVG for border and shadow
  const shadowOffset = 8;
  const borderWidth = 4;

  const svgBorder = `
    <svg width="${width + shadowOffset}" height="${height + shadowOffset}">
      <!-- Shadow (black rectangle offset) -->
      <rect x="${shadowOffset}" y="${shadowOffset}"
            width="${width}" height="${height}"
            fill="black" />

      <!-- White background -->
      <rect x="0" y="0"
            width="${width}" height="${height}"
            fill="white" />

      <!-- Black border -->
      <rect x="0" y="0"
            width="${width}" height="${height}"
            fill="none"
            stroke="black"
            stroke-width="${borderWidth}" />
    </svg>
  `;

  // Extend canvas to accommodate shadow
  const extended = await img
    .extend({
      top: 0,
      bottom: shadowOffset,
      left: 0,
      right: shadowOffset,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .toBuffer();

  // Composite image over border/shadow
  return sharp(Buffer.from(svgBorder))
    .composite([{
      input: extended,
      top: borderWidth,
      left: borderWidth,
    }])
    .toBuffer();
}

/**
 * Add subtle halftone dot pattern overlay
 */
async function addHalftoneOverlay(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Create simple dot pattern (32x32 repeated)
    const dotSize = 2;
    const spacing = 8;
    const patternSize = 32;

    const dots: { left: number; top: number }[] = [];
    for (let y = spacing / 2; y < patternSize; y += spacing) {
      for (let x = spacing / 2; x < patternSize; x += spacing) {
        dots.push({ left: Math.floor(x), top: Math.floor(y) });
      }
    }

    // Create SVG pattern
    const svgPattern = `
      <svg width="${patternSize}" height="${patternSize}">
        ${dots
          .map(
            (dot) =>
              `<circle cx="${dot.left}" cy="${dot.top}" r="${dotSize}" fill="black" opacity="0.15"/>`
          )
          .join('')}
      </svg>
    `;

    const patternBuffer = Buffer.from(svgPattern);

    // Tile pattern across image
    const img = sharp(imageBuffer);
    const metadata = await img.metadata();

    // Create tiled pattern
    const tiledPattern = await sharp(patternBuffer)
      .resize(metadata.width, metadata.height, {
        fit: 'cover',
        kernel: 'nearest', // Crisp edges for dots
      })
      .toBuffer();

    // Composite pattern over image with reduced opacity
    return img
      .composite([{
        input: tiledPattern,
        blend: 'overlay',
      }])
      .toBuffer();
  } catch (error: any) {
    console.error('[IMAGEN] Error adding halftone overlay:', error.message);
    // Return original if overlay fails
    return imageBuffer;
  }
}

/**
 * Upload processed image to Supabase Storage
 */
async function uploadToSupabase(
  imageBuffer: Buffer,
  topic: string
): Promise<string> {
  const supabase = await getSupabaseClient();

  // Create filename from topic (sanitized)
  const timestamp = Date.now();
  const sanitizedTopic = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
  const fileName = `buzz/${timestamp}-${sanitizedTopic}.webp`;

  // Upload to Supabase Storage
  const { error } = await supabase.storage
    .from('daily-challenges')
    .upload(fileName, imageBuffer, {
      contentType: 'image/webp',
      cacheControl: '86400', // 24h cache
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('daily-challenges')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

/**
 * Cache image URL in Redis and database for reuse
 */
async function cacheImage(
  topic: string,
  category: string,
  url: string,
  prompt: string
): Promise<void> {
  const cacheKey = `${REDIS_IMAGE_PREFIX}${topic}`;

  // Cache in Redis (24h)
  const redis = getRedisClient();
  if (redis) {
    await redis.setex(
      cacheKey,
      CACHE_TTL,
      JSON.stringify({ url, times_reused: 1 })
    );
  }

  // Store in database for long-term reuse
  try {
    const supabase = await getSupabaseClient();
    await supabase.from('buzz_image_cache').upsert(
      {
        trending_topic: topic,
        category,
        image_url: url,
        image_prompt: prompt,
        first_used_date: new Date().toISOString().split('T')[0],
        last_used_date: new Date().toISOString().split('T')[0],
        times_reused: 1,
      },
      {
        onConflict: 'trending_topic,category',
      }
    );
  } catch (error: any) {
    console.error('[IMAGEN] Failed to cache in database:', error.message);
    // Non-critical error, continue
  }
}

/**
 * Check if image exists in cache for reuse
 */
export async function checkImageCache(topic: string): Promise<CachedImage | null> {
  const cacheKey = `${REDIS_IMAGE_PREFIX}${topic}`;

  // Check Redis first
  const redis = getRedisClient();
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`[IMAGEN] Using cached image for: ${topic}`);
      return JSON.parse(cached);
    }
  }

  // Check database
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from('buzz_image_cache')
      .select('image_url, times_reused')
      .eq('trending_topic', topic)
      .single();

    if (!error && data) {
      const result: CachedImage = {
        url: data.image_url,
        times_reused: data.times_reused,
      };

      // Update reuse count
      await supabase
        .from('buzz_image_cache')
        .update({
          times_reused: data.times_reused + 1,
          last_used_date: new Date().toISOString().split('T')[0],
        })
        .eq('trending_topic', topic);

      // Cache in Redis
      if (redis) {
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
      }

      return result;
    }
  } catch (error: any) {
    console.error('[IMAGEN] Error checking database cache:', error.message);
  }

  return null;
}

/**
 * Categorize trending topic for appropriate visual style
 */
export function categorizeTopic(topic: string): string {
  const lowercaseTopic = topic.toLowerCase();

  if (
    lowercaseTopic.includes('sport') ||
    lowercaseTopic.includes('game') ||
    lowercaseTopic.includes('championship') ||
    lowercaseTopic.includes('olympics') ||
    lowercaseTopic.includes('world cup')
  ) {
    return 'sports';
  }

  if (
    lowercaseTopic.includes('bitcoin') ||
    lowercaseTopic.includes('crypto') ||
    lowercaseTopic.includes('stock') ||
    lowercaseTopic.includes('market') ||
    lowercaseTopic.includes('economy')
  ) {
    return 'finance';
  }

  if (
    lowercaseTopic.includes('movie') ||
    lowercaseTopic.includes('film') ||
    lowercaseTopic.includes('music') ||
    lowercaseTopic.includes('concert') ||
    lowercaseTopic.includes('awards') ||
    lowercaseTopic.includes('oscars') ||
    lowercaseTopic.includes('grammy')
  ) {
    return 'entertainment';
  }

  if (
    lowercaseTopic.includes('tech') ||
    lowercaseTopic.includes('ai') ||
    lowercaseTopic.includes('smartphone') ||
    lowercaseTopic.includes('software') ||
    lowercaseTopic.includes('app')
  ) {
    return 'technology';
  }

  if (
    lowercaseTopic.includes('weather') ||
    lowercaseTopic.includes('storm') ||
    lowercaseTopic.includes('hurricane') ||
    lowercaseTopic.includes('temperature') ||
    lowercaseTopic.includes('climate')
  ) {
    return 'weather';
  }

  if (
    lowercaseTopic.includes('election') ||
    lowercaseTopic.includes('politics') ||
    lowercaseTopic.includes('vote') ||
    lowercaseTopic.includes('president') ||
    lowercaseTopic.includes('government')
  ) {
    return 'politics';
  }

  return 'general';
}
