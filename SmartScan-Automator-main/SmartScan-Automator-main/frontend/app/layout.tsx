import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SmartScan — Akıllı Fiyat Karşılaştırma",
  description:
    "Türkiye'nin 7 büyük e-ticaret sitesinden anlık fiyat karşılaştırma. Trendyol, Hepsiburada, Amazon, n11, MediaMarkt, Vatan ve Teknosa'da en ucuz ürünü bulun.",
  keywords: "fiyat karşılaştırma, en ucuz, trendyol, hepsiburada, amazon, n11, mediamarkt",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[var(--font-inter)]">
        {children}
      </body>
    </html>
  );
}
