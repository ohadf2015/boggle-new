'use client';

import type { CSSProperties } from 'react';

export type FightOutcome = 'win' | 'loss';

interface BetweenFightsProps {
  fightIndex: number; // 0-based, just-completed
  fightCount: number;
  outcomes: FightOutcome[];
  isHe: boolean;
  onContinue: () => void;
}

export function BetweenFightsScreen({
  fightIndex,
  fightCount,
  outcomes,
  isHe,
  onContinue,
}: BetweenFightsProps) {
  const next = fightIndex + 1; // 1-based number of next fight
  return (
    <Overlay>
      <Card>
        <h2 style={titleStyle('#bfff00')}>{isHe ? 'ניצחון!' : 'VICTORY!'}</h2>
        <p style={{ color: 'white', fontSize: 18, marginBottom: 24 }}>
          {isHe
            ? `קרב ${fightIndex + 1} מתוך ${fightCount} הסתיים`
            : `Fight ${fightIndex + 1} of ${fightCount} complete`}
        </p>
        <FightDots outcomes={outcomes} fightCount={fightCount} />
        <p style={{ color: '#bfff00', fontSize: 16, margin: '16px 0' }}>
          {isHe
            ? `מתכוננים לקרב ${next + 1}…`
            : `Preparing for fight ${next + 1}…`}
        </p>
        <button onClick={onContinue} style={btnStyle('#bfff00', '#1a1a2e')}>
          {isHe ? 'המשך' : 'CONTINUE'}
        </button>
      </Card>
    </Overlay>
  );
}

interface RunCompleteProps {
  outcome: 'victory' | 'defeat';
  outcomes: FightOutcome[];
  fightCount: number;
  isHe: boolean;
  onNewRun: () => void;
}

export function RunCompleteScreen({
  outcome,
  outcomes,
  fightCount,
  isHe,
  onNewRun,
}: RunCompleteProps) {
  const isWin = outcome === 'victory';
  return (
    <Overlay>
      <Card>
        <h1 style={titleStyle(isWin ? '#bfff00' : '#ef4444')}>
          {isWin
            ? isHe
              ? 'הריצה הושלמה!'
              : 'RUN COMPLETE!'
            : isHe
            ? 'הריצה הסתיימה'
            : 'RUN OVER'}
        </h1>
        <p style={{ color: 'white', fontSize: 18, marginBottom: 24 }}>
          {isWin
            ? isHe
              ? 'ניצחת את כל שלושת הקרבות'
              : 'You beat all three fights'
            : isHe
            ? `נפלת בקרב ${outcomes.length}`
            : `You fell on fight ${outcomes.length}`}
        </p>
        <FightDots outcomes={outcomes} fightCount={fightCount} />
        <button onClick={onNewRun} style={btnStyle('#bfff00', '#1a1a2e')}>
          {isHe ? 'ריצה חדשה' : 'NEW RUN'}
        </button>
      </Card>
    </Overlay>
  );
}

function FightDots({
  outcomes,
  fightCount,
}: {
  outcomes: FightOutcome[];
  fightCount: number;
}) {
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', margin: '16px 0' }}>
      {Array.from({ length: fightCount }, (_, i) => {
        const o = outcomes[i];
        const color = o === 'win' ? '#bfff00' : o === 'loss' ? '#ef4444' : '#444';
        return (
          <div
            key={i}
            style={{
              width: 32,
              height: 32,
              background: color,
              border: '3px solid black',
              boxShadow: '3px 3px 0 black',
              fontFamily: 'Fredoka, sans-serif',
              fontWeight: 'bold',
              color: '#1a1a2e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            {i + 1}
          </div>
        );
      })}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#1a1a2e',
        border: '4px solid #bfff00',
        padding: '40px',
        borderRadius: '16px',
        textAlign: 'center',
        boxShadow: '8px 8px 0 #000',
        maxWidth: '90vw',
        minWidth: '380px',
      }}
    >
      {children}
    </div>
  );
}

const titleStyle = (color: string): CSSProperties => ({
  fontSize: 48,
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
