/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // ── Remove X-Frame-Options completely ──────────────────────────────
          // X-Frame-Options: ALLOWALL is deprecated and ignored by modern browsers.
          // Sitecore uses CSP frame-ancestors instead. Having both can conflict.
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },

          // ── CSP: Allow Sitecore to embed this app in an iframe ─────────────
          // Must include ALL Sitecore portal domains that can open this app.
          {
            key: "Content-Security-Policy",
            value: [
              "frame-ancestors",
              "'self'",
              "https://*.sitecorecloud.io",
              "https://*.sitecore.com",
              "https://*.sitecore.net",
              "https://portal.sitecorecloud.io",
              "https://pages.sitecorecloud.io",
              "https://xmc-*.sitecorecloud.io",
              "https://cm.*.sitecorecloud.io",
              "https://*.vercel.app",
            ].join(" "),
          },

          // ── Allow cross-origin requests from Sitecore ──────────────────────
          { key: "Access-Control-Allow-Origin",  value: "https://portal.sitecorecloud.io" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
