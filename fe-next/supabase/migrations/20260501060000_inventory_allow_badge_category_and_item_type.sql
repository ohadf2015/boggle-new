-- =============================================
-- Allow 'badge' in player_inventory.category and .item_type
--
-- Reason: claim_season_rewards (migration 20260426160000) inserts season
-- reward badges with item_type='badge' and category='badge', but both
-- columns have CHECK constraints predating seasons that exclude 'badge'.
-- Production hit constraint "player_inventory_category_check" — Sentry
-- JAVASCRIPT-NEXTJS-137 (escalating, 2 users / 16 events).
--
-- Fix: extend both CHECK lists to include 'badge'. Atomic in one tx.
-- =============================================

BEGIN;

ALTER TABLE player_inventory
    DROP CONSTRAINT IF EXISTS player_inventory_category_check;

ALTER TABLE player_inventory
    ADD CONSTRAINT player_inventory_category_check
    CHECK (category IN ('trophy', 'scroll', 'rune', 'relic', 'badge'));

ALTER TABLE player_inventory
    DROP CONSTRAINT IF EXISTS player_inventory_item_type_check;

ALTER TABLE player_inventory
    ADD CONSTRAINT player_inventory_item_type_check
    CHECK (item_type IN (
        'gold', 'runeFragment', 'loreScroll', 'bossTrophy',
        'goldenQuill', 'worldEssence', 'ancientRelic', 'cosmicShard',
        'badge'
    ));

COMMENT ON COLUMN player_inventory.category IS 'Item category (trophy, scroll, rune, relic, badge)';
COMMENT ON COLUMN player_inventory.item_type IS 'Loot type (gold, runeFragment, bossTrophy, badge, etc.)';

COMMIT;
