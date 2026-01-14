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

// Category mood descriptors for image generation
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
 * Build cute animated style image prompt that shows trending topics
 * Shows recognizable, adorable characters/scenes that hint at the news
 * Uses a kawaii-inspired, friendly cartoon aesthetic with LexiClash colors
 */
function buildImagePrompt(
  topic: string,
  category: string,
  _language: string
): string {
  const mood = MOOD_MAP[category] || MOOD_MAP.general;

  // Build a concrete visual scene from the trend
  const visualScene = buildVisualScene(topic, category);

  return `Create a CUTE, CHARMING animated illustration for LexiClash word game.

SUBJECT: ${visualScene}

=== CRITICAL: ADORABLE CARTOON STYLE ===

ART STYLE - "PIXAR MEETS KAWAII":
- Cute, rounded cartoon characters with BIG expressive eyes
- Chibi-style proportions: oversized heads, small bodies, tiny hands
- Soft, friendly expressions - always cheerful and inviting
- Smooth, clean vector-style rendering
- Gentle shading with soft highlights (NOT harsh shadows)
- Rounded corners on EVERYTHING - nothing sharp or angular
- Characters should look huggable and approachable
- Think: Pixar short films, Animal Crossing, Pusheen, LINE Friends

COLOR PALETTE (Bright & Friendly):
- PRIMARY: Sunny Yellow (#FFE135) - warm and cheerful
- SECONDARY: Coral Orange (#FF7F50) - friendly warmth
- ACCENT 1: Bubblegum Pink (#FF69B4) - sweet and playful
- ACCENT 2: Sky Cyan (#87CEEB) - fresh and light
- ACCENT 3: Mint Green (#98FB98) - soft and calming
- BACKGROUND: Soft gradient from light lavender to soft blue
- Subtle pastel tones to complement main colors

VISUAL REQUIREMENTS:
- Central cute character or mascot representing the trend (60-70% of frame)
- Character should have a clear emotion (happy, excited, curious)
- Soft, dreamy background with subtle sparkles or bubbles
- At least one adorable mascot-style element (animal, object with face, etc.)
- Clean composition with clear focal point

CHARACTER GUIDELINES:
- If showing people: chibi-style with round faces, dot eyes, small mouths
- If showing animals: ultra-cute, plump, with expressive features
- If showing objects: give them cute faces and personality
- All characters should look friendly and non-threatening

MOOD: ${mood}, ADORABLE, FRIENDLY, WHOLESOME

ABSOLUTE CONSTRAINTS:
- NO text, NO words, NO letters, NO numbers anywhere
- NO scary, dark, or intimidating elements
- NO realistic human faces
- NO sharp edges or aggressive styling
- Keep it family-friendly and universally appealing

OUTPUT: Square 1024×1024px illustration
The final image should make people smile and feel happy - like a sticker you'd want to collect.`;
}

/**
 * Build a cute, animated visual scene description from the trending topic
 * Creates adorable mascot-style imagery that hints at the topic
 */
function buildVisualScene(topic: string, category: string): string {
  const lowercaseTopic = topic.toLowerCase();

  // Sports - show cute sports mascots
  if (category === 'sports') {
    if (lowercaseTopic.includes('super bowl') || lowercaseTopic.includes('nfl') || lowercaseTopic.includes('football')) {
      return 'An adorable chibi football player mascot with oversized helmet, hugging a cute smiling football, surrounded by confetti and tiny cheerleader animals';
    }
    if (lowercaseTopic.includes('basketball') || lowercaseTopic.includes('nba')) {
      return 'A cute round basketball character with happy face bouncing joyfully, with tiny chibi players cheering around it and sparkles';
    }
    if (lowercaseTopic.includes('soccer') || lowercaseTopic.includes('world cup') || lowercaseTopic.includes('fifa')) {
      return 'An adorable soccer ball mascot with big sparkly eyes and tiny legs, celebrating with cute animal fans waving flags';
    }
    if (lowercaseTopic.includes('tennis') || lowercaseTopic.includes('wimbledon')) {
      return 'A cute fluffy tennis ball character with blushing cheeks and a tiny racket, surrounded by strawberries and cream';
    }
    if (lowercaseTopic.includes('olympics')) {
      return 'Adorable chibi athletes as cute animals (bunny, bear, cat) holding hands around Olympic rings, with sparkles and medals';
    }
    if (lowercaseTopic.includes('golf')) {
      return 'A tiny cute golf ball character with a happy face rolling toward a flag, with fluffy clouds and a rainbow';
    }
    if (lowercaseTopic.includes('boxing') || lowercaseTopic.includes('ufc') || lowercaseTopic.includes('fight')) {
      return 'Two adorable plush toy-style boxers (like teddy bears) playfully sparring with oversized gloves, hearts floating around';
    }
    return 'Cute chibi athletes as adorable animals playing sports together, with confetti, stars, and happy expressions';
  }

  // Finance - show cute money mascots
  if (category === 'finance') {
    if (lowercaseTopic.includes('bitcoin') || lowercaseTopic.includes('crypto') || lowercaseTopic.includes('ethereum')) {
      return 'An adorable golden coin character with sparkly eyes riding a cute rocket ship through stars and rainbow trails';
    }
    if (lowercaseTopic.includes('stock') || lowercaseTopic.includes('market') || lowercaseTopic.includes('dow') || lowercaseTopic.includes('nasdaq')) {
      return 'Cute piggy bank mascot with a happy face next to a smiling chart arrow going up, surrounded by floating coins with faces';
    }
    if (lowercaseTopic.includes('fed') || lowercaseTopic.includes('rate') || lowercaseTopic.includes('inflation')) {
      return 'An adorable owl wearing tiny glasses looking at cute smiling dollar bills, with a cozy library background';
    }
    return 'Happy coin characters with cute faces stacking together, surrounded by sparkles and a cheerful piggy bank';
  }

  // Entertainment - show cute entertainment mascots
  if (category === 'entertainment') {
    if (lowercaseTopic.includes('oscar') || lowercaseTopic.includes('academy award')) {
      return 'An adorable golden Oscar statuette character with big eyes and a shy smile, surrounded by cute star plushies and film reels';
    }
    if (lowercaseTopic.includes('grammy') || lowercaseTopic.includes('music award')) {
      return 'A cute gramophone mascot with musical notes as tiny floating friends, surrounded by chibi musicians and sparkles';
    }
    if (lowercaseTopic.includes('movie') || lowercaseTopic.includes('film') || lowercaseTopic.includes('box office')) {
      return 'Adorable popcorn bucket mascot with happy face watching a cute film reel character, with tiny 3D glasses and stars';
    }
    if (lowercaseTopic.includes('concert') || lowercaseTopic.includes('tour') || lowercaseTopic.includes('album')) {
      return 'A cute microphone character with sparkly eyes singing, surrounded by dancing musical notes and hearts';
    }
    if (lowercaseTopic.includes('streaming') || lowercaseTopic.includes('netflix') || lowercaseTopic.includes('show')) {
      return 'Adorable TV character with a cozy blanket, surrounded by cute snack mascots (popcorn, chips) with happy faces';
    }
    if (lowercaseTopic.includes('game') || lowercaseTopic.includes('video game') || lowercaseTopic.includes('gaming')) {
      return 'A cute game controller character with big eyes, surrounded by pixel heart friends and tiny chibi gamers';
    }
    return 'Adorable stage with cute star mascots performing, surrounded by hearts, musical notes, and sparkles';
  }

  // Technology - show cute tech mascots
  if (category === 'technology') {
    if (lowercaseTopic.includes('ai') || lowercaseTopic.includes('chatgpt') || lowercaseTopic.includes('artificial intelligence')) {
      return 'An adorable friendly robot mascot with big round eyes and blushing cheeks, surrounded by floating cute emoji helpers';
    }
    if (lowercaseTopic.includes('apple') || lowercaseTopic.includes('iphone') || lowercaseTopic.includes('ios')) {
      return 'A cute smartphone character with a happy face, surrounded by tiny app icon friends with cute expressions';
    }
    if (lowercaseTopic.includes('space') || lowercaseTopic.includes('spacex') || lowercaseTopic.includes('nasa') || lowercaseTopic.includes('rocket')) {
      return 'An adorable chibi rocket with a smiling face blasting off, surrounded by cute planet characters and twinkly stars';
    }
    if (lowercaseTopic.includes('tesla') || lowercaseTopic.includes('ev') || lowercaseTopic.includes('electric car')) {
      return 'A cute electric car mascot with happy headlight eyes, charging from an adorable lightning bolt character';
    }
    if (lowercaseTopic.includes('social media') || lowercaseTopic.includes('twitter') || lowercaseTopic.includes('meta') || lowercaseTopic.includes('instagram')) {
      return 'Adorable notification bubble characters with cute faces, surrounded by heart and like button friends';
    }
    return 'Cute robot mascot with big sparkly eyes surrounded by floating gadget friends, all with happy expressions';
  }

  // Weather - show cute weather mascots
  if (category === 'weather') {
    if (lowercaseTopic.includes('hurricane') || lowercaseTopic.includes('tropical storm')) {
      return 'A cute swirly cloud character with determined expression, surrounded by tiny raindrop friends with umbrellas';
    }
    if (lowercaseTopic.includes('tornado') || lowercaseTopic.includes('severe storm')) {
      return 'An adorable spinning wind mascot with a playful expression, with cute leaf and cloud friends swirling around';
    }
    if (lowercaseTopic.includes('flood') || lowercaseTopic.includes('rain')) {
      return 'Cute raindrop characters with happy faces falling from a fluffy cloud mascot, with tiny umbrella friends below';
    }
    if (lowercaseTopic.includes('heat') || lowercaseTopic.includes('hot') || lowercaseTopic.includes('temperature')) {
      return 'An adorable sun mascot wearing tiny sunglasses, with cute ice cream and popsicle friends enjoying summer';
    }
    if (lowercaseTopic.includes('snow') || lowercaseTopic.includes('blizzard') || lowercaseTopic.includes('winter')) {
      return 'Cute snowflake characters with happy faces falling around an adorable snowman mascot with a cozy scarf';
    }
    return 'Adorable weather mascots (sun, cloud, raindrop) as friends hanging out together with happy expressions';
  }

  // Politics - show cute civic mascots
  if (category === 'politics') {
    if (lowercaseTopic.includes('election') || lowercaseTopic.includes('vote') || lowercaseTopic.includes('ballot')) {
      return 'An adorable ballot box mascot with a friendly smile, surrounded by cute checkmark characters and tiny patriotic stars';
    }
    if (lowercaseTopic.includes('white house') || lowercaseTopic.includes('president')) {
      return 'A cute miniature White House as a cozy dollhouse, with adorable eagle mascot and tiny flag friends';
    }
    if (lowercaseTopic.includes('congress') || lowercaseTopic.includes('senate') || lowercaseTopic.includes('house')) {
      return 'Adorable Capitol building as a cute castle, with chibi owl characters representing wisdom and books';
    }
    if (lowercaseTopic.includes('supreme court') || lowercaseTopic.includes('ruling')) {
      return 'A cute scales of justice mascot with balanced happy faces, surrounded by tiny book and gavel friends';
    }
    return 'Adorable civic mascots (flag, liberty bell, eagle) as cute friends with happy expressions';
  }

  // General/News - show cute news mascots
  if (lowercaseTopic.includes('breaking') || lowercaseTopic.includes('news')) {
    return 'An adorable newspaper mascot with big sparkly eyes, surrounded by cute microphone and camera friends';
  }
  if (lowercaseTopic.includes('celebrity') || lowercaseTopic.includes('star')) {
    return 'Cute star mascots with happy faces on a tiny red carpet, with adorable camera flashes as sparkle friends';
  }
  if (lowercaseTopic.includes('viral') || lowercaseTopic.includes('trending')) {
    return 'An adorable smartphone character showing hearts and likes with happy faces, surrounded by sparkles and confetti';
  }

  // Default: Create cute mascot based on the topic
  return `An adorable, cute mascot character representing "${topic}" with big sparkly eyes, happy expression, surrounded by tiny friendly companions and sparkles`;
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
