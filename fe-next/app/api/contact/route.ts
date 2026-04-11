import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import logger from '@/utils/logger';
import { captureApiError } from '@/utils/sentry';
import { checkApiRateLimit, rateLimitResponse, addRateLimitHeaders } from '@/lib/apiRateLimit';
import { withTimeout, EMAIL_COLORS } from '@/lib/email';

/**
 * HTML entity encoding to prevent XSS in email HTML content
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Contact Form API Endpoint
 *
 * Handles contact form submissions:
 * 1. Rate limits requests (5 per hour per IP to prevent spam)
 * 2. Validates input
 * 3. Stores message in Supabase
 * 4. Sends email notification via Resend
 */

const CONTACT_EMAIL = 'lexiclash.game@gmail.com';

// Rate limit config: 5 requests per hour per IP (strict for contact form)
const CONTACT_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 24 * 60 * 60 * 1000, // 24 hour block for abuse
};

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
 * Send email notification via Resend
 */
async function sendEmailNotification(name: string, email: string, message: string): Promise<boolean> {
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!resend || !fromEmail) {
    logger.log('[Contact Form] Resend not configured, skipping email notification');
    return false;
  }

  const colors = EMAIL_COLORS;

  try {
    const result = await withTimeout(
      resend.emails.send({
        from: fromEmail,
        to: CONTACT_EMAIL,
        replyTo: email,
        subject: `[LexiClash Contact] New message from ${name}`,
        text: `New contact form submission:\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n\n---\nSent via LexiClash Contact Form`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: ${colors.navy}; padding: 24px; border-radius: 12px;">
            <h2 style="color: ${colors.lime}; border-bottom: 3px solid ${colors.lime}; padding-bottom: 10px;">
              New Contact Form Submission
            </h2>
            <p style="color: ${colors.white};"><strong style="color: ${colors.cyan};">Name:</strong> ${escapeHtml(name)}</p>
            <p style="color: ${colors.white};"><strong style="color: ${colors.cyan};">Email:</strong> <a href="mailto:${escapeHtml(email)}" style="color: ${colors.lime};">${escapeHtml(email)}</a></p>
            <div style="margin-top: 20px; padding: 15px; background-color: ${colors.navyCard}; border: 2px solid ${colors.grayDark}; border-radius: 8px;">
              <strong style="color: ${colors.cyan};">Message:</strong>
              <p style="white-space: pre-wrap; color: ${colors.white}; line-height: 1.6;">${escapeHtml(message)}</p>
            </div>
            <p style="margin-top: 20px; color: ${colors.gray}; font-size: 12px;">
              Sent via LexiClash Contact Form
            </p>
          </div>
        `,
      }),
      10_000,
      'Resend API timed out after 10 seconds'
    );

    if (result.error) {
      logger.error('[Contact Form] Resend error:', result.error);
      captureApiError(new Error(result.error.message), '/api/contact', {
        method: 'POST',
        statusCode: 500,
      });
      return false;
    }

    logger.log('[Contact Form] Email notification sent successfully');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Contact Form] Failed to send email:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/contact',
      { method: 'POST', statusCode: 500 }
    );
    return false;
  }
}

export async function POST(request: NextRequest) {
  // Rate limit check - prevent spam and abuse
  const rateLimitResult = checkApiRateLimit(request, 'contact', CONTACT_RATE_LIMIT);
  if (!rateLimitResult.success) {
    logger.warn('[Contact Form] Rate limit exceeded for IP');
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name is required (minimum 2 characters)' }, { status: 400 });
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return NextResponse.json({ error: 'Message is required (minimum 10 characters)' }, { status: 400 });
    }

    // Sanitize inputs
    const sanitizedName = name.trim().slice(0, 100);
    const sanitizedEmail = email.trim().toLowerCase().slice(0, 255);
    const sanitizedMessage = message.trim().slice(0, 5000);

    // Store in Supabase
    const supabase = getSupabaseAdmin();
    let dbStored = false;

    if (supabase) {
      const { error: dbError } = await supabase.from('contact_messages').insert({
        name: sanitizedName,
        email: sanitizedEmail,
        message: sanitizedMessage,
        created_at: new Date().toISOString(),
        status: 'new',
      });

      if (dbError) {
        logger.error('[Contact Form] Database error:', dbError);
        captureApiError(new Error(dbError.message), '/api/contact', {
          method: 'POST',
          statusCode: 500,
        });
        // Continue even if DB fails - we'll try to send email
      } else {
        dbStored = true;
        logger.log('[Contact Form] Message stored in database');
      }
    }

    // Send email notification
    const emailSent = await sendEmailNotification(sanitizedName, sanitizedEmail, sanitizedMessage);

    // At least one method should succeed
    if (!dbStored && !emailSent) {
      return NextResponse.json(
        { error: 'Failed to process your message. Please try again or email us directly.' },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Message sent successfully',
    });
    return addRateLimitHeaders(response, rateLimitResult, CONTACT_RATE_LIMIT.maxRequests);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Contact Form] Unexpected error:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/contact',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
