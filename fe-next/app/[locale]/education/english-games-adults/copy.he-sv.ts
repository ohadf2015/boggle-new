import { dictionaryFloor } from '@/lib/seo/dictionaryStats';
import type { LocaleContent } from '../_englishLearner/types';

export const he: LocaleContent = {
  metaTitle: 'משחקי אנגלית למבוגרים — אוצר מילים לעבודה, משלב | LexiClash',
  metaDescription:
    'משחקי אנגלית לכיתת מבוגרים: הלומדים נכנסים מהטלפון עם קוד בן שישה תווים, הלוח עולה למקרן, ואתם קובעים תמיכה, ליבה או אתגר לכל אדם. פעלים מהעבודה, משלב, פתיחות לשיחה, שש שפות, חינם ל־3 כיתות של 50.',
  ogTitle: 'משחקי אנגלית למבוגרים',
  ogDescription: 'משחקי אנגלית בהובלת המורה לכיתת מבוגרים. צירופים מהעבודה, לוח משותף, שישה מילונים.',
  twitterDescription: 'משחקי אנגלית חינם למבוגרים. כיתה בזמן אמת, אוצר מילים לעבודה, 6 שפות, בלי חשבונות תלמידים.',
  heroTag: '★ אנגלית למבוגרים ★ חינם להתחלה ★',
  heroH1: { highlight: 'משחקי אנגלית למבוגרים', rest1: 'בכיתה', rest2: 'של מקום העבודה.' },
  heroSubtitle:
    'משחקי אנגלית בהובלת המורה לכיתת מבוגרים. מדביקים פעלים וצירופים מהעבודה, הקבוצה נכנסת מהטלפונים, והמקרן מציג את הלוח. שישה מילונים, בלי חשבונות תלמידים, ורמה לכל לומד כדי שקבוצת ערב מעורבת עדיין תשחק יחד.',
  ctaLabel: 'פתחו כיתה בחינם',
  heroCtas: {
    primary: '▶ הפעילו משחק למבוגרים',
    primaryNote: 'כל הקבוצה · 5 דקות',
    secondary: '🔍 ציד מילים',
    secondaryNote: 'תרגול שקט',
  },
  related: {
    label: 'משאבי הוראה נוספים',
    vocabulary: '→ משחקי אנגלית לכיתה',
    teachers: '→ משחקים למורים',
    hub: '→ מרכז ההוראה',
  },
  depth: [
    {
      heading: 'מול איזה מילון נבדקת תשובה באנגלית של מקום העבודה',
      answer: `תשובות באנגלית נבדקות מול מילון של מעל ${dictionaryFloor('en', 'he')} מילים, ולא מול רשימת הוראה קצרה. לספרדית, שוודית, עברית, רוסית ויפנית יש מילון משלהן: מעל ${dictionaryFloor('es', 'he')}, ${dictionaryFloor('sv', 'he')}, ${dictionaryFloor('he', 'he')}, ${dictionaryFloor('ru', 'he')} ו־${dictionaryFloor('ja', 'he')} מילים בהירגאנה.`,
      points: [
        'לומד שמוצא צירוף אנגלי אמיתי — גם אם לא היה ברשימת העבודה של השבוע — מקבל עליו ניקוד.',
        'הרשימה שלכם עדיין מזינה את התרגולים, כך שפעלי הישיבות וביטויי המשלב הם אלה שחוזרים.',
        'שש שפות עם מילון משלהן: אנגלית, עברית, שוודית, יפנית, ספרדית ורוסית.',
      ],
    },
    {
      heading: 'איך קובעים קושי בקבוצת ערב מעורבת',
      answer:
        'ללוח שלושה גדלים — 5x5, 6x6 ו־7x7 — ואתם קובעים את אורך הסיבוב ואת אורך המילה המינימלי. לכל מבוגר יש תמיכה, ליבה או אתגר, כך שאותו לוח משותף דורש דברים שונים ממתחיל ומעמית שוטף בלי לפצל את החדר.',
      points: [
        'ברירת המחדל היא לוח 6x6 ומינימום של שלוש אותיות; מעלים אותו כשהרשימה מביאה גזעים ארוכים יותר מהעבודה.',
        'אורך הסיבוב נקבע בדקות בידי המורה, וברירת המחדל היא שלוש דקות.',
        'המסלול החינמי כולל 3 כיתות של 50 תלמידים; Teacher Pro עולה $9 לחודש ומוסיף כיתות ללא הגבלה ודוחות.',
      ],
    },
  ],
  playFormats: {
    heading: '{count} דרכים למבוגר לתרגל רשימה אחת מהעבודה',
    intro:
      'אותה רשימה ממקום העבודה מגיעה ללומד מבוגר ב־{count} צורות שונות. {live} מהן הן מצבי כיתה בזמן אמת; {practice} הנותרות הן תרגול עצמאי, ושישה מהם מכוונים למיומנות אחת: הגדרות, מילים נרדפות, ניגודים, רמזי הקשר, משמעויות כפולות ושורשים ותחיליות — כדי שצירוף ייפגש ביותר מצורה אחת.',
    liveLabel: '{live} מצבי כיתה בזמן אמת',
    practiceLabel: '{practice} תרגולים עצמאיים לפי מיומנות',
  },
  workflow: {
    heading: 'שיעור ערב אחד, מההתחלה עד הסוף',
    intro:
      'הלולאה נכנסת בעשר הדקות האחרונות של שיעור ערב. מדביקים שמונה עד שתים־עשרה פעלים מהעבודה, מעלים קוד למקרן, והקבוצה משחקת מהטלפונים בזמן שהשליטה אצלכם — כולל השהיה כשעולה שיחה על משלב.',
    steps: [
      { when: '0:00', what: 'הדביקו את רשימת העבודה של השבוע: פעלים מישיבות, משפטי מייל, סירובים מנומסים.' },
      { when: '0:30', what: 'בחרו קלאסי או ציד מילים וסיבוב של שלוש דקות. קוד ההצטרפות עולה ללוח.' },
      { when: '1:00', what: 'המבוגרים פותחים דפדפן ומקלידים שישה תווים. בלי מייל, בלי חשבון.' },
      { when: '2:00', what: 'משחקים. משהים אם צירוף צריך הערת משלב, מוסיפים שלושים שניות או מדלגים על מילה.' },
      { when: '8:00', what: 'קוראים יחד את הביטויים שפספסו, ומעבירים לתמיכה מי שמעד על חברים כוזבים.' },
    ],
  },
  arcadeNote: {
    heading: 'מתי ארקייד לתלמידים מתאים יותר',
    body: 'הדף הזה בנוי למקרה אחד: מורה שמריץ סיבוב לכיתת מבוגרים. אם אתם מחפשים עשרות משחקים בשירות עצמי בבית, אתר־ספרייה רחב יותר. חזרו לכאן כשצריך את כל הקבוצה על לוח אחד ואת השליטה בידיים שלכם.',
    href: 'https://7esl.com/word-games/',
    cta: 'משחקי המילים של 7ESL',
  },
  faqTitle: 'שאלות נפוצות',
  features: [
    { icon: 'globe', text: 'שישה מילונים; האנגלית נשפטת כאנגלית, לא כרשימה מתורגמת' },
    { icon: 'users', text: 'משחק חי לכל הקבוצה; מבוגרים נכנסים עם קוד בן שישה תווים מהטלפון' },
    { icon: 'timer', text: 'סיבובים של שלוש דקות שנכנסים בסוף שיעור ערב' },
    { icon: 'book', text: 'מדביקים פעלים מהעבודה, צירופים, משפטי מייל או פתיחות לשיחה' },
    { icon: 'monitor', text: 'עובד על טלפונים, מחשבים ניידים והמקרן בכיתה' },
    { icon: 'lock', text: 'בלי חשבונות תלמידים. המסלול החינמי כולל 3 כיתות של 50' },
  ],
  proficiencyLevels: [
    { tag: 'תמיכה', title: 'למצוא את הביטוי', desc: 'מילים קצרות יותר מהעבודה, טיימר ארוך ובנק מילים גלוי כדי שגם מי שהגיע חדש יצבור נקודות.' },
    { tag: 'ליבה', title: 'על רשימת העבודה', desc: 'צירופים מעורבים, טיימר רגיל. לוח 6x6 מספיק לקבוצת ערב מעורבת.' },
    { tag: 'אתגר', title: 'משלב וטון', desc: 'צירופים ארוכים יותר וטיימר הדוק, על אותו לוח כדי שאף אחד לא יישלף מהקבוצה.' },
  ],
  sections: {
    builtFor: 'נבנה לכיתות אנגלית של מקום העבודה.',
    setLevelPerClass: 'קובעים את הרמה לכל כיתה.',
    ctaHeading: 'נשארו עשרים דקות בשיעור?',
    ctaSubtitle: 'הריצו סיבוב אוצר מילים מהעבודה.',
    ctaPrimaryButtonLabel: '▶ התחילו משחק למבוגרים',
    ctaSecondaryButtonLabel: 'חזרה להוראה',
  },
  faqs: [
    {
      q: 'אילו משחקי אנגלית עובדים עם לומדים מבוגרים?',
      a: 'משחקי לוח אותיות מתוזמנים סביב אוצר מילים מהעבודה. המבוגרים מוצאים צירופים, פעלים מישיבות ופתיחות לשיחה על לוח משותף, ואתם שולטים באורך הסיבוב ובאורך המילה המינימלי. משהים כשעולה שאלת משלב — הלוח יכול לחכות.',
    },
    {
      q: 'האם מבוגרים צריכים חשבון?',
      a: 'לא. הם נכנסים עם קוד בן שישה תווים מהטלפון או מהמחשב הנייד. החשבונות נשארים אצל המורה. המסלול החינמי כולל 3 כיתות של 50.',
    },
    {
      q: 'אפשר לתרגל אנגלית של מקום העבודה ומשלב?',
      a: 'כן. מדביקים את פעלי הישיבות, משפטי המייל או הסירובים המנומסים של השבוע. הסיבוב החי עדיין מנקד כל מילה אנגלית אמיתית שהמילון מכיר.',
    },
    {
      q: 'איך מריצים קבוצת ערב מעורבת?',
      a: 'לוח משותף אחד, שלוש רמות. תמיכה רואה בנק מילים; אתגר מחפש צירופים ארוכים יותר על אותה רשת. אף אחד לא נשלח לחדר אחר, וזה חשוב כשהקבוצה נפגשת רק פעם בשבוע.',
    },
    {
      q: 'אפשר להשאיר את הממשק בשפת הלומד?',
      a: 'כן. הממשק יכול להישאר בעברית, בספרדית, בשוודית, ביפנית או ברוסית בזמן שהסיבוב נשפט באנגלית. עברית היא מימין לשמאל, כולל הלוח.',
    },
    {
      q: 'מאיפה מתחילה כיתת מבוגרים?',
      a: 'פותחים את משחק הכיתה, מדביקים שמונה ביטויים מהעבודה ומעלים את הקוד למקרן. חמש דקות מספיקות לסיבוב ראשון בסוף שיעור ערב.',
    },
  ],
};

export const sv: LocaleContent = {
  metaTitle: 'Engelskaspel för vuxna — arbetsplatsens ordförråd, register | LexiClash',
  metaDescription:
    'Engelskaspel för en vuxenklass: deltagarna ansluter från mobilen med en kod på sex tecken, brädet visas på projektorn och du sätter Stöd, Bas eller Utmaning per person. Arbetsplatsverb, register, samtalsöppningar, sex språk, gratis för 3 klasser med 50.',
  ogTitle: 'Engelskaspel för vuxna',
  ogDescription: 'Lärarledda engelskaspel för vuxengrupper. Arbetsplatskollokationer, ett delat bräde, sex ordlistor.',
  twitterDescription: 'Gratis engelskaspel för vuxna. Liveklass, arbetsplatsens ordförråd, 6 språk, inga elevkonton.',
  heroTag: '★ Engelska för vuxna ★ Gratis att börja ★',
  heroH1: { highlight: 'Engelskaspel för vuxna', rest1: 'i', rest2: 'arbetsplatsklassen.' },
  heroSubtitle:
    'Lärarledda engelskaspel för vuxenrum. Du klistrar in arbetsplatsverb och kollokationer, gruppen ansluter från mobilen och projektorn visar brädet. Sex ordlistor, inga elevkonton och en nivå per deltagare så att en blandad kvällsklass fortfarande spelar tillsammans.',
  ctaLabel: 'Skapa gratis klassrum',
  heroCtas: {
    primary: '▶ Starta ett vuxenspel',
    primaryNote: 'Hela gruppen · 5 minuter',
    secondary: '🔍 Ordjakt',
    secondaryNote: 'Tyst övning',
  },
  related: {
    label: 'Relaterade lärarresurser',
    vocabulary: '→ Engelskaspel för klassen',
    teachers: '→ Spel för lärare',
    hub: '→ Utbildningshubben',
  },
  depth: [
    {
      heading: 'Vilken ordlista ett arbetsplatsengelskt svar prövas mot',
      answer: `Engelska svar prövas mot en ordlista på över ${dictionaryFloor('en', 'sv')} ord, inte en kort undervisningslista. Spanska, svenska, hebreiska, ryska och japanska har var sin: över ${dictionaryFloor('es', 'sv')}, ${dictionaryFloor('sv', 'sv')}, ${dictionaryFloor('he', 'sv')}, ${dictionaryFloor('ru', 'sv')} och ${dictionaryFloor('ja', 'sv')} hiraganaord.`,
      points: [
        'En deltagare som hittar en riktig engelsk kollokation — även en som inte stod på veckans arbetslista — får poäng.',
        'Din lista driver fortfarande övningarna, så mötesverben och registerfraserna är det som repeteras.',
        'Sex språk med egen ordlista: engelska, hebreiska, svenska, japanska, spanska och ryska.',
      ],
    },
    {
      heading: 'Att ställa in svårigheten i en blandad kvällsklass',
      answer:
        'Brädet har tre storlekar — 5x5, 6x6 och 7x7 — och du ställer in rundans längd och minsta ordlängd. Varje vuxen bär Stöd, Bas eller Utmaning, så samma delade bräde begär olika saker av en nybörjare och en flytande kollega utan att dela rummet.',
      points: [
        'En runda använder 6x6-brädet och ett minimum på tre bokstäver som standard; höj det när listan har längre arbetsplatsstammar.',
        'Rundans längd ställs in i minuter av läraren och är som standard tre minuter.',
        'Gratisplanen täcker 3 klasser med 50 elever vardera; Teacher Pro kostar $9/månad och lägger till obegränsade klasser och rapporter.',
      ],
    },
  ],
  playFormats: {
    heading: '{count} sätt för en vuxen att öva en arbetslista',
    intro:
      'Samma arbetslista når en vuxen deltagare i {count} olika former. {live} av dem är direktlägen för klassen; de andra {practice} är egna övningar, och sex av dem riktar in sig på en enda färdighet: definitioner, synonymer, motsatser, ledtrådar i sammanhang, flera betydelser samt rötter och affix — så att en kollokation möts i mer än en form.',
    liveLabel: '{live} direktlägen för klassen',
    practiceLabel: '{practice} egna övningar, per färdighet',
  },
  workflow: {
    heading: 'Ett kvällspass, från början till slut',
    intro:
      'Slingan ryms på de sista tio minuterna av en kvällslektion. Du klistrar in åtta till tolv arbetsplatsverb, sätter en kod på projektorn och gruppen spelar från mobilen medan du behåller kontrollerna — inklusive en paus när en registerdiskussion startar.',
    steps: [
      { when: '0:00', what: 'Klistra in veckans arbetslista — mötesverb, mejlfraser, artiga avslag.' },
      { when: '0:30', what: 'Välj Klassiskt eller Ordjakt och en treminutersrunda. Anslutningskoden går upp på tavlan.' },
      { when: '1:00', what: 'Vuxna öppnar webbläsaren och skriver sex tecken. Ingen mejl, inget konto.' },
      { when: '2:00', what: 'Spela. Pausa om en kollokation behöver en registernot, lägg på trettio sekunder eller hoppa över ett ord.' },
      { when: '8:00', what: 'Läs de missade fraserna tillsammans och sätt den som snubblade på falska vänner på Stöd.' },
    ],
  },
  arcadeNote: {
    heading: 'När en elevarkad är det bättre verktyget',
    body: 'Den här sidan är byggd för ett fall: en lärare som kör en runda för ett vuxenrum. Vill du ha dussintals självbetjäningsspel hemma är en biblioteksajt bredare. Kom tillbaka hit när du behöver hela gruppen på ett bräde med kontrollerna hos dig.',
    href: 'https://7esl.com/word-games/',
    cta: '7ESL:s ordspel',
  },
  faqTitle: 'Vanliga frågor',
  features: [
    { icon: 'globe', text: 'Sex ordlistor; engelskan bedöms som engelska, inte som en översatt lista' },
    { icon: 'users', text: 'Live för hela gruppen; vuxna ansluter med en kod på sex tecken från mobilen' },
    { icon: 'timer', text: 'Treminutersrundor som ryms i slutet av en kvällslektion' },
    { icon: 'book', text: 'Klistra in arbetsplatsverb, kollokationer, mejlfraser eller samtalsöppningar' },
    { icon: 'monitor', text: 'Fungerar på mobiler, laptops och klassrummets projektor' },
    { icon: 'lock', text: 'Inga elevkonton. Gratisplanen täcker 3 klasser med 50' },
  ],
  proficiencyLevels: [
    { tag: 'Stöd', title: 'Hitta frasen', desc: 'Kortare arbetsplatsord, längre timer och en synlig ordbank så att den som just kommit in också får poäng.' },
    { tag: 'Bas', title: 'På jobblistan', desc: 'Blandade kollokationer, standardtimer. 6x6-brädet räcker för ett blandat kvällsrum.' },
    { tag: 'Utmaning', title: 'Register och ton', desc: 'Längre kollokationer och snävare timer, fortfarande på samma bräde så att ingen plockas ut.' },
  ],
  sections: {
    builtFor: 'Byggt för arbetsplatsens engelskaklasser.',
    setLevelPerClass: 'Ställ in nivån per klass.',
    ctaHeading: 'Tjugo minuter kvar av lektionen?',
    ctaSubtitle: 'Kör en arbetsplatsrunda.',
    ctaPrimaryButtonLabel: '▶ Starta vuxenspel',
    ctaSecondaryButtonLabel: 'Tillbaka till utbildning',
  },
  faqs: [
    {
      q: 'Vilka engelskaspel fungerar med vuxna deltagare?',
      a: 'Tidsatta bokstavsrutor kring arbetsplatsens ordförråd. Vuxna hittar kollokationer, mötesverb och samtalsöppningar på ett delat bräde medan du styr rundans längd och minsta ordlängd. Pausa när en registerfråga kommer — brädet kan vänta.',
    },
    {
      q: 'Behöver vuxna ett konto?',
      a: 'Nej. De ansluter med en kod på sex tecken från mobilen eller laptopen. Kontona stannar hos läraren. Gratisplanen täcker 3 klasser med 50.',
    },
    {
      q: 'Kan jag öva arbetsplatsengelska och register?',
      a: 'Ja. Klistra in veckans mötesverb, mejlfraser eller artiga avslag. Livedrundan ger fortfarande poäng för varje riktigt engelskt ord som ordlistan känner.',
    },
    {
      q: 'Hur kör jag en blandad kvällsklass?',
      a: 'Ett delat bräde, tre nivåer. Stöd ser en ordbank; Utmaning jagar längre kollokationer på samma rutnät. Ingen skickas till ett annat rum, vilket spelar roll när gruppen bara träffas en gång i veckan.',
    },
    {
      q: 'Kan gränssnittet stanna på deltagarens språk?',
      a: 'Ja. Gränssnittet kan stanna på svenska, hebreiska, spanska, japanska eller ryska medan rundan bedöms på engelska. Hebreiska är höger-till-vänster, även på brädet.',
    },
    {
      q: 'Var börjar en vuxenklass?',
      a: 'Öppna klassrumsspelet, klistra in åtta arbetsplatsfraser och sätt koden på projektorn. Fem minuter räcker till en första runda i slutet av ett kvällspass.',
    },
  ],
};
