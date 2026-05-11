// app/api/pages/route.ts
// Uses Sitecore Delivery GraphQL with API Key authentication
// No OAuth required

import { NextResponse } from 'next/server';
import { fetchPagesFromXMCloud, getDemoPageData } from '@/lib/sitecoreApi';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const siteName = searchParams.get('site') || process.env.NEXT_PUBLIC_SITE_NAME || 'Skeidar';

    const language = searchParams.get('lang') || process.env.NEXT_PUBLIC_LANGUAGE || 'en';

    const apiKey = process.env.SITECORE_API_KEY || '';

    // No API key configured
    if (!apiKey || apiKey.startsWith('your-')) {
        console.warn('[ContentHealth API] No SITECORE_API_KEY configured — returning demo data');

        return NextResponse.json({
            source: 'demo',
            reason: 'No SITECORE_API_KEY configured in .env.local',
            pages: getDemoPageData(),
        });
    }

    try {
        const pages = await fetchPagesFromXMCloud(apiKey, siteName, language);

        const isDemo = pages.some((p) => p.pageId.startsWith('demo-'));

        return NextResponse.json({
            source: isDemo ? 'demo' : 'sitecore',
            siteName,
            language,
            pages,
        });
    } catch (err: any) {
        console.error('[ContentHealth API] Error:', err.message);

        return NextResponse.json(
            {
                source: 'error',
                error: err.message,
                pages: getDemoPageData(),
            },
            {
                status: 200,
            },
        );
    }
}
