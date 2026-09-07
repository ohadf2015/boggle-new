/**
 * Miss-gap practice share card — OG image for parents / Slack.
 *
 * Take-home foil after Unplugged Classroom assign (Kahoot Unplugged has none).
 * CLASS-level only — student names never appear.
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { parseClassGapShareParams } from '@/lib/education/classGapShare';

export const runtime = 'edge';

const C = {
  navy: '#1a1a2e',
  black: '#000000',
  white: '#FFFFFF',
  lime: '#BFFF00',
  pink: '#FF1493',
  cream: '#FFFEF0',
};

const COPY: Record<
  string,
  { eyebrow: string; practice: string; foil: string; allFound: string; home: string }
> = {
  en: {
    eyebrow: 'TAKE-HOME PRACTICE',
    practice: 'Missed words to practise',
    foil: 'Kahoot Unplugged has no take-home — LexiClash does',
    allFound: 'The class found every lesson word',
    home: 'LexiClash',
  },
  he: {
    eyebrow: 'תרגול לבית',
    practice: 'מילים חסרות לתרגול',
    foil: 'ל-Kahoot Unplugged אין שיעורי בית — ל-LexiClash יש',
    allFound: 'הכיתה מצאה את כל מילות השיעור',
    home: 'LexiClash',
  },
  sv: {
    eyebrow: 'HEMLÄXA ATT ÖVA',
    practice: 'Missade ord att öva',
    foil: 'Kahoot Unplugged har ingen hemläxa — LexiClash har',
    allFound: 'Klassen hittade alla lektionsord',
    home: 'LexiClash',
  },
  ja: {
    eyebrow: '家庭学習カード',
    practice: '練習する見逃し単語',
    foil: 'Kahoot Unplugged には持ち帰り練習がない — LexiClash にはある',
    allFound: 'クラスはすべての単語を見つけました',
    home: 'LexiClash',
  },
  es: {
    eyebrow: 'PRÁCTICA PARA CASA',
    practice: 'Palabras falladas para practicar',
    foil: 'Kahoot Unplugged no tiene tarea para casa — LexiClash sí',
    allFound: 'La clase encontró todas las palabras',
    home: 'LexiClash',
  },
  ru: {
    eyebrow: 'ДОМАШНЯЯ ПРАКТИКА',
    practice: 'Пропущенные слова для практики',
    foil: 'У Kahoot Unplugged нет домашки — у LexiClash есть',
    allFound: 'Класс нашёл все слова урока',
    home: 'LexiClash',
  },
};

export async function GET(request: NextRequest) {
  const payload = parseClassGapShareParams(new URL(request.url).searchParams);
  const copy = COPY[payload.locale] || COPY.en;
  const chips = payload.missedWords.slice(0, 8);
  const hasMissed = chips.length > 0;
  const lesson = (payload.lesson || 'Lesson').slice(0, 48);

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.navy,
          backgroundImage:
            'radial-gradient(circle at 18% 24%, #3e1a2e 0%, transparent 46%), radial-gradient(circle at 82% 78%, #16213e 0%, transparent 50%)',
          padding: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: C.navy,
            border: `6px solid ${hasMissed ? C.pink : C.lime}`,
            borderRadius: '16px',
            boxShadow: `12px 12px 0px ${C.black}`,
            padding: '40px 56px',
            width: '100%',
            maxWidth: '1080px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: '22px',
              fontWeight: 900,
              color: hasMissed ? C.pink : C.lime,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            {copy.eyebrow}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '52px',
              fontWeight: 900,
              color: C.white,
              lineHeight: 1.1,
              marginBottom: '8px',
            }}
          >
            {lesson}
          </div>
          {payload.teacher ? (
            <div style={{ display: 'flex', fontSize: '24px', color: '#c8c8d8', marginBottom: '20px' }}>
              {payload.teacher}
            </div>
          ) : null}
          {hasMissed ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: '26px',
                  fontWeight: 800,
                  color: C.cream,
                  marginBottom: '16px',
                }}
              >
                {copy.practice}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {chips.map((word) => (
                  <div
                    key={word}
                    style={{
                      display: 'flex',
                      backgroundColor: C.cream,
                      color: C.black,
                      fontWeight: 800,
                      fontSize: '28px',
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: `3px solid ${C.black}`,
                    }}
                  >
                    {word}
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: 'flex',
                  marginTop: '24px',
                  fontSize: '20px',
                  color: C.lime,
                  fontWeight: 700,
                }}
              >
                {copy.foil}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', fontSize: '28px', fontWeight: 800, color: C.lime }}>
              {copy.allFound}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              marginTop: '28px',
              fontSize: '22px',
              fontWeight: 800,
              color: C.white,
              opacity: 0.7,
            }}
          >
            {copy.home}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
