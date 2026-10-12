"use client";

// TEMPORARY visual-verification harness for the redesign (mock data only, no
// Firestore writes). Deleted after screenshots are reviewed.

import { useEffect, useState } from "react";
import type { Court, Match, Player, Profile, Session, Skill } from "@/lib/types";
import { SKILL_SCORE } from "@/lib/types";
import type { ResolvedQueuedGame } from "@/hooks/useKortq";
import { Header } from "@/components/Header";
import { StatStrip } from "@/components/StatStrip";
import { SectionHeader } from "@/components/SectionHeader";
import { BottomNav } from "@/components/BottomNav";
import { SelectionBar, SelectionTray } from "@/components/SelectionTray";
import { LoadingScreen, OfflineScreen } from "@/components/StateScreens";
import { CourtCard, FreeSlotCard } from "@/components/CourtCard";
import { NewQueuedGameCard, QueuedGameCard } from "@/components/NextUpCard";
import { QueuePanel } from "@/components/QueuePanel";
import { StartSession } from "@/components/StartSession";
import { PinModal } from "@/components/PinModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { MatchHistoryDrawer } from "@/components/MatchHistoryDrawer";
import { PlayerRegistryDrawer } from "@/components/PlayerRegistryDrawer";
import { LaunchCurtain } from "@/components/LaunchCurtain";
import { CloseCurtain } from "@/components/CloseCurtain";
import { IntroCurtain } from "@/components/IntroCurtain";
import { ShuttleBuddy } from "@/components/art";
import { IconCourt, IconTicket } from "@/components/icons";
import { CARD_DASHED } from "@/components/ui";

const NOW = Date.now();
let order = 0;
function mk(id: string, name: string, skill: Skill, games: number, status: Player["status"] = "waiting", courtId: string | null = null): Player {
  order += 1;
  return {
    id,
    name,
    skill,
    score: SKILL_SCORE[skill],
    status,
    courtId,
    gamesPlayed: games,
    createdAt: NOW - 3_600_000,
    queuedAt: NOW - 600_000 + order * 1000,
    profileId: `pf-${id}`,
  };
}

const P = {
  p1: mk("p1", "บูม", "BG", 3, "playing", "g1"),
  p2: mk("p2", "เอก", "N", 4, "playing", "g1"),
  p3: mk("p3", "แนน", "BG-", 2, "playing", "g1"),
  p4: mk("p4", "ไอซ์", "NB", 1, "playing", "g1"),
  p5: mk("p5", "พี่ต้อม", "BG", 3, "playing", "g2"),
  p6: mk("p6", "น้องมายด์", "BG-", 2, "playing", "g2"),
  p7: mk("p7", "โอ๊ต", "N", 5, "playing", "g2"),
  p8: mk("p8", "ใบเตย", "NB", 0, "playing", "g2"),
  p9: mk("p9", "ก้องภพ ใจดี", "BG", 2),
  p10: mk("p10", "Mild", "BG-", 1),
  p11: mk("p11", "ปาล์มมี่ สุดหล่อ", "N", 3),
  p12: mk("p12", "ฟ้า", "NB", 2),
  p15: mk("p15", "ตั้ม", "BG", 0),
  p16: mk("p16", "เจ", "N", 2),
  w1: mk("w1", "สมชาย", "BG", 1),
  w2: mk("w2", "นิด", "NB", 0),
  w3: mk("w3", "เบียร์", "N", 2),
  w4: mk("w4", "แพรวา", "BG-", 1),
  w5: mk("w5", "จอห์น", "BG", 3),
  r1: mk("r1", "จ๋า", "BG", 1, "resting"),
  r2: mk("r2", "หมูแดง", "BG-", 3, "resting"),
};
const players = Object.values(P);
const byId = new Map(players.map((p) => [p.id, p]));

const games: Court[] = [
  { id: "g1", index: 7, teamA: ["p1", "p2"], teamB: ["p3", "p4"], startedAt: NOW - 6 * 60_000 - 23_000 },
  { id: "g2", index: 8, teamA: ["p5", "p6"], teamB: ["p7", "p8"], startedAt: NOW - 22 * 60_000 - 5_000 },
];
const queue: ResolvedQueuedGame[] = [
  { id: "q1", number: 1, teamA: [P.p9, P.p10], teamB: [P.p11, P.p12], count: 4 },
  { id: "q2", number: 2, teamA: [P.p15], teamB: [P.p16], count: 2 },
];
const waiting = [P.w1, P.w2, P.w3, P.w4, P.w5];
const resting = [P.r1, P.r2];
const session: Session = { active: true, courtCount: 3, createdAt: NOW - 3_600_000, gameQueue: [] };

const matches: Match[] = [
  { id: "m1", courtId: "g0", teamA: ["p1", "p3"], teamB: ["p2", "p9"], players: ["p1", "p3", "p2", "p9"], startedAt: NOW - 50 * 60_000, finishedAt: NOW - 38 * 60_000 },
  { id: "m2", courtId: "g0b", teamA: ["p9", "p10"], teamB: ["w1", "w3"], players: ["p9", "p10", "w1", "w3"], startedAt: NOW - 40 * 60_000, finishedAt: NOW - 25 * 60_000 },
];

const profiles: Profile[] = players.slice(0, 9).map((p, i) => ({
  id: p.profileId as string,
  name: p.name,
  nameKey: p.name.toLowerCase(),
  skill: p.skill,
  visitCount: 12 - i,
  lastCountedSession: 0,
  lastJoinedAt: NOW - i * 86_400_000 * 3,
  createdAt: NOW - 90 * 86_400_000,
}));

const noop = () => {};
const slow = () => new Promise<void>((r) => setTimeout(r, 400000));

function GamesScene({ isAdmin, selectedQ1 = false, fillQ2 = false }: { isAdmin: boolean; selectedQ1?: boolean; fillQ2?: boolean }) {
  const slotsFree = 1;
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div aria-hidden className="court-banner anim-fade" />
      <Header session={session} onEndSession={noop} onOpenHistory={noop} />
      <main className="relative mx-auto flex w-full min-w-0 max-w-[1600px] flex-1 flex-col gap-4 overflow-x-hidden px-3 pb-32 pt-4 sm:px-5">
        <div className="flex items-end justify-between gap-3 px-1 xl:hidden">
          <div className="min-w-0">
            <span className="eyebrow text-ink-3">KD CLUB · LIVE</span>
            <h1 className="anim-status mt-1.5 font-display text-h3 font-semibold leading-none text-ink">
              <span className="marker">สนามวันนี้</span>
            </h1>
          </div>
          <span className="chip anim-status shrink-0 bg-paper py-2 text-ink-2 shadow-[0_2px_0_var(--line-2)] ring-2 ring-inset ring-line">
            <span aria-hidden className="live-dot h-1.5 w-1.5 rounded-full bg-teal" />
            2/3 กำลังเล่น
          </span>
        </div>
        <StatStrip totalPlayers={players.length} waiting={waiting.length} playing={8} games={12} courtsActive={2} totalCourts={3} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
          <div className="flex min-w-0 flex-col gap-3">
            <SectionHeader eyebrow="GAME QUEUE" title="คิวเกม" count={queue.length} of={3} unit="คิว" icon={<IconTicket className="h-5 w-5" />} tone="bg-sun text-ink shadow-[0_3px_0_var(--sun-ledge)]" />
            {queue.map((q, i) => (
              <QueuedGameCard
                key={q.id}
                q={q}
                isAdmin={isAdmin}
                pairWarn={(ids) => (ids.includes("p9") ? 2 : 0)}
                selectedId={selectedQ1 && q.number === 1 ? "p10" : null}
                filling={fillQ2 && q.number === 2}
                canSend={q.number === 1}
                sendBlockedReason={q.number === 1 ? null : null}
                canDraw
                onSend={slow}
                onFair={noop}
                onRandom={noop}
                onToggleFill={noop}
                onDelete={noop}
                onPlayerTap={noop}
                onRemovePlayer={noop}
                index={i}
              />
            ))}
            {isAdmin && (
              <NewQueuedGameCard number={3} canDraw selectedCount={0} onFair={noop} onRandom={noop} onPickManually={noop} onCreateFromSelected={noop} index={2} />
            )}
            {!isAdmin && (
              <div className={`${CARD_DASHED} anim-rise flex flex-col items-center rounded-[26px] px-4 py-7 text-center`}>
                <ShuttleBuddy className="h-12 w-12" mood="sleepy" />
                <p className="mt-3 font-display text-body font-semibold text-ink-2">ยังไม่มีคิวเกม</p>
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <SectionHeader eyebrow="NOW PLAYING" title="กำลังเล่น" count={games.length} of={3} unit="คอร์ต" icon={<IconCourt className="h-5 w-5" />} tone="bg-teal text-ink shadow-[0_3px_0_var(--teal-ledge)]" />
            {games.map((g, i) => (
              <CourtCard key={g.id} court={g} byId={byId} isAdmin={isAdmin} finishing={false} onFinish={noop} onCancel={noop} index={i} />
            ))}
            {Array.from({ length: slotsFree }, (_, i) => (
              <FreeSlotCard
                key={i}
                index={2 + i}
                cta={isAdmin ? { players: [...queue[0].teamA, ...queue[0].teamB], onSend: slow } : null}
                hint={isAdmin ? "เรียกคิวที่ 1 ลงสนามได้เลย" : "รอแอดมินเรียกคิวที่ 1 ลงสนาม"}
              />
            ))}
          </div>
        </div>
      </main>
      <BottomNav active="courts" onChange={noop} waitingCount={waiting.length} gameCount={queue.length} />
    </div>
  );
}

function QueueScene() {
  const selected = new Set(["w1", "w3"]);
  return (
    <div className="relative flex min-h-dvh flex-col">
      <Header session={session} onEndSession={noop} onOpenHistory={noop} />
      <main className="relative mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-3 pb-32 pt-4 sm:px-5">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <span className="eyebrow text-ink-3">KD CLUB · LIVE</span>
            <h1 className="mt-1.5 font-display text-h3 font-semibold leading-none text-ink">
              <span className="marker" style={{ ["--marker" as string]: "var(--teal)" }}>เพื่อนในคิว</span>
            </h1>
          </div>
        </div>
        <QueuePanel
          waiting={waiting}
          resting={resting}
          isAdmin
          selectedIds={selected}
          pickActive={false}
          pickLabel={null}
          onAddPlayer={async () => true}
          onOpenRegistry={noop}
          onToggleSelect={noop}
          onRest={noop}
          onResume={noop}
          onDelete={noop}
        />
      </main>
      <SelectionTray className="sticky bottom-[calc(5.6rem+env(safe-area-inset-bottom))] z-30 shrink-0 px-3 pb-3 sm:px-5">
        <SelectionBar players={[P.w1, P.w3]} queueFull={false} nextNumber={3} maxQueued={3} onCreate={noop} onGoToGames={noop} onClear={noop} />
      </SelectionTray>
      <BottomNav active="queue" onChange={noop} waitingCount={waiting.length} gameCount={queue.length} />
    </div>
  );
}

export default function Preview() {
  const [scene, setScene] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "1") window.localStorage.setItem("kortq_admin", "1");
    else window.localStorage.removeItem("kortq_admin");
    setScene(params.get("s") ?? "games");
  }, []);

  if (!scene) return null;

  switch (scene) {
    case "games":
      return <GamesScene isAdmin />;
    case "games-member":
      return <GamesScene isAdmin={false} />;
    case "swap":
      return <GamesScene isAdmin selectedQ1 fillQ2 />;
    case "queue":
      return <QueueScene />;
    case "start":
      return (
        <div className="flex min-h-dvh flex-col">
          <Header session={null} onEndSession={noop} />
          <StartSession />
        </div>
      );
    case "pin":
      return <PinModal onClose={noop} />;
    case "confirm":
      return <ConfirmModal title="ลบคิวที่ 2?" message="ผู้เล่นในคิวนี้จะกลับไปอยู่ในคิวรอตามตำแหน่งเดิม คิวถัดไปจะเลื่อนขึ้นมาแทน" confirmLabel="ลบคิว" tone="danger" onConfirm={noop} onCancel={noop} />;
    case "confirm2":
      return <ConfirmModal title="จับแฟร์คิวที่ 1 ใหม่?" message="คนในคิวนี้จะถูกปล่อยให้ระบบเลือกใหม่ อาจได้ชุดเดิมหากยังเหมาะสมที่สุด" confirmLabel="จับแฟร์ใหม่" onConfirm={noop} onCancel={noop} />;
    case "history":
      return (
        <div className="min-h-dvh">
          <MatchHistoryDrawer open onClose={noop} matches={matches} players={players} playersById={byId} session={session} courts={games} />
        </div>
      );
    case "registry":
      return (
        <div className="min-h-dvh">
          <PlayerRegistryDrawer open onClose={noop} profiles={profiles} sessionProfileIds={new Set(["pf-p1", "pf-p2"])} sessionCreatedAt={0} />
        </div>
      );
    case "launch":
      return <LaunchCurtain courtCount={3} status="opening" origin={{ x: 200, y: 700 }} onRetry={noop} />;
    case "launch-ready":
      return <LaunchCurtain courtCount={2} status="ready" origin={{ x: 200, y: 700 }} onRetry={noop} />;
    case "close":
      return <CloseCurtain courtCount={3} status="done" origin={{ x: 340, y: 30 }} onRetry={noop} />;
    case "intro":
      return <IntroCurtain onSkip={noop} />;
    case "loading":
      return (
        <div className="flex min-h-dvh flex-col">
          <Header session={null} onEndSession={noop} />
          <LoadingScreen />
        </div>
      );
    case "offline":
      return (
        <div className="flex min-h-dvh flex-col">
          <Header session={null} onEndSession={noop} />
          <OfflineScreen message="เชื่อมต่อฐานข้อมูลไม่สำเร็จ — ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่" onRetry={noop} />
        </div>
      );
    case "debug":
      return (
        <p className="p-6 text-h2">
          inner={typeof window !== "undefined" ? window.innerWidth : 0} client=
          {typeof document !== "undefined" ? document.documentElement.clientWidth : 0} dpr=
          {typeof window !== "undefined" ? window.devicePixelRatio : 0}
        </p>
      );
    default:
      return <p>unknown scene</p>;
  }
}
