import { AbsoluteFill, useCurrentFrame, staticFile } from 'remotion';
import { fadeIn, fadeOut, kenBurnsZoom } from '../../shared/utils/interpolations';
import { TextOverlay } from '../../shared/components/TextOverlay';
import { LevelIntroSchema, LevelIntroProps } from './types';

// Re-export for Root.tsx registration
export { LevelIntroSchema };
export type { LevelIntroProps };

type WorldId = 'meadows' | 'springs' | 'caverns';
type SupportedLocale = 'en' | 'he' | 'sv' | 'ja';

/**
 * World name translations for all 4 supported locales.
 */
const WORLD_NAMES: Record<WorldId, Record<SupportedLocale, string>> = {
  meadows: {
    en: 'Alphabet Meadows',
    he: '\u05D0\u05D7\u05D5\u05EA \u05D4\u05D0\u05DC\u05E4\u05D1\u05D9\u05EA', // Achot HaAlefBeit
    sv: 'Alfabets\u00E4ngarna',
    ja: '\u30A2\u30EB\u30D5\u30A1\u30D9\u30C3\u30C8\u306E\u8349\u539F', // Alphabet no Sougen
  },
  springs: {
    en: 'Synonym Springs',
    he: '\u05DE\u05E2\u05D9\u05D9\u05E0\u05D5\u05EA \u05D4\u05DE\u05D9\u05DC\u05D9\u05DD', // Ma'ayanot HaMilim
    sv: 'Synonymk\u00E4llorna',
    ja: '\u540C\u7FA9\u8A9E\u306E\u6CC9', // Dougigo no Izumi
  },
  caverns: {
    en: 'Root Caverns',
    he: '\u05DE\u05E2\u05E8\u05D5\u05EA \u05D4\u05E9\u05D5\u05E8\u05E9\u05D9\u05DD', // Me'arot HaShorashim
    sv: 'Rotgrottorna',
    ja: '\u8A9E\u6839\u306E\u6D1E\u7A9F', // Gokon no Doukutsu
  },
};

// Timing constants (at 30fps)
const TOTAL_FRAMES = 240; // 8 seconds
const KEN_BURNS_DURATION = 180; // 6 seconds
const FADE_IN_DURATION = 15; // 0.5 seconds
const FADE_OUT_START = 210; // 7 seconds
const FADE_OUT_DURATION = 30; // 1 second
const TEXT_APPEAR_FRAME = 150; // Last 3 seconds

// Ken Burns zoom parameters
const START_SCALE = 1.15;
const END_SCALE = 1.0;

/**
 * LevelIntro composition - World flyby establishing shot.
 * Displays world background with Ken Burns zoom effect and world name overlay.
 */
export function LevelIntro({ worldId, locale }: LevelIntroProps) {
  const frame = useCurrentFrame();

  // Calculate animation values
  const fadeInOpacity = fadeIn(frame, 0, FADE_IN_DURATION);
  const fadeOutOpacity = fadeOut(frame, FADE_OUT_START, FADE_OUT_DURATION);
  const opacity = Math.min(fadeInOpacity, fadeOutOpacity);

  const scale = kenBurnsZoom(frame, 0, KEN_BURNS_DURATION, START_SCALE, END_SCALE);

  // Text overlay appears in last 3 seconds (90 frames)
  const textOpacity = frame >= TEXT_APPEAR_FRAME
    ? fadeIn(frame, TEXT_APPEAR_FRAME, 15)
    : 0;

  // Load background image from public assets
  const backgroundUrl = staticFile(`images/adventure/backgrounds/${worldId}.webp`);
  const worldName = WORLD_NAMES[worldId][locale];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1a1a2e', // neo-navy fallback
      }}
    >
      {/* Background with Ken Burns zoom */}
      <AbsoluteFill
        style={{
          opacity,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url(${backgroundUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: `scale(${scale})`,
          }}
        />
      </AbsoluteFill>

      {/* World name text overlay */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 80,
          opacity: textOpacity,
        }}
      >
        <TextOverlay text={worldName} locale={locale} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
