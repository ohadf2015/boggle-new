import { NextRequest, NextResponse } from 'next/server';
import { generateDailyBuzz } from '@/backend/services/buzzGenerator';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { captureApiError } from '@/utils/sentry';

// Increase timeout for AI generation (SERP API + Gemini AI + image generation + DB storage)
// Single language: ~20-30s, All 5 languages: ~60-90s
// Using 120s to provide safety margin
export const maxDuration = 120;

/**
 * Languages enabled for automatic Daily Buzz generation via cron job.
 * Only these languages will have challenges generated automatically.
 * Other languages can be generated manually via admin panel.
 *
 * Configure via BUZZ_ENABLED_LANGUAGES env var (comma-separated)
 * Default: 'en' only
 */
const ALL_SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'] as const;

function getBuzzEnabledLanguages(): readonly string[] {
  const envValue = process.env.BUZZ_ENABLED_LANGUAGES;
  if (!envValue) {
    // Default to English and Hebrew only (cost optimization)
    return ['en', 'he'];
  }

  const requestedLanguages = envValue.split(',').map(l => l.trim().toLowerCase());
  const validLanguages = requestedLanguages.filter(l =>
    ALL_SUPPORTED_LANGUAGES.includes(l as typeof ALL_SUPPORTED_LANGUAGES[number])
  );

  if (validLanguages.length === 0) {
    console.warn('[Cron] No valid languages in BUZZ_ENABLED_LANGUAGES, defaulting to "en"');
    return ['en'];
  }

  return validLanguages;
}

/**
 * Cron Job: Generate Daily Buzz Challenges
 * Runs daily at 00:00 UTC to generate challenges for all 5 languages
 *
 * Railway Setup Options:
 * 1. External Cron Service (cron-job.org, EasyCron, etc.):
 *    - Schedule: 0 0 * * * (daily at midnight UTC)
 *    - URL: https://your-app.railway.app/api/cron/generate-daily-buzz
 *    - Authorization: Bearer YOUR_CRON_SECRET
 *
 * 2. GitHub Actions (scheduled workflow):
 *    - See .github/workflows/daily-buzz-cron.yml
 *
 * 3. Internal node-cron (in server.ts):
 *    - See backend/services/cronScheduler.ts
 *
 * Security: Requires CRON_SECRET in Authorization header
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret - REQUIRED for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Security: CRON_SECRET must be configured in production
    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET environment variable is not configured');
      return NextResponse.json(
        { error: 'Server configuration error: CRON_SECRET not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Unauthorized: Invalid cron secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting daily buzz generation...');
    const today = new Date();
    const enabledLanguages = getBuzzEnabledLanguages();
    console.log(`[Cron] Enabled languages: ${enabledLanguages.join(', ')}`);
    console.log('[Cron] Starting parallel generation for all languages...');

    // Generate challenges for all languages IN PARALLEL
    // This reduces total time from ~120s (sequential) to ~30-40s (parallel)
    const generationPromises = enabledLanguages.map(async (language) => {
      try {
        console.log(`[Cron] Generating buzz for ${language}...`);
        await generateDailyBuzz(today, language);
        console.log(`[Cron] ✅ Generated buzz for ${language}`);
        return { language, success: true };
      } catch (err: any) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[Cron] ❌ Failed to generate buzz for ${language}:`, errorMessage);
        return { language, success: false, error: errorMessage };
      }
    });

    // Wait for all generations to complete (or fail)
    const generationResults = await Promise.allSettled(generationPromises);

    // Convert to results object
    const results: Record<string, { success: boolean; error?: string }> = {};
    generationResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results[result.value.language] = {
          success: result.value.success,
          error: result.value.error,
        };
      } else {
        // Promise was rejected (shouldn't happen since we catch errors, but defensive)
        const lang = enabledLanguages[generationResults.indexOf(result)] || 'unknown';
        results[lang] = { success: false, error: result.reason.message };
      }
    });

    // Check if all succeeded
    const allSuccess = Object.values(results).every((r) => r.success);
    const status = allSuccess ? 200 : 207; // 207 = Multi-Status (partial success)

    console.log('[Cron] Daily buzz generation complete:', results);

    return NextResponse.json(
      {
        success: allSuccess,
        message: 'Daily buzz generation complete',
        date: today.toISOString().split('T')[0],
        enabledLanguages: [...enabledLanguages],
        results,
      },
      { status }
    );
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Cron] Fatal error during daily buzz generation:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/cron/generate-daily-buzz',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual trigger (admin only)
 * Useful for testing or regenerating a specific date
 *
 * Authentication: Requires valid admin JWT token in Authorization header
 *
 * Body:
 * {
 *   date?: string,      // ISO date string (default: today)
 *   language?: string   // Single language or omit for all languages
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Admin authentication check (JWT-based, not ADMIN_SECRET)
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const body = await request.json().catch(() => ({}));
    const { date, language, ...extraParams } = body;

    // SECURITY: Reject any extra parameters to prevent partial overrides
    // Full regeneration (including fresh trend fetching) is the only allowed operation
    const disallowedParams = Object.keys(extraParams);
    if (disallowedParams.length > 0) {
      console.warn(`[Admin] Rejected request with disallowed params: ${disallowedParams.join(', ')}`);
      return NextResponse.json(
        { error: `Disallowed parameters: ${disallowedParams.join(', ')}. Only 'date' and 'language' are allowed.` },
        { status: 400 }
      );
    }

    // Determine target date and languages
    const targetDate = date ? new Date(date) : new Date();
    const targetLanguages = language
      ? [language]
      : (['en', 'he', 'sv', 'ja', 'es'] as const);

    // Validate single language if provided
    if (language && !['en', 'he', 'sv', 'ja', 'es'].includes(language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    console.log(`[Admin] Manual generation started`);
    console.log(`[Admin] Date: ${targetDate.toISOString().split('T')[0]}`);
    console.log(`[Admin] Languages: ${targetLanguages.join(', ')}`);

    const startTime = Date.now();
    const results: Record<string, { success: boolean; error?: string }> = {};

    // Generate for each language
    // Admin regeneration always deletes existing challenge first for a clean slate
    for (const lang of targetLanguages) {
      try {
        console.log(`[Admin] Generating buzz for ${lang}...`);
        await generateDailyBuzz(targetDate, lang, { deleteBeforeRegenerate: true });
        results[lang] = { success: true };
        console.log(`[Admin] ✅ Generated buzz for ${lang}`);
      } catch (err: any) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorStack = err instanceof Error ? err.stack : undefined;
        console.error(`[Admin] ❌ Failed to generate buzz for ${lang}:`, errorMessage);
        if (errorStack) {
          console.error(`[Admin] Stack trace:`, errorStack);
        }
        results[lang] = { success: false, error: errorMessage };
      }
    }

    const duration = Date.now() - startTime;
    const allSuccess = Object.values(results).every((r) => r.success);

    console.log(`[Admin] Manual generation complete (${duration}ms)`);

    return NextResponse.json({
      success: allSuccess,
      message: 'Manual generation complete',
      date: targetDate.toISOString().split('T')[0],
      duration,
      results,
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Admin] Error during manual generation:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/cron/generate-daily-buzz',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
