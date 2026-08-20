import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Footer from "./components/layout/footer";

const inter = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jonathan Witcoski — Solutions Architect · GIS & Cloud",
  description: "Solutions Architect–track GIS engineer. 15+ years designing enterprise geospatial systems on ArcGIS, AWS, and spatial data platforms for CDC, utilities, and federal agencies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4372859798489282"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={inter.className}>
        {children}
        <Footer/>
      </body>
    </html>
  );
}
