import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const isSwedish = locale === 'sv';
    const pageUrl = `${BASE_URL}/sv/lexiclash-vs-wordfeud`;

    return {
        title: 'LexiClash vs Wordfeud — Vilket Ordspel Är Bäst 2026? | LexiClash',
        description: 'LexiClash vs Wordfeud i jämförelse: realtid kontra turordning, 90 sekunder per match istället för dagar, 2-20 spelare, gratis i webbläsaren utan nedladdning. Hitta det bästa ordspelet för svenska spelare.',
        keywords: 'lexiclash vs wordfeud, wordfeud alternativ, gratis ordspel online, ordspel multiplayer, snabbt ordspel svenska, ordspel utan väntetid, bästa ordspelet 2026, ordspel i webbläsaren, alfapet alternativ',
        openGraph: {
            title: 'LexiClash vs Wordfeud — Realtid eller Turordning?',
            description: 'Wordfeud tar dagar per match. LexiClash kör synkront — 90 sekunder, 2-20 spelare, ingen nedladdning. Full jämförelse för svenska ordspelfans.',
            locale: 'sv_SE',
            type: 'website',
            url: pageUrl,
            images: [{ url: `${BASE_URL}/og-image-en.webp`, width: 1200, height: 630, alt: 'LexiClash vs Wordfeud jämförelse' }],
        },
        twitter: {
            card: 'summary_large_image',
            title: 'LexiClash vs Wordfeud — Vilket är bäst?',
            description: 'Realtidssynkat ordspel med 2-20 spelare i webbläsaren. Full jämförelse mot Wordfeud.',
            images: [`${BASE_URL}/og-image-en.webp`],
        },
        alternates: {
            canonical: pageUrl,
            languages: {
                'x-default': pageUrl,
                sv: pageUrl,
                'sv-SE': pageUrl,
            },
        },
        robots: { index: isSwedish, follow: true },
    };
}

const faqs = [
    {
        q: 'Hur skiljer sig LexiClash från Wordfeud?',
        a: 'Wordfeud är turbaserat — du och din motståndare lägger ord i tur och ordning, ofta med dagar mellan dragen. LexiClash är synkront i realtid: alla spelare ser samma bokstavsrutnät samtidigt och letar ord parallellt. En full match tar 90 sekunder istället för dagar. Båda spelen är gratis, men gameplay-rytmen är helt olika.',
    },
    {
        q: 'Hur många kan spela LexiClash samtidigt?',
        a: 'Mellan 2 och 20+ spelare i samma rum. Wordfeud är begränsat till 2 spelare per match. LexiClash är byggt för fester, klassrum, kollegor på distans och familjekvällar — alla på samma rutnät.',
    },
    {
        q: 'Behöver jag ladda ner en app?',
        a: 'Nej — LexiClash körs i webbläsaren. Det fungerar på iPhone, Android, surfplatta och dator utan installation. Du kan installera det som en Progressive Web App om du vill ha det på hemskärmen, men det är frivilligt. Wordfeud kräver appen för full funktionalitet.',
    },
    {
        q: 'Behöver jag ett konto?',
        a: 'Nej, du kan spela direkt som gäst. Inget Google-konto, inget Facebook-konto, ingen e-post krävs. Konto är valfritt och behövs bara om du vill synka framsteg mellan flera enheter. Wordfeud kräver registrering.',
    },
    {
        q: 'Är ordlistan lika omfattande som Wordfeud?',
        a: 'LexiClash använder en SAOL-anpassad svensk ordlista. Du får ett korrekt och meningsfullt spel på svenska. Wordfeud har Sveriges största spelarbas och en välslipad ordlista efter över ett decenniums utveckling — det är fortfarande riktmärket. LexiClash kompletterar med flerspelarformat och flera språk i samma app.',
    },
    {
        q: 'Vad kostar LexiClash?',
        a: 'Gratis. Alla spellägen, dagliga utmaningar och flerspelarrum är öppna utan betalning. Vi visar annonser för att hålla det gratis, men annonser blockerar aldrig själva spelet. Inga pay-to-win-mekaniker — alla powerups tjänas in genom spelande, inte köp.',
    },
    {
        q: 'Kan jag spela mot vänner specifikt, eller bara slumpmässiga motståndare?',
        a: 'Båda. Skapa ett rum och dela 4-siffrig kod via SMS, WhatsApp eller QR-kod — dina vänner går med direkt. Du kan också gå med i öppna rum för att möta okända spelare. Wordfeud kräver att du adderar motståndare via användarnamn eller Facebook.',
    },
    {
        q: 'Finns det ett klassrumsläge för lärare?',
        a: 'Ja. LexiClash Education är gratis för lärare, ingen elevregistrering krävs. Bygg egna ordlistor från läroplanen, kör vokabulärduells, följ elevernas framsteg på en lärardashboard. Detta finns inte i Wordfeud. Lämpligt för svensktalande klassrum, ESL/SFI och språkundervisning.',
    },
];

const faqJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: 'sv-SE',
    url: `${BASE_URL}/sv/lexiclash-vs-wordfeud`,
    mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
});

export default async function LexiClashVsWordfeudPage({ params }: PageProps) {
    const { locale } = await params;

    return (
        <main className="min-h-screen bg-neo-navy text-neo-white">
            <script type="application/ld+json">{faqJsonLd}</script>

            <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
                <h1 className="mb-6 font-neo-display text-4xl font-bold leading-tight sm:text-5xl">
                    LexiClash vs Wordfeud — Vilket Ordspel Vinner?
                </h1>

                <p className="mb-8 text-lg leading-relaxed text-neo-gray-200">
                    Wordfeud har dominerat svenska ordspel sedan 2010 — turbaserat, asynkront, perfekt för långsamma matcher mellan dragen. LexiClash är något annat: synkront i realtid, 2-20+ spelare på samma rutnät samtidigt, en full match på 90 sekunder. Båda är gratis. Båda är webbläsarvänliga. Men gameplay-känslan är helt olika. Här är den ärliga jämförelsen för svenska ordspelfans.
                </p>

                <section className="mb-12 flex flex-col gap-3 sm:flex-row sm:gap-4">
                    <Link href={`/${locale}/multiplayer`} className="rounded-neo border-4 border-neo-lime bg-neo-lime px-6 py-3 text-center font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg sm:px-8 sm:py-4">
                        Spela LexiClash Gratis
                    </Link>
                    <Link href={`/${locale}/daily`} className="rounded-neo border-4 border-neo-cyan bg-transparent px-6 py-3 text-center font-bold text-neo-cyan shadow-hard transition-all hover:bg-neo-cyan/10 sm:px-8 sm:py-4">
                        Daglig Utmaning
                    </Link>
                    <Link href={`/${locale}/education`} className="rounded-neo border-4 border-neo-purple bg-transparent px-6 py-3 text-center font-bold text-neo-purple shadow-hard transition-all hover:bg-neo-purple/10 sm:px-8 sm:py-4">
                        För Lärare
                    </Link>
                </section>

                <section className="mb-12">
                    <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Den Ärliga Jämförelsen</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse rounded-neo border-3 border-neo-gray-400 text-sm sm:text-base">
                            <thead>
                                <tr className="border-b-3 border-neo-gray-400 bg-neo-navy/80">
                                    <th className="px-4 py-3 text-left font-bold text-neo-lime">Funktion</th>
                                    <th className="px-4 py-3 text-center font-bold text-neo-cyan">LexiClash</th>
                                    <th className="px-4 py-3 text-center text-neo-gray-300">Wordfeud</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['Speltakt', 'Realtid (synkront)', 'Turbaserat (dagar)'],
                                    ['Matchlängd', '~90 sekunder', 'Dagar till veckor'],
                                    ['Antal spelare per rum', '2 till 20+', '2 (fast)'],
                                    ['Spelmekanik', 'Hitta ord på delat rutnät', 'Lägg ord på Scrabble-bräda'],
                                    ['Ordlista', 'SAOL-anpassad', 'SAOL-baserad'],
                                    ['Konto krävs', 'Nej (valfritt)', 'Ja'],
                                    ['Plattformar', 'Webb + Android', 'Endast app'],
                                    ['Webbläsarspel', 'Ja', 'Begränsat'],
                                    ['Bjud in vänner', '4-siffrig kod / QR / länk', 'Användarnamn / Facebook'],
                                    ['Pris', 'Gratis (annonser)', 'Gratis (annonser)'],
                                    ['Pay-to-win', 'Nej', 'Powerups via köp finns'],
                                    ['Daglig utmaning', 'Ja (Wordle-stil + Daily Buzz)', 'Inte primärt'],
                                    ['Klassrumsläge', 'Ja, gratis lärardashboard', 'Nej'],
                                    ['Antal språk', '5 (EN, HE, SV, JA, ES)', 'Främst nordiska'],
                                    ['Hebrew RTL-stöd', 'Ja', 'Nej'],
                                ].map(([feature, lexi, wordfeud]) => (
                                    <tr key={feature} className="border-b border-neo-gray-400/50">
                                        <td className="px-4 py-3 font-medium">{feature}</td>
                                        <td className="px-4 py-3 text-center text-neo-cyan">{lexi}</td>
                                        <td className="px-4 py-3 text-center text-neo-gray-300">{wordfeud}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Varför Realtid Slår Turordning</h2>
                    <div className="rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 p-6 shadow-hard">
                        <div className="mb-6">
                            <h3 className="mb-2 font-bold text-neo-cyan">Wordfeud (Asynkron Turordning)</h3>
                            <p className="text-neo-gray-200">
                                Du gör ditt drag, motståndaren gör sitt — kanske om en timme, kanske om tre dagar. För strategiska spelare är väntetiden faktiskt en del av charmen: du har gott om tid att hitta det perfekta ordet. För andra känns det utdraget. Wordfeud är riktmärket för långsam, eftertänksam ordstrategi.
                            </p>
                        </div>
                        <div>
                            <h3 className="mb-2 font-bold text-neo-pink">LexiClash (Synkron Realtid)</h3>
                            <p className="text-neo-gray-200">
                                Alla spelare ser samma rutnät av slumpmässiga bokstäver. Klockan tickar. Du letar ord genom att koppla ihop intilliggande bokstäver — diagonalt, vertikalt, horisontellt. Längre ord = mer poäng. Komboer multiplicerar. Efter 90 sekunder är matchen slut. Mer puls, mer pannlobsarbete per minut, mindre väntan. Bra för fester och pauser; sämre för &quot;jag svarar imorgon när jag har tid&quot;-stilen.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Vad LexiClash Erbjuder Som Wordfeud Saknar</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {[
                            { title: 'Daglig utmaning i Wordle-stil', desc: 'Word Hunt Survival och Daily Buzz — globala dagliga pussel med delbara emoji-resultat och streak-uppföljning. Wordfeud har inget motsvarande dagligt format.' },
                            { title: 'Multiplayer för 20+ spelare', desc: 'Skapa ett rum, dela koden, få in hela klassen eller hela festen samtidigt på samma rutnät. Wordfeud är begränsat till 1 mot 1.' },
                            { title: 'Klassrumsläge för lärare', desc: 'Egna ordlistor från läroplanen, vokabulärduells, lärardashboard med elevernas framsteg. Helt gratis utan elevregistrering. Saknas i Wordfeud.' },
                            { title: 'Brain Drills (6 minispel)', desc: 'Word Wheel, Anagram Sprint, Connections, Word Detective, Word of the Day, Speed Spell. Snabba kognitionsövningar — finns inte i Wordfeud.' },
                            { title: '5 språk i samma app', desc: 'Engelska, hebreiska (RTL), svenska, japanska, spanska. Användbart för språkstudier eller flerspråkiga vänner. Wordfeud fokuserar på nordiska språk var för sig.' },
                            { title: 'Ingen registrering krävs', desc: 'Klicka Spela, ange smeknamn, kör. Konto är valfritt — för synk mellan enheter. Wordfeud kräver konto från start.' },
                        ].map((item) => (
                            <div key={item.title} className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-4 shadow-hard">
                                <h3 className="mb-1 font-bold text-neo-lime">{item.title}</h3>
                                <p className="text-sm text-neo-gray-200">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">När Du Ska Välja Vilket</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-neo border-3 border-neo-cyan bg-neo-navy/50 p-6 shadow-hard">
                            <h3 className="mb-3 font-bold text-neo-cyan">Välj Wordfeud Om Du Vill:</h3>
                            <ul className="space-y-2 text-sm text-neo-gray-200">
                                <li>Spela Scrabble-stil med taktisk planering</li>
                                <li>Ha matcher som pågår i dagar — inget tidstryck</li>
                                <li>Möta en specifik motståndare 1 mot 1</li>
                                <li>Använda en etablerad app med stor svensk spelarbas</li>
                                <li>Ha en lugnare, eftertänksam ordspelupplevelse</li>
                            </ul>
                        </div>
                        <div className="rounded-neo border-3 border-neo-lime/40 bg-neo-navy/50 p-6 shadow-hard">
                            <h3 className="mb-3 font-bold text-neo-lime">Välj LexiClash Om Du Vill:</h3>
                            <ul className="space-y-2 text-sm text-neo-gray-200">
                                <li>Spela en match på 90 sekunder, inte dagar</li>
                                <li>Få med 5-20 personer på samma fest eller klass</li>
                                <li>Spela direkt i webbläsaren utan att ladda ner</li>
                                <li>Ha daglig utmaning med streaks (Wordle-stil)</li>
                                <li>Använda klassrumsläge i undervisningen</li>
                                <li>Spela på flera språk i samma app</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="mb-6 font-neo-display text-2xl font-bold sm:text-3xl">Vanliga Frågor</h2>
                    <div className="space-y-4">
                        {faqs.map((faq, idx) => (
                            <details key={`faq-${idx}-${faq.q}`} className="group rounded-neo border-3 border-neo-gray-400 bg-neo-navy/50 shadow-hard">
                                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 font-bold">
                                    <span>{faq.q}</span>
                                    <span className="text-neo-lime transition-transform group-open:rotate-180">▼</span>
                                </summary>
                                <div className="border-t border-neo-gray-400 px-6 py-4 text-neo-gray-200">{faq.a}</div>
                            </details>
                        ))}
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="mb-4 font-neo-display text-2xl font-bold sm:text-3xl">Andra Jämförelser</h2>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Link href={`/${locale}/lexiclash-vs-wordle`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
                            <h3 className="font-bold text-neo-cyan">LexiClash vs Wordle</h3>
                            <p className="mt-1 text-xs text-neo-gray-200">Multiplayer vs 1 dagligt pussel</p>
                        </Link>
                        <Link href={`/${locale}/lexiclash-vs-scrabble`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
                            <h3 className="font-bold text-neo-cyan">LexiClash vs Scrabble GO</h3>
                            <p className="mt-1 text-xs text-neo-gray-200">Realtid vs turordning</p>
                        </Link>
                        <Link href={`/${locale}/lexiclash-vs-cabanagrams`} className="rounded-neo border-3 border-neo-gray-400/40 bg-neo-navy/50 p-4 shadow-hard transition-all hover:border-neo-lime/40">
                            <h3 className="font-bold text-neo-cyan">LexiClash vs Cabanagrams</h3>
                            <p className="mt-1 text-xs text-neo-gray-200">Delat rutnät vs personligt</p>
                        </Link>
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="font-neo-display text-2xl font-bold sm:text-3xl">Sammanfattning</h2>
                    <p className="mt-4 text-neo-gray-200">
                        Wordfeud är ett briljant turbaserat ordspel — Sveriges ordspelsklassiker sedan 2010. Om du älskar långsam, taktisk Scrabble-stil mellan en specifik motståndare så finns det inget bättre. Den stora svenska spelarbasen och den välslipade matchningen är reella fördelar.
                    </p>
                    <p className="mt-4 text-neo-gray-200">
                        LexiClash är för dig som vill ha samma ordspelsglädje men i ett snabbare format: 90-sekunders synkrona matcher, 2-20+ spelare i samma rum, ingen nedladdning, klassrumsläge, daglig utmaning. Det är inte ett ersättning för Wordfeud — det är ett komplement för andra tillfällen. Wordfeud till morgonkaffet, LexiClash till festen.
                    </p>
                    <p className="mt-4 text-neo-gray-200">
                        Båda är gratis. Båda fungerar i Sverige. Båda har svenska ordlistor. Skillnaden är vilken känsla du är ute efter.
                    </p>
                    <div className="mt-6">
                        <Link href={`/${locale}/multiplayer`} className="inline-block rounded-neo border-4 border-neo-lime bg-neo-lime px-8 py-4 font-bold text-neo-navy shadow-hard transition-all hover:shadow-hard-lg">
                            Prova LexiClash Nu — Gratis, Ingen Nedladdning
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
