import { dictionaryFloor } from '@/lib/seo/dictionaryStats';
import type { LocaleContent } from '../_englishLearner/types';

export const he: LocaleContent = {
  metaTitle: 'משחקי פעלים חריגים — go, went, gone | LexiClash',
  metaDescription:
    'משחקי פעלים חריגים לכיתת אנגלית: מדביקים go/went/gone, eat/ate/eaten ו־see/saw/seen, התלמידים נכנסים עם קוד בן שישה תווים, והלוח עולה למקרן. תמיכה, ליבה או אתגר לכל תלמיד, שש שפות, חינם ל־3 כיתות של 50.',
  ogTitle: 'משחקי פעלים חריגים',
  ogDescription: 'תרגול פעלים חריגים בהובלת המורה. Go/went/gone על לוח משותף, שישה מילונים, בלי חשבונות תלמידים.',
  twitterDescription: 'משחקי פעלים חריגים חינם. כיתה בזמן אמת, go/went/gone, 6 שפות, בלי חשבונות תלמידים.',
  heroTag: '★ פעלים חריגים ★ חינם להתחלה ★',
  heroH1: { highlight: 'משחקי פעלים חריגים', rest1: 'לכיתה', rest2: 'של האנגלית.' },
  heroSubtitle:
    'תרגול פעלים חריגים בהובלת המורה. מדביקים go, went, gone ואת שאר הגזעים של השבוע, הכיתה נכנסת מהטאבלטים, והמקרן מציג את הלוח. שישה מילונים, בלי חשבונות תלמידים, ורמה לכל תלמיד כדי ששלושת הזמנים עדיין ישחקו יחד.',
  ctaLabel: 'פתחו כיתה בחינם',
  heroCtas: {
    primary: '▶ הפעילו סיבוב פעלים חריגים',
    primaryNote: 'כל הכיתה · 5 דקות',
    secondary: '🔤 תרגול איות',
    secondaryNote: 'גזעים אות־אות',
  },
  related: {
    label: 'משאבי הוראה נוספים',
    vocabulary: '→ משחקי אנגלית לכיתה',
    teachers: '→ תרגול איות',
    hub: '→ מרכז ההוראה',
  },
  depth: [
    {
      heading: 'מול איזה מילון נבדקת צורה חריגה',
      answer: `תשובות באנגלית נבדקות מול מילון של מעל ${dictionaryFloor('en', 'he')} מילים, ולא מול רשימת הוראה קצרה. לספרדית, שוודית, עברית, רוסית ויפנית יש מילון משלהן: מעל ${dictionaryFloor('es', 'he')}, ${dictionaryFloor('sv', 'he')}, ${dictionaryFloor('he', 'he')}, ${dictionaryFloor('ru', 'he')} ו־${dictionaryFloor('ja', 'he')} מילים בהירגאנה.`,
      points: [
        'לומד שמוצא צורה אנגלית אמיתית — went, gone, eaten — מקבל עליה ניקוד גם אם זו לא הייתה הצורה בדף של השבוע.',
        'הרשימה שלכם עדיין מזינה את התרגולים, כך ש־go/went/gone ושאר הגזעים שהדבקתם הם אלה שחוזרים.',
        'שש שפות עם מילון משלהן: אנגלית, עברית, שוודית, יפנית, ספרדית ורוסית.',
      ],
    },
    {
      heading: 'איך משאירים הווה, עבר ובינוני על לוח אחד',
      answer:
        'ללוח שלושה גדלים — 5x5, 6x6 ו־7x7 — ואתם קובעים את אורך הסיבוב ואת אורך המילה המינימלי. לכל תלמיד יש תמיכה, ליבה או אתגר, כך שאותו לוח משותף יכול לבקש מילד אחד go ומילד אחר gone בלי לפצל את החדר.',
      points: [
        'ברירת המחדל היא לוח 6x6 ומינימום של שלוש אותיות, שעדיין מנקד go, ate ו־saw.',
        'אורך הסיבוב נקבע בדקות בידי המורה, וברירת המחדל היא שלוש דקות.',
        'המסלול החינמי כולל 3 כיתות של 50 תלמידים; Teacher Pro עולה $9 לחודש ומוסיף כיתות ללא הגבלה ודוחות.',
      ],
    },
  ],
  playFormats: {
    heading: '{count} דרכים לתרגל רשימת go/went/gone אחת',
    intro:
      'אותה רשימת go/went/gone מגיעה ללומד ב־{count} צורות שונות. {live} מהן הן מצבי כיתה בזמן אמת; {practice} הנותרות הן תרגול עצמאי, ושישה מהם מכוונים למיומנות אחת: הגדרות, מילים נרדפות, ניגודים, רמזי הקשר, משמעויות כפולות ושורשים ותחיליות — כדי שגזע חריג ייפגש יותר מפעם אחת.',
    liveLabel: '{live} מצבי כיתה בזמן אמת',
    practiceLabel: '{practice} תרגולים עצמאיים לפי מיומנות',
  },
  workflow: {
    heading: 'שמונה דקות של go, went, gone',
    intro:
      'הלולאה נכנסת בשיעור דקדוק. מדביקים את החריגים של השבוע — הווה, עבר ובינוני — מעלים קוד למקרן, והכיתה מחפשת את הצורות על לוח אחד בזמן שהשליטה אצלכם.',
    steps: [
      { when: '0:00', what: 'הדביקו את הגזעים של השבוע: go/went/gone, eat/ate/eaten, see/saw/seen.' },
      { when: '0:30', what: 'בחרו קלאסי או איות וסיבוב של שתי דקות. קוד ההצטרפות עולה ללוח.' },
      { when: '1:00', what: 'התלמידים פותחים דפדפן ומקלידים שישה תווים. בלי מייל, בלי חשבון.' },
      { when: '2:00', what: 'משחקים. מדלגים על גזע אם הכיתה נתקעת, או מוסיפים שלושים שניות לבינוני קשה.' },
      { when: '7:00', what: 'קוראים יחד את צורות העבר שפספסו, ומעבירים לתמיכה את החריגים שהחליקו.' },
    ],
  },
  arcadeNote: {
    heading: 'מתי ארקייד לתלמידים מתאים יותר',
    body: 'הדף הזה בנוי למקרה אחד: מורה שמריץ סיבוב של פעלים חריגים לכיתה. אם אתם מחפשים עשרות משחקים בשירות עצמי, אתר־ספרייה רחב יותר. חזרו לכאן כשצריך את כל הכיתה על לוח אחד מחפשת go, went ו־gone ואת השליטה בידיים שלכם.',
    href: 'https://7esl.com/word-games/',
    cta: 'משחקי המילים של 7ESL',
  },
  faqTitle: 'שאלות נפוצות',
  features: [
    { icon: 'book', text: 'מדביקים go/went/gone, eat/ate/eaten, see/saw/seen — כל רשימה חריגה' },
    { icon: 'timer', text: 'סיבובים של שתי דקות שנכנסים בשיעור דקדוק בלי לבלוע את השיעור' },
    { icon: 'users', text: 'משחק חי לכל הכיתה; נכנסים עם קוד בן שישה תווים' },
    { icon: 'zap', text: 'הווה, עבר ובינוני על לוח משותף אחד, לא על שלושה דפים' },
    { icon: 'monitor', text: 'עובד על טאבלטים, Chromebook והמקרן בכיתה' },
    { icon: 'lock', text: 'בלי חשבונות תלמידים. המסלול החינמי כולל 3 כיתות של 50' },
  ],
  proficiencyLevels: [
    { tag: 'תמיכה', title: 'צורת הבסיס', desc: 'גזעים קצרים יותר, טיימר ארוך ובנק מילים גלוי כדי ש־go ו־eat עדיין יצטברו בזמן ש־went חדש.' },
    { tag: 'ליבה', title: 'עבר ובינוני', desc: 'go/went/gone מעורבים באותה רשימה, טיימר רגיל. לוח 6x6 מספיק.' },
    { tag: 'אתגר', title: 'המביכים', desc: 'חריגים ארוכים יותר וטיימר הדוק — brought, thought, caught — על אותו לוח.' },
  ],
  sections: {
    builtFor: 'נבנה לתרגול פעלים חריגים.',
    setLevelPerClass: 'קובעים את הרמה לכל כיתה.',
    ctaHeading: 'יש זמן לתרגיל פעלים?',
    ctaSubtitle: 'הריצו סיבוב go/went/gone.',
    ctaPrimaryButtonLabel: '▶ התחילו משחק פעלים חריגים',
    ctaSecondaryButtonLabel: 'חזרה להוראה',
  },
  faqs: [
    {
      q: 'איך מתרגלים פעלים חריגים עם כל הכיתה?',
      a: 'מדביקים את שלוש הצורות — go, went, gone — לרשימת שיעור ומריצים סיבוב קצר על לוח משותף. התלמידים מחפשים את הצורות שהם מכירים, ואתם שולטים באורך הסיבוב ובאורך המילה המינימלי. שלבו שירה בלי מכשיר של אותם גזעים כדי שגם האוזן תקבל אותם.',
    },
    {
      q: 'האם התלמידים צריכים חשבון?',
      a: 'לא. הם נכנסים עם קוד בן שישה תווים מהטאבלט או מה־Chromebook. החשבונות נשארים אצל המורה. המסלול החינמי כולל 3 כיתות של 50.',
    },
    {
      q: 'אפשר להדביק רשימות go/went/gone?',
      a: 'כן. מדביקים הווה, עבר ובינוני יחד, או עמודה אחת בכל פעם. הסיבוב החי עדיין מנקד כל מילה אנגלית אמיתית שהמילון מכיר, כך שמי שרואה ate בזמן שתרגלתם gone גם מקבל ניקוד.',
    },
    {
      q: 'איך משאירים הווה, עבר ובינוני ביחד?',
      a: 'לוח משותף אחד, שלוש רמות. תמיכה מחפשת את צורת הבסיס; אתגר מחפש את הבינוני על אותה רשת. אף אחד לא נשלח לחדר אחר, ושלוש הצורות נשארות באותו סיבוב.',
    },
    {
      q: 'זה רק לאנגלית?',
      a: 'הממשק יכול להישאר בעברית, בספרדית, בשוודית, ביפנית או ברוסית בזמן שהסיבוב נשפט באנגלית. עברית היא מימין לשמאל, כולל הלוח. הפעלים עצמם נשארים באנגלית — הם התרגול.',
    },
    {
      q: 'מאיפה מתחילים סיבוב פעלים?',
      a: 'פותחים את משחק הכיתה, מדביקים שמונה חריגים בשלוש צורות ומעלים את הקוד למקרן. חמש דקות מספיקות לסיבוב go/went/gone ראשון.',
    },
  ],
};

export const sv: LocaleContent = {
  metaTitle: 'Spel med oregelbundna verb — go, went, gone | LexiClash',
  metaDescription:
    'Spel med oregelbundna verb för en engelskaklass: klistra in go/went/gone, eat/ate/eaten och see/saw/seen, eleverna ansluter med en kod på sex tecken och brädet visas på projektorn. Stöd, Bas eller Utmaning per elev, sex språk, gratis för 3 klasser med 50.',
  ogTitle: 'Spel med oregelbundna verb',
  ogDescription: 'Lärarledd träning av oregelbundna verb. Go/went/gone på ett delat bräde, sex ordlistor, inga elevkonton.',
  twitterDescription: 'Gratis spel med oregelbundna verb. Liveklass, go/went/gone, 6 språk, inga elevkonton.',
  heroTag: '★ Oregelbundna verb ★ Gratis att börja ★',
  heroH1: { highlight: 'Spel med oregelbundna verb', rest1: 'för', rest2: 'klassrummet.' },
  heroSubtitle:
    'Lärarledd träning av oregelbundna verb. Du klistrar in go, went, gone och resten av veckans stammar, klassen ansluter från surfplattor och projektorn visar brädet. Sex ordlistor, inga elevkonton och en nivå per elev så att blandade tempus fortfarande spelar tillsammans.',
  ctaLabel: 'Skapa gratis klassrum',
  heroCtas: {
    primary: '▶ Starta en runda med oregelbundna verb',
    primaryNote: 'Hela klassen · 5 minuter',
    secondary: '🔤 Stavningsövning',
    secondaryNote: 'Stammar bokstav för bokstav',
  },
  related: {
    label: 'Relaterade lärarresurser',
    vocabulary: '→ Engelskaspel för klassen',
    teachers: '→ Stavningsövning',
    hub: '→ Utbildningshubben',
  },
  depth: [
    {
      heading: 'Vilken ordlista en oregelbunden verbform prövas mot',
      answer: `Engelska svar prövas mot en ordlista på över ${dictionaryFloor('en', 'sv')} ord, inte en kort undervisningslista. Spanska, svenska, hebreiska, ryska och japanska har var sin: över ${dictionaryFloor('es', 'sv')}, ${dictionaryFloor('sv', 'sv')}, ${dictionaryFloor('he', 'sv')}, ${dictionaryFloor('ru', 'sv')} och ${dictionaryFloor('ja', 'sv')} hiraganaord.`,
      points: [
        'En elev som hittar en riktig engelsk form — went, gone, eaten — får poäng även om det inte var just den formen på veckans blad.',
        'Din lista driver fortfarande övningarna, så go/went/gone och de andra stammar du klistrade in är det som repeteras.',
        'Sex språk med egen ordlista: engelska, hebreiska, svenska, japanska, spanska och ryska.',
      ],
    },
    {
      heading: 'Att hålla presens, preteritum och particip på ett bräde',
      answer:
        'Brädet har tre storlekar — 5x5, 6x6 och 7x7 — och du ställer in rundans längd och minsta ordlängd. Varje elev bär Stöd, Bas eller Utmaning, så samma delade bräde kan be ett barn om go och ett annat om gone utan att dela rummet.',
      points: [
        'En runda använder 6x6-brädet och ett minimum på tre bokstäver som standard, vilket fortfarande ger poäng för go, ate och saw.',
        'Rundans längd ställs in i minuter av läraren och är som standard tre minuter.',
        'Gratisplanen täcker 3 klasser med 50 elever vardera; Teacher Pro kostar $9/månad och lägger till obegränsade klasser och rapporter.',
      ],
    },
  ],
  playFormats: {
    heading: '{count} sätt att öva en go/went/gone-lista',
    intro:
      'Samma go/went/gone-lista når eleven i {count} olika former. {live} av dem är direktlägen för klassen; de andra {practice} är egna övningar, och sex av dem riktar in sig på en enda färdighet: definitioner, synonymer, motsatser, ledtrådar i sammanhang, flera betydelser samt rötter och affix — så att en oregelbunden stam syns mer än en gång.',
    liveLabel: '{live} direktlägen för klassen',
    practiceLabel: '{practice} egna övningar, per färdighet',
  },
  workflow: {
    heading: 'Åtta minuter av go, went, gone',
    intro:
      'Slingan ryms i ett grammatikpass. Du klistrar in veckans oregelbundna verb — presens, preteritum och particip — sätter en kod på projektorn och klassen jagar formerna på ett bräde medan du behåller kontrollerna.',
    steps: [
      { when: '0:00', what: 'Klistra in veckans stammar: go/went/gone, eat/ate/eaten, see/saw/seen.' },
      { when: '0:30', what: 'Välj Klassiskt eller Stavning och en tvåminutersrunda. Anslutningskoden går upp på tavlan.' },
      { when: '1:00', what: 'Eleverna öppnar webbläsaren och skriver sex tecken. Ingen mejl, inget konto.' },
      { when: '2:00', what: 'Spela. Hoppa över en stam om rummet fastnar, eller lägg på trettio sekunder för ett svårt particip.' },
      { when: '7:00', what: 'Läs de missade preteritumformerna tillsammans och sätt Stöd på de oregelbundna som halkade.' },
    ],
  },
  arcadeNote: {
    heading: 'När en elevarkad är det bättre verktyget',
    body: 'Den här sidan är byggd för ett fall: en lärare som kör en runda med oregelbundna verb för ett rum. Vill du ha dussintals självbetjäningsspel är en biblioteksajt bredare. Kom tillbaka hit när du behöver hela klassen på ett bräde som jagar go, went och gone med kontrollerna hos dig.',
    href: 'https://7esl.com/word-games/',
    cta: '7ESL:s ordspel',
  },
  faqTitle: 'Vanliga frågor',
  features: [
    { icon: 'book', text: 'Klistra in go/went/gone, eat/ate/eaten, see/saw/seen — vilken oregelbunden lista som helst' },
    { icon: 'timer', text: 'Tvåminutersrundor som ryms i ett grammatikpass utan att äta upp lektionen' },
    { icon: 'users', text: 'Live för hela klassen; eleverna ansluter med en kod på sex tecken' },
    { icon: 'zap', text: 'Presens, preteritum och particip på ett delat bräde, inte tre arbetsblad' },
    { icon: 'monitor', text: 'Fungerar på surfplattor, Chromebooks och klassrummets projektor' },
    { icon: 'lock', text: 'Inga elevkonton. Gratisplanen täcker 3 klasser med 50' },
  ],
  proficiencyLevels: [
    { tag: 'Stöd', title: 'Grundformen', desc: 'Kortare stammar, längre timer och en synlig ordbank så att go och eat fortfarande ger poäng medan went är nytt.' },
    { tag: 'Bas', title: 'Preteritum och particip', desc: 'Blandat go/went/gone på samma lista, standardtimer. 6x6-brädet räcker.' },
    { tag: 'Utmaning', title: 'De besvärliga', desc: 'Längre oregelbundna och snävare timer — brought, thought, caught — fortfarande på samma bräde.' },
  ],
  sections: {
    builtFor: 'Byggt för träning av oregelbundna verb.',
    setLevelPerClass: 'Ställ in nivån per klass.',
    ctaHeading: 'Dags för en verbövning?',
    ctaSubtitle: 'Kör en go/went/gone-runda.',
    ctaPrimaryButtonLabel: '▶ Starta spel med oregelbundna verb',
    ctaSecondaryButtonLabel: 'Tillbaka till utbildning',
  },
  faqs: [
    {
      q: 'Hur övar jag oregelbundna verb med hela klassen?',
      a: 'Klistra in de tre formerna — go, went, gone — i en lektionslista och kör en kort tidsatt runda på ett delat bräde. Eleverna jagar de former de kan medan du styr rundans längd och minsta ordlängd. Para med en ramsa utan skärm av samma stammar så att örat också får dem.',
    },
    {
      q: 'Behöver eleverna ett konto?',
      a: 'Nej. De ansluter med en kod på sex tecken från surfplatta eller Chromebook. Kontona stannar hos läraren. Gratisplanen täcker 3 klasser med 50.',
    },
    {
      q: 'Kan jag klistra in go/went/gone-listor?',
      a: 'Ja. Klistra in presens, preteritum och particip tillsammans, eller en kolumn i taget. Livedrundan ger fortfarande poäng för varje riktigt engelskt ord som ordlistan känner, så den som ser ate medan du övade gone får också poäng.',
    },
    {
      q: 'Hur håller jag presens, preteritum och particip tillsammans?',
      a: 'Ett delat bräde, tre nivåer. Stöd jagar grundformen; Utmaning jagar participet på samma rutnät. Ingen skickas till ett annat rum, och de tre formerna stannar i samma runda.',
    },
    {
      q: 'Är det bara för engelska?',
      a: 'Gränssnittet kan stanna på svenska, hebreiska, spanska, japanska eller ryska medan rundan bedöms på engelska. Hebreiska är höger-till-vänster, även på brädet. Verben själva stannar på engelska — de är övningen.',
    },
    {
      q: 'Var börjar jag en verbrunda?',
      a: 'Öppna klassrumsspelet, klistra in åtta oregelbundna i tre former och sätt koden på projektorn. Fem minuter räcker till en första go/went/gone-runda.',
    },
  ],
};
