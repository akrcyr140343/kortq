import { ShuttleBuddy } from "./art";

/** First load: the shuttle buddy bounces on the spot while Firestore connects. */
export function LoadingScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16" role="status" aria-live="polite">
      <div className="relative h-24 w-20">
        <span className="anim-hop absolute inset-x-0 bottom-3 flex justify-center">
          <ShuttleBuddy className="h-16 w-16" />
        </span>
        <span className="anim-hop-shadow absolute bottom-0 left-1/2 -ml-6 h-2.5 w-12 rounded-full bg-ink/30" />
      </div>
      <span className="font-display text-body font-medium text-ink-2">กำลังเตรียมสนาม…</span>
    </div>
  );
}

/** Firestore could not be reached (or took too long). */
export function OfflineScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="card anim-rise relative w-full max-w-sm rounded-[30px] p-7 text-center">
        <span className="relative mx-auto block w-fit">
          <ShuttleBuddy className="h-16 w-16" mood="wow" />
          <span className="sticker absolute -right-3 -top-2 grid h-7 w-7 place-items-center rounded-full bg-tomato text-white ring-2 ring-paper">
            <span className="font-num text-body font-bold leading-none">!</span>
          </span>
        </span>
        <span className="mt-4 block font-display text-caption font-semibold text-tomato-deep">เชื่อมต่อไม่สำเร็จ</span>
        <h2 className="mt-2 font-display text-h3 font-semibold leading-tight text-ink">ตอนนี้ออฟไลน์อยู่</h2>
        <p className="mt-2 text-body text-ink-2">{message}</p>
        <button type="button" onClick={onRetry} className="btn btn-sun mt-6 h-12 w-full rounded-2xl">
          ลองใหม่อีกครั้ง
        </button>
      </div>
    </div>
  );
}
