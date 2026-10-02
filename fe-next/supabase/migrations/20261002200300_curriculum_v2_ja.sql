-- Curriculum word lists v2 (ja): kid-level definitions, one example sentence and a
-- support/core/challenge tier per word. GENERATED from lib/education/curriculum/data/ja.json
-- by scripts/curriculum/build-curriculum-migrations.ts; edit the JSON, not this file.
-- Every word is checked against public/dicts/<lang>.dict.gz by curriculumContent.test.ts.
-- Fixed ids + ON CONFLICT make it safe to re-run. Replaced lists are deactivated, not deleted.
-- The count column is GENERATED, so the INSERT leaves it out.

INSERT INTO curriculum_word_lists (id, name, description, language, grade_level, subject, curriculum_standard, words, is_active)
VALUES
  (
    'e6828e76-7456-5074-873e-af01ce4ee6be', $t$小学1年 — はじめての ことば$t$,
    $t$家や学校、家族の身近なことば。ゲームの盤面と同じひらがなで、1年生が読めるわかち書きの例文つき。$t$,
    'ja', 'grade_1', 'general', 'LC-JA-G1-FIRST',
    $j$[
      {"word":"たいよう","definition":"ひるま そらで あかるく かがやいて、ちきゅうを あたためる おおきな ほし","example":"きょうは たいようが まぶしくて、ぼうしを かぶった。","level":"support","canIntegrate":true},
      {"word":"うさぎ","definition":"ながい みみと ふわふわの けを もち、ぴょんぴょん はねる どうぶつ","example":"がっこうで うさぎに にんじんを あげた。","level":"support","canIntegrate":true},
      {"word":"さかな","definition":"みずの なかに すみ、ひれを うごかして およぐ いきもの","example":"かわで ちいさな さかなが およいで いた。","level":"support","canIntegrate":true},
      {"word":"りんご","definition":"あかい かわで、かむと しゃきっと する あまずっぱい くだもの","example":"おやつに りんごを はんぶん たべた。","level":"support","canIntegrate":true},
      {"word":"たまご","definition":"にわとりなどが うむ、からに つつまれた まるい もの","example":"れいぞうこから たまごを ふたつ だした。","level":"support","canIntegrate":true},
      {"word":"くるま","definition":"エンジンで うごき、みちを はしって ひとや にもつを はこぶ のりもの","example":"うちの くるまは あおい いろです。","level":"support","canIntegrate":true},
      {"word":"つくえ","definition":"べんきょうや しごとを する ときに つかう だい","example":"じぶんの つくえの なかを かたづけた。","level":"core","canIntegrate":true},
      {"word":"かばん","definition":"きょうかしょや ものを いれて もちはこぶ いれもの","example":"あしたの きょうかしょを かばんに いれた。","level":"core","canIntegrate":true},
      {"word":"えんぴつ","definition":"しんが はいって いて、じや えを かく どうぐ","example":"えんぴつを けずって、なまえを かいた。","level":"core","canIntegrate":true},
      {"word":"がっこう","definition":"こどもたちが あつまって べんきょうする ところ","example":"いえから がっこうまで あるいて じゅっぷん かかる。","level":"core","canIntegrate":true},
      {"word":"ともだち","definition":"なかよしで、いっしょに あそんだり はなしたり する ひと","example":"ともだちと こうえんで おにごっこを した。","level":"core","canIntegrate":true},
      {"word":"おかあさん","definition":"ははおやを ていねいに よぶ ことば","example":"おかあさんと いっしょに カレーを つくった。","level":"core","canIntegrate":true},
      {"word":"おとうさん","definition":"ちちおやを ていねいに よぶ ことば","example":"おとうさんが じてんしゃの のりかたを おしえて くれた。","level":"core","canIntegrate":true},
      {"word":"かぞく","definition":"いっしょに くらす おやや きょうだいなどの あつまり","example":"にちようびは かぞくで ピクニックに いった。","level":"core","canIntegrate":true},
      {"word":"でんしゃ","definition":"せんろの うえを でんきの ちからで はしる のりもの","example":"でんしゃの まどから うみが みえた。","level":"challenge","canIntegrate":true},
      {"word":"ひこうき","definition":"つばさが あり、そらを とんで とおくへ いく のりもの","example":"そらの たかい ところを ひこうきが とんで いる。","level":"challenge","canIntegrate":true},
      {"word":"あかちゃん","definition":"うまれて まもない、とても ちいさい こども","example":"となりの いえに あかちゃんが うまれた。","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '41e5b8e0-0d23-5d07-a924-292ac4a9b704', $t$小学2年 — いきものと しぜん$t$,
    $t$生活科で出会う花・虫・動物と天気のことば。春のたんぽぽから夏のあさがお、秋のどんぐりまで、季節を感じる例文つき。$t$,
    'ja', 'grade_2', 'science', 'LC-JA-G2-NATURE',
    $j$[
      {"word":"あさがお","definition":"なつの あさに さいて、ひるには しぼむ ラッパの かたちの はな","example":"まいあさ あさがおに みずを あげて いる。","level":"support","canIntegrate":true},
      {"word":"ひまわり","definition":"なつに さく、せが たかくて おおきな きいろい はな","example":"にわの ひまわりは わたしより せが たかい。","level":"support","canIntegrate":true},
      {"word":"たんぽぽ","definition":"はるに さく きいろい はなで、あとから わたげが とぶ","example":"たんぽぽの わたげを ふうっと ふいた。","level":"support","canIntegrate":true},
      {"word":"かえる","definition":"みずべに すみ、ぴょんと とんで ゲロゲロと なく いきもの","example":"あめの ひに いけで かえるが ないて いた。","level":"support","canIntegrate":true},
      {"word":"とんぼ","definition":"ほそながい からだと 4まいの はねで すいすい とぶ むし","example":"あきの そらを とんぼが とんで いる。","level":"support","canIntegrate":true},
      {"word":"かたつむり","definition":"うずまきの からを せおって、ゆっくり すすむ いきもの","example":"あじさいの はに かたつむりが いた。","level":"core","canIntegrate":true},
      {"word":"きつね","definition":"ふさふさの しっぽと とがった みみを もつ、やまに すむ どうぶつ","example":"ゆきの うえに きつねの あしあとが あった。","level":"core","canIntegrate":true},
      {"word":"たぬき","definition":"まるい からだで、めの まわりが くろい どうぶつ","example":"よるの はたけに たぬきが でて きた。","level":"core","canIntegrate":true},
      {"word":"ふくろう","definition":"よるに えものを さがす、めの おおきな とり","example":"もりの おくで ふくろうが ホーホーと ないた。","level":"core","canIntegrate":true},
      {"word":"すずめ","definition":"ちゃいろい からだの ちいさな とりで、チュンチュンと なく","example":"でんせんに すずめが ならんで いる。","level":"core","canIntegrate":true},
      {"word":"どんぐり","definition":"かしや くぬぎなどの きに なる、かたい からの きのみ","example":"こうえんで どんぐりを たくさん ひろった。","level":"core","canIntegrate":true},
      {"word":"はやし","definition":"きが たくさん はえて いる ところ","example":"はやしの なかは ひんやりと すずしかった。","level":"core","canIntegrate":true},
      {"word":"みずうみ","definition":"まわりを りくに かこまれた、とても おおきな いけ","example":"ボートに のって みずうみを わたった。","level":"core","canIntegrate":true},
      {"word":"かみなり","definition":"くもの なかで でんきが ひかって、ゴロゴロと おおきな おとが する こと","example":"かみなりが なったので、いそいで いえに はいった。","level":"challenge","canIntegrate":true},
      {"word":"たいふう","definition":"みなみの うみで うまれる、つよい かぜと あめを つれた あらし","example":"たいふうが くるので、がっこうが やすみに なった。","level":"challenge","canIntegrate":true},
      {"word":"おたまじゃくし","definition":"かえるの こどもで、しっぽを ふって みずの なかを およぐ もの","example":"たんぼで おたまじゃくしを みつけた。","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'a1227f8d-61f8-571a-b7c3-160a3a1d4191', $t$小学3年 — 気もちを あらわす ことば$t$,
    $t$うれしい・くやしい・ほこらしいなど、心のようすを言葉にする語。道徳や作文、帰りの会のふり返りに使えます。$t$,
    'ja', 'grade_3', 'general', 'LC-JA-G3-FEELINGS',
    $j$[
      {"word":"うれしい","definition":"よいことが あって、心が はずむような 気もち","example":"テストで百点を取って、とても うれしい。","level":"support","canIntegrate":true},
      {"word":"かなしい","definition":"つらいことが あって、なみだが 出そうな 気もち","example":"かっていた金魚が死んで、かなしい 気もちになった。","level":"support","canIntegrate":true},
      {"word":"たのしい","definition":"おもしろくて、心が はずむ 気もち","example":"友だちと あそぶ 時間は いつも たのしい。","level":"support","canIntegrate":true},
      {"word":"こわい","definition":"よくないことが おこりそうで、にげたくなる 気もち","example":"夜の ろうかは 暗くて こわい。","level":"support","canIntegrate":true},
      {"word":"げんき","definition":"体の ちょうしが よく、力が いっぱい ある ようす","example":"朝ごはんを 食べたら げんきが 出た。","level":"core","canIntegrate":true},
      {"word":"やさしい","definition":"人の 気もちを 思って、親切に する ようす","example":"となりの席の ゆいさんは だれにでも やさしい。","level":"core","canIntegrate":true},
      {"word":"しんぱい","definition":"この先 よくないことが おきないか、気に なって おちつかないこと","example":"弟が 帰ってこないので、母は しんぱいしている。","level":"core","canIntegrate":true},
      {"word":"あんしん","definition":"心配が なくなって、ほっと すること","example":"みんな ぶじだと 聞いて あんしんした。","level":"core","canIntegrate":true},
      {"word":"ゆうき","definition":"こわくても、正しいことに 立ちむかう 強い 心","example":"ゆうきを 出して、自分から あやまった。","level":"core","canIntegrate":true},
      {"word":"がまん","definition":"つらいことや ほしい 気もちを、じっと おさえること","example":"ゲームを したかったけれど、しゅくだいが 終わるまで がまんした。","level":"core","canIntegrate":true},
      {"word":"わくわく","definition":"楽しみで、心が うきうきする ようす","example":"あしたの 遠足が 楽しみで わくわくする。","level":"core","canIntegrate":true},
      {"word":"さびしい","definition":"一人ぼっちで、だれかに そばに いてほしい 気もち","example":"なかよしの 友だちが 転校してしまって さびしい。","level":"core","canIntegrate":true},
      {"word":"くやしい","definition":"負けたり うまく いかなかったりして、心から ざんねんに 思う 気もち","example":"あと一点で 負けて、とても くやしい。","level":"challenge","canIntegrate":true},
      {"word":"はずかしい","definition":"人に 見られて、顔が 赤くなるような 気もち","example":"みんなの 前で ころんで、はずかしい 思いを した。","level":"challenge","canIntegrate":true},
      {"word":"おもいやり","definition":"相手の 気もちを 考えて、親切に すること","example":"おもいやりの ある 言葉で、友だちが えがおに なった。","level":"challenge","canIntegrate":true},
      {"word":"ほこらしい","definition":"自分や なかまの したことを、むねを はって じまんしたい 気もち","example":"リレーで 一位に なった 兄が ほこらしい。","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'c1935937-c985-5523-ab5e-7eb3d83ac1d4', $t$小学3年 — さんすうの ことば$t$,
    $t$文章題を読むために必要な、計算・図形・はかり方のことば。説明には数を使った例がついています。$t$,
    'ja', 'grade_3', 'math', 'LC-JA-G3-MATH',
    $j$[
      {"word":"たしざん","definition":"数と 数を あわせて、ぜんぶで いくつかを 出す 計算。れい：3+4=7","example":"りんご3こと 2こを あわせる たしざんを した。","level":"support","canIntegrate":true},
      {"word":"ひきざん","definition":"ある数から 数を とって、のこりを 出す 計算。れい：9−2=7","example":"おつりを 出すには ひきざんを つかう。","level":"support","canIntegrate":true},
      {"word":"すうじ","definition":"数を あらわす 字。0から9まで ある","example":"カードに 大きく すうじを 書いた。","level":"support","canIntegrate":true},
      {"word":"とけい","definition":"今の 時こくを しらせる きかい","example":"教室の とけいは 三時を さしている。","level":"support","canIntegrate":true},
      {"word":"こたえ","definition":"問題を といて 出た 数や ことば","example":"この 問題の こたえは 十二です。","level":"support","canIntegrate":true},
      {"word":"かけざん","definition":"同じ数を 何回か たす 計算を、まとめて する 方法。れい：3×4=12","example":"九九を おぼえると かけざんが はやくなる。","level":"core","canIntegrate":true},
      {"word":"けいさん","definition":"数を たしたり ひいたりして、答えを 出すこと","example":"おこづかいを けいさんしたら、千円 たまっていた。","level":"core","canIntegrate":true},
      {"word":"はんぶん","definition":"二つに 同じ 大きさで 分けた うちの 一つ","example":"ケーキを はんぶんに 切って 妹と 食べた。","level":"core","canIntegrate":true},
      {"word":"さんかく","definition":"三本の まっすぐな 線で かこまれた 形","example":"おにぎりは さんかくの 形を している。","level":"core","canIntegrate":true},
      {"word":"しかく","definition":"四本の まっすぐな 線で かこまれた 形","example":"ノートの ます目は 小さな しかくです。","level":"core","canIntegrate":true},
      {"word":"ながさ","definition":"はしから はしまで どれくらい 長いか ということ。センチメートルや メートルで あらわす","example":"ものさしで えんぴつの ながさを はかった。","level":"core","canIntegrate":true},
      {"word":"おもさ","definition":"物が どれくらい 重いか ということ。グラムや キログラムで あらわす","example":"はかりで ランドセルの おもさを はかった。","level":"core","canIntegrate":true},
      {"word":"ものさし","definition":"長さを はかったり、まっすぐな 線を ひいたりする どうぐ","example":"ものさしを あてて 線を まっすぐ ひいた。","level":"core","canIntegrate":true},
      {"word":"わりざん","definition":"ある数を 同じ数ずつ 分ける 計算。れい：12÷3=4","example":"あめ十二こを 三人で 分ける わりざんを した。","level":"challenge","canIntegrate":true},
      {"word":"ぶんすう","definition":"1を 同じ 大きさに 分けた うちの いくつ分かを あらわす 数。れい：1/2","example":"ピザの 四分の一は、ぶんすうで 1/4と 書く。","level":"challenge","canIntegrate":true},
      {"word":"しょうすう","definition":"1より 小さい 数を、0.5の ように 点を つかって あらわした 数","example":"2.5は しょうすうで、2と 0.5を あわせた 数です。","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '0e1bcc22-023e-5213-b185-8e40b0ec5ec9', $t$小学4年 — 学校と まちの ことば$t$,
    $t$学校生活と、まちのくらしをささえる人たちのことば。きまり・きょうりょく・せきにんなど、学級活動で話し合うことばも入っています。$t$,
    'ja', 'grade_4', 'general', 'LC-JA-G4-SCHOOL',
    $j$[
      {"word":"せんせい","definition":"学校で 子どもたちに 勉強を 教える 人","example":"せんせいが 黒板に 大きな 字を 書いた。","level":"support","canIntegrate":true},
      {"word":"きょうしつ","definition":"クラスの みんなが 授業を うける へや","example":"休み時間の きょうしつは にぎやかだ。","level":"support","canIntegrate":true},
      {"word":"しゅくだい","definition":"家で やってくるように 出される 勉強","example":"今日の しゅくだいは 漢字の れんしゅうだ。","level":"support","canIntegrate":true},
      {"word":"きゅうしょく","definition":"学校で みんなで 食べる お昼ごはん","example":"今日の きゅうしょくは カレーライスだ。","level":"support","canIntegrate":true},
      {"word":"としょかん","definition":"たくさんの 本を 読んだり かりたり できる ところ","example":"としょかんで 恐竜の 本を 二さつ かりた。","level":"support","canIntegrate":true},
      {"word":"じゅぎょう","definition":"先生が 教えて、みんなで 学ぶ 時間","example":"三時間目は 理科の じゅぎょうだ。","level":"core","canIntegrate":true},
      {"word":"そうじ","definition":"ごみを はいたり ふいたりして、きれいに すること","example":"給食の あとは みんなで そうじを する。","level":"core","canIntegrate":true},
      {"word":"とうばん","definition":"順番に まわってくる 仕事や やくわり","example":"今週は 花に 水を やる とうばんだ。","level":"core","canIntegrate":true},
      {"word":"きまり","definition":"みんなが 守ると 約束した ルール","example":"ろうかを 走らないのが 学校の きまりだ。","level":"core","canIntegrate":true},
      {"word":"あいさつ","definition":"人と 会ったときや 別れるときに かける ことば","example":"朝は 元気な 声で あいさつを しよう。","level":"core","canIntegrate":true},
      {"word":"なかま","definition":"同じことを いっしょに する 友だち","example":"サッカーの なかまと 練習した。","level":"core","canIntegrate":true},
      {"word":"やくそく","definition":"これから することを 相手と 決めて、守ること","example":"三時に 公園で 会う やくそくを した。","level":"core","canIntegrate":true},
      {"word":"けいさつ","definition":"町の あんぜんを 守り、事故や 事件の とき かけつける 人たち","example":"交番の けいさつかんに 道を 聞いた。","level":"core","canIntegrate":true},
      {"word":"しょうぼうしょ","definition":"火事の とき、消防車で 火を 消しに 行く 人たちが いる ところ","example":"しょうぼうしょを 見学して、消防車に のせてもらった。","level":"challenge","canIntegrate":true},
      {"word":"きょうりょく","definition":"力を 合わせて、いっしょに 一つのことを すること","example":"みんなで きょうりょくして 大きな 絵を かんせいさせた。","level":"challenge","canIntegrate":true},
      {"word":"せきにん","definition":"まかされたことを、さいごまで きちんと やりとげる つとめ","example":"生き物係として、メダカの せわに せきにんを もつ。","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '0f4ae670-6769-520d-98bb-0b13fd0ff04d', $t$小学5年 — 理科：実験と 生き物$t$,
    $t$植物の発芽、花のつくり、ふりこ、電磁石など5年理科の重要語。よそう→じっけん→けっかの流れもことばで確認できます。$t$,
    'ja', 'grade_5', 'science', 'LC-JA-G5-SCIENCE',
    $j$[
      {"word":"しょくぶつ","definition":"根から 水を すい、日光を あびて そだつ 生き物。草や 木など","example":"ベランダで いろいろな しょくぶつを そだてている。","level":"support","canIntegrate":true},
      {"word":"こんちゅう","definition":"体が 頭・むね・はらの 三つに 分かれ、あしが 六本ある 虫","example":"カブトムシも チョウも こんちゅうの なかまだ。","level":"support","canIntegrate":true},
      {"word":"でんき","definition":"電線を 通って 流れ、明かりや 機械を 動かす 力","example":"台風で でんきが 止まり、家じゅう まっくらに なった。","level":"support","canIntegrate":true},
      {"word":"じしゃく","definition":"鉄を 引きつける 性質を もつ 物","example":"じしゃくを 近づけると、くぎが くっついた。","level":"support","canIntegrate":true},
      {"word":"じっけん","definition":"考えが 正しいか、実際に ためして たしかめること","example":"理科の じっけんで、ふりこが 一往復する 時間を はかった。","level":"core","canIntegrate":true},
      {"word":"かんさつ","definition":"物や 生き物の ようすを、よく 見て 記録すること","example":"メダカの たまごを 毎日 かんさつした。","level":"core","canIntegrate":true},
      {"word":"よそう","definition":"実験の 前に、どうなるかを 考えて おくこと","example":"よそうでは、日なたの 水の ほうが 早く あたたまると 考えた。","level":"core","canIntegrate":true},
      {"word":"けっか","definition":"実験や 観察で、じっさいに わかったこと","example":"じっけんの けっかを 表に まとめた。","level":"core","canIntegrate":true},
      {"word":"はつが","definition":"種から 芽が 出ること","example":"インゲンマメの はつがには、水と 空気と 適当な 温度が 必要だ。","level":"core","canIntegrate":true},
      {"word":"かふん","definition":"花の おしべで つくられる こな。めしべに つくと 実が できる","example":"ハチが かふんを 運んで、花に 実が なる。","level":"core","canIntegrate":true},
      {"word":"ふりこ","definition":"糸の 先に おもりを つるして、左右に ゆれるように した もの","example":"ふりこの 長さを 変えると、一往復する 時間も 変わる。","level":"core","canIntegrate":true},
      {"word":"さんそ","definition":"空気の 中に ある 気体で、生き物が 息を するのに 必要な もの","example":"植物は 日光を 受けると さんそを 出す。","level":"core","canIntegrate":true},
      {"word":"ほにゅうるい","definition":"子どもを 母親の 乳で 育てる 動物の なかま","example":"クジラは 海に すむが、ほにゅうるいだ。","level":"challenge","canIntegrate":true},
      {"word":"はちゅうるい","definition":"体が うろこで おおわれ、まわりの 温度で 体温が 変わる 動物の なかま","example":"ヘビや トカゲは はちゅうるいだ。","level":"challenge","canIntegrate":true},
      {"word":"じょうはつ","definition":"水が 水面から 目に 見えない 水じょう気に なって、空気中に 出ていくこと","example":"水たまりの 水は じょうはつして、いつのまにか なくなった。","level":"challenge","canIntegrate":true},
      {"word":"けんびきょう","definition":"小さな 物を 大きく して 見る 道具","example":"けんびきょうで 池の 水を 見ると、小さな 生き物が いた。","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '116646ba-221f-5c1e-aa93-6267af89d200', $t$小学5年 — 社会：日本の 国土と 世界$t$,
    $t$地図と地球ぎで日本の位置や地形を学ぶことば。へいや・ぼんち・はんとうなど、日本の地名を使った例文で覚えられます。$t$,
    'ja', 'grade_5', 'geography', 'LC-JA-G5-GEO',
    $j$[
      {"word":"みなみ","definition":"昼に 太陽が いちばん 高く のぼる 方角","example":"日本の みなみの はしには 沖縄県が ある。","level":"support","canIntegrate":true},
      {"word":"ひがし","definition":"太陽が のぼってくる 方角","example":"朝日は ひがしの 空から のぼる。","level":"support","canIntegrate":true},
      {"word":"かざん","definition":"地下の マグマが ふき出して できた 山","example":"富士山は 日本で いちばん 高い かざんだ。","level":"support","canIntegrate":true},
      {"word":"かいがん","definition":"陸と 海が 接している ところ","example":"夏休みに かいがんで 貝がらを 拾った。","level":"support","canIntegrate":true},
      {"word":"ちきゅうぎ","definition":"地球を 小さく した、丸い もけい","example":"ちきゅうぎを 回して、日本を さがした。","level":"core","canIntegrate":true},
      {"word":"たいりく","definition":"海に かこまれた、とても 広い 陸地。世界には 六つ ある","example":"ユーラシアたいりくは 世界で いちばん 大きい。","level":"core","canIntegrate":true},
      {"word":"たいへいよう","definition":"日本の 東に 広がる、世界で いちばん 大きい 海","example":"たいへいようの 向こうに アメリカが ある。","level":"core","canIntegrate":true},
      {"word":"せきどう","definition":"北極と 南極から 同じ きょりの ところを、地球を ぐるりと 一周する 線","example":"せきどうに 近い 国は、一年中 暑い。","level":"core","canIntegrate":true},
      {"word":"しまぐに","definition":"まわりを 海に かこまれた 国","example":"日本は 四つの 大きな 島と たくさんの 小さな 島から なる しまぐにだ。","level":"core","canIntegrate":true},
      {"word":"さんみゃく","definition":"山が 長く つらなっている ところ","example":"日本アルプスは 本州の まん中に ある さんみゃくだ。","level":"core","canIntegrate":true},
      {"word":"へいや","definition":"川の 下流などに 広がる、低くて たいらな 土地","example":"関東へいやは 日本で いちばん 広い。","level":"core","canIntegrate":true},
      {"word":"ぼんち","definition":"まわりを 山に かこまれた、たいらな 土地","example":"ぼんちは 夏は 暑く、冬は 寒い ことが 多い。","level":"core","canIntegrate":true},
      {"word":"はんとう","definition":"三方を 海に かこまれ、海に つき出た 陸地","example":"能登はんとうは 日本海に つき出ている。","level":"challenge","canIntegrate":true},
      {"word":"きこう","definition":"ある 地いきで、長い 年月を 通して 見られる 天気の とくちょう","example":"沖縄は 一年中 あたたかい きこうだ。","level":"challenge","canIntegrate":true},
      {"word":"じんこう","definition":"ある 地いきに すんでいる 人の 数","example":"東京都の じんこうは 一千万人を こえている。","level":"challenge","canIntegrate":true},
      {"word":"こくど","definition":"その 国が おさめている 土地","example":"日本の こくどの 約四分の三は 山地だ。","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '5c7dcf45-4d71-5413-a780-827cc4c213b2', $t$小学6年 — 社会：日本の 歴史$t$,
    $t$こふんから江戸時代、かいこくまで、6年社会の歴史学習に出てくることば。実在の人物や遺跡を使った正確な例文つき。$t$,
    'ja', 'grade_6', 'history', 'LC-JA-G6-HISTORY',
    $j$[
      {"word":"れきし","definition":"むかしから 今までに おきた できごとの うつりかわり","example":"れきしの 本で、むかしの くらしを 調べた。","level":"support","canIntegrate":true},
      {"word":"おしろ","definition":"大名などが すんだ、石がきや 天守を もつ 大きな 建物","example":"姫路の おしろは 白くて 美しい。","level":"support","canIntegrate":true},
      {"word":"さむらい","definition":"むかし 刀を もち、とのさまに つかえて 戦った 人たち","example":"江戸時代の さむらいは 刀を 二本 さしていた。","level":"support","canIntegrate":true},
      {"word":"へいわ","definition":"戦争が なく、おだやかに くらせる ようす","example":"みんなが へいわに くらせる 世界を ねがう。","level":"support","canIntegrate":true},
      {"word":"せんそう","definition":"国と 国などが 武器を もって 戦うこと","example":"広島には せんそうの おそろしさを 伝える 資料館が ある。","level":"core","canIntegrate":true},
      {"word":"ねんぴょう","definition":"できごとを 年の じゅんに ならべた 表","example":"歴史の できごとを ねんぴょうに まとめた。","level":"core","canIntegrate":true},
      {"word":"いせき","definition":"むかしの 人の くらしの あとが のこっている 場所","example":"青森の 三内丸山いせきでは、縄文時代の 大きな 村の あとが 見つかった。","level":"core","canIntegrate":true},
      {"word":"こふん","definition":"むかしの 力の ある 人の ために、土を もり上げて つくった 大きな 墓","example":"大阪の 大仙こふんは 日本で いちばん 大きい。","level":"core","canIntegrate":true},
      {"word":"はにわ","definition":"古墳の まわりに ならべられた、土で つくった 人や 動物の 焼き物","example":"はにわには、馬や 家の 形を した ものも ある。","level":"core","canIntegrate":true},
      {"word":"きぞく","definition":"平安時代などに、天皇に つかえて 政治を おこなった 身分の 高い 人たち","example":"平安時代の きぞくは、和歌を よんで 楽しんだ。","level":"core","canIntegrate":true},
      {"word":"しょうぐん","definition":"武士の かしらとして、幕府を ひらいて 国を おさめた 人","example":"徳川家康は 江戸幕府の 最初の しょうぐんだ。","level":"core","canIntegrate":true},
      {"word":"だいみょう","definition":"広い 領地を おさめ、多くの 家来を もった 武士","example":"江戸時代、だいみょうは 一年おきに 江戸に 住んだ。","level":"core","canIntegrate":true},
      {"word":"ばくふ","definition":"将軍が 中心と なって 政治を おこなった しくみ","example":"源頼朝は 鎌倉に ばくふを 開いた。","level":"challenge","canIntegrate":true},
      {"word":"ぼうえき","definition":"外国と 品物を 売ったり 買ったり すること","example":"長崎の 出島では、オランダとの ぼうえきが ゆるされていた。","level":"challenge","canIntegrate":true},
      {"word":"さこく","definition":"江戸時代に、外国との 行き来を きびしく 制限した 政策","example":"さこくの あいだも、オランダや 中国とは 長崎で 交流が あった。","level":"challenge","canIntegrate":true},
      {"word":"かいこく","definition":"閉じていた 国を ひらき、外国と つきあいを はじめること","example":"ペリーが 来航した あと、日本は かいこくした。","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '5da5b2c6-a9e3-583c-b2d7-9ec7a98a2074', $t$中学3年 — 公民：民主主義と 人権$t$,
    $t$選挙・憲法・三権分立など、中学公民の中心となる用語。高校入試にも出る基本語を、正確でわかりやすい説明で。$t$,
    'ja', 'grade_9', 'history', 'LC-JA-G9-CIVICS',
    $j$[
      {"word":"せんきょ","definition":"代表者を 投票で えらぶこと","example":"十八歳に なると、せんきょで 投票できる。","level":"support","canIntegrate":true},
      {"word":"ほうりつ","definition":"国会で 決められた、国の きまり","example":"ほうりつで、自転車にも 交通ルールが 決められている。","level":"support","canIntegrate":true},
      {"word":"けんり","definition":"だれもが 当然に もっている、してよいこと・してもらえること","example":"教育を 受ける けんりは、憲法で 保障されている。","level":"support","canIntegrate":true},
      {"word":"じゆう","definition":"ほかの 人に しばられず、自分の 考えで 行動できること","example":"表現の じゆうは、民主主義の 土台だ。","level":"support","canIntegrate":true},
      {"word":"とうひょう","definition":"選挙などで、えらびたい 人や 案を 紙に 書いて 出すこと","example":"学級委員を 決める とうひょうが 行われた。","level":"core","canIntegrate":true},
      {"word":"けんぽう","definition":"国の しくみや 国民の 権利を 定めた、いちばん 上の 法","example":"日本国けんぽうは 1947年に 施行された。","level":"core","canIntegrate":true},
      {"word":"こっかい","definition":"国民が 選挙で えらんだ 議員が、法律を つくる ところ","example":"こっかいは 衆議院と 参議院の 二つから なる。","level":"core","canIntegrate":true},
      {"word":"ないかく","definition":"総理大臣と 大臣たちで つくり、法律に したがって 国の 仕事を 進める 機関","example":"ないかくは 国会に たいして 責任を 負う。","level":"core","canIntegrate":true},
      {"word":"さいばんしょ","definition":"争いや 犯罪について、法律に もとづいて 判断する ところ","example":"さいばんしょは 国会や 内閣から 独立している。","level":"core","canIntegrate":true},
      {"word":"じんけん","definition":"人が 生まれながらに もっている、人間らしく 生きる ための 権利","example":"じんけんは、だれにも うばわれない。","level":"core","canIntegrate":true},
      {"word":"びょうどう","definition":"性別や 生まれに 関係なく、だれもが 同じように あつかわれること","example":"法の もとの びょうどうは、憲法に 定められている。","level":"core","canIntegrate":true},
      {"word":"ぜいきん","definition":"学校や 道路など、みんなの ための 仕事に 使うため、国や 市に おさめる お金","example":"消費税は、買い物の ときに はらう ぜいきんだ。","level":"core","canIntegrate":true},
      {"word":"たすうけつ","definition":"いちばん 多くの 人が さんせいした 意見に 決める 方法","example":"クラスの 出し物は たすうけつで 決めた。","level":"challenge","canIntegrate":true},
      {"word":"せいとう","definition":"政治に ついて 同じ 考えを もつ 人たちが つくる 団体","example":"選挙の 前に、各せいとうが 公約を 発表した。","level":"challenge","canIntegrate":true},
      {"word":"ちほうじち","definition":"住民が 自分たちの 地域の ことを、自分たちで 決めて 進める しくみ","example":"ちほうじちは「民主主義の 学校」と よばれる。","level":"challenge","canIntegrate":true},
      {"word":"みんしゅしゅぎ","definition":"国の ことを、国民が 話し合いと 選挙で 決める 考え方","example":"みんしゅしゅぎでは、少数の 意見も 大切に される。","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  language = EXCLUDED.language,
  grade_level = EXCLUDED.grade_level,
  subject = EXCLUDED.subject,
  curriculum_standard = EXCLUDED.curriculum_standard,
  words = EXCLUDED.words,
  is_active = TRUE;
