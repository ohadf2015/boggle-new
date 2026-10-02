import type { HelpLocaleContent, HelpQuickAnswer } from '../helpTypes';

export const enT: HelpLocaleContent = {
  'first-live-game-in-5-minutes': {
    title: 'Your first live game in 5 minutes',
    summary: 'From signing in to a class cheering at the podium, with no setup beforehand. Do it once and you will never need this page again.',
    keywords: 'first lesson, quick start, beginner, getting started, tutorial, five minutes, demo, first time',
    blocks: [
      { t: 'p', text: 'You need: a screen the class can see, your device, and students with phones, tablets or laptops. You do not need a class, a roster or a word list.' },
      {
        t: 'steps',
        items: [
          { time: '0:00', title: 'Open Teacher HQ', body: 'Sign in at [Teacher HQ](app:/teacher). You land on [[teacher.nav.play]].' },
          { time: '0:30', title: 'Pick a game and words', body: 'Tap [[academy.hq.modes.classic]] and one of the starter lists under the posters. They are ready to play.', shot: 'hq-start-game' },
          { time: '1:00', title: 'Go live and project it', body: 'Press [[teacher.playNow.goLive]] and put your screen on the board. The lobby shows a big code, the link and a QR code.', shot: 'lobby' },
          { time: '1:30', title: 'Students join', body: 'They scan the QR or type the code at lexiclash.live/join, then pick a name. Watch the names fly in.' },
          { time: '2:00', title: 'Play one round', body: 'Press [[hostView.startClassGame]]. A [[academy.hq.modes.classic]] round lasts three minutes. Your screen shows the clock and the live leaderboard.', shot: 'live-host' },
          { time: '5:00', title: 'Celebrate, then go again', body: 'The podium appears. Press [[education.results.playAgain]] for a second round with the same code, or [[eduLive.results.backToClass]] to finish.' },
        ],
      },
      { t: 'tip', text: 'Students arrive at different speeds. While you wait, press [[tvLobby.tryPracticeRound]] so the class can watch two bots play and learn the rules without a word from you.' },
    ],
  },
  'five-minute-vocab-warm-up': {
    title: 'A 5-minute vocabulary warm-up',
    summary: 'A bell-ringer that checks meaning, not just spelling: Vocab Quiz on the words you taught yesterday.',
    keywords: 'bell ringer, warm up, do now, starter, vocabulary quiz, review, meanings, definitions',
    blocks: [
      { t: 'p', text: 'This works best with a list that has definitions. Your own list is ideal; a Library list with meanings works too.' },
      {
        t: 'steps',
        items: [
          { time: 'Before class', title: 'Get a list with meanings', body: 'Open [[teacher.nav.lessons]] and pick a list that shows definitions, or add meanings to yours with **word - meaning** lines.' },
          { time: '0:00', title: 'Choose Vocab Quiz', body: 'In Teacher HQ, tap [[academy.hq.modes.vocabQuiz]] and your list, then press [[teacher.playNow.goLive]]. Leave the lobby on the board as students walk in.' },
          { time: '0:30', title: 'Start as soon as most are in', body: 'Late joining is on by default, so stragglers can still join. Press [[hostView.startClassGame]].' },
          { time: '1:00', title: 'Let the quiz run', body: 'Four choices per word; the fastest correct answer scores most. You stay free to circulate.' },
          { time: '4:30', title: 'Read the results together', body: 'Point at the words the class missed and give the meaning in one sentence each. That is your mini-lesson.', shot: 'results' },
        ],
      },
      { t: 'tip', text: 'Have anxious students? Teacher Pro\'s calm mode lets you hide the timer and the live leaderboard while keeping the quiz.' },
    ],
  },
  'homework-in-3-minutes': {
    title: 'Set tonight\'s homework in 3 minutes',
    summary: 'Pick a list, assign WordCraft, due tomorrow. Students play it from their class page; you see who finished.',
    keywords: 'homework, assignment, quick, tonight, due tomorrow, independent practice, async',
    blocks: [
      {
        t: 'steps',
        items: [
          { time: '0:00', title: 'Have your words ready', body: 'Use a list you already played in class, or paste a new one. See [make a word list](help:make-a-word-list).' },
          { time: '1:00', title: 'Create the assignment', body: 'In Teacher HQ, open [[teacher.dashboard.tools]] and press [[teacher.assignment.create]]. Pick the list.', shot: 'class-tools' },
          { time: '1:30', title: 'Keep the recommended game', body: 'Leave **WordCraft** selected: students play solo against a friendly bot, which suits homework.', shot: 'assign-type' },
          { time: '2:00', title: 'Due tomorrow, then assign', body: 'Under [[teacher.assignment.dueDate]], tap tomorrow, add a line of instructions if you like, and press [[teacher.assignment.create]].' },
          { time: '3:00', title: 'Check in tomorrow', body: 'Open [[teacher.dashboard.tools]] and then [[eduHq.tools.assignments]] to see active, overdue and completed assignments.' },
        ],
      },
      { t: 'tip', text: 'Students who have joined your class find the homework on their class page. New students can join any time with the class code.' },
      { t: 'pro', text: 'Free plan: {assignments} assignments per class. Need more? Teacher Pro makes homework unlimited.' },
    ],
  },
  'reteach-missed-words': {
    title: 'Reteach the words your class missed',
    summary: 'Turn the words nobody found into tomorrow\'s warm-up and tonight\'s homework. A five-minute loop that makes words stick.',
    keywords: 'reteach, missed words, review, spaced repetition, hard words, struggling, remediation, follow up',
    blocks: [
      {
        t: 'steps',
        items: [
          { time: '0:00', title: 'Spot the missed words', body: 'After a live game, the results show which lesson words nobody found. Jot them down or take a photo.', shot: 'results' },
          { time: '1:00', title: 'Check the class card', body: 'In [[teacher.nav.classes]], each class card names the hard words from recent games and suggests practising them.' },
          { time: '2:00', title: 'Make a short list', body: 'In Teacher HQ, press [[teacher.playNow.changeWords]], then [[teacher.playNow.sourcePaste]], and paste just those words. Five to ten is plenty.', shot: 'hq-paste-words' },
          { time: '3:00', title: 'Warm up with them tomorrow', body: 'Open tomorrow\'s lesson with [[academy.hq.modes.wordHunt]] on that list: the class races to find exactly the words they missed.' },
          { time: '4:00', title: 'Send them home too', body: 'Assign the same list as homework so every student meets the words once more on their own.' },
        ],
      },
      { t: 'pro', text: 'Teacher Pro does this loop for you: word mastery shows which words the class keeps missing across every game, and spaced review rounds bring missed words back after a few days.' },
    ],
  },
};

export const enQuick: HelpQuickAnswer[] = [
  { q: 'Do students need an account?', a: 'No. Students join with a six-character code, a link or a QR code and pick a name. No email, no password, no app.', slug: 'how-students-join' },
  { q: 'Is LexiClash free for teachers?', a: 'Yes. The free plan has no expiry and covers {classes} classes of up to {students} students, live games, word lists and homework. Teacher Pro is optional.', slug: 'teacher-pro-and-trial' },
  { q: 'How many students can play one live game?', a: 'Up to {players} students in one live game, on the free plan and on Pro.', slug: 'start-a-live-game' },
  { q: 'Which devices work?', a: 'Any phone, tablet, Chromebook or laptop with a modern browser. Students open a web page; there is nothing to install.', slug: 'how-students-join' },
  { q: 'Can I use my own vocabulary words?', a: 'Yes. Paste your words, add meanings if you want quiz modes, and use the list for live games and homework.', slug: 'make-a-word-list' },
  { q: 'How much does Teacher Pro cost?', a: '{price} a month after a {trialDays}-day free trial. Cancel before the trial ends and you pay nothing. Students are always free.', slug: 'teacher-pro-and-trial' },
];
