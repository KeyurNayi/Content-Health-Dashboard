// src/lib/sitecoreApi.ts
// Sitecore XM Cloud GraphQL API — Production-ready with multisite support

import { PageHealthData } from './healthScorer';

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * FIELD NAME MAPPING
 *
 * Sitecore templates vary per project. Map YOUR actual template field names here.
 * These are the field names exactly as they appear in your template definition
 * (e.g. in Content Editor: /sitecore/templates/Feature/Metadata/...)
 *
 * How to find your field names:
 *   1. Open Content Editor in XM Cloud
 *   2. Navigate to a page item
 *   3. Look at the field names in the Metadata or SEO section
 *   4. Add them to the arrays below
 *
 * The mapper tries each name in order and uses the FIRST one that has a value.
 */
export const FIELD_MAP = {
    // Meta title field names — add your project's field names here
    metaTitle: [
        'SEO_Title',
        'MetaTitle', // Common SXA field name
        'Title', // Generic
        'Browser Title', // Older Sitecore SXA
        'BrowserTitle',
        'SEOTitle',
        'OpenGraph Title',
        'Navigation Title',
    ],

    // Meta description field names
    metaDescription: [
        'SEO_Description',
        'MetaDescription',
        'Description',
        'Meta Description', // SXA default (with space)
        'SEODescription',
        'Abstract',
        'Summary',
    ],

    // H1 / page heading field names
    heading: ['Heading', 'Title', 'H1', 'Page Title', 'PageTitle', 'Hero Title', 'HeroTitle', 'Name'],

    // Rich text / body content fields (for word count)
    bodyContent: ['Text', 'Body', 'Content', 'Main Content', 'MainContent', 'PageContent', 'Introduction', 'Intro', 'Abstract'],

    // Canonical URL field names
    canonical: ['CanonicalUrl', 'Canonical', 'Canonical URL', 'SEOCanonical'],
};

// ─── GraphQL Queries ──────────────────────────────────────────────────────────

/**
 * Step 1: Fetch the site root path from XM Cloud Sites API.
 * This automatically resolves the correct home node for ANY site name.
 */
const GET_SITE_ROOT_QUERY = `
  query GetSiteRoot($siteName: String!) {
    site(siteName: $siteName) {
      name
      rootPath
      startPath
      domain
    }
  }
`;

const GET_ITEM_BY_PATH_QUERY = `
    query GetItemByPath($path: String!, $language: String!) {
    item(path: $path, language: $language) {
      id
      name
      path
    }
  }
`;

/**
 * Step 2: Fetch all page items under a given root path.
 * Uses the root path returned from Step 1 — works for any site automatically.
 * _hasLayout: true means only real pages (not datasource items or folders).
 */
const GET_PAGES_BY_PATH_QUERY = `
query GetPagesByPath($rootItemId: String!, $language: String!) {
  item(path: $rootItemId, language: $language) {
    # Level 1 pages: direct children of Home
    children(hasLayout: true, first:20) {
      results {
        id
        name
        path

        fields {
          name
          value
        }

        updated: field(name: "__Updated") {
          value
        }

        created: field(name: "__Created") {
          value
        }

        renderings: field(name: "__Renderings") {
          value
        }

        finalRenderings: field(name: "__Final Renderings") {
          value
        }

        displayName: field(name: "__Display name") {
          value
        }
      }
    }
  }
}
`;

// ─── Site Info ────────────────────────────────────────────────────────────────

export interface SiteInfo {
    name: string;
    rootPath: string;
    startPath: string;
    homePath: string;
    domain: string;
}

/**
 * Resolve the site home node path from the Sites API.
 * This is how the app auto-discovers pages without hardcoding paths.
 */
export async function fetchSiteInfo(accessToken: string, siteName: string, endpoint: string): Promise<SiteInfo | null> {
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: buildHeaders(accessToken),
            body: JSON.stringify({
                query: GET_SITE_ROOT_QUERY,
                variables: { siteName },
            }),
        });
        const data = await res.json();
        const info = data?.data?.site;
        if (!info) return null;
        const rootPath = info.rootPath || `/sitecore/content/Ellinor-Commerce/${siteName}`;
        const startPath = info.startPath || '/Home';
        return {
            name: info.name || siteName,
            rootPath,
            startPath,
            homePath: joinSitecorePath(rootPath, startPath),
            domain: info.domain || '',
        };
    } catch {
        return null;
    }
}

async function fetchItemByPath(
    accessToken: string,
    endpoint: string,
    path: string,
    language: string,
): Promise<{ id: string; name: string; path: string } | null> {
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: buildHeaders(accessToken),
            body: JSON.stringify({
                query: GET_ITEM_BY_PATH_QUERY,
                variables: { path, language },
            }),
        });
        const data = await res.json();
        return data?.data?.item || null;
    } catch {
        return null;
    }
}

// ─── Main Fetch Function ──────────────────────────────────────────────────────

/**
 * Fetch all pages from XM Cloud for a given site.
 *
 * HOW IT WORKS:
 * 1. Calls Sites API -> gets rootPath (home node) automatically
 *    e.g. /sitecore/content/MySite/Home
 * 2. Searches all items under that path that have a layout (real pages only)
 * 3. Maps fields using FIELD_MAP — works with ANY template structure
 * 4. Falls back to demo data if no connection available
 *
 * MULTISITE: Just pass a different siteName — root path resolves automatically.
 *   fetchPagesFromXMCloud(token, "site-a")  -> /sitecore/content/SiteA/Home
 *   fetchPagesFromXMCloud(token, "site-b")  -> /sitecore/content/SiteB/Home
 */
export async function fetchPagesFromXMCloud(
    accessToken: string,
    siteName: string = 'website',
    language: string = 'en',
    maxPages: number = 100,
): Promise<PageHealthData[]> {
    const endpoint = process.env.NEXT_PUBLIC_SITECORE_GRAPHQL_ENDPOINT || 'https://xmcloudcm.localhost/sitecore/api/authoring/graphql/v1';

    try {
        // Step 1: Resolve the site root path automatically
        const siteInfo = await fetchSiteInfo(accessToken, siteName, endpoint);
        const homePath = siteInfo?.homePath || `/sitecore/content/Ellinor-Commerce/${siteName}/Home`;
        const homeItem = await fetchItemByPath(accessToken, endpoint, homePath, language);
        const rootItemId = stripSitecoreIdBraces(homeItem?.id || '');

        console.log(`[ContentHealth] Site: ${siteName} | Home: ${homePath}`);

        if (!rootItemId) {
            console.warn(`[ContentHealth] Could not resolve Sitecore home item: ${homePath}`);
            return getDemoPageData();
        }

        // Step 2: Fetch all pages under the home node
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: buildHeaders(accessToken),
            body: JSON.stringify({
                query: GET_PAGES_BY_PATH_QUERY,
                variables: { rootItemId, language },
            }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        if (data.errors) {
            console.error('[ContentHealth] GraphQL errors:', data.errors);
            return getDemoPageData();
        }

        const results = (data?.data?.item?.children?.results || []).filter((item: any) => item);
        console.log(`[ContentHealth] Found ${results.length} pages`);

        if (results.length === 0) return getDemoPageData();

        // Step 3: Map Sitecore items -> PageHealthData using flexible field mapping
        return results.map((item: any) => mapItemToPageHealth(item));
    } catch (err) {
        console.warn('[ContentHealth] Falling back to demo data:', err);
        return getDemoPageData();
    }
}

// ─── Field Mapping ────────────────────────────────────────────────────────────

function mapItemToPageHealth(item: any): PageHealthData {
    const fields = extractFields(item.fields?.nodes || item.fields || []);
    const pageName = item.displayName?.value || item.name;

    return {
        pageId: item.itemId || item.id,
        pageName,
        pageUrl: item.url?.path || sitecorePathToUrl(item.path, pageName),
        metaTitle: resolveField(fields, FIELD_MAP.metaTitle),
        metaDescription: resolveField(fields, FIELD_MAP.metaDescription),
        h1: resolveField(fields, FIELD_MAP.heading),
        images: extractImages(fields),
        wordCount: countWords(fields),
        lastModified: item.updated?.value || item.created?.value || item.updated || item.created || null,
        hasCanonical: !!resolveField(fields, FIELD_MAP.canonical),
        internalLinks: countInternalLinks(fields),
    };
}

function hasPresentation(item: any): boolean {
    return !!(item.renderings?.value || item.finalRenderings?.value);
}

function joinSitecorePath(rootPath: string, startPath: string): string {
    const root = rootPath.replace(/\/+$/, '');
    const start = startPath.replace(/^\/+/, '');
    return `${root}/${start}`;
}

function stripSitecoreIdBraces(id: string): string {
    return id.replace(/[{}-]/g, '').toLowerCase();
}

function sitecorePathToUrl(path: string | undefined, name: string): string {
    if (!path) return `/${name.toLowerCase().replace(/\s+/g, '-')}`;
    const homeIndex = path.toLowerCase().indexOf('/home');
    const urlPath = homeIndex >= 0 ? path.slice(homeIndex + '/home'.length) : '';
    return urlPath || '/';
}

/**
 * Try each field name candidate in order.
 * Returns the first non-empty, non-blank-XML value found.
 */
function resolveField(fields: Record<string, string>, candidates: string[]): string | null {
    for (const name of candidates) {
        const value = fields[name];
        if (value && value.trim() !== '' && !isEmptyImageXml(value)) {
            return value.trim();
        }
    }
    return null;
}

/**
 * Flatten GraphQL fields array into a simple { name: value } map.
 */
function extractFields(fieldArray: { name: string; value: string }[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const f of fieldArray) {
        if (f.name && f.value !== undefined && f.value !== null) {
            result[f.name] = f.value;
        }
    }
    return result;
}

/**
 * Extract image fields from a page item.
 * Sitecore stores images as XML like:
 *   <image mediaid="{GUID}" src="/-/media/image.jpg" alt="description" />
 */
function extractImages(fields: Record<string, string>): { src: string; alt: string | null; title: string | null }[] {
    const images: { src: string; alt: string | null; title: string | null }[] = [];

    for (const value of Object.values(fields)) {
        if (!value || !value.includes('<image') || !value.includes('mediaid')) continue;

        const src = value.match(/src="([^"]+)"/)?.[1];
        const alt = value.match(/alt="([^"]*)"/)?.[1] ?? null;
        const title = value.match(/title="([^"]*)"/)?.[1] ?? null;

        if (src) {
            images.push({ src, alt: alt || null, title: title || null });
        }
    }

    return images;
}

/**
 * Count words across all body/rich text fields.
 * Strips HTML before counting.
 */
function countWords(fields: Record<string, string>): number {
    let total = 0;
    for (const fieldName of FIELD_MAP.bodyContent) {
        const value = fields[fieldName];
        if (value) {
            const text = value
                .replace(/<[^>]+>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            if (text) total += text.split(' ').filter(Boolean).length;
        }
    }
    return total;
}

/**
 * Count internal links by scanning all field values for href="/..." patterns.
 */
function countInternalLinks(fields: Record<string, string>): number {
    let count = 0;
    for (const value of Object.values(fields)) {
        if (!value) continue;
        const matches = value.match(/href="\/(?!\/)[^"]*"/g);
        if (matches) count += matches.length;
    }
    return count;
}

/** Sitecore returns empty image fields as <image /> — treat as no value */
function isEmptyImageXml(value: string): boolean {
    const v = value.trim();
    return v === '<image />' || v === '<image mediaid="" />';
}

// ─── HTTP Headers ─────────────────────────────────────────────────────────────

function buildHeaders(apiKey: string): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        sc_apikey: apiKey,
    };
}

function isJwt(value: string): boolean {
    return value.split('.').length === 3;
}

// ─── Multisite Helper ─────────────────────────────────────────────────────────

/**
 * Fetch pages for MULTIPLE sites at once.
 * Returns a map of { siteName -> PageHealthData[] }
 *
 * Usage:
 *   const allSites = await fetchAllSites(token, ["site-a", "site-b"]);
 *   const siteAPages = allSites["site-a"];
 */
export async function fetchAllSites(accessToken: string, siteNames: string[], language: string = 'en'): Promise<Record<string, PageHealthData[]>> {
    const results: Record<string, PageHealthData[]> = {};
    await Promise.all(
        siteNames.map(async (siteName) => {
            results[siteName] = await fetchPagesFromXMCloud(accessToken, siteName, language);
        }),
    );
    return results;
}

// ─── Demo / Preview Data ──────────────────────────────────────────────────────

export function getDemoPageData(): PageHealthData[] {
    return [
        {
            pageId: 'demo-001',
            pageName: 'Home',
            pageUrl: '/',
            metaTitle: 'Welcome to Our Website | Company Name',
            metaDescription: 'Discover our products and services that help you achieve your goals.',
            h1: 'Welcome to Our Company',
            images: [
                { src: '/-/media/hero.jpg', alt: 'Hero banner', title: null },
                { src: '/-/media/team.jpg', alt: 'Our team', title: 'Team Photo' },
            ],
            wordCount: 450,
            lastModified: '2025-04-20T10:30:00Z',
            hasCanonical: true,
            internalLinks: 8,
        },
        {
            pageId: 'demo-002',
            pageName: 'About Us',
            pageUrl: '/about',
            metaTitle: 'About',
            metaDescription: null,
            h1: 'About Our Company',
            images: [
                { src: '/-/media/office.jpg', alt: null, title: null },
                { src: '/-/media/ceo.jpg', alt: null, title: null },
                { src: '/-/media/mission.jpg', alt: 'Our mission', title: null },
            ],
            wordCount: 280,
            lastModified: '2025-03-15T08:00:00Z',
            hasCanonical: false,
            internalLinks: 2,
        },
        {
            pageId: 'demo-003',
            pageName: 'Services',
            pageUrl: '/services',
            metaTitle: 'Our Services – Full Range of Digital Solutions | Company Name',
            metaDescription: 'Explore our comprehensive range of digital services including web development, SEO, and content strategy.',
            h1: 'Our Services',
            images: [
                { src: '/-/media/service1.jpg', alt: 'Web Development', title: 'Web Dev' },
                { src: '/-/media/service2.jpg', alt: 'SEO Services', title: 'SEO' },
                { src: '/-/media/service3.jpg', alt: 'Content Strategy', title: 'Content' },
            ],
            wordCount: 620,
            lastModified: '2025-04-28T14:00:00Z',
            hasCanonical: true,
            internalLinks: 12,
        },
        {
            pageId: 'demo-004',
            pageName: 'Contact',
            pageUrl: '/contact',
            metaTitle: null,
            metaDescription: null,
            h1: null,
            images: [],
            wordCount: 75,
            lastModified: '2025-02-01T12:00:00Z',
            hasCanonical: false,
            internalLinks: 1,
        },
        {
            pageId: 'demo-005',
            pageName: 'Blog',
            pageUrl: '/blog',
            metaTitle: 'Blog – Industry Insights & News',
            metaDescription: 'Read our latest articles on digital marketing, web development, and industry trends. Updated weekly.',
            h1: 'Our Blog',
            images: [
                { src: '/-/media/blog1.jpg', alt: 'Blog post thumbnail', title: null },
                { src: '/-/media/blog2.jpg', alt: null, title: null },
            ],
            wordCount: 180,
            lastModified: '2025-04-30T09:00:00Z',
            hasCanonical: true,
            internalLinks: 6,
        },
        {
            pageId: 'demo-006',
            pageName: 'Case Studies',
            pageUrl: '/case-studies',
            metaTitle: 'Case Studies',
            metaDescription: 'See how we have helped businesses achieve remarkable results.',
            h1: 'Our Success Stories',
            images: [
                { src: '/-/media/case1.jpg', alt: 'Client A success story', title: null },
                { src: '/-/media/case2.jpg', alt: null, title: null },
                { src: '/-/media/case3.jpg', alt: null, title: null },
                { src: '/-/media/case4.jpg', alt: 'ROI chart', title: null },
            ],
            wordCount: 390,
            lastModified: '2025-04-10T16:00:00Z',
            hasCanonical: true,
            internalLinks: 4,
        },
    ];
}
