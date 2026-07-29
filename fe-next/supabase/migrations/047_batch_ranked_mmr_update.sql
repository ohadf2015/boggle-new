-- =============================================
-- BATCH RANKED MMR UPDATE FUNCTION
-- Migration: 047_batch_ranked_mmr_update
--
-- Purpose: Eliminates N+1 query pattern in ranked MMR updates
-- by processing all participants in a single database call.
-- =============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS batch_update_ranked_mmr(JSONB);

/**
 * Batch update MMR for multiple ranked game participants
 *
 * @param p_participants - JSONB array of participant objects with:
 *   - player_id: UUID of the player
 *   - new_mmr: New MMR value to set
 *   - new_peak_mmr: New peak MMR value (max of current and new)
 *
 * @returns Number of profiles updated
 *
 * Example usage:
 *   SELECT batch_update_ranked_mmr('[
 *     {"player_id": "uuid-1", "new_mmr": 1025, "new_peak_mmr": 1025},
 *     {"player_id": "uuid-2", "new_mmr": 985, "new_peak_mmr": 1000}
 *   ]'::jsonb);
 */
CREATE OR REPLACE FUNCTION batch_update_ranked_mmr(p_participants JSONB)
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER := 0;
    v_participant JSONB;
BEGIN
    -- Validate input
    IF p_participants IS NULL OR jsonb_array_length(p_participants) = 0 THEN
        RETURN 0;
    END IF;

    -- Use a single UPDATE with CASE expressions for efficiency
    -- This transforms N individual updates into 1 batch update
    WITH participant_data AS (
        SELECT
            (elem->>'player_id')::UUID AS player_id,
            (elem->>'new_mmr')::INTEGER AS new_mmr,
            (elem->>'new_peak_mmr')::INTEGER AS new_peak_mmr
        FROM jsonb_array_elements(p_participants) AS elem
    )
    UPDATE profiles p
    SET
        ranked_mmr = pd.new_mmr,
        peak_mmr = pd.new_peak_mmr,
        updated_at = NOW()
    FROM participant_data pd
    WHERE p.id = pd.player_id;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- Grant execute permission to service role (used by backend)
GRANT EXECUTE ON FUNCTION batch_update_ranked_mmr(JSONB) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION batch_update_ranked_mmr(JSONB) IS
'Batch update MMR for ranked game participants. Replaces N individual UPDATE calls with a single batch operation for better performance.';
