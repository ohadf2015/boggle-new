'use client';

interface WordContextRowProps {
  partOfSpeech?: string;
  example?: string;
}

export function WordContextRow({ partOfSpeech, example }: WordContextRowProps) {
  if (!partOfSpeech && !example) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-neo-white font-neo-body mt-1">
      {partOfSpeech && (
        <span className="uppercase tracking-wide text-xs">{partOfSpeech}</span>
      )}
      {partOfSpeech && example && (
        <span aria-hidden="true">·</span>
      )}
      {example && (
        <span className="italic">&ldquo;{example}&rdquo;</span>
      )}
    </div>
  );
}
