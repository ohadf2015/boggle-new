'use client';

import type { CSSProperties } from 'react';

interface BaseRoomProps {
  isHe: boolean;
  onContinue: () => void;
}

interface TreasureProps extends BaseRoomProps {
  onPick: (id: 'heal' | 'maxHpUp' | 'randomUpgrade') => void;
}

export function TreasureRoom({ isHe, onPick }: TreasureProps) {
  const cards = [
    {
      id: 'heal' as const,
      title: isHe ? 'מעיין מרפא' : 'HEALING SPRING',
      desc: isHe ? 'התרפא ב־50% בריאות' : 'Heal 50% HP',
      accent: '#4ade80',
    },
    {
      id: 'maxHpUp' as const,
      title: isHe ? 'אבן עתיקה' : 'ANCIENT STONE',
      desc: isHe ? '+5 בריאות מקסימלית' : '+5 max HP',
      accent: '#bfff00',
    },
    {
      id: 'randomUpgrade' as const,
      title: isHe ? 'תיבת שדרוג' : 'UPGRADE CHEST',
      desc: isHe ? 'בחר שדרוג חדש' : 'Pick a new upgrade',
      accent: '#ffe135',
    },
  ];

  return (
    <Overlay>
      <div style={cardWrap}>
        <h2 style={titleStyle('#ffe135')}>
          {isHe ? '💎 חדר אוצר' : '💎 TREASURE ROOM'}
        </h2>
        <p style={subStyle}>
          {isHe ? 'בחר אחד משלושה' : 'Pick one of three'}
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            maxWidth: 760,
            width: '100%',
            margin: '20px 0',
          }}
        >
          {cards.map((c) => (
            <button
              key={c.id}
              onClick={() => onPick(c.id)}
              style={{
                background: '#1a1a2e',
                border: `4px solid ${c.accent}`,
                boxShadow: '6px 6px 0 #000',
                padding: 24,
                cursor: 'pointer',
                fontFamily: 'Fredoka, Rubik, sans-serif',
                color: 'white',
                textAlign: 'center',
                transition: 'transform 80ms',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = 'translate(-2px,-2px)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translate(0,0)')}
            >
              <div style={{ fontSize: 22, color: c.accent, fontWeight: 'bold', marginBottom: 8 }}>
                {c.title}
              </div>
              <div style={{ fontSize: 14, fontFamily: 'Rubik, sans-serif', color: '#ddd' }}>
                {c.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
    </Overlay>
  );
}

interface CampProps extends BaseRoomProps {}

export function CampRoom({ isHe, onContinue }: CampProps) {
  return (
    <Overlay>
      <div style={cardWrap}>
        <h2 style={titleStyle('#ff6b35')}>
          {isHe ? '🔥 מחנה' : '🔥 CAMPFIRE'}
        </h2>
        <p style={subStyle}>
          {isHe
            ? 'בריאות מלאה · יכולות התקררו'
            : 'Full heal · abilities reset'}
        </p>
        <p
          style={{
            color: '#aaa',
            fontFamily: 'Rubik, sans-serif',
            fontSize: 14,
            margin: '24px 0',
            maxWidth: 420,
            lineHeight: 1.5,
          }}
        >
          {isHe
            ? 'אתה נח ליד האש. הבוס מחכה.'
            : 'You rest by the fire. The boss waits ahead.'}
        </p>
        <button onClick={onContinue} style={btnStyle('#ff6b35', 'white')}>
          {isHe ? 'המשך' : 'CONTINUE'}
        </button>
      </div>
    </Overlay>
  );
}

interface BossIntroProps extends BaseRoomProps {
  bossName: string;
  bossNameHe: string;
  bossSubtitle: string;
  bossSubtitleHe: string;
}

export function BossIntroScreen({
  isHe,
  onContinue,
  bossName,
  bossNameHe,
  bossSubtitle,
  bossSubtitleHe,
}: BossIntroProps) {
  return (
    <Overlay>
      <div style={cardWrap}>
        <p
          style={{
            fontFamily: 'Fredoka, Rubik, sans-serif',
            color: '#ff1493',
            fontSize: 16,
            letterSpacing: 4,
            marginBottom: 8,
          }}
        >
          {isHe ? 'בוס' : 'BOSS'}
        </p>
        <h1 style={titleStyle('#ff1493')}>
          {isHe ? bossNameHe : bossName}
        </h1>
        <p style={subStyle}>{isHe ? bossSubtitleHe : bossSubtitle}</p>
        <div style={{ marginTop: 32 }}>
          <button onClick={onContinue} style={btnStyle('#ff1493', 'white')}>
            {isHe ? 'הילחם!' : 'FIGHT!'}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

const cardWrap: CSSProperties = {
  background: '#1a1a2e',
  border: '4px solid #bfff00',
  padding: '40px',
  borderRadius: '16px',
  textAlign: 'center',
  boxShadow: '8px 8px 0 #000',
  maxWidth: '90vw',
  minWidth: '380px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const subStyle: CSSProperties = {
  color: 'white',
  fontFamily: 'Rubik, sans-serif',
  fontSize: 16,
  marginBottom: 8,
};

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 24,
      }}
    >
      {children}
    </div>
  );
}

const titleStyle = (color: string): CSSProperties => ({
  fontSize: 56,
  fontFamily: 'Fredoka, Rubik, sans-serif',
  fontWeight: 700,
  color,
  marginBottom: 16,
  textShadow: '4px 4px 0 #000',
});

const btnStyle = (bg: string, ink: string): CSSProperties => ({
  background: bg,
  color: ink,
  fontFamily: 'Fredoka, Rubik, sans-serif',
  fontSize: 22,
  fontWeight: 'bold',
  padding: '12px 32px',
  border: '3px solid black',
  boxShadow: '4px 4px 0 black',
  cursor: 'pointer',
});
