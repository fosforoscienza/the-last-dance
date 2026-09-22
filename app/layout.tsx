import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import Footer from "@/components/Footer";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "900"], variable: "--font-poppins" });

export const metadata: Metadata = {
  title: "The LAST Dance",
  description: "The LAST Dance — punti e ticket",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#5A0E18",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={poppins.variable}>
      <body>
        <div className="bg-drawing" aria-hidden />
        <div className="bg-overlay" aria-hidden />
        <div className="app">
          <main className="main">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
