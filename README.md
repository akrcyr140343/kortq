# KortQ 🏸

ระบบจัดคิวและจับคู่ผู้เล่นแบดมินตันแบบเรียลไทม์ ใช้งานข้างสนาม

- **iPad (แนวนอน)** วางข้างสนาม → แอดมินจัดการคิว
- **มือถือสมาชิก (แนวตั้ง)** → ดูคิวอย่างเดียว (read-only)

ทุกการเปลี่ยนแปลงซิงก์ทุกหน้าจอทันทีผ่าน Firebase Firestore โดยไม่ต้องรีเฟรช

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Firebase Firestore

## เริ่มใช้งาน (development)

```bash
npm install
npm run dev
```

เปิด http://localhost:3000

> หมายเหตุ (เครื่องนี้): Node ติดตั้งอยู่ที่ `C:\Program Files\nodejs` แต่ไม่ได้อยู่ใน PATH
> ของ shell — สั่ง `$env:Path = "C:\Program Files\nodejs;" + $env:Path` ก่อน (PowerShell)

## ตั้งค่า Firebase

ค่าคอนฟิกอยู่ใน `.env.local` (ไม่ถูก commit) — ตัวแปร `NEXT_PUBLIC_FIREBASE_*` ทั้ง 6 ตัว
ถูกอ่านใน [`src/lib/firebase.ts`](src/lib/firebase.ts)

## วิธีใช้

1. **ปลดล็อคแอดมิน** — กดปุ่มขวาบน ใส่ PIN `1234`
2. **เริ่ม Session** — เลือก 2 หรือ 3 คอร์ต
3. **เพิ่มผู้เล่น** — ใส่ชื่อ + เลือกระดับฝีมือ NB/BG/N/S (คะแนน 1/2/3/4)
4. **จับคู่**
   - **อัตโนมัติ** — กด "จับอัตโนมัติ" บนคอร์ตว่าง → ระบบดึง 4 คนแรกในคิว
     แล้วแบ่งสองทีมให้คะแนนรวมสูสีที่สุด
   - **เอง (Manual)** — แตะเลือกผู้เล่น 2–4 คนในคิว แล้วกด "ลงคอร์ตนี้"
     บนคอร์ตว่าง (ใช้การแตะ ไม่ใช้ HTML5 Drag & Drop เพื่อรองรับ iPad Safari)
5. **จบเกม** — คืนผู้เล่นทุกคนกลับไปต่อท้ายคิว "รอ"
6. **พัก / กลับเข้าคิว / ลบ** — จัดการผู้เล่นรายคน
7. **จบ Session** — ล้างผู้เล่นและคอร์ตทั้งหมด

## โครงสร้างข้อมูล (Firestore)

```
sessions/current                       → { active, courtCount, createdAt }
sessions/current/players/{id}          → { name, skill, score, status, courtId, gamesPlayed, createdAt, queuedAt }
sessions/current/courts/{id}           → { index, teamA[], teamB[], startedAt }
sessions/current/matches/{id}          → { courtId, teamA[], teamB[], players[], startedAt, finishedAt }
```

- `matches` = ประวัติเกมที่จบแล้วในเซสชัน (บันทึกตอน "จบเกม", ล้างตอน "จบ Session")
  ใช้โดยปุ่ม **"จับแฟร์"** เพื่อลดการเจอผู้เล่น/คู่เดิมซ้ำ

- `status`: `waiting` | `playing` | `resting`
- คิวเรียงตาม `queuedAt` (เข้าใหม่หรือจบเกมแล้วต่อท้ายคิว = ยุติธรรมตามลำดับการรอ)

## สถาปัตยกรรมโค้ด

| ไฟล์ | หน้าที่ |
| --- | --- |
| `src/lib/firebase.ts` | เริ่มต้น Firebase + Firestore |
| `src/lib/types.ts` | Type ของ Player / Court / Session |
| `src/lib/matchmaking.ts` | อัลกอริทึมแบ่งทีมให้สูสี |
| `src/lib/db.ts` | อ่าน/เขียน Firestore + subscription แบบเรียลไทม์ |
| `src/hooks/useKortq.ts` | รวม subscription ทั้งหมดเป็น state เดียว |
| `src/context/AdminContext.tsx` | สถานะแอดมิน + PIN (เก็บใน localStorage) |
| `src/components/*` | UI ทั้งหมด (dark, touch-friendly) |

## ⚠️ ความปลอดภัย

แอปนี้ **ไม่มี Firebase Auth** — PIN แอดมินตรวจฝั่ง browser เท่านั้น
ดังนั้น `firestore.rules` เปิดให้อ่าน/เขียนได้ทั้งหมด เหมาะกับการใช้ในกลุ่มที่ไว้ใจกันข้างสนาม
หากจะเปิดสาธารณะ ควรเพิ่ม Firebase Auth แล้วจำกัดสิทธิ์เขียนเฉพาะแอดมิน
