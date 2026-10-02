import type { HelpLocaleContent } from '../helpTypes';

export const enA: HelpLocaleContent = {
  'create-teacher-account': {
    title: 'Create your free teacher account',
    summary: 'Sign up with Google or a one-time email link, get approved on the spot, and land in Teacher HQ. About a minute, no card.',
    keywords: 'sign up, register, login, sign in, account, teacher access, approval, password, google, magic link',
    blocks: [
      { t: 'p', text: 'Your students never need an account. You do, so your classes, word lists and results are saved in one place. It is free, and there is no expiry on the free plan.' },
      {
        t: 'steps',
        items: [
          { title: 'Open the teacher sign-up', body: 'Go to [Teacher HQ](app:/teacher) and choose [[education.access.auth_required_cta]]. If you already have a LexiClash account, choose [[education.access.auth_signin_cta]] instead.' },
          { title: 'Pick how you sign in', body: '[[auth.continueWithGoogle]] is the fastest. Prefer email? Type your school address and we send a one-time sign-in link, so there is no password to remember. You can still choose [[auth.magicLink.usePassword]].', shot: 'teacher-signup' },
          { title: 'Get approved', body: 'Teacher access is approved straight away. There is no waiting list and nobody calls you.' },
          { title: 'Meet Teacher HQ', body: 'You land on [[teacher.nav.play]] with a game ready to launch. The menu on the side (or along the bottom on a phone) holds [[teacher.nav.classes]], [[teacher.nav.lessons]], [[teacher.nav.reports]] and [[teacher.nav.me]].', shot: 'hq-overview' },
        ],
      },
      { t: 'tip', text: 'You do not have to set anything up before your first game. Press [[teacher.playNow.goLive]] and LexiClash creates a class for you while the join code goes up on the board.' },
      { t: 'pro', text: 'The free plan covers {classes} classes of up to {students} students each. Teacher Pro is optional and only matters once you teach more sections or want the deeper reports.' },
    ],
  },
  'create-a-class': {
    title: 'Create a class and get its join code',
    summary: 'Make one class per group you teach. Each class gets its own six-character code, roster and results.',
    keywords: 'new class, classroom, section, period, roster, join code, rename, delete class, google classroom',
    blocks: [
      { t: 'p', text: 'A class keeps a group together: the students who joined, the homework you set and every game result. If you teach three groups, make three classes so their reports never mix.' },
      {
        t: 'steps',
        items: [
          { title: 'Open Classes', body: 'In Teacher HQ, open [[teacher.nav.classes]]. You will see every class you have, with its code and how many students are on the roster.' },
          { title: 'Create the class', body: 'Press [[teacher.onboardingChecklist.createClassroomCta]], give it a name your students will recognise (for example "Year 7 English") and choose the language the class plays in.', shot: 'create-class' },
          { title: 'Share the code', body: 'The new class card shows its join code. Use [[teacher.classroom.copyCode]] to paste it into your class chat, or project it from [[teacher.nav.play]].' },
          { title: 'Edit or tidy up later', body: 'The **⋯** menu on a class card lets you [[teacher.classroom.edit]], [[teacher.classroom.googleClassroom]] or [[teacher.classroom.delete]].', shot: 'classes-actions' },
        ],
      },
      { t: 'tip', text: 'The class language matters: it is the language the class plays in. A Spanish class plays with Spanish words even if your own screen is set to English.' },
      { t: 'pro', text: 'Free plan: up to {classes} classes, each with up to {students} students. Teacher Pro removes both limits.' },
    ],
  },
  'start-a-live-game': {
    title: 'Start a live game in one tap',
    summary: 'Pick a game, pick the words, press Go live. The join code is on your board before the class has finished sitting down.',
    keywords: 'go live, host, start game, projector, live class, classroom game, launch, play now',
    blocks: [
      { t: 'p', text: 'A live game is the whole class playing at once from their own devices while the board shows the code, the timer and the leaderboard. Everything starts from [[teacher.nav.play]] in Teacher HQ.' },
      {
        t: 'steps',
        items: [
          { title: 'Choose the game', body: 'Under [[academy.hq.startTitle]], tap a poster. Not sure? [[academy.hq.modes.classic]] works with any word list; [[academy.hq.modes.vocabQuiz]] needs words with definitions.', shot: 'hq-start-game' },
          { title: 'Choose the words', body: 'Tap one of your lists under the posters, or press [[teacher.playNow.changeWords]] for [[teacher.playNow.sourcePacks]] or [[teacher.playNow.sourcePaste]].' },
          { title: 'Press Go live', body: 'Press [[teacher.playNow.goLive]]. LexiClash sets up the class, loads the words and opens the room. The lobby fills your screen with the code, the join link and a QR code.', shot: 'lobby' },
          { title: 'Start when they are in', body: 'Names pop into the lobby as students join. [[hostView.startClassGame]] unlocks once at least one student is in. Press it and the round begins on every device at the same time.' },
        ],
      },
      { t: 'tip', text: 'Want to show the class what to expect first? In the lobby, press [[tvLobby.tryPracticeRound]]. Two bots play a short round on the board while you explain, and nothing counts toward the class results.' },
    ],
  },
  'how-students-join': {
    title: 'How students join (code, link or QR)',
    summary: 'Students type a six-character code, open your link or scan the QR, then pick a name. No accounts, no emails, no app to install.',
    keywords: 'join code, student login, qr code, link, no account, join page, students can not join, wrong code',
    blocks: [
      { t: 'p', text: 'Joining takes about ten seconds on a phone, tablet, Chromebook or laptop. It works in any modern browser.' },
      {
        t: 'steps',
        items: [
          { title: 'Put the code where they can see it', body: 'In Teacher HQ, the [[academy.hq.getStudentsIn]] card shows your code. Use [[academy.hq.openProjector]] for a big full-screen version, [[academy.hq.qr]] for a scannable code, or [[academy.hq.copyLink]] to paste the link into your class chat or LMS.', shot: 'hq-get-students-in' },
          { title: 'Students open the join page', body: 'They go to **lexiclash.live/join** and type the six characters, or they open your link or scan the QR, which fills the code in for them.' },
          { title: 'Students pick a name', body: 'They see which class they are joining, type a name (or tap the dice for a random one) and press [[education.student.join.flow.go]]. That is it.', shot: 'student-join' },
          { title: 'Watch the roster fill', body: 'Each student appears on your screen as they arrive. Students who join a class this way are added to its roster, so their results land in your reports.' },
        ],
      },
      { t: 'tip', text: 'Ask students to use their first name or the nickname you use in class. Everyone in the room sees the names on the leaderboard, so it is also an easy moment to remind them to keep it kind.' },
      { t: 'h2', text: 'If a student cannot get in' },
      { t: 'list', items: ['Check the code: it is six letters and numbers, and the one in the live lobby is the one that counts during a game.', 'Ask them to reload the page. A half-loaded page on school Wi-Fi is the usual culprit.', 'If you ended the game, the room is closed. Press [[teacher.playNow.goLive]] again and share the new code.'] },
    ],
  },
  'choose-a-game-mode': {
    title: 'Which game should I pick?',
    summary: 'Six live games, each good at something different. Here is what each one practises and when to reach for it.',
    keywords: 'game modes, word arena, classic, vocab quiz, blast, word hunt, wordcraft, wheel rush, which mode, difference',
    blocks: [
      { t: 'p', text: 'Every mode plays with the word list you chose, and every mode works with the same join code. You can switch between them during a lesson without anyone rejoining.' },
      {
        t: 'list',
        items: [
          '[[academy.hq.modes.classic]]: one shared letter grid; students trace every word they can spot. Great for spelling and word-building with any list. 3 minutes by default.',
          '[[academy.hq.modes.vocabQuiz]]: four choices, one meaning; the fastest correct answer scores most. Best for checking meaning. Needs a list with definitions.',
          '[[academy.hq.modes.blast]]: fast rounds where words set off chain combos. Pure energy for a Friday or the last ten minutes.',
          '[[academy.hq.modes.wordHunt]]: the class races to dig the list words out of the grid. Good for brand-new words students have only just met.',
          '[[academy.hq.modes.wordcraft]]: each student crafts list words on their own board against the Baron, and the class leaderboard decides the rest. Calmer, and good for mixed levels.',
          '[[teacher.classroom.gameModes.wheelRush]]: spin the letter wheel and fire off words against the clock. Quick and loud.',
        ],
      },
      { t: 'shot', id: 'lobby-switch-game', caption: 'In the lobby, Change game swaps the mode and keeps the same code.' },
      { t: 'h2', text: 'A simple rule of thumb' },
      { t: 'list', items: ['Teaching meaning? Start with [[academy.hq.modes.vocabQuiz]].', 'Teaching spelling or word families? [[academy.hq.modes.classic]] or [[academy.hq.modes.wordHunt]].', 'Students who freeze under time pressure? [[academy.hq.modes.wordcraft]].', 'Energy dip after lunch? [[academy.hq.modes.blast]].'] },
      { t: 'tip', text: 'When your list has definitions, Teacher HQ marks the best fit for those words, so you can just follow the recommendation.' },
    ],
  },
  'run-the-room': {
    title: 'Run the room during a live game',
    summary: 'Pause, add time, end a round, switch the game, or remove a player, all from the bar at the bottom of your screen.',
    keywords: 'pause, add time, end round, timer, switch game, remove student, late join, controls, host, end game',
    blocks: [
      { t: 'p', text: 'Once the game starts, your screen becomes the scoreboard for the room: the code stays at the top for late arrivals, the clock is in the middle and the leaderboard updates live.' },
      {
        t: 'steps',
        items: [
          { title: 'Check the settings before you start', body: 'The bar at the bottom of the lobby shows the game, the timer, the board size and whether late joining is on. Press [[education.modePicker.change]] to swap the game; the code stays the same.', shot: 'lobby-controls' },
          { title: 'Steer the round', body: 'During play, [[education.liveControls.pause]] freezes the clock for everyone, **+30s** buys more time, and [[education.liveControls.endRound]] finishes early (tap twice so it never happens by accident).', shot: 'live-host' },
          { title: 'Handle a player', body: 'Open the player count on the left to see who is playing and who looks stuck. You can remove a player from this game; they cannot rejoin it.' },
          { title: 'Go again or wrap up', body: 'On the results screen, [[education.results.playAgain]] replays with the same words and the same code. [[eduLive.results.switchGame]] picks a different mode. [[eduLive.results.backToClass]] takes you back to Teacher HQ.', shot: 'results' },
        ],
      },
      { t: 'tip', text: 'Leaving with Back to class asks you to confirm, because ending the game closes the room for every student. Students mid-word will thank you for the second tap.' },
      { t: 'pro', text: 'Teacher Pro adds calm mode: you choose whether students see the timer, the live leaderboard and the speed bonus. Useful for anxious students and for tests.' },
    ],
  },
  'assign-homework': {
    title: 'Assign homework students play on their own',
    summary: 'Pick a word list, choose the kind of practice, set a due date. Students play it from their class page whenever they like.',
    keywords: 'homework, assignment, assign, due date, practice mode, duel challenge, wordcraft, async, independent practice',
    blocks: [
      { t: 'p', text: 'Homework uses the same word lists as your live games. Students find it on their class page, so there is nothing new to explain.' },
      {
        t: 'steps',
        items: [
          { title: 'Open Create Assignment', body: 'In Teacher HQ, open [[teacher.dashboard.tools]] and press [[teacher.assignment.create]]. You can also start it from the class checklist the first time.', shot: 'class-tools' },
          { title: 'Pick the word list', body: 'Choose the lesson the homework should practise. Any list you made, pasted or saved from a starter pack shows up here.' },
          { title: 'Choose the kind of practice', body: '**WordCraft** (recommended) is solo play against a friendly bot. [[teacher.assignment.practiceMode]] drills the words, and [[teacher.assignment.duelChallenge]] pairs students up.', shot: 'assign-type' },
          { title: 'Set what it drills', body: 'With [[teacher.assignment.practiceMode]] you can pick a [[teacher.assignment.focus.label]] such as definitions, synonyms or context clues, or leave it on [[teacher.assignment.focus.any]]. A skill unlocks once enough words in the list have that detail.', shot: 'assign-focus' },
          { title: 'Set the due date and assign', body: 'Pick [[teacher.assignment.dueDate]] with one tap (today, tomorrow, next week) or choose a date, add optional instructions, then press [[teacher.assignment.create]].' },
        ],
      },
      { t: 'tip', text: 'To see who has finished, open [[teacher.dashboard.tools]] and then [[eduHq.tools.assignments]]. Assignments are sorted into active, overdue and completed.' },
      { t: 'pro', text: 'Free plan: {assignments} assignments per class. Teacher Pro makes it unlimited.' },
    ],
  },
};
