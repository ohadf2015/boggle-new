import type { CSSProperties, ReactNode } from 'react';

interface GlyphProps {
  className?: string;
  style?: CSSProperties;
}

// Lucide paths inlined: suites that stub `lucide-react` with a fixed icon list stay green.
function Glyph({ className, style, children }: GlyphProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {children}
    </svg>
  );
}

export function ShuffleGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="m18 14 4 4-4 4" />
      <path d="m18 2 4 4-4 4" />
      <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
      <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
      <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
    </Glyph>
  );
}

export function SchoolGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M14 21v-3a2 2 0 0 0-4 0v3" />
      <path d="M18 5v16" />
      <path d="m4 6 7.106-3.79a2 2 0 0 1 1.788 0L20 6" />
      <path d="m6 11-3.52 2.147a1 1 0 0 0-.48.854V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a1 1 0 0 0-.48-.853L18 11" />
      <path d="M6 5v16" />
      <circle cx="12" cy="9" r="2" />
    </Glyph>
  );
}

export function HourglassGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
      <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </Glyph>
  );
}
