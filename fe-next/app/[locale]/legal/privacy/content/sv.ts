import { GOOGLE_LIMITED_USE_CLAUSE, GOOGLE_LIMITED_USE_URL, type PrivacyContent } from './shared';

export const sv: PrivacyContent = {
    title: 'Integritetspolicy',
    intro: `Den här integritetspolicyn förklarar hur LexiClash – som drivs av Ohad Fisher, en privat enskild näringsidkare baserad i Israel ("vi", "oss") – samlar in, använder och skyddar dina personuppgifter när du använder vårt flerspelar-ordspel och vår klassrumsplattform på lexiclash.live. Det här dokumentet är inte juridisk rådgivning.`,
    sections: [
      {
        title: '1. Information vi samlar in',
        content: `Vi samlar in följande typer av information, beroende på hur du använder LexiClash:`,
        items: [
          `Konto- och inloggningsuppgifter: om du loggar in med Google eller Discord får vi ditt namn, din e-postadress och din profilbild från den tjänsten (se "Google-användardata" nedan för vad Google-inloggning specifikt delar); detta hanteras via Supabase Auth.`,
          `Spelarprofil: ditt visningsnamn, avatar (emoji, färg eller en bild du laddar upp) och dina inställningar.`,
          `Speldata: poäng, hittade ord, vinster, spelade omgångar, speltid, prestationer och placering på topplistor.`,
          `Tillfällig sessionsdata: aktuellt rum-/speltillstånd, lagrat i Redis och raderas automatiskt, vanligtvis inom en timme efter att spelet avslutats.`,
          `Klassrumsdata, om du eller din skola använder våra lärarverktyg: klassrumsnamn, anslutningskoder, listan över elever i ett klassrum, tilldelade lektioner och varje elevs övnings-/framstegsdata för de lektioner du tilldelar. Gästelever som ansluter med en klasskod uppger varken namn eller e-post – de får ett anonymt konto.`,
          `Valfri synkroniseringsdata för Google Classroom, endast om en lärare ansluter den: se avsnittet "Google-användardata" nedan.`,
          `Betalningsdata: om du prenumererar på Pro delar vår betalningsleverantör Polar din prenumerationsplan, status och faktureringsperiod med oss. Vi tar aldrig emot eller lagrar ditt fullständiga kortnummer.`,
          `Meddelanden du skickar till oss: om du använder vårt kontakt- eller feedbackformulär sparar vi meddelandet och den e-postadress du uppgav så att vi kan svara.`,
          `Teknisk data och analysdata, endast med ditt samtycke: enhets-/webbläsartyp, visade sidor och händelser i appen, som samlas in via PostHog, Google Analytics och LogRocket enligt beskrivningen i "Tredjepartstjänster" och "Cookies och lokal lagring". När du är inloggad kopplar PostHog och LogRocket även den datan till ditt konto: ditt visningsnamn, om du är lärare/admin, och spelstatistik (nivå, poäng, streaks); PostHog kan även ta emot din e-postadress för att känna igen dig mellan sessioner.`,
          `Kraschrapporter och felrapporter, som samlas in automatiskt via Sentry för att hjälpa oss hitta och åtgärda buggar. Dessa rapporter innehåller ett slumpmässigt konto-id och användarnamn, men aldrig din e-postadress.`,
        ],
      },
      {
        title: '2. Hur vi använder din information',
        content: `Vi använder informationen ovan för att:`,
        items: [
          `skapa och skydda ditt konto, och låta dig logga in`,
          `driva spelet – matchning, poängsättning och topplistor – och visa din profil och statistik för andra spelare`,
          `driva klassrumsfunktionerna: låta lärare skapa klassrum och lektioner, följa elevers framsteg, generera rapporter och (valfritt) synkronisera betyg till Google Classroom`,
          `skicka tjänsterelaterad e-post via Resend: konto- och välkomstmeddelanden, svar på dina kontakt-/feedbackmeddelanden och (om du inte har valt bort det) enstaka återengagemangs-e-post; betalningskvitton skickas av Polar, vår betalningsleverantör`,
          `mäta och förbättra LexiClash med hjälp av analys, endast om du har godkänt analys-cookies`,
          `automatiskt hitta och åtgärda buggar genom krasch-/felrapportering`,
          `visa annonser utanför klassrums- och utbildningssidor, endast om du har godkänt annons-cookies (eller, i native-appar, på ett sätt som följer app-butikernas annonspolicyer)`,
          `hålla spelet rättvist och upprätthålla våra användarvillkor`,
        ],
      },
      {
        title: '3. Tredjepartstjänster',
        content: `Vi förlitar oss på följande leverantörer för att driva LexiClash. Var och en får bara den data de behöver för sin roll åt oss:`,
        items: [
          `Supabase – autentisering, databas och fillagring`,
          `PostHog – produktanalys (EU-hostad), endast med ditt samtycke; när du är inloggad ingår din e-post, ditt visningsnamn och din lärar-/adminroll`,
          `Google Analytics (GA4) – användningsanalys, endast med ditt samtycke`,
          `Sentry – automatisk krasch- och felrapportering`,
          `LogRocket – sessionsinspelning och felloggar, endast med ditt samtycke; när du är inloggad kopplar det även din session till ditt visningsnamn och din spelstatistik`,
          `Google AdMob, och Googles H5 Games Ads på webbversionen – annonsering, endast utanför klassrums-/utbildningssidor och endast med ditt samtycke`,
          `ayeT-Studios – en valfri "tjäna mynt"-erbjudandevägg på webbversionen; visas aldrig för ett konto flaggat som barn`,
          `Resend – att skicka ovanstående e-post å våra vägnar`,
          `Polar – betalningshantering och Merchant of Record för Pro-prenumerationer`,
          `Google Classroom API – endast om en lärare väljer att ansluta det; se "Google-användardata"`,
          `Google och Discord – OAuth-inloggning`,
        ],
      },
      {
        title: '4. Annonsering från tredje part',
        content: `LexiClash finansieras delvis av annonser utanför klassrums- och utbildningsanvändning. Vi visar aldrig annonser på lärar-, elev-, klassrums- eller utbildningssidor, eller under en flerspelaromgång kopplad till ett klassrum.`,
        subsections: [
          {
            title: 'Så fungerar annonseringen',
            items: [
              `Vi använder Google AdMob i vår native mobilapp och Googles H5 Games Ads på webbversionen.`,
              `I native-appen ber vi om samtycke via Googles User Messaging Platform där din region kräver det (till exempel EES och Storbritannien) innan annonserna sätts upp. Ett konto som identifierats som barn (se "Klassrum, skolor och barns integritet" nedan) ser inga annonser alls där, och alla konton vi inte bekräftat är vuxna ser inga interstitial-annonser och visas annonser i Googles barnriktade och under-samtyckesålder-lägen (TFCD/TFUA), vilket stänger av personanpassade annonser och begränsar annonsinnehållet till en allmän åldersgräns.`,
              `På webben bär annonsförfrågningar Googles Consent Mode v2-signal från valet "Annonsering" i vår cookie-banner, som styr om en annons kan personanpassas.`,
              `Vi kan även visa en valfri "tjäna mynt"-erbjudandevägg (ayeT-Studios) på webbversionen; den visas aldrig för ett konto som identifierats som barn, och inte på klassrums-/utbildningssidor.`,
              `Vi säljer aldrig dina personuppgifter till annonsörer.`,
            ],
          },
          {
            title: 'Dina val',
            content: `Du kan styra annonseringen i LexiClash:`,
            items: [
              `ändra ditt val för annons-cookies när som helst från vår cookie-banner`,
              `avaktivera personanpassade annonser i Google Ads-inställningar (https://adssettings.google.com)`,
              `läsa om Googles annonsrelaterade integritetspraxis på https://policies.google.com/technologies/ads`,
              `avaktivera andra deltagande leverantörers annons-cookies på https://www.aboutads.info/choices`,
              `hantera eller ta bort cookies i din webbläsares inställningar – att stänga av nödvändiga cookies kan hindra webbplatsen från att fungera korrekt`,
            ],
          },
        ],
      },
      {
        title: '5. Cookies och lokal lagring',
        content: `Vi använder cookies och lokal lagring i tre kategorier, som visas i vår cookie-banner: Nödvändiga – alltid aktiva, krävs för inloggning, säkerhet och att komma ihåg grundläggande inställningar som tema och språk; webbplatsen kanske inte fungerar utan dem. Analys – används endast om du godkänner dem; driver PostHog, Google Analytics och LogRocket, enligt ovan. Annonsering – används endast om du godkänner dem; låter Google visa och mäta annonser utanför klassrums-/utbildningssidor, enligt ovan. Du kan ändra ditt val när som helst från cookie-bannern eller din webbläsares inställningar.`,
      },
      {
        title: '6. Google-användardata',
        content: `Det här avsnittet samlar på ett ställe allt LexiClash gör med data som tas emot från Googles API:er.`,
        subsections: [
          {
            title: 'Google-inloggning',
            content: `När du loggar in på ditt eget LexiClash-konto med Google delar Google ditt namn, din e-postadress och din profilbild med oss så att vi kan skapa och autentisera ditt konto, enligt beskrivningen i "Information vi samlar in" ovan. Vi begär ingen åtkomst till Google Classroom som en del av den här inloggningen.`,
          },
          {
            title: 'Google Classroom-integration (valfri, Teacher Pro)',
            content: `Om en lärare uttryckligen ansluter sitt Google-konto för att skicka betyg till Google Classroom kommer LexiClash bara åt det funktionen behöver, och bara medan läraren använder den:`,
            items: [
              `Din kurslista i Google Classroom, så att du kan välja vilken klass som ska betygsättas.`,
              `Den klassens elevlista – varje elevs Google Classroom-användar-id och, för att vi ska kunna matcha dem mot dina LexiClash-elever, deras skol-e-postadress.`,
              `Uppgiften du väljer eller skapar, och varje elevs inlämningsstatus för den.`,
              `Vi använder detta enbart för att matcha en LexiClash-elev mot deras Google Classroom-konto via e-post, och för att skriva det betyg du väljer att skicka (och, om du ber oss, markera uppgiften som returnerad till den eleven).`,
              `Elevlistedatan (namn, e-post, Google-användar-id) hålls endast i minnet under den enskilda begäran som skickar betygen – den skrivs aldrig till vår databas, loggas inte, och ingår inte i något som skickas tillbaka till din webbläsare. Endast dina egna LexiClash-elevnamn visas i resultaten du ser.`,
              `Betyg kan bara skrivas till en Classroom-uppgift som LexiClash själv skapat – det är en begränsning Googles API upprätthåller, inte ett val vi gjort.`,
              `Din Google-åtkomsttoken lagras endast i en krypterad (AES-256-GCM), httpOnly-cookie kopplad till ditt LexiClash-konto, och den upphör att gälla efter ungefär en timme. Vi begär eller lagrar ingen Google-refreshtoken, så vi har aldrig ett långlivat Google-tillstånd för ditt konto.`,
              `Vi säljer eller delar aldrig den här datan, och använder den aldrig för annonsering eller för att träna AI/ML-modeller.`,
              `Du kan koppla bort LexiClash från ditt Google-konto när som helst på https://myaccount.google.com/permissions.`,
            ],
          },
          {
            title: 'Googles användardatapolicy för API-tjänster',
            content: `Som Google kräver återger vi här följande förklaring i originalspråket, engelska: "${GOOGLE_LIMITED_USE_CLAUSE}" Mer information: ${GOOGLE_LIMITED_USE_URL}`,
          },
        ],
      },
      {
        title: '7. Klassrum, skolor och barns integritet',
        content: `Vi ber alla att uppge sin ålder. LexiClashs allmänna, annonsfinansierade produkt följer dessutom våra åldersgränser i app-butikerna (13+); vår separata klassrums-/lärarprodukt är utformad för att användas av elever i alla skolåldrar, under en lärares eller skolas tillsyn:`,
        items: [
          `Alla ombeds, via en neutral engångsskärm utan förvalt eller föreslaget svar, att ange ett födelseår. Utifrån det självrapporterade (inte oberoende verifierade) svaret placeras kontot i en av tre kategorier – barn (under 13), vuxen (13 eller äldre) eller okänd (ej besvarat) – var och en med olika standardinställningar för chatt, direktmeddelanden, vänförfrågningar och annonsering.`,
          `Ett konto i kategorin barn ser aldrig en annons eller "tjäna mynt"-erbjudandeväggen, och är som standard begränsat från fri chatt, direktmeddelanden och vänförfrågningar; ett "okänt" (obesvarat) konto får samma försiktiga standardinställningar som en försiktighetsåtgärd.`,
          `Gästelever som ansluter till ett klassrum med en anslutningskod hoppar över kontoregistreringen helt – de uppger inte namn, e-post eller någon personlig information, och får ett anonymt konto.`,
          `När en lärare skapar ett klassrum och bjuder in elever ansvarar läraren (och skolan) för att inhämta det föräldra- eller vårdnadshavarsamtycke som krävs enligt lag för elever under 13 år – samma "skolansvarig"-grund som ofta används av leverantörer av utbildningsteknik. LexiClash verifierar inte självständigt någon elevs ålder i det flödet.`,
          `Vi säljer aldrig någon användares personuppgifter, inklusive ett barns, till tredje part för marknadsföring.`,
          `En förälder eller vårdnadshavare kan kontakta oss på lexiclash.game@gmail.com för att granska, rätta eller radera sitt barns information.`,
        ],
      },
      {
        title: '8. Datalagring',
        content: `Vi behåller information bara så länge den tjänar det syfte den samlades in för:`,
        items: [
          `Konto-, profil- och klassrumsdata – tills du eller klassrummets lärare raderar den, eller du raderar ditt konto.`,
          `Spelstatistik och topplisteposter – behålls för att bevara topplistornas integritet, och tas bort när du raderar ditt konto och dina rader inte blockeras av en dataintegritetskonflikt (se raderingsnoteringen nedan).`,
          `Redis sessions-/speltillstånd – raderas automatiskt, vanligtvis inom en timme efter att spelet avslutats.`,
          `Elevlistedata från Google Classroom (namn, e-post, användar-id) – lagras aldrig; hålls endast i minnet under den enskilda betygssynkroniseringsbegäran, enligt "Google-användardata".`,
          `Din Google Classroom-åtkomsttoken – upphör automatiskt efter ungefär en timme; vi lagrar aldrig en refreshtoken.`,
          `Analys- och kraschdata – behålls enligt varje leverantörs egen policy (PostHog, Google Analytics, Sentry, LogRocket).`,
          `Att radera ditt konto sker omedelbart: vi tar bort dina push-notistokens och eventuella rader kopplade till din e-post för lärarbehörighet direkt, och raderar sedan själva inloggningen, vilket leder till att din profil och andra tabeller vår databas länkar till den också tas bort. Om en dataintegritetskonflikt någon gång blockerar en del av det, returnerar raderingen ett fel istället för att tyst lämna kvar data – kontakta lexiclash.game@gmail.com så slutför vi det manuellt.`,
        ],
      },
      {
        title: '9. Datasäkerhet',
        content: `Vi använder branschstandardiserade skyddsåtgärder: all trafik krypteras med HTTPS; autentisering sker via Supabases OAuth-flöden; dina databasposter lagras i Supabases krypterade infrastruktur; din Google Classroom-åtkomsttoken lagras endast i en AES-256-GCM-krypterad, httpOnly-cookie; och flerspelarläge använder säkra WebSocket-anslutningar.`,
      },
      {
        title: '10. Dina rättigheter',
        content: `Beroende på var du bor kan du ha rätt att:`,
        items: [
          `få tillgång till de personuppgifter vi har om dig, via din profilsida eller genom att kontakta oss`,
          `rätta eller uppdatera din information när som helst`,
          `radera ditt konto och tillhörande data, omedelbart, från dina kontoinställningar`,
          `fråga oss vilka uppgifter vi har och varför, och invända mot eller begränsa vissa användningar av dem`,
          `på begäran få en kopia av din data i ett portabelt format`,
          `För att utöva någon av dessa rättigheter, kontakta oss på lexiclash.game@gmail.com.`,
        ],
      },
      {
        title: '11. Betalningar och prenumerationer',
        content: `När du köper en Pro-prenumeration hanterar vår betalningsleverantör Polar transaktionen och agerar som Merchant of Record för LexiClash. Vi tar emot din prenumerationsplan, status och faktureringsperiod, men aldrig dina fullständiga kortuppgifter – dessa hanteras av Polar och dess egna betalningsleverantörer, som också samlar in och betalar tillämpliga skatter. För klassrums-/lärarkonton behandlar vi den elevdata du ger oss för att leverera tjänsten, precis som beskrivs i den här policyn och våra användarvillkor.`,
      },
      {
        title: '12. Internationella användare',
        content: `Din data kan överföras till och lagras i andra länder än där du bor, inklusive länder med andra dataskyddslagar än dina egna. Genom att använda LexiClash samtycker du till en sådan överföring.`,
      },
      {
        title: '13. Ändringar av den här policyn',
        content: `Vi kan uppdatera den här integritetspolicyn då och då. Eventuella ändringar publiceras på den här sidan med ett nytt gällande-från-datum. Om du fortsätter använda LexiClash efter en ändring innebär det att du accepterar den uppdaterade policyn.`,
      },
      {
        title: '14. Tillämplig lag',
        content: `Den här integritetspolicyn styrs av lagarna i Staten Israel. Eventuella tvister ska lösas i domstolar belägna i Israel.`,
      },
      {
        title: '15. Kontakta oss',
        content: `Har du frågor om den här policyn, eller om din data? Mejla oss på lexiclash.game@gmail.com så återkommer vi till dig.`,
      },
    ],
};
