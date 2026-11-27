import { dictionaryFloor } from '@/lib/seo/dictionaryStats';

/** Measured Swedish validation-Set floor, Swedish digit grouping. */
export const SV_DICT_FLOOR = dictionaryFloor('sv', 'sv').replace(/,/g, '\u00a0');

/**
 * Growth Radar rec 2718: Bing grounds "scrabble på svenska" but cites other domains. A visible,
 * self-contained answer with real numbers: 50 = MAX_PLAYERS_PER_ROOM, 90 s = DEFAULT_TIMER.
 */
export const SCRABBLE_SV_QUESTION = 'Hur spelar man Scrabble på svenska online gratis?';
export const SCRABBLE_SV_ANSWER = `LexiClash är ett gratis ordspel för dig som vill spela Scrabble på svenska online: öppna lexiclash.live/sv, skapa ett rum och dela länken. Upp till 50 spelare bildar ord på samma bokstavsrutnät samtidigt, en runda tar 90 sekunder och över ${SV_DICT_FLOOR} svenska ord godkänns. Till skillnad från Alfapet och Wordfeud väntar ingen på sin tur. Ingen app, ingen registrering.`;
