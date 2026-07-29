/**
 * Localized strings for HowTo and Daily Challenge Event JSON-LD schemas.
 * Drives rich-result eligibility for "how to play" queries in each market.
 */

export type SupportedLocale = 'he' | 'en' | 'sv' | 'ja' | 'es';

export interface HowToStepStrings {
  name: string;
  text: string;
}

export interface LocalizedSchemaStrings {
  howToName: string;
  howToDescription: string;
  steps: [HowToStepStrings, HowToStepStrings, HowToStepStrings, HowToStepStrings];
  dailyEventName: string;
  dailyEventDescription: string;
}

const STRINGS: Record<SupportedLocale, LocalizedSchemaStrings> = {
  en: {
    howToName: 'How to Play LexiClash',
    howToDescription: 'Learn how to play the multiplayer word game LexiClash',
    steps: [
      {
        name: 'Create or Join a Room',
        text: 'Create a new game room or join an existing one using a room code or QR scan',
      },
      {
        name: 'Find Words on the Grid',
        text: 'Swipe or click adjacent letters to form words — longer words score more points!',
      },
      {
        name: 'Build Combos',
        text: 'Find words in quick succession to build combos and multiply your score',
      },
      {
        name: 'Beat Your Opponents!',
        text: 'The player with the most points when time runs out wins. Words found by everyone score nothing!',
      },
    ],
    dailyEventName: 'LexiClash Daily Challenge',
    dailyEventDescription:
      'Daily word puzzle — same board for everyone worldwide! Share your results like Wordle',
  },
  he: {
    howToName: 'איך לשחק ב-LexiClash',
    howToDescription: 'למדו כיצד לשחק במשחק המילים המרובה משתתפים LexiClash',
    steps: [
      {
        name: 'צרו או הצטרפו לחדר',
        text: 'צרו חדר משחק חדש או הצטרפו לחדר קיים באמצעות קוד חדר או סריקת QR',
      },
      {
        name: 'מצאו מילים בלוח',
        text: 'החליקו או לחצו על אותיות סמוכות כדי ליצור מילים - ככל שהמילה ארוכה יותר, יותר נקודות!',
      },
      {
        name: 'בנו קומבו',
        text: 'מצאו מילים במהירות רצופה לבניית קומבו ולהכפלת הניקוד שלכם',
      },
      {
        name: 'נצחו את היריבים!',
        text: 'השחקן עם הכי הרבה נקודות בסוף הזמן מנצח. מילים שנמצאו על ידי כולם לא נותנות נקודות!',
      },
    ],
    dailyEventName: 'אתגר יומי של LexiClash',
    dailyEventDescription:
      'פאזל מילים יומי - אותו לוח לכולם ברחבי העולם! שתפו את התוצאות שלכם כמו וורדל',
  },
  sv: {
    howToName: 'Så spelar du LexiClash',
    howToDescription: 'Lär dig hur du spelar ordspelet LexiClash med flera spelare',
    steps: [
      {
        name: 'Skapa eller gå med i ett rum',
        text: 'Skapa ett nytt spelrum eller gå med i ett befintligt med rumskod eller QR-skanning',
      },
      {
        name: 'Hitta ord på brädet',
        text: 'Svep eller klicka på intilliggande bokstäver för att bilda ord — längre ord ger fler poäng!',
      },
      {
        name: 'Bygg kombos',
        text: 'Hitta ord snabbt efter varandra för att bygga kombos och multiplicera din poäng',
      },
      {
        name: 'Slå dina motståndare!',
        text: 'Spelaren med flest poäng när tiden går ut vinner. Ord som alla hittar ger noll poäng!',
      },
    ],
    dailyEventName: 'LexiClash Daglig Utmaning',
    dailyEventDescription:
      'Dagligt ordpussel — samma bräde för alla i hela världen! Dela dina resultat som Wordle',
  },
  ja: {
    howToName: 'LexiClashの遊び方',
    howToDescription: 'マルチプレイヤー単語ゲーム LexiClash の遊び方を学びましょう',
    steps: [
      {
        name: 'ルームを作成または参加',
        text: '新しいゲームルームを作成するか、ルームコードまたはQRスキャンで既存のルームに参加します',
      },
      {
        name: 'グリッドで単語を見つける',
        text: '隣接する文字をスワイプまたはクリックして単語を作ります。長い単語ほど高得点！',
      },
      {
        name: 'コンボを作る',
        text: '素早く単語を見つけてコンボを作り、スコアを倍増させましょう',
      },
      {
        name: '対戦相手に勝とう！',
        text: '時間切れ時に最も得点の高いプレイヤーが勝ちます。全員が見つけた単語は得点になりません！',
      },
    ],
    dailyEventName: 'LexiClash デイリーチャレンジ',
    dailyEventDescription:
      '毎日の単語パズル — 世界中のみんなが同じ盤面！Wordleのように結果をシェアしよう',
  },
  es: {
    howToName: 'Cómo jugar a LexiClash',
    howToDescription: 'Aprende a jugar al juego de palabras multijugador LexiClash',
    steps: [
      {
        name: 'Crea o únete a una sala',
        text: 'Crea una nueva sala de juego o únete a una existente con un código o escaneo QR',
      },
      {
        name: 'Encuentra palabras en la cuadrícula',
        text: 'Desliza o haz clic en letras adyacentes para formar palabras — ¡las palabras largas dan más puntos!',
      },
      {
        name: 'Construye combos',
        text: 'Encuentra palabras rápidamente para construir combos y multiplicar tu puntuación',
      },
      {
        name: '¡Vence a tus oponentes!',
        text: '¡El jugador con más puntos cuando se acaba el tiempo gana! Las palabras que todos encuentran no dan puntos.',
      },
    ],
    dailyEventName: 'Desafío Diario de LexiClash',
    dailyEventDescription:
      'Puzzle de palabras diario — ¡el mismo tablero para todos en el mundo! Comparte tus resultados como Wordle',
  },
};

export function getLocalizedSchemaStrings(
  locale: SupportedLocale | string,
): LocalizedSchemaStrings {
  return STRINGS[locale as SupportedLocale] ?? STRINGS.en;
}
