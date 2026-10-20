import Link from 'next/link';

/**
 * Answer-first block for the "play boggle online with others" /
 * "boggle with friends online" cluster. Facts are the live lobby, not copy:
 * InviteCard (QR of the join URL, room code, one share button),
 * ROOM_CODE_LENGTH = 4, MAX_PLAYERS_PER_ROOM = 50, MAX_BOTS_PER_ROOM = 3,
 * ALL_GAME_MODES in backend/modules/gameModeSelector.ts.
 * Admin-gated modes that are not in that rotation are omitted on purpose.
 */
export const FRIENDS_ANSWER =
  'To play Boggle online with friends on LexiClash, open Multiplayer and create a room. The lobby shows a 4-letter room code, a QR of the join link, and a share button. Friends open that link in any browser, or type the code, and join the same live grid. No download and no account.';

export const FRIENDS_MODES: ReadonlyArray<{
  mode: string;
  players: string;
  what: string;
}> = [
  {
    mode: 'Classic',
    players: 'Up to 50',
    what: 'Connect adjacent letters, including diagonally, on one shared grid. A cell is used once per word.',
  },
  {
    mode: 'Blast',
    players: 'Up to 50',
    what: 'Same room. Words hit tile bonuses and clear tiles.',
  },
  {
    mode: 'Word Hunt',
    players: 'Up to 50',
    what: 'Race a target word. Guesses get Wordle-style letter feedback, and a life bar drains.',
  },
  {
    mode: 'Wheel Rush',
    players: 'Up to 50',
    what: 'Everyone can claim the same wheel word. The first finder gets a flat bonus.',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Create a room',
    body: 'Open Multiplayer and start a room. You are the host. Friends do not need an account.',
  },
  {
    n: '2',
    title: 'Share the code, the QR, or the link',
    body: 'The lobby shows a 4-letter room code, a QR of the join link, and one share button. Read the code across the room, let someone scan the QR, or send the link.',
  },
  {
    n: '3',
    title: 'They join from any browser',
    body: 'Phone, tablet, or laptop. No app store. They land on the same live grid as you.',
  },
] as const;

export function PlayBoggleWithFriendsSection({ locale }: { locale: string }) {
  return (
    <section className="mt-16" aria-labelledby="play-with-others-title" data-speakable="true">
      <h2
        id="play-with-others-title"
        className="font-neo-display text-3xl font-black uppercase leading-tight sm:text-4xl"
      >
        How to play Boggle online <span className="text-neo-pink">with others</span>.
      </h2>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-neo-white sm:text-lg" data-answer="friends">
        {FRIENDS_ANSWER}
      </p>

      <h3 className="mt-8 font-neo-display text-xl font-black uppercase text-neo-lime">
        Share a code, a QR, or the link
      </h3>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step.n} className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 shadow-hard">
            <span className="font-neo-display text-sm font-black text-neo-yellow">STEP {step.n}</span>
            <h4 className="mt-1 font-neo-display text-lg font-black">{step.title}</h4>
            <p className="mt-1 text-sm text-neo-gray-200">{step.body}</p>
          </li>
        ))}
      </ol>

      <h3 className="mt-8 font-neo-display text-xl font-black uppercase text-neo-cyan">
        Classic grid rules
      </h3>
      <ul className="mt-3 max-w-3xl list-disc space-y-1 ps-5 text-sm leading-relaxed text-neo-gray-200 sm:text-base">
        <li>Letters must touch, including diagonally.</li>
        <li>Each cell is used once per word.</li>
        <li>The host sets the shortest word to 2, 3, or 4 letters. The default is 2.</li>
        <li>The round timer defaults to 90 seconds. The host can set it from 30 seconds to 10 minutes.</li>
      </ul>

      <h3 className="mt-8 font-neo-display text-xl font-black uppercase text-neo-yellow">
        Play the same board at the same time
      </h3>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neo-gray-200 sm:text-base">
        Friends play one shared grid while the clock runs. The room does not hand them a link to a board you already finished. Scores update live, then the round ends for everyone together.
      </p>

      <h3 className="mt-8 font-neo-display text-xl font-black uppercase">
        Multiplayer modes and how many can join
      </h3>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neo-gray-200 sm:text-base">
        A friends room rotates four modes. The player cap is the room, not the mode: up to 50 people on that grid. The host can also fill empty seats with up to 3 bots.
      </p>
      <div className="mt-4 overflow-x-auto rounded-neo border-4 border-neo-black bg-neo-navy-light shadow-hard">
        <table className="w-full border-collapse text-sm sm:text-base">
          <caption className="sr-only">LexiClash friends-room modes and player cap</caption>
          <thead>
            <tr className="border-b-3 border-neo-black bg-neo-navy">
              <th className="px-4 py-3 text-left font-neo-display font-black uppercase tracking-wider text-neo-yellow">Mode</th>
              <th className="px-4 py-3 text-left font-neo-display font-black uppercase tracking-wider text-neo-lime">Players</th>
              <th className="px-4 py-3 text-left font-neo-display font-black uppercase tracking-wider text-neo-gray-200">What you do</th>
            </tr>
          </thead>
          <tbody>
            {FRIENDS_MODES.map((row) => (
              <tr key={row.mode} className="border-b border-neo-gray-400/20">
                <th scope="row" className="px-4 py-3 text-left font-bold">{row.mode}</th>
                <td className="px-4 py-3 font-bold text-neo-lime">{row.players}</td>
                <td className="px-4 py-3 text-neo-gray-200">{row.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link
        href={`/${locale}/multiplayer`}
        className="mt-6 inline-block rounded-neo border-4 border-neo-black bg-neo-pink px-6 py-3 font-neo-display text-base font-black uppercase tracking-wider text-neo-white shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
      >
        Create a room →
      </Link>
    </section>
  );
}
