import type { Metadata } from "next";
import { Source_Sans_3, Noto_Sans_Ethiopic } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-shop-sans",
  display: "swap",
});

const notoEthiopic = Noto_Sans_Ethiopic({
  subsets: ["ethiopic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-shop-ethiopic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Electronics Shop",
  description: "Browse our electronics products",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${notoEthiopic.variable}`}>
      <body className="min-h-screen bg-[#eaeded] font-shop text-[#0f1111] antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
