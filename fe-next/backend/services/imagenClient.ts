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
  altText: string; // SEO-friendly alt text for the image
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
 * Build editorial-style image prompt that shows trending topics
 * Uses Google Trends visual language with modern illustration style
 * Combines trending indicators with topic-relevant imagery
 *
 * @param topic - The trending topic to visualize
 * @param category - Category for mood selection (sports, finance, etc.)
 * @param language - Target language code (used for future localization)
 */
function buildImagePrompt(
  topic: string,
  category: string,
  language: string
): string {
  const mood = MOOD_MAP[category] || MOOD_MAP.general;

  // Build a concrete visual scene from the trend
  const visualScene = buildVisualScene(topic, category);

  // Log language for debugging (will be used for future localization)
  console.log(`[IMAGEN] Building prompt for language: ${language}, topic: ${topic}`);

  return `Create a MODERN STYLIZED illustration for a Google Trends-powered word game.

SUBJECT: ${visualScene}

=== CRITICAL: ABSOLUTELY NO TEXT ===

**ZERO TEXT POLICY - THIS IS THE MOST IMPORTANT RULE:**
- ABSOLUTELY NO text, words, letters, numbers, or characters in any language
- NO signs, labels, banners, headlines, captions, watermarks, or UI elements with text
- NO partial words, abbreviations, or letter-like shapes that could be mistaken for text
- The image must be 100% PURELY VISUAL with zero readable content
- If you're unsure whether something looks like text, DO NOT include it

=== MODERN STYLIZED ILLUSTRATION STYLE ===

ART STYLE - "CONTEMPORARY ILLUSTRATION WITH CHARACTER":
- **Modern 2.5D style** with depth but not full 3D rendering (think modern app illustrations, editorial graphics)
- Friendly, appealing designs with personality and charm - **subtle kawaii elements allowed**
- Soft gradients, gentle shading, and dimensional feel (NOT completely flat)
- Rounded, friendly shapes with some depth and character
- Think: Modern app illustrations (Headspace, Duolingo), contemporary editorial art, stylized character design
- Professional illustration quality - polished, warm, and approachable

GOOGLE TRENDS VISUAL ELEMENTS (MUST INCLUDE):
- Prominent UPWARD TRENDING ARROW somewhere in composition (the iconic Google Trends rising line)
- Google Trends gradient: Blue transitioning to Green (use the colors, do NOT show hex codes)
- Search-inspired elements: magnifying glass motif, data visualization hints
- Sense of "what's hot right now" - dynamic, current, buzzing energy

COLOR PALETTE (Modern Illustration + Google Trends):
- PRIMARY: Google Blue - trust and clarity
- SECONDARY: Google Green - growth and freshness
- ACCENT 1: Warm Yellow - energy and positivity
- ACCENT 2: Soft Coral - warmth and friendliness
- BACKGROUND: Gentle gradients with subtle depth (pastels allowed for approachability)
- Soft shading with 2.5D depth - some dimensional lighting without full 3D rendering

VISUAL REQUIREMENTS:
- Central subject representing the trending topic (60-70% of frame)
- MANDATORY: Rising trend line or arrow integrated into design
- 2.5D style with gentle depth and layering (NOT fully flat, NOT heavy 3D)
- Soft focus on background elements for depth
- Dynamic composition suggesting upward momentum and energy

ILLUSTRATION GUIDELINES:
- If showing people/characters: Modern stylized proportions - friendly and approachable (subtle kawaii OK, but NOT chibi/super-deformed)
- If showing objects: Stylized with soft shading and gentle dimensionality
- If showing concepts: Creative visual metaphors with contemporary illustration style
- Warm, optimistic mood with charm and personality

MOOD: ${mood}, DYNAMIC, CURRENT, NEWSWORTHY

ABSOLUTE CONSTRAINTS (CRITICAL - DO NOT VIOLATE):
- **ZERO TEXT** - No text, words, letters, numbers, or characters in ANY language (English, Hebrew, Japanese, Swedish, Spanish, or any other)
- **NO HEX COLOR CODES** visible in the image - NO color values like #FFD700 or #4285F4
- **NO RGB/HSL values** visible - NO technical notation like rgb(255,215,0)
- **NO alphanumeric strings or codes** - NO visible UI elements with text
- **NO signs, labels, or banners** - Even decorative text is forbidden
- **ABSOLUTELY NO chibi style** - NO super-deformed characters, NO bobblehead proportions
- **ABSOLUTELY NO heavy anime aesthetic** - NO manga-style linework, NO anime cel-shading, NO moe (萌え) exaggeration
- **Subtle kawaii elements are ALLOWED** - Friendly, approachable character design is fine
- **NO overly exaggerated anime proportions** - Avoid huge eyes (50%+ of face), tiny mouths, extreme stylization
- NO realistic photography style - MUST be stylized illustration
- **Modern 2.5D illustration style** - Think contemporary app design, NOT full 3D rendering
- Characters should have balanced, friendly proportions (neither Western realistic NOR Japanese chibi)
- Keep it family-friendly and universally appealing

STYLE ENFORCEMENT - MODERN ILLUSTRATION:
This is a contemporary stylized illustration with personality and charm.
✅ CORRECT REFERENCE: Headspace app illustrations, Duolingo characters, modern editorial graphics, stylized infographics
✅ SUBTLE KAWAII OK: Friendly round shapes, gentle expressions, soft pastel accents
❌ FORBIDDEN: Chibi/super-deformed style, heavy anime linework, extreme anime proportions
❌ FORBIDDEN: Any text, letters, words, or numbers in any language

SPECIFIC STYLE RULES:
- Eyes: Friendly and expressive but proportional (NOT taking up half the face)
- Face: Balanced stylized proportions - neither hyper-realistic nor chibi
- Colors: Soft gradients with gentle depth, pastels allowed for warmth
- Style: 2.5D modern illustration with layering, NOT flat cel-shading OR heavy 3D
- Expression: Warm and charming with personality, subtle emotion

OUTPUT: Square 1024×1024px modern stylized illustration with ZERO TEXT
The final image should look like premium app illustration or contemporary editorial graphic - friendly, approachable, with gentle depth and charm. Contains absolutely no readable text in any language.`;
}

/**
 * Build an editorial visual scene description from the trending topic
 * Creates bold, modern imagery with Google Trends visual language
 */
function buildVisualScene(topic: string, category: string): string {
  const lowercaseTopic = topic.toLowerCase();

  // Sports - dynamic athletic imagery with trending elements
  if (category === 'sports') {
    if (lowercaseTopic.includes('super bowl') || lowercaseTopic.includes('nfl') || lowercaseTopic.includes('football')) {
      return 'Bold silhouette of football helmet and ball with dramatic upward trending arrow, stadium lights as data points in background, Google blue-green gradient sweep';
    }
    if (lowercaseTopic.includes('basketball') || lowercaseTopic.includes('nba')) {
      return 'Dynamic basketball in motion with trailing trend line arc, hoop as circular graph element, bold geometric court lines, rising arrow trajectory';
    }
    if (lowercaseTopic.includes('soccer') || lowercaseTopic.includes('world cup') || lowercaseTopic.includes('fifa')) {
      return 'Stylized soccer ball with hexagon pattern forming data visualization, goal net as grid graph, upward trending arrow integrated into kick motion';
    }
    if (lowercaseTopic.includes('tennis') || lowercaseTopic.includes('wimbledon')) {
      return 'Tennis racket and ball creating upward arc trajectory like a trending graph, court lines as data grid, bold geometric composition';
    }
    if (lowercaseTopic.includes('olympics')) {
      return 'Olympic rings reimagined with Google Trends colors (blue to green gradient), medal podium as rising bar chart, torch flame as trending arrow';
    }
    if (lowercaseTopic.includes('golf')) {
      return 'Golf ball trajectory forming rising trend line toward flag, course contours as topographic data visualization, clean geometric style';
    }
    if (lowercaseTopic.includes('boxing') || lowercaseTopic.includes('ufc') || lowercaseTopic.includes('fight')) {
      return 'Bold boxing gloves silhouette with impact burst forming trend spike, ring ropes as graph lines, dynamic upward momentum';
    }
    return 'Dynamic athletic figure silhouette with motion lines forming upward trend graph, sports equipment as bold icons, Google blue-green accent colors';
  }

  // Finance - data-driven financial imagery
  if (category === 'finance') {
    if (lowercaseTopic.includes('bitcoin') || lowercaseTopic.includes('crypto') || lowercaseTopic.includes('ethereum')) {
      return 'Stylized crypto coin with blockchain pattern, dramatic rising candlestick chart integrated into design, Google blue-green gradient on trend line';
    }
    if (lowercaseTopic.includes('stock') || lowercaseTopic.includes('market') || lowercaseTopic.includes('dow') || lowercaseTopic.includes('nasdaq')) {
      return 'Bold upward trending line chart as hero element, building silhouettes forming bar graph, bull market arrow in Google Trends colors';
    }
    if (lowercaseTopic.includes('fed') || lowercaseTopic.includes('rate') || lowercaseTopic.includes('inflation')) {
      return 'Stylized percentage symbol with data flow lines, economic indicators as geometric shapes, prominent trend direction arrow';
    }
    return 'Bold currency symbols with integrated trend line showing upward momentum, data grid background, modern financial infographic style';
  }

  // Entertainment - bold showbiz imagery
  if (category === 'entertainment') {
    if (lowercaseTopic.includes('oscar') || lowercaseTopic.includes('academy award')) {
      return 'Geometric Oscar statuette silhouette with spotlight beams forming rising trend lines, film strip as data timeline, red carpet as color accent';
    }
    if (lowercaseTopic.includes('grammy') || lowercaseTopic.includes('music award')) {
      return 'Stylized gramophone with sound waves forming trending graph, musical notes as data points rising upward, bold geometric composition';
    }
    if (lowercaseTopic.includes('movie') || lowercaseTopic.includes('film') || lowercaseTopic.includes('box office')) {
      return 'Film reel and clapperboard as bold icons, box office numbers visualized as rising bar chart, spotlight creating upward beam';
    }
    if (lowercaseTopic.includes('concert') || lowercaseTopic.includes('tour') || lowercaseTopic.includes('album')) {
      return 'Microphone silhouette with sound waves forming upward trend, crowd as data visualization dots, stage lights as accent colors';
    }
    if (lowercaseTopic.includes('streaming') || lowercaseTopic.includes('netflix') || lowercaseTopic.includes('show')) {
      return 'Play button icon with viewer count rising as trend graph, streaming waves as data flow, bold geometric screen shapes';
    }
    if (lowercaseTopic.includes('game') || lowercaseTopic.includes('video game') || lowercaseTopic.includes('gaming')) {
      return 'Game controller with player stats rising as trend line, pixel-inspired data visualization, achievement unlock as upward arrow';
    }
    return 'Spotlight and stage silhouette with audience engagement shown as rising trend graph, entertainment icons in bold geometric style';
  }

  // Technology - modern tech infographic style
  if (category === 'technology') {
    if (lowercaseTopic.includes('ai') || lowercaseTopic.includes('chatgpt') || lowercaseTopic.includes('artificial intelligence')) {
      return 'Neural network nodes forming upward trend pattern, stylized robot/AI brain icon, data flow lines in Google blue-green gradient';
    }
    if (lowercaseTopic.includes('apple') || lowercaseTopic.includes('iphone') || lowercaseTopic.includes('ios')) {
      return 'Sleek device silhouette with app grid forming data visualization, usage trend line rising from screen, bold minimalist tech aesthetic';
    }
    if (lowercaseTopic.includes('space') || lowercaseTopic.includes('spacex') || lowercaseTopic.includes('nasa') || lowercaseTopic.includes('rocket')) {
      return 'Rocket trajectory forming dramatic upward trend line, orbit paths as data circles, stars as data points, bold space infographic';
    }
    if (lowercaseTopic.includes('tesla') || lowercaseTopic.includes('ev') || lowercaseTopic.includes('electric car')) {
      return 'Sleek EV silhouette with charging bolt forming trend arrow, battery level as rising bar chart, clean automotive data viz';
    }
    if (lowercaseTopic.includes('social media') || lowercaseTopic.includes('twitter') || lowercaseTopic.includes('meta') || lowercaseTopic.includes('instagram')) {
      return 'Social icons with engagement metrics visualized as rising trend, notification bubbles as data points, viral spread pattern';
    }
    return 'Circuit board pattern with data flow forming upward trend, tech device silhouettes as bold icons, Google Trends color gradient';
  }

  // Weather - dramatic atmospheric visualization
  if (category === 'weather') {
    if (lowercaseTopic.includes('hurricane') || lowercaseTopic.includes('tropical storm')) {
      return 'Stylized hurricane spiral as data visualization, storm tracking path as trend line, weather radar aesthetic with bold colors';
    }
    if (lowercaseTopic.includes('tornado') || lowercaseTopic.includes('severe storm')) {
      return 'Dramatic tornado funnel with wind speed data visualization, storm intensity shown as rising trend, bold weather warning colors';
    }
    if (lowercaseTopic.includes('flood') || lowercaseTopic.includes('rain')) {
      return 'Rain drops forming data points in rising pattern, water level as bar chart rising, cloud and precipitation infographic style';
    }
    if (lowercaseTopic.includes('heat') || lowercaseTopic.includes('hot') || lowercaseTopic.includes('temperature')) {
      return 'Thermometer as vertical trend graph reaching upward, heat waves as data visualization lines, sun icon with temperature spike';
    }
    if (lowercaseTopic.includes('snow') || lowercaseTopic.includes('blizzard') || lowercaseTopic.includes('winter')) {
      return 'Snowflake patterns as data points, accumulation shown as rising bar chart, cold temperature trend visualization';
    }
    return 'Weather icons (sun, cloud, rain) as bold geometric shapes, atmospheric data as trend lines, meteorological infographic style';
  }

  // Politics - civic infographic style
  if (category === 'politics') {
    if (lowercaseTopic.includes('election') || lowercaseTopic.includes('vote') || lowercaseTopic.includes('ballot')) {
      return 'Ballot box with votes rising as trend graph, checkmark as upward arrow, poll numbers visualization, civic engagement rising';
    }
    if (lowercaseTopic.includes('white house') || lowercaseTopic.includes('president')) {
      return 'White House silhouette with approval/interest trend line, flag as accent element, bold governmental iconography';
    }
    if (lowercaseTopic.includes('congress') || lowercaseTopic.includes('senate') || lowercaseTopic.includes('house')) {
      return 'Capitol dome silhouette with legislative activity as rising trend, columns forming bar chart, civic institution infographic';
    }
    if (lowercaseTopic.includes('supreme court') || lowercaseTopic.includes('ruling')) {
      return 'Scales of justice with public interest rising on one side, gavel creating impact spike on trend line, legal iconography';
    }
    return 'Civic symbols (flag, capitol, eagle) as bold geometric icons, public interest shown as rising trend graph';
  }

  // General/News - editorial news style
  if (lowercaseTopic.includes('breaking') || lowercaseTopic.includes('news')) {
    return 'Breaking news burst with interest spike visualization, media icons as bold silhouettes, attention trend rising dramatically, editorial infographic style';
  }
  if (lowercaseTopic.includes('celebrity') || lowercaseTopic.includes('star')) {
    return 'Star silhouette with fame/interest trend rising, spotlight beams as data rays, red carpet leading upward, sophisticated editorial style';
  }
  if (lowercaseTopic.includes('viral') || lowercaseTopic.includes('trending')) {
    return 'Share/repost pattern forming exponential trend curve, viral spread visualization, Google Trends upward arrow prominent, modern infographic aesthetic';
  }

  // Anime/Manga/Gaming - Modern stylized, NOT chibi
  if (lowercaseTopic.includes('anime') || lowercaseTopic.includes('manga') || lowercaseTopic.includes('kawaii')) {
    return 'Modern stylized representation of Japanese pop culture using contemporary illustration style - use books, screens, or abstract symbols (NOT chibi anime characters). Friendly, approachable design with subtle kawaii charm is fine. Rising popularity trend line integrated into scene, Google Trends gradient, 2.5D layered composition with soft depth';
  }

  // Music/Artists - Modern illustration concert style
  if (lowercaseTopic.includes('music') || lowercaseTopic.includes('artist') || lowercaseTopic.includes('singer') || lowercaseTopic.includes('band')) {
    return 'Modern stylized concert scene with friendly illustrated musical instruments, soft layered sound waves forming upward trend, warm stage lighting with gentle gradients, contemporary app illustration aesthetic (think Headspace or Spotify graphics)';
  }

  // Fashion/Style - Contemporary fashion illustration
  if (lowercaseTopic.includes('fashion') || lowercaseTopic.includes('style') || lowercaseTopic.includes('designer')) {
    return 'Contemporary fashion illustration with stylized fabric elements and soft shading, trending style indicators integrated into scene, runway as rising trend line with 2.5D perspective, modern editorial illustration quality with approachable charm';
  }

  // Food/Restaurant - Modern culinary illustration
  if (lowercaseTopic.includes('food') || lowercaseTopic.includes('restaurant') || lowercaseTopic.includes('recipe') || lowercaseTopic.includes('chef')) {
    return 'Modern culinary illustration with appetizing food styling and soft gradients, ingredient elements forming data visualization, rising popularity shown as ascending steam with gentle layering, contemporary food app aesthetic (think food delivery apps)';
  }

  // Travel/Tourism - Modern travel illustration
  if (lowercaseTopic.includes('travel') || lowercaseTopic.includes('tourism') || lowercaseTopic.includes('destination') || lowercaseTopic.includes('vacation')) {
    return 'Modern travel illustration with stylized landmark silhouettes, journey path forming upward trend line through layered scene, atmospheric depth with soft gradients, contemporary wanderlust aesthetic (think modern travel apps or Airbnb graphics)';
  }

  // Science/Research - Modern science illustration
  if (lowercaseTopic.includes('science') || lowercaseTopic.includes('research') || lowercaseTopic.includes('study') || lowercaseTopic.includes('discovery')) {
    return 'Modern scientific illustration with stylized molecular/atomic patterns, research data as rising trend visualization with gentle depth, laboratory equipment as friendly illustrated icons, contemporary science communication aesthetic (think Kurzgesagt style)';
  }

  // Default: Topic-specific with modern 2.5D illustration style
  // This fallback must be specific to prevent chibi but allow subtle kawaii charm
  return `MODERN 2.5D ILLUSTRATION STYLE (absolutely NO chibi/super-deformed aesthetic - subtle kawaii OK): Contemporary stylized representation of "${topic}" with gentle depth, soft shading, and layered composition. Central subject (70% of frame) with prominent upward trending arrow integrated into design. Google Trends gradient using Google Blue transitioning to Google Green in accents or background. Soft atmospheric depth with gentle gradients. Style references: Headspace app illustrations, Duolingo characters, modern editorial graphics, contemporary infographics. Professional illustration quality with friendly, approachable mood - think premium app design or modern editorial, NOT chibi characters or heavy anime style. Balanced proportions with charm and personality.`;
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

      // Generate SEO-friendly alt text
      const altText = `Trending topic: ${trendingTopic} - Google Trends visualization in ${category} category`;

      return {
        url: imageUrl,
        prompt,
        category,
        cost: IMAGEN_4_COST,
        altText,
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

    // 5. Compress to WebP with aggressive optimization
    // Quality 80 is visually identical to 90 but 40-50% smaller
    // effort: 6 (max) for best compression at the cost of encoding time
    const compressed = await enhanced
      .webp({
        quality: 80,
        effort: 6, // Max compression effort (0-6)
        lossless: false,
      })
      .toBuffer();

    // 6. Check file size and re-compress if needed (target: <200KB)
    const fileSizeKB = compressed.length / 1024;
    console.log(`[IMAGEN] Compressed image size: ${fileSizeKB.toFixed(1)}KB`);

    if (fileSizeKB > 200) {
      console.log(`[IMAGEN] Image exceeds 200KB, applying additional compression`);
      // Further reduce quality to hit target
      const targetQuality = Math.max(60, Math.floor(80 * (200 / fileSizeKB)));
      return sharp(withTexture)
        .modulate({ saturation: 1.2, brightness: 1.05 })
        .webp({
          quality: targetQuality,
          effort: 6,
          lossless: false,
        })
        .toBuffer();
    }

    return compressed;
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
