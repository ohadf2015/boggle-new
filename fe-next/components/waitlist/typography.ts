import styles from './waitlist.module.css';

export interface Typo {
  rtl: boolean;
  display: string;
  body: string;
  caps: string;
  headLeading: string;
}

// Fredoka and Rubik ship no Arabic glyphs, and uppercase/tracking break joined Arabic script.
export function typoFor(dir: 'ltr' | 'rtl'): Typo {
  const rtl = dir === 'rtl';
  return {
    rtl,
    display: rtl ? `${styles.arabic} font-extrabold` : 'font-neo-display font-black',
    body: rtl ? styles.arabic : 'font-neo-body',
    caps: rtl ? '' : 'uppercase tracking-wide',
    headLeading: rtl ? 'leading-snug' : 'leading-[1.05]',
  };
}

export const arabicText = styles.arabic;
