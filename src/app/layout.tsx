import type { Metadata, Viewport } from "next";
import { Anuphan, Fredoka, Mitr } from "next/font/google";
import "./globals.css";
import { AdminProvider } from "@/context/AdminContext";
import { ModalProvider } from "@/context/ModalContext";
import { MotionProvider } from "@/components/MotionProvider";

// Display — Mitr: soft, rounded Thai + Latin with friendly terminals. Carries
// headings, buttons and labels: the "voice" of the club.
const mitr = Mitr({
  variable: "--font-mitr",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

// Body — Anuphan: a modern, very legible Thai text face for names, hints and
// longer copy at small sizes on phones.
const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["thai", "latin"],
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

// Numerals & wordmark — Fredoka: chunky rounded figures for clocks, counts and
// queue numbers, so the scoreboard feels like a game rather than a form.
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
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
    // Light theme: dark status-bar text on a light bar.
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fff9f0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${mitr.variable} ${anuphan.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-cream text-ink">
        {/* Ambient colour + dot texture live in CSS (body::before / ::after);
            all content is lifted above them. */}
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
