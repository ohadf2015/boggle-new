import type { HelpLocaleContent } from '../helpTypes';

export const svA: HelpLocaleContent = {
  'create-teacher-account': {
    title: 'Skapa ditt gratis lärarkonto',
    summary: 'Registrera dig med Google eller en engångslänk via mejl, bli godkänd direkt och hamna i Lärarbasen. Ungefär en minut, inget kort.',
    keywords: 'registrera, skapa konto, logga in, konto, lärarbehörighet, godkännande, lösenord, google, inloggningslänk',
    blocks: [
      { t: 'p', text: 'Eleverna behöver aldrig ett konto. Det gör du, så att dina klasser, ordlistor och resultat sparas på ett ställe. Det är gratis, och gratisplanen har inget slutdatum.' },
      {
        t: 'steps',
        items: [
          { title: 'Öppna lärarregistreringen', body: 'Gå till [Lärarbasen](app:/teacher) och välj [[education.access.auth_required_cta]]. Har du redan ett LexiClash-konto väljer du [[education.access.auth_signin_cta]] i stället.' },
          { title: 'Välj hur du loggar in', body: '[[auth.continueWithGoogle]] går snabbast. Föredrar du mejl? Skriv din skoladress så skickar vi en engångslänk, så du slipper komma ihåg ett lösenord. Du kan fortfarande välja [[auth.magicLink.usePassword]].', shot: 'teacher-signup' },
          { title: 'Bli godkänd', body: 'Lärarbehörigheten godkänns direkt. Ingen kö, och ingen ringer upp dig.' },
          { title: 'Möt Lärarbasen', body: 'Du hamnar på [[teacher.nav.play]] med ett spel redo att starta. Menyn vid sidan (eller längst ner på mobilen) innehåller [[teacher.nav.classes]], [[teacher.nav.lessons]], [[teacher.nav.reports]] och [[teacher.nav.me]].', shot: 'hq-overview' },
        ],
      },
      { t: 'tip', text: 'Du behöver inte förbereda något inför ditt första spel. Tryck på [[teacher.playNow.goLive]] så skapar LexiClash en klass åt dig medan koden dyker upp på tavlan.' },
      { t: 'pro', text: 'Gratisplanen räcker till {classes} klasser med upp till {students} elever i varje. Teacher Pro är frivilligt och blir aktuellt först när du har fler grupper eller vill ha mer detaljerade rapporter.' },
    ],
  },
  'create-a-class': {
    title: 'Skapa en klass och få klasskoden',
    summary: 'Gör en klass per grupp du undervisar. Varje klass får en egen sexteckenskod, elevlista och egna resultat.',
    keywords: 'ny klass, grupp, elevlista, klasskod, byta namn, ta bort klass, google classroom',
    blocks: [
      { t: 'p', text: 'En klass håller ihop en grupp: eleverna som har gått med, läxorna du delar ut och alla spelresultat. Har du tre grupper? Skapa tre klasser så blandas rapporterna aldrig ihop.' },
      {
        t: 'steps',
        items: [
          { title: 'Öppna Klasser', body: 'Öppna [[teacher.nav.classes]] i Lärarbasen. Där ser du alla dina klasser med kod och antal elever.' },
          { title: 'Skapa klassen', body: 'Tryck på [[teacher.onboardingChecklist.createClassroomCta]], ge den ett namn eleverna känner igen (till exempel ”7B engelska”) och välj vilket språk klassen spelar på.', shot: 'create-class' },
          { title: 'Dela koden', body: 'Det nya klasskortet visar koden. Använd [[teacher.classroom.copyCode]] för att klistra in den i klassens chatt, eller visa den på tavlan från [[teacher.nav.play]].' },
          { title: 'Ändra eller städa senare', body: 'Menyn **⋯** på klasskortet har [[teacher.classroom.edit]], [[teacher.classroom.googleClassroom]] och [[teacher.classroom.delete]].', shot: 'classes-actions' },
        ],
      },
      { t: 'tip', text: 'Klassens språk spelar roll: det är språket klassen spelar på. En spanskklass spelar med spanska ord även om din egen skärm är på svenska.' },
      { t: 'pro', text: 'Gratisplanen: upp till {classes} klasser med upp till {students} elever i varje. Teacher Pro tar bort båda gränserna.' },
    ],
  },
  'start-a-live-game': {
    title: 'Starta ett livespel med ett tryck',
    summary: 'Välj spel, välj ord, tryck Kör igång. Koden står på tavlan innan klassen har hunnit sätta sig.',
    keywords: 'kör igång, livespel, starta spel, projektor, klasspel, spela nu',
    blocks: [
      { t: 'p', text: 'I ett livespel spelar hela klassen samtidigt från sina egna enheter medan tavlan visar koden, klockan och topplistan. Allt börjar på [[teacher.nav.play]] i Lärarbasen.' },
      {
        t: 'steps',
        items: [
          { title: 'Välj spel', body: 'Under [[academy.hq.startTitle]] trycker du på en affisch. Osäker? [[academy.hq.modes.classic]] fungerar med alla ordlistor; [[academy.hq.modes.vocabQuiz]] kräver ord med förklaringar.', shot: 'hq-start-game' },
          { title: 'Välj ord', body: 'Tryck på en av dina listor under affischerna, eller på [[teacher.playNow.changeWords]] för [[teacher.playNow.sourcePacks]] eller [[teacher.playNow.sourcePaste]].' },
          { title: 'Tryck Kör igång', body: 'Tryck på [[teacher.playNow.goLive]]. LexiClash förbereder klassen, laddar orden och öppnar rummet. Lobbyn fyller skärmen med koden, länken och en QR-kod.', shot: 'lobby' },
          { title: 'Starta när de är inne', body: 'Namnen dyker upp i lobbyn när eleverna går med. [[hostView.startClassGame]] låses upp så fort minst en elev är inne. Tryck, så börjar rundan på alla enheter samtidigt.' },
        ],
      },
      { t: 'tip', text: 'Vill du visa klassen vad som väntar? Tryck på [[tvLobby.tryPracticeRound]] i lobbyn. Två botar spelar en kort runda på tavlan medan du förklarar, och inget räknas in i klassens resultat.' },
    ],
  },
  'how-students-join': {
    title: 'Så går eleverna med (kod, länk eller QR)',
    summary: 'Eleverna skriver en sexteckenskod, öppnar din länk eller skannar QR-koden och väljer ett namn. Inga konton, ingen mejl, ingen app.',
    keywords: 'klasskod, elevinloggning, qr-kod, länk, inget konto, gå med, elev kommer inte in, fel kod',
    blocks: [
      { t: 'p', text: 'Att gå med tar ungefär tio sekunder på mobil, surfplatta, Chromebook eller dator. Det fungerar i alla moderna webbläsare.' },
      {
        t: 'steps',
        items: [
          { title: 'Visa koden där alla ser den', body: 'I Lärarbasen visar kortet [[academy.hq.getStudentsIn]] koden. [[academy.hq.openProjector]] ger en stor helskärmsversion, [[academy.hq.qr]] en kod att skanna och [[academy.hq.copyLink]] en länk till klasschatten eller lärplattformen.', shot: 'hq-get-students-in' },
          { title: 'Eleverna öppnar sidan', body: 'De går till **lexiclash.live/join** och skriver de sex tecknen, eller öppnar länken eller skannar QR-koden, som fyller i koden åt dem.' },
          { title: 'Eleverna väljer ett namn', body: 'De ser vilken klass de går med i, skriver ett namn (eller trycker på tärningen för ett slumpat) och trycker [[education.student.join.flow.go]]. Klart.', shot: 'student-join' },
          { title: 'Se listan fyllas på', body: 'Varje elev dyker upp på din skärm. Elever som går med i en klass på det här sättet hamnar på klassens elevlista, så deras resultat kommer med i dina rapporter.' },
        ],
      },
      { t: 'tip', text: 'Be eleverna använda förnamn eller smeknamnet ni använder i klassen. Alla ser namnen på topplistan, så det är också ett bra tillfälle att påminna om god ton.' },
      { t: 'h2', text: 'Om en elev inte kommer in' },
      { t: 'list', items: ['Kontrollera koden: sex bokstäver och siffror, och under ett spel är det koden i livelobbyn som gäller.', 'Be eleven ladda om sidan. En halvladdad sida på skolans wifi är den vanligaste boven.', 'Har du avslutat spelet är rummet stängt. Tryck på [[teacher.playNow.goLive]] igen och dela den nya koden.'] },
    ],
  },
  'choose-a-game-mode': {
    title: 'Vilket spel ska jag välja?',
    summary: 'Sex livespel som är bra på olika saker. Här ser du vad vart och ett tränar och när du ska ta fram det.',
    keywords: 'spellägen, ordarenan, klassisk, ordquiz, blast, ordjakt, wordcraft, wheel rush, vilket läge, skillnad',
    blocks: [
      { t: 'p', text: 'Alla lägen spelas med ordlistan du har valt, och alla fungerar med samma kod. Du kan byta mellan dem under lektionen utan att någon behöver gå med igen.' },
      {
        t: 'list',
        items: [
          '[[academy.hq.modes.classic]]: ett gemensamt bokstavsrutnät där eleverna drar fram alla ord de hittar. Perfekt för stavning och ordbyggande med vilken lista som helst. Tre minuter som standard.',
          '[[academy.hq.modes.vocabQuiz]]: fyra alternativ, en betydelse; snabbaste rätta svaret ger mest poäng. Bäst för att kolla betydelse. Kräver en lista med förklaringar.',
          '[[academy.hq.modes.blast]]: snabba rundor där orden sätter igång kedjereaktioner. Ren energi en fredag eller de sista tio minuterna.',
          '[[academy.hq.modes.wordHunt]]: klassen tävlar om att gräva fram listans ord i rutnätet. Bra för helt nya ord.',
          '[[academy.hq.modes.wordcraft]]: varje elev bygger listord på sin egen bräda mot Baronen, och klassens topplista avgör resten. Lugnare, och bra i blandade grupper.',
          '[[teacher.classroom.gameModes.wheelRush]]: snurra bokstavshjulet och avfyra ord mot klockan. Snabbt och högljutt.',
        ],
      },
      { t: 'shot', id: 'lobby-switch-game', caption: 'I lobbyn byter Byt spel läge men behåller samma kod.' },
      { t: 'h2', text: 'En enkel tumregel' },
      { t: 'list', items: ['Tränar ni betydelse? Börja med [[academy.hq.modes.vocabQuiz]].', 'Tränar ni stavning eller ordfamiljer? [[academy.hq.modes.classic]] eller [[academy.hq.modes.wordHunt]].', 'Elever som låser sig under tidspress? [[academy.hq.modes.wordcraft]].', 'Energidipp efter lunch? [[academy.hq.modes.blast]].'] },
      { t: 'tip', text: 'När listan har förklaringar markerar Lärarbasen vilket spel som passar orden bäst, så du kan bara följa rekommendationen.' },
    ],
  },
  'run-the-room': {
    title: 'Styr rummet under ett livespel',
    summary: 'Pausa, lägg till tid, avsluta en runda, byt spel eller ta bort en spelare, allt från listen längst ner på skärmen.',
    keywords: 'pausa, mer tid, avsluta runda, timer, byt spel, ta bort elev, sen anslutning, kontroller, avsluta spel',
    blocks: [
      { t: 'p', text: 'När spelet startar blir din skärm rummets resultattavla: koden ligger kvar högst upp för de som kommer sent, klockan står i mitten och topplistan uppdateras live.' },
      {
        t: 'steps',
        items: [
          { title: 'Kolla inställningarna innan start', body: 'Listen längst ner i lobbyn visar spelet, timern, brädans storlek och om sen anslutning är på. Tryck på [[education.modePicker.change]] för att byta spel; koden är densamma.', shot: 'lobby-controls' },
          { title: 'Styr rundan', body: 'Under spelet fryser [[education.liveControls.pause]] klockan för alla, **+30s** ger mer tid och [[education.liveControls.endRound]] avslutar i förtid (tryck två gånger, så händer det aldrig av misstag).', shot: 'live-host' },
          { title: 'Hantera en spelare', body: 'Öppna spelarräknaren för att se vem som spelar och vem som verkar ha fastnat. Du kan ta bort en spelare från det här spelet; hen kan inte gå med i det igen.' },
          { title: 'Kör igen eller runda av', body: 'På resultatskärmen spelar [[education.results.playAgain]] igen med samma ord och samma kod. [[eduLive.results.switchGame]] väljer ett annat läge. [[eduLive.results.backToClass]] tar dig tillbaka till Lärarbasen.', shot: 'results' },
        ],
      },
      { t: 'tip', text: 'Att gå tillbaka till klassen kräver en bekräftelse, eftersom spelet då stängs för alla elever. Den som är mitt i ett ord tackar dig för det andra trycket.' },
      { t: 'pro', text: 'Teacher Pro ger dig lugnt läge: du bestämmer om eleverna ser timern, topplistan och hastighetsbonusen. Bra för elever med prestationsångest och vid prov.' },
    ],
  },
  'assign-homework': {
    title: 'Dela ut läxor som eleverna spelar själva',
    summary: 'Välj ordlista, välj typ av övning och sätt ett slutdatum. Eleverna spelar från sin klassida när det passar dem.',
    keywords: 'läxa, uppgift, dela ut, slutdatum, övningsläge, duell, wordcraft, självständig övning',
    blocks: [
      { t: 'p', text: 'Läxorna använder samma ordlistor som livespelen. Eleverna hittar dem på sin klassida, så det finns inget nytt att förklara.' },
      {
        t: 'steps',
        items: [
          { title: 'Öppna Skapa uppgift', body: 'Öppna [[teacher.dashboard.tools]] i Lärarbasen och tryck på [[teacher.assignment.create]]. Första gången kan du också börja från klassens checklista.', shot: 'class-tools' },
          { title: 'Välj ordlista', body: 'Välj lektionen som läxan ska träna. Alla listor du har gjort, klistrat in eller sparat från ett startpaket finns här.' },
          { title: 'Välj typ av övning', body: '**WordCraft** (rekommenderas) är solospel mot en vänlig bot. [[teacher.assignment.practiceMode]] drillar orden och [[teacher.assignment.duelChallenge]] parar ihop elever.', shot: 'assign-type' },
          { title: 'Bestäm vad som tränas', body: 'Med [[teacher.assignment.practiceMode]] kan du välja [[teacher.assignment.focus.label]], till exempel förklaringar, synonymer eller ledtrådar i sammanhang, eller låta det stå på [[teacher.assignment.focus.any]]. En färdighet låses upp när tillräckligt många ord i listan har den detaljen.', shot: 'assign-focus' },
          { title: 'Sätt slutdatum och dela ut', body: 'Välj [[teacher.assignment.dueDate]] med ett tryck (i dag, i morgon, nästa vecka) eller ett eget datum, lägg till instruktioner om du vill och tryck på [[teacher.assignment.create]].' },
        ],
      },
      { t: 'tip', text: 'För att se vem som är klar öppnar du [[teacher.dashboard.tools]] och sedan [[eduHq.tools.assignments]]. Uppgifterna sorteras i aktiva, försenade och klara.' },
      { t: 'pro', text: 'Gratisplanen: {assignments} uppgifter per klass. Med Teacher Pro är det obegränsat.' },
    ],
  },
};
