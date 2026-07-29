'use client';

import { useMemo } from 'react';
import { UPGRADE_DEFS, type UpgradeId } from '@/lib/adventure/v2/upgrades';

interface Props {
  choices: UpgradeId[];
  isHe: boolean;
  fightIndex: number;
  fightCount: number;
  onPick: (id: UpgradeId) => void;
  equippedSoFar: UpgradeId[];
}

export function UpgradePicker({
  choices,
  isHe,
  fightIndex,
  fightCount,
  onPick,
  equippedSoFar,
}: Props) {
  const equipped = useMemo(
    () => equippedSoFar.map((id) => UPGRADE_DEFS[id]),
    [equippedSoFar],
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 24,
      }}
    >
      <h2
        style={{
          fontSize: 32,
          fontFamily: 'Fredoka, Rubik, sans-serif',
          color: '#bfff00',
          textShadow: '3px 3px 0 #000',
          marginBottom: 8,
        }}
      >
        {isHe ? 'בחר שדרוג' : 'PICK AN UPGRADE'}
      </h2>
      <p style={{ color: '#aaa', fontFamily: 'Rubik, sans-serif', marginBottom: 24 }}>
        {isHe
          ? `לפני קרב ${fightIndex + 1} מתוך ${fightCount}`
          : `Before fight ${fightIndex + 1} of ${fightCount}`}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
          maxWidth: 900,
          width: '100%',
          marginBottom: 24,
        }}
      >
        {choices.map((id) => {
          const def = UPGRADE_DEFS[id];
          return (
            <button
              key={id}
              onClick={() => onPick(id)}
              style={{
                background: '#1a1a2e',
                border: `4px solid #${def.accent.toString(16).padStart(6, '0')}`,
                boxShadow: '6px 6px 0 #000',
                padding: 20,
                cursor: 'pointer',
                textAlign: isHe ? 'right' : 'left',
                fontFamily: 'Fredoka, Rubik, sans-serif',
                color: 'white',
                transition: 'transform 80ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translate(-2px,-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translate(0,0)')}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 'bold',
                  color: `#${def.accent.toString(16).padStart(6, '0')}`,
                  marginBottom: 8,
                }}
              >
                {isHe ? def.labelHe : def.label}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontFamily: 'Rubik, sans-serif',
                  lineHeight: 1.4,
                  color: '#ddd',
                }}
              >
                {isHe ? def.descriptionHe : def.description}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  color: '#888',
                  letterSpacing: 1,
                }}
              >
                {def.kind === 'ability' ? (isHe ? 'יכולת' : 'ABILITY') : (isHe ? 'מאפיין' : 'PASSIVE')}
              </div>
            </button>
          );
        })}
      </div>

      {equipped.length > 0 && (
        <div
          style={{
            color: '#aaa',
            fontFamily: 'Rubik, sans-serif',
            fontSize: 13,
            textAlign: 'center',
            maxWidth: 700,
          }}
        >
          {isHe ? 'יש לך:' : 'Build:'}{' '}
          {equipped.map((d) => (isHe ? d.labelHe : d.label)).join(' · ')}
        </div>
      )}
    </div>
  );
}
