export type PlacementRules = {
  // Anchor the first (longest) word to row 0 horizontally. Early levels read
  // best with a clear bottom-row foundation; loosening this past L3 lets the
  // generator pick more interesting silhouettes.
  firstWordRowZero: boolean;
  // Force at least one word to be placed vertically. Kicks in once the
  // column height range is tall enough that vertical words actually fit.
  requireVerticalWord: boolean;
};

export function placementRulesForLevel(n: number): PlacementRules {
  return {
    firstWordRowZero: n <= 3,
    requireVerticalWord: n >= 6,
  };
}
