import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google"; // Modern sports typography
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: "Crick Matcher | Next-Gen Cricket Intelligence",
  description: "Professional-grade cricket scoring, professional match scheduling, and deep performance analytics for the modern era.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${outfit.variable}`}>
      <body className={`${inter.className} min-h-screen flex flex-col antialiased selection:bg-primary selection:text-white`} suppressHydrationWarning>
        <Navbar />
        <main className="flex-grow pt-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
