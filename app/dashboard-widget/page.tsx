"use client";

import { useEffect, useState, useMemo } from "react";
import { ScoreRing } from "@/components/ScoreRing";
import { StatusIcon } from "@/components/StatusIcon";
import { scorePage, buildSiteSummary, PageHealthResult, SiteHealthSummary } from "@/lib/healthScorer";
import { getDemoPageData } from "@/lib/sitecoreApi";

export default function DashboardWidget() {
  const [summary, setSummary]           = useState<SiteHealthSummary | null>(null);
  const [selectedPage, setSelectedPage] = useState<PageHealthResult | null>(null);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState<"overview" | "pages">("overview");
  const [dataSource, setDataSource]     = useState<"demo" | "sitecore" | "error">("demo");

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
    <div style={{ fontFamily: "var(--font-display)", background: "#F8F9FB", minHeight: "100vh", color: "var(--sc-dark)" }}>

      {/* Header */}
      <header style={{ background: "var(--sc-dark)", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, background: "var(--sc-red)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ color: "white", fontWeight: 700, fontSize: 13 }}>Content Health</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, letterSpacing: "0.05em", background: dataSource === "sitecore" ? "#14532D" : "#1E3A5F", color: dataSource === "sitecore" ? "#86EFAC" : "#60A5FA" }}>
            {dataSource === "sitecore" ? "🟢 LIVE" : "🔵 DEMO"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <HeaderStat label="Score" value={`${summary.averageScore}`} color="#60A5FA" />
          <HeaderStat label="Pages" value={`${summary.totalPages}`} color="#A3E635" />
          <HeaderStat label="Issues" value={`${summary.criticalIssues}`} color="#F87171" />
          <button onClick={loadData} style={{ background: "var(--sc-red)", color: "white", border: "none", padding: "5px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-display)" }}>
            ↻
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div style={{ borderBottom: "1px solid #E5E7EB", padding: "0 20px", display: "flex", background: "white" }}>
        {(["overview", "pages"] as const).map((tab) => (
          <button key={tab} onClick={() => { setActiveTab(tab); setSelectedPage(null); }}
            style={{ background: "none", border: "none", padding: "11px 16px", fontSize: 13, fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? "var(--sc-red)" : "#6B7280", borderBottom: activeTab === tab ? "2px solid var(--sc-red)" : "2px solid transparent", cursor: "pointer", fontFamily: "var(--font-display)", transition: "all 0.15s" }}>
            {tab === "overview" ? "📊 Overview" : "📄 Pages"}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px" }}>
        {activeTab === "overview" && !selectedPage && (
          <OverviewTab summary={summary} onSelectPage={(p) => { setSelectedPage(p); setActiveTab("pages"); }} />
        )}
        {activeTab === "pages" && !selectedPage && (
          <PagesTab summary={summary} onSelect={setSelectedPage} />
        )}
        {selectedPage && (
          <PageDetailView page={selectedPage} onBack={() => setSelectedPage(null)} />
        )}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ summary, onSelectPage }: { summary: SiteHealthSummary; onSelectPage: (p: PageHealthResult) => void }) {
  const gradeColors: Record<string, string> = { A: "#22C55E", B: "#84CC16", C: "#F59E0B", D: "#F97316", F: "#EF4444" };

  const scoreLabel = summary.averageScore >= 90 ? "Excellent" :
    summary.averageScore >= 75 ? "Good" :
    summary.averageScore >= 60 ? "Needs Attention" :
    summary.averageScore >= 40 ? "Poor" : "Critical";

  const scoreColor = summary.averageScore >= 90 ? "#22C55E" :
    summary.averageScore >= 75 ? "#84CC16" :
    summary.averageScore >= 60 ? "#F59E0B" :
    summary.averageScore >= 40 ? "#F97316" : "#EF4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* KPI Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        <div style={{ background: "white", borderRadius: 10, padding: "14px 16px", border: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 12 }}>
          <ScoreRing score={summary.averageScore} size={56} strokeWidth={6} />
          <div>
            <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Health Score</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: scoreColor, lineHeight: 1.2 }}>{summary.averageScore}/100</div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>{scoreLabel}</div>
          </div>
        </div>
        <div style={{ background: "white", borderRadius: 10, padding: "14px 16px", border: "1px solid #F3F4F6" }}>
          <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Pages Scanned</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#374151" }}>{summary.totalPages}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <StatusPill count={summary.criticalIssues} label="Critical" color="#EF4444" bg="#FEE2E2" />
            <StatusPill count={summary.warnings} label="Warn" color="#D97706" bg="#FEF3C7" />
            <StatusPill count={summary.passedChecks} label="OK" color="#16A34A" bg="#DCFCE7" />
          </div>
        </div>
      </div>

      {/* Grade Distribution */}
      <div style={{ background: "white", borderRadius: 10, padding: "14px 16px", border: "1px solid #F3F4F6" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>Grade Distribution</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 60 }}>
          {Object.entries(summary.gradeDistribution).map(([grade, count]) => {
            const maxCount = Math.max(...Object.values(summary.gradeDistribution));
            const barH = maxCount > 0 ? Math.max((count / maxCount) * 48, count > 0 ? 6 : 0) : 0;
            return (
              <div key={grade} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: gradeColors[grade] }}>{count}</div>
                <div style={{ width: "100%", height: barH, background: gradeColors[grade], borderRadius: "3px 3px 0 0", transition: "height 0.6s ease", minHeight: count > 0 ? 4 : 0 }} />
                <div style={{ fontSize: 11, fontWeight: 700, color: gradeColors[grade] }}>{grade}</div>
              </div>
            );
          })}
        </div>
        {/* Grade scale legend */}
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {[{ g: "A", r: "90–100", c: "#22C55E" }, { g: "B", r: "80–89", c: "#84CC16" }, { g: "C", r: "70–79", c: "#F59E0B" }, { g: "D", r: "60–69", c: "#F97316" }, { g: "F", r: "0–59", c: "#EF4444" }].map((item) => (
            <div key={item.g} style={{ display: "flex", alignItems: "center", gap: 4, background: "#F9FAFB", border: "1px solid #F3F4F6", borderRadius: 99, padding: "2px 7px" }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: item.c, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 8, fontWeight: 800, color: "white" }}>{item.g}</span>
              </div>
              <span style={{ fontSize: 10, color: "#6B7280" }}>{item.r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Issues */}
      <div style={{ background: "white", borderRadius: 10, padding: "14px 16px", border: "1px solid #F3F4F6" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Top Issues to Fix</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {summary.topIssues.map((issue, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: issue.severity === "fail" ? "#FFF5F5" : "#FFFBEB", borderRadius: 7, border: `1px solid ${issue.severity === "fail" ? "#FEE2E2" : "#FEF3C7"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <StatusIcon status={issue.severity} size={15} />
                <span style={{ fontSize: 12, fontWeight: 500 }}>{issue.label}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: issue.severity === "fail" ? "#DC2626" : "#92400E", background: issue.severity === "fail" ? "#FEE2E2" : "#FEF3C7", padding: "1px 7px", borderRadius: 99 }}>
                {issue.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pages Needing Attention */}
      <div style={{ background: "white", borderRadius: 10, padding: "14px 16px", border: "1px solid #F3F4F6" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.04em" }}>Worst Pages</div>
          <span style={{ fontSize: 10, color: "#9CA3AF" }}>Bottom 5</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[...summary.pages].sort((a, b) => a.overallScore - b.overallScore).slice(0, 5).map((page) => (
            <button key={page.pageId} onClick={() => onSelectPage(page)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "#FAFAFA", border: "1px solid #F3F4F6", borderRadius: 7, cursor: "pointer", textAlign: "left", fontFamily: "var(--font-display)", width: "100%" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#EFF6FF")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#FAFAFA")}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.pageName}</div>
                <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.pageUrl}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                <ScoreRing score={page.overallScore} size={32} strokeWidth={3} showLabel={false} />
                <span className={`grade-badge grade-${page.grade}`} style={{ width: 22, height: 22, fontSize: 11 }}>{page.grade}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Pages Tab with Search + Pagination ──────────────────────────────────────

function PagesTab({ summary, onSelect }: { summary: SiteHealthSummary; onSelect: (p: PageHealthResult) => void }) {
  const [filter, setFilter]       = useState<"all" | "fail" | "warn" | "pass">("all");
  const [search, setSearch]       = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  const filtered = useMemo(() => {
    let pages = [...summary.pages];

    if (filter === "fail") pages = pages.filter((p) => p.overallScore < 40);
    else if (filter === "warn") pages = pages.filter((p) => p.overallScore >= 40 && p.overallScore < 75);
    else if (filter === "pass") pages = pages.filter((p) => p.overallScore >= 75);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      pages = pages.filter((p) => p.pageName.toLowerCase().includes(q) || p.pageUrl.toLowerCase().includes(q));
    }

    return pages;
  }, [summary.pages, filter, search]);

  // Reset to page 1 when filter or search changes
  useEffect(() => { setCurrentPage(1); }, [filter, search]);

  const totalPages   = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated    = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Search box */}
      <div style={{ position: "relative" }}>
        <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <input
          type="text"
          placeholder="Search pages by name or URL..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "9px 32px 9px 32px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-display)", outline: "none", boxSizing: "border-box", color: "#374151", background: "white" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#EB1F1F")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 16 }}>×</button>
        )}
      </div>

      {/* Filter pills + count */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {(["all", "fail", "warn", "pass"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "4px 10px", borderRadius: 99, border: `1px solid ${filter === f ? "var(--sc-red)" : "#E5E7EB"}`, background: filter === f ? "var(--sc-red)" : "white", color: filter === f ? "white" : "#6B7280", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-display)" }}>
              {f === "all" ? "All" : f === "fail" ? "🔴 Critical" : f === "warn" ? "🟡 Warn" : "🟢 Healthy"}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          {search && ` for "${search}"`}
        </span>
      </div>

      {/* Page cards */}
      {paginated.map((page) => (
        <button key={page.pageId} onClick={() => onSelect(page)}
          style={{ background: "white", border: "1px solid #F3F4F6", borderRadius: 10, padding: "12px 14px", cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "var(--font-display)", transition: "box-shadow 0.15s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span className={`grade-badge grade-${page.grade}`} style={{ width: 20, height: 20, fontSize: 10, flexShrink: 0 }}>{page.grade}</span>
                <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.pageName}</span>
              </div>
              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 3, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.pageUrl}</div>
            </div>
            <ScoreRing score={page.overallScore} size={44} strokeWidth={4} />
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
            {page.checks.map((c) => (
              <span key={c.id} className={`badge badge-${c.status}`} style={{ fontSize: 10, padding: "1px 6px" }} title={c.message}>{c.label}</span>
            ))}
          </div>
        </button>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#9CA3AF" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>No pages found</div>
          {search && <div style={{ fontSize: 12, marginTop: 4 }}>Try a different search term</div>}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #F3F4F6", marginTop: 4 }}>
          <span style={{ fontSize: 11, color: "#6B7280" }}>
            Page {currentPage} / {totalPages}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <PageBtn onClick={() => setCurrentPage(1)} disabled={currentPage === 1} label="«" />
            <PageBtn onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} label="‹" />
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
              .reduce((acc: (number | string)[], n, i, arr) => {
                if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) =>
                n === "…"
                  ? <span key={`e${i}`} style={{ padding: "0 3px", color: "#9CA3AF", fontSize: 12, lineHeight: "28px" }}>…</span>
                  : <button key={n} onClick={() => setCurrentPage(n as number)}
                      style={{ width: 28, height: 28, border: `1px solid ${currentPage === n ? "#EB1F1F" : "#E5E7EB"}`, borderRadius: 5, background: currentPage === n ? "#EB1F1F" : "white", color: currentPage === n ? "white" : "#374151", fontSize: 11, fontWeight: currentPage === n ? 700 : 400, cursor: "pointer", fontFamily: "var(--font-display)" }}>
                      {n}
                    </button>
              )}
            <PageBtn onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} label="›" />
            <PageBtn onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} label="»" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page Detail View ─────────────────────────────────────────────────────────

function PageDetailView({ page, onBack }: { page: PageHealthResult; onBack: () => void }) {
  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#6B7280", fontSize: 12, fontWeight: 500, fontFamily: "var(--font-display)", marginBottom: 14, padding: "4px 0" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back
      </button>
      <div style={{ background: "var(--sc-dark)", borderRadius: 10, padding: "16px", display: "flex", alignItems: "center", gap: 16, color: "white", marginBottom: 14 }}>
        <ScoreRing score={page.overallScore} size={72} strokeWidth={7} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className={`grade-badge grade-${page.grade}`} style={{ width: 24, height: 24, fontSize: 12 }}>{page.grade}</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{page.pageName}</span>
          </div>
          <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "monospace" }}>{page.pageUrl}</div>
          {page.lastModified && (
            <div style={{ fontSize: 10, color: "#6B7280", marginTop: 4 }}>
              Modified: {(() => {
                const raw = page.lastModified;
                const m = raw?.match(/^(\d{4})(\d{2})(\d{2})T/);
                if (m) return `${m[3]}/${m[2]}/${m[1]}`;
                const d = new Date(raw || "");
                return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
              })()}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[...page.checks].sort((a, b) => { const o: Record<string, number> = { fail: 0, warn: 1, pass: 2 }; return o[a.status] - o[b.status]; }).map((check) => (
          <div key={check.id} style={{ background: "white", border: `1px solid ${check.status === "pass" ? "#DCFCE7" : check.status === "warn" ? "#FEF3C7" : "#FEE2E2"}`, borderRadius: 8, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <StatusIcon status={check.status} size={18} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{check.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 50, height: 3, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ width: `${check.score}%`, height: "100%", background: check.score >= 90 ? "#22C55E" : check.score >= 70 ? "#F59E0B" : "#EF4444", borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: check.score >= 90 ? "#22C55E" : check.score >= 70 ? "#F59E0B" : "#EF4444" }}>{check.score}</span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.5, margin: 0 }}>{check.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function HeaderStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: "#6B7280" }}>{label}</div>
    </div>
  );
}

function StatusPill({ count, label, color, bg }: { count: number; label: string; color: string; bg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, background: bg, borderRadius: 99, padding: "2px 6px" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{count}</span>
      <span style={{ fontSize: 10, color }}>{label}</span>
    </div>
  );
}

function PageBtn({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: 28, height: 28, border: "1px solid #E5E7EB", borderRadius: 5, background: disabled ? "#F9FAFB" : "white", color: disabled ? "#D1D5DB" : "#374151", fontSize: 12, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "var(--font-display)" }}>
      {label}
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ fontFamily: "var(--font-display)", background: "#F8F9FB", minHeight: "100vh" }}>
      <div style={{ background: "var(--sc-dark)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <div className="skeleton" style={{ width: 26, height: 26, borderRadius: 6, background: "#333" }} />
        <div className="skeleton" style={{ width: 160, height: 14, background: "#333" }} />
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="skeleton" style={{ height: 88, borderRadius: 10 }} />
          <div className="skeleton" style={{ height: 88, borderRadius: 10 }} />
        </div>
        {[110, 90, 160, 140].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 10 }} />)}
      </div>
    </div>
  );
}
