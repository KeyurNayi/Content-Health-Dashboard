"use client";

import { useEffect, useState } from "react";
import { ScoreRing } from "@/components/ScoreRing";
import { StatusIcon } from "@/components/StatusIcon";
import { scorePage, PageHealthResult } from "@/lib/healthScorer";
import { getDemoPageData } from "@/lib/sitecoreApi";

export default function PagesContextPanel() {
  const [result, setResult]         = useState<PageHealthResult | null>(null);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"demo" | "sitecore">("demo");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // In production the Marketplace SDK provides current page context:
        // const client = createClient();
        // const context = await client.getPageContext(); // { pageId, pageUrl }
        // Then fetch only that page from the API route:
        // const res = await fetch(`/api/pages?pageId=${context.pageId}`);

        const res  = await fetch("/api/pages");
        const data = await res.json();
        setDataSource(data.source === "sitecore" ? "sitecore" : "demo");

        const pages = data.pages || getDemoPageData();
        // Use first page as the "current" page (in production this would be context-aware)
        const currentPage = pages[0];
        if (currentPage) setResult(scorePage(currentPage));
      } catch {
        const fallback = getDemoPageData()[0];
        setResult(scorePage(fallback));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <ContextPanelSkeleton />;
  if (!result) return null;

  const failCount = result.checks.filter((c) => c.status === "fail").length;
  const warnCount = result.checks.filter((c) => c.status === "warn").length;
  const passCount = result.checks.filter((c) => c.status === "pass").length;

  return (
    <div style={{ fontFamily: "var(--font-display)", background: "white", height: "100%", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #F3F4F6", background: "var(--sc-dark)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ color: "white", fontWeight: 700, fontSize: 13 }}>Content Health</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: dataSource === "sitecore" ? "#14532D" : "#1E3A5F", color: dataSource === "sitecore" ? "#86EFAC" : "#93C5FD" }}>
            {dataSource === "sitecore" ? "LIVE" : "DEMO"}
          </span>
        </div>
        <div style={{ color: "#9CA3AF", fontSize: 11, marginTop: 2, fontFamily: "var(--font-mono)" }}>{result.pageUrl}</div>
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
