'use client';

import type { ReactNode } from 'react';
import { DirectionProvider } from '@radix-ui/react-direction';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Feeds the active locale's text direction to every Radix primitive.
 *
 * Radix overlays (Select, Dialog, Popover, Tabs…) read direction from this
 * context — NOT from the `dir` attribute on <html>. Without a provider they
 * default to 'ltr', so on Hebrew (RTL) pages a popper-positioned Select
 * computes its placement with LTR collision math and can render off-anchor.
 */
export function RadixDirectionProvider({ children }: { children: ReactNode }) {
  const { dir } = useLanguage();
  return <DirectionProvider dir={dir}>{children}</DirectionProvider>;
}

export default RadixDirectionProvider;
