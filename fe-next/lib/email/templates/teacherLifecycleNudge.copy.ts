import type { TeacherLocale } from '@/lib/education/types';
import type { NeoAccent, NeoArt } from '@/lib/email/kit/neoEmail';
import type { LifecycleStage } from '@/lib/education/lifecycleNudges';

type Stage = LifecycleStage | 'reactivate';

interface StageLook {
  headline: string;
  preheader: string;
}

export interface LifecycleLookCopy {
  kicker: string;
  signoff: string;
  footnote: string;
  stages: Record<Stage, StageLook>;
}

export const LIFECYCLE_LOOK: Record<Stage, { accent: NeoAccent; art: NeoArt }> = {
  share_code: { accent: 'cyan', art: 'welcome' },
  start_live: { accent: 'pink', art: 'projector' },
  second_game: { accent: 'purple', art: 'report' },
  reactivate: { accent: 'orange', art: 'miss-you' },
};

export const LIFECYCLE_COPY: Record<TeacherLocale, LifecycleLookCopy> = {
  en: {
    kicker: 'Your class',
    signoff: 'Ohad, who built LexiClash. Replies come straight to me.',
    footnote: 'You get this because you signed up as a teacher on LexiClash.',
    stages: {
      share_code: { headline: 'Your class needs its students', preheader: 'Put the code on the board or paste the link in your class chat.' },
      start_live: { headline: 'Time for a live game', preheader: 'Pick a word list, press start, and the whole class plays at once.' },
      second_game: { headline: 'Round two makes it stick', preheader: 'See which words they missed and play those next.' },
      reactivate: { headline: 'Your access is still open', preheader: 'Name a class, get a code, and your students can play today.' },
    },
  },
  he: {
    kicker: 'הכיתה שלך',
    signoff: 'אוהד, שבנה את LexiClash. תשובות למייל מגיעות ישר אליי.',
    footnote: 'המייל הזה נשלח כי נרשמת כמורה ב-LexiClash.',
    stages: {
      share_code: { headline: 'הכיתה מחכה לתלמידים', preheader: 'כותבים את הקוד על הלוח או מדביקים את הקישור בקבוצת הכיתה.' },
      start_live: { headline: 'הגיע הזמן למשחק חי', preheader: 'בוחרים רשימת מילים, לוחצים על התחלה, וכל הכיתה משחקת יחד.' },
      second_game: { headline: 'בסיבוב השני זה נקלט', preheader: 'רואים אילו מילים התלמידים פספסו ומשחקים דווקא בהן.' },
      reactivate: { headline: 'הגישה שלך עדיין פתוחה', preheader: 'נותנים לכיתה שם, מקבלים קוד, והתלמידים משחקים כבר היום.' },
    },
  },
  sv: {
    kicker: 'Din klass',
    signoff: 'Ohad, som byggde LexiClash. Svar hamnar direkt hos mig.',
    footnote: 'Du får det här för att du registrerade dig som lärare på LexiClash.',
    stages: {
      share_code: { headline: 'Klassen väntar på eleverna', preheader: 'Skriv koden på tavlan eller klistra in länken i klassens chatt.' },
      start_live: { headline: 'Dags för ett livespel', preheader: 'Välj en ordlista, tryck på start, så spelar hela klassen samtidigt.' },
      second_game: { headline: 'Andra rundan får orden att fastna', preheader: 'Se vilka ord eleverna missade och spela på just dem.' },
      reactivate: { headline: 'Din behörighet är fortfarande öppen', preheader: 'Ge klassen ett namn, få en kod, så kan eleverna spela i dag.' },
    },
  },
  ja: {
    kicker: 'あなたのクラス',
    signoff: 'LexiClash作者のOhadより。返信は私に直接届きます。',
    footnote: 'LexiClashに教師として登録された方にお送りしています。',
    stages: {
      share_code: { headline: 'あとは生徒を招くだけ', preheader: 'コードを黒板に書くか、リンクをクラスのチャットに貼ってください。' },
      start_live: { headline: 'ライブゲームを始めましょう', preheader: '単語リストを選んでスタートを押せば、クラス全員で同時に遊べます。' },
      second_game: { headline: '2回目で単語が定着します', preheader: '生徒が間違えた単語を確認して、次はその単語で遊びましょう。' },
      reactivate: { headline: 'アクセスはまだ有効です', preheader: 'クラス名を決めてコードを受け取れば、生徒は今日から遊べます。' },
    },
  },
  es: {
    kicker: 'Tu clase',
    signoff: 'Ohad, creador de LexiClash. Las respuestas me llegan directamente.',
    footnote: 'Recibes esto porque te registraste como docente en LexiClash.',
    stages: {
      share_code: { headline: 'Tu clase espera a tus alumnos', preheader: 'Escribe el código en la pizarra o pega el enlace en el chat de la clase.' },
      start_live: { headline: 'Hora de jugar en vivo', preheader: 'Elige una lista de palabras, pulsa empezar y juega toda la clase a la vez.' },
      second_game: { headline: 'La segunda ronda las fija', preheader: 'Mira qué palabras fallaron y juega justo con esas.' },
      reactivate: { headline: 'Tu acceso sigue abierto', preheader: 'Ponle nombre a una clase, recibe un código y tus alumnos juegan hoy.' },
    },
  },
  ru: {
    kicker: 'Ваш класс',
    signoff: 'Охад, автор LexiClash. Ответы приходят прямо мне.',
    footnote: 'Вы получили это письмо, потому что зарегистрировались в LexiClash как учитель.',
    stages: {
      share_code: { headline: 'Класс ждёт учеников', preheader: 'Напишите код на доске или вставьте ссылку в чат класса.' },
      start_live: { headline: 'Пора сыграть вживую', preheader: 'Выберите список слов, нажмите «Старт», и весь класс играет сразу.' },
      second_game: { headline: 'Второй раунд закрепляет слова', preheader: 'Посмотрите, какие слова ученики пропустили, и сыграйте именно на них.' },
      reactivate: { headline: 'Ваш доступ всё ещё открыт', preheader: 'Назовите класс, получите код, и ученики сыграют уже сегодня.' },
    },
  },
};
