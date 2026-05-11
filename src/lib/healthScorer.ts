// src/lib/healthScorer.ts
// Core Content Health Scoring Engine

export interface PageHealthData {
  pageId: string;
  pageName: string;
  pageUrl: string;
  metaTitle: string | null;
  metaDescription: string | null;
  h1: string | null;
  images: ImageData[];
  wordCount: number;
  lastModified: string | null;
  hasCanonical: boolean;
  internalLinks: number;
}

export interface ImageData {
  src: string;
  alt: string | null;
  title: string | null;
}

export interface HealthCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  message: string;
  score: number; // 0-100 contribution
  weight: number; // importance weight
}

export interface PageHealthResult {
  pageId: string;
  pageName: string;
  pageUrl: string;
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  checks: HealthCheck[];
  lastModified: string | null;
}

export interface SiteHealthSummary {
  totalPages: number;
  averageScore: number;
  gradeDistribution: Record<string, number>;
  criticalIssues: number;
  warnings: number;
  passedChecks: number;
  topIssues: { label: string; count: number; severity: "fail" | "warn" }[];
  pages: PageHealthResult[];
}

// ─── Individual Check Functions ─────────────────────────────────────────────

function checkMetaTitle(title: string | null): HealthCheck {
  if (!title || title.trim() === "") {
    return {
      id: "meta-title",
      label: "Meta Title",
      status: "fail",
      message: "Missing meta title — pages without titles won't rank in search engines.",
      score: 0,
      weight: 20,
    };
  }
  if (title.length < 30) {
    return {
      id: "meta-title",
      label: "Meta Title",
      status: "warn",
      message: `Meta title is too short (${title.length} chars). Aim for 50–60 characters.`,
      score: 60,
      weight: 20,
    };
  }
  if (title.length > 60) {
    return {
      id: "meta-title",
      label: "Meta Title",
      status: "warn",
      message: `Meta title is too long (${title.length} chars). Keep it under 60 to avoid truncation in search results.`,
      score: 70,
      weight: 20,
    };
  }
  return {
    id: "meta-title",
    label: "Meta Title",
    status: "pass",
    message: `Meta title is ${title.length} characters — well optimized.`,
    score: 100,
    weight: 20,
  };
}

function checkMetaDescription(desc: string | null): HealthCheck {
  if (!desc || desc.trim() === "") {
    return {
      id: "meta-description",
      label: "Meta Description",
      status: "fail",
      message: "Missing meta description — search engines may auto-generate a poor snippet.",
      score: 0,
      weight: 15,
    };
  }
  if (desc.length < 70) {
    return {
      id: "meta-description",
      label: "Meta Description",
      status: "warn",
      message: `Meta description too short (${desc.length} chars). Aim for 150–160 characters.`,
      score: 50,
      weight: 15,
    };
  }
  if (desc.length > 160) {
    return {
      id: "meta-description",
      label: "Meta Description",
      status: "warn",
      message: `Meta description too long (${desc.length} chars). Keep under 160 chars to avoid truncation.`,
      score: 70,
      weight: 15,
    };
  }
  return {
    id: "meta-description",
    label: "Meta Description",
    status: "pass",
    message: `Meta description is ${desc.length} characters — well optimized.`,
    score: 100,
    weight: 15,
  };
}

function checkH1(h1: string | null): HealthCheck {
  if (!h1 || h1.trim() === "") {
    return {
      id: "h1-tag",
      label: "H1 Heading",
      status: "fail",
      message: "No H1 heading found. Every page should have exactly one H1.",
      score: 0,
      weight: 15,
    };
  }
  if (h1.length > 70) {
    return {
      id: "h1-tag",
      label: "H1 Heading",
      status: "warn",
      message: `H1 is quite long (${h1.length} chars). Consider keeping it concise.`,
      score: 75,
      weight: 15,
    };
  }
  return {
    id: "h1-tag",
    label: "H1 Heading",
    status: "pass",
    message: "H1 heading is present and well-sized.",
    score: 100,
    weight: 15,
  };
}

function checkImages(images: ImageData[]): HealthCheck {
  if (images.length === 0) {
    return {
      id: "image-alt",
      label: "Image Alt Text",
      status: "pass",
      message: "No images on this page.",
      score: 100,
      weight: 20,
    };
  }
  const missing = images.filter((img) => !img.alt || img.alt.trim() === "");
  const ratio = missing.length / images.length;

  if (missing.length === images.length) {
    return {
      id: "image-alt",
      label: "Image Alt Text",
      status: "fail",
      message: `All ${images.length} image(s) are missing alt text. This hurts accessibility and SEO.`,
      score: 0,
      weight: 20,
    };
  }
  if (ratio > 0.3) {
    return {
      id: "image-alt",
      label: "Image Alt Text",
      status: "warn",
      message: `${missing.length} of ${images.length} images are missing alt text.`,
      score: Math.round((1 - ratio) * 100),
      weight: 20,
    };
  }
  if (missing.length > 0) {
    return {
      id: "image-alt",
      label: "Image Alt Text",
      status: "warn",
      message: `${missing.length} image(s) missing alt text. Almost there!`,
      score: 85,
      weight: 20,
    };
  }
  return {
    id: "image-alt",
    label: "Image Alt Text",
    status: "pass",
    message: `All ${images.length} image(s) have alt text. Excellent!`,
    score: 100,
    weight: 20,
  };
}

function checkWordCount(count: number): HealthCheck {
  if (count < 100) {
    return {
      id: "word-count",
      label: "Content Length",
      status: "fail",
      message: `Only ${count} words found. Pages with thin content may rank poorly.`,
      score: 20,
      weight: 15,
    };
  }
  if (count < 300) {
    return {
      id: "word-count",
      label: "Content Length",
      status: "warn",
      message: `${count} words — consider expanding content to at least 300 words for better SEO.`,
      score: 60,
      weight: 15,
    };
  }
  return {
    id: "word-count",
    label: "Content Length",
    status: "pass",
    message: `${count} words — good content depth.`,
    score: 100,
    weight: 15,
  };
}

function checkCanonical(hasCanonical: boolean): HealthCheck {
  if (!hasCanonical) {
    return {
      id: "canonical",
      label: "Canonical Tag",
      status: "warn",
      message: "No canonical tag set. Recommended to prevent duplicate content issues.",
      score: 60,
      weight: 10,
    };
  }
  return {
    id: "canonical",
    label: "Canonical Tag",
    status: "pass",
    message: "Canonical tag is set.",
    score: 100,
    weight: 10,
  };
}

function checkInternalLinks(count: number): HealthCheck {
  if (count === 0) {
    return {
      id: "internal-links",
      label: "Internal Links",
      status: "warn",
      message: "No internal links found. Internal linking helps SEO and user navigation.",
      score: 40,
      weight: 5,
    };
  }
  if (count < 3) {
    return {
      id: "internal-links",
      label: "Internal Links",
      status: "warn",
      message: `Only ${count} internal link(s). Consider adding more for better site structure.`,
      score: 70,
      weight: 5,
    };
  }
  return {
    id: "internal-links",
    label: "Internal Links",
    status: "pass",
    message: `${count} internal links found — good site structure.`,
    score: 100,
    weight: 5,
  };
}

// ─── Grade Calculator ────────────────────────────────────────────────────────

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

// ─── Main Scorer ─────────────────────────────────────────────────────────────

export function scorePage(page: PageHealthData): PageHealthResult {
  const checks: HealthCheck[] = [
    checkMetaTitle(page.metaTitle),
    checkMetaDescription(page.metaDescription),
    checkH1(page.h1),
    checkImages(page.images),
    checkWordCount(page.wordCount),
    checkCanonical(page.hasCanonical),
    checkInternalLinks(page.internalLinks),
  ];

  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const weightedScore = checks.reduce(
    (sum, c) => sum + (c.score * c.weight) / totalWeight,
    0
  );
  const overallScore = Math.round(weightedScore);

  return {
    pageId: page.pageId,
    pageName: page.pageName,
    pageUrl: page.pageUrl,
    overallScore,
    grade: scoreToGrade(overallScore),
    checks,
    lastModified: page.lastModified,
  };
}

export function buildSiteSummary(results: PageHealthResult[]): SiteHealthSummary {
  const total = results.length;
  const avgScore =
    total > 0
      ? Math.round(results.reduce((s, r) => s + r.overallScore, 0) / total)
      : 0;

  const gradeDist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  results.forEach((r) => { gradeDist[r.grade]++; });

  let critical = 0, warnings = 0, passed = 0;
  const issueCounts: Record<string, { count: number; severity: "fail" | "warn" }> = {};

  results.forEach((r) => {
    r.checks.forEach((c) => {
      if (c.status === "fail") {
        critical++;
        issueCounts[c.label] = issueCounts[c.label] || { count: 0, severity: "fail" };
        issueCounts[c.label].count++;
      } else if (c.status === "warn") {
        warnings++;
        if (!issueCounts[c.label]) issueCounts[c.label] = { count: 0, severity: "warn" };
        issueCounts[c.label].count++;
      } else {
        passed++;
      }
    });
  });

  const topIssues = Object.entries(issueCounts)
    .map(([label, data]) => ({ label, count: data.count, severity: data.severity }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalPages: total,
    averageScore: avgScore,
    gradeDistribution: gradeDist,
    criticalIssues: critical,
    warnings,
    passedChecks: passed,
    topIssues,
    pages: results,
  };
}
