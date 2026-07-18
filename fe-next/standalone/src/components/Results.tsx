import type { FoundWord } from '../game/useGame';

interface Props {
  score: number;
  best: number;
  found: FoundWord[];
  onPlayAgain: () => void;
}

/** Star tiers by score — cheap sense of progression. */
function stars(score: number): number {
  if (score >= 120) return 3;
  if (score >= 60) return 2;
  if (score >= 20) return 1;
  return 0;
}

export function Results({ score, best, found, onPlayAgain }: Props) {
  const s = stars(score);
  const isBest = score >= best && score > 0;
  const top = [...found].sort((a, b) => b.score - a.score).slice(0, 8);

  return (
    <div className="screen results">
      <h1 className="title">Time!</h1>
      <div className="stars" aria-label={`${s} of 3 stars`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`star${i < s ? ' on' : ''}`}>★</span>
        ))}
      </div>
      <div className="final-score">{score}</div>
      <div className="sub">
        {isBest ? <span className="best-badge">NEW BEST!</span> : <>Best: {best}</>}
        {' · '}{found.length} word{found.length === 1 ? '' : 's'}
      </div>

      {top.length > 0 && (
        <div className="top-words">
          {top.map((w) => (
            <span key={w.word} className="chip">{w.word} <b>+{w.score}</b></span>
          ))}
        </div>
      )}

      <button className="btn btn-primary big" onClick={onPlayAgain}>Play again</button>
    </div>
  );
}
