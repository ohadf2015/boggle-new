-- Parental Consent Tracking for GDPR/PPL Compliance
-- Required for Israeli Ministry of Education compliance
-- Users under 14 require parental consent for educational features

-- Create the parental_consents table
CREATE TABLE IF NOT EXISTS public.parental_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_email TEXT NOT NULL,
    child_birth_year INTEGER NOT NULL CHECK (child_birth_year >= 2000 AND child_birth_year <= EXTRACT(YEAR FROM NOW())),
    consent_given_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consent_version TEXT NOT NULL DEFAULT '1.0',
    ip_address TEXT,
    user_agent TEXT,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_parental_consents_user_id ON public.parental_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_parental_consents_parent_email ON public.parental_consents(parent_email);

-- Enable RLS
ALTER TABLE public.parental_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own consent record
CREATE POLICY "Users can view own consent"
    ON public.parental_consents
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own consent record
CREATE POLICY "Users can create own consent"
    ON public.parental_consents
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own consent (for revocation)
CREATE POLICY "Users can update own consent"
    ON public.parental_consents
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Teachers can view consent status for their classroom students
-- This allows teachers to verify consent before accessing student data
CREATE POLICY "Teachers can view student consent in their classrooms"
    ON public.parental_consents
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.classrooms c
            JOIN public.student_classroom_memberships scm ON scm.classroom_id = c.id
            WHERE c.teacher_id = auth.uid()
            AND scm.student_id = public.parental_consents.user_id
        )
    );

-- Function to check if a user has active consent
CREATE OR REPLACE FUNCTION public.has_active_consent(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.parental_consents
        WHERE user_id = check_user_id
        AND revoked_at IS NULL
    );
END;
$$;

-- Function to get user's age from birth year
CREATE OR REPLACE FUNCTION public.get_user_age_from_consent(check_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    birth_year INTEGER;
BEGIN
    SELECT child_birth_year INTO birth_year
    FROM public.parental_consents
    WHERE user_id = check_user_id
    AND revoked_at IS NULL;

    IF birth_year IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN EXTRACT(YEAR FROM NOW())::INTEGER - birth_year;
END;
$$;

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION public.update_parental_consent_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER parental_consents_updated_at
    BEFORE UPDATE ON public.parental_consents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_parental_consent_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.parental_consents TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_consent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_age_from_consent(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.parental_consents IS 'Stores parental consent records for minors using educational features. Required for GDPR/PPL/Israeli Ministry of Education compliance.';
