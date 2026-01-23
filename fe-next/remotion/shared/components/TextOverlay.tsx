import { CSSProperties } from 'react';

type SupportedLocale = 'en' | 'he' | 'sv' | 'ja';

interface TextOverlayProps {
  text: string;
  locale: SupportedLocale;
  style?: CSSProperties;
}

/**
 * RTL-aware text overlay component for Remotion video compositions.
 * Uses neo-brutalist styling with appropriate font selection per locale.
 */
export function TextOverlay({ text, locale, style }: TextOverlayProps) {
  const isRTL = locale === 'he';

  // Per design system: Fredoka for display, Rubik for Hebrew
  const fontFamily = isRTL ? 'Rubik, sans-serif' : 'Fredoka, sans-serif';

  const baseStyle: CSSProperties = {
    fontFamily,
    fontSize: 72,
    fontWeight: 700,
    color: '#FFE135', // neo-yellow
    textShadow: '4px 4px 0px black',
    textAlign: isRTL ? 'right' : 'center',
    direction: isRTL ? 'rtl' : 'ltr',
    unicodeBidi: 'embed',
    ...style,
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={baseStyle}>
      {text}
    </div>
  );
}
