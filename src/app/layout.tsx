import type { Metadata, Viewport } from "next";
import { Geist, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { AdminProvider } from "@/context/AdminContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "KortQ — คิวแบดมินตัน",
  description: "ระบบจัดคิวและจับคู่ผู้เล่นแบดมินตันแบบเรียลไทม์",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // keep the courtside UI stable — no pinch-zoom drift
  themeColor: "#eef2f6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${geistSans.variable} ${notoThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-foreground">
        <AdminProvider>{children}</AdminProvider>
      </body>
    </html>
  );
}
