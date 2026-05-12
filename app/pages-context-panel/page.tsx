"use client";

import { useEffect, useState } from "react";
import { ScoreRing } from "@/components/ScoreRing";
import { StatusIcon } from "@/components/StatusIcon";
import { scorePage, PageHealthResult } from "@/lib/healthScorer";
import { getDemoPageData } from "@/lib/sitecoreApi";

export default function PagesContextPanel() {
  const [result, setResult]           = useState<PageHealthResult | null>(null);
  const [allPages, setAllPages]       = useState<PageHealthResult[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expanded, setExpanded]       = useState<string | null>(null);
  const [dataSource, setDataSource]   = useState<"demo" | "sitecore">("demo");
  const [showSelector, setShowSelector] = useState(false);
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // ── Step 1: Extract ALL possible context hints from URL params ────────
        // Sitecore Page Builder passes these when opening the context panel iframe
        const params    = new URLSearchParams(window.location.search);

        // sc_itemid — the Sitecore item GUID of the currently open page
        // e.g. 7ca799a4-b460-4d4b-9dcf-8d13bd5623f0
        const scItemId  = params.get("sc_itemid") || params.get("itemId") || null;

        // sc_site — site name
        const scSite    = params.get("sc_site") || params.get("siteName") || null;

        // URL-based fallbacks
        const pageUrl   = params.get("pageUrl") || params.get("routePath") ||
                          params.get("itemPath") || params.get("sc_pageUrl") || null;

        // Also try referrer — Page Builder embeds the panel as iframe,
        // the referrer URL contains sc_itemid of the page being edited
        let referrerItemId: string | null = null;
        try {
          if (document.referrer) {
            const refParams = new URLSearchParams(new URL(document.referrer).search);
            referrerItemId  = refParams.get("sc_itemid") || refParams.get("itemId") || null;
          }
        } catch {}

        const itemId       = scItemId || referrerItemId;
        const currentPageUrl = pageUrl;
        if (currentPageUrl || itemId) setDetectedUrl(currentPageUrl || itemId || "");

        console.log("[ContentHealth Panel] sc_itemid:", itemId, "| pageUrl:", currentPageUrl, "| sc_site:", scSite);

        // ── Step 2: Fetch all pages ───────────────────────────────────────────
        const siteParam = scSite ? `?site=${encodeURIComponent(scSite)}` : "";
        const res       = await fetch(`/api/pages${siteParam}`);
        const data      = await res.json();
        setDataSource(data.source === "sitecore" ? "sitecore" : "demo");

        const pages  = data.pages || getDemoPageData();
        const scored = pages.map(scorePage);
        setAllPages(scored);

        // ── Step 3: Match current page ────────────────────────────────────────

        // Method A: Match by item ID (most reliable)
        if (itemId) {
          const normalizeId = (s: string) => s.replace(/[{}-]/g, "").toLowerCase();
          const matchById   = scored.find(
            (p: PageHealthResult) => normalizeId(p.pageId) === normalizeId(itemId)
          );
          if (matchById) {
            console.log("[ContentHealth Panel] Matched by item ID:", matchById.pageName);
            setResult(matchById);
            setShowSelector(false);
            return;
          }
        }

        // Method B: Match by URL path
        if (currentPageUrl) {
          const normalize = (s: string) => s.toLowerCase().replace(/\/$/, "").replace(/^\/en/, "");
          const matchByUrl = scored.find(
            (p: PageHealthResult) =>
              normalize(p.pageUrl) === normalize(currentPageUrl) ||
              normalize(p.pageUrl).endsWith(normalize(currentPageUrl)) ||
              normalize(currentPageUrl).endsWith(normalize(p.pageUrl))
          );
          if (matchByUrl) {
            console.log("[ContentHealth Panel] Matched by URL:", matchByUrl.pageName);
            setResult(matchByUrl);
            setShowSelector(false);
            return;
          }
        }

        // No match — show selector
        console.log("[ContentHealth Panel] No match found — showing selector");
        setShowSelector(true);

      } catch (err) {
        console.error("[ContentHealth Panel] Error:", err);
        const fallback = getDemoPageData();
        setAllPages(fallback.map(scorePage));
        setShowSelector(true);
      } finally {
        setLoading(false);
      }
    };

    load();

    // ── postMessage listener — Sitecore SDK sends page context this way ───────
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes("sitecorecloud.io") && !event.origin.includes("localhost")) return;
      const msg = event.data;

      // Try to get item ID or URL from message
      const msgItemId = msg?.itemId || msg?.sc_itemid || msg?.data?.itemId || null;
      const msgUrl    = msg?.pageUrl || msg?.routePath || msg?.data?.pageUrl || null;

      if (msgItemId || msgUrl) {
        setDetectedUrl(msgItemId || msgUrl || "");
        setAllPages((prev) => {
          const normalizeId  = (s: string) => s.replace(/[{}-]/g, "").toLowerCase();
          const normalize    = (s: string) => s.toLowerCase().replace(/\/$/, "");

          // Try item ID match first
          if (msgItemId) {
            const match = prev.find((p) => normalizeId(p.pageId) === normalizeId(msgItemId));
            if (match) { setResult(match); setShowSelector(false); return prev; }
          }
          // Fallback to URL match
          if (msgUrl) {
            const match = prev.find(
              (p) => normalize(p.pageUrl) === normalize(msgUrl) ||
                     normalize(p.pageUrl).endsWith(normalize(msgUrl))
            );
            if (match) { setResult(match); setShowSelector(false); return prev; }
          }
          return prev;
        });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (loading) return <ContextPanelSkeleton />;

  // ── Page Selector with search ─────────────────────────────────────────────
  if (showSelector || !result) {
    return <PageSelector
      pages={allPages}
      detectedUrl={detectedUrl}
      dataSource={dataSource}
      onSelect={(page) => { setResult(page); setShowSelector(false); }}
    />;
  }

  const failCount = result.checks.filter((c) => c.status === "fail").length;
  const warnCount = result.checks.filter((c) => c.status === "warn").length;
  const passCount = result.checks.filter((c) => c.status === "pass").length;

  return (
    <div style={{ fontFamily: "var(--font-display)", background: "white", height: "100%", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #F3F4F6", background: "var(--sc-dark)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ color: "white", fontWeight: 700, fontSize: 13 }}>Content Health</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: dataSource === "sitecore" ? "#14532D" : "#1E3A5F", color: dataSource === "sitecore" ? "#86EFAC" : "#93C5FD" }}>
            {dataSource === "sitecore" ? "LIVE" : "DEMO"}
          </span>
          </div>
          <button onClick={() => setShowSelector(true)} style={{ background: "none", border: "1px solid #374151", borderRadius: 5, padding: "3px 8px", fontSize: 10, color: "#9CA3AF", cursor: "pointer", fontFamily: "var(--font-display)", whiteSpace: "nowrap" }}>All pages</button>
        </div>
        <div style={{ color: "#9CA3AF", fontSize: 10, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{result.pageUrl}</div>
      </div>

      {/* Score Summary */}
      <div style={{ padding: "16px", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ScoreRing score={result.overallScore} size={72} strokeWidth={7} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {result.overallScore >= 90 ? "Excellent" : result.overallScore >= 75 ? "Good" : result.overallScore >= 60 ? "Needs Work" : result.overallScore >= 40 ? "Poor" : "Critical"}
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
        {[...result.checks].sort((a, b) => { const o = { fail: 0, warn: 1, pass: 2 }; return o[a.status] - o[b.status]; }).map((check) => (
          <div key={check.id} style={{ marginBottom: 8 }}>
            <button onClick={() => setExpanded(expanded === check.id ? null : check.id)}
              style={{ width: "100%", background: check.status === "fail" ? "#FFF5F5" : check.status === "warn" ? "#FFFBEB" : "#F0FDF4", border: `1px solid ${check.status === "fail" ? "#FEE2E2" : check.status === "warn" ? "#FEF3C7" : "#DCFCE7"}`, borderRadius: 8, padding: "10px 12px", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-display)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
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
          <div style={{ background: "linear-gradient(135deg, var(--sc-red) 0%, #C41717 100%)", borderRadius: 8, padding: "12px 14px", color: "white" }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>⚡ {failCount} critical issue{failCount !== 1 ? "s" : ""} found</div>
            <div style={{ fontSize: 11, color: "#FECACA", marginTop: 2, lineHeight: 1.5 }}>Fix these to improve search ranking and accessibility.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page Selector Component ─────────────────────────────────────────────────
function PageSelector({ pages, detectedUrl, dataSource, onSelect }: {
  pages: PageHealthResult[];
  detectedUrl: string | null;
  dataSource: "demo" | "sitecore";
  onSelect: (p: PageHealthResult) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = pages.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.pageName.toLowerCase().includes(q) || p.pageUrl.toLowerCase().includes(q);
  });

  return (
    <div style={{ fontFamily: "var(--font-display)", background: "white", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", background: "#0D0D0D", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ color: "white", fontWeight: 700, fontSize: 13 }}>Content Health</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: dataSource === "sitecore" ? "#14532D" : "#1E3A5F", color: dataSource === "sitecore" ? "#86EFAC" : "#93C5FD" }}>
            {dataSource === "sitecore" ? "LIVE" : "DEMO"}
          </span>
        </div>
        {detectedUrl && (
          <div style={{ color: "#6B7280", fontSize: 10, marginTop: 3, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Could not auto-match: {detectedUrl}
          </div>
        )}
      </div>

      {/* Search */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #F3F4F6", flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={{ width: "100%", padding: "7px 28px 7px 28px", border: "1px solid #E5E7EB", borderRadius: 7, fontSize: 12, fontFamily: "var(--font-display)", outline: "none", boxSizing: "border-box", color: "#374151" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#EB1F1F")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 15, lineHeight: 1 }}>×</button>
          )}
        </div>
        <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 6 }}>
          {filtered.length} of {pages.length} pages
        </div>
      </div>

      {/* Page List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
        {filtered.map((page) => (
          <button
            key={page.pageId}
            onClick={() => onSelect(page)}
            style={{ background: "#FAFAFA", border: "1px solid #F3F4F6", borderRadius: 8, padding: "9px 12px", cursor: "pointer", textAlign: "left", fontFamily: "var(--font-display)", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 6, transition: "background 0.15s" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#EFF6FF")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#FAFAFA")}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.pageName}</div>
              <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.pageUrl}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, marginLeft: 8 }}>
              <ScoreRing score={page.overallScore} size={30} strokeWidth={3} showLabel={false} />
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 5px", borderRadius: 4, color: "white", background: page.overallScore >= 90 ? "#22C55E" : page.overallScore >= 75 ? "#84CC16" : page.overallScore >= 60 ? "#F59E0B" : page.overallScore >= 40 ? "#F97316" : "#EF4444" }}>
                {page.grade}
              </span>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#9CA3AF", fontSize: 12 }}>
            No pages match "{search}"
          </div>
        )}
      </div>
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
      {[1,2,3,4,5].map((i) => <div key={i} className="skeleton" style={{ height: 40 }} />)}
    </div>
  );
}
