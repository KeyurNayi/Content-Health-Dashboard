/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Sitecore Marketplace SDK iFrame embedding
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Allow embedding in Sitecore XM Cloud iframes
          { key: "X-Frame-Options", value: "ALLOWALL" },
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://*.sitecorecloud.io https://*.sitecore.com https://pages.sitecorecloud.io;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
