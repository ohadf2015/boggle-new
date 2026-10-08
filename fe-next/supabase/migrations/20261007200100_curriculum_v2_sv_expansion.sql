-- Curriculum word lists v2 (sv): kid-level definitions, one example sentence and a
-- support/core/challenge tier per word. GENERATED from lib/education/curriculum/data/sv-expansion.json
-- by scripts/curriculum/build-curriculum-migrations.ts; edit the JSON, not this file.
-- Every word is checked against public/dicts/<lang>.dict.gz by curriculumContent.test.ts.
-- Fixed ids + ON CONFLICT make it safe to re-run. Replaced lists are deactivated, not deleted.
-- The count column is GENERATED, so the INSERT leaves it out.

INSERT INTO curriculum_word_lists (id, name, description, language, grade_level, subject, curriculum_standard, words, is_active)
VALUES
  (
    '96f2b7fe-dd7f-5100-8e5c-096ccc5295b3', $t$Åk 7 — Kroppen och hälsan$t$,
    $t$Organ, vävnader och hälsa: ord från biologin i årskurs 7, med en enkel förklaring och en mening för varje ord.$t$,
    'sv', 'grade_7', 'science', 'LC-SV-G7-BODY',
    $j$[
      {"word":"hjärta","definition":"Muskel som pumpar blodet runt i kroppen","example":"Mitt hjärta slår snabbare när jag springer.","level":"support","canIntegrate":true},
      {"word":"blodkärl","definition":"Rör där blodet rör sig i kroppen, till exempel artärer och vener","example":"Ett blodkärl i benen vidgas när vi tränar.","level":"challenge","canIntegrate":true},
      {"word":"lungor","definition":"Två organ i bröstkorgen som tar upp syre från luften","example":"Lungor fylls med luft när vi andas in.","level":"support","canIntegrate":true},
      {"word":"muskel","definition":"Vävnad som drar ihop sig och gör att kroppen rör sig","example":"En muskel i armen blir stark av träning.","level":"core","canIntegrate":true},
      {"word":"skelett","definition":"Kroppens stomme av ben som ger form och skyddar organ","example":"Skelett hjälper oss att stå upprätt.","level":"core","canIntegrate":true},
      {"word":"näringsämne","definition":"Ämne i maten som kroppen behöver, till exempel protein eller fett","example":"Ägg är fulla av ett viktigt näringsämne.","level":"challenge","canIntegrate":true},
      {"word":"vitamin","definition":"Ämne som kroppen behöver i små mängder för att må bra","example":"Apelsiner har mycket C-vitamin.","level":"core","canIntegrate":true},
      {"word":"cell","definition":"Den minsta byggstenen i levande saker","example":"Varje cell i kroppen har en kärna.","level":"support","canIntegrate":true},
      {"word":"hormon","definition":"Ämne som styr kroppens funktioner och skickas runt i blodet","example":"Insulin är ett hormon som styr blodsockret.","level":"challenge","canIntegrate":true},
      {"word":"immunförsvar","definition":"Kroppens skydd mot sjukdomar och bakterier","example":"Sömn stärker vårt immunförsvar.","level":"challenge","canIntegrate":true},
      {"word":"bakterie","definition":"Mycket liten levande organism, ibland skadlig och ibland nyttig","example":"Yoghurt innehåller en nyttig bakterie.","level":"core","canIntegrate":true},
      {"word":"arv","definition":"Egenskaper som vi får från våra föräldrar","example":"Ögonfärgen är ett arv från mina föräldrar.","level":"core","canIntegrate":true},
      {"word":"sinne","definition":"En av kroppens förmågor att uppfatta ljus, ljud, lukt, smak och beröring","example":"Ett sinne hjälper oss att uppfatta världen.","level":"support","canIntegrate":true},
      {"word":"puls","definition":"Hur många gånger hjärtat slår per minut","example":"Min puls blir lugnare när jag vilar.","level":"core","canIntegrate":true},
      {"word":"sjukdom","definition":"Något som gör att kroppen mår dåligt","example":"Influensa är en vanlig sjukdom på vintern.","level":"support","canIntegrate":true},
      {"word":"vävnad","definition":"Grupp av lika celler som arbetar tillsammans","example":"Huden är en vävnad som skyddar kroppen.","level":"core","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'f9b9dcbf-7043-51c7-893e-a50caf023046', $t$Åk 10 — Samhälle och ekonomi$t$,
    $t$Demokrati, ekonomi och medier: begrepp från samhällskunskapen, med en kort förklaring och en mening för varje ord.$t$,
    'sv', 'grade_10', 'general', 'LC-SV-G10-SOCIETY',
    $j$[
      {"word":"demokrati","definition":"Ett styrelseskick där folket väljer sina företrädare i fria val","example":"Sverige är en demokrati där alla vuxna får rösta.","level":"support","canIntegrate":true},
      {"word":"inflation","definition":"När priserna stiger hela tiden och pengarna blir mindre värda","example":"Vid hög inflation kostar bullen mer varje år.","level":"core","canIntegrate":true},
      {"word":"arbetslöshet","definition":"Läget när människor som vill arbeta inte har något jobb","example":"Arbetslöshet ökade snabbt under krisen.","level":"challenge","canIntegrate":true},
      {"word":"skatt","definition":"Pengar som medborgarna betalar till staten för gemensam service","example":"Skatt används till skolor, vägar och sjukvård.","level":"support","canIntegrate":true},
      {"word":"ränta","definition":"Avgiften för att låna pengar, eller ersättningen för att spara dem","example":"Hög ränta gör det dyrt att låna pengar.","level":"core","canIntegrate":true},
      {"word":"konsument","definition":"Den som köper och använder varor och tjänster","example":"Som konsument har man rätt att reklamera en trasig produkt.","level":"core","canIntegrate":true},
      {"word":"reklam","definition":"Information som ska få människor att köpa en produkt eller tjänst","example":"Reklam på tv är dyr för företagen.","level":"core","canIntegrate":true},
      {"word":"marknad","definition":"Platsen eller systemet där köpare och säljare möts","example":"På torget finns en marknad med färska grönsaker.","level":"support","canIntegrate":true},
      {"word":"export","definition":"Försäljning av varor eller tjänster till andra länder","example":"Svensk export av bilar är stor.","level":"challenge","canIntegrate":true},
      {"word":"valuta","definition":"Pengar i ett visst land, till exempel kronor, euro eller dollar","example":"Valuta för resan växlade vi på banken.","level":"core","canIntegrate":true},
      {"word":"medier","definition":"Kanaler som sprider nyheter och underhållning, till exempel tidningar och radio","example":"Medier granskar makten och berättar nyheter.","level":"support","canIntegrate":true},
      {"word":"källkritik","definition":"Att fundera över hur tillförlitlig en informationskälla är","example":"Med källkritik kan vi se om en nyhet är sann.","level":"challenge","canIntegrate":true},
      {"word":"minoritet","definition":"En grupp människor som är färre än majoriteten i ett samhälle","example":"Samerna är en minoritet i Sverige med eget språk.","level":"core","canIntegrate":true},
      {"word":"rättighet","definition":"Något som en människa har rätt att göra eller få","example":"Yttrandefrihet är en viktig rättighet i en demokrati.","level":"support","canIntegrate":true},
      {"word":"röstning","definition":"Att lämna sin röst i ett val genom att markera ett parti eller en kandidat","example":"En röstning i höstens val var mycket välbesökt.","level":"core","canIntegrate":true},
      {"word":"budget","definition":"Plan för hur staten eller ett hushåll ska använda sina pengar","example":"Regeringen presenterade sin budget i september.","level":"core","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '7d548bb3-f712-5ebb-ac73-cb3f500c0097', $t$Åk 11 — Naturvetenskap och hållbarhet$t$,
    $t$Ekosystem, klimat och resurser: begrepp från biologi, fysik och geografi för gymnasiets högre årskurser.$t$,
    'sv', 'grade_11', 'science', 'LC-SV-G11-ECOLOGY',
    $j$[
      {"word":"ekosystem","definition":"Alla levande organismer i ett område och deras samspel med miljön","example":"Ett ekosystem i havet kan påverkas av utsläpp.","level":"core","canIntegrate":true},
      {"word":"mångfald","definition":"Variationen av arter, gener och livsmiljöer på jorden","example":"Mångfald i skogen gör den mer motståndskraftig.","level":"challenge","canIntegrate":true},
      {"word":"klimat","definition":"Det genomsnittliga vädret i ett område under lång tid","example":"Vårt klimat i Sverige har blivit varmare.","level":"support","canIntegrate":true},
      {"word":"uppvärmning","definition":"Att jordens medeltemperatur stiger på grund av ökade växthusgaser","example":"Uppvärmning gör att isarna smälter.","level":"challenge","canIntegrate":true},
      {"word":"utsläpp","definition":"Ämnen som skickas ut i luft, vatten eller mark från mänsklig verksamhet","example":"Bilarnas utsläpp av koldioxid minskar.","level":"support","canIntegrate":true},
      {"word":"koldioxid","definition":"Gas som bildas när kol och annat bränsle förbränns","example":"Växter tar upp koldioxid från luften.","level":"core","canIntegrate":true},
      {"word":"förnybar","definition":"Energi från källor som förnyas hela tiden, till exempel sol och vind","example":"Vindkraft är en förnybar energikälla.","level":"support","canIntegrate":true},
      {"word":"hållbar","definition":"Något som kan fortsätta utan att förstöra för kommande generationer","example":"En hållbar skog ger virke i framtiden.","level":"support","canIntegrate":true},
      {"word":"energi","definition":"Förmåga att göra arbete, till exempel värme, rörelse eller ljus","example":"Solceller omvandlar solljus till energi.","level":"core","canIntegrate":true},
      {"word":"art","definition":"En grupp organismer som kan få fertila avkommor med varandra","example":"Vargen är en art som lever i flera länder.","level":"core","canIntegrate":true},
      {"word":"rovdjur","definition":"Djur som jagar och äter andra djur","example":"Lodjuret är ett rovdjur i de svenska skogarna.","level":"support","canIntegrate":true},
      {"word":"näringskedja","definition":"Serie av organismer där varje steg äter det föregående","example":"I varje näringskedja finns växter längst ner.","level":"challenge","canIntegrate":true},
      {"word":"återvinning","definition":"Att göra nytt av avfall i stället för att slänga det","example":"Återvinning av papper sparar träd.","level":"core","canIntegrate":true},
      {"word":"avfall","definition":"Sådant som slängs eftersom det inte längre används","example":"Avfall sorteras i olika kärl.","level":"core","canIntegrate":true},
      {"word":"växtätare","definition":"Djur som äter främst växter","example":"Hjorten är en växtätare i skogen.","level":"core","canIntegrate":true},
      {"word":"kretslopp","definition":"Ett system där material används om och om igen","example":"Vattnet ingår i ett naturligt kretslopp.","level":"core","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '054e7c67-8c8c-5dd2-ba65-b3113c542e00', $t$Åk 12 — Filosofi och kultur$t$,
    $t$Etik, logik och kunskap: begrepp som används i filosofi, samhällskunskap och uppsatsskrivande.$t$,
    'sv', 'grade_12', 'general', 'LC-SV-G12-PHILOSOPHY',
    $j$[
      {"word":"etik","definition":"Läran om vad som är rätt och fel att göra","example":"I etik diskuterar vi vad som är rättvist.","level":"core","canIntegrate":true},
      {"word":"logik","definition":"Läran om hur man drar korrekta slutsatser från påståenden","example":"I logik lär man sig att hitta felslut.","level":"challenge","canIntegrate":true},
      {"word":"kunskap","definition":"Det man vet och förstår efter lärande och erfarenhet","example":"Kunskap växer när man läser mycket.","level":"support","canIntegrate":true},
      {"word":"fördom","definition":"En förutfattad mening om något innan man har prövat det","example":"En fördom kan göra att vi dömer andra för tidigt.","level":"core","canIntegrate":true},
      {"word":"sanning","definition":"Det som stämmer överens med verkligheten","example":"Sanning är viktigt i en debatt.","level":"support","canIntegrate":true},
      {"word":"tolkning","definition":"Förklaring av vad något betyder","example":"Varje läsare gör sin egen tolkning av dikten.","level":"core","canIntegrate":true},
      {"word":"perspektiv","definition":"Sätt att se på något utifrån den egna platsen eller erfarenheten","example":"Ett annat perspektiv kan ändra hela bilden.","level":"core","canIntegrate":true},
      {"word":"argument","definition":"Skäl som används för att visa att något är sant eller bra","example":"Ett starkt argument bygger på fakta.","level":"core","canIntegrate":true},
      {"word":"kritik","definition":"Granskning som pekar ut både styrkor och svagheter","example":"Kritik av boken var både positiv och negativ.","level":"core","canIntegrate":true},
      {"word":"moral","definition":"Uppfattning om vad som är gott och rätt att göra","example":"Sagans moral är att vara snäll mot andra.","level":"support","canIntegrate":true},
      {"word":"ideal","definition":"Bild av något fulländat som man strävar efter","example":"Hon har ett ideal om ett rättvist samhälle.","level":"challenge","canIntegrate":true},
      {"word":"samvete","definition":"Den inre känslan av vad som är rätt och fel","example":"Mitt samvete säger att jag ska be om ursäkt.","level":"core","canIntegrate":true},
      {"word":"frihet","definition":"Rätten att själv bestämma över sitt liv och sina val","example":"Frihet innebär att kunna säga sin mening.","level":"support","canIntegrate":true},
      {"word":"rationell","definition":"Grundad på förnuft och logik snarare än på känslor","example":"Hon var rationell och tog ett lugnt beslut.","level":"challenge","canIntegrate":true},
      {"word":"dialog","definition":"Samtal där två eller flera parter utbyter tankar och frågor","example":"En dialog mellan två vänner kan ge nya insikter.","level":"core","canIntegrate":true},
      {"word":"reflektion","definition":"Att tänka igenom och värdera sina egna tankar och handlingar","example":"Dagbok är ett bra verktyg för reflektion.","level":"core","canIntegrate":true}
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
