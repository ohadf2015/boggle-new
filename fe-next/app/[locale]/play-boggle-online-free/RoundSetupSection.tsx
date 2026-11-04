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
    <section className="mt-20 max-w-3xl">
      <h2 className="mb-3 font-neo-display text-3xl font-black uppercase leading-tight sm:text-4xl">
        Board sizes, round length and <span className="text-neo-lime">2-player</span> games.
      </h2>
      <p className="text-sm leading-relaxed text-neo-white sm:text-base">
        Whoever creates the room sets the round before it starts. Everyone in the room gets the same board, the same
        clock and the same rules, whether that is two friends or a full class.
      </p>

      <h3 className="mt-8 font-neo-display text-xl font-black uppercase text-neo-cyan">Boggle online on a 6×6 board, or 5×5, or 7×7</h3>
      <div className="mt-3 overflow-x-auto rounded-neo border-3 border-neo-gray-400 shadow-hard">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="bg-neo-navy-light text-neo-yellow">
            <tr>
              <th scope="col" className="px-4 py-3 font-bold">Board</th>
              <th scope="col" className="px-4 py-3 font-bold">Letters</th>
              <th scope="col" className="px-4 py-3 font-bold">What it plays like</th>
            </tr>
          </thead>
          <tbody className="text-neo-gray-200">
            {BOARD_SIZES.map((row) => (
              <tr key={row.board} className="border-t border-neo-gray-400">
                <th scope="row" className="px-4 py-3 font-bold text-neo-cream">{row.board}</th>
                <td className="px-4 py-3 tabular-nums">{row.tiles}</td>
                <td className="px-4 py-3">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-8 font-neo-display text-xl font-black uppercase text-neo-cyan">What the host can change</h3>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr] sm:text-base">
        {HOST_SETTINGS.map((s) => (
          <div key={s.label} className="contents">
            <dt className="font-bold text-neo-cream">{s.label}</dt>
            <dd className="text-neo-gray-200">{s.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm leading-relaxed text-neo-gray-200">
        Raising the minimum to 3 or 4 letters keeps two-letter words like &quot;at&quot; and &quot;on&quot; out of the
        round, which suits a class or a group of strong players. Classroom games keep the round length and word length the teacher chose
        when setting up the lesson.
      </p>

      <h3 className="mt-8 font-neo-display text-xl font-black uppercase text-neo-cyan">Boggle online for 2 players</h3>
      <p className="mt-3 text-sm leading-relaxed text-neo-white sm:text-base">{TWO_PLAYER_FAQ.a}</p>

      <h3 className="mt-8 font-neo-display text-xl font-black uppercase text-neo-cyan">Playing at school</h3>
      <p className="mt-3 text-sm leading-relaxed text-neo-white sm:text-base">
        There is nothing to install, so the game runs anywhere a browser tab can open the site, school Chromebooks
        included. Whether a school network lets the site through is up to that network&apos;s filter, so open the link
        on a class device before the lesson.
      </p>
    </section>
  );
}
