import { NextResponse } from 'next/server';
import { buildLocaleLlms } from './content';

const SUPPORTED = new Set(['en', 'he', 'sv', 'ja', 'es', 'ru']);

export const dynamic = 'force-static';
export const revalidate = 86400;

export async function GET(
    _req: Request,
    ctx: { params: Promise<{ locale: string }> }
) {
    const { locale: raw } = await ctx.params;
    const locale = SUPPORTED.has(raw) ? raw : 'en';
    const body = buildLocaleLlms(locale);

    return new NextResponse(body, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    });
}

export function generateStaticParams() {
    return Array.from(SUPPORTED).map((locale) => ({ locale }));
}
