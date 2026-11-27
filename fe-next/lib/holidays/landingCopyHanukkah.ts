import type { LandingCopyTable } from './landingCopy';

export const HANUKKAH_COPY: LandingCopyTable = {
  he: {
    dateLocale: 'he-IL',
    mascot: '/holidays/m-hanukkah.webp',
    mascotLabel: 'לחצו כדי שהקמע יקפוץ',
    intro:
      'LexiClash הוא משחק מילים מהיר שמשחקים בדפדפן, ובחנוכה הוא מתלבש לחג. בכל לילה שבו אתם משחקים נדלק נר בחנוכייה, על הלוח מסתתרים מטבעות של דמי חנוכה ששווים נקודות בונוס, ובסוף שמונת הלילות מחכה לכם מתנה. אפשר לשחק לבד, מול חברים או עם כל המשפחה מול הטלוויזיה, בלי לשלם שקל.',
    liveBadge: 'חנוכה כבר כאן: האירוע פתוח עד {end}',
    offBanner: 'האירוע חוזר בחנוכה הבא, החל מ־{start}. עד אז המשחק הרגיל פתוח כל השנה.',
    offUnknown: 'האירוע חוזר בחנוכה הבא. עד אז המשחק הרגיל פתוח כל השנה.',
    ctaLive: 'להדליק את הנר של הערב',
    ctaOff: 'לשחק עכשיו',
    ctaDaily: 'לאתגר היומי',
    insideTitle: 'מה מחכה לכם בחנוכה',
    features: [
      {
        art: '/holidays/props-menorah.webp',
        title: 'שמונה לילות, שמונה נרות',
        body: 'כל לילה שבו אתם מסיימים משחק מדליק נר. בדרך אוספים מטבעות ופריטים לאווטאר: כובע גרב, צעיף, סיכת סביבון, ובלילה השמיני כתר חנוכייה והתואר "שומר האור".',
      },
      {
        art: '/holidays/props-gelt.webp',
        title: 'לוח חגיגי בכל ערב',
        body: 'בלוח היומי של החג מסתתרים אריחים של דמי חנוכה. מילה שעוברת דרכם מפזרת מטבעות זהב ומוסיפה נקודות, ואחרי המשחק אפשר גם לסובב סביבון.',
      },
      {
        art: '/holidays/table-hanukkah.webp',
        title: 'שולחן חג משפחתי',
        body: 'פותחים שולחן, שולחים את הקוד לסבתא ולבני הדודים, ורואים יחד מי מוצא הכי הרבה מילים במהלך החג.',
      },
      {
        art: '/holidays/gift-tier-8.webp',
        title: 'מתנה שגדלה איתכם',
        body: 'עם כל לילה שאתם משחקים המתנה גדלה, והיא נפתחת רק בלילה האחרון. פספסתם ערב? פעם אחת בחג אפשר להחזיר אותו עם שלושה משחקים ביום אחד.',
      },
    ],
    arcadeTitle: 'ארקייד חנוכה',
    arcadeBody: 'שלושה משחקונים קצרים, דקה וחצי כל אחד, שמשחקים באגודל אחד.',
    arcadeOff: 'הארקייד נפתח יחד עם החג.',
    arcade: {
      oil: { name: 'שמן לשמונה לילות', blurb: 'כל מילה ממלאת שמן בחנוכייה. נסו להחזיק מעמד שמונה לילות.' },
      dreidel: { name: 'דו־קרב סביבונים', blurb: 'מסובבים, והאות שנופלת קובעת את החוק. הראשון שמגיע לעשרה מטבעות מנצח.' },
      sufganiyah: { name: 'מגדל סופגניות', blurb: 'סופגניות עם אותיות נערמות במגש. מחברים מהן מילים לפני שהמגדל מגיע למעלה.' },
    },
    eggTitle: 'ויש גם כמה הפתעות',
    eggBody: 'בזמן החג מסתתרים באתר כמה דברים קטנים. לא נגלה איפה, רק נרמוז שכדאי לשים לב לסביבון ולאות שעליו.',
    faqTitle: 'שאלות נפוצות',
    faqs: [
      { q: 'המשחק באמת בחינם?', a: 'כן. משחקים בדפדפן בחינם, בלי להוריד אפליקציה. את כל הפרסים של חנוכה מקבלים רק ממשחק, אין מה לקנות.' },
      { q: 'צריך להירשם?', a: 'אפשר לשחק בלי חשבון. כדי להדליק נרות ולשמור את הפרסים צריך להתחבר, וזה לוקח כמה שניות.' },
      { q: 'זה עובד בטלפון?', a: 'כן. המשחק עובד בכל דפדפן, בטלפון, בטאבלט ובמחשב.' },
      {
        q: 'אפשר לשחק עם כל המשפחה מול הטלוויזיה?',
        a: 'בהחלט. פותחים חדר בדפדפן של הטלוויזיה או משדרים אליה את המחשב, וכל אחד מצטרף מהטלפון שלו עם קוד החדר. כולם משחקים על אותו לוח בזמן אמת.',
      },
      {
        q: 'זה מתאים לילדים?',
        a: 'כן. ילדים שכבר קוראים יכולים לשחק לבד, והקטנים יותר נהנים לשחק בצוות עם מבוגר על אותו טלפון. בחדר פרטי משחקים רק עם מי שקיבל את הקוד.',
      },
    ],
    whenQ: 'מתי האירוע?',
    whenA: 'האירוע מתחיל ב־{start} ונמשך עד {end}. מחוץ לחג המשחק הרגיל פתוח כל השנה.',
    whenUnknown: 'האירוע חוזר בכל חנוכה. מחוץ לחג המשחק הרגיל פתוח כל השנה.',
    closingTitle: 'נר אחד בכל ערב',
    closingBody: 'מספיק משחק אחד בערב כדי להדליק את הנר. תביאו את המשפחה, כי הלוח כבר מחכה לכם.',
  },
  en: {
    dateLocale: 'en-US',
    mascot: '/holidays/m-hanukkah.webp',
    mascotLabel: 'Tap the mascot',
    intro:
      'LexiClash is a fast word game you play in the browser, and for Hanukkah it gets dressed up for the holiday. Every night you play lights another candle on the menorah, gold gelt tiles hide on the board for bonus points, and a gift waits for you after the eighth night. Play alone, against friends, or with the whole family around the TV, and it never costs a thing.',
    liveBadge: 'Hanukkah is here. The event runs until {end}.',
    offBanner: 'The event comes back next Hanukkah, starting {start}. The regular game is open all year in the meantime.',
    offUnknown: 'The event comes back next Hanukkah. The regular game is open all year in the meantime.',
    ctaLive: "Light tonight's candle",
    ctaOff: 'Play now',
    ctaDaily: "Today's daily",
    insideTitle: "What's inside for Hanukkah",
    features: [
      {
        art: '/holidays/props-menorah.webp',
        title: 'Eight nights, eight candles',
        body: 'Finish a game on any night and its candle lights up. Along the way you collect coins and avatar items: a beanie, a scarf, a dreidel pin, and on the eighth night a menorah crown with the title "Keeper of the Light".',
      },
      {
        art: '/holidays/props-gelt.webp',
        title: 'A festive board every night',
        body: 'The holiday daily hides gelt tiles. Run a word through one and it bursts into gold coins and extra points. After the game you get a dreidel spin too.',
      },
      {
        art: '/holidays/table-hanukkah.webp',
        title: 'A family holiday table',
        body: 'Start a table, send the code to grandma and the cousins, and see who finds the most words over the holiday.',
      },
      {
        art: '/holidays/gift-tier-8.webp',
        title: 'A gift that grows with you',
        body: 'Each night you play makes the mystery gift bigger, and it only opens on the last night. Missed an evening? Once during the holiday, three games in one day bring it back.',
      },
    ],
    arcadeTitle: 'The Hanukkah arcade',
    arcadeBody: 'Three quick games of about a minute and a half each, all playable with one thumb.',
    arcadeOff: 'The arcade opens with the holiday.',
    arcade: {
      oil: { name: 'Oil for 8 Nights', blurb: 'Every word refills the menorah. Keep the lights burning for eight nights.' },
      dreidel: { name: 'Dreidel Duel', blurb: 'Spin, and the letter you land on sets the rule. First to ten gelt wins.' },
      sufganiyah: { name: 'Sufganiyah Stack', blurb: 'Jelly doughnuts with letters pile up in the tray. Spell words before the stack reaches the top.' },
    },
    eggTitle: 'And a few surprises',
    eggBody: "A few small things hide around the site during the holiday. We won't say where, but the dreidel is worth a closer look.",
    faqTitle: 'Questions people ask',
    faqs: [
      { q: 'Is it really free?', a: 'Yes. You play free in your browser with nothing to download. Every Hanukkah reward comes from playing, so there is nothing to buy.' },
      { q: 'Do I need an account?', a: 'You can play without one. To light candles and keep your rewards you sign in, which takes a few seconds.' },
      { q: 'Does it work on a phone?', a: 'Yes. It runs in any browser on phones, tablets and computers.' },
      {
        q: 'Can the whole family play together on the TV?',
        a: "Yes. Open a room in the TV's browser or cast your laptop to it, and everyone joins from their own phone with the room code. You all play the same board in real time.",
      },
      {
        q: 'Is it OK for kids?',
        a: 'Yes. Kids who can read play on their own, and younger ones have fun teaming up with a grown-up on one phone. A private room only lets in people who have the code.',
      },
    ],
    whenQ: 'When is the event?',
    whenA: 'It starts on {start} and runs until {end}. Outside the holiday the regular game is open all year.',
    whenUnknown: 'It comes back every Hanukkah. Outside the holiday the regular game is open all year.',
    closingTitle: 'One candle a night',
    closingBody: 'One game an evening is enough to light the candle. Bring the family along, because the board is already waiting.',
  },
};
