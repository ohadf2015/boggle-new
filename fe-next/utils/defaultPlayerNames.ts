/**
 * Names LexiClash hands out when a player never picked one.
 *
 * A guest gets one of these on first visit (translations joinView.defaultPlayerNames,
 * the /api/random-name pool in backend BOT_CONFIG.PLAYER_NAMES, or the authUtils
 * offline fallback), and bots use the same pools. A row on the daily leaderboard
 * under one of these is a player who hasn't claimed their score yet.
 *
 * Kept as a flat list so the results screen doesn't load six translation catalogues.
 * defaultPlayerNames.test.ts fails when a source pool gains a name missing here.
 */
export const DEFAULT_PLAYER_NAMES: readonly string[] = [
  'Sneaky Potato', 'Donut Disturb', 'Baron Waffle', 'Llama Rey', 'Taco Talent', 'Mochi Boss',
  'Sly Penguin', 'Rogue Walrus', 'Pro Goose', 'Captain Pretzel', 'Cosmic Avocado', 'Unhinged Flamingo',
  'Secret Dragon', 'Turbo Salmon', 'Grumpy Bear', 'Chill Zebra', 'Fancy Koala', 'Slick Raccoon',
  'Hyper Hippo', 'Vibing Jellyfish', 'Sly Fox', 'Cookie Junior', 'Lazy Sloth', 'Ninja Noodle',
  'Disco Pickle', 'Falafel Royale', 'Funky Robot', 'Donut Duke', 'Banana Bandit', 'Chaos Turtle',
  'תפוח חמקמק', 'דונאט שובב', 'ברון וופל', 'לאמה דרמטית', 'טאקו טורבו', 'בוס מוצ׳י',
  'פינגווין ערמומי', 'כלבים חשוד', 'אווז מקצועי', 'קפטן בייגלה', 'אבוקדו קוסמי', 'פלמינגו מופרע',
  'דרקון סודי', 'סלמון טורבו', 'דוב רגזן', 'זברה רגועה', 'קואלה מפונק', 'רקון אלגנטי',
  'היפו היפר', 'מדוזה רגועה', 'שועל ערמומי', 'עוגייה ג׳וניור', 'עצלן מקצועי', 'נינג׳ה נודל',
  'מלפפון דיסקו', 'פלאפל רויאל', 'רובוט פאנקי', 'דוכס דונאט', 'בננה שודד', 'צב כאוטי',
  'Smyg Potatis', 'Munk Störej', 'Baron Våffla', 'Lagom Lama', 'Fika Flamingo', 'Taco Talang',
  'Slug Pingvin', 'Fräck Valross', 'Proffs Gås', 'Kapten Kringla', 'Kosmisk Avokado', 'Galen Flamingo',
  'Hemlig Drake', 'Turbo Lax', 'Grull Björn', 'Snygg Tvättbjörn', 'Hyper Flodhäst', 'Vibbar Manet',
  'Slug Räv', 'Kaka Junior', 'Lat Sengångare', 'Ninja Nudel', 'Disco Gurka', 'Munk Hertig',
  'Kaos Sköldpadda', 'こっそりポテト', 'いたずらドーナツ', 'ワッフル男爵', 'ドラマラマ', 'ターボタコス',
  'モチボス', 'ずるいペンギン', 'あやしいセイウチ', 'プロガチョウ', 'プレッツェル隊長', '宇宙アボカド',
  '暴走フラミンゴ', '秘密ドラゴン', 'ターボサーモン', '怒りクマ', 'のんびりシマウマ', 'おしゃれコアラ',
  'スマートアライグマ', 'ハイパーカバ', 'のんびりクラゲ', 'ずるいキツネ', 'クッキー二世', 'プロなまけもの',
  '忍者ヌードル', 'ディスコきゅうり', 'ファラフェル王族', 'ファンキーロボ', 'ドーナツ公爵', 'バナナ盗賊',
  'カオスかめ', 'Papa Astuta', 'Donut Travieso', 'Barón Waffle', 'Llama Dramática', 'Taco Turbo',
  'Mochi Jefe', 'Pingüino Astuto', 'Morsa Sospechosa', 'Ganso Profesional', 'Capitán Pretzel', 'Aguacate Cósmico',
  'Flamenco Loco', 'Dragón Secreto', 'Salmón Turbo', 'Oso Gruñón', 'Cebra Relajada', 'Koala Elegante',
  'Mapache Chic', 'Hipo Híper', 'Medusa Relajada', 'Zorro Astuto', 'Galleta Junior', 'Perezoso Pro',
  'Ninja Fideo', 'Pepinillo Disco', 'Falafel Royal', 'Robot Funky', 'Duque Donut', 'Banana Bandido',
  'Tortuga Caótica', 'Хитрая картошка', 'Пончик не беспокойся', 'Барон Вафля', 'Лама Рей', 'Талант Тако',
  'Моти Босс', 'Хитрый пингвин', 'Плут морж', 'Профи гусь', 'Капитан кренделек', 'Космический авокадо',
  'Без ума фламинго', 'Тайный дракон', 'Турбо лосось', 'Ворчливый медведь', 'Спокойная зебра', 'Причудливая коала',
  'Гладкий енот', 'Гиперактивный бегемот', 'Вибрирующая медуза', 'Хитрая лиса', 'Печенье младший', 'Ленивый ленивец',
  'Ниндзя лапша', 'Диско маринад', 'Фалафель королевский', 'Фанк робот', 'Пончик герцог', 'Бандит банан',
  'Хаос черепаха', 'Sneaky Pickle', 'Disco Potato', 'Cosmic Banana', 'Fluffy Waffle', 'Crispy Taco',
  'Squishy Mochi', 'Twisty Pretzel', 'Chunky Cookie', 'Gooey Donut', 'Zesty Avocado', 'Chewy Noodle',
  'Crunchy Falafel', 'Zany Zucchini', 'Silly Salmon', 'Giggly Goose', 'Wacky Walrus', 'Peppy Penguin',
  'Loopy Llama', 'Dizzy Dragon', 'Funky Flamingo', 'Bouncy Bear', 'Zippy Zebra', 'Sassy Sloth',
  'Quirky Quokka', 'Jolly Jellyfish', 'Rowdy Raccoon', 'Fizzy Fox', 'Happy Hippo', 'Kooky Koala',
  'מלפפון חמקמק', 'תפוח אדמה דיסקו', 'בננה קוסמית', 'וופל פלאפי', 'טאקו קריספי', 'מוצי סקוושי',
  'בייגלה מפותל', 'עוגייה צאנקית', 'דונאט דביק', 'אבוקדו זסטי', 'נודל לעיס', 'פלאפל קריספי',
  'סלמון סילי', 'אווז צחקני', 'כלב ים משוגע', 'פינגווין פפי', 'למה לופי', 'דרקון מסוחרר',
  'פלמינגו פאנקי', 'דוב קופצני', 'זברה זיפי', 'עצלן חצוף', 'קואלה משונה', 'מדוזה עליזה',
  'רקון רועש', 'שועל פיזי', 'היפו שמח', 'Smyg Gurka', 'Disco Potatis', 'Kosmisk Banan',
  'Fluffig Våffla', 'Krispig Taco', 'Mjuk Mochi', 'Vriden Kringla', 'Chunky Kaka', 'Kladdig Munk',
  'Pigg Avokado', 'Seg Nudel', 'Fånig Lax', 'Fnissig Gås', 'Galen Valross', 'Pigg Pingvin',
  'Loopy Lama', 'Yr Drake', 'Studsig Björn', 'Snabb Zebra', 'Fräck Sengångare', 'Knasig Koala',
  'Glad Manet', 'Vild Tvättbjörn', 'Fräsig Räv', 'Glad Flodhäst', 'こっそりピクルス', 'ディスコポテト',
  'コズミックバナナ', 'ふわふわワッフル', 'カリカリタコス', 'もちもちモチ', 'ねじねじプレッツェル', 'ザクザククッキー',
  'とろとろドーナツ', 'ピリピリアボカド', 'もちもちヌードル', 'おバカサーモン', 'くすくすガチョウ', 'おかしなセイウチ',
  'ペッピーペンギン', 'ルーピーラマ', 'くるくるドラゴン', 'ファンキーフラミンゴ', 'ぴょんぴょんクマ', 'びゅんびゅんシマウマ',
  'おませなナマケモノ', 'へんてこコアラ', 'ハッピークラゲ', 'やんちゃアライグマ', 'シュワシュワキツネ', 'ハッピーカバ',
  'Pepino Astuto', 'Patata Disco', 'Banana Cósmica', 'Waffle Esponjoso', 'Taco Crujiente', 'Mochi Blandito',
  'Pretzel Retorcido', 'Galleta Gordita', 'Dona Pegajosa', 'Aguacate Picante', 'Fideo Chicle', 'Falafel Crujiente',
  'Salmón Bobo', 'Ganso Risueño', 'Morsa Loca', 'Pingüino Animado', 'Llama Chiflada', 'Dragón Mareado',
  'Flamenco Funky', 'Oso Saltarín', 'Cebra Veloz', 'Perezoso Sassy', 'Koala Raro', 'Medusa Alegre',
  'Mapache Ruidoso', 'Zorro Chispeante', 'Hippo Feliz',
  // Literal fallbacks when no name could be generated
  'Player', 'Guest',
];

const normalize = (name: string): string =>
  name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();

const DEFAULT_NAME_SET = new Set(DEFAULT_PLAYER_NAMES.map(normalize));

/**
 * True when the name is one we generated, not one the player chose.
 * Ignores case, extra spaces and a trailing number ("Sneaky Potato 2").
 */
export function isDefaultPlayerName(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = normalize(name);
  if (!n) return false;
  return DEFAULT_NAME_SET.has(n) || DEFAULT_NAME_SET.has(n.replace(/\s*#?\d+$/, ''));
}
