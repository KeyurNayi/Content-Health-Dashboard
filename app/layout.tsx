import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Content Health Dashboard - Sitecore Marketplace App",
  description:
    "Monitor and improve content quality across your Sitecore XM Cloud site.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
