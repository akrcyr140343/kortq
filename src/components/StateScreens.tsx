import { CourtArt, ShuttleBuddy } from "./art";

/** First load: the court draws itself while the shuttle bounces above it. */
export function LoadingScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16" role="status" aria-live="polite">
      <div className="relative w-44">
        <CourtArt lit draw />
        <span
          className="anim-bob absolute left-1/2 top-[-30%] -ml-6"
          style={{ ["--bob-y" as string]: "-14px", ["--bob-r" as string]: "14deg", ["--bob-d" as string]: "1.2s" }}
        >
          <ShuttleBuddy className="h-12 w-12" />
        </span>
      </div>
      <span className="display text-body text-ink-2">กำลังเตรียมสนาม…</span>
    </div>
  );
}

/** Firestore could not be reached (or took too long). */
export function OfflineScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="anim-rise relative w-full max-w-sm rounded-[36px] bg-paper p-7 text-center shadow-lift">
        <span className="relative mx-auto block w-fit">
          <ShuttleBuddy className="h-16 w-16" mood="wow" />
          <span className="absolute -right-3 -top-2 grid h-7 w-7 place-items-center rounded-full bg-danger-deep text-white ring-2 ring-paper">
            <span className="num text-body leading-none">!</span>
          </span>
        </span>
        <span className="eyebrow mt-5 block text-danger-deep">เชื่อมต่อไม่สำเร็จ</span>
        <h2 className="display mt-2 text-h3 leading-tight text-ink">ตอนนี้ออฟไลน์อยู่</h2>
        <p className="mt-2 text-body text-ink-2">{message}</p>
        <button type="button" onClick={onRetry} className="btn btn-ink mt-6 h-12 w-full">
          ลองใหม่อีกครั้ง
        </button>
      </div>
    </div>
  );
}
