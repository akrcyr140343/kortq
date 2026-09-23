import type { Metadata, Viewport } from "next";
import { Bai_Jamjuree, IBM_Plex_Sans_Thai, Sora } from "next/font/google";
import "./globals.css";
import { AdminProvider } from "@/context/AdminContext";
import { ModalProvider } from "@/context/ModalContext";
import { FloatingBackground } from "@/components/FloatingBackground";
import { MotionProvider } from "@/components/MotionProvider";

// Numerals — Sora's geometric figures give scores, clocks and counts a sporty,
// slightly technical character while staying legible as tabular numbers.
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

// Body & UI — IBM Plex Sans Thai: an engineered, modern face that keeps Thai
// crisp and highly readable at UI sizes while feeling more designed than a
// neutral system face. The workhorse for labels, chips, buttons and prose.
const bodyThai = IBM_Plex_Sans_Thai({
  variable: "--font-body-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

// Display — Bai Jamjuree: a sporty, semi-technical Thai/Latin face with a real
// italic, so headings and eyebrows carry a dynamic, athletic voice that reads
// distinctly from the calmer body.
const displayThai = Bai_Jamjuree({
  variable: "--font-display-thai",
  subsets: ["thai", "latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
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
  viewportFit: "cover",
  themeColor: "#f4f6ed",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${sora.variable} ${bodyThai.variable} ${displayThai.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-canvas text-ink">
        {/* Court and athletes are separate presentation layers: the court is
            completely still while each mascot gets its own ambient motion. */}
        <div aria-hidden className="court-artwork" />
        <div aria-hidden className="court-mascot court-mascot-female" />
        <div aria-hidden className="court-mascot court-mascot-male" />
        {/* Ambient layer sits at z-0; all content is lifted above it. */}
        <FloatingBackground />
        <div className="relative z-10 min-h-full">
          {/* Framer follows the OS "reduce motion" setting; CSS does the same in globals.css. */}
          <MotionProvider>
            <AdminProvider>
              <ModalProvider>{children}</ModalProvider>
            </AdminProvider>
          </MotionProvider>
        </div>
      </body>
    </html>
  );
}
