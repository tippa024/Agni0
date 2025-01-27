import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "AI Assistant",
  description: "An intelligent assistant powered by DeepSeek and Tavily",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    title: "AI Assistant",
    description: "An intelligent assistant powered by DeepSeek and Tavily",
    url: "http://localhost:3000",
    siteName: "AI Assistant",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    title: "AI Assistant",
    description: "An intelligent assistant powered by DeepSeek and Tavily",
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <main className="flex flex-col items-center justify-between bg-black">
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}
