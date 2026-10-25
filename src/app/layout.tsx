import type { Metadata, Viewport } from "next";
import { Anuphan, Bricolage_Grotesque, Kanit } from "next/font/google";
import "./globals.css";
import { AdminProvider } from "@/context/AdminContext";
import { ModalProvider } from "@/context/ModalContext";
import { MotionProvider } from "@/components/MotionProvider";

// Display — Kanit: bold, sporty Thai + Latin for headings, buttons and names.
const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

// Body — Anuphan: a modern, very legible Thai text face for hints and
// longer copy at small sizes on phones.
const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["thai", "latin"],
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

// Numerals & wordmark — Bricolage Grotesque: chunky, characterful figures
// for scores, clocks, queue numbers and the giant board typography.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
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
  themeColor: "#fcf8f1",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${kanit.variable} ${anuphan.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-canvas text-ink">
        {/* The chalk court + light pools live in CSS (body::before / ::after);
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
