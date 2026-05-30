import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AR-Stream - Movies, TV Shows & Anime Streaming Aggregator",
  description: "Discover and explore movies, TV series, and anime from around the world. AR-Stream aggregates content from TMDB, MyAnimeList, and more.",
  keywords: ["AR-Stream", "movies", "TV shows", "anime", "streaming", "entertainment", "TMDB", "MyAnimeList"],
  authors: [{ name: "AR-Stream" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "AR-Stream",
    description: "Movies, TV Shows & Anime Streaming Aggregator",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=3" />
        <link rel="icon" type="image/svg+xml" href="/logo.svg?v=3" sizes="any" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=3" />
        <meta name="theme-color" content="#e85d04" />
        {/* Apply color theme BEFORE React hydration to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ar-stream-color-theme');if(t&&t!=='default'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}/* Force favicon refresh */try{var links=document.querySelectorAll('link[rel*="icon"]');links.forEach(function(l){var u=l.href.split('?')[0]+'?v='+Date.now();l.href=u})}catch(e){}/* Register Service Worker for PWA */if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').then(function(reg){console.log('SW registered:',reg.scope)}).catch(function(err){console.log('SW registration failed:',err)})})}})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
