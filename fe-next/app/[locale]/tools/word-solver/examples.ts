import type { Locale } from './content';

export interface SolverExample {
  letters: string;
  total: number;
  picks: string[];
  note: string;
}

export interface SolverExamples {
  heading: string;
  lead: string;
  lettersLabel: string;
  countLabel: string;
  picksLabel: string;
  countSuffix: string;
  listSeparator: string;
  rows: SolverExample[];
  outro: string;
}

export const SOLVER_EXAMPLES: Partial<Record<Locale, SolverExamples>> = {
  en: {
    heading: 'Anagram solver examples',
    lead: 'These are real searches on this page. The count is how many words those letters make in our English dictionary, which includes rare Scrabble-style words.',
    lettersLabel: 'Letters',
    countLabel: 'Words found',
    picksLabel: 'Some of the words',
    countSuffix: ' words',
    listSeparator: ', ',
    rows: [
      { letters: 'listen', total: 119, picks: ['silent', 'enlist', 'tinsel'], note: 'A classic: all six letters rearrange into three everyday words.' },
      { letters: 'earth', total: 55, picks: ['heart', 'hater', 'hear'], note: 'Shorter words count too, so five letters go further than you might expect.' },
      { letters: 'aelrst', total: 168, picks: ['alert', 'alter', 'staler'], note: 'Common letters like these are worth keeping on a Scrabble rack.' },
      { letters: 'moon starer', total: 782, picks: ['astronomer', 'restroom', 'resonator'], note: 'Spaces are ignored, so you can paste a whole phrase. Results are single words.' },
      { letters: 'cat?', total: 140, picks: ['coat', 'cart', 'chat'], note: 'A question mark is a blank tile that can be any letter. You can use up to three.' },
    ],
    outro: 'Each search shows up to 500 words, longest first. Want to find them yourself against the clock? Play a round of LexiClash.',
  },
  ja: {
    heading: 'アナグラム検索の例',
    lead: 'このページの検索で実際に出た結果です。ひらがな・カタカナ・漢字のどれで入れても探せます。カタカナはひらがなに直してから辞書と照らし合わせます。',
    lettersLabel: '入れた文字',
    countLabel: '見つかった数',
    picksLabel: 'おもな結果',
    countSuffix: '語',
    listSeparator: '、',
    rows: [
      { letters: 'とうきょう', total: 14, picks: ['きょうと'], note: '「東京」の読みを並べ替えると「京都」になります。' },
      { letters: '社会', total: 2, picks: ['会社'], note: '漢字のまま入れると、漢字の熟語どうしで並べ替えます。' },
      { letters: '会議室', total: 3, picks: ['会議', '議会'], note: '3文字の熟語から、短い熟語も一緒に見つかります。' },
      { letters: 'ちょこれーと', total: 14, picks: ['こーち', 'ちーと', 'れーと'], note: '「ー」や小さい「ょ」も1文字として数えます。「チョコレート」と入れても同じ結果です。' },
      { letters: 'ねこ?', total: 111, picks: ['こねこ', 'こがね', 'こぶね'], note: '「?」はどの文字にもなる空きマスです（3つまで）。全角の「？」でも使えます。' },
    ],
    outro: '結果は長い言葉から順に最大500語まで表示します。英単語のアナグラムを調べたいときは、辞書の言語を「English」に切り替えてください。',
  },
  ru: {
    heading: 'Примеры: какие слова получаются из букв',
    lead: 'Ниже настоящие результаты поиска на этой странице. Число показывает, сколько слов выходит из этих букв в нашем русском словаре. Словарь большой: в нём есть формы слов, редкие слова, имена и сокращения.',
    lettersLabel: 'Буквы',
    countLabel: 'Найдено слов',
    picksLabel: 'Некоторые из слов',
    countSuffix: '',
    listSeparator: ', ',
    rows: [
      { letters: 'слово', total: 25, picks: ['волос', 'ослов', 'слово'], note: 'Из одних и тех же пяти букв складываются три разных слова.' },
      { letters: 'апельсин', total: 338, picks: ['спаниель', 'напелись', 'спальни'], note: 'Из всех восьми букв получается и другое длинное слово, «спаниель».' },
      { letters: 'морковь', total: 54, picks: ['кровь', 'ковром', 'корм'], note: 'Формы слов тоже считаются, поэтому здесь есть и «ковром».' },
      { letters: 'ёлка', total: 21, picks: ['ёлка', 'елка', 'лак'], note: 'Е и Ё считаются одной буквой, так что «елка» даст тот же результат.' },
      { letters: 'кот?', total: 199, picks: ['крот', 'скот', 'корт'], note: 'Вопросительный знак заменяет любую букву. Таких знаков можно поставить до трёх.' },
    ],
    outro: 'За один поиск показываем до 500 слов, сначала самые длинные. Хочешь находить такие слова сам и на время? Сыграй раунд в LexiClash.',
  },
  sv: {
    heading: 'Exempel: bilda ord av bokstäver',
    lead: 'Så här ser riktiga sökningar ut i ordlösaren. Siffrorna är antalet ord som bokstäverna räcker till i vår svenska ordlista.',
    lettersLabel: 'Bokstäver',
    countLabel: 'Antal ord',
    picksLabel: 'Några av orden',
    countSuffix: ' ord',
    listSeparator: ', ',
    rows: [
      { letters: 'bokstäver', total: 296, picks: ['beskärt', 'osäkert', 'vätskor'], note: 'Nio bokstäver ger många långa ord.' },
      { letters: 'stjärna', total: 114, picks: ['tjänar', 'tränas', 'nästa'], note: 'Sju bokstäver räcker till över hundra ord.' },
      { letters: 'sommar', total: 39, picks: ['morsa', 'arom', 'mars'], note: 'Dubbla bokstäver räknas var för sig.' },
      { letters: 'kärlek', total: 27, picks: ['läker', 'kälke', 'relä'], note: 'Å, ä och ö är egna bokstäver, inte a och o.' },
      { letters: 'kärl?k', total: 172, picks: ['kälkar', 'lärka', 'kläck'], note: 'Frågetecknet är en blank bricka som kan bli vilken bokstav som helst.' },
    ],
    outro: 'Upp till 500 ord visas per sökning, de längsta först. Vill du träna på att hitta dem själv under tidspress? Spela en omgång LexiClash.',
  },
};
