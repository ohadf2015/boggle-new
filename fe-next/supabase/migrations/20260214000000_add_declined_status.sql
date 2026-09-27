-- Migration: 20260214000000_add_declined_status.sql
-- Description: Add 'declined' status to student_duels status constraint
-- Dependencies: 20260213000000_education_duels_practice.sql
-- Phase: 38-async-duels
-- Purpose: Allow opponent to decline a duel (different from cancellation which is challenger-initiated)

-- ============================================
-- ALTER STATUS CONSTRAINT
-- ============================================
-- Drop existing constraint and recreate with 'declined' status

ALTER TABLE student_duels DROP CONSTRAINT IF EXISTS student_duels_status_check;

ALTER TABLE student_duels ADD CONSTRAINT student_duels_status_check
    CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'expired', 'declined'));

COMMENT ON COLUMN student_duels.status IS 'pending (awaiting opponent) | active (in progress) | completed | cancelled (creator-initiated) | expired | declined (opponent-rejected)';
