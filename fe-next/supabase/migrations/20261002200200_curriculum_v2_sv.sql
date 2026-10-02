-- Curriculum word lists v2 (sv): kid-level definitions, one example sentence and a
-- support/core/challenge tier per word. GENERATED from lib/education/curriculum/data/sv.json
-- by scripts/curriculum/build-curriculum-migrations.ts; edit the JSON, not this file.
-- Every word is checked against public/dicts/<lang>.dict.gz by curriculumContent.test.ts.
-- Fixed ids + ON CONFLICT make it safe to re-run. Replaced lists are deactivated, not deleted.
-- The count column is GENERATED, so the INSERT leaves it out.

INSERT INTO curriculum_word_lists (id, name, description, language, grade_level, subject, curriculum_standard, words, is_active)
VALUES
  (
    '26916905-9d1d-5152-b434-9ee6f9d30143', $t$Åk 1 — Mina första ord$t$,
    $t$Vardagsord från hemmet, förskolan och familjen för nya läsare. Varje ord har en enkel förklaring och en kort mening att läsa högt.$t$,
    'sv', 'grade_1', 'general', 'LC-SV-G1-FIRST',
    $j$[
      {"word":"hus","definition":"En byggnad där man bor","example":"Vi bor i ett gult hus vid skogen.","level":"support","canIntegrate":true},
      {"word":"katt","definition":"Ett mjukt husdjur med morrhår som spinner och säger mjau","example":"Vår katt sover helst i fönstret.","level":"support","canIntegrate":true},
      {"word":"hund","definition":"Ett husdjur som skäller, viftar på svansen och gillar att leka","example":"Grannen har en hund som heter Sixten.","level":"support","canIntegrate":true},
      {"word":"sol","definition":"Den stora, heta stjärnan som lyser och värmer på dagen","example":"Ta på dig keps, det är mycket sol i dag.","level":"support","canIntegrate":true},
      {"word":"boll","definition":"En rund leksak som man kastar, sparkar eller studsar","example":"På rasten sparkade vi boll på gården.","level":"support","canIntegrate":true},
      {"word":"bok","definition":"Sidor med ord eller bilder som sitter ihop i ett omslag och som man läser","example":"Pappa läste en bok om dinosaurier för mig.","level":"support","canIntegrate":true},
      {"word":"mamma","definition":"Den förälder som är kvinna","example":"Min mamma lagar pannkakor på lördagar.","level":"core","canIntegrate":true},
      {"word":"pappa","definition":"Den förälder som är man","example":"Min pappa lärde mig att cykla.","level":"core","canIntegrate":true},
      {"word":"äpple","definition":"En krispig frukt med rött, grönt eller gult skal som växer på träd","example":"Jag har ett äpple i matlådan.","level":"core","canIntegrate":true},
      {"word":"vatten","definition":"Den genomskinliga vätska som man dricker när man är törstig","example":"Efter fotbollen drack jag ett stort glas vatten.","level":"core","canIntegrate":true},
      {"word":"bröd","definition":"Mat som bakas av mjöl och som man gör smörgåsar av","example":"Vi köpte nybakat bröd på bageriet.","level":"core","canIntegrate":true},
      {"word":"stol","definition":"En möbel att sitta på, med ben och ryggstöd","example":"Dra fram en stol och sätt dig vid bordet.","level":"core","canIntegrate":true},
      {"word":"blomma","definition":"Den färgglada delen av en växt, som ofta doftar gott","example":"I trädgården slog en röd blomma ut.","level":"core","canIntegrate":true},
      {"word":"måne","definition":"Det runda ljuset som man ser på himlen på natten","example":"I kväll lyser en stor, rund måne över taket.","level":"core","canIntegrate":true},
      {"word":"familj","definition":"Människor som hör ihop, till exempel föräldrar, barn, syskon och far- och morföräldrar","example":"På julafton äter hela min familj tillsammans.","level":"challenge","canIntegrate":true},
      {"word":"bebis","definition":"Ett väldigt litet barn som inte kan gå eller prata än","example":"Vi har fått en bebis, och nu är jag storasyster!","level":"challenge","canIntegrate":true},
      {"word":"kompis","definition":"Någon som man tycker om och gärna leker med","example":"Min bästa kompis bor i huset bredvid.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'ca54dc64-4836-5c0a-9db4-4a28908cb620', $t$Åk 2 — Djur och natur$t$,
    $t$Djur, väder och natur som barn möter i skogen och på skolgården — från älg och igelkott till regn och snö.$t$,
    'sv', 'grade_2', 'science', 'LC-SV-G2-NATURE',
    $j$[
      {"word":"fågel","definition":"Ett djur med fjädrar och vingar; de flesta kan flyga","example":"En liten fågel satt på fågelbordet och åt frön.","level":"support","canIntegrate":true},
      {"word":"regn","definition":"Vattendroppar som faller från molnen","example":"Det kom mycket regn, så vi tog paraply.","level":"support","canIntegrate":true},
      {"word":"snö","definition":"Vita, kalla flingor som faller när det är kallt ute","example":"I januari låg det snö upp till knäna.","level":"support","canIntegrate":true},
      {"word":"moln","definition":"En samling pyttesmå vattendroppar som svävar på himlen","example":"Ett mörkt moln drog förbi framför solen.","level":"support","canIntegrate":true},
      {"word":"skog","definition":"Ett stort område där det växer massor av träd","example":"Vi plockade blåbär i en skog nära stugan.","level":"support","canIntegrate":true},
      {"word":"sjö","definition":"Mycket sött vatten som har land runt omkring sig på alla sidor","example":"På sommaren badar vi i en sjö med klart vatten.","level":"core","canIntegrate":true},
      {"word":"älg","definition":"Sveriges största vilda djur, med långa ben; hanen har stora horn","example":"På vägen hem såg vi en älg stå vid diket.","level":"core","canIntegrate":true},
      {"word":"räv","definition":"Ett rödbrunt rovdjur med lång, yvig svans","example":"En räv smög över åkern i skymningen.","level":"core","canIntegrate":true},
      {"word":"björn","definition":"Ett stort, kraftigt rovdjur med päls som sover i ett ide hela vintern","example":"I Norrland kan man ibland se en björn i skogen.","level":"core","canIntegrate":true},
      {"word":"ekorre","definition":"Ett litet djur med yvig svans som klättrar i träd och samlar kottar och nötter","example":"En ekorre sprang uppför tallen.","level":"core","canIntegrate":true},
      {"word":"fjäril","definition":"En insekt med färgglada vingar som först var en larv","example":"En gul fjäril landade på min hand.","level":"core","canIntegrate":true},
      {"word":"myra","definition":"En liten, flitig insekt som bor i en stack tillsammans med tusentals andra","example":"En myra bar på ett barr som var större än den själv.","level":"core","canIntegrate":true},
      {"word":"hare","definition":"Ett djur som liknar en kanin, med långa öron och starka bakben","example":"En hare skuttade över gräsmattan.","level":"core","canIntegrate":true},
      {"word":"igelkott","definition":"Ett litet djur med taggar på ryggen som rullar ihop sig till en boll när den känner sig hotad","example":"Vi ställde ut vatten till en igelkott i trädgården.","level":"challenge","canIntegrate":true},
      {"word":"uggla","definition":"En fågel med stora ögon som jagar på natten och kan vrida huvudet långt bakåt","example":"I natt hörde vi en uggla hoa i skogen.","level":"challenge","canIntegrate":true},
      {"word":"groda","definition":"Ett litet djur som hoppar, kväker och lever nära vatten","example":"En groda satt på en sten vid dammen.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'f5aa56bf-ce63-58eb-82ff-e60056227ebb', $t$Åk 3 — Känslor och egenskaper$t$,
    $t$Ord för att prata om hur man mår och hur man är mot andra. Passar värdegrundsarbete och elevernas egna berättelser.$t$,
    'sv', 'grade_3', 'general', 'LC-SV-G3-FEELINGS',
    $j$[
      {"word":"glad","definition":"Man känner sig lycklig och vill le eller skratta","example":"Elsa blev glad när morfar ringde.","level":"support","canIntegrate":true},
      {"word":"ledsen","definition":"Man känner sig tung i hjärtat och vill kanske gråta","example":"Leo var ledsen för att hans glass ramlade i backen.","level":"support","canIntegrate":true},
      {"word":"arg","definition":"Man känner sig upprörd när något känns orättvist","example":"Min bror blev arg när någon rev hans legotorn.","level":"support","canIntegrate":true},
      {"word":"rädd","definition":"Man känner att något farligt eller otäckt kan hända","example":"Valpen är rädd för åskan.","level":"support","canIntegrate":true},
      {"word":"lugn","definition":"Stilla och avslappnad, inte stressad","example":"Efter några djupa andetag kände jag mig lugn igen.","level":"core","canIntegrate":true},
      {"word":"snäll","definition":"Vänlig och omtänksam mot andra","example":"Nora är snäll mot alla nya i klassen.","level":"core","canIntegrate":true},
      {"word":"stolt","definition":"Man känner sig nöjd över något man själv eller någon nära har gjort","example":"Pappa var stolt när jag cyklade utan stödhjul.","level":"core","canIntegrate":true},
      {"word":"modig","definition":"Man vågar göra det rätta fast det känns läskigt","example":"Ali var modig och berättade för läraren vad som hade hänt.","level":"core","canIntegrate":true},
      {"word":"nyfiken","definition":"Man vill veta mer, fråga och upptäcka nya saker","example":"Katten är nyfiken och kikar in i varje låda.","level":"core","canIntegrate":true},
      {"word":"blyg","definition":"Man tycker att det är jobbigt att prata med människor man inte känner","example":"Först var Ella blyg, men nu pratar hon med alla.","level":"core","canIntegrate":true},
      {"word":"generös","definition":"Man tycker om att ge och dela med sig","example":"Moster är generös och bjuder hela klassen på bullar.","level":"core","canIntegrate":true},
      {"word":"tacksam","definition":"Man känner sig glad över något man fått och vill säga tack","example":"Jag är tacksam för att du hjälpte mig med läxan.","level":"core","canIntegrate":true},
      {"word":"orolig","definition":"Man tänker mycket på att något dåligt kan hända","example":"Mamma var orolig när jag kom hem sent.","level":"challenge","canIntegrate":true},
      {"word":"förvånad","definition":"Man blir överraskad av något man inte väntat sig","example":"Sam blev förvånad när hela klassen sjöng för honom.","level":"challenge","canIntegrate":true},
      {"word":"besviken","definition":"Man känner sig nere när något man hoppats på inte blir av","example":"Jag blev besviken när matchen ställdes in.","level":"challenge","canIntegrate":true},
      {"word":"avundsjuk","definition":"Man önskar att man hade det som någon annan har","example":"Lisa blev avundsjuk på sin systers nya cykel.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'ddf6b9ae-4d6e-5d69-908c-33a31aab40c1', $t$Åk 3 — Matteord$t$,
    $t$Orden eleverna behöver för att läsa en textuppgift: räknesätt, former och mätning. Förklaringarna har exempel med siffror.$t$,
    'sv', 'grade_3', 'math', 'LC-SV-G3-MATH',
    $j$[
      {"word":"tal","definition":"Ett värde som visar hur många eller hur mycket, till exempel 7 eller 25","example":"Tänk på ett tal mellan ett och tio.","level":"support","canIntegrate":true},
      {"word":"siffra","definition":"Ett av tecknen 0 till 9 som man skriver tal med","example":"Skriv en siffra i varje ruta.","level":"support","canIntegrate":true},
      {"word":"plus","definition":"Tecknet + som betyder att man lägger ihop","example":"Tre plus fyra blir sju.","level":"support","canIntegrate":true},
      {"word":"minus","definition":"Tecknet − som betyder att man tar bort","example":"Tio minus två blir åtta.","level":"support","canIntegrate":true},
      {"word":"klocka","definition":"En sak som visar vad tiden är","example":"Det hänger en rund klocka ovanför tavlan.","level":"support","canIntegrate":true},
      {"word":"linjal","definition":"En rak list med streck som man mäter längd och drar raka linjer med","example":"Rita en rak linje med en linjal.","level":"core","canIntegrate":true},
      {"word":"meter","definition":"En längdenhet som är lika lång som hundra centimeter","example":"Bänken är en meter lång.","level":"core","canIntegrate":true},
      {"word":"hälften","definition":"En av två lika stora delar","example":"Vi delade pizzan och åt hälften var.","level":"core","canIntegrate":true},
      {"word":"dubbelt","definition":"Två gånger så mycket","example":"Min storebror är dubbelt så gammal som jag.","level":"core","canIntegrate":true},
      {"word":"triangel","definition":"En form med tre sidor och tre hörn","example":"En pizzabit ser ut som en triangel.","level":"core","canIntegrate":true},
      {"word":"kvadrat","definition":"En form med fyra lika långa sidor och fyra räta hörn","example":"Varje ruta i mattehäftet är en liten kvadrat.","level":"core","canIntegrate":true},
      {"word":"rektangel","definition":"En form med fyra räta hörn, där två sidor är långa och två är korta","example":"Klassrumsdörren har formen av en rektangel.","level":"core","canIntegrate":true},
      {"word":"cirkel","definition":"En helt rund form utan hörn","example":"Vi satt i en cirkel på mattan.","level":"core","canIntegrate":true},
      {"word":"addera","definition":"Att räkna plus, alltså lägga ihop tal","example":"Om du ska addera 5 och 3 får du 8.","level":"core","canIntegrate":true},
      {"word":"summa","definition":"Svaret man får när man lägger ihop tal","example":"Räkna ut vilken summa du får om du lägger ihop 6 och 9.","level":"challenge","canIntegrate":true},
      {"word":"differens","definition":"Svaret man får när man tar bort ett tal från ett annat","example":"Mellan 10 och 7 är det en differens på tre.","level":"challenge","canIntegrate":true},
      {"word":"subtrahera","definition":"Att räkna minus, alltså ta bort ett tal från ett annat","example":"För att veta hur många som är kvar ska du subtrahera.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'fd932570-d3ee-5363-8117-3c18911a4508', $t$Åk 4 — Skolan och samhället$t$,
    $t$Ord om livet i klassrummet, i kvarteret och i kommunen, tillsammans med värden som ansvar och respekt.$t$,
    'sv', 'grade_4', 'general', 'LC-SV-G4-SCHOOL',
    $j$[
      {"word":"lärare","definition":"En person som undervisar elever","example":"Vi har fått en ny lärare i engelska.","level":"support","canIntegrate":true},
      {"word":"elev","definition":"En person som går i skolan","example":"Varje elev fick ett nytt anteckningsblock.","level":"support","canIntegrate":true},
      {"word":"rast","definition":"En paus mellan lektionerna när man går ut och leker","example":"Efter mattelektionen har vi rast i tjugo minuter.","level":"support","canIntegrate":true},
      {"word":"läxa","definition":"Uppgifter som man gör hemma efter skolan","example":"I kväll har jag en läxa i svenska.","level":"support","canIntegrate":true},
      {"word":"granne","definition":"Någon som bor nära dig, i huset eller lägenheten bredvid","example":"Vår granne vattnar blommorna när vi är bortresta.","level":"support","canIntegrate":true},
      {"word":"klassrum","definition":"Rummet där en klass har sina lektioner","example":"Vårt klassrum ligger på andra våningen.","level":"core","canIntegrate":true},
      {"word":"bibliotek","definition":"Ett ställe med massor av böcker som man kan läsa och låna hem","example":"Skolan har ett bibliotek med sköna läshörnor.","level":"core","canIntegrate":true},
      {"word":"regel","definition":"Något som alla har kommit överens om att följa","example":"I vår klass har vi en regel: man räcker upp handen innan man pratar.","level":"core","canIntegrate":true},
      {"word":"hjälp","definition":"Det man gör för att göra det lättare för någon annan","example":"Farmor behövde hjälp att bära kassarna.","level":"core","canIntegrate":true},
      {"word":"vänskap","definition":"Bandet mellan människor som tycker om och litar på varandra","example":"En stark vänskap kan hålla hela livet.","level":"core","canIntegrate":true},
      {"word":"respekt","definition":"Att visa att andra människor är viktiga, till exempel genom att lyssna och inte kränka","example":"Alla förtjänar respekt, även när man inte håller med.","level":"core","canIntegrate":true},
      {"word":"kommun","definition":"Ett område med egen ledning som sköter till exempel skolor, bibliotek och sophämtning","example":"Vår kommun byggde en ny skatepark i somras.","level":"core","canIntegrate":true},
      {"word":"ansvar","definition":"Att se till att något blir gjort på rätt sätt och stå för det man gör","example":"Den här veckan har jag ansvar för klassens växter.","level":"challenge","canIntegrate":true},
      {"word":"frivillig","definition":"Någon som hjälper till av egen vilja, utan att få betalt","example":"Min storasyster jobbar som frivillig på ett djurhem.","level":"challenge","canIntegrate":true},
      {"word":"samarbete","definition":"Att jobba tillsammans mot samma mål","example":"Tack vare bra samarbete blev vi snabbt klara med pusslet.","level":"challenge","canIntegrate":true},
      {"word":"rättvis","definition":"Att behandla alla lika och ge alla det de har rätt till","example":"Läraren försöker vara rättvis när hon delar in lagen.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    '21fec24a-2e63-59b2-90e4-742a6e73f4f9', $t$Åk 5 — NO: växter, djur och experiment$t$,
    $t$Grundord för biologi, fysik och kemi på mellanstadiet — och för hela gången i ett experiment, från hypotes till slutsats.$t$,
    'sv', 'grade_5', 'science', 'LC-SV-G5-SCIENCE',
    $j$[
      {"word":"växt","definition":"Något levande som har rötter i jorden och behöver vatten och ljus","example":"På fönsterbrädan står en växt med stora blad.","level":"support","canIntegrate":true},
      {"word":"frö","definition":"Den lilla delen som en ny växt kan gro ur","example":"Jag planterade ett frö från en solros i en kruka.","level":"support","canIntegrate":true},
      {"word":"rot","definition":"Den del av växten som sitter under jorden och suger upp vatten","example":"Maskrosen har en lång rot som är svår att dra upp.","level":"support","canIntegrate":true},
      {"word":"insekt","definition":"Ett litet djur med tre par ben, till exempel en myra eller en skalbagge","example":"Vi hittade en grön insekt på salladsbladet.","level":"support","canIntegrate":true},
      {"word":"magnet","definition":"Ett föremål som drar till sig järn","example":"Jag satte fast teckningen på kylskåpet med en magnet.","level":"core","canIntegrate":true},
      {"word":"syre","definition":"En gas i luften som vi behöver för att kunna andas","example":"Växter släpper ut syre i luften.","level":"core","canIntegrate":true},
      {"word":"energi","definition":"Det som gör att saker kan röra sig, växa, lysa eller bli varma","example":"Frukosten ger kroppen energi inför dagen.","level":"core","canIntegrate":true},
      {"word":"experiment","definition":"Ett försök man gör för att ta reda på om en idé stämmer","example":"Vi gjorde ett experiment: vilken boll faller snabbast?","level":"core","canIntegrate":true},
      {"word":"däggdjur","definition":"Ett djur vars ungar dricker mjölk från sin mamma","example":"Valen lever i havet, men den är ett däggdjur och inte en fisk.","level":"core","canIntegrate":true},
      {"word":"kräldjur","definition":"Ett djur med fjäll och växelvarm kropp, till exempel en ödla eller en orm","example":"Huggormen är ett kräldjur som finns i Sverige.","level":"core","canIntegrate":true},
      {"word":"kretslopp","definition":"När något går runt och kommer tillbaka, som vatten som blir moln och sedan regn","example":"Vatten ingår i ett kretslopp: det avdunstar, blir moln och faller som regn igen.","level":"core","canIntegrate":true},
      {"word":"avdunsta","definition":"När vatten värms upp och blir till ånga i luften","example":"Pölen kommer att avdunsta när solen kommer fram.","level":"core","canIntegrate":true},
      {"word":"hypotes","definition":"En gissning med en förklaring, som man testar i ett experiment","example":"Min hypotes var att en växt i mörker inte växer.","level":"challenge","canIntegrate":true},
      {"word":"observation","definition":"Att noggrant titta på något och skriva ner det man ser","example":"Under vår observation räknade vi fåglarna vid fågelbordet.","level":"challenge","canIntegrate":true},
      {"word":"slutsats","definition":"Det man förstår efter ett experiment, utifrån resultatet","example":"Vår slutsats blev att växter behöver ljus.","level":"challenge","canIntegrate":true},
      {"word":"fotosyntes","definition":"När växter gör socker av ljus, vatten och koldioxid och samtidigt släpper ut syre","example":"Tack vare fotosyntes kan träden växa.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'd84d90ca-fdfe-5715-8938-e1d635bbcdea', $t$Åk 6 — Geografi: Sveriges natur och kartan$t$,
    $t$Begrepp för att läsa en karta och beskriva Sveriges natur, med exempel från fjällen, skärgården och Skåneslätten.$t$,
    'sv', 'grade_6', 'geography', 'LC-SV-G6-GEO',
    $j$[
      {"word":"karta","definition":"En bild av ett område sett uppifrån, med vägar, städer och gränser","example":"Vi tittade på en karta för att hitta stigen.","level":"support","canIntegrate":true},
      {"word":"norr","definition":"Väderstrecket som kompassnålen pekar mot","example":"Kiruna ligger långt upp i norr.","level":"support","canIntegrate":true},
      {"word":"söder","definition":"Väderstrecket som är motsatt till norr","example":"Flyttfåglarna flyger mot söder på hösten.","level":"support","canIntegrate":true},
      {"word":"hav","definition":"Ett enormt stort område med salt vatten","example":"Sverige har hav både i öster och i väster.","level":"support","canIntegrate":true},
      {"word":"kust","definition":"Där land möter hav","example":"Vi cyklade längs en kust med branta klippor.","level":"core","canIntegrate":true},
      {"word":"fjäll","definition":"Höga berg, ofta utan träd, som finns i norra och västra Sverige","example":"Kebnekaise är det högsta fjäll som finns i Sverige.","level":"core","canIntegrate":true},
      {"word":"älv","definition":"En stor flod som rinner från fjällen ut i havet","example":"Torne älv rinner längs gränsen mot Finland.","level":"core","canIntegrate":true},
      {"word":"slätt","definition":"Ett stort och platt landområde utan berg","example":"I Skåne finns en bördig slätt med åkrar.","level":"core","canIntegrate":true},
      {"word":"halvö","definition":"Land som är omgivet av vatten på tre sidor","example":"Skandinavien är en halvö i norra Europa.","level":"core","canIntegrate":true},
      {"word":"skärgård","definition":"Ett område med massor av små öar och skär längs kusten","example":"Stockholm har en skärgård med tusentals öar.","level":"core","canIntegrate":true},
      {"word":"gräns","definition":"Linjen som skiljer ett land eller område från ett annat","example":"På kartan är en gräns ritad med en streckad linje.","level":"core","canIntegrate":true},
      {"word":"kompass","definition":"Ett instrument med en nål som visar åt vilket håll norr ligger","example":"Ta med en kompass när ni vandrar i fjällen.","level":"core","canIntegrate":true},
      {"word":"klimat","definition":"Hur vädret brukar vara i ett område under många år","example":"Norra Sverige har ett kallare klimat än södra.","level":"challenge","canIntegrate":true},
      {"word":"kontinent","definition":"En av jordens stora landmassor, till exempel Europa eller Afrika","example":"Australien är både ett land och en kontinent.","level":"challenge","canIntegrate":true},
      {"word":"landskap","definition":"En av Sveriges 25 gamla landsdelar, som Skåne eller Lappland","example":"Lappland är Sveriges största landskap.","level":"challenge","canIntegrate":true},
      {"word":"befolkning","definition":"Alla människor som bor på en plats","example":"Sverige har en befolkning på drygt tio miljoner.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'c9dddcd0-276f-549d-a37e-0c8f14338daa', $t$Åk 8 — Historia: från vikingatid till industrialisering$t$,
    $t$Nyckelord för Sveriges historia från vikingatiden via stormaktstiden till emigrationen och industrins genombrott.$t$,
    'sv', 'grade_8', 'history', 'LC-SV-G8-HISTORY',
    $j$[
      {"word":"kung","definition":"En man som styr ett land, ofta för att han har ärvt makten","example":"Gustav Vasa blev kung av Sverige år 1523.","level":"support","canIntegrate":true},
      {"word":"krig","definition":"När länder eller grupper strider mot varandra med vapen","example":"Under 1600-talet var Sverige ofta i krig med sina grannländer.","level":"support","canIntegrate":true},
      {"word":"fred","definition":"När det inte är krig","example":"Sverige har levt i fred sedan 1814.","level":"support","canIntegrate":true},
      {"word":"handel","definition":"Att köpa, sälja eller byta varor","example":"Vikingarna bedrev handel ända bort till Konstantinopel.","level":"support","canIntegrate":true},
      {"word":"bonde","definition":"En person som odlar jorden och föder upp djur","example":"Farfars farfar var bonde i Småland.","level":"core","canIntegrate":true},
      {"word":"viking","definition":"En person från Norden under vikingatiden, ungefär år 800–1050, som reste för att handla, plundra eller bosätta sig","example":"En viking kunde segla ända till Nordamerika.","level":"core","canIntegrate":true},
      {"word":"runsten","definition":"En sten med inristade runor, ofta till minne av en död person","example":"Vid kyrkan står en runsten från 1000-talet.","level":"core","canIntegrate":true},
      {"word":"kloster","definition":"En plats där munkar eller nunnor bor och lever för sin tro","example":"Vadstena kloster grundades av den heliga Birgitta.","level":"core","canIntegrate":true},
      {"word":"adel","definition":"Familjer som förr hade särskilda rättigheter och titlar, som greve eller friherre","example":"Förr ägde adel och kyrka en stor del av jorden.","level":"core","canIntegrate":true},
      {"word":"riksdag","definition":"Sveriges folkvalda församling, som stiftar lagar","example":"Under stormaktstiden samlades en riksdag med fyra stånd: adel, präster, borgare och bönder.","level":"core","canIntegrate":true},
      {"word":"fabrik","definition":"En byggnad där varor tillverkas med maskiner","example":"I Jönköping byggdes en fabrik som gjorde tändstickor.","level":"core","canIntegrate":true},
      {"word":"industri","definition":"Tillverkning av varor i stor skala med hjälp av maskiner","example":"Järnbruken var en viktig industri i Bergslagen.","level":"core","canIntegrate":true},
      {"word":"stormakt","definition":"Ett land med stor makt över andra länder","example":"Under 1600-talet var Sverige en stormakt i norra Europa.","level":"challenge","canIntegrate":true},
      {"word":"reformation","definition":"När kyrkan splittrades och protestantiska kyrkor bröt sig loss från påven i Rom","example":"Gustav Vasa genomförde en reformation som gjorde Sverige protestantiskt.","level":"challenge","canIntegrate":true},
      {"word":"emigration","definition":"När människor lämnar sitt land för att bo i ett annat","example":"Svält och fattigdom ledde till en stor emigration till Amerika på 1800-talet.","level":"challenge","canIntegrate":true},
      {"word":"revolution","definition":"En snabb och stor förändring, till exempel när folket störtar en härskare","example":"Ångmaskinen startade en industriell revolution i Europa.","level":"challenge","canIntegrate":true}
    ]$j$::jsonb,
    TRUE
  ),
  (
    'b1fa7aff-d227-59af-b217-a1258649c6c3', $t$Åk 9 — Samhällskunskap: demokrati och rättigheter$t$,
    $t$Centrala begrepp i samhällskunskap: val, grundlagar, rättigheter och skyldigheter, majoritet och minoritet. Exakta förklaringar för högstadiet.$t$,
    'sv', 'grade_9', 'history', 'LC-SV-G9-CIVICS',
    $j$[
      {"word":"val","definition":"När medborgare röstar fram vilka som ska bestämma","example":"I Sverige hålls val till riksdagen vart fjärde år.","level":"support","canIntegrate":true},
      {"word":"lag","definition":"En regel som alla i ett land måste följa","example":"Det finns en lag om att man måste ha cykelhjälm om man är under 15 år.","level":"support","canIntegrate":true},
      {"word":"skatt","definition":"Pengar som invånarna betalar till staten och kommunen för gemensamma saker","example":"Skolor och sjukhus betalas med skatt.","level":"support","canIntegrate":true},
      {"word":"medborgare","definition":"En person som tillhör ett land och har rättigheter och skyldigheter där","example":"Som svensk medborgare får man rösta i riksdagsvalet från 18 år.","level":"support","canIntegrate":true},
      {"word":"demokrati","definition":"Ett styrelseskick där folket väljer sina ledare i fria val","example":"I en demokrati får alla säga vad de tycker.","level":"core","canIntegrate":true},
      {"word":"regering","definition":"Statsministern och ministrarna som styr landet och genomför riksdagens beslut","example":"Efter valet bildades en ny regering.","level":"core","canIntegrate":true},
      {"word":"rösträtt","definition":"Rätten att rösta i allmänna val","example":"Kvinnor fick rösträtt i Sverige 1919 och röstade första gången 1921.","level":"core","canIntegrate":true},
      {"word":"grundlag","definition":"En av de viktigaste lagarna, som bestämmer hur landet ska styras och skyddar våra friheter","example":"Tryckfrihetsförordningen är en grundlag.","level":"core","canIntegrate":true},
      {"word":"rättighet","definition":"Något som varje människa har rätt till, till exempel att gå i skolan","example":"Att få säga sin åsikt är en rättighet.","level":"core","canIntegrate":true},
      {"word":"skyldighet","definition":"Något som man måste göra enligt lag eller enligt ett löfte","example":"Att betala skatt är en skyldighet för alla som tjänar pengar.","level":"core","canIntegrate":true},
      {"word":"majoritet","definition":"Fler än hälften av rösterna eller personerna","example":"Förslaget fick majoritet i klassrådet.","level":"core","canIntegrate":true},
      {"word":"minoritet","definition":"En mindre grupp i ett samhälle, eller färre än hälften av rösterna","example":"Samerna är ett urfolk och en nationell minoritet i Sverige.","level":"core","canIntegrate":true},
      {"word":"kompromiss","definition":"En lösning där båda sidor ger efter lite för att komma överens","example":"Efter långa förhandlingar hittade partierna en kompromiss om budgeten.","level":"challenge","canIntegrate":true},
      {"word":"opinion","definition":"Det som många människor tycker i en fråga","example":"En stark opinion krävde bättre kollektivtrafik.","level":"challenge","canIntegrate":true},
      {"word":"censur","definition":"När makthavare förbjuder eller stoppar texter, bilder eller åsikter","example":"I Sverige förbjuder grundlagen censur av tidningar.","level":"challenge","canIntegrate":true},
      {"word":"korruption","definition":"När någon med makt tar emot mutor eller fuskar för egen vinning","example":"Fria medier hjälper till att avslöja korruption.","level":"challenge","canIntegrate":true}
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
