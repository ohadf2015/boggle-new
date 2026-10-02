import type { HelpLocaleContent } from '../helpTypes';

export const svB: HelpLocaleContent = {
  'read-class-reports': {
    title: 'Läs din klassrapport',
    summary: 'En sida per klass: vem som gjort läxan, vem som klättrar eller har fastnat, hur senaste spelet gick och vilka ord du ska repetera.',
    keywords: 'rapporter, framsteg, statistik, resultat, csv, export, pdf, skriva ut, ordbehärskning, elever som kämpar, betyg',
    blocks: [
      { t: 'p', text: 'Öppna [[teacher.nav.reports]] i Lärarbasen och välj en klass. Varje spel och varje avklarad uppgift matar sidan, så den fyller i sig själv medan du undervisar.' },
      { t: 'shot', id: 'reports-class', caption: 'En klassrapport. Varje del öppnas med ett tryck.' },
      { t: 'h2', text: 'Vad varje del berättar' },
      {
        t: 'list',
        items: [
          '[[eduPro.reports.assignmentsTitle]]: vem som har gjort varje uppgift, med CSV-export till din betygsbok.',
          '[[eduPro.reports.arcTitle]]: vem som klättrar, vem som har fastnat och vilka ord som håller dem tillbaka. Tryck på ett namn för elevens egen sida.',
          '[[teacher.lastGame.title]]: vad som hände i ditt senaste livespel, i en överblick.',
          '[[teacher.reports.sections.wordMastery]] (Pro): orden klassen fortsätter att missa, i alla spel. Fylls i efter en runda [[academy.hq.modes.vocabQuiz]] eller [[academy.hq.modes.wordcraft]].',
          '[[eduPro.reports.moreDetail]] (Pro): en utskriftsklar rapport med detaljer per elev, export av alla dina klasser och betygsöverföring till Google Classroom.',
        ],
      },
      { t: 'tip', text: 'Fem sekunder innan det ringer: öppna rapporten, titta på eleverna som har fastnat och de svåraste orden, så vet du exakt vad morgondagens uppvärmning blir.' },
      { t: 'pro', text: 'Med gratisplanen får du delarna om uppgifter, elever och senaste spelet. Ordbehärskning och den fullständiga utskrivbara rapporten ingår i Teacher Pro, som du kan testa gratis i {trialDays} dagar.' },
    ],
  },
  'after-the-game': {
    title: 'Läs resultatskärmen efter ett spel',
    summary: 'Resultatskärmen visar prispallen, vilka lektionsord klassen hittade och vilka de missade, och ditt nästa drag.',
    keywords: 'resultat, prispall, efter spelet, lektionsord, missade ord, spela igen, vinnare, topplista',
    blocks: [
      { t: 'p', text: 'När en runda är slut växlar tavlan till resultaten. Låt dem stå en stund: eleverna älskar att se prispallen, och du får en snabb bild av orden.' },
      { t: 'shot', id: 'results', caption: 'Resultaten efter en övningsrunda. Med elever i rummet visas prispallen vid sidan.' },
      {
        t: 'list',
        items: [
          '**Prispallen**: rundans bästa spelare och deras poäng.',
          '**Hittade lektionsord**: hur många av listans ord klassen hittade, och vilka ingen hittade. Det är dina repetitionsord.',
          '[[education.results.playAgain]]: samma ord, samma kod, ingen behöver gå med igen. Perfekt när första rundan var uppvärmning.',
          '[[eduLive.results.switchGame]]: behåll rummet och orden, testa ett annat läge.',
          '[[eduLive.results.backToClass]]: stäng rummet och gå tillbaka till Lärarbasen.',
        ],
      },
      { t: 'tip', text: 'Ord som ingen hittade i ett livespel blir en utmärkt läxlista. Se [hur du repeterar missade ord](help:reteach-missed-words).' },
      { t: 'pro', text: 'Med Teacher Pro öppnar resultatskärmen den fullständiga rapporten för spelet.' },
    ],
  },
  'make-a-word-list': {
    title: 'Gör en ordlista (med förklaringar)',
    summary: 'Klistra in dina ord, lägg till betydelser om du vill ha quizlägen och spara. En lista fungerar både för livespel och läxor.',
    keywords: 'ordlista, lektion, glosor, skapa lista, förklaringar, csv, importera, klistra in, ai, synonymer, exempel',
    blocks: [
      { t: 'p', text: 'En ordlista (kallas också lektion) är orden som ett spel eller en läxa använder. Du kan klistra in en på tio sekunder, eller bygga en rikare lista som låser upp fler övningstyper.' },
      {
        t: 'steps',
        items: [
          { title: 'Öppna dina listor', body: 'Gå till [[teacher.nav.lessons]], byt till [[eduLibrary.tabs.mine]] och tryck på [[eduLibrary.editor.newList]].' },
          { title: 'Klistra in eller skriv orden', body: 'Separera orden med kommatecken eller skriv ett per rad. Skriv **ord - betydelse** för att lägga till en förklaring direkt. Du kan också importera en CSV- eller TSV-fil, eller utgå från ett startpaket.', shot: 'word-list-editor' },
          { title: 'Fyll i detaljerna', body: 'Byt till [[eduLibrary.editor.view.details]] för att lägga till betydelser, synonymer, antonymer och exempelmeningar. AI-knappen kan föreslå det som saknas; granska innan du sparar.' },
          { title: 'Spara och använd', body: 'Tryck på [[eduLibrary.editor.save]]. Listan finns nu under affischerna i Lärarbasen och i läxväljaren.' },
        ],
      },
      { t: 'tip', text: 'Bråttom? Tryck på [[teacher.playNow.changeWords]] i Lärarbasen, sedan [[teacher.playNow.sourcePaste]], och klistra in orden direkt. LexiClash sparar dem som en lista åt dig.' },
      { t: 'shot', id: 'hq-paste-words', caption: 'Ord inklistrade direkt i Lärarbasen.' },
      { t: 'h2', text: 'Därför lönar sig förklaringar' },
      { t: 'p', text: 'Ord med betydelser låser upp [[academy.hq.modes.vocabQuiz]] och läxor med förklaringar. Lägg till synonymer, antonymer, exempelmeningar eller orddelar på fyra eller fler ord så låses motsvarande läxfärdigheter upp också.' },
      { t: 'tip', text: 'Mycket långa ord följs upp i rapporterna men får inte alltid plats på en bokstavsbräda. Redigeraren markerar varje ord som ett som kan finnas med i spel eller ett som bara följs upp.' },
    ],
  },
  'use-the-library': {
    title: 'Hitta färdiga listor i biblioteket',
    summary: 'Ingen tid att skriva? Bläddra bland verifierade listor efter språk och ämne, öppna en och kör den live på några sekunder.',
    keywords: 'bibliotek, upptäck, färdiga listor, mallar, verifierade listor, startpaket, ämnen, andra lärare',
    blocks: [
      { t: 'p', text: '[[teacher.nav.lessons]] har två flikar: [[eduLibrary.tabs.discover]] för listor från LexiClash och andra lärare, och [[eduLibrary.tabs.mine]] för dina egna.' },
      {
        t: 'steps',
        items: [
          { title: 'Öppna Upptäck', body: 'Gå till [[teacher.nav.lessons]] och stanna på [[eduLibrary.tabs.discover]].', shot: 'library-discover' },
          { title: 'Smalna av', body: 'Sök på ett ämne eller ett ord och filtrera på språk. Välj [[eduLibrary.badge.verified]] för att bara se listor som LexiClash-teamet har granskat.' },
          { title: 'Öppna en lista och spela', body: 'Tryck på ett kort för att se alla ord och deras betydelser. Tryck sedan på [[eduLibrary.preview.host]] för att spela nu, [[eduLibrary.preview.assign]] för att dela ut den som läxa eller [[eduLibrary.preview.copy]] för att redigera en egen version.' },
        ],
      },
      { t: 'tip', text: 'Startpaket finns också ett tryck bort i Lärarbasen: tryck på [[teacher.playNow.changeWords]] och öppna [[teacher.playNow.sourcePacks]].' },
      { t: 'p', text: 'Listor du gör förblir privata om du inte slår på [[eduLibrary.share.toggle]] när du sparar. Delade listor visar bara ditt visningsnamn.' },
    ],
  },
  'student-privacy': {
    title: 'Elevernas integritet: vad de delar',
    summary: 'Eleverna går med med en kod och ett namn. Inget konto, ingen mejl, ingen reklam i klasspelet. Här är exakt vad som sparas och vem som ser det.',
    keywords: 'integritet, gdpr, coppa, data, elevdata, säkerhet, reklam, konton, radera, föräldrar, namn',
    blocks: [
      { t: 'p', text: 'LexiClash är byggt så att en klass kan spela utan att elevers personuppgifter samlas in. Det är ett designbeslut, inte en inställning du måste leta upp.' },
      {
        t: 'list',
        items: [
          '**Inga elevkonton.** Eleverna skriver klasskoden och väljer ett namn. Ingen mejl, inget lösenord och ingen födelsedag när de går med.',
          '**Namnet väljer de själva.** Förnamn eller ett smeknamn från klassen räcker. Du ser det på elevlistan; klasskamraterna ser det på topplistan.',
          '**Resultaten stannar i klassen.** Poäng och svar sparas i klassen så att du kan följa varje elevs utveckling.',
          '**Ingen reklam i klasspelet.** Anslutningssidan, klasspelen, elevsidorna och Lärarbasen visar ingen reklam.',
          '**Barns integritet.** Vår integritetspolicy förbinder oss att följa COPPA och liknande regler, och LexiClash säljer aldrig personuppgifter.',
        ],
      },
      { t: 'h2', text: 'Radera uppgifter' },
      { t: 'p', text: 'Du kan ta bort en klass via menyn **⋯** på dess kort under [[teacher.nav.classes]]. Föräldrar och vårdnadshavare kan be om att få se eller radera ett barns uppgifter genom att mejla lexiclash.game@gmail.com.' },
      { t: 'tip', text: 'Läs hela [integritetspolicyn](app:/legal/privacy) innan du inför LexiClash på hela skolan. Ert dataskyddsombud vill ha länken.' },
    ],
  },
  'support-core-challenge': {
    title: 'Nivåanpassa med Stöd, Bas och Utmaning',
    summary: 'Ge varje elev en nivå. Stöd ger en ordbank i livespel, Utmaning sträcker ut med svårare ord och ett mål med längre ord.',
    keywords: 'nivåanpassning, nivåer, stöd, särskilt stöd, åtgärdsprogram, utmaning, särbegåvade, blandade grupper, ordbank',
    blocks: [
      { t: 'p', text: 'Alla elever börjar på Bas. Ändra för den som behöver mer hjälp eller mer utmaning; nivån följer med eleven in i livespel och läxor.' },
      {
        t: 'steps',
        items: [
          { title: 'Öppna elevlistan', body: 'Öppna elevlistan på klasskortet under [[teacher.nav.classes]].' },
          { title: 'Välj nivå', body: 'Välj [[teacher.levels.support]], [[teacher.levels.core]] eller [[teacher.levels.challenge]] bredvid varje namn. Det sparas direkt.' },
          { title: 'Märk orden (valfritt)', body: 'I ordlistan kan varje ord markeras som Stöd, Bas eller Utmaning, så att varje grupp tränar orden som är tänkta för den.' },
        ],
      },
      {
        t: 'list',
        items: [
          '[[teacher.levels.support]]: ser en ordbank under livespel och tränar stöd- och basord.',
          '[[teacher.levels.core]]: standardnivån.',
          '[[teacher.levels.challenge]]: tränar alla ord, även utmaningsord, och får ett mål med längre ord.',
        ],
      },
      { t: 'tip', text: 'Du kan byta nivå när som helst, till exempel när en rapport visar att någon är redo för nästa steg.' },
    ],
  },
  'teacher-pro-and-trial': {
    title: 'Vad Teacher Pro ger (och provperioden)',
    summary: 'Gratis räcker för riktiga klasser. Pro är för fler grupper och djupare rapporter. {price}/månad, med {trialDays} dagars gratis provperiod.',
    keywords: 'pro, pris, kostnad, uppgradera, provperiod, gratisplan, gränser, betalt, prenumeration, vad kostar',
    blocks: [
      { t: 'p', text: 'De flesta lärare börjar gratis och fortsätter så i veckor. Pro behövs först när gratisgränserna börjar skava, eller när du vill se exakt vem som har fastnat på vilket ord.' },
      {
        t: 'list',
        items: [
          '**Gratis, för alltid**: {classes} klasser med upp till {students} elever, livespel med upp till {players} spelare, ordlistor, läxor ({assignments} per klass) och den grundläggande klassrapporten.',
          '**Teacher Pro**: obegränsat med klasser, elever och läxor, ordbehärskningsrapporter, den fullständiga utskrivbara rapporten, repetition av missade ord med mellanrum, lugnt läge och rapportlänkar till föräldrar.',
          '**Eleverna**: alltid gratis, på båda planerna, utan reklam.',
        ],
      },
      {
        t: 'steps',
        items: [
          { title: 'Öppna sidan med planer', body: 'Tryck på knappen [[academy.hq.proChip]] i Lärarbasen, eller öppna [Teacher Pro](app:/teacher/upgrade).' },
          { title: 'Starta provperioden', body: 'Tryck på **Starta {trialDays} dagars gratis provperiod**. Alla Pro-funktioner låses upp direkt.' },
          { title: 'Bestäm dig innan den tar slut', body: 'Behåller du den blir det {price}/månad. Säger du upp före dag {trialDays} debiteras du inget. En provperiod per konto.' },
        ],
      },
      { t: 'tip', text: 'Priserna anges i amerikanska dollar. Beroende på var du bor kan skatt tillkomma i kassan.' },
    ],
  },
  'cancel-or-change-plan': {
    title: 'Säg upp eller hantera din prenumeration',
    summary: 'Säg upp med några klick. Pro gäller till slutet av perioden du har betalat för, och inget i dina klasser raderas.',
    keywords: 'säga upp, återbetalning, betalning, kvitto, kort, nedgradera, hantera prenumeration, sluta betala',
    blocks: [
      {
        t: 'steps',
        items: [
          { title: 'Öppna sidan med planer', body: 'Öppna [Teacher Pro](app:/teacher/upgrade) medan du är inloggad.' },
          { title: 'Öppna betalningen', body: 'Tryck på **Hantera betalning**. Då öppnas betalsidan hos vår betalleverantör, där du kan byta kort, se kvitton eller säga upp.' },
          { title: 'Säg upp', body: 'Bekräfta uppsägningen. Pro fortsätter att gälla till slutet av perioden du redan har betalat för.' },
        ],
      },
      { t: 'h2', text: 'Vad händer med mina klasser?' },
      { t: 'p', text: 'Inget raderas. Klasser, ordlistor och elevhistorik finns kvar. Gratisgränserna gäller igen ({classes} klasser, {students} elever per klass) och Pro-rapporterna låses tills du kommer tillbaka.' },
      { t: 'tip', text: 'Du får ett påminnelsemejl före varje debitering, så en förnyelse kommer aldrig som en överraskning. Detaljerna finns i [villkoren för återbetalning och uppsägning](app:/legal/refund).' },
    ],
  },
  'school-pays': {
    title: 'Låt skolan betala för Pro',
    summary: 'Fråga skolan med en färdig förfrågan, eller få en offert för hela arbetslaget via mejl. Inget säljsamtal behövs.',
    keywords: 'skola, kommun, inköpsorder, offert, ämneslag, rektor, budget, faktura, ersättning',
    blocks: [
      { t: 'p', text: 'Många lärare vill helst inte betala ur egen ficka. Två sätt att skicka notan till skolan:' },
      {
        t: 'steps',
        items: [
          { title: 'Skicka rektorn en färdig förfrågan', body: 'På [Teacher Pro](app:/teacher/upgrade) trycker du på **Vill du att skolan betalar?** Då förbereds en kort förfrågan som du kan skicka till den som har budgeten.' },
          { title: 'Eller be om en offert för laget', body: 'Öppna fliken **För skolor** och tryck på **Begär skoloffert**. Berätta hur många lärare som behöver Pro; ett antal räcker.' },
          { title: 'Få offerten via mejl', body: 'Vi svarar med en offert till mejladressen du anger. Ingen ringer dig för att ge ett pris.' },
        ],
      },
      { t: 'p', text: 'Ska hela skolan eller kommunen börja med LexiClash? [Sidan för skolor](app:/education/for-schools) förklarar vad som ingår och hur du hör av dig.' },
    ],
  },
};
