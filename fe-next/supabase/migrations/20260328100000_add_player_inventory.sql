-- =============================================
-- PLAYER INVENTORY TABLE
-- Stores all collectible items earned in adventure mode
-- =============================================

CREATE TABLE IF NOT EXISTS player_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN (
        'gold', 'runeFragment', 'loreScroll', 'bossTrophy',
        'goldenQuill', 'worldEssence', 'ancientRelic', 'cosmicShard'
    )),
    category TEXT NOT NULL CHECK (category IN ('trophy', 'scroll', 'rune', 'relic')),
    rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),
    source_world INTEGER CHECK (source_world >= 1 AND source_world <= 10),
    source_level INTEGER CHECK (source_level >= 1 AND source_level <= 10),
    earned_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate unique items (boss trophies, world essences, etc.)
    UNIQUE(user_id, item_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_player_inventory_user_id ON player_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_player_inventory_category ON player_inventory(user_id, category);
CREATE INDEX IF NOT EXISTS idx_player_inventory_rarity ON player_inventory(user_id, rarity);

-- RLS policies
ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory"
    ON player_inventory FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory"
    ON player_inventory FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory"
    ON player_inventory FOR UPDATE
    USING (auth.uid() = user_id);

COMMENT ON TABLE player_inventory IS 'Collectible items earned in adventure mode';
COMMENT ON COLUMN player_inventory.item_id IS 'Unique item identifier matching collectibleConfig IDs';
COMMENT ON COLUMN player_inventory.item_type IS 'The loot type (gold, runeFragment, bossTrophy, etc.)';
COMMENT ON COLUMN player_inventory.category IS 'Item category (trophy, scroll, rune, relic)';
COMMENT ON COLUMN player_inventory.rarity IS 'Rarity tier (common, rare, epic, legendary)';
