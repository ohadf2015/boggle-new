'use client';

import type { HTMLAttributes } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const RTL_SCRIPT = /[֐-ࣿ]/;
const LATIN = /[A-Za-z]/;

/** First-strong isolate: a user-entered value dropped into a sentence cannot reorder the words around it. */
export function isolateBidi(value: string): string {
  return `⁨${value}⁩`;
}

/** A name in one script reads itself (auto); a name mixing Hebrew and Latin follows the page, since the first letter would flip the whole line. */
export function bidiDir(text: string, pageDir: 'ltr' | 'rtl'): 'auto' | 'ltr' | 'rtl' {
  return RTL_SCRIPT.test(text) && LATIN.test(text) ? pageDir : 'auto';
}

type BidiTextProps = Omit<HTMLAttributes<HTMLElement>, 'dir' | 'children'> & { children: string; 'data-testid'?: string };

/** User-entered text (class and list names) as its own bidi run. */
export function BidiText({ children, ...rest }: BidiTextProps) {
  const { dir } = useLanguage();
  return (
    <bdi {...rest} dir={bidiDir(children, dir === 'rtl' ? 'rtl' : 'ltr')}>
      {children}
    </bdi>
  );
}

export default BidiText;
