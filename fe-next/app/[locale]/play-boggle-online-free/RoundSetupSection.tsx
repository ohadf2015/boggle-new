import { CompareTable, Prose, Section } from '@/components/landing/kit';

export const BOARD_SIZES: ReadonlyArray<{ board: string; tiles: number; note: string }> = [
  { board: '5×5', tiles: 25, note: 'The gentlest start. Same size as Big Boggle, the bigger edition of the board game.' },
  { board: '6×6', tiles: 36, note: 'The default for a quick room. Enough letters for long words without slowing anyone down.' },
  { board: '7×7', tiles: 49, note: 'The biggest board. More long words to find, so a longer round pays off here.' },
];

export const HOST_SETTINGS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Board', value: '5×5, 6×6 or 7×7' },
  { label: 'Round length', value: '1 min, 1:30, 2 min or 3 min' },
  { label: 'Shortest word allowed', value: '2, 3 or 4 letters' },
  { label: 'Players', value: '2 to 50 in one room' },
];

export const TWO_PLAYER_FAQ = {
  q: 'Can two people play Boggle online?',
  a: 'Yes. A room works with just two players: create one, send the 4-letter code or the link, and you both play the same board at the same time. If you both have accounts and are friends on LexiClash, you can also send a challenge: "Beat my score" lets you play first and gives your friend the score to beat, and "Play live" starts a real-time race when they accept.',
};

export function RoundSetupSection() {
  return (
    <Section
      title="Board sizes, round length and 2-player games."
      intro="Whoever creates the room sets the round before it starts. Everyone in the room gets the same board, the same clock and the same rules, whether that is two friends or a full class."
    >
      <div className="grid items-start gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-3">
          <h3 className="font-neo-display text-xl font-bold">Boggle online on a 6×6 board, or 5×5, or 7×7</h3>
          <CompareTable
            highlight={-1}
            columns={['Board', 'Letters', 'What it plays like']}
            rows={BOARD_SIZES.map((row) => [row.board, row.tiles, row.note])}
          />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="font-neo-display text-xl font-bold">What the host can change</h3>
          <dl className="grid gap-x-6 gap-y-2 rounded-neo-lg border-3 border-neo-black bg-neo-cream p-5 text-neo-black shadow-hard-xl sm:grid-cols-[max-content_1fr]">
            {HOST_SETTINGS.map((s) => (
              <div key={s.label} className="contents">
                <dt className="font-bold">{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm leading-relaxed text-neo-white/80">
            Raising the minimum to 3 or 4 letters keeps two-letter words like &quot;at&quot; and &quot;on&quot; out of the
            round, which suits a class or a group of strong players. Classroom games keep the round length and word length the teacher chose
            when setting up the lesson.
          </p>
        </div>
      </div>
      <Prose className="grid max-w-none gap-6 space-y-0 md:grid-cols-2">
        <div className="space-y-2">
          <h3>Boggle online for 2 players</h3>
          <p>{TWO_PLAYER_FAQ.a}</p>
        </div>
        <div className="space-y-2">
          <h3>Playing at school</h3>
          <p>
            There is nothing to install, so the game runs anywhere a browser tab can open the site, school Chromebooks
            included. Whether a school network lets the site through is up to that network&apos;s filter, so open the link
            on a class device before the lesson.
          </p>
        </div>
      </Prose>
    </Section>
  );
}
