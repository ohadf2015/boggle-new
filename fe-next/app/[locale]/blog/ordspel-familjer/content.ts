// Swedish-first article — Ohad Fisher persona
// Native Swedish. Cultural tone: understatement, mysigt, lugn. No hyperbole.
// Non-SV locales fall back + noindex.

export type LocaleContent = {
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  authorName: string;
  authorBio: string;
  sections: Array<{
    title?: string;
    content: string;
  }>;
  backToBlog: string;
  playDaily: string;
  startPracticing: string;
};

export const contentByLocale: Record<string, LocaleContent> = {
  sv: {
    title: 'Ordspel för Familjer: Hur Vi Hittade Något Att Göra Tillsammans Som Faktiskt Funkar',
    subtitle: 'Inte ännu en app som stjäl skärmtid. En enkel form av spel som passar svenska familjer, från fyraåringar till mormor.',
    category: 'Familj',
    readTime: '9 minuters läsning',
    authorName: 'Ohad Fisher',
    authorBio: 'Spelar ord med sina barn varje söndag morgon. Påstår inte att det är livsförändrande. Bara att det är trevligt, och det räcker.',
    sections: [
      {
        content: `Det började med kaffet på söndag morgon. Min äldste, då nio år, satt vid bordet och tittade tomt på sin telefon. Min yngsta, sex år, försökte få min uppmärksamhet medan jag läste DN. Min fru sade vad alla svenska föräldrar säger förr eller senare: "Vi måste hitta något att göra tillsammans som inte är en skärm."

Vi provade brädspel. För komplicerade för sexåringen. Vi provade promenader. Mina barn är inte naturkär. Vi provade matlagning tillsammans. Det slutade i bråk om vem som skulle få vispa.

Sedan provade vi ordspel. En liten daglig pussel. Tio minuter över frukosten. Inga regler om vinst eller förlust, bara att vi alla letade efter samma ord vid samma bord. Och något oväntat hände — det blev tradition.

Den här artikeln är inte ett försäljningsförsök. Den är en ärlig redogörelse av varför just ordspel — av alla saker — verkar fungera som familjeaktivitet på ett sätt som de flesta andra inte gör.`,
      },
      {
        title: 'Varför ordspel passar svenska familjer',
        content: `Det finns en kulturell aspekt här som är värd att nämna. Svenska familjer värdesätter saker som inte alltid uppskattas i amerikansk speldesign: stillhet, jämlikhet, och att alla får komma till sin rätt.

Amerikanska ordspel — Scrabble, Boggle — är ofta tävlingsinriktade. Någon vinner, någon förlorar, och poängen är att slå någon. Det är inte fel, men det passar inte alltid en lördagskväll där farmor är 78 och kusinen är 5. Tävlingsspel skapar en hierarki, och i en flergeneration familj är hierarkin redan komplicerad nog.

Det som fungerar bättre är samarbete eller parallellt spelande. Alla letar efter samma ord. Alla ser sina egna fynd. Ingen jämför öppet vem som hittade mest, åtminstone inte i den första minuten. Det finns ingen "förlorare." Det är mer som att alla läser samma bok samtidigt och pekar på olika favoritrader.

Den dagliga ordpusslet — där hela familjen gör samma pussel och delar resultat senare — är en perfekt svensk form. Det är inte tävlingsinriktat på ytan, men det finns ändå glädje i att göra det bra. Det är "lagom" som speldesign.`,
      },
      {
        title: 'Vad jag lärde mig om olika åldrar',
        content: `Jag var orolig att samma spel inte skulle fungera för alla åldrar i familjen. Det visade sig att jag hade fel.

Sexåringen kunde inte läsa stora ord men kunde hitta korta ord — "JA," "NEJ," "OST" — och blev oerhört stolt över varje fynd. Det blev en form av läsövning som inte kändes som läxa. Hon lärde sig bokstäver utan att märka det.

Niåringen tyckte om utmaningen att hitta längre ord än sin yngre syster, men inte på ett aggressivt sätt. Det var mer som en personlig utmaning. Han började faktiskt slå upp ord när han var osäker om de var riktiga, vilket är något jag aldrig hade lyckats få honom att göra med läxor.

Min fru, som är språklärare, tyckte att den intressanta delen var att se hur våra barn närmade sig ord. Vilken strategi använde de? Letade de efter mönster eller bara hoppade omkring? Hon kunde se deras tankesätt på ett sätt som vanlig undervisning inte avslöjar.

Och jag? Jag insåg att jag inte har spelat ordspel sedan jag var tio år. Det visade sig att jag är ganska bra på det, vilket var en överraskning. Roligare än kaffet att läsa DN för mig själv, åtminstone den dagen.`,
      },
      {
        title: 'Mormor på FaceTime',
        content: `Det här var det oväntade. När min mor — barnens mormor — fick veta vad vi gjorde, ville hon vara med. Hon bor 400 kilometer bort. Vi öppnade FaceTime och hon spelade samma pussel som vi från sitt köksbord i Göteborg.

Detta är något ordspel gör som andra aktiviteter inte gör så lätt. Du kan inte spela brädspel över FaceTime. Du kan inte laga mat tillsammans över FaceTime, åtminstone inte meningsfullt. Men du kan alla göra samma ordpussel och jämföra svar. Det blir en samvaro över avstånd.

Min mor är 71. Hon hittar fortfarande långa ord som ingen annan i familjen ser. Hon är inte tröttare än oss på det här — om något, är hon mer engagerad. Pensionerade lärare har en oerhört stor ordskatt och hon visar det varje söndag.

Det här är en av de saker som plötsligt gör ordspel mer värdefulla än de verkar på pappret. Det är inte bara underhållning. Det är ett verktyg för att hålla generationer i kontakt på ett sätt som känns naturligt, inte påtvingat. Att ringa morfar för att "prata" är en pliktlik handling. Att ringa för att jämföra ords-fynd är en aktivitet.`,
      },
      {
        title: 'Vad du bör undvika',
        content: `Inte alla ordspels-appar är familjevänliga, även om de marknadsför sig så. Här är några saker jag lärde mig att undvika.

Spel med energi-system. Appar som säger "Vänta 4 timmar för att spela igen" är inte familjevänliga. De är casino-mekanik förklädd till spel. Om mina barn kan spela tre rundor och sedan måste vänta, kommer jag spendera nästa fyra timmar med att försvara mig från att de tigger om att jag ska betala för "energi."

Spel med push-notifikationer. "Maja vann en runda! Är du redo att svara?" Inte i mitt hem. Notifikationer är designade för engagemang, inte för dig. Ett bra familjespel bjuder in dig att spela när du själv väljer, inte när algoritmen bestämmer.

Spel som spelas på var sin enhet samtidigt. Detta missar hela poängen med familjespel. Om alla sitter med var sin telefon, även om de "spelar tillsammans," är det fortfarande skärmtid där alla är isolerade. Ett bra familjespel är ett som man kan göra med en enhet och flera ögon, eller alla samtidigt på samma pussel.

Den enklaste tumregeln: föreställ dig att din 75-åriga mor ska kunna delta. Om appen kräver konto, kompliceradare än ett kontonamn, eller har "premium-funktioner" som blockerar henne, är det inte ett familjespel.`,
      },
      {
        title: 'Det dagliga pusslet som passar svensk vardag',
        content: `Det format som har funkat bäst för oss är "dagens ord" eller dagligt pussel. Ett pussel per dag. Samma för alla. Klart på fem till tio minuter.

Varför fungerar detta så bra för familjer? Eftersom det är tidsbegränsat per definition. Du kan inte spela för länge ens om du vill. När pusslet är löst, är det löst. Det finns inget mer den dagen. Detta är motsatsen till hur de flesta appar är designade — de vill att du ska stanna kvar.

För svensk vardag är detta nästan perfekt. Morgon: spela över frukost, tio minuter, alla deltar i sin egen takt. Helger: vänta tills mormor är på FaceTime och spela alla tillsammans. Trötta kvällar: hoppa över utan skuld, det kommer en ny imorgon.

Det finns en lugn struktur här som passar svensk inställning till tid och teknologi. Vi gillar saker som är förutsägbara, hanterbara, och som inte stjäl mer än vad de erbjuder. Ett dagligt ordpussel är en sådan sak. Det erbjuder fem till tio minuter av samvaro och förlorar sedan all kraft tills imorgon. Det är respektfullt mot din tid.`,
      },
      {
        title: 'Om svenska och vad apparna ofta missar',
        content: `En sista praktisk anmärkning. Svenska har bokstäver som många apputvecklare glömmer: å, ä, ö. Om en ordspels-app behandlar "kran" och "krån" som samma ord, eller om Ö inte finns som en valbar bokstav, är det en app som inte tänkte på svenska.

Detta låter petigt men det är viktigt. Svenska barn lär sig sina bokstäver av allt de möter. En app som ignorerar Å, Ä, Ö lär dem implicit att dessa bokstäver är mindre viktiga. Det är fel. Och det är en signal om att utvecklarna inte har lagt tid på att förstå språket — vilket brukar betyda att de inte har lagt tid på mycket annat heller.

Andra signaler om kvalitet i en svensk app: är ord från Svenska Akademiens ordlista (SAOL) accepterade? Eller använder appen sin egen ordlista som ofta är ofullständig eller fel? En seriös app refererar till SAOL. En slarvig app använder vad som råkar finnas på internet.

Min rekommendation: testa appen med fem svåra ord. "Lättja." "Vänskap." "Knöl." "Lögn." "Lägenhet." Om alla dessa fungerar, är ordlistan rimlig. Om någon av dem avvisas, sätt appen åt sidan.`,
      },
      {
        title: 'Att börja, helt enkelt',
        content: `Det finns ingen särskild magi här. Min familj började för att vi var trötta på att alla satt med var sin skärm. Vi provade en daglig ordpussel. Det fastnade.

Om du vill prova själv: börja med en söndag morgon. Inte mer komplicerat än så. Ladda upp en app eller en webbsida som har ett dagligt ordpussel på svenska. Sitt vid samma bord. Låt alla titta på samma skärm eller dela skärm via en surfplatta i mitten. Sätt en kanna kaffe.

Om någon i familjen tycker det är tråkigt efter en söndag, fortsätt utan dem. Tvinga inte. Det här är inte ett projekt med mål. Det är en liten vana som ska få utvecklas naturligt.

Efter en månad kommer du veta om det är något som funkar för din familj. För oss är det så grundläggande nu att vi knappt tänker på det. Söndag morgon = ordpussel. Det är så självklart som kaffet.

Det är ingen revolution. Det löser inte alla föräldraproblem. Men i en värld där allt verkar designat att splittra familjer i var sin skärm, är en aktivitet som naturligt drar oss till samma bord under tio minuter — det är värt något. Mer än man tror.`,
      },
    ],
    backToBlog: 'Tillbaka till Bloggen',
    playDaily: 'Prova Dagens Ord',
    startPracticing: 'Spela Tillsammans',
  },
};
