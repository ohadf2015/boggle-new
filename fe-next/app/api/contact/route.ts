import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Contact Form API Endpoint
 *
 * Handles contact form submissions:
 * 1. Validates input
 * 2. Stores message in Supabase
 * 3. Optionally sends email notification via SendGrid
 */

const CONTACT_EMAIL = 'lexiclash.game@gmail.com';

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
 * Send email notification via SendGrid
 */
async function sendEmailNotification(name: string, email: string, message: string): Promise<boolean> {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;

  if (!sendgridApiKey) {
    console.log('[Contact Form] SendGrid not configured, skipping email notification');
    return false;
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: CONTACT_EMAIL }],
            subject: `[LexiClash Contact] New message from ${name}`,
          },
        ],
        from: {
          email: 'noreply@lexiclash.com',
          name: 'LexiClash Contact Form',
        },
        reply_to: {
          email: email,
          name: name,
        },
        content: [
          {
            type: 'text/plain',
            value: `New contact form submission:\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n\n---\nSent via LexiClash Contact Form`,
          },
          {
            type: 'text/html',
            value: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a1a2e; border-bottom: 3px solid #FFE135; padding-bottom: 10px;">
                  New Contact Form Submission
                </h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 8px;">
                  <strong>Message:</strong>
                  <p style="white-space: pre-wrap;">${message}</p>
                </div>
                <p style="margin-top: 20px; color: #666; font-size: 12px;">
                  Sent via LexiClash Contact Form
                </p>
              </div>
            `,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Contact Form] SendGrid error:', errorText);
      return false;
    }

    console.log('[Contact Form] Email notification sent successfully');
    return true;
  } catch (error) {
    console.error('[Contact Form] Failed to send email:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
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
        console.error('[Contact Form] Database error:', dbError);
        // Continue even if DB fails - we'll try to send email
      } else {
        dbStored = true;
        console.log('[Contact Form] Message stored in database');
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

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('[Contact Form] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
