import { z } from 'zod';
import logger from '@/utils/logger';

// Validation schema for submitting consent
const submitConsentSchema = z.object({
  parentEmail: z.string().email('Invalid email address'),
  childBirthYear: z.number().int().min(1900).max(new Date().getFullYear()),
});

export interface ConsentResponse {
  consent?: unknown;
  hasConsent?: boolean;
  success?: boolean;
  error?: string;
  details?: unknown;
}

/**
 * Handler for getting consent status
 * Exported for testing
 */
export async function handleGetConsent(
  userId: string,
  supabase: { from: (table: string) => unknown }
): Promise<{ data: ConsentResponse; status: number }> {
  // Get consent record
  const { data: consent, error: fetchError } = await (supabase.from('parental_consents') as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        single: () => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
      };
    };
  })
    .select('*')
    .eq('user_id', userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 is "no rows found" which is expected for users without consent
    logger.error('Error fetching consent:', fetchError);
    return {
      data: { error: 'Failed to fetch consent status' },
      status: 500,
    };
  }

  // Calculate hasConsent (active consent that hasn't been revoked)
  const consentData = consent as { revoked_at?: string | null } | null;
  const hasConsent = consentData !== null && consentData.revoked_at === null;

  return {
    data: { consent: consent || null, hasConsent },
    status: 200,
  };
}

/**
 * Handler for submitting consent
 * Exported for testing
 */
export async function handleSubmitConsent(
  userId: string,
  body: unknown,
  supabase: { from: (table: string) => unknown }
): Promise<{ data: ConsentResponse; status: number }> {
  // Validate request body
  const parseResult = submitConsentSchema.safeParse(body);

  if (!parseResult.success) {
    return {
      data: { error: 'Invalid request', details: parseResult.error.issues },
      status: 400,
    };
  }

  const { parentEmail, childBirthYear } = parseResult.data;

  // Insert consent record
  const { data: consent, error: insertError } = await (supabase.from('parental_consents') as {
    insert: (data: unknown) => {
      select: () => {
        single: () => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
      };
    };
  })
    .insert({
      user_id: userId,
      parent_email: parentEmail,
      child_birth_year: childBirthYear,
      consent_version: '1.0',
    })
    .select()
    .single();

  if (insertError) {
    // Check for duplicate key constraint violation
    if (insertError.code === '23505') {
      return {
        data: { error: 'Consent already exists' },
        status: 409,
      };
    }

    logger.error('Error inserting consent:', insertError);
    return {
      data: { error: 'Failed to submit consent' },
      status: 500,
    };
  }

  return {
    data: { consent },
    status: 201,
  };
}

/**
 * Handler for revoking consent
 * Exported for testing
 */
export async function handleRevokeConsent(
  userId: string,
  supabase: { from: (table: string) => unknown }
): Promise<{ data: ConsentResponse; status: number }> {
  // Update consent record to set revoked_at
  const { error: updateError } = await (supabase.from('parental_consents') as {
    update: (data: unknown) => {
      eq: (column: string, value: string) => Promise<{ data: unknown; error: { message?: string } | null }>;
    };
  })
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (updateError) {
    logger.error('Error revoking consent:', updateError);
    return {
      data: { error: 'Failed to revoke consent' },
      status: 500,
    };
  }

  return {
    data: { success: true },
    status: 200,
  };
}
