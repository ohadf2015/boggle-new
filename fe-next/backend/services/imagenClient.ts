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
 * Build neo-brutalist image prompt that shows the VISUAL SCENE of trending topics
 * Shows recognizable imagery that hints at the news without revealing specific words
 * Uses LexiClash's signature bold, vibrant game aesthetic
 */
function buildImagePrompt(
  topic: string,
  category: string,
  _language: string
): string {
  const mood = MOOD_MAP[category] || MOOD_MAP.general;

  // Build a concrete visual scene from the trend
  const visualScene = buildVisualScene(topic, category);

  return `Create an EXPLOSIVE, ULTRA-BOLD neo-brutalist game illustration for LexiClash word game.

SUBJECT: ${visualScene}

=== CRITICAL: LEXICLASH GAME VISUAL IDENTITY ===

COLOR PALETTE (MANDATORY - Use these EXACT vibrant colors):
- PRIMARY: Electric Yellow (#FFE135) - THE signature LexiClash color
- SECONDARY: Hot Orange (#FF6B35) - for energy and action
- ACCENT 1: Shocking Pink (#FF1493) - for excitement
- ACCENT 2: Neon Cyan (#00FFFF) - for highlights
- ACCENT 3: Lime Green (#32CD32) - for success/positive elements
- BACKGROUND: Deep Navy (#1a1a2e) - dark, moody base
- OUTLINES: Pure Black (#000000) - THICK 4-6px chunky borders

The image MUST be DOMINATED by these bright neon colors on the dark navy background.
Think: arcade cabinet art, party game splash screen, mobile game hero banner.

ART STYLE - "JACKBOX PARTY PACK MEETS ARCADE CABINET":
- BOLD, chunky geometric shapes (NO thin lines, NO delicate details)
- HARD BLACK OUTLINES on EVERYTHING (4-6px thick minimum)
- FLAT color fills with ZERO gradients, ZERO soft shadows
- HARD-EDGE shadows (8px offset, pure black, NO blur)
- Halftone dot patterns (Ben-Day dots) for retro pop art feel
- Exaggerated, PLAYFUL proportions (big heads, tiny bodies OK)
- Dynamic diagonal compositions with explosive energy
- MAXIMUM SATURATION - nothing muted or subtle

VISUAL REQUIREMENTS:
- Central iconic object/symbol that represents the trend at 60-70% of frame
- Radiating action lines or starburst patterns in background
- At least 3 of the palette colors must be prominently visible
- Dark navy (#1a1a2e) as background anchoring the bright colors

ABSOLUTE CONSTRAINTS:
- NO text, NO words, NO letters, NO numbers anywhere
- NO realistic human faces (use silhouettes or cartoon characters)
- NO photography, NO photorealism
- NO gradients, NO soft shadows, NO blur effects
- ONLY flat colors with hard edges

OUTPUT: Square 1024×1024px poster-style illustration
MOOD: ${mood}, ENERGETIC, FUN, GAME-LIKE

The final image should look like it belongs on the splash screen of a vibrant party video game.`;
}

/**
 * Build a concrete visual scene description from the trending topic
 * Creates imagery that's recognizable but doesn't reveal puzzle words
 */
function buildVisualScene(topic: string, category: string): string {
  const lowercaseTopic = topic.toLowerCase();

  // Sports - show specific sports imagery
  if (category === 'sports') {
    if (lowercaseTopic.includes('super bowl') || lowercaseTopic.includes('nfl') || lowercaseTopic.includes('football')) {
      return 'An American football flying through goalposts with stadium lights and cheering crowd silhouettes';
    }
    if (lowercaseTopic.includes('basketball') || lowercaseTopic.includes('nba')) {
      return 'A basketball swooshing through a hoop with dynamic action lines and court floor pattern';
    }
    if (lowercaseTopic.includes('soccer') || lowercaseTopic.includes('world cup') || lowercaseTopic.includes('fifa')) {
      return 'A soccer ball flying into a goal net with stadium and excited crowd silhouettes';
    }
    if (lowercaseTopic.includes('tennis') || lowercaseTopic.includes('wimbledon')) {
      return 'Tennis racket hitting a ball across the net with court markings visible';
    }
    if (lowercaseTopic.includes('olympics')) {
      return 'Olympic torch flames with rings symbol and athletic figures in action poses';
    }
    if (lowercaseTopic.includes('golf')) {
      return 'Golf ball trajectory toward a flag on a green with dramatic sunset sky';
    }
    if (lowercaseTopic.includes('boxing') || lowercaseTopic.includes('ufc') || lowercaseTopic.includes('fight')) {
      return 'Boxing ring with dramatic spotlights and silhouetted fighters in action';
    }
    return 'Dynamic sports action scene with multiple sports equipment and excited crowd energy';
  }

  // Finance - show market/money imagery
  if (category === 'finance') {
    if (lowercaseTopic.includes('bitcoin') || lowercaseTopic.includes('crypto') || lowercaseTopic.includes('ethereum')) {
      return 'Rising crypto chart with bitcoin symbol, digital circuits, and rocket launching upward';
    }
    if (lowercaseTopic.includes('stock') || lowercaseTopic.includes('market') || lowercaseTopic.includes('dow') || lowercaseTopic.includes('nasdaq')) {
      return 'Stock market chart with dramatic upward arrow, trading floor energy, and bull symbol';
    }
    if (lowercaseTopic.includes('fed') || lowercaseTopic.includes('rate') || lowercaseTopic.includes('inflation')) {
      return 'Federal reserve building silhouette with interest rate arrow and money symbols';
    }
    return 'Financial chart with dramatic movement arrows, coins, and market energy';
  }

  // Entertainment - show specific entertainment imagery
  if (category === 'entertainment') {
    if (lowercaseTopic.includes('oscar') || lowercaseTopic.includes('academy award')) {
      return 'Golden Oscar statuette on red carpet with spotlights and film strip decorations';
    }
    if (lowercaseTopic.includes('grammy') || lowercaseTopic.includes('music award')) {
      return 'Grammy gramophone trophy with musical notes, microphone, and stage lights';
    }
    if (lowercaseTopic.includes('movie') || lowercaseTopic.includes('film') || lowercaseTopic.includes('box office')) {
      return 'Movie theater marquee with film reel, popcorn, and dramatic spotlights';
    }
    if (lowercaseTopic.includes('concert') || lowercaseTopic.includes('tour') || lowercaseTopic.includes('album')) {
      return 'Concert stage with massive speakers, microphone, screaming crowd silhouettes, and light beams';
    }
    if (lowercaseTopic.includes('streaming') || lowercaseTopic.includes('netflix') || lowercaseTopic.includes('show')) {
      return 'TV screen showing play button with couch, popcorn, and binge-watching atmosphere';
    }
    if (lowercaseTopic.includes('game') || lowercaseTopic.includes('video game') || lowercaseTopic.includes('gaming')) {
      return 'Gaming controller with screen showing action, pixel hearts, and excited gamer energy';
    }
    return 'Entertainment stage with spotlights, stars, and excited audience silhouettes';
  }

  // Technology - show tech imagery
  if (category === 'technology') {
    if (lowercaseTopic.includes('ai') || lowercaseTopic.includes('chatgpt') || lowercaseTopic.includes('artificial intelligence')) {
      return 'Robot brain with neural network patterns, glowing circuits, and futuristic interface';
    }
    if (lowercaseTopic.includes('apple') || lowercaseTopic.includes('iphone') || lowercaseTopic.includes('ios')) {
      return 'Sleek smartphone silhouette with app icons floating around it and notification bubbles';
    }
    if (lowercaseTopic.includes('space') || lowercaseTopic.includes('spacex') || lowercaseTopic.includes('nasa') || lowercaseTopic.includes('rocket')) {
      return 'Rocket launching into starry space with Earth below and dramatic exhaust flames';
    }
    if (lowercaseTopic.includes('tesla') || lowercaseTopic.includes('ev') || lowercaseTopic.includes('electric car')) {
      return 'Sleek electric car silhouette with charging bolt and futuristic city backdrop';
    }
    if (lowercaseTopic.includes('social media') || lowercaseTopic.includes('twitter') || lowercaseTopic.includes('meta') || lowercaseTopic.includes('instagram')) {
      return 'Social media notification bubbles, like buttons, and connected network of people icons';
    }
    return 'Futuristic tech devices with digital circuits, screens, and innovation energy';
  }

  // Weather - show weather imagery
  if (category === 'weather') {
    if (lowercaseTopic.includes('hurricane') || lowercaseTopic.includes('tropical storm')) {
      return 'Massive hurricane spiral viewed from above with dramatic eye and rain bands';
    }
    if (lowercaseTopic.includes('tornado') || lowercaseTopic.includes('severe storm')) {
      return 'Tornado funnel touching down with dark storm clouds and lightning strikes';
    }
    if (lowercaseTopic.includes('flood') || lowercaseTopic.includes('rain')) {
      return 'Dramatic rainstorm with flooding waters, storm clouds, and umbrella silhouettes';
    }
    if (lowercaseTopic.includes('heat') || lowercaseTopic.includes('hot') || lowercaseTopic.includes('temperature')) {
      return 'Giant thermometer bursting with heat waves, sun blazing, and melting ice';
    }
    if (lowercaseTopic.includes('snow') || lowercaseTopic.includes('blizzard') || lowercaseTopic.includes('winter')) {
      return 'Blizzard scene with massive snowflakes, frozen landscape, and bundled-up figures';
    }
    return 'Dramatic sky with multiple weather elements - clouds, sun, rain, and lightning';
  }

  // Politics - show political imagery
  if (category === 'politics') {
    if (lowercaseTopic.includes('election') || lowercaseTopic.includes('vote') || lowercaseTopic.includes('ballot')) {
      return 'Ballot box with voting checkmark, American flags, and patriotic stars';
    }
    if (lowercaseTopic.includes('white house') || lowercaseTopic.includes('president')) {
      return 'White House silhouette with dramatic sky, flags waving, and presidential seal';
    }
    if (lowercaseTopic.includes('congress') || lowercaseTopic.includes('senate') || lowercaseTopic.includes('house')) {
      return 'Capitol building dome with gavel, debate podiums, and legislative imagery';
    }
    if (lowercaseTopic.includes('supreme court') || lowercaseTopic.includes('ruling')) {
      return 'Scales of justice with courthouse columns and gavel striking down';
    }
    return 'Government building silhouette with flags, podium, and democratic symbols';
  }

  // General/News - show news imagery based on keywords
  if (lowercaseTopic.includes('breaking') || lowercaseTopic.includes('news')) {
    return 'Breaking news banner with globe, microphones, and urgent notification symbols';
  }
  if (lowercaseTopic.includes('celebrity') || lowercaseTopic.includes('star')) {
    return 'Red carpet with spotlights, camera flashes, and star-shaped decorations';
  }
  if (lowercaseTopic.includes('viral') || lowercaseTopic.includes('trending')) {
    return 'Smartphone screen with viral content, share buttons, and explosion of likes';
  }

  // Default: Create imagery based on the topic words themselves
  return `Visual representation of trending topic "${topic}" with bold iconic imagery, recognizable symbols, and dynamic composition`;
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
