import type { HelpLocaleContent, HelpQuickAnswer } from '../helpTypes';

export const svT: HelpLocaleContent = {
  'first-live-game-in-5-minutes': {
    title: 'Ditt första livespel på 5 minuter',
    summary: 'Från inloggning till en klass som jublar vid prispallen, utan förberedelser. Gör det en gång så behöver du aldrig den här sidan igen.',
    keywords: 'första lektionen, snabbstart, nybörjare, kom igång, genomgång, fem minuter, demo, första gången',
    blocks: [
      { t: 'p', text: 'Du behöver: en skärm som klassen ser, din egen enhet och elever med mobiler, surfplattor eller datorer. Du behöver ingen klass, elevlista eller ordlista.' },
      {
        t: 'steps',
        items: [
          { time: '0:00', title: 'Öppna Lärarbasen', body: 'Logga in i [Lärarbasen](app:/teacher). Du hamnar på [[teacher.nav.play]].' },
          { time: '0:30', title: 'Välj spel och ord', body: 'Tryck på [[academy.hq.modes.classic]] och en av startlistorna under affischerna. De är redo att spelas.', shot: 'hq-start-game' },
          { time: '1:00', title: 'Kör igång och visa på tavlan', body: 'Tryck på [[teacher.playNow.goLive]] och visa din skärm på tavlan. Lobbyn visar en stor kod, länken och en QR-kod.', shot: 'lobby' },
          { time: '1:30', title: 'Eleverna går med', body: 'De skannar QR-koden eller skriver koden på lexiclash.live/join och väljer ett namn. Se namnen flyga in.' },
          { time: '2:00', title: 'Spela en runda', body: 'Tryck på [[hostView.startClassGame]]. En runda [[academy.hq.modes.classic]] tar tre minuter. Din skärm visar klockan och topplistan live.', shot: 'live-host' },
          { time: '5:00', title: 'Fira, och kör igen', body: 'Prispallen visas. Tryck på [[education.results.playAgain]] för en runda till med samma kod, eller på [[eduLive.results.backToClass]] för att avsluta.' },
        ],
      },
      { t: 'tip', text: 'Eleverna kommer in i olika takt. Tryck på [[tvLobby.tryPracticeRound]] medan ni väntar, så ser klassen två botar spela och lär sig reglerna utan att du säger ett ord.' },
    ],
  },
  'five-minute-vocab-warm-up': {
    title: 'En glosuppvärmning på 5 minuter',
    summary: 'En lektionsstart som kollar betydelse, inte bara stavning: Ordquiz på orden du gick igenom i går.',
    keywords: 'lektionsstart, uppvärmning, startuppgift, repetition, glosquiz, betydelser, förklaringar',
    blocks: [
      { t: 'p', text: 'Det här fungerar bäst med en lista som har förklaringar. Din egen lista är perfekt; en lista med betydelser från biblioteket går också bra.' },
      {
        t: 'steps',
        items: [
          { time: 'Före lektionen', title: 'Ta fram en lista med betydelser', body: 'Öppna [[teacher.nav.lessons]] och välj en lista som visar förklaringar, eller lägg till betydelser i din egen med rader som **ord - betydelse**.' },
          { time: '0:00', title: 'Välj Ordquiz', body: 'Tryck på [[academy.hq.modes.vocabQuiz]] och din lista i Lärarbasen, och sedan på [[teacher.playNow.goLive]]. Låt lobbyn stå på tavlan medan eleverna kommer in.' },
          { time: '0:30', title: 'Starta när de flesta är inne', body: 'Sen anslutning är på som standard, så eftersläntrare kan fortfarande gå med. Tryck på [[hostView.startClassGame]].' },
          { time: '1:00', title: 'Låt quizet rulla', body: 'Fyra alternativ per ord; snabbaste rätta svaret ger mest poäng. Du kan gå runt i klassrummet under tiden.' },
          { time: '4:30', title: 'Gå igenom resultaten tillsammans', body: 'Peka på orden klassen missade och ge betydelsen med en mening var. Det är din minilektion.', shot: 'results' },
        ],
      },
      { t: 'tip', text: 'Har du elever med prestationsångest? Med lugnt läge i Teacher Pro kan du dölja timern och topplistan men behålla quizet.' },
    ],
  },
  'homework-in-3-minutes': {
    title: 'Kvällens läxa på 3 minuter',
    summary: 'Välj en lista, dela ut WordCraft, klart till i morgon. Eleverna spelar från sin klassida; du ser vem som är klar.',
    keywords: 'läxa, uppgift, snabbt, i kväll, klart i morgon, självständig övning',
    blocks: [
      {
        t: 'steps',
        items: [
          { time: '0:00', title: 'Ha orden redo', body: 'Använd en lista ni spelade på lektionen, eller klistra in en ny. Se [gör en ordlista](help:make-a-word-list).' },
          { time: '1:00', title: 'Skapa uppgiften', body: 'Öppna [[teacher.dashboard.tools]] i Lärarbasen och tryck på [[teacher.assignment.create]]. Välj listan.', shot: 'class-tools' },
          { time: '1:30', title: 'Behåll det rekommenderade spelet', body: 'Låt **WordCraft** vara valt: eleverna spelar själva mot en vänlig bot, vilket passar bra som läxa.', shot: 'assign-type' },
          { time: '2:00', title: 'Klart i morgon, och dela ut', body: 'Under [[teacher.assignment.dueDate]] trycker du på i morgon, lägger till en rad instruktioner om du vill och trycker på [[teacher.assignment.create]].' },
          { time: '3:00', title: 'Kolla läget i morgon', body: 'Öppna [[teacher.dashboard.tools]] och sedan [[eduHq.tools.assignments]] för att se aktiva, försenade och klara uppgifter.' },
        ],
      },
      { t: 'tip', text: 'Elever som har gått med i din klass hittar läxan på sin klassida. Nya elever kan gå med när som helst med klasskoden.' },
      { t: 'pro', text: 'Gratisplanen: {assignments} uppgifter per klass. Behöver du fler? Med Teacher Pro är läxorna obegränsade.' },
    ],
  },
  'reteach-missed-words': {
    title: 'Repetera orden klassen missade',
    summary: 'Gör orden som ingen hittade till morgondagens uppvärmning och kvällens läxa. En femminutersloop som får orden att fastna.',
    keywords: 'repetera, missade ord, repetition, repetition med mellanrum, svåra ord, kämpar, stödundervisning, uppföljning',
    blocks: [
      {
        t: 'steps',
        items: [
          { time: '0:00', title: 'Hitta de missade orden', body: 'Efter ett livespel visar resultaten vilka lektionsord ingen hittade. Skriv upp dem eller ta en bild.', shot: 'results' },
          { time: '1:00', title: 'Titta på klasskortet', body: 'Under [[teacher.nav.classes]] visar varje klasskort de svåra orden från de senaste spelen och föreslår att ni övar på dem.' },
          { time: '2:00', title: 'Gör en kort lista', body: 'Tryck på [[teacher.playNow.changeWords]] i Lärarbasen, sedan [[teacher.playNow.sourcePaste]], och klistra in bara de orden. Fem till tio räcker gott.', shot: 'hq-paste-words' },
          { time: '3:00', title: 'Värm upp med dem i morgon', body: 'Börja morgondagens lektion med [[academy.hq.modes.wordHunt]] på den listan: klassen tävlar om att hitta precis de ord de missade.' },
          { time: '4:00', title: 'Skicka hem dem också', body: 'Dela ut samma lista som läxa så att varje elev möter orden en gång till på egen hand.' },
        ],
      },
      { t: 'pro', text: 'Teacher Pro sköter loopen åt dig: ordbehärskning visar vilka ord klassen fortsätter att missa i alla spel, och repetitionsrundor med mellanrum tar tillbaka missade ord efter några dagar.' },
    ],
  },
};

export const svQuick: HelpQuickAnswer[] = [
  { q: 'Behöver eleverna ett konto?', a: 'Nej. Eleverna går med med en sexteckenskod, en länk eller en QR-kod och väljer ett namn. Ingen mejl, inget lösenord, ingen app.', slug: 'how-students-join' },
  { q: 'Är LexiClash gratis för lärare?', a: 'Ja. Gratisplanen har inget slutdatum och räcker till {classes} klasser med upp till {students} elever, livespel, ordlistor och läxor. Teacher Pro är frivilligt.', slug: 'teacher-pro-and-trial' },
  { q: 'Hur många elever kan spela ett livespel?', a: 'Upp till {players} elever i ett livespel, både med gratisplanen och med Pro.', slug: 'start-a-live-game' },
  { q: 'Vilka enheter fungerar?', a: 'Alla mobiler, surfplattor, Chromebooks och datorer med en modern webbläsare. Eleverna öppnar en webbsida; inget behöver installeras.', slug: 'how-students-join' },
  { q: 'Kan jag använda mina egna glosor?', a: 'Ja. Klistra in orden, lägg till betydelser om du vill ha quizlägen och använd listan till livespel och läxor.', slug: 'make-a-word-list' },
  { q: 'Vad kostar Teacher Pro?', a: '{price} i månaden efter {trialDays} dagars gratis provperiod. Säger du upp innan provperioden är slut betalar du inget. Eleverna är alltid gratis.', slug: 'teacher-pro-and-trial' },
];
