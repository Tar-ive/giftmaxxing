import type { Metadata } from "next";
import { Hanken_Grotesk, Instrument_Serif, Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Giftmaxxing — gifting, finally figured out",
  description:
    "The social gifting app with an AI companion. Discover finds from friends, build wishlists nobody double-buys, pool money for group gifts, and let Maxi find the perfect gift in your budget.",
  openGraph: {
    title: "Giftmaxxing — gifting, finally figured out",
    description:
      "Discover gift finds from friends, build shared wishlists, pool money for group gifts, and let Maxi—your AI gift companion—nail the perfect present every time.",
    type: "website",
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
      className={`${hanken.variable} ${instrument.variable} ${bricolage.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
