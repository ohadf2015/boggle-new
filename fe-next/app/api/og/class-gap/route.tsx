/**
 * Class gap share card — OG image for parents / Slack.
 *
 * Usage: /api/og/class-gap?lesson=Physics+101&teacher=Ms.+Cohen&found=2&total=3&missed=neutron&lang=en
 *
 * CLASS-level only. Student names are not a query param and must never appear here.
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
  cyan: '#00FFFF',
  pink: '#FF1493',
  cream: '#FFFEF0',
};

const COPY: Record<string, { eyebrow: string; found: string; missed: string; allFound: string; home: string }> = {
  en: {
    eyebrow: "TODAY'S CLASS GAP",
    found: '{found} of {total} lesson words found',
    missed: 'Words to practice at home',
    allFound: 'The class found every lesson word',
    home: 'LexiClash',
  },
  he: {
    eyebrow: 'פער הכיתה מהיום',
    found: '{found} מתוך {total} מילות השיעור נמצאו',
    missed: 'מילים לתרגול בבית',
    allFound: 'הכיתה מצאה את כל מילות השיעור',
    home: 'LexiClash',
  },
  sv: {
    eyebrow: 'DAGENS KLASSGAP',
    found: '{found} av {total} lektionsord hittades',
    missed: 'Ord att öva hemma',
    allFound: 'Klassen hittade alla lektionsord',
    home: 'LexiClash',
  },
  ja: {
    eyebrow: '今日のクラスギャップ',
    found: 'レッスン単語 {total} 個のうち {found} 個を発見',
    missed: '家庭で練習する単語',
    allFound: 'クラスはすべての単語を見つけました',
    home: 'LexiClash',
  },
  es: {
    eyebrow: 'EL HUECO DE HOY',
    found: '{found} de {total} palabras de la lección encontradas',
    missed: 'Palabras para practicar en casa',
    allFound: 'La clase encontró todas las palabras',
    home: 'LexiClash',
  },
  ru: {
    eyebrow: 'ПРОБЕЛ КЛАССА',
    found: 'Найдено {found} из {total} слов урока',
    missed: 'Слова для практики дома',
    allFound: 'Класс нашёл все слова урока',
    home: 'LexiClash',
  },
};

function fill(template: string, found: number, total: number): string {
  return template.replace('{found}', String(found)).replace('{total}', String(total));
}

export async function GET(request: NextRequest) {
  const payload = parseClassGapShareParams(new URL(request.url).searchParams);
  const copy = COPY[payload.locale] || COPY.en;
  const chips = payload.missedWords.slice(0, 8);
  const hasMissed = chips.length > 0;

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
              fontSize: payload.lesson.length > 28 ? '40px' : '52px',
              fontWeight: 900,
              color: C.cream,
              lineHeight: 1.1,
              marginBottom: '8px',
            }}
          >
            {payload.lesson || 'Lesson recap'}
          </div>

          {payload.teacher ? (
            <div
              style={{
                display: 'flex',
                fontSize: '22px',
                fontWeight: 700,
                color: 'rgba(255,254,240,0.65)',
                marginBottom: '24px',
              }}
            >
              {payload.teacher}
            </div>
          ) : (
            <div style={{ display: 'flex', height: '24px' }} />
          )}

          <div
            style={{
              display: 'flex',
              fontSize: '28px',
              fontWeight: 800,
              color: C.lime,
              marginBottom: '20px',
            }}
          >
            {fill(copy.found, payload.found, payload.total)}
          </div>

          {hasMissed ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: C.white,
                  marginBottom: '12px',
                }}
              >
                {copy.missed}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {chips.map((word) => (
                  <div
                    key={word}
                    style={{
                      display: 'flex',
                      marginRight: '10px',
                      marginBottom: '10px',
                      padding: '8px 16px',
                      backgroundColor: '#2a1a28',
                      border: `3px solid ${C.pink}`,
                      borderRadius: '10px',
                      color: C.cream,
                      fontSize: '22px',
                      fontWeight: 800,
                    }}
                  >
                    {word}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                fontSize: '24px',
                fontWeight: 700,
                color: C.lime,
              }}
            >
              {copy.allFound}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              marginTop: '28px',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '24px', fontWeight: 900, color: C.lime }}>Lexi</span>
            <span style={{ fontSize: '24px', fontWeight: 900, color: C.cyan }}>Clash</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
