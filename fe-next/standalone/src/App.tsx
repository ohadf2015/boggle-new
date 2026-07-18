import { useEffect, useState } from 'react';
import './styles.css';
import { loadDictionary } from './core/dict';
import { useGame, ROUND_SECONDS } from './game/useGame';
import { Board } from './components/Board';
import { Results } from './components/Results';

export function App() {
  const [dict, setDict] = useState<Set<string> | null>(null);
  const [dictError, setDictError] = useState<string | null>(null);
  const { state, start, submitWord } = useGame(dict);

  useEffect(() => {
    loadDictionary().then(setDict).catch((e) => setDictError(String(e)));
  }, []);

  const { phase, board, timeLeft, score, combo, last } = state;
  const lowTime = phase === 'playing' && timeLeft <= 10;

  return (
    <div className="app">
      {phase === 'ready' && (
        <div className="screen ready">
          <h1 className="title logo">LexiClash</h1>
          <p className="tagline">Trace words. Beat the clock.</p>
          <button
            className="btn btn-primary big"
            disabled={!dict}
            onClick={start}
          >
            {dict ? 'Play' : dictError ? 'Failed to load' : 'Loading…'}
          </button>
          {dictError && <p className="err">{dictError}</p>}
          <p className="hint">Drag across letters to spell words ({ROUND_SECONDS}s)</p>
        </div>
      )}

      {phase === 'playing' && (
        <div className="screen play">
          <div className="hud">
            <div className="hud-item">
              <span className="hud-label">SCORE</span>
              <span className="hud-value">{score}</span>
            </div>
            <div className={`hud-item timer${lowTime ? ' low' : ''}`}>
              <span className="hud-label">TIME</span>
              <span className="hud-value">{timeLeft}</span>
            </div>
            <div className={`hud-item combo${combo >= 2 ? ' on' : ''}`}>
              <span className="hud-label">COMBO</span>
              <span className="hud-value">{combo > 0 ? `x${combo}` : '—'}</span>
            </div>
          </div>

          <Board board={board} onSubmit={submitWord} flash={last ? { id: last.id, type: last.type } : null} />

          {last && (
            <div key={last.id} className={`toast toast-${last.type}`}>
              {last.type === 'accept' ? `${last.word.toUpperCase()} +${last.score}` : label(last.reason)}
            </div>
          )}
        </div>
      )}

      {phase === 'results' && (
        <Results score={score} best={state.best} found={state.found} onPlayAgain={start} />
      )}
    </div>
  );
}

function label(reason?: string): string {
  switch (reason) {
    case 'short': return 'Too short';
    case 'duplicate': return 'Already found';
    case 'not-a-path': return 'Not a path';
    case 'not-a-word': return 'Not a word';
    default: return 'Nope';
  }
}
