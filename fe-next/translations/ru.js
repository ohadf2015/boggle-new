// Russian translations.
//
// PHASE 1 STATE: re-exports English as a functional fallback so the `ru` locale
// renders end-to-end (routing, fonts, board) before the full ~600KB native
// translation is generated. Phase 3 replaces this with a real `ru` object
// (translations/ru.js becomes a standalone object like en/he/sv/ja/es).
//
// ponytail: English-fallback until Phase 3 fills native Russian copy.
import { en } from './en.js';

export const ru = en;
