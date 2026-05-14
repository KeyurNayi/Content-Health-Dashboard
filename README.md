# 🏥 SiteElevate
### A Sitecore AI Marketplace Custom App

Monitor and improve content quality, SEO health, and accessibility across your XM Cloud site — directly inside Sitecore.

---

## 📋 What This App Does

This Marketplace app gives Sitecore editors and developers a **real-time content health score** for every page, checking:

| Check | What It Validates |
|---|---|
| ✅ Meta Title | Presence, length (50–60 chars optimal) |
| ✅ Meta Description | Presence, length (150–160 chars optimal) |
| ✅ H1 Heading | Presence and reasonable length |
| ✅ Image Alt Text | All images have descriptive alt text |
| ✅ Content Length | Minimum word count for SEO value |
| ✅ Canonical Tag | Prevents duplicate content penalties |
| ✅ Internal Links | Site structure and navigation quality |

---

## 🧩 Extension Points

This app registers in **3 places** inside Sitecore:

| Extension Point | Where It Appears | Use Case |
|---|---|---|
| **Dashboard Widget** | XM Cloud home dashboard | Quick site overview |
| **Pages Context Panel** | Right panel in Page Builder | Per-page live check |
| **Fullscreen / Standalone** | XM Cloud navigation bar | Full audit with charts |

---

## 🚀 Step-by-Step: Run Locally

### Prerequisites

- Node.js 18+ (`node -v`)
- npm or yarn
- A Sitecore XM Cloud / SitecoreAI account (for live data)
- The app works in **demo mode** without a Sitecore connection

### Step 1: Clone or Download This Project

```bash
# If you downloaded a ZIP, extract it first
cd content-health-dashboard

# Or clone from your repo:
git clone <your-repo-url>
cd content-health-dashboard
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SITECORE_GRAPHQL_ENDPOINT=https://xmcloudcm.localhost/sitecore/api/authoring/graphql/v1
NEXT_PUBLIC_SITE_NAME=website
NEXT_PUBLIC_LANGUAGE=en
```

> **Note:** For local testing, you don't need real values. The app will use demo data automatically.

### Step 4: Run the Development Server

```bash
npm run dev
```

Open your browser:
- **Full Dashboard:** http://localhost:3000/standalone
- **Dashboard Widget:** http://localhost:3000/dashboard-widget
- **Context Panel:** http://localhost:3000/pages-context-panel

---

## 🌐 Step-by-Step: Deploy to Vercel

This app must be **hosted by you** — Sitecore does not host Marketplace apps.

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "feat: SiteElevate Marketplace App"
git remote add origin https://github.com/YOUR_USERNAME/content-health-dashboard.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Framework: **Next.js** (auto-detected)
4. Add Environment Variables from your `.env.local`
5. Click **Deploy**
6. Note your deployment URL: `https://content-health-dashboard-xxx.vercel.app`

---

## 🎯 Step-by-Step: Register in Sitecore Developer Studio

### Step 1: Open Developer Studio

1. Log in to [portal.sitecorecloud.io](https://portal.sitecorecloud.io)
2. Go to **Apps** → **Developer Studio**

### Step 2: Create a New App

1. Click **"Create App"**
2. Fill in the details:
   - **Name:** SiteElevate
   - **Description:** Monitor content quality, SEO, and accessibility across your XM Cloud site.
   - **App URL:** `https://your-app.vercel.app`
3. Click **Save**

### Step 3: Add Extension Points

Add the following 3 extension points:

**Extension Point 1 — Dashboard Widget:**
- Type: `Dashboard Widget`
- URL: `https://your-app.vercel.app/dashboard-widget`
- Label: `Content Health`

**Extension Point 2 — Pages Context Panel:**
- Type: `Pages Context Panel`
- URL: `https://your-app.vercel.app/pages-context-panel`
- Label: `Content Health`

**Extension Point 3 — Fullscreen:**
- Type: `Fullscreen`
- URL: `https://your-app.vercel.app/standalone`
- Label: `Health Dashboard`

### Step 4: Configure API Access (for live data)

1. In Developer Studio, go to **API Access**
2. Enable:
   - ✅ Authoring and Management GraphQL API
   - ✅ XM Apps REST API (Pages)
3. Click **Save**
4. Copy the **Client ID** → add to `.env.local` as `MARKETPLACE_CLIENT_ID`

### Step 5: Install the App in Your Organization

1. Go back to **Apps** → **Marketplace**
2. Find your app under **Custom Apps**
3. Click **Install**
4. Select your XM Cloud environment
5. Click **Confirm**

---

## ✅ Step-by-Step: Verify in Sitecore UI

### Verify Dashboard Widget
1. Open SitecoreAI / XM Cloud
2. Go to **Dashboard** (home screen)
3. Click **"Add Widget"** → find **Content Health**
4. The widget should appear with your site's scores

### Verify Pages Context Panel
1. Open any page in **Page Builder**
2. Look for **"Content Health"** in the right-side panel
3. It should show the health score for the page you are editing

### Verify Fullscreen View
1. In the XM Cloud top navigation bar
2. Find **"Health Dashboard"** in the apps list
3. Click it → opens full audit view

---

## 🔌 Connecting to Live Sitecore Data

The app uses **demo data** by default. To connect to your real XM Cloud:

### 1. Get Your GraphQL Endpoint

In XM Cloud Deploy:
- Go to your **Environment** → **Details**
- Copy the **Content Management URL**
- Your GraphQL endpoint: `{CM_URL}/sitecore/api/authoring/graphql/v1`

### 2. Update the API Client

In `src/lib/sitecoreApi.ts`, the `fetchPagesFromXMCloud` function is ready.
The Marketplace SDK handles authentication automatically:

```typescript
// In your extension point page:
import { createClient } from "@sitecore-marketplace-sdk/client";
import { fetchPagesFromXMCloud } from "@/lib/sitecoreApi";

const client = createClient();
const token = await client.getToken(); // SDK handles auth
const pages = await fetchPagesFromXMCloud(token, "your-site-name");
```

### 3. Ensure Your GraphQL Template Has These Fields

Make sure your XM Cloud page templates include:
- `MetaTitle` or `Title` field
- `MetaDescription` or `Description` field
- `Heading` or `H1` field
- Image fields (Sitecore image XML format)
- `CanonicalUrl` field (optional)

---

## 📁 Project Structure

```
content-health-dashboard/
├── app/
│   ├── dashboard-widget/page.tsx     ← Dashboard Widget extension point
│   ├── pages-context-panel/page.tsx  ← Pages Context Panel extension point
│   ├── standalone/page.tsx           ← Fullscreen / Standalone view
│   └── layout.tsx / globals.css      ← Root layout and styles
│
├── src/
│   ├── lib/
│   │   ├── healthScorer.ts           ← Core scoring engine (7 checks)
│   │   └── sitecoreApi.ts            ← XM Cloud GraphQL client + demo data
│   └── components/
│       ├── ScoreRing.tsx             ← Animated circular score indicator
│       └── StatusIcon.tsx            ← Pass/Warn/Fail icons
│
├── marketplace-app-config.json       ← App registration config reference
├── .env.example                      ← Environment variables template
├── next.config.js                    ← iframe CSP headers for Sitecore
└── package.json
```

---

## 🛠 Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 14 (App Router) | Framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Recharts | Charts (bar, radar) |
| @sitecore-marketplace-sdk/client | SDK auth + communication |
| @sitecore-marketplace-sdk/xmc | XM Cloud API access |
| Vercel | Hosting |

---

## 📝 Blog Post Notes

If you are writing a blog post about this app, here are the key technical highlights:

1. **CSP Headers** in `next.config.js` — critical for iframe embedding in Sitecore
2. **Three extension points** — one app, three UI contexts
3. **Scoring algorithm** — weighted scoring across 7 checks
4. **Demo mode** — `getDemoPageData()` fallback means it works without a live Sitecore connection
5. **No hardcoded auth** — the Marketplace SDK handles all token management
6. **GraphQL query** — uses the Authoring API, not the Delivery API

---

## 🤝 Contributing

Pull requests welcome! Ideas for future checks:
- Broken internal link detection (requires crawling)
- Duplicate meta description detection across pages
- OpenGraph tag validation
- Schema.org structured data check
- Page load speed integration (Core Web Vitals)

---

*Built for the Sitecore AI Marketplace — Custom App Category*
