import type { SemanticClass, SemanticGate } from './types';

// Phase 0+1 ships ONE class. r1.1 frames אש as the symbolic name of the
// protagonist that opens the cracked door. Future rooms register more classes.
const REGISTRY: Record<SemanticClass, SemanticGate> = {
  'name-male': {
    class: 'name-male',
    acceptList: ['אש', 'אורי', 'אבי'],
    rareBonusList: ['להבה'],
  },
  // Stubs — bodies come with the rooms that need them. Keeps types satisfied.
  warmth:  { class: 'warmth',  acceptList: [] },
  fuel:    { class: 'fuel',    acceptList: [] },
  food:    { class: 'food',    acceptList: [] },
  family:  { class: 'family',  acceptList: [] },
};

export function getSemanticClass(cls: SemanticClass): SemanticGate {
  return REGISTRY[cls];
}

export function gateAccepts(cls: SemanticClass, word: string): boolean {
  const g = REGISTRY[cls];
  return g.acceptList.includes(word) || (g.rareBonusList ?? []).includes(word);
}

export function gateBonusFor(cls: SemanticClass, word: string): 0 | 1 | 2 {
  const g = REGISTRY[cls];
  if ((g.rareBonusList ?? []).includes(word)) return 2;
  if (g.acceptList.includes(word)) return 1;
  return 0;
}
