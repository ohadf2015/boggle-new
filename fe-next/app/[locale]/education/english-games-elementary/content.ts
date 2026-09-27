import { pickLocaleContent } from '../_englishLearner/pickLocale';
import { en } from './copy.en';
import { es } from './copy.es';
import { he, sv } from './copy.he-sv';
import { ja, ru } from './copy.ja-ru';

export function getEnglishGamesElementaryContent(locale: string) {
  return pickLocaleContent(locale, { en, he, es, sv, ja, ru });
}
