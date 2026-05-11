"use client";

import { useEffect, useState } from "react";
import { ScoreRing } from "@/components/ScoreRing";
import { StatusIcon } from "@/components/StatusIcon";
import { scorePage, buildSiteSummary, PageHealthResult, SiteHealthSummary } from "@/lib/healthScorer";
import { getDemoPageData } from "@/lib/sitecoreApi";

export default function DashboardWidget() {
  const [summary, setSummary]       = useState<SiteHealthSummary | null>(null);
  const [selectedPage, setSelectedPage] = useState<PageHealthResult | null>(null);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState<"overview" | "pages">("overview");
  const [dataSource, setDataSource] = useState<"demo" | "sitecore" | "error">("demo");

  const loadData = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/pages");
      const data = await res.json();
      setDataSource(data.source === "sitecore" ? "sitecore" : data.source === "error" ? "error" : "demo");
      const results = (data.pages || getDemoPageData()).map(scorePage);
      setSummary(buildSiteSummary(results));
    } catch {
      setSummary(buildSiteSummary(getDemoPageData().map(scorePage)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <LoadingSkeleton />;
  if (!summary) return null;

  return (
    <div style={{ fontFamily: "var(--font-display)", background: "var(--sc-white)", minHeight: "100vh", color: "var(--sc-dark)" }}>

      {/* Header */}
      <header style={{ background: "var(--sc-dark)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "var(--sc-red)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>Content Health Dashboard</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, letterSpacing: "0.05em",
            background: dataSource === "sitecore" ? "#14532D" : "#1E3A5F",
            color:      dataSource === "sitecore" ? "#86EFAC"  : "#60A5FA",
          }}>
            {dataSource === "sitecore" ? "🟢 LIVE" : "🔵 DEMO"}
          </span>
        </div>
        <button onClick={loadData} style={{ background: "var(--sc-red)", color: "white", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-display)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0113.4-3.9M20 15a8 8 0 01-13.4 3.9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Refresh
        </button>
      </header>

      {/* Tab Navigation */}
      <div style={{ borderBottom: "1px solid #E5E7EB", padding: "0 20px", display: "flex", gap: 0, background: "white" }}>
        {(["overview", "pages"] as const).map((tab) => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSelectedPage(null); }}
            style={{ background: "none", border: "none", padding: "12px 16px", fontSize: 13, fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? "var(--sc-red)" : "var(--sc-mid)", borderBottom: activeTab === tab ? "2px solid var(--sc-red)" : "2px solid transparent", cursor: "pointer", fontFamily: "var(--font-display)", textTransform: "capitalize", transition: "all 0.15s ease" }}>
            {tab === "overview" ? "📊 Overview" : "📄 Pages"}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px" }}>
        {activeTab === "overview" && !selectedPage && <OverviewTab summary={summary} onSelectPage={(p) => { setSelectedPage(p); setActiveTab("pages"); }} />}
        {activeTab === "pages"    && !selectedPage && <PagesTab summary={summary} onSelect={setSelectedPage} />}
        {selectedPage && <PageDetailView page={selectedPage} onBack={() => setSelectedPage(null)} />}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ summary, onSelectPage }: { summary: SiteHealthSummary; onSelectPage: (p: PageHealthResult) => void }) {
  const gradeColors: Record<string, string> = { A: "#22C55E", B: "#84CC16", C: "#F59E0B", D: "#F97316", F: "#EF4444" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Site Score Card */}
      <div className="card-animate" style={{ background: "linear-gradient(135deg, var(--sc-dark) 0%, #1A1A3E 100%)", borderRadius: 12, padding: "24px", display: "flex", alignItems: "center", gap: 24, color: "white" }}>
        <ScoreRing score={summary.averageScore} size={90} strokeWidth={9} />
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
            {summary.averageScore >= 90 ? "Excellent" : summary.averageScore >= 75 ? "Good" : summary.averageScore >= 60 ? "Needs Attention" : summary.averageScore >= 40 ? "Poor" : "Critical"}
          </div>
          <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>Site health across {summary.totalPages} pages</div>
          <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
            <Stat label="Critical" value={summary.criticalIssues} color="#EF4444" />
            <Stat label="Warnings" value={summary.warnings}       color="#F59E0B" />
            <Stat label="Passed"   value={summary.passedChecks}   color="#22C55E" />
          </div>
        </div>
      </div>

      {/* Grade Distribution */}
      <div className="card-animate" style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid #F3F4F6" }}>
        <SectionTitle>Grade Distribution</SectionTitle>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          {Object.entries(summary.gradeDistribution).map(([grade, count]) => (
            <div key={grade} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: `${Math.max((count / summary.totalPages) * 80, count > 0 ? 8 : 0)}px`, minHeight: count > 0 ? 8 : 0, background: gradeColors[grade], borderRadius: 4, marginBottom: 6, transition: "height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: gradeColors[grade] }}>{grade}</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Issues */}
      <div className="card-animate" style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid #F3F4F6" }}>
        <SectionTitle>Top Issues to Fix</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {summary.topIssues.map((issue, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: issue.severity === "fail" ? "#FFF5F5" : "#FFFBEB", borderRadius: 8, border: `1px solid ${issue.severity === "fail" ? "#FEE2E2" : "#FEF3C7"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StatusIcon status={issue.severity} size={16} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{issue.label}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, background: issue.severity === "fail" ? "#FEE2E2" : "#FEF3C7", color: issue.severity === "fail" ? "#DC2626" : "#92400E", padding: "2px 8px", borderRadius: 99 }}>
                {issue.count} page{issue.count !== 1 ? "s" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Worst Pages */}
      <div className="card-animate" style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid #F3F4F6" }}>
        <SectionTitle>Pages Needing Attention</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
          {[...summary.pages].sort((a, b) => a.overallScore - b.overallScore).slice(0, 4).map((page) => (
            <button key={page.pageId} onClick={() => onSelectPage(page)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#FAFAFA", border: "1px solid #F3F4F6", borderRadius: 8, cursor: "pointer", textAlign: "left", fontFamily: "var(--font-display)", width: "100%", transition: "background 0.15s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#F0F9FF")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#FAFAFA")}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{page.pageName}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "var(--font-mono)" }}>{page.pageUrl}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ScoreRing score={page.overallScore} size={36} strokeWidth={4} showLabel={false} />
                <span className={`grade-badge grade-${page.grade}`} style={{ width: 24, height: 24, fontSize: 12 }}>{page.grade}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Pages Tab ────────────────────────────────────────────────────────────────

function PagesTab({ summary, onSelect }: { summary: SiteHealthSummary; onSelect: (p: PageHealthResult) => void }) {
  const [filter, setFilter] = useState<"all" | "fail" | "warn" | "pass">("all");
  const filtered = summary.pages.filter((p) => {
    if (filter === "all")  return true;
    if (filter === "fail") return p.overallScore < 40;
    if (filter === "warn") return p.overallScore >= 40 && p.overallScore < 75;
    return p.overallScore >= 75;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {(["all", "fail", "warn", "pass"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "5px 12px", borderRadius: 99, border: `1px solid ${filter === f ? "var(--sc-red)" : "#E5E7EB"}`, background: filter === f ? "var(--sc-red)" : "white", color: filter === f ? "white" : "var(--sc-mid)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-display)" }}>
            {f === "all" ? "All" : f === "fail" ? "🔴 Critical" : f === "warn" ? "🟡 Warnings" : "🟢 Healthy"}
          </button>
        ))}
      </div>
      {filtered.map((page) => (
        <button key={page.pageId} onClick={() => onSelect(page)} className="card-animate"
          style={{ background: "white", border: "1px solid #F3F4F6", borderRadius: 12, padding: "16px", cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "var(--font-display)", transition: "box-shadow 0.15s, transform 0.15s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={`grade-badge grade-${page.grade}`}>{page.grade}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{page.pageName}</span>
              </div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, fontFamily: "var(--font-mono)" }}>{page.pageUrl}</div>
            </div>
            <ScoreRing score={page.overallScore} size={52} strokeWidth={5} />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {page.checks.map((c) => (
              <span key={c.id} className={`badge badge-${c.status}`} title={c.message}>{c.label}</span>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Page Detail View ─────────────────────────────────────────────────────────

function PageDetailView({ page, onBack }: { page: PageHealthResult; onBack: () => void }) {
  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--sc-mid)", fontSize: 13, fontWeight: 500, fontFamily: "var(--font-display)", marginBottom: 16, padding: "4px 0" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back to pages
      </button>
      <div style={{ background: "var(--sc-dark)", borderRadius: 12, padding: "20px", display: "flex", alignItems: "center", gap: 20, color: "white", marginBottom: 16 }}>
        <ScoreRing score={page.overallScore} size={80} strokeWidth={8} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={`grade-badge grade-${page.grade}`} style={{ width: 28, height: 28, fontSize: 14 }}>{page.grade}</span>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{page.pageName}</span>
          </div>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, fontFamily: "var(--font-mono)" }}>{page.pageUrl}</div>
          {page.lastModified && <div style={{ fontSize: 11, color: "#6B7280", marginTop: 6 }}>Last modified: {new Date(page.lastModified).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {page.checks.map((check) => (
          <div key={check.id} className="card-animate" style={{ background: "white", border: `1px solid ${check.status === "pass" ? "#DCFCE7" : check.status === "warn" ? "#FEF3C7" : "#FEE2E2"}`, borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ paddingTop: 1 }}><StatusIcon status={check.status} size={20} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{check.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 60, height: 4, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${check.score}%`, height: "100%", background: check.score >= 90 ? "#22C55E" : check.score >= 70 ? "#F59E0B" : "#EF4444", borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: check.score >= 90 ? "#22C55E" : check.score >= 70 ? "#F59E0B" : "#EF4444" }}>{check.score}</span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>{check.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{label}</div>
    </div>
  );
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", letterSpacing: "0.02em", textTransform: "uppercase" }}>{children}</div>;
}
function LoadingSkeleton() {
  return (
    <div style={{ fontFamily: "var(--font-display)", background: "white", minHeight: "100vh" }}>
      <div style={{ background: "var(--sc-dark)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 6, background: "#333" }} />
        <div className="skeleton" style={{ width: 180, height: 16, background: "#333" }} />
      </div>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        {[120, 100, 160, 200].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 12 }} />)}
      </div>
    </div>
  );
}
