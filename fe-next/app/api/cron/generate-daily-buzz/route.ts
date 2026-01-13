import { NextRequest, NextResponse } from 'next/server';
import { generateDailyBuzz } from '@/backend/services/buzzGenerator';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';

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
    // Verify cron secret (Vercel adds this automatically)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Unauthorized: Invalid cron secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting daily buzz generation...');
    const today = new Date();
    const languages = ['en', 'he', 'sv', 'ja', 'es'] as const;
    const results: Record<string, { success: boolean; error?: string }> = {};

    // Generate challenges for all 5 languages
    for (const language of languages) {
      try {
        console.log(`[Cron] Generating buzz for ${language}...`);
        await generateDailyBuzz(today, language);
        results[language] = { success: true };
        console.log(`[Cron] ✅ Generated buzz for ${language}`);
      } catch (err: any) {
        console.error(`[Cron] ❌ Failed to generate buzz for ${language}:`, err);
        results[language] = { success: false, error: err.message };
      }
    }

    // Check if all succeeded
    const allSuccess = Object.values(results).every((r) => r.success);
    const status = allSuccess ? 200 : 207; // 207 = Multi-Status (partial success)

    console.log('[Cron] Daily buzz generation complete:', results);

    return NextResponse.json(
      {
        success: allSuccess,
        message: 'Daily buzz generation complete',
        date: today.toISOString().split('T')[0],
        results,
      },
      { status }
    );
  } catch (error: any) {
    console.error('[Cron] Fatal error during daily buzz generation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
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
    const { date, language } = body;

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
    for (const lang of targetLanguages) {
      try {
        console.log(`[Admin] Generating buzz for ${lang}...`);
        await generateDailyBuzz(targetDate, lang);
        results[lang] = { success: true };
        console.log(`[Admin] ✅ Generated buzz for ${lang}`);
      } catch (err: any) {
        console.error(`[Admin] ❌ Failed to generate buzz for ${lang}:`, err);
        results[lang] = { success: false, error: err.message };
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
    console.error('[Admin] Error during manual generation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
