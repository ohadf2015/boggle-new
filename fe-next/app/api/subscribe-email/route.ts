import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';
import { captureApiError } from '@/utils/sentry';
import { getPostHogServer } from '@/lib/posthog';

// Timeout for external email service calls (prevents indefinite hangs)
const EMAIL_SERVICE_TIMEOUT_MS = 15_000; // 15 seconds

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = EMAIL_SERVICE_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Email Subscription API Endpoint
 *
 * Handles email capture for daily challenges and streak reminders.
 * Stores emails in Supabase and optionally integrates with email providers.
 *
 * To integrate with your email service:
 * 1. Add MAILCHIMP_API_KEY and MAILCHIMP_LIST_ID to .env
 * OR
 * 2. Add SENDGRID_API_KEY and SENDGRID_LIST_ID to .env
 *
 * Emails are always stored in the database regardless of email provider.
 */

/**
 * Get Supabase admin client for database operations
 */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Check if email subscription is enabled
 * Always enabled now that we have database storage
 */
function isEmailSubscriptionEnabled(): boolean {
  // Always enabled - we store in database even without email provider
  return true;
}

/**
 * GET - Check if email subscription is enabled
 * Returns { enabled: boolean } so the client can hide the modal if not configured
 */
export async function GET() {
  return NextResponse.json({
    enabled: isEmailSubscriptionEnabled(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, source, timestamp } = body;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Option 1: Mailchimp Integration (if configured)
    if (process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_LIST_ID) {
      const mailchimpServer = process.env.MAILCHIMP_API_KEY.split('-')[1];
      const mailchimpUrl = `https://${mailchimpServer}.api.mailchimp.com/3.0/lists/${process.env.MAILCHIMP_LIST_ID}/members`;

      const response = await fetchWithTimeout(mailchimpUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.MAILCHIMP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: email,
          status: 'subscribed',
          merge_fields: {
            SOURCE: source || 'unknown',
          },
          tags: ['lexiclash', source || 'unknown'],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        // If already subscribed, return success
        if (error.title === 'Member Exists') {
          return NextResponse.json({ success: true, message: 'Already subscribed' });
        }
        throw new Error('Mailchimp subscription failed');
      }
    }
    // Option 2: SendGrid Integration (if configured)
    else if (process.env.SENDGRID_API_KEY) {
      const response = await fetchWithTimeout('https://api.sendgrid.com/v3/marketing/contacts', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contacts: [
            {
              email: email,
              custom_fields: {
                source: source || 'unknown',
                timestamp: timestamp || Date.now(),
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('SendGrid subscription failed');
      }
    }
    // Option 3: Database Storage (always used as primary storage)
    // Store in Supabase regardless of email provider
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { error: dbError } = await supabase
        .from('email_subscribers')
        .upsert(
          {
            email,
            source: source || 'unknown',
            language: body.language || 'en',
            subscribed_at: new Date().toISOString(),
            is_active: true,
            utm_source: body.utm_source,
            utm_medium: body.utm_medium,
            utm_campaign: body.utm_campaign,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'email',
            ignoreDuplicates: false, // Update existing record
          }
        );

      if (dbError) {
        logger.error('[Email Subscription DB Error]', dbError);
        captureApiError(new Error(dbError.message), '/api/subscribe-email', {
          method: 'POST',
          statusCode: 500,
        });
        // Don't fail the request if DB storage fails but email provider succeeded
        if (!process.env.MAILCHIMP_API_KEY && !process.env.SENDGRID_API_KEY) {
          throw new Error('Failed to save email subscription');
        }
      } else {
        logger.log('[Email Subscription] Saved to database:', email);
      }
    } else {
      logger.warn('[Email Subscription] No Supabase admin client available');
    }

    getPostHogServer()?.capture({
      distinctId: email,
      event: 'email_subscribed',
      properties: {
        source: source || 'unknown',
        utm_source: body.utm_source || null,
        utm_medium: body.utm_medium || null,
        utm_campaign: body.utm_campaign || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to daily challenges',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Email Subscription Error]', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/subscribe-email',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again.' },
      { status: 500 }
    );
  }
}
