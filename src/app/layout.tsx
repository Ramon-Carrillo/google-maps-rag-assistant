import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Set NEXT_PUBLIC_SITE_URL in Vercel to your production URL (e.g.
// https://gmaps.yourdomain.dev). Falls back to localhost for dev so
// metadata.metadataBase doesn't emit warnings in `next build`.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const title = "Google Maps RAG Assistant";
const description =
  "AI-powered developer support for the Google Maps Platform. Every answer is grounded in official documentation with inline citations, code examples, and troubleshooting steps.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: `%s — ${title}`,
  },
  description,
  authors: [{ name: "Ramon Carrillo" }],
  keywords: [
    "Google Maps",
    "Maps JavaScript API",
    "Places API",
    "Routes API",
    "RAG",
    "Claude",
    "pgvector",
    "Next.js",
  ],
  openGraph: {
    type: "website",
    url: siteUrl,
    title,
    description,
    siteName: title,
    images: [
      {
        url: "/hero.png",
        width: 1200,
        height: 630,
        alt: "Google Maps RAG Assistant — chat UI showing a streamed answer with sources panel",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/hero.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/*
        suppressHydrationWarning on <body> silences false-positive warnings
        from browser extensions (Grammarly, LastPass, etc.) that inject
        attributes like `data-gr-ext-installed` before React hydrates.
      */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
