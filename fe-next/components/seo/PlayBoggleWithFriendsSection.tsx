import { CompareTable, LandingButton, Mark, Prose, Section, Steps } from '@/components/landing/kit';

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
    title: 'Create a room',
    body: 'Open Multiplayer and start a room. You are the host. Friends do not need an account.',
  },
  {
    title: 'Share the code, the QR, or the link',
    body: 'The lobby shows a 4-letter room code, a QR of the join link, and one share button. Read the code across the room, let someone scan the QR, or send the link.',
  },
  {
    title: 'They join from any browser',
    body: 'Phone, tablet, or laptop. No app store. They land on the same live grid as you.',
  },
] as const;

export function PlayBoggleWithFriendsSection({ locale }: { locale: string }) {
  return (
    <section className="flex flex-col gap-8" aria-labelledby="play-with-others-title" data-speakable="true">
      <div className="flex flex-col gap-3">
        <h2
          id="play-with-others-title"
          className="font-neo-display text-2xl font-bold leading-tight text-balance sm:text-3xl"
        >
          How to play Boggle online <Mark tone="pink">with others</Mark>.
        </h2>
        <p className="max-w-3xl text-lg leading-relaxed text-neo-white/85" data-answer="friends">
          {FRIENDS_ANSWER}
        </p>
      </div>

      <Section>
        <h3 className="font-neo-display text-xl font-bold">Share a code, a QR, or the link</h3>
        <Steps items={STEPS.map((step) => ({ title: step.title, body: step.body }))} />
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Prose paper className="max-w-none">
          <h3>Classic grid rules</h3>
          <ul>
            <li>Letters must touch, including diagonally.</li>
            <li>Each cell is used once per word.</li>
            <li>The host sets the shortest word to 2, 3, or 4 letters. The default is 2.</li>
            <li>The round timer defaults to 90 seconds. The host can set it from 30 seconds to 10 minutes.</li>
          </ul>
        </Prose>
        <Prose paper className="max-w-none">
          <h3>Play the same board at the same time</h3>
          <p>
            Friends play one shared grid while the clock runs. The room does not hand them a link to a board you already finished. Scores update live, then the round ends for everyone together.
          </p>
        </Prose>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-neo-display text-xl font-bold">Multiplayer modes and how many can join</h3>
        <p className="max-w-3xl leading-relaxed text-neo-white/80">
          A friends room rotates four modes. The player cap is the room, not the mode: up to 50 people on that grid. The host can also fill empty seats with up to 3 bots.
        </p>
        <CompareTable
          caption="LexiClash friends-room modes and player cap"
          captionHidden
          columns={['Mode', 'Players', 'What you do']}
          rows={FRIENDS_MODES.map((row) => [row.mode, row.players, row.what])}
        />
      </div>

      <LandingButton href={`/${locale}/multiplayer`} className="self-start">
        Create a room →
      </LandingButton>
    </section>
  );
}
