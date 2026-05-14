'use client';

import { useEffect, useMemo, useState } from 'react';
import { ScoreRing } from '@/components/ScoreRing';
import { StatusIcon } from '@/components/StatusIcon';
import { scorePage, buildSiteSummary, PageHealthResult, SiteHealthSummary } from '@/lib/healthScorer';
import { getDemoPageData } from '@/lib/sitecoreApi';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export default function StandalonePage() {
    const [summary, setSummary] = useState<SiteHealthSummary | null>(null);
    const [selected, setSelected] = useState<PageHealthResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [dataSource, setDataSource] = useState<'demo' | 'sitecore' | 'error'>('demo');
    const [siteName, setSiteName] = useState('');
    const [sortBy, setSortBy] = useState<'score-desc' | 'score-asc' | 'name-asc' | 'name-desc' | 'date-desc' | 'date-asc'>('score-desc');
    const [gradeFilter, setGradeFilter] = useState<'ALL' | 'A' | 'B' | 'C' | 'D' | 'F'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 20;

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/pages');
            const data = await res.json();
            console.log(`[ContentHealth] Source: ${data.source} | Pages: ${data.pages?.length}`);
            setDataSource(data.source === 'sitecore' ? 'sitecore' : data.source === 'error' ? 'error' : 'demo');
            setSiteName(data.siteName || '');
            const results = (data.pages || getDemoPageData()).map(scorePage);
            setSummary(buildSiteSummary(results));
        } catch (err) {
            console.error('[ContentHealth] Failed:', err);
            setDataSource('error');
            setSummary(buildSiteSummary(getDemoPageData().map(scorePage)));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Close modal on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && selected) {
                setSelected(null);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [selected]);
    const radarData = selected
        ? selected.checks.map((c) => ({
              subject: c.label.length > 12 ? c.label.substring(0, 12) : c.label,
              score: typeof c.score === 'number' ? c.score : 0,
              fullMark: 100,
          }))
        : [];
    const displayedPages = useMemo(() => {
        if (!summary) return [];

        let pages = [...summary.pages];

        // Grade Filter
        if (gradeFilter !== 'ALL') {
            pages = pages.filter((page) => page.grade === gradeFilter);
        }

        // Search Filter
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            pages = pages.filter(
                (page) =>
                    page.pageName.toLowerCase().includes(q) ||
                    page.pageUrl.toLowerCase().includes(q)
            );
        }

        // Sorting
        switch (sortBy) {
            case 'score-desc':
                pages.sort((a, b) => b.overallScore - a.overallScore);
                break;

            case 'score-asc':
                pages.sort((a, b) => a.overallScore - b.overallScore);
                break;

            case 'name-asc':
                pages.sort((a, b) => a.pageName.localeCompare(b.pageName));
                break;

            case 'name-desc':
                pages.sort((a, b) => b.pageName.localeCompare(a.pageName));
                break;

            case 'date-desc':
                pages.sort((a, b) => {
                    const getDateValue = (page: any) => {
                        const rawDate = page.lastModified;

                        if (!rawDate) return 0;

                        // Handle Sitecore format: 20260430T050610Z
                        const match = rawDate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);

                        if (match) {
                            const [, year, month, day, hour, minute, second] = match;

                            return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
                        }

                        // Fallback for ISO or standard date strings
                        const parsed = new Date(rawDate).getTime();
                        return isNaN(parsed) ? 0 : parsed;
                    };

                    return getDateValue(b) - getDateValue(a);
                });
                break;

            case 'date-asc':
                pages.sort((a, b) => {
                    const getDateValue = (page: any) => {
                        const rawDate = page.lastModified;

                        if (!rawDate) return 0;

                        // Handle Sitecore format: 20260430T050610Z
                        const match = rawDate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);

                        if (match) {
                            const [, year, month, day, hour, minute, second] = match;

                            return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
                        }

                        // Fallback for ISO or standard date strings
                        const parsed = new Date(rawDate).getTime();
                        return isNaN(parsed) ? 0 : parsed;
                    };

                    return getDateValue(a) - getDateValue(b);
                });
                break;
        }

        return pages;
    }, [summary, sortBy, gradeFilter, searchQuery]);

    // Reset to page 1 whenever search query or filters change
    useEffect(() => { setCurrentPage(1); }, [searchQuery, gradeFilter, sortBy]);

    if (loading) return <FullscreenSkeleton />;
    if (!summary) return null;

    const gradeColors: Record<string, string> = {
        A: '#22C55E',
        B: '#84CC16',
        C: '#F59E0B',
        D: '#F97316',
        F: '#EF4444',
    };
    const headerStyle: React.CSSProperties = {
        padding: '10px 16px',
        textAlign: 'left',
        fontSize: 12,
        fontWeight: 800,
        color: '#1a1a1a',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        borderBottom: '1px solid #F3F4F6',
        whiteSpace: 'nowrap',
        userSelect: 'none',
    };

    const chartPages = [...summary.pages].sort((a, b) => b.overallScore - a.overallScore).slice(0, 15);

    const barData = chartPages.map((p) => ({
        name: p.pageName.length > 10 ? p.pageName.substring(0, 10) + '…' : p.pageName,
        fullName: p.pageName,
        score: p.overallScore,
        grade: p.grade,
        fill: gradeColors[p.grade],
    }));

    return (
        <div style={{ fontFamily: 'var(--font-display)', background: '#F8F9FB', minHeight: '100vh', color: 'var(--sc-dark)' }}>
            {/* Top nav */}
            <nav
                style={{
                    background: 'var(--sc-dark)',
                    padding: '0 32px',
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                        style={{
                            width: 30,
                            height: 30,
                            background: 'var(--sc-red)',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <div>
                        <div style={{ color: 'white', fontWeight: 700, fontSize: 15, lineHeight: 1 }}>SiteElevate</div>
                        <div style={{ color: '#6B7280', fontSize: 10 }}>Sitecore AI Marketplace App</div>
                    </div>

                    {/* Live / Demo badge */}
                    <span
                        style={{
                            background: dataSource === 'sitecore' ? '#14532D' : dataSource === 'error' ? '#7F1D1D' : '#1E3A5F',
                            color: dataSource === 'sitecore' ? '#86EFAC' : dataSource === 'error' ? '#FCA5A5' : '#93C5FD',
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 4,
                            letterSpacing: '0.05em',
                        }}
                    >
                        {dataSource === 'sitecore' ? `🟢 LIVE — ${siteName}` : dataSource === 'error' ? '🔴 ERROR — DEMO' : '🔵 DEMO DATA'}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <NavStat label="Avg Score" value={`${summary.averageScore}`} color="#60A5FA" />
                        <NavStat label="Pages" value={`${summary.totalPages}`} color="#A3E635" />
                        <NavStat label="Critical" value={`${summary.criticalIssues}`} color="#F87171" />
                    </div>
                    <button
                        onClick={loadData}
                        style={{
                            background: 'var(--sc-red)',
                            color: 'white',
                            border: 'none',
                            padding: '7px 16px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'var(--font-display)',
                        }}
                    >
                        ↻ Rescan
                    </button>
                </div>
            </nav>

            <div style={{ padding: '28px 32px', maxWidth: 1600, margin: '0 auto' }}>
                {/* Config warning banner — shown when still on demo data */}
                {dataSource !== 'sitecore' && (
                    <div
                        style={{
                            background: '#FFF7ED',
                            border: '1px solid #FED7AA',
                            borderRadius: 10,
                            padding: '14px 20px',
                            marginBottom: 20,
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-start',
                        }}
                    >
                        <span style={{ fontSize: 20 }}>⚙️</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E' }}>
                                {dataSource === 'error' ? 'Connection Error — Showing Demo Data' : 'Showing Demo Data — Not Connected to Sitecore'}
                            </div>
                            <div style={{ fontSize: 12, color: '#B45309', marginTop: 4, lineHeight: 1.6 }}>
                                To see your real Sitecore pages, add these to your{' '}
                                <code style={{ background: '#FEF3C7', padding: '1px 4px', borderRadius: 3 }}>.env.local</code> file and restart the server:
                                <br />
                                <code style={{ background: '#FEF3C7', padding: '2px 6px', borderRadius: 3, display: 'inline-block', marginTop: 6 }}>
                                    NEXT_PUBLIC_SITECORE_GRAPHQL_ENDPOINT=https://xmcloudcm-xxx.sitecorecloud.io/sitecore/api/authoring/graphql/v1
                                </code>
                                <br />
                                <code style={{ background: '#FEF3C7', padding: '2px 6px', borderRadius: 3, display: 'inline-block', marginTop: 4 }}>
                                    MARKETPLACE_ACCESS_TOKEN=your-token-here &nbsp; NEXT_PUBLIC_SITE_NAME=your-site-name
                                </code>
                            </div>
                        </div>
                    </div>
                )}

                {/* KPI Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                    {[
                        { label: 'Site Health Score', value: `${summary.averageScore}/100`, sub: 'Overall average', color: 'var(--sc-red)' },
                        { label: 'Critical Issues', value: `${summary.criticalIssues}`, sub: 'Need immediate fix', color: '#EF4444' },
                        { label: 'Warnings', value: `${summary.warnings}`, sub: 'Should be addressed', color: '#F59E0B' },
                        { label: 'Healthy Checks', value: `${summary.passedChecks}`, sub: 'Passing checks', color: '#22C55E' },
                    ].map((kpi, i) => (
                        <div
                            key={i}
                            className="card-animate"
                            style={{
                                background: 'white',
                                borderRadius: 12,
                                padding: '20px',
                                border: '1px solid #F3F4F6',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: '#9CA3AF',
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    marginBottom: 6,
                                }}
                            >
                                {kpi.label}
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{kpi.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Charts Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 24 }}>
                    <div style={{ background: 'white', borderRadius: 12, padding: '20px', border: '1px solid #F3F4F6' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: '#374151' }}>Highest Scoring Pages (Top 15)</div>
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={barData} barSize={28}>
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<PageScoreTooltip />} cursor={{ fill: '#F3F4F6' }} wrapperStyle={{ outline: 'none' }} />
                                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                    {barData.map((entry, index) => (
                                        <Cell key={index} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                {/* Grade Legend */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 16,
                        flexWrap: 'wrap',
                    }}
                >
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#6B7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                    >
                        Grade Scale:
                    </span>

                    {[
                        { grade: 'A', range: '90–100', color: '#22C55E' },
                        { grade: 'B', range: '80–89', color: '#84CC16' },
                        { grade: 'C', range: '70–79', color: '#F59E0B' },
                        { grade: 'D', range: '60–69', color: '#F97316' },
                        { grade: 'F', range: '0–59', color: '#EF4444' },
                    ].map((item) => (
                        <div
                            key={item.grade}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                background: 'white',
                                border: '1px solid #E5E7EB',
                                borderRadius: 999,
                                padding: '4px 10px',
                            }}
                        >
                            <span
                                style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    background: item.color,
                                    color: 'white',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {item.grade}
                            </span>
                            <span style={{ fontSize: 11, color: '#6B7280' }}>{item.range}</span>
                        </div>
                    ))}
                </div>

                {/* Pages Table */}
                <div style={{ background: 'white', borderRadius: 12, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>All Pages</span>
                            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                                Showing {Math.min(currentPage * PAGE_SIZE, displayedPages.length)} of {displayedPages.length} pages
                                {searchQuery && ` (filtered from ${summary.totalPages})`}
                            </span>
                        </div>
                        {/* Search Box */}
                        <div style={{ position: 'relative' }}>
                            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <input
                                type="text"
                                placeholder="Search pages by name or URL..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px 8px 32px',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontFamily: 'var(--font-display)',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    color: '#374151',
                                }}
                                onFocus={(e) => (e.currentTarget.style.borderColor = '#EB1F1F')}
                                onBlur={(e) => (e.currentTarget.style.borderColor = '#E5E7EB')}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 16, lineHeight: 1 }}
                                >×</button>
                            )}
                        </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#FAFAFA' }}>
                                {/* Page Column */}
                                <th style={headerStyle} onClick={() => setSortBy(sortBy === 'name-asc' ? 'name-desc' : 'name-asc')}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                        Page
                                        <span style={{ fontSize: 10 }}>{sortBy === 'name-asc' ? '▲' : sortBy === 'name-desc' ? '▼' : '↕'}</span>
                                    </div>
                                </th>

                                {/* Score Column */}
                                <th style={headerStyle} onClick={() => setSortBy(sortBy === 'score-desc' ? 'score-asc' : 'score-desc')}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                        Score
                                        <span style={{ fontSize: 10 }}>{sortBy === 'score-desc' ? '▼' : sortBy === 'score-asc' ? '▲' : '↕'}</span>
                                    </div>
                                </th>

                                {/* Grade Filter */}
                                <th style={headerStyle}>
                                    <select
                                        value={gradeFilter}
                                        onChange={(e) => setGradeFilter(e.target.value as 'ALL' | 'A' | 'B' | 'C' | 'D' | 'F')}
                                        style={{
                                            border: '1px solid #D1D5DB',
                                            borderRadius: 6,
                                            padding: '4px 8px',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            background: 'white',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <option value="ALL">Grade</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="C">C</option>
                                        <option value="D">D</option>
                                        <option value="F">F</option>
                                    </select>
                                </th>

                                {/* Static Columns */}
                                {['Meta Title', 'Meta Desc', 'Images Alt', 'H1', 'Words'].map((h) => (
                                    <th key={h} style={headerStyle}>
                                        {h}
                                    </th>
                                ))}

                                {/* Last Modified Column */}
                                <th style={headerStyle} onClick={() => setSortBy(sortBy === 'date-desc' ? 'date-asc' : 'date-desc')}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                        Last Modified
                                        <span style={{ fontSize: 10 }}>{sortBy === 'date-desc' ? '▼' : sortBy === 'date-asc' ? '▲' : '↕'}</span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedPages.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((page) => {
                                const getCheck = (id: string) => page.checks.find((c) => c.id === id);
                                return (
                                    <tr
                                        key={page.pageId}
                                        onClick={() => setSelected(page)}
                                        style={{
                                            borderBottom: '1px solid #F9FAFB',
                                            cursor: 'pointer',
                                            background: 'white',
                                            transition: 'background 0.1s',
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLElement).style.background = '#FAFAFA';
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLElement).style.background = 'white';
                                        }}
                                    >
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{page.pageName}</div>
                                            <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'var(--font-mono)' }}>{page.pageUrl}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <ScoreRing score={page.overallScore} size={38} strokeWidth={4} />
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span className={`grade-badge grade-${page.grade}`}>{page.grade}</span>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <StatusIcon status={getCheck('meta-title')?.status || 'fail'} size={18} />
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <StatusIcon status={getCheck('meta-description')?.status || 'fail'} size={18} />
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <StatusIcon status={getCheck('image-alt')?.status || 'fail'} size={18} />
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <StatusIcon status={getCheck('h1-tag')?.status || 'fail'} size={18} />
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <StatusIcon status={getCheck('word-count')?.status || 'fail'} size={18} />
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                                            {(() => {
                                                // 1. Prefer the normalized `updated.value` from GraphQL
                                                // 2. Fall back to `lastModified` if available
                                                // 3. Fall back to the __Updated field from the fields array
                                                const rawDate =
                                                    page.lastModified;

                                                if (!rawDate) return '—';

                                                let date: Date;

                                                // Sitecore date format: 20260430T050610Z
                                                const sitecoreMatch = rawDate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);

                                                if (sitecoreMatch) {
                                                    const [, year, month, day, hour, minute, second] = sitecoreMatch;

                                                    // Month in JavaScript Date is zero-based
                                                    date = new Date(
                                                        Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)),
                                                    );
                                                } else {
                                                    // Fallback for ISO dates or other standard formats
                                                    date = new Date(rawDate);
                                                }

                                                // Validate parsed date
                                                if (isNaN(date.getTime())) return '—';

                                                return date.toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                });
                                            })()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Pagination Controls */}
                    {displayedPages.length > PAGE_SIZE && (
                        <div style={{ padding: '14px 20px', borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAFA' }}>
                            <span style={{ fontSize: 12, color: '#6B7280' }}>
                                Page {currentPage} of {Math.ceil(displayedPages.length / PAGE_SIZE)}
                                &nbsp;·&nbsp;
                                {displayedPages.length} total results
                            </span>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                {/* First */}
                                <PaginationBtn onClick={() => setCurrentPage(1)} disabled={currentPage === 1} label="«" />
                                {/* Prev */}
                                <PaginationBtn onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} label="‹ Prev" />

                                {/* Page numbers */}
                                {Array.from({ length: Math.ceil(displayedPages.length / PAGE_SIZE) }, (_, i) => i + 1)
                                    .filter(n => n === 1 || n === Math.ceil(displayedPages.length / PAGE_SIZE) || Math.abs(n - currentPage) <= 2)
                                    .reduce((acc: (number | string)[], n, i, arr) => {
                                        if (i > 0 && n - (arr[i-1] as number) > 1) acc.push('...');
                                        acc.push(n);
                                        return acc;
                                    }, [])
                                    .map((n, i) => n === '...'
                                        ? <span key={`e${i}`} style={{ padding: '0 4px', color: '#9CA3AF', fontSize: 12 }}>…</span>
                                        : <button key={n} onClick={() => setCurrentPage(n as number)}
                                            style={{ minWidth: 32, height: 32, border: `1px solid ${currentPage === n ? '#EB1F1F' : '#E5E7EB'}`, borderRadius: 6, background: currentPage === n ? '#EB1F1F' : 'white', color: currentPage === n ? 'white' : '#374151', fontSize: 12, fontWeight: currentPage === n ? 700 : 400, cursor: 'pointer', fontFamily: 'var(--font-display)' }}>
                                            {n}
                                          </button>
                                    )
                                }

                                {/* Next */}
                                <PaginationBtn onClick={() => setCurrentPage(p => Math.min(Math.ceil(displayedPages.length / PAGE_SIZE), p + 1))} disabled={currentPage === Math.ceil(displayedPages.length / PAGE_SIZE)} label="Next ›" />
                                {/* Last */}
                                <PaginationBtn onClick={() => setCurrentPage(Math.ceil(displayedPages.length / PAGE_SIZE))} disabled={currentPage === Math.ceil(displayedPages.length / PAGE_SIZE)} label="»" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal popup for page details */}
            {selected && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={() => setSelected(null)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 1000,
                            animation: 'fadeIn 0.2s ease-out',
                        }}
                    />

                    {/* Modal */}
                    <div
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '90%',
                            maxWidth: 1200,
                            maxHeight: '90vh',
                            background: 'white',
                            borderRadius: 16,
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                            zIndex: 1001,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            animation: 'slideUp 0.3s ease-out',
                        }}
                    >
                        {/* Modal Header */}
                        <div
                            style={{
                                padding: '20px 24px',
                                borderBottom: '1px solid #F3F4F6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#FAFAFA',
                            }}
                        >
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{selected.pageName}</div>
                                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{selected.pageUrl}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Overall Score</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <ScoreRing score={selected.overallScore} size={44} strokeWidth={5} />
                                        <span className={`grade-badge grade-${selected.grade}`} style={{ fontSize: 16, padding: '6px 12px' }}>
                                            {selected.grade}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelected(null)}
                                    style={{
                                        background: 'white',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: 8,
                                        width: 36,
                                        height: 36,
                                        fontSize: 18,
                                        cursor: 'pointer',
                                        fontFamily: 'var(--font-display)',
                                        color: '#6B7280',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Modal Body - Scrollable */}
                        {/* Modal Body - Scrollable */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'minmax(380px, 40%) 1fr',
                                    gap: 24,
                                    alignItems: 'start',
                                }}
                            >
                                {/* Left Column - Radar Chart */}
                                <div
                                    style={{
                                        background: '#FAFAFA',
                                        borderRadius: 12,
                                        padding: '20px',
                                        position: 'sticky',
                                        top: 0,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            marginBottom: 16,
                                            color: '#374151',
                                        }}
                                    >
                                        Performance Radar
                                    </div>

                                    <ResponsiveContainer width="100%" height={420}>
                                        <RadarChart data={radarData}>
                                            <PolarGrid stroke="#E5E7EB" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6B7280' }} />
                                            <Radar name="Score" dataKey="score" stroke="var(--sc-red)" fill="var(--sc-red)" fillOpacity={0.2} strokeWidth={2} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Right Column - Detailed Analysis */}
                                <div>
                                    <div style={{ marginBottom: 16 }}>
                                        <div
                                            style={{
                                                fontSize: 13,
                                                fontWeight: 700,
                                                marginBottom: 12,
                                                color: '#374151',
                                            }}
                                        >
                                            Detailed Analysis
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                                            gap: 12,
                                        }}
                                    >
                                        {selected.checks.map((check) => (
                                            <div
                                                key={check.id}
                                                style={{
                                                    background: check.status === 'fail' ? '#FFF5F5' : check.status === 'warn' ? '#FFFBEB' : '#F0FDF4',
                                                    border: `1px solid ${
                                                        check.status === 'fail' ? '#FEE2E2' : check.status === 'warn' ? '#FEF3C7' : '#DCFCE7'
                                                    }`,
                                                    borderRadius: 8,
                                                    padding: '16px',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        marginBottom: 10,
                                                    }}
                                                >
                                                    <StatusIcon status={check.status} size={20} />
                                                    <span
                                                        style={{
                                                            fontSize: 13,
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        {check.label}
                                                    </span>
                                                    <span
                                                        style={{
                                                            marginLeft: 'auto',
                                                            fontSize: 12,
                                                            fontWeight: 700,
                                                            color: check.status === 'fail' ? '#DC2626' : check.status === 'warn' ? '#D97706' : '#16A34A',
                                                        }}
                                                    >
                                                        {check.score}/100
                                                    </span>
                                                </div>

                                                <p
                                                    style={{
                                                        fontSize: 12,
                                                        color: '#6B7280',
                                                        lineHeight: 1.6,
                                                        margin: 0,
                                                    }}
                                                >
                                                    {check.message}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <style jsx>{`
                        @keyframes fadeIn {
                            from {
                                opacity: 0;
                            }
                            to {
                                opacity: 1;
                            }
                        }
                        @keyframes slideUp {
                            from {
                                opacity: 0;
                                transform: translate(-50%, -45%);
                            }
                            to {
                                opacity: 1;
                                transform: translate(-50%, -50%);
                            }
                        }
                    `}</style>
                </>
            )}
        </div>
    );
}

function NavStat({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 9, color: '#6B7280', letterSpacing: '0.04em' }}>{label}</div>
        </div>
    );
}

function PageScoreTooltip({ active, payload }: any) {
    if (!active || !payload || !payload.length) {
        return null;
    }

    const data = payload[0].payload;

    return (
        <div
            style={{
                background: '#111827',
                color: 'white',
                padding: '12px 14px',
                borderRadius: 8,
                boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
                minWidth: 180,
                border: '1px solid rgba(255,255,255,0.08)',
            }}
        >
            <div
                style={{
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 8,
                    lineHeight: 1.4,
                }}
            >
                {data.fullName}
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    marginBottom: 4,
                }}
            >
                <span style={{ color: '#9CA3AF', fontWeight: 700 }}>Score</span>
                <span style={{ fontWeight: 700 }}>{data.score}/100</span>
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                }}
            >
                <span style={{ color: '#9CA3AF', fontWeight: 700 }}>Grade</span>
                <span
                    style={{
                        fontWeight: 700,
                        color: data.fill,
                    }}
                >
                    {data.grade}
                </span>
            </div>
        </div>
    );
}


// ─── Pagination Button ────────────────────────────────────────────────────────
function PaginationBtn({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: '6px 10px',
                border: '1px solid #E5E7EB',
                borderRadius: 6,
                background: disabled ? '#F9FAFB' : 'white',
                color: disabled ? '#D1D5DB' : '#374151',
                fontSize: 12,
                fontWeight: 500,
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-display)',
            }}
        >
            {label}
        </button>
    );
}

function FullscreenSkeleton() {
    return (
        <div style={{ background: '#F8F9FB', minHeight: '100vh', padding: 32 }}>
            <div className="skeleton" style={{ height: 56, borderRadius: 0, marginBottom: 24 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12 }} />
                ))}
            </div>
            <div className="skeleton" style={{ height: 240, borderRadius: 12, marginBottom: 24 }} />
            <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
        </div>
    );
}
