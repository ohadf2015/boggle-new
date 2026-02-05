/**
 * useParentalConsent - Hook for managing parental consent state
 *
 * Provides functionality to check, submit, and revoke parental consent
 * for users under 14 as required by GDPR/PPL/Israeli Ministry of Education.
 *
 * @example
 * ```tsx
 * function ConsentGate({ children }: { children: React.ReactNode }) {
 *   const { needsConsent, hasConsent, loading } = useParentalConsent();
 *
 *   if (loading) return <Spinner />;
 *   if (needsConsent) return <ParentalConsentModal />;
 *   return <>{children}</>;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ConsentData {
  id: string;
  parent_email: string;
  child_birth_year: number;
  consent_given_at: string;
  consent_version: string;
  revoked_at: string | null;
}

export interface SubmitConsentParams {
  parentEmail: string;
  childBirthYear: number;
}

export interface UseParentalConsentReturn {
  /** Whether the user needs to provide parental consent */
  needsConsent: boolean;
  /** Whether the user has active (non-revoked) consent */
  hasConsent: boolean;
  /** Whether consent status is being loaded */
  loading: boolean;
  /** Error message if any operation failed */
  error: string | null;
  /** The consent data if it exists */
  consentData: ConsentData | null;
  /** Submit parental consent */
  submitConsent: (params: SubmitConsentParams) => Promise<boolean>;
  /** Revoke existing consent */
  revokeConsent: () => Promise<boolean>;
  /** Refresh consent status from database */
  refreshConsent: () => Promise<void>;
}

export function useParentalConsent(): UseParentalConsentReturn {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  // Compute derived state
  const hasConsent = consentData !== null && consentData.revoked_at === null;
  const needsConsent = !hasConsent;

  // Fetch consent status
  const fetchConsentStatus = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('parental_consents')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!isMountedRef.current) return;

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is "no rows found" which is expected for new users
        setError(fetchError.message);
      }

      setConsentData(data || null);
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch consent status');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user?.id]);

  // Submit consent
  const submitConsent = useCallback(async (params: SubmitConsentParams): Promise<boolean> => {
    if (!user?.id) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);

      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from('parental_consents')
        .insert({
          user_id: user.id,
          parent_email: params.parentEmail,
          child_birth_year: params.childBirthYear,
          consent_version: '1.0',
        })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        return false;
      }

      if (isMountedRef.current) {
        setConsentData(data);
      }

      return true;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to submit consent');
      }
      return false;
    }
  }, [user?.id]);

  // Revoke consent
  const revokeConsent = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      setError('User not authenticated');
      return false;
    }

    try {
      setError(null);

      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('parental_consents')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (updateError) {
        setError(updateError.message);
        return false;
      }

      // Refresh consent data
      await fetchConsentStatus();
      return true;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to revoke consent');
      }
      return false;
    }
  }, [user?.id, fetchConsentStatus]);

  // Refresh consent
  const refreshConsent = useCallback(async () => {
    await fetchConsentStatus();
  }, [fetchConsentStatus]);

  // Initial fetch and cleanup
  useEffect(() => {
    isMountedRef.current = true;

    if (!authLoading && isAuthenticated && user?.id) {
      fetchConsentStatus();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [authLoading, isAuthenticated, user?.id, fetchConsentStatus]);

  return {
    needsConsent,
    hasConsent,
    loading: loading || authLoading,
    error,
    consentData,
    submitConsent,
    revokeConsent,
    refreshConsent,
  };
}

export default useParentalConsent;
