import type { Language } from '@/types';
import { getWordHuntTutorialKey } from '@/utils/dailyChallenge/constants';

export const markWordHuntTutorialSeen = (lang: Language): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getWordHuntTutorialKey(lang), 'true');
};
