'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import AutoHideHeader from '@/components/AutoHideHeader';
import { InlineBannerAd } from "@/components/ads";
import { GameModeJsonLd } from '@/components/seo/GameModeJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { getHowToPlayContent, type GameModeContent, type FAQItem, type ScoringRow } from './content';

const SITE_URL = 'https://www.lexiclash.live';

interface HowToPlayPageClientProps {
    locale: string;
}

function GameModeSection({
    data,
    modeKey,
}: {
    data: GameModeContent;
    modeKey: string;
}) {
    return (
        <section className="mb-10" aria-labelledby={`${modeKey}-heading`}>
            <h2
                id={`${modeKey}-heading`}
                className="text-2xl sm:text-3xl font-neo-display font-bold mb-3 text-neo-yellow"
                data-speakable="true"
            >
                {data.title}
            </h2>
            <p className="text-neo-white mb-5 text-base leading-relaxed" data-speakable="true">
                {data.description}
            </p>
            <ol className="space-y-4">
                {data.steps.map((step, i) => (
                    <li
                        key={`${modeKey}-step-${i}-${step.title}`}
                        id={`${modeKey}-step-${i + 1}`}
                        className="flex gap-4 items-start bg-neo-navy-light/50 border-3 border-neo-black rounded-neo p-4 shadow-hard-sm"
                    >
                        <span
                            className="shrink-0 w-8 h-8 flex items-center justify-center bg-neo-cyan text-neo-black font-bold rounded-full border-2 border-neo-black text-sm"
                            aria-hidden="true"
                        >
                            {i + 1}
                        </span>
                        <div>
                            <h3 className="font-bold text-white text-base mb-1" data-speakable="true">
                                {step.title}
                            </h3>
                            <p className="text-neo-white text-sm leading-relaxed" data-speakable="true">
                                {step.description}
                            </p>
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
}

function ScoringTable({
    title,
    headers,
    rows,
    comboNote,
}: {
    title: string;
    headers: [string, string, string];
    rows: ScoringRow[];
    comboNote: string;
}) {
    return (
        <section className="mb-10" aria-labelledby="scoring-heading">
            <h2
                id="scoring-heading"
                className="text-2xl sm:text-3xl font-neo-display font-bold mb-4 text-neo-orange"
                data-speakable="true"
            >
                {title}
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full border-3 border-neo-black rounded-neo overflow-hidden text-sm">
                    <thead>
                        <tr className="bg-neo-navy border-b-3 border-neo-black">
                            {headers.map((h) => (
                                <th key={h} className="px-4 py-3 text-start font-bold text-neo-yellow uppercase tracking-wide">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={`row-${row.length}`} className={cn('border-b border-neo-black/30', i % 2 === 0 ? 'bg-neo-navy-light/40' : 'bg-neo-navy-light/20')}>
                                <td className="px-4 py-2.5 font-medium text-white">{row.length}</td>
                                <td className="px-4 py-2.5 text-neo-cyan font-bold">{row.points}</td>
                                <td className="px-4 py-2.5 text-neo-white">{row.example}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="mt-3 text-sm text-neo-white italic" data-speakable="true">{comboNote}</p>
        </section>
    );
}

function FAQSection({ title, items }: { title: string; items: FAQItem[] }) {
    return (
        <section className="mb-10" aria-labelledby="faq-heading">
            <h2
                id="faq-heading"
                className="text-2xl sm:text-3xl font-neo-display font-bold mb-4 text-neo-pink"
                data-speakable="true"
            >
                {title}
            </h2>
            <dl className="space-y-3">
                {items.map((item, i) => (
                    <div key={`faq-${i}-${item.question}`} className="bg-neo-navy-light/50 border-3 border-neo-black rounded-neo p-4 shadow-hard-sm">
                        <dt className="font-bold text-white mb-1" data-speakable="true">{item.question}</dt>
                        <dd className="text-neo-white text-sm leading-relaxed" data-speakable="true">{item.answer}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

export default function HowToPlayPageClient({ locale }: HowToPlayPageClientProps) {
    const c = getHowToPlayContent(locale);

    const breadcrumbs = [
        { name: 'Home', url: `${SITE_URL}/${locale}` },
        { name: c.gameModes.classic.title.includes('קלאסי') ? 'איך לשחק' : 'How to Play', url: `${SITE_URL}/${locale}/how-to-play` },
    ];

    return (
        <>
            <BreadcrumbJsonLd items={breadcrumbs} />
            <GameModeJsonLd mode="classic" locale={locale} includeFaq />
            <GameModeJsonLd mode="blast" locale={locale} />
            <GameModeJsonLd mode="wordHunt" locale={locale} />

            <AutoHideHeader />

            <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
                <header className="mb-10">
                    <h1
                        className="text-3xl sm:text-4xl lg:text-5xl font-neo-display font-bold text-white mb-4"
                        data-speakable="true"
                    >
                        {c.pageTitle}
                    </h1>
                    <p className="text-lg text-neo-white leading-relaxed max-w-3xl" data-speakable="true">
                        {c.introText}
                    </p>
                </header>

                <GameModeSection data={c.gameModes.classic} modeKey="classic" />

                <InlineBannerAd webZone="content-page" className="my-8" />

                <GameModeSection data={c.gameModes.blast} modeKey="blast" />

                <GameModeSection data={c.gameModes.wordHunt} modeKey="wordHunt" />

                <InlineBannerAd webZone="content-page" className="my-8" />

                <ScoringTable
                    title={c.scoring.title}
                    headers={c.scoring.headers}
                    rows={c.scoring.rows}
                    comboNote={c.scoring.comboNote}
                />

                <FAQSection title={c.faq.title} items={c.faq.items} />

                {/* CTA section */}
                <section
                    className="text-center bg-neo-navy-light/60 border-3 border-neo-black rounded-neo p-8 shadow-hard"
                    aria-labelledby="cta-heading"
                >
                    <h2
                        id="cta-heading"
                        className="text-2xl sm:text-3xl font-neo-display font-bold text-neo-yellow mb-2"
                        data-speakable="true"
                    >
                        {c.cta.title}
                    </h2>
                    <p className="text-neo-white mb-6">{c.cta.subtitle}</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Link
                            href={`/${locale}/singleplayer`}
                            className="px-5 py-3 bg-neo-cyan text-neo-black font-bold border-3 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard-pressed transition-shadow"
                        >
                            {c.cta.classic}
                        </Link>
                        <Link
                            href={`/${locale}/blast`}
                            className="px-5 py-3 bg-neo-orange text-neo-black font-bold border-3 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard-pressed transition-shadow"
                        >
                            {c.cta.blast}
                        </Link>
                        <Link
                            href={`/${locale}/daily`}
                            className="px-5 py-3 bg-neo-pink text-white font-bold border-3 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard-pressed transition-shadow"
                        >
                            {c.cta.daily}
                        </Link>
                        <Link
                            href={`/${locale}/multiplayer`}
                            className="px-5 py-3 bg-neo-yellow text-neo-black font-bold border-3 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard-pressed transition-shadow"
                        >
                            {c.cta.multiplayer}
                        </Link>
                    </div>
                </section>
            </div>
        </>
    );
}
