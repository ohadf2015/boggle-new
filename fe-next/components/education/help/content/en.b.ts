import type { HelpLocaleContent } from '../helpTypes';

export const enB: HelpLocaleContent = {
  'read-class-reports': {
    title: 'Read your class report',
    summary: 'One page per class: who finished the homework, who is climbing or stuck, how the last game went, and which words to reteach.',
    keywords: 'reports, progress, analytics, results, csv, export, pdf, print, word mastery, struggling students, grades',
    blocks: [
      { t: 'p', text: 'Open [[teacher.nav.reports]] in Teacher HQ and pick a class. Every game and every finished assignment feeds this page, so it fills itself in as you teach.' },
      { t: 'shot', id: 'reports-class', caption: 'A class report. Each section opens with one tap.' },
      { t: 'h2', text: 'What each section tells you' },
      {
        t: 'list',
        items: [
          '[[eduPro.reports.assignmentsTitle]]: who has finished each assignment, with a CSV export for your gradebook.',
          '[[eduPro.reports.arcTitle]]: who is climbing, who is stuck and the words holding them back. Tap a name for that student\'s own page.',
          '[[teacher.lastGame.title]]: what happened in your most recent live game, at a glance.',
          '[[teacher.reports.sections.wordMastery]] (Pro): the words your class keeps missing, across every game. It fills in after a [[academy.hq.modes.vocabQuiz]] or [[academy.hq.modes.wordcraft]] round.',
          '[[eduPro.reports.moreDetail]] (Pro): a PDF-ready report with per-student detail, an export of all your classes, and grade passback to Google Classroom.',
        ],
      },
      { t: 'tip', text: 'Five seconds before the bell: open the report, look at the stuck students and the hardest words, and you know exactly what tomorrow\'s warm-up should be.' },
      { t: 'pro', text: 'Free teachers get the assignment, student and last-game sections. Word mastery and the full printable report are part of Teacher Pro, which you can try free for {trialDays} days.' },
    ],
  },
  'after-the-game': {
    title: 'Read the results screen after a game',
    summary: 'The results screen shows the podium, which lesson words the class found and which they missed, and your next move.',
    keywords: 'results, podium, after game, lesson words, missed words, play again, winner, leaderboard',
    blocks: [
      { t: 'p', text: 'When a round ends, your board switches to the results. Leave it up for a moment: students love seeing the podium, and you get a quick read on the words.' },
      { t: 'shot', id: 'results', caption: 'The results after a practice round. With students in the room, the podium sits on the left.' },
      {
        t: 'list',
        items: [
          '**The podium**: the top players of the round, with their scores.',
          '**Lesson words found**: how many of your list words the class found, and which ones nobody did. Those are your reteach words.',
          '[[education.results.playAgain]]: same words, same code, nobody rejoins. Perfect when the first round was a warm-up.',
          '[[eduLive.results.switchGame]]: keep the room and the words, try another mode.',
          '[[eduLive.results.backToClass]]: close the room and go back to Teacher HQ.',
        ],
      },
      { t: 'tip', text: 'Words nobody found in a live game are a great homework list. See [how to reteach missed words](help:reteach-missed-words).' },
      { t: 'pro', text: 'With Teacher Pro, the results screen opens the full report for that game.' },
    ],
  },
  'make-a-word-list': {
    title: 'Make a word list (with definitions)',
    summary: 'Paste your words, add meanings if you want quiz modes, save. A list works for live games and homework alike.',
    keywords: 'word list, lesson, vocabulary list, create list, definitions, csv, import, paste, ai, synonyms, examples',
    blocks: [
      { t: 'p', text: 'A word list (also called a lesson) is the words a game or homework uses. You can paste one in ten seconds, or build a richer one that unlocks more practice types.' },
      {
        t: 'steps',
        items: [
          { title: 'Open your lists', body: 'Go to [[teacher.nav.lessons]], switch to [[eduLibrary.tabs.mine]] and press [[eduLibrary.editor.newList]].' },
          { title: 'Paste or type the words', body: 'Separate words with commas or put one per line. Write **word - meaning** to add a definition as you go. You can also import a CSV or TSV file, or start from a starter pack.', shot: 'word-list-editor' },
          { title: 'Fill in the details', body: 'Switch to [[eduLibrary.editor.view.details]] to add meanings, synonyms, antonyms and example sentences. The AI button can suggest the missing ones; check them before you save.' },
          { title: 'Save and use it', body: 'Press [[eduLibrary.editor.save]]. The list now appears under the posters in Teacher HQ and in the homework picker.' },
        ],
      },
      { t: 'tip', text: 'In a hurry? In Teacher HQ, press [[teacher.playNow.changeWords]], then [[teacher.playNow.sourcePaste]], and drop your words straight in. LexiClash saves them as a list for you.' },
      { t: 'shot', id: 'hq-paste-words', caption: 'Pasting words straight into Teacher HQ.' },
      { t: 'h2', text: 'Why definitions are worth it' },
      { t: 'p', text: 'Words with meanings unlock [[academy.hq.modes.vocabQuiz]] and definition homework. Add synonyms, antonyms, example sentences or word parts to four or more words and the matching homework skills unlock too.' },
      { t: 'tip', text: 'Very long words are tracked in reports but may not fit on a letter board. The editor marks each word as one that can appear in games or one that is tracked only.' },
    ],
  },
  'use-the-library': {
    title: 'Find ready-made lists in the Library',
    summary: 'No time to type? Browse verified lists by language and topic, open one, and host it live in seconds.',
    keywords: 'library, discover, ready made, templates, verified lists, starter packs, topics, other teachers',
    blocks: [
      { t: 'p', text: 'The [[teacher.nav.lessons]] has two tabs: [[eduLibrary.tabs.discover]] for lists made by LexiClash and by other teachers, and [[eduLibrary.tabs.mine]] for your own.' },
      {
        t: 'steps',
        items: [
          { title: 'Open Discover', body: 'Go to [[teacher.nav.lessons]] and stay on [[eduLibrary.tabs.discover]].', shot: 'library-discover' },
          { title: 'Narrow it down', body: 'Search for a topic or a word, then filter by language. Choose [[eduLibrary.badge.verified]] to see only lists checked by the LexiClash team.' },
          { title: 'Open a list and play', body: 'Tap a card to see every word and its meaning. Then press [[eduLibrary.preview.host]] to play it now, [[eduLibrary.preview.assign]] to set it as homework, or [[eduLibrary.preview.copy]] to edit your own version.' },
        ],
      },
      { t: 'tip', text: 'Starter packs are also one tap away inside Teacher HQ: press [[teacher.playNow.changeWords]] and open [[teacher.playNow.sourcePacks]].' },
      { t: 'p', text: 'Lists you make stay private unless you switch on [[eduLibrary.share.toggle]] when saving. Shared lists show only your display name.' },
    ],
  },
  'student-privacy': {
    title: 'Student privacy: what students share',
    summary: 'Students join with a code and a name. No account, no email, no ads in classroom play. Here is exactly what is stored and who sees it.',
    keywords: 'privacy, coppa, data, student data, safety, ads, accounts, delete, parents, gdpr, names',
    blocks: [
      { t: 'p', text: 'LexiClash is built so a class can play without collecting student personal data. That is a design decision, not a setting you have to find.' },
      {
        t: 'list',
        items: [
          '**No student accounts.** Students type the class code and pick a name. There is no email, password or birthday in the join flow.',
          '**Names are what they choose.** A first name or a classroom nickname is enough. You see it on your roster; classmates see it on the leaderboard.',
          '**Results stay in your class.** Scores and answers are saved to the class so you can follow each student\'s progress.',
          '**No ads in classroom play.** The join page, class games, student pages and Teacher HQ do not show ads.',
          '**Children\'s privacy.** Our privacy policy commits to COPPA and similar rules, and LexiClash never sells personal data.',
        ],
      },
      { t: 'h2', text: 'Removing data' },
      { t: 'p', text: 'You can delete a class from the **⋯** menu on its card in [[teacher.nav.classes]]. Parents and guardians can ask us to review or delete a child\'s information by writing to lexiclash.game@gmail.com.' },
      { t: 'tip', text: 'Read the full [privacy policy](app:/legal/privacy) before you roll LexiClash out to a whole school. Your data protection lead will want the link.' },
    ],
  },
  'support-core-challenge': {
    title: 'Differentiate with Support, Core and Challenge',
    summary: 'Give each student a level. Support adds a word bank in live games, Challenge stretches with harder words and a longer-word target.',
    keywords: 'differentiation, levels, support, sped, iep, challenge, gifted, mixed ability, word bank',
    blocks: [
      { t: 'p', text: 'Every student starts on Core. Change it for anyone who needs more help or more stretch; the level follows them into live games and homework.' },
      {
        t: 'steps',
        items: [
          { title: 'Open the roster', body: 'In [[teacher.nav.classes]], open the student list on the class card.' },
          { title: 'Set the level', body: 'Next to each name, choose [[teacher.levels.support]], [[teacher.levels.core]] or [[teacher.levels.challenge]]. It saves straight away.' },
          { title: 'Tag the words (optional)', body: 'In your word list, each word can be marked Support, Core or Challenge, so each group practises the words meant for them.' },
        ],
      },
      {
        t: 'list',
        items: [
          '[[teacher.levels.support]]: sees a word bank during live games and practises support and core words.',
          '[[teacher.levels.core]]: the default.',
          '[[teacher.levels.challenge]]: practises all words, including challenge words, and gets a longer-word target.',
        ],
      },
      { t: 'tip', text: 'Change levels any time, for example after a report shows someone is ready to move up.' },
    ],
  },
  'teacher-pro-and-trial': {
    title: 'What Teacher Pro adds (and the free trial)',
    summary: 'Free covers real classes. Pro is for more sections and deeper reports. {price}/month, with a {trialDays}-day free trial.',
    keywords: 'pro, price, cost, upgrade, trial, free plan, limits, paid, subscription, how much',
    blocks: [
      { t: 'p', text: 'Most teachers start free and stay free for weeks. You only need Pro when the free limits pinch or when you want to see exactly who is stuck on which word.' },
      {
        t: 'list',
        items: [
          '**Free, forever**: {classes} classes of up to {students} students, live games with up to {players} players, word lists, homework ({assignments} per class) and the basic class report.',
          '**Teacher Pro**: unlimited classes, students and homework, word mastery reports, the full printable report, spaced review of missed words, calm mode and parent report links.',
          '**Students**: always free, on both plans, with no ads.',
        ],
      },
      {
        t: 'steps',
        items: [
          { title: 'Open the plans page', body: 'Press the [[academy.hq.proChip]] button in Teacher HQ, or open [Teacher Pro](app:/teacher/upgrade).' },
          { title: 'Start the trial', body: 'Press **Start {trialDays}-day free trial**. You get every Pro feature straight away.' },
          { title: 'Decide before it ends', body: 'Keep it and it becomes {price}/month. Cancel before day {trialDays} and you are not charged. There is one free trial per account.' },
        ],
      },
      { t: 'tip', text: 'Prices are in US dollars. Depending on where you live, tax may be added at checkout.' },
    ],
  },
  'cancel-or-change-plan': {
    title: 'Cancel or manage your subscription',
    summary: 'Cancel in a few clicks. Pro stays on until the end of the period you paid for, and nothing in your classes is deleted.',
    keywords: 'cancel, refund, billing, invoice, card, downgrade, manage subscription, stop paying',
    blocks: [
      {
        t: 'steps',
        items: [
          { title: 'Open the plans page', body: 'Open [Teacher Pro](app:/teacher/upgrade) while signed in.' },
          { title: 'Open billing', body: 'Press **Manage billing**. It opens the billing page of our payment provider, where you can change your card, see invoices or cancel.' },
          { title: 'Cancel', body: 'Confirm the cancellation. Pro stays active until the end of the period you have already paid for.' },
        ],
      },
      { t: 'h2', text: 'What happens to my classes?' },
      { t: 'p', text: 'Nothing is deleted. Your classes, word lists and student history stay. The free limits apply again ({classes} classes, {students} students per class) and the Pro reports lock until you come back.' },
      { t: 'tip', text: 'You get a reminder email before every charge, so a renewal never surprises you. The [refund and cancellation policy](app:/legal/refund) has the details.' },
    ],
  },
  'school-pays': {
    title: 'Get your school to pay for Pro',
    summary: 'Ask your school with a ready-made request, or get a quote for a whole team by email. No sales call needed.',
    keywords: 'school, district, purchase order, quote, department, principal, budget, invoice, reimbursement',
    blocks: [
      { t: 'p', text: 'Many teachers would rather not pay out of pocket. Two ways to hand the bill to your school:' },
      {
        t: 'steps',
        items: [
          { title: 'Send your principal a ready-made request', body: 'On [Teacher Pro](app:/teacher/upgrade), press **Want your school to pay?** It prepares a short request you can send to whoever holds the budget.' },
          { title: 'Or ask for a team quote', body: 'Open the **For schools** tab and press **Get a school quote**. Tell us how many teachers need Pro; a head count is enough.' },
          { title: 'Get the quote by email', body: 'We reply to the email you give us with a quote. Nobody calls you to get a number.' },
        ],
      },
      { t: 'p', text: 'Rolling out to a whole school or district? The [schools page](app:/education/for-schools) explains what is included and how to get in touch.' },
    ],
  },
};
