import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { AdminProvider } from "@/context/AdminContext";
import { ModalProvider } from "@/context/ModalContext";
import { FloatingBackground } from "@/components/FloatingBackground";

// Display — geometric, friendly, superb numerals for scores and clocks.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

// Body — humanist counterpart to Outfit; open apertures, reads small.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Thai coverage. Sits first in the sans stack so Thai never falls back.
const notoThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "KortQ × KD — คิวแบดมินตัน",
  description: "ระบบจัดคิวก๊วนแบด KHONDEE-TEEBAD แบบเรียลไทม์",
  applicationName: "KortQ",
  appleWebApp: {
    capable: true,
    title: "KortQ",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // keep the courtside UI stable — no pinch-zoom drift
  viewportFit: "cover",
  themeColor: "#f4f6ed",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${outfit.variable} ${jakarta.variable} ${notoThai.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-canvas text-ink">
        {/* Ambient layer sits at z-0; all content is lifted above it. */}
        <FloatingBackground />
        <div className="relative z-10 min-h-full">
          <AdminProvider>
            <ModalProvider>{children}</ModalProvider>
          </AdminProvider>
        </div>
      </body>
    </html>
  );
}
