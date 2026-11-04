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
};
