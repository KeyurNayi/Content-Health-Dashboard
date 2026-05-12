"use client";

import { useEffect, useState } from "react";
import { ScoreRing } from "@/components/ScoreRing";
import { StatusIcon } from "@/components/StatusIcon";
import { scorePage, PageHealthResult } from "@/lib/healthScorer";
import { getDemoPageData } from "@/lib/sitecoreApi";

/**
 * Pages Context Panel
 *
 * Auto-detects the current page being edited via:
 * 1. URL param ?pageUrl=/logg-inn/min-side/ordrehistorikk  (Sitecore passes this)
 * 2. postMessage from Sitecore Page Builder SDK
 * 3. Falls back to page selector list if no context available
 *
 * When a pageUrl is detected → calls /api/pages?pageUrl=... for that specific page
 * This means child pages like ordrehistorikk are fully supported.
 */
export default function PagesContextPanel() {
  const [result, setResult]           = useState<PageHealthResult | null>(null);
  const [allPages, setAllPages]       = useState<PageHealthResult[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState<string | null>(null);
  const [dataSource, setDataSource]   = useState<"demo" | "sitecore">("demo");
  const [currentPageUrl, setCurrentPageUrl] = useState<string | null>(null);
  const [showSelector, setShowSelector]     = useState(false);
  const [pageNotFound, setPageNotFound]     = useState(false);

  const loadPage = async (pageUrl: string | null) => {
    setLoading(true);
    setPageNotFound(false);

    try {
      if (pageUrl) {
        // ── Fetch the specific current page ─────────────────────────────────
        console.log("[ContentHealth Panel] Fetching page:", pageUrl);
        const res  = await fetch(`/api/pages?pageUrl=${encodeURIComponent(pageUrl)}`);
        const data = await res.json();
        setDataSource(data.source === "sitecore" ? "sitecore" : "demo");

        if (data.isSingle && data.pages?.length > 0) {
          // Got exact page data
          setResult(scorePage(data.pages[0]));
          setShowSelector(false);
        } else if (data.pages?.length > 0) {
          // Single page not found — try to match from full list
          const scored = data.pages.map(scorePage);
          setAllPages(scored);
          const normalize = (s: string) => s.toLowerCase().replace(/\/$/, "");
          const match = scored.find(
            (p: PageHealthResult) =>
              normalize(p.pageUrl) === normalize(pageUrl) ||
              normalize(p.pageUrl).endsWith(normalize(pageUrl)) ||
              normalize(pageUrl).endsWith(normalize(p.pageUrl))
          );
          if (match) {
            setResult(match);
            setShowSelector(false);
          } else {
            setPageNotFound(true);
            setShowSelector(true);
          }
        }
      } else {
        // ── No page context — fetch all pages and show selector ──────────────
        const res  = await fetch("/api/pages");
        const data = await res.json();
        setDataSource(data.source === "sitecore" ? "sitecore" : "demo");
        const scored = (data.pages || getDemoPageData()).map(scorePage);
        setAllPages(scored);
        setShowSelector(true);
      }
    } catch (err) {
      console.error("[ContentHealth Panel] Error:", err);
      const scored = getDemoPageData().map(scorePage);
      setAllPages(scored);
      setShowSelector(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ── Detect current page from URL params ──────────────────────────────────
    const params   = new URLSearchParams(window.location.search);
    const detected = params.get("pageUrl") ||
                     params.get("routePath") ||
                     params.get("itemPath") ||
                     params.get("sc_pageUrl") ||
                     null;

    if (detected) {
      console.log("[ContentHealth Panel] Page from URL param:", detected);
      setCurrentPageUrl(detected);
      loadPage(detected);
    } else {
      loadPage(null);
    }

    // ── Listen for postMessage from Sitecore Page Builder ────────────────────
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes("sitecorecloud.io") &&
          !event.origin.includes("sitecore.com") &&
          !event.origin.includes("localhost")) return;

      const msg     = event.data;
      if (!msg) return;

      const pageUrl = msg?.pageUrl      || msg?.routePath    || msg?.itemPath ||
                      msg?.data?.pageUrl || msg?.data?.routePath || null;

      if (pageUrl && pageUrl !== currentPageUrl) {
        console.log("[ContentHealth Panel] Page from postMessage:", pageUrl);
        setCurrentPageUrl(pageUrl);
        loadPage(pageUrl);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (loading) return <ContextPanelSkeleton />;

  // ── Page Selector — shown when no auto-detection worked ───────────────────
  if (showSelector) {
    return (
      <div style={{ fontFamily: "var(--font-display)", background: "white", height: "100%", overflowY: "auto" }}>
        <PanelHeader dataSource={dataSource} pageUrl={currentPageUrl} />

        {pageNotFound && currentPageUrl && (
          <div style={{ margin: "12px 16px 0", padding: "10px 12px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8, fontSize: 12, color: "#92400E" }}>
            Page <code style={{ background: "#FEF3C7", padding: "1px 4px", borderRadius: 3 }}>{currentPageUrl}</code> not found in scanned pages. Select manually:
          </div>
        )}

        <div style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
            Select a page to check
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {allPages.map((page) => (
              <button
                key={page.pageId}
                onClick={() => { setResult(page); setShowSelector(false); }}
                style={{ background: "#FAFAFA", border: "1px solid #F3F4F6", borderRadius: 8, padding: "10px 12px", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-display)", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", transition: "background 0.15s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#F0F9FF")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#FAFAFA")}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.pageName}</div>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.pageUrl}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                  <ScoreRing score={page.overallScore} size={32} strokeWidth={3} showLabel={false} />
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, color: "white", background: page.overallScore >= 90 ? "#22C55E" : page.overallScore >= 75 ? "#84CC16" : page.overallScore >= 60 ? "#F59E0B" : page.overallScore >= 40 ? "#F97316" : "#EF4444" }}>
                    {page.grade}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const failCount = result.checks.filter((c) => c.status === "fail").length;
  const warnCount = result.checks.filter((c) => c.status === "warn").length;
  const passCount = result.checks.filter((c) => c.status === "pass").length;

  return (
    <div style={{ fontFamily: "var(--font-display)", background: "white", height: "100%", overflowY: "auto" }}>
      <PanelHeader dataSource={dataSource} pageUrl={result.pageUrl} onShowAll={() => setShowSelector(true)} />

      {/* Score Summary */}
      <div style={{ padding: "16px", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ScoreRing score={result.overallScore} size={72} strokeWidth={7} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {result.overallScore >= 90 ? "Excellent" : result.overallScore >= 75 ? "Good" : result.overallScore >= 60 ? "Needs Work" : result.overallScore >= 40 ? "Poor" : "Critical"}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginTop: 2 }}>{result.pageName}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "monospace" }}>{result.pageUrl}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <MiniStat icon="🔴" value={failCount} label="Issues" />
              <MiniStat icon="🟡" value={warnCount} label="Warnings" />
              <MiniStat icon="🟢" value={passCount} label="Passed" />
            </div>
          </div>
        </div>
      </div>

      {/* Checks */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Checks</div>
        {[...result.checks]
          .sort((a, b) => { const o: Record<string, number> = { fail: 0, warn: 1, pass: 2 }; return o[a.status] - o[b.status]; })
          .map((check) => (
            <div key={check.id} style={{ marginBottom: 8 }}>
              <button
                onClick={() => setExpanded(expanded === check.id ? null : check.id)}
                style={{ width: "100%", background: check.status === "fail" ? "#FFF5F5" : check.status === "warn" ? "#FFFBEB" : "#F0FDF4", border: `1px solid ${check.status === "fail" ? "#FEE2E2" : check.status === "warn" ? "#FEF3C7" : "#DCFCE7"}`, borderRadius: 8, padding: "10px 12px", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-display)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <StatusIcon status={check.status} size={16} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{check.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: check.status === "fail" ? "#DC2626" : check.status === "warn" ? "#D97706" : "#16A34A" }}>{check.score}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ transition: "transform 0.2s", transform: expanded === check.id ? "rotate(180deg)" : "none", color: "#9CA3AF" }}>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>
              {expanded === check.id && (
                <div style={{ background: "#FAFAFA", border: "1px solid #F3F4F6", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "10px 12px", fontSize: 12, color: "#6B7280", lineHeight: 1.6 }}>
                  {check.message}
                </div>
              )}
            </div>
          ))}
      </div>

      {failCount > 0 && (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ background: "linear-gradient(135deg, #EB1F1F 0%, #C41717 100%)", borderRadius: 8, padding: "12px 14px", color: "white" }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>⚡ {failCount} critical issue{failCount !== 1 ? "s" : ""} found</div>
            <div style={{ fontSize: 11, color: "#FECACA", marginTop: 2, lineHeight: 1.5 }}>Fix these to improve search ranking and accessibility.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelHeader({ dataSource, pageUrl, onShowAll }: { dataSource: "demo" | "sitecore"; pageUrl: string | null; onShowAll?: () => void }) {
  return (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid #F3F4F6", background: "#0D0D0D" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ color: "white", fontWeight: 700, fontSize: 13 }}>Content Health</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: dataSource === "sitecore" ? "#14532D" : "#1E3A5F", color: dataSource === "sitecore" ? "#86EFAC" : "#93C5FD" }}>
            {dataSource === "sitecore" ? "LIVE" : "DEMO"}
          </span>
        </div>
        {onShowAll && (
          <button onClick={onShowAll} style={{ background: "none", border: "1px solid #374151", borderRadius: 5, padding: "3px 8px", fontSize: 10, color: "#9CA3AF", cursor: "pointer", fontFamily: "var(--font-display)" }}>
            All pages
          </button>
        )}
      </div>
      {pageUrl && (
        <div style={{ color: "#6B7280", fontSize: 10, marginTop: 3, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {pageUrl}
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      <span style={{ fontSize: 10 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 700 }}>{value}</span>
      <span style={{ fontSize: 10, color: "#9CA3AF" }}>{label}</span>
    </div>
  );
}

function ContextPanelSkeleton() {
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="skeleton" style={{ height: 40 }} />
      <div className="skeleton" style={{ height: 80 }} />
      {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" style={{ height: 40 }} />)}
    </div>
  );
}
