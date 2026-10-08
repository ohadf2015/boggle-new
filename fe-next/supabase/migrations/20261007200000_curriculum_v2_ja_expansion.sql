-- Curriculum word lists v2 (ja): kid-level definitions, one example sentence and a
-- support/core/challenge tier per word. GENERATED from lib/education/curriculum/data/ja-expansion.json
-- by scripts/curriculum/build-curriculum-migrations.ts; edit the JSON, not this file.
-- Every word is checked against public/dicts/<lang>.dict.gz by curriculumContent.test.ts.
-- Fixed ids + ON CONFLICT make it safe to re-run. Replaced lists are deactivated, not deleted.
-- The count column is GENERATED, so the INSERT leaves it out.

INSERT INTO curriculum_word_lists (id, name, description, language, grade_level, subject, curriculum_standard, words, is_active)
VALUES
  (
    'cde551bb-efbc-5175-ac8f-f3b3224821cb', $t$中学1年 — 理科：生き物と 大地$t$,
    $t$植物・からだ・物の性質・大地のうごきなど、中学1年の理科で出てくることば。$t$,
    'ja', 'grade_7', 'science', 'LC-JA-G7-SCIENCE',
    $j$[
      {"word":"しょくぶつ","definition":"根・くき・葉をもち、日光を使って養分をつくる生き物","example":"にわの しょくぶつに 水を あげた。","level":"support","canIntegrate":true},
      {"word":"こうごうせい","definition":"日光のエネルギーを使い、水と二酸化炭素から養分をつくるはたらき","example":"はっぱの 中で こうごうせいが おこなわれる。","level":"core","canIntegrate":true},
      {"word":"きんにく","definition":"ちぢんだり ゆるんだりして、体を動かす やわらかい ぶぶん","example":"おもい にもつを はこぶと きんにくが つかれる。","level":"support","canIntegrate":true},
      {"word":"めんえき","definition":"病気のもとになる 細菌や ウイルスを、体が やっつける ちから","example":"よく ねて めんえきを たかめる。","level":"challenge","canIntegrate":true},
      {"word":"じしゃく","definition":"鉄を ひきつける ちからを もつ もの","example":"じしゃくに くぎが くっついた。","level":"core","canIntegrate":true},
      {"word":"でんき","definition":"電子の 流れで、光や 熱や 動きを つくる エネルギー","example":"ふゆは でんきを たくさん つかう。","level":"support","canIntegrate":true},
      {"word":"とうけつ","definition":"液体が 冷やされて、かたまりに なること","example":"よるの あいだに 池が とうけつした。","level":"core","canIntegrate":true},
      {"word":"ふっとう","definition":"液体が 熱せられて、中から 気体が さかんに わき出ること","example":"お湯が ふっとうして 湯気が 出た。","level":"core","canIntegrate":true},
      {"word":"えきたい","definition":"形が きまらず、入れものに そって ながれる 水や 油などの もの","example":"えきたいを ビーカーに そそいだ。","level":"support","canIntegrate":true},
      {"word":"だんそう","definition":"土や 岩が 層に なって かさなった もの","example":"がけに しろい だんそうが 見えた。","level":"core","canIntegrate":true},
      {"word":"かざん","definition":"地下の マグマが 地上に ふき出して できた 山","example":"かざんの ふもとに 温泉が わいて いた。","level":"challenge","canIntegrate":true},
      {"word":"じしん","definition":"地下の 岩が ずれて、大地が ゆれること","example":"つよい じしんで 本だなが たおれた。","level":"support","canIntegrate":true},
      {"word":"こきゅう","definition":"空気を すったり はいたりして、体に 酸素を 取り入れること","example":"うんどうの あとは こきゅうが はやく なる。","level":"core","canIntegrate":true},
      {"word":"ちきゅう","definition":"太陽の まわりを まわって いる、わたしたちが すむ 星","example":"ちきゅうは 太陽の まわりを まわって いる。","level":"core","canIntegrate":true},
      {"word":"ばくはつ","definition":"いきおいよく 中の ものが 外へ とびだすこと","example":"かざんが ばくはつして けむりが 上がった。","level":"challenge","canIntegrate":true},
      {"word":"たいき","definition":"ちきゅうを つつむ、空気の そう","example":"たいきの そうが ちきゅうを まもって いる。","level":"core","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '0a728049-059b-59ad-9ae2-0267abefade4', $t$中学2年 — 歴史：近代の 日本$t$,
    $t$明治から 戦前までの 日本の 歴史で 使う、社会や 政治の ことば。$t$,
    'ja', 'grade_8', 'history', 'LC-JA-G8-HISTORY',
    $j$[
      {"word":"かいこう","definition":"長く とじて いた 国を ひらき、外国と まじわること","example":"ペリーが 来て、日本は かいこうに むかった。","level":"support","canIntegrate":true},
      {"word":"いしん","definition":"世の中や 政治の しくみを、大きく かえること","example":"めいじの いしんで 国の しくみが かわった。","level":"core","canIntegrate":true},
      {"word":"ぶんめい","definition":"学問や 技術が すすみ、社会が 発展した すがた","example":"ぶんめいが すすむと くらしも かわる。","level":"core","canIntegrate":true},
      {"word":"こくみん","definition":"国の 主人として、政治や 国に かかわる 人びと","example":"こくみんの けんりが 憲法で まもられる。","level":"support","canIntegrate":true},
      {"word":"ぎかい","definition":"国の 政治を 話し合い、法律などを 決める 会議","example":"ぎかいで 新しい ほうりつを 決めた。","level":"core","canIntegrate":true},
      {"word":"きしゃ","definition":"蒸気の 力で レールの 上を はしった、むかしの 列車","example":"めいじの ころ きしゃが はしり はじめた。","level":"core","canIntegrate":true},
      {"word":"こうぎょう","definition":"原料を 機械で たくさん つくる 仕事や 産業","example":"こうぎょうが さかんに なって まちが にぎわった。","level":"core","canIntegrate":true},
      {"word":"のうみん","definition":"田畑で 作物を つくって くらす 人","example":"のうみんは 米を おさめて いた。","level":"support","canIntegrate":true},
      {"word":"さむらい","definition":"むかし、主君に つかえて たたかい、政治も 担った 武士","example":"さむらいの 時代は ながく つづいた。","level":"core","canIntegrate":true},
      {"word":"しょうにん","definition":"ものを 売ったり 買ったりして、くらしを たてる 人","example":"しょうにんが いちで ぬのを うって いた。","level":"support","canIntegrate":true},
      {"word":"せんそう","definition":"国どうしが ぶきを つかって あらそう こと","example":"にっしんせんそうで 日本は かった。","level":"support","canIntegrate":true},
      {"word":"りっけん","definition":"憲法に もとづいて 国の 政治を おこなう しくみ","example":"めいじに りっけんせいじが はじまった。","level":"challenge","canIntegrate":true},
      {"word":"ばくふ","definition":"むかし、将軍が 国の 政治を おこなった 政府","example":"ばくふが たおれ、あたらしい 国が 生まれた。","level":"challenge","canIntegrate":true},
      {"word":"こくさい","definition":"国と 国の あいだの つながりや かかわり","example":"日本は こくさいの なかまに なった。","level":"challenge","canIntegrate":true},
      {"word":"ぶんか","definition":"その 時代の 人びとの くらしや 考え方","example":"ぶんかの ちがいを たのしむ。","level":"support","canIntegrate":true},
      {"word":"ぼうせき","definition":"綿から 糸や 布を つくる 工場の 仕事","example":"ぼうせきこうじょうで はたらく 人が ふえた。","level":"core","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '878c8fa8-c332-5557-b17d-5a471279044c', $t$高校1年 — 現代の 社会ことば$t$,
    $t$経済・社会・倫理のことばで、高校の授業に出てくるものを、わかりやすい説明で。$t$,
    'ja', 'grade_10', 'general', 'LC-JA-G10-SOCIETY',
    $j$[
      {"word":"けいざい","definition":"お金や ものを つくり、売り買いする しくみ","example":"けいざいが よく なると、みんなの くらしも ゆたかに なる。","level":"core","canIntegrate":true},
      {"word":"ぼうえき","definition":"国と 国が、ものを 売ったり 買ったり すること","example":"日本は ぼうえきで たくさんの ものを うって いる。","level":"core","canIntegrate":true},
      {"word":"じんけん","definition":"人が 生まれながらに もつ、大切に まもられる 権利","example":"じんけんは だれにも うばわれては いけない。","level":"support","canIntegrate":true},
      {"word":"ぎじゅつ","definition":"ものを つくったり、問題を とく ための 知識と やり方","example":"あたらしい ぎじゅつで 水を きれいに する。","level":"core","canIntegrate":true},
      {"word":"こうれいか","definition":"人口の なかで お年よりの 割合が ふえて いくこと","example":"こうれいかが すすみ、まちの 人が へって いく。","level":"challenge","canIntegrate":true},
      {"word":"きょうそう","definition":"おたがいに 勝とうとして、きそいあうこと","example":"クラスの きょうそうで みんなが がんばった。","level":"support","canIntegrate":true},
      {"word":"ちいき","definition":"まちや 村など、ある 範囲の 地域","example":"この ちいきには 大きな こうえんが ある。","level":"support","canIntegrate":true},
      {"word":"せいさん","definition":"ものを つくり出すこと","example":"この 工場では 毎日 たくさんの 車を せいさんする。","level":"core","canIntegrate":true},
      {"word":"しょうひ","definition":"お金や ものを 使って、なくして いくこと","example":"わたしたちは 水を しょうひして いる。","level":"core","canIntegrate":true},
      {"word":"こうがい","definition":"人や 自然に わるい えいきょうを あたえること","example":"ごみを すてると しぜんに こうがいを およぼす。","level":"core","canIntegrate":true},
      {"word":"じぞく","definition":"ずっと つづけて いくこと","example":"まちは しぜんを じぞくできる よう まもって いる。","level":"challenge","canIntegrate":true},
      {"word":"ほけん","definition":"けがや 病気に そなえて、お金を 出し合う しくみ","example":"ほけんに 入ると、病気の ときも 安心だ。","level":"core","canIntegrate":true},
      {"word":"ぶんせき","definition":"物事を こまかく わけて、くわしく しらべること","example":"データを ぶんせきして 傾向を さがす。","level":"challenge","canIntegrate":true},
      {"word":"てつがく","definition":"物事の 本当の 意味を、深く 考える 学問","example":"てつがくの 本を よんで 考えを ふかめた。","level":"challenge","canIntegrate":true},
      {"word":"きじゅん","definition":"物事を くらべる ときの もとに する 決まり","example":"きじゅんを きめて テストの ひょうかを する。","level":"core","canIntegrate":true},
      {"word":"ゆにゅう","definition":"外国から ものを 買い入れること","example":"日本は 食べものを たくさん ゆにゅうして いる。","level":"core","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '12c01f27-c3ef-5cdb-94de-f09d538a28bb', $t$高校2年 — くらしと 法律$t$,
    $t$法律・裁判・消費のことば。市民として 知っておきたい 社会の 決まりを 身近な 例で。$t$,
    'ja', 'grade_11', 'general', 'LC-JA-G11-LAW',
    $j$[
      {"word":"ふくし","definition":"お年よりや 障がいの ある 人が 安心して くらせるよう 支える しくみ","example":"まちの ふくしの 窓口で そうだんした。","level":"support","canIntegrate":true},
      {"word":"さいばん","definition":"裁判所が あらそいを 法に そって 決める 手続き","example":"ふたりの さいばんが 来月 はじまる。","level":"core","canIntegrate":true},
      {"word":"せきにん","definition":"自分の 行いの 結果を 引き受けること","example":"じぶんの せきにんは じぶんで とる。","level":"core","canIntegrate":true},
      {"word":"みんぽう","definition":"市民どうしの あらそいや 契約についての 法律","example":"みんぽうでは 約束ごとが まもられる。","level":"challenge","canIntegrate":true},
      {"word":"けいやく","definition":"ふたり以上が 約束を 文書で かわし、まもること","example":"あたらしい けいやくに サインした。","level":"core","canIntegrate":true},
      {"word":"ぼうりょく","definition":"力で 人を きずつける こと","example":"ぼうりょくは どんな りゆうでも いけない。","level":"support","canIntegrate":true},
      {"word":"びょうどう","definition":"だれに対しても 差別せず、同じように あつかうこと","example":"クラスでは びょうどうに はなしを きく。","level":"support","canIntegrate":true},
      {"word":"そしょう","definition":"あらそいを 裁判で 解決するよう 求めること","example":"お店の 人が そしょうを おこした。","level":"challenge","canIntegrate":true},
      {"word":"しょうひしゃ","definition":"商品や サービスを 買って 使う 人","example":"しょうひしゃは かしこく えらぶ ひつようが ある。","level":"core","canIntegrate":true},
      {"word":"とうひょうけん","definition":"選挙で 投票する 権利","example":"十八さいに なると とうひょうけんが もてる。","level":"core","canIntegrate":true},
      {"word":"しほう","definition":"国の 権力の ひとつで、裁判を おこなう はたらき","example":"しほうは 法を もとに 判決を だす。","level":"challenge","canIntegrate":true},
      {"word":"ゆうざい","definition":"罪を おかしたと 裁判で 認められること","example":"さいばんで ゆうざいに なる ことは たいへんだ。","level":"challenge","canIntegrate":true},
      {"word":"むざい","definition":"罪が ないと 認められること","example":"さいばんの けっかは むざいに なった。","level":"core","canIntegrate":true},
      {"word":"べんごし","definition":"人の 権利を まもるため、法律の 立場から 助ける 人","example":"べんごしと いっしょに じじょうを せつめいした。","level":"core","canIntegrate":true},
      {"word":"ぎろん","definition":"おたがいに 意見を のべて、考えを 深めること","example":"クラスで ぎろんを して 答えを さがした。","level":"core","canIntegrate":true},
      {"word":"きょうよう","definition":"社会で 生きていくために 身につけて おく 知識や 態度","example":"お金の きょうようは だいじな 学びだ。","level":"support","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '9979c569-7aa8-5fe0-8dbf-297f035e4a46', $t$高校3年 — 人と 文化と 考え$t$,
    $t$哲学・心理・社会のことば。考えを深めるための言葉を、やさしい説明で。$t$,
    'ja', 'grade_12', 'general', 'LC-JA-G12-THOUGHT',
    $j$[
      {"word":"じんかく","definition":"その人らしさを つくる、考え方や 性格の まとまり","example":"本を よむと じんかくが ゆたかに なる。","level":"support","canIntegrate":true},
      {"word":"こころ","definition":"物事を 感じたり 考えたり する はたらき","example":"こころの はたらきを しらべる 学問が ある。","level":"support","canIntegrate":true},
      {"word":"きおく","definition":"覚えた ことを 頭に とどめて おく はたらき","example":"テストの まえに きおくを たしかめる。","level":"core","canIntegrate":true},
      {"word":"ろんり","definition":"すじみちを たてて 考える しかた","example":"ろんりを たどって 答えを みつけた。","level":"core","canIntegrate":true},
      {"word":"しゅうきょう","definition":"神や 仏などを 信じて、たっとぶ 教え","example":"まちには いくつも しゅうきょうの たてものが ある。","level":"core","canIntegrate":true},
      {"word":"はんだん","definition":"物事を くらべて、よいか わるいかを 決める こと","example":"じぶんで はんだんして えらぶ。","level":"core","canIntegrate":true},
      {"word":"しんり","definition":"まちがいの ない、本当の ことわり","example":"しんりを もとめて 本を よむ。","level":"challenge","canIntegrate":true},
      {"word":"げんじつ","definition":"いま 目の前に ある、本当の 出来事や 状態","example":"ゆめと げんじつの ちがいに なやむ。","level":"core","canIntegrate":true},
      {"word":"そうぞう","definition":"まだ ない ものを 頭の 中で 思いうかべること","example":"そうぞうを ひろげて 新しい はなしを つくる。","level":"support","canIntegrate":true},
      {"word":"ぎもん","definition":"わからない ことを たずねること","example":"じゅぎょうで ぎもんを ひとつ だした。","level":"support","canIntegrate":true},
      {"word":"しこう","definition":"物事を 考える はたらき","example":"ふかく しこうして けつろんを だす。","level":"core","canIntegrate":true},
      {"word":"かんけい","definition":"人や 物どうしの つながり、関わり合い","example":"ともだちと よい かんけいを たもつ。","level":"support","canIntegrate":true},
      {"word":"こころざし","definition":"めざして 努力する 目標","example":"ゆめに むかって こころざしを もつ。","level":"challenge","canIntegrate":true},
      {"word":"たいけん","definition":"実際に 自分で 経験すること","example":"りょうりの たいけんを して みた。","level":"core","canIntegrate":true},
      {"word":"じゅんすい","definition":"まじりけが ないこと、ひたむきな こと","example":"じゅんすいな 気持ちで 話を きく。","level":"challenge","canIntegrate":true},
      {"word":"きげん","definition":"物事が はじまった、もとの 時","example":"この まつりの きげんを しらべる。","level":"core","canIntegrate":true}
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
