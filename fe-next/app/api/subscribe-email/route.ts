import { NextRequest, NextResponse } from 'next/server';

/**
 * Email Subscription API Endpoint
 *
 * Handles email capture for daily challenges and streak reminders.
 * Integrates with email service provider (Mailchimp, SendGrid, etc.)
 *
 * To integrate with your email service:
 * 1. Add MAILCHIMP_API_KEY and MAILCHIMP_LIST_ID to .env
 * OR
 * 2. Add SENDGRID_API_KEY and SENDGRID_LIST_ID to .env
 * OR
 * 3. Use the simple database storage below
 */

/**
 * Check if email subscription is enabled (any email provider configured)
 */
function isEmailSubscriptionEnabled(): boolean {
  const hasMailchimp = !!(process.env.MAILCHIMP_API_KEY && process.env.MAILCHIMP_LIST_ID);
  const hasSendgrid = !!process.env.SENDGRID_API_KEY;
  return hasMailchimp || hasSendgrid;
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

      const response = await fetch(mailchimpUrl, {
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
      const response = await fetch('https://api.sendgrid.com/v3/marketing/contacts', {
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
    // Option 3: Database Storage (fallback)
    else {
      // Store in your database (Supabase, PostgreSQL, etc.)
      // For now, just log it (you should replace this with actual DB storage)
      console.log('[Email Subscription]', {
        email,
        source,
        timestamp,
        subscribed_at: new Date().toISOString(),
      });

      // TODO: Add database storage
      // await supabase.from('email_subscribers').insert({
      //   email,
      //   source,
      //   subscribed_at: new Date().toISOString(),
      // });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to daily challenges',
    });
  } catch (error) {
    console.error('[Email Subscription Error]', error);
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again.' },
      { status: 500 }
    );
  }
}
