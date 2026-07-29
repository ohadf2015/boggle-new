/**
 * useAdventureForgePicker
 *
 * Owns pre-level Forge-mode rune picker state: whether the picker is open,
 * the current 3-rune offering, equipped runes (with replace-at-index
 * semantics), and the resulting effect bundle wired into gameplay.
 *
 * Extracted from AdventureGame.tsx.
 */

import { useCallback, useMemo, useState } from 'react';
import { pickRuneOffering, computeForgePickEffects } from '@/lib/adventure/runeCatalog';
import type { RuneCardDef, RuneCard as RuneCardType } from '@/types/wordForge';

interface UseAdventureForgePickerProps {
  hasRunePick: boolean;
}

interface UseAdventureForgePickerResult {
  forgePickerOpen: boolean;
  setForgePickerOpen: (v: boolean) => void;
  forgeEquippedRunes: RuneCardType[];
  forgeOffering: RuneCardDef[];
  forgeEffects: ReturnType<typeof computeForgePickEffects>;
  handleForgePick: (rune: RuneCardDef, replaceIndex?: number) => void;
  handleForgeSkip: () => void;
}

export function useAdventureForgePicker({
  hasRunePick,
}: UseAdventureForgePickerProps): UseAdventureForgePickerResult {
  const [forgePickerOpen, setForgePickerOpen] = useState(() => hasRunePick);
  const [forgeEquippedRunes, setForgeEquippedRunes] = useState<RuneCardType[]>([]);

  const forgeOffering = useMemo(
    () => (hasRunePick ? pickRuneOffering(3) : []),
    [hasRunePick]
  );

  const handleForgePick = useCallback((rune: RuneCardDef, replaceIndex?: number) => {
    setForgeEquippedRunes(prev => {
      const card: RuneCardType = { def: rune, instanceId: `adv-pick-${rune.id}-${Date.now()}` };
      if (replaceIndex !== undefined) {
        const next = [...prev];
        next[replaceIndex] = card;
        return next;
      }
      return [...prev, card];
    });
    setForgePickerOpen(false);
  }, []);

  const handleForgeSkip = useCallback(() => setForgePickerOpen(false), []);

  const forgeEffects = useMemo(
    () => computeForgePickEffects(forgeEquippedRunes.map(r => r.def)),
    [forgeEquippedRunes]
  );

  return {
    forgePickerOpen,
    setForgePickerOpen,
    forgeEquippedRunes,
    forgeOffering,
    forgeEffects,
    handleForgePick,
    handleForgeSkip,
  };
}
