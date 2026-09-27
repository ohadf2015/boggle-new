import type { MechanicKey } from './unlocks-seen';

export type MechanicCard = {
  key: MechanicKey;
  level: number;
  titleKey: string;
  bodyKey: string;
  iconAsset: string;
};

const MECHANIC_CARDS: Record<MechanicKey, MechanicCard> = {
  coinOverlay: {
    key: 'coinOverlay',
    level: 3,
    titleKey: 'blast.tutorial.mechanic.coinOverlay.title',
    bodyKey: 'blast.tutorial.mechanic.coinOverlay.body',
    iconAsset: '💰',
  },
  reverseSelection: {
    key: 'reverseSelection',
    level: 4,
    titleKey: 'blast.tutorial.mechanic.reverseSelection.title',
    bodyKey: 'blast.tutorial.mechanic.reverseSelection.body',
    iconAsset: '🔄',
  },
  shuffleButton: {
    key: 'shuffleButton',
    level: 5,
    titleKey: 'blast.tutorial.mechanic.shuffleButton.title',
    bodyKey: 'blast.tutorial.mechanic.shuffleButton.body',
    iconAsset: '🔀',
  },
  gemTiles: {
    key: 'gemTiles',
    level: 6,
    titleKey: 'blast.tutorial.mechanic.gemTiles.title',
    bodyKey: 'blast.tutorial.mechanic.gemTiles.body',
    iconAsset: '💎',
  },
  frozenTiles: {
    key: 'frozenTiles',
    level: 8,
    titleKey: 'blast.tutorial.mechanic.frozenTiles.title',
    bodyKey: 'blast.tutorial.mechanic.frozenTiles.body',
    iconAsset: '❄️',
  },
  cascadeWords: {
    key: 'cascadeWords',
    level: 12,
    titleKey: 'blast.tutorial.mechanic.cascadeWords.title',
    bodyKey: 'blast.tutorial.mechanic.cascadeWords.body',
    iconAsset: '⚡',
  },
  doubleBonusTile: {
    key: 'doubleBonusTile',
    level: 15,
    titleKey: 'blast.tutorial.mechanic.doubleBonusTile.title',
    bodyKey: 'blast.tutorial.mechanic.doubleBonusTile.body',
    iconAsset: '🌈',
  },
  revealLetterHint: {
    key: 'revealLetterHint',
    level: 7,
    titleKey: 'blast.tutorial.mechanic.revealLetterHint.title',
    bodyKey: 'blast.tutorial.mechanic.revealLetterHint.body',
    iconAsset: '🔍',
  },
  bonusDictionary: {
    key: 'bonusDictionary',
    level: 9,
    titleKey: 'blast.tutorial.mechanic.bonusDictionary.title',
    bodyKey: 'blast.tutorial.mechanic.bonusDictionary.body',
    iconAsset: '📚',
  },
  revealWordHint: {
    key: 'revealWordHint',
    level: 30,
    titleKey: 'blast.tutorial.mechanic.revealWordHint.title',
    bodyKey: 'blast.tutorial.mechanic.revealWordHint.body',
    iconAsset: '💡',
  },
  lateralSlideGravity: {
    key: 'lateralSlideGravity',
    level: 35,
    titleKey: 'blast.tutorial.mechanic.lateralSlideGravity.title',
    bodyKey: 'blast.tutorial.mechanic.lateralSlideGravity.body',
    iconAsset: '↔️',
  },
  multiWordReveal: {
    key: 'multiWordReveal',
    level: 40,
    titleKey: 'blast.tutorial.mechanic.multiWordReveal.title',
    bodyKey: 'blast.tutorial.mechanic.multiWordReveal.body',
    iconAsset: '✨',
  },
};

export function getCardForMechanic(key: MechanicKey): MechanicCard {
  return MECHANIC_CARDS[key];
}

export function getAllCards(): MechanicCard[] {
  return Object.values(MECHANIC_CARDS).sort((a, b) => a.level - b.level);
}
