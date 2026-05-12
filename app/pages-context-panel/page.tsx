"use client";

import { useEffect, useState } from "react";
import { ScoreRing } from "@/components/ScoreRing";
import { StatusIcon } from "@/components/StatusIcon";
import { scorePage, PageHealthResult } from "@/lib/healthScorer";
import { getDemoPageData } from "@/lib/sitecoreApi";

/**
 * Pages Context Panel — shows health for the CURRENT page being edited.
 *
 * HOW CURRENT PAGE IS DETECTED (in order of priority):
 * 1. Marketplace SDK  → client.getPageContext() gives { pageId, pageUrl, routePath }
 * 2. URL param        → ?pageUrl=/alle-produkter passed by Sitecore when opening panel
 * 3. postMessage      → Sitecore sends page context via window.postMessage
 * 4. Fallback         → Shows aggregate site score with page selector
 */
export default function PagesContextPanel() {
  const [result, setResult]           = useState<PageHealthResult | null>(null);
  const [allPages, setAllPages]       = useState<PageHealthResult[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState<string | null>(null);
  const [dataSource, setDataSource]   = useState<"demo" | "sitecore">("demo");
  const [currentPageUrl, setCurrentPageUrl] = useState<string | null>(null);
  const [showSelector, setShowSelector]     = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // ── Step 1: Read page URL from query params ─────────────────────────
        // Sitecore passes ?pageUrl=/path or ?routePath=/path when opening the panel
        const urlParams   = new URLSearchParams(window.location.search);
        const paramPageUrl = urlParams.get("pageUrl") ||
                             urlParams.get("routePath") ||
                             urlParams.get("itemPath") ||
                             null;

        if (paramPageUrl) {
          console.log("[ContentHealth] Page from URL param:", paramPageUrl);
          setCurrentPageUrl(paramPageUrl);
        }

        // ── Step 2: Fetch all pages from API ────────────────────────────────
        const res  = await fetch("/api/pages");
        const data = await res.json();
        setDataSource(data.source === "sitecore" ? "sitecore" : "demo");

        const pages: any[] = data.pages || getDemoPageData();
        const scored       = pages.map(scorePage);
        setAllPages(scored);

        // ── Step 3: Match current page ──────────────────────────────────────
        // Try to find the page that matches the URL param
        let currentPage: PageHealthResult | null = null;

        if (paramPageUrl) {
          // Normalize: remove trailing slash, lowercase
          const normalize = (s: string) => s.toLowerCase().replace(/\/$/, "");
          currentPage = scored.find(
            (p) => normalize(p.pageUrl) === normalize(paramPageUrl)
          ) || null;

          if (!currentPage) {
            // Try partial match — Sitecore path might be /en/alle-produkter but pageUrl is /alle-produkter
            currentPage = scored.find(
              (p) => normalize(p.pageUrl).endsWith(normalize(paramPageUrl)) ||
                     normalize(paramPageUrl).endsWith(normalize(p.pageUrl))
            ) || null;
          }
        }

        // If no URL match, don't auto-select first — show selector instead
        if (currentPage) {
          setResult(currentPage);
          setShowSelector(false);
        } else {
          // No page context available — show selector UI
          setShowSelector(true);
          setResult(null);
        }

      } catch (err) {
        console.error("[ContentHealth] Error:", err);
        const fallback = getDemoPageData();
        setAllPages(fallback.map(scorePage));
        setShowSelector(true);
      } finally {
        setLoading(false);
      }
    };

    load();

    // ── Step 4: Listen for postMessage from Sitecore Page Builder ──────────
    // Sitecore sends page context as a postMessage when the panel opens
    const handleMessage = (event: MessageEvent) => {
      // Accept messages from Sitecore domains only
      if (!event.origin.includes("sitecorecloud.io") &&
          !event.origin.includes("sitecore.com") &&
          !event.origin.includes("localhost")) return;

      const msg = event.data;
      if (!msg) return;

      // Sitecore SDK postMessage format
      const pageUrl = msg?.pageUrl || msg?.routePath || msg?.itemPath ||
                      msg?.data?.pageUrl || msg?.data?.routePath || null;

      if (pageUrl) {
        console.log("[ContentHealth] Page from postMessage:", pageUrl);
        setCurrentPageUrl(pageUrl);
        setAllPages((prev) => {
          const normalize = (s: string) => s.toLowerCase().replace(/\/$/, "");
          const match = prev.find(
            (p) => normalize(p.pageUrl) === normalize(pageUrl) ||
                   normalize(p.pageUrl).endsWith(normalize(pageUrl))
          );
          if (match) {
            setResult(match);
            setShowSelector(false);
          }
          return prev;
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (loading) return <ContextPanelSkeleton />;

  // ── Page Selector UI — shown when page context is unknown ────────────────
  if (showSelector || !result) {
    return (
      <div style={{ fontFamily: "var(--font-display)", background: "white", height: "100%", overflowY: "auto" }}>
        <PanelHeader result={null} dataSource={dataSource} pageUrl={currentPageUrl} />

        <div style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
            Select a page to check
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {allPages.map((page) => (
              <button
                key={page.pageId}
                onClick={() => { setResult(page); setShowSelector(false); }}
                style={{
                  background: "#FAFAFA",
                  border: "1px solid #F3F4F6",
                  borderRadius: 8,
                  padding: "10px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "var(--font-display)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#F0F9FF")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#FAFAFA")}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{page.pageName}</div>
                  <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "monospace" }}>{page.pageUrl}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <ScoreRing score={page.overallScore} size={32} strokeWidth={3} showLabel={false} />
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, color: "white",
                    background: page.overallScore >= 90 ? "#22C55E" : page.overallScore >= 75 ? "#84CC16" : page.overallScore >= 60 ? "#F59E0B" : page.overallScore >= 40 ? "#F97316" : "#EF4444",
                  }}>
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

  const failCount = result.checks.filter((c) => c.status === "fail").length;
  const warnCount = result.checks.filter((c) => c.status === "warn").length;
  const passCount = result.checks.filter((c) => c.status === "pass").length;

  return (
    <div style={{ fontFamily: "var(--font-display)", background: "white", height: "100%", overflowY: "auto" }}>
      <PanelHeader result={result} dataSource={dataSource} pageUrl={result.pageUrl}
        onShowAll={() => setShowSelector(true)} />

      {/* Score Summary */}
      <div style={{ padding: "16px", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ScoreRing score={result.overallScore} size={72} strokeWidth={7} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {result.overallScore >= 90 ? "Excellent" : result.overallScore >= 75 ? "Good" :
               result.overallScore >= 60 ? "Needs Work" : result.overallScore >= 40 ? "Poor" : "Critical"}
            </div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{result.pageName}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <MiniStat icon="🔴" value={failCount} label="Issues" />
              <MiniStat icon="🟡" value={warnCount} label="Warnings" />
              <MiniStat icon="🟢" value={passCount} label="Passed" />
            </div>
          </div>
        </div>
      </div>

      {/* Checks List */}
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

// ─── Sub Components ───────────────────────────────────────────────────────────

function PanelHeader({ result, dataSource, pageUrl, onShowAll }: {
  result: PageHealthResult | null;
  dataSource: "demo" | "sitecore";
  pageUrl: string | null;
  onShowAll?: () => void;
}) {
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
        {onShowAll && result && (
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
