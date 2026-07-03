/**
 * Localized witty templates for the daily-challenge push reminder.
 *
 * 15 templates per locale — variant index is hash(userId|date) %% 15, so each
 * user gets a stable rotation per day and analytics can attribute opens by
 * `v` query param on the deep link. {hoursLeft} is replaced with an integer
 * (min 1) at render time.
 *
 * Native review pending — `he`, `ja` copy authored by AI. Flag in PR.
 * Per `feedback-ai-hebrew-translation` and `feedback-no-branches`, ship now,
 * iterate when native speakers review. Imperfect localized copy beats
 * the same English line for non-EN users.
 */

import type { PushLocale } from '@/backend/utils/pushTranslations';

export interface DailyReminderTemplate {
  title: string;
  body: string;
  /**
   * Optional female-grammar overrides. Used by locales with gendered imperatives /
   * adjectives (Hebrew, Spanish). When the user's avatar gender is female and an
   * override is present, it replaces the neutral/masculine default. Locales with
   * no grammar gender (en, sv, ja) can leave these unset.
   */
  titleFemale?: string;
  bodyFemale?: string;
}

const EN: DailyReminderTemplate[] = [
  { title: 'Your brain called 📞', body: "It says today's daily is still unsolved. {hoursLeft}h left." },
  { title: 'Tick tock, word jock ⏰', body: "Daily challenge won't solve itself. {hoursLeft}h on the clock." },
  { title: 'Plot twist 📖', body: "You haven't played today yet. Fix that in 60 seconds." },
  { title: 'The board misses you 🧩', body: 'Letters are set. {hoursLeft}h until the door closes.' },
  { title: 'One puzzle. Your name. ✍️', body: "Today's daily is waiting for a champion." },
  { title: 'Streak check 🔥', body: "Don't let {hoursLeft}h slip — keep the chain alive." },
  { title: 'Your daily called in sick 😷', body: 'Just kidding. It wants a fight. Tap in.' },
  { title: '{hoursLeft}h left, word wizard 🧙', body: 'One quick round before the board resets.' },
  { title: 'The letters are gossiping 🤫', body: 'They say you ghosted them. Prove them wrong.' },
  { title: "Don't let today ghost you 👻", body: "60 seconds. That's all the daily needs." },
  { title: 'Challenge: unsolved 🔍', body: 'Will today have your name on it? {hoursLeft}h left.' },
  { title: 'Soft reminder 💌', body: "Daily's open. Brain's warm. Go." },
  { title: 'Clock says {hoursLeft}h ⏳', body: 'Daily challenge says: come get it.' },
  { title: 'Word nerd alert 🚨', body: "Today's puzzle hasn't met its match yet. You?" },
  { title: 'Midnight speedrun? 🏁', body: '{hoursLeft}h to solve. Less if you hustle.' },
];

// Hebrew — RTL. Punctuation order intentional for proper rendering.
// titleFemale / bodyFemale override masculine grammar when avatar gender is female.
// Native review needed (per feedback-ai-hebrew-translation).
const HE: DailyReminderTemplate[] = [
  { title: '📞 המוח שלך מתקשר', body: 'אומר שהיומי של היום עוד לא נפתר. נשארו {hoursLeft} שעות.' },
  { title: '⏰ טיק-טק, אלוף המילים', body: 'האתגר היומי לא יפתור את עצמו. {hoursLeft} שעות על השעון.',
    titleFemale: '⏰ טיק-טק, אלופת המילים' },
  { title: '📖 תפנית בעלילה', body: 'עוד לא שיחקת היום. תתקן את זה ב-60 שניות.',
    bodyFemale: 'עוד לא שיחקת היום. תתקני את זה ב-60 שניות.' },
  { title: '🧩 הלוח מתגעגע אליך', body: 'האותיות מוכנות. {hoursLeft} שעות עד שהדלת נסגרת.' },
  { title: '✍️ פאזל אחד. השם שלך.', body: 'האתגר היומי מחכה לאלוף.',
    bodyFemale: 'האתגר היומי מחכה לאלופה.' },
  { title: '🔥 בדיקת רצף', body: 'אל תתן ל-{hoursLeft} שעות לחמוק — שמור על השרשרת חיה.',
    bodyFemale: 'אל תתני ל-{hoursLeft} שעות לחמוק — שמרי על השרשרת חיה.' },
  { title: '😷 היומי שלך הודיע על מחלה', body: 'סתם צחקנו. הוא רוצה קרב. תיכנס.',
    bodyFemale: 'סתם צחקנו. הוא רוצה קרב. תיכנסי.' },
  { title: '🧙 נשארו {hoursLeft} שעות, קוסם מילים', body: 'סיבוב מהיר לפני שהלוח מתאפס.',
    titleFemale: '🧙 נשארו {hoursLeft} שעות, קוסמת מילים' },
  { title: '🤫 האותיות מרכלות', body: 'הן אומרות שעזבת אותן. תוכיח שהן טועות.',
    bodyFemale: 'הן אומרות שעזבת אותן. תוכיחי שהן טועות.' },
  { title: '👻 אל תתן להיום להעלם', body: '60 שניות. זה כל מה שהיומי צריך.',
    titleFemale: '👻 אל תתני להיום להיעלם' },
  { title: '🔍 אתגר: לא פתור', body: 'האם היום יישא את השם שלך? {hoursLeft} שעות נשארו.' },
  { title: '💌 תזכורת עדינה', body: 'היומי פתוח. המוח חם. קדימה.' },
  { title: '⏳ השעון אומר {hoursLeft} שעות', body: 'האתגר היומי אומר: בוא תיקח אותי.',
    bodyFemale: 'האתגר היומי אומר: בואי תיקחי אותי.' },
  { title: '🚨 אזעקת חובב מילים', body: 'הפאזל של היום עוד לא פגש את ניצחו. אתה?',
    titleFemale: '🚨 אזעקת חובבת מילים',
    bodyFemale: 'הפאזל של היום עוד לא פגש את ניצחו. את?' },
  { title: '🏁 ספרינט עד חצות?', body: 'נשארו {hoursLeft} שעות לפתור. פחות אם תזדרז.',
    bodyFemale: 'נשארו {hoursLeft} שעות לפתור. פחות אם תזדרזי.' },
];

const SV: DailyReminderTemplate[] = [
  { title: 'Din hjärna ringde 📞', body: 'Den säger att dagens utmaning är olöst. {hoursLeft}h kvar.' },
  { title: 'Tick tack, ordmagiker ⏰', body: 'Utmaningen löser sig inte själv. {hoursLeft}h på klockan.' },
  { title: 'Plot twist 📖', body: 'Du har inte spelat idag. Fixa det på 60 sekunder.' },
  { title: 'Brädet saknar dig 🧩', body: 'Bokstäverna är uppsatta. {hoursLeft}h tills luckan stängs.' },
  { title: 'Ett pussel. Ditt namn. ✍️', body: 'Dagens utmaning väntar på en mästare.' },
  { title: 'Seriekoll 🔥', body: 'Låt inte {hoursLeft}h slinka iväg — håll kedjan vid liv.' },
  { title: 'Utmaningen sjukanmälde sig 😷', body: 'Skojar bara. Den vill ha en match. Hoppa in.' },
  { title: '{hoursLeft}h kvar, ordtrollkarl 🧙', body: 'En snabb runda innan brädet återställs.' },
  { title: 'Bokstäverna skvallrar 🤫', body: 'De säger att du ghostat dem. Bevisa motsatsen.' },
  { title: 'Låt inte dagen ghosta dig 👻', body: '60 sekunder. Det är allt utmaningen behöver.' },
  { title: 'Utmaning: olöst 🔍', body: 'Får dagen ditt namn på sig? {hoursLeft}h kvar.' },
  { title: 'Mjuk påminnelse 💌', body: 'Utmaningen är öppen. Hjärnan är varm. Kör.' },
  { title: 'Klockan säger {hoursLeft}h ⏳', body: 'Utmaningen säger: kom och ta mig.' },
  { title: 'Ordnörd-larm 🚨', body: 'Dagens pussel har inte mött sin match. Du?' },
  { title: 'Midnattsspeedrun? 🏁', body: '{hoursLeft}h att lösa. Mindre om du skyndar.' },
];

// Japanese — native review needed. Casual + slightly playful tone fits the app voice.
const JA: DailyReminderTemplate[] = [
  { title: '脳から電話 📞', body: '「今日のデイリーまだだよ」。残り{hoursLeft}時間。' },
  { title: 'チクタク、言葉職人 ⏰', body: 'デイリーは自動で解けない。残り{hoursLeft}時間。' },
  { title: 'まさかの展開 📖', body: '今日まだ遊んでない。60秒で解決しよう。' },
  { title: 'ボードが寂しがってる 🧩', body: '文字は揃った。あと{hoursLeft}時間で締切。' },
  { title: '今日のパズル、君の名前を 待ってる ✍️', body: 'デイリーチャレンジが王者を求めてる。' },
  { title: '連続記録チェック 🔥', body: '{hoursLeft}時間を逃すな — 連続を切らさないで。' },
  { title: 'デイリー欠席届 😷', body: 'なんてね。勝負を望んでる。タップして参戦。' },
  { title: '残り{hoursLeft}時間、言葉の魔法使い 🧙', body: 'リセット前にサクッと一戦。' },
  { title: '文字たちが噂してる 🤫', body: '「あの人に無視された」。違うって証明しよう。' },
  { title: '今日に消されないで 👻', body: '60秒。デイリーはそれだけでいい。' },
  { title: 'チャレンジ：未解決 🔍', body: '今日は君の名前が刻まれる？残り{hoursLeft}時間。' },
  { title: 'やさしいリマインド 💌', body: 'デイリー解放中。頭はあったまってる。GO。' },
  { title: '時計が言う、{hoursLeft}時間 ⏳', body: 'デイリーが呼んでる。受けて立つ？' },
  { title: '言葉オタクに告ぐ 🚨', body: '今日のパズル、まだ無敗。君が止める？' },
  { title: '深夜スピードラン？ 🏁', body: '残り{hoursLeft}時間。急げばもっと短い。' },
];

const ES: DailyReminderTemplate[] = [
  { title: 'Tu cerebro llamó 📞', body: 'Dice que el reto de hoy sigue sin resolver. {hoursLeft}h restantes.' },
  { title: '¡Tic tac, mago de palabras! ⏰', body: 'El reto no se resuelve sólo. Quedan {hoursLeft}h en el reloj.' },
  { title: 'Giro inesperado 📖', body: 'Aún no has jugado hoy. Arréglalo en 60 segundos.' },
  { title: 'El tablero te extraña 🧩', body: 'Las letras están listas. Quedan {hoursLeft}h hasta que cierre.' },
  { title: 'Un puzle. Tu nombre. ✍️', body: 'El reto diario está esperando un campeón.',
    bodyFemale: 'El reto diario está esperando una campeona.' },
  { title: '¡Revisión de racha! 🔥', body: 'No dejes que se vayan {hoursLeft}h — mantén viva la cadena.' },
  { title: 'Tu reto se reportó enfermo 😷', body: '¡Mentira! Quiere pelea. Métete ya.' },
  { title: '{hoursLeft}h restantes, mago de palabras 🧙', body: 'Una ronda rápida antes de que el tablero se reinicie.',
    titleFemale: '{hoursLeft}h restantes, maga de palabras 🧙' },
  { title: 'Las letras están chismeando 🤫', body: 'Dicen que las dejaste en visto. Demuéstrales que no.' },
  { title: '¡No dejes que hoy te ignore! 👻', body: '60 segundos. Eso es todo lo que necesita el reto.' },
  { title: 'Reto: sin resolver 🔍', body: '¿Llevará hoy tu nombre? Quedan {hoursLeft}h.' },
  { title: 'Recordatorio suave 💌', body: '¡El reto está abierto! La mente caliente. ¡Dale!' },
  { title: 'El reloj marca {hoursLeft}h ⏳', body: 'El reto diario dice: ¡ven a por mí!' },
  { title: '¡Alerta de friki de palabras! 🚨', body: 'El puzle de hoy aún no ha encontrado rival. ¿Tú?' },
  { title: '¿Speedrun de medianoche? 🏁', body: 'Quedan {hoursLeft}h para resolverlo. Menos si te das prisa.' },
];

// Russian — gender-neutral (present/imperative phrasing avoids Russian's
// gendered past tense). AI-authored, native review pending.
const RU: DailyReminderTemplate[] = [
  { title: 'Твой мозг звонит 📞', body: 'Говорит, сегодняшний вызов ещё не решён. Осталось {hoursLeft} ч.' },
  { title: 'Тик-так, мастер слов ⏰', body: 'Вызов сам себя не решит. {hoursLeft} ч на часах.' },
  { title: 'Неожиданный поворот 📖', body: 'Сегодня ты ещё не в игре. Исправь это за 60 секунд.' },
  { title: 'Поле скучает по тебе 🧩', body: 'Буквы готовы. {hoursLeft} ч до закрытия.' },
  { title: 'Один пазл. Твоё имя. ✍️', body: 'Ежедневный вызов ждёт чемпиона.' },
  { title: 'Проверка серии 🔥', body: 'Не дай {hoursLeft} ч ускользнуть — сохрани серию.' },
  { title: 'Вызов взял больничный 😷', body: 'Шутка. Он хочет боя. Заходи.' },
  { title: 'Осталось {hoursLeft} ч, волшебник слов 🧙', body: 'Быстрый раунд, пока поле не сбросилось.' },
  { title: 'Буквы сплетничают 🤫', body: 'Они заждались. Покажи, что ты в игре.' },
  { title: 'Не дай сегодняшнему дню ускользнуть 👻', body: '60 секунд — это всё, что нужно вызову.' },
  { title: 'Вызов: не решён 🔍', body: 'Появится ли сегодня твоё имя? Осталось {hoursLeft} ч.' },
  { title: 'Мягкое напоминание 💌', body: 'Вызов открыт. Мозг разогрет. Вперёд.' },
  { title: 'Часы показывают {hoursLeft} ч ⏳', body: 'Ежедневный вызов зовёт: приходи за победой.' },
  { title: 'Внимание, словесный гик 🚨', body: 'Сегодняшний пазл ещё не нашёл соперника. Ты?' },
  { title: 'Ночной спидран? 🏁', body: '{hoursLeft} ч на решение. Меньше, если поспешишь.' },
];

export const DAILY_REMINDER_TEMPLATES_BY_LOCALE: Record<PushLocale, DailyReminderTemplate[]> = {
  en: EN,
  he: HE,
  sv: SV,
  ja: JA,
  es: ES,
  ru: RU,
};

export const DAILY_REMINDER_TEMPLATE_COUNT = EN.length;
