"use client";

// TEMPORARY visual-verification harness for the redesign (mock data only, no
// Firestore writes). Deleted after screenshots are reviewed.

import { useEffect, useState } from "react";
import type { Court, Match, Player, Profile, Session, Skill } from "@/lib/types";
import { SKILL_SCORE } from "@/lib/types";
import type { ResolvedQueuedGame } from "@/hooks/useKortq";
import { Header } from "@/components/Header";
import { Board, type AppView } from "@/components/Board";
import { PickDock, PickTray } from "@/components/PickDock";
import { LoadingScreen, OfflineScreen } from "@/components/StateScreens";
import { StartSession } from "@/components/StartSession";
import { PinModal } from "@/components/PinModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { MatchHistoryDrawer } from "@/components/MatchHistoryDrawer";
import { PlayerRegistryDrawer } from "@/components/PlayerRegistryDrawer";
import { LaunchCurtain } from "@/components/LaunchCurtain";
import { CloseCurtain } from "@/components/CloseCurtain";
import { IntroCurtain } from "@/components/IntroCurtain";


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

function BoardScene({
  isAdmin,
  view = "courts",
  selectedQ1 = false,
  fillQ2 = false,
  picked = [],
}: {
  isAdmin: boolean;
  view?: AppView;
  selectedQ1?: boolean;
  fillQ2?: boolean;
  picked?: string[];
}) {
  const [activeView, setActiveView] = useState<AppView>(view);
  const selected = new Set(picked);
  return (
    <div className="relative flex min-h-dvh flex-col lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <Header session={session} onEndSession={noop} onOpenHistory={noop} />
      <main className="relative mx-auto flex w-full min-w-0 max-w-[1600px] flex-1 flex-col overflow-x-hidden px-3 pb-32 pt-1 sm:px-5 lg:min-h-0 lg:pb-4 lg:pt-6">
        <Board
          isAdmin={isAdmin}
          activeView={activeView}
          onViewChange={setActiveView}
          courtCount={session.courtCount}
          games={games}
          playersById={byId}
          finishingIds={new Set()}
          onFinish={noop}
          onCancel={noop}
          queue={queue}
          maxQueued={3}
          waiting={waiting}
          resting={resting}
          selectedIds={selected}
          qSel={selectedQ1 ? { queueId: "q1", playerId: "p10" } : null}
          fillQueueId={fillQ2 ? "q2" : null}
          pick={fillQ2 ? { active: true, label: "เติมคิวที่ 2 — แตะเพื่อเพิ่ม (2/4)" } : { active: false, label: null }}
          pairWarn={(ids) => (ids.includes("p9") ? 2 : 0)}
          stats={{ totalPlayers: players.length, playing: 8, gamesPlayed: 12 }}
          onSendQ1={slow}
          onFairQ={noop}
          onRandomQ={noop}
          onToggleFill={noop}
          onDeleteQ={noop}
          onQueuedPlayerTap={noop}
          onRemoveFromQ={noop}
          onCreateFromSelected={noop}
          onPickManually={noop}
          onAddPlayer={async () => true}
          onOpenRegistry={noop}
          onWaitingTap={noop}
          onRest={noop}
          onResume={noop}
          onDelete={noop}
        />
      </main>
      {picked.length > 0 && (
        <PickTray className="sticky bottom-0 z-30 shrink-0 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-5">
          <PickDock
            players={waiting.filter((p) => selected.has(p.id))}
            queueFull={false}
            nextNumber={3}
            maxQueued={3}
            onCreate={noop}
            onGoToGames={noop}
            onClear={noop}
          />
        </PickTray>
      )}
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
      return <BoardScene isAdmin />;
    case "games-member":
      return <BoardScene isAdmin={false} />;
    case "swap":
      return <BoardScene isAdmin selectedQ1 fillQ2 />;
    case "queue":
      return <BoardScene isAdmin view="queue" picked={["w1", "w3"]} />;
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
