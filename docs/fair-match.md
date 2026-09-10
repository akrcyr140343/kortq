# Fair Match (fair-v3) — behavior และคู่มือทดสอบด้วยมือ

สถานะเอกสาร: fair-v3 ใน working tree ผ่าน typecheck/lint แล้ว ยังไม่ได้ build/browser test หรือ deploy

## กติกาที่ใช้

1. ใช้เฉพาะ Court Fair และ Next Up Fair; manual/random ยังเลือกและแบ่งทีมด้วย behavior เดิม
2. **fair-v3:** `Player.fairSkips` เปลี่ยนเฉพาะตอน **เริ่มเกมจริง (`startGame`)** เท่านั้น ไม่ใช่ตอน Fair decision — เพื่อให้ skip สะท้อน "การพลาดโอกาสลงเล่นจริง" ไม่ใช่จำนวนครั้งที่กด Fair (ค่าที่ไม่มี = 0)
3. เมื่อเริ่มเกม: 4 คนที่เริ่มเล่น reset `fairSkips = 0`; คนที่ ณ ตอนนั้น eligible+waiting แต่ไม่ได้ลงเกมนี้ +1; ไม่เปลี่ยน `gamesPlayed`
4. Resting / playing คอร์ตอื่น / คนที่ถูก Next Up จอง — ไม่ถูกนับ +1 และไม่ถูก reset ตอน startGame
5. Fair decision / reroll / Next Up stage / promote / manual / random / substitute **ไม่เปลี่ยน `fairSkips`** (การ reset ย้ายไป startGame); `finishGame` และ cancel ก่อนเริ่มเกมก็ไม่เปลี่ยน
6. `fairSkips >= 2` ต้องอยู่ในกลุ่มบังคับเลือกก่อน Variety ถ้าเกิน 4 คน เรียง skip มากก่อน → queuedAt เก่าก่อน → Player ID เพื่อให้ tie คงที่
7. `fairLogs.skipTransitions` คงไว้ตาม schema (`size == pool.size`) แต่ทุกรายการเป็น no-op: `before == after`, `action = "unchanged"` — log ไม่อ้างว่ามี increment/reset ที่ไม่ได้เกิดจริง (การเปลี่ยน skip ที่ startGame ยังไม่มี historical audit log)
8. ไม่มี MAX_POOL และไม่มี gamesPlayed eligibility gate

> หมายเหตุ: fair-v3 นับ skip ตอน `startGame` ทุก scenario ด้านล่างจึงระบุขั้น "เริ่มเกม" ให้ชัดว่า skip ขยับตอนไหน

## Relationship และ recency

เก็บความถี่ทั้ง session แยก coPlayer / teammate / opponent โดยใช้คู่ที่ไม่เรียงทิศทาง

`pairCost = lifetimeCount + max(0, 3 - age)^2`

- คู่ที่ไม่เคยเกิด: 0
- `age` คือจำนวนเกมที่ผู้เล่นแต่ละคนเล่นแทรกตั้งแต่เจอกันครั้งล่าสุดในบทบาทนั้น แล้วใช้ค่าของคนที่เล่นแทรกน้อยกว่า
- หนึ่ง occurrence มีค่า 10 / 5 / 2 / 1 เมื่อทั้งคู่มีเกมแทรกอย่างน้อย 0 / 1 / 2 / 3 เกมตามลำดับ
- หลาย occurrence เพิ่ม lifetimeCount ตามจริง; recent bonus มาจากครั้งล่าสุดหนึ่งครั้ง
- เกมในคอร์ตอื่นที่ไม่มีผู้เล่นคู่นี้ไม่ทำให้ age เพิ่ม
- นับ personal appearances จาก history/stable identity ไม่ใช้ gamesPlayed ซึ่งอาจ reset เมื่อ re-add
- ไม่มี hard ban: overdue สามารถบังคับให้เลือกคู่เก่าได้ และ pool จำกัดยังเลือกได้เสมอเมื่อมี 4 คนที่ข้อมูลถูกต้อง
- ความสัมพันธ์เก่าไม่เป็นศูนย์ แม้ session เกิน 20/40 เกม

ในชุดที่ผ่าน forced membership เลือก coPlayer รวมทั้ง 6 คู่น้อยที่สุด → ผลรวม queuedAt น้อยที่สุด (รอนานกว่า) → ผลรวม gamesPlayed น้อยที่สุด → ลำดับ Player IDs

ไม่มี waiting weight/cap, games weight หรือ sameFoursome penalty; waiting/games เป็น tie-break ส่วนการป้องกัน starvation ใช้ state จริง

แบ่งทีม: ลองทั้ง 3 split → ตัด split ที่ `skillDiff > bestSkillDiff + 2` → repeat teammate + repeat opponent ต่ำสุด → skillDiff ต่ำสุด → option index คงที่ Teammate/opponent ให้ค่าเท่ากันต่อหนึ่งคู่ (2 teammate pairs และ 4 opponent pairs)

## ข้อมูลและความสอดคล้อง

- ทุก action ที่เปลี่ยน Fair input เพิ่ม `fairRevision` ใน write ชุดเดียวกัน: เพิ่ม/ลบ player, พัก/กลับเข้าคิว, ลง/ยกเลิก/เริ่ม/จบคอร์ต, swap/substitute, ทุกการแก้ Next Up/promote และ successful Fair decision
- เปิด/ปิด session รวมการล้าง players/courts/history และเขียน session/revision ใน batch เดียว ไม่เปิดช่องให้ Fair เห็นประวัติที่ล้างแล้วแต่ session ยัง active อยู่
- การชำระเงินและแก้ Profile ที่ไม่เปลี่ยนผู้เล่นใน session ไม่เพิ่ม revision; payment ใช้ update เพื่อไม่สร้าง player ที่ถูกลบกลับมาจากหน้าจอเก่า
- Fair อ่าน session จาก server ก่อน แล้วอ่าน players/courts/history จาก server; ไม่ยอมรับ snapshot ที่ยังมี pending local writes และคำนวณ decision ก้อนเดียว
- Transaction ตรวจ session revision/identity/reservation และข้อมูลของ players/courts ทั้งชุดก่อนเขียน assignment; fair-v3 assignment เขียนเฉพาะทีม/สถานะ ไม่แตะ fairSkips (skipTransitions ใน log เป็น no-op)
- ถ้าข้อมูลที่เกี่ยวข้องเปลี่ยนก่อน commit ให้ abort และขอให้กดใหม่ ไม่เขียน assignment หรือสร้าง success log จาก decision ที่ abort
- `startGame` เป็นจุดเดียวที่เปลี่ยน fairSkips: pin `fairRevision` จาก server ก่อน tx แล้วอ่าน players ทั้งชุดใน tx; ถ้า revision ไม่ตรง → abort ด้วย START_STALE (ครอบคลุม retry ไม่ใช้ snapshot เก่า); reset 4 คนที่เริ่ม = 0, +1 คน eligible+waiting ที่ไม่ได้ลง (ยกเว้น resting/คอร์ตอื่น/Next Up reserved); double-tap เกมที่เริ่มแล้ว = no-op
- Next Up โหลดคิว/history ใหม่หลัง modal ยืนยัน และตรวจว่ารายการที่ยืนยันให้แทนที่ยังไม่เปลี่ยน
- UI กัน Fair กดซ้อนในเครื่องเดียว; transaction ตรวจ Fair ที่แข่งกันระหว่างเครื่อง
- `profileId` เป็น stable identity; Match ใหม่เก็บ `teamAIdentities/teamBIdentities` ติดไปด้วย
- Match เก่าที่มีเพียง Player IDs ใช้ current players และ `session.fairPlayerIdentities` เชื่อมตัวตน; บันทึก alias ก่อนลบ player และตอน Fair สำเร็จ
- ไม่แก้ gamesPlayed semantics: re-add จาก Profile เริ่ม gamesPlayed = 0 ตามเดิม แต่ relationship memory ยังคงอยู่
- Manual/random/swap ไม่มี history avoidance; เพิ่มเพียง revision metadata และไม่เปลี่ยน fairSkips (reset ย้ายไป startGame)

## Logs

`fairLogs/{decisionId}` หนึ่งใบหลัง successful assignment/staging; best effort และไม่รอ log ก่อนคืน success ให้ UI

มี algorithmVersion/schemaVersion แยกกัน, parameters, server createdAt, sessionCreatedAt, client snapshot/decision/ack times, revision ก่อน/หลัง, eligible pool ที่มี score/identity/skip/queuedAt, excluded reasons, forced/overdue IDs, skip transitions, chosen four, top 5 alternatives (ถ้ามี), ทั้ง 3 split พร้อม skill guard และ chosen flag

`pairInputs` เก็บ count/age/recentBonus/total ของทุกคู่ที่เกี่ยวข้องใน pool โดยคู่หรือ role ที่ไม่อยู่ในรายการหมายถึง 0 จึงคำนวณคะแนนใหม่ของทุก foursome/split หลังปิด session ได้ เก็บ aggregate ครั้งเดียว ไม่คัดลอกต่อ alternative และไม่เก็บรายการ ID ของทุกเกมซ้ำกับ aggregate; `lastMatchId` ของ role ที่เกิดแล้วช่วยอ้างกลับเมื่อประวัติยังอยู่ `exactFoursomeInputs` เป็น diagnostic ไม่มีผลต่อ ranking

`candidateCount` นับ combinations ที่ผ่าน forced membership เท่านั้น; top alternatives ต้องผ่านข้อบังคับเดียวกับผู้ชนะ ไม่เก็บตัวเลือกที่ข้ามคนซึ่งบังคับเลือกอยู่แล้ว

Rules ใหม่ให้ browser create เท่านั้น ไม่ให้อ่าน/update/delete; ใช้ Firebase Console ใน Phase 1 ไม่มี TTL และไม่สร้าง matchArchive Index config ปิด automatic indexes ของ payload โดยเหลือ createdAt/sessionCreatedAt สำหรับค้นหา

## Manual test scenarios

ใช้ session ทดสอบและเปิด Firebase Console เพื่อดู players, matches, session และ fairLogs ทุกเครื่องต้องโหลด application version นี้ ก่อนทดสอบ logs ต้องใช้ rules ใหม่ใน environment ทดสอบด้วย (ยังไม่ได้ deploy จากงานนี้)

### 1. เริ่ม session / เกม 2 กับ 3 ไม่เป็น gate

- เพิ่มอย่างน้อย 8 คน แล้วกด Fair ลงคอร์ตว่าง
- ต้องได้ 4 คน, skill split ผ่าน guard; หลังกด "เริ่มเกม" คนที่เริ่ม fairSkips = 0 และคน eligible+waiting ที่ไม่ได้ลง fairSkips = 1 (ก่อนเริ่มเกม skip ยังไม่ขยับ)
- ให้มีผู้เล่นที่ gamesPlayed ต่างกัน 2/3 โดยเล่นเกมจริง หรือจัด fixture ใน session ทดสอบ
- ตรวจ log ว่าทั้งสองกลุ่มอยู่ใน pool พร้อมกัน ไม่มีการตัดเพราะ gamesPlayed
- เพื่อตรวจการเล่นร่วมกันแน่นอน ให้เหลือ eligible 4 คนซึ่งมีทั้ง gamesPlayed 2 และ 3; Fair ต้องลงทั้งสี่ได้

### 2. Guarantee เมื่อ capacity เพียงพอ

- เริ่มด้วย 12 คนพร้อมเล่น เปิด 3 คอร์ต และไม่มีประวัติ/skip
- กด Court Fair ลงคอร์ต 1 แล้วเริ่มเกม: อีก 8 คน fairSkips = 1
- กด Court Fair ลงคอร์ต 2 แล้วเริ่มเกม: อีก 4 คน fairSkips = 2
- กด Court Fair ลงคอร์ต 3 แล้วเริ่มเกม: ต้องได้ 4 คนสุดท้าย, forcedIds ครบ 4, fairSkips ของผู้เริ่มเล่น = 0 (skip ขยับตอนเริ่มเกม ไม่ใช่ตอนกด Fair)
- ทดสอบอีกครั้งโดยมี history ที่ทำให้คน overdue มีคู่ซ้ำ: forced membership ยังต้องชนะ Variety

### 3. Capacity exception และเก็บสิทธิ์คนที่เหลือ

- เริ่ม 21 คน/3 คอร์ต ไม่มี skip แล้วกด Fair สองคอร์ตแรกแล้วเริ่มเกมทั้งสอง
- จะเหลือ 13 คนที่ skip = 2; Court Fair ถัดไปต้อง capacityException = true
- ต้องเลือก 4 คนตาม queuedAt เก่าสุดจาก overdue group (ID ตัดสินเมื่อเวลาเท่ากัน)
- เริ่มเกมคอร์ตที่สาม: อีก 9 คนต้อง skip = 3 ไม่เป็น 0 หรือค้างที่ 2
- หลังคอร์ตว่างอีกครั้ง คน skip มากกว่าต้องมาก่อนคน skip น้อยกว่า แม้คนหลังมี relationships สดกว่า

### 4. ไม่สะสม skip ตอน ineligible

- จด skip ของคน resting, คนบน court อื่น และคน reserved ใน Next Up
- จัดชุดอื่นลงคอร์ตแล้วเริ่มเกม: ทั้งสามกลุ่มต้องไม่ถูก +1 (Court Fair เองไม่เปลี่ยน skip อยู่แล้ว) และมี excluded reason ถูกต้องใน log
- กลับจากพักแล้ว: เริ่มนับ +1 เฉพาะเกมที่เริ่มหลังกลับมา eligible; เวลา queuedAt เปลี่ยนตาม behavior พักเดิม
- ให้เหลือคน eligible น้อยกว่า 4 แล้วกด Fair: ต้อง error โดย revision ไม่เพิ่มและไม่มี success log

### 5. Next Up (ไม่เปลี่ยน skip) / reroll / promote

- เติมคอร์ตให้ครบ แล้วตั้ง Next Up ด้วย Fair: fairSkips ของทุกคน (ทั้งที่ถูกจองและที่เหลือ) ต้องไม่เปลี่ยน
- ดู log: ทุก `skipTransitions` เป็น no-op — `before == after`, `action = "unchanged"`
- Reroll หลายครั้งจนมีสมาชิกเดิมถูกนำออก (อาจได้ชุดเดิมได้หากยังเหมาะสม): fairSkips ไม่เปลี่ยนไม่ว่าถูกเลือกหรือหลุด — ไม่มีการนับ reroll เป็น skip
- เมื่อคอร์ตว่าง promote: ต้องใช้ทีมที่แสดงใน Next Up; promote ไม่เปลี่ยน skip และไม่มี Fair log ใหม่ — ต้องกด "เริ่มเกม" จึง reset สี่คน = 0
- ซ้ำกรณีมี manual swap ใน Next Up ก่อน promote: ทีมที่ Admin จัดต้องถูกใช้ตรง ๆ

### 6. Recent relationships มีแรงหลีกเลี่ยงจริง

- ให้ A/B เคยอยู่เกมเดียวกัน แล้วกลับคิวโดยยังไม่ได้เล่นเกมอื่น; มี eligible ทางเลือกอื่น
- ใน log คู่ A/B ต้อง coPlayer.count = 1, age = 0, recentBonus = 9, total = 10
- เล่นเกมคอร์ตอื่นที่ไม่มี A/B: ค่า age ของ A/B ต้องไม่เพิ่ม
- ให้ทั้ง A และ B เล่นแยกกันอย่างน้อยคนละ 1/2/3 เกม แล้วตรวจ age/total เป็น 1/5, 2/2, 3/1 หากคู่นี้ยังไม่เจอซ้ำ
- เปรียบเทียบ candidate ที่ผ่าน forced rule และปัจจัยอื่นเท่ากัน: fresh relationship ต้องได้คะแนนดีกว่า recent repeat
- ถ้า A/B ต้องเข้า forced group หรือเหลือเพียงสี่คน ระบบยังจัดได้ ไม่ติด hard ban

### 7. ทั้ง session / ความถี่ / exact four

- ให้คู่ A/B พบกันมากกว่าหนึ่งครั้ง และมี history เกิน 20/40 เกม
- ตรวจ coPlayer.count ยังนับครบทุก occurrence และคู่เก่ายังมี total >= count > 0
- ตรวจ teammate/opponent counts แยกตามทีมจริงใน Match รวมเกม manual/random ด้วย
- ให้มี candidate เป็น exact four เดิม: exactFoursomeOccurrences ต้องถูกบันทึก แต่ coPlayer ต้องเท่ากับ lifetimeOccurrences + recentBonus เท่านั้น

### 8. Skill guard และ split alternatives

- ให้ eligible เหลือ A/B=S, C/D=NB โดยมีประวัติ A+C และ A+D เป็น teammate กับคนนอกชุด
- Fair ต้องไม่เลือก AB/CD (8 ต่อ 2); option นี้ยังอยู่ใน splitOptions แต่ passesSkillGuard = false, chosen = false
- ลองสี่คนคะแนน 4/3/2/1: best diff = 0, split 6 ต่อ 4 ต้องผ่าน guard ส่วน 7 ต่อ 3 ต้องไม่ผ่าน
- ใน options ที่ผ่าน เลือก totalRepeat ต่ำสุด หากเท่ากันเลือก skillDiff ต่ำสุด
- ลองกรณีทุก split ไม่สูสี เช่น S/NB/NB/NB: ยังต้องมี split ให้เล่น เพราะ guard อิง best ของสี่คนนี้

### 9. Delete / re-add Profile เดิม

- ให้ A/B เล่นร่วมกันอย่างน้อยหนึ่งเกม จด Player ID ของ A และ profileId
- ลบ A ออกจาก session แล้วเพิ่มกลับจาก roster Profile เดิม
- Player ID ใหม่ต้องต่างเดิม, gamesPlayed = 0 ตาม behavior เดิม
- Fair log ต้องมี identity เดิมของ A และยังนับ relationship A/B ทั้ง teammate/opponent/coPlayer ตาม history
- ทำซ้ำกับ Match เก่าที่ไม่มี identity fields โดยลบ player ผ่านแอปเวอร์ชันนี้: alias ที่เก็บก่อนลบต้องทำให้ history เดิมยังเชื่อมได้

### 10. Queue >24

- เพิ่ม 25–30 คน eligible และกด Fair
- pool ต้องมีครบทุกคน รวมคนเกมเยอะ/เข้าคิวทีหลัง ไม่มีตัดที่ 24
- ถ้าไม่มี forced players, 25 คนต้อง candidateCount = 12,650 และ 30 คน = 27,405
- ประเมินเวลาตอบสนองจริงบน iPad; งานนี้ยังไม่ได้ benchmark

### 11. สองเครื่อง / stale confirmation / double press

- สองเครื่องกด Court Fair ลงคอร์ตเดียวกันใกล้กัน: ต้องมีเพียง assignment ที่ valid; อีกคำขอ error เมื่อ state เปลี่ยน ไม่มีคนค้างสอง court จากสอง Fair commits
- กดคนละคอร์ตพร้อมกัน: อาจมีคำขอ stale ให้กดใหม่ หรือทั้งคู่สำเร็จจาก snapshot คนละช่วง; ผู้เล่นต้องไม่ซ้อน
- เปิด modal reroll ค้างไว้ แล้วอีกเครื่องเปลี่ยน Next Up: ยืนยันที่เครื่องแรกต้องไม่เขียนทับ reservation ใหม่
- เปิด modal ค้าง แล้วอีกเครื่องให้ผู้เล่นพัก/จบเกม โดย Next Up เดิมไม่เปลี่ยน: เมื่อยืนยันต้องใช้คิว/history จาก server หลัง modal
- กดเริ่มเกมซ้ำเร็ว ๆ ในเครื่องเดียว/หลายเครื่อง: เกมที่เริ่มแล้วเป็น no-op double tap ไม่ +1 ซ้ำ และไม่ขึ้น START_STALE
- เปลี่ยนคิว/พัก/finish ระหว่างอ่านและ commit ของ startGame: ต้อง abort ด้วย START_STALE เมื่อ fairRevision เปลี่ยน โดยไม่ +1 บางส่วน; Fair decision ที่ snapshot เปลี่ยนก็ต้อง abort เช่นเดิม
- ตรวจ revision ก่อน/หลังแต่ละ action: เพิ่ม/ลบ/พัก/กลับเข้าคิว, manual/random/Fair ลงคอร์ต, start/cancel/finish, court swap/substitute/ข้ามคอร์ต, Next Up เลือกเอง/เพิ่ม/ลบ/clear/swap/substitute/Fair/promote และเปิด/ปิด session ต้องเพิ่มเมื่อมี write สำเร็จ (no-op ที่ไม่ได้เขียนไม่เพิ่ม)
- ลบผู้เล่นจากอีกเครื่องแล้วกดชำระเงินจากหน้าจอเก่า: ต้องไม่สร้าง Player ที่มีแต่ข้อมูลชำระเงินกลับมา

### 12. History ไม่พร้อม / network error

- โหลดหน้าใหม่ด้วยเครือข่ายช้าแล้วกด Fair ก่อน history พร้อม: ต้องแจ้งให้รอ ไม่จัดจาก history ว่าง
- ทดสอบ history subscription ถูกปฏิเสธใน environment ทดสอบ: Fair ต้องแจ้ง error; manual ยังไม่ถูก history gate
- ตัด network หลัง history เคยพร้อม แล้วกด Fair: server read/transaction ต้องไม่ fallback ไป cached empty history หรือ commit การเลือกแบบ offline
- ถ้าเครื่องยังมีการเขียนคิวที่รอ server ยืนยัน Fair ต้องไม่เอาค่าที่ยัง pending มาใช้เสมือนยืนยันแล้ว; ให้รอ sync แล้วกดใหม่

### 13. Logs / failure isolation / session end

- Court Fair และ Next Up Fair สำเร็จ: ตรวจ log ของ target ตรงกัน, skipTransitions ครบตาม pool แต่ทุกรายการ no-op (before==after, action=unchanged), chosen split ตรง assignment ตอน commit
- ตรวจทุก split รวมตัวที่ไม่ผ่าน skill guard; alternatives มากสุด 5 และอาจน้อยกว่านั้นเมื่อ forced membership จำกัดตัวเลือก
- Replay จาก pool และ pairInputs ทั้งหมดได้แม้ pool >24; คู่หรือ role ที่ไม่มีใน pairInputs ให้คิดเป็น 0 ไม่ต้องมี historyOrder หรือสำเนาประวัติต่อ alternative
- ใน environment ที่ปฏิเสธ log create: Fair assignment ต้องยังสำเร็จ และ developer console มี `[Fair Match] decision log failed`
- ปิด session: players/matches ถูกล้าง แต่ fairLogs ยังคงอยู่ พร้อม pool/score/identity/pairInputs พอคำนวณคะแนนเดิม
- ผ่าน browser SDK ลอง read/update/delete fairLogs ใน environment ทดสอบ: rules ต้องปฏิเสธ แต่ Firebase Console ที่มีสิทธิ์ Admin ยังอ่านได้
- Manual/random/failed Fair/promote ไม่ควรสร้าง Fair decision log ใหม่

### 14. Manual regression

- เลือกคนเองลงคอร์ตและตั้ง Next Up เอง: ยังใช้ skill balancer เดิม แม้เกิด teammate/opponent ซ้ำ
- Swap/substitute ทั้ง court และ Next Up: exact slot ของ Admin ต้องคงอยู่ ไม่ rebalance กลับ
- Random ยังสุ่มตามเดิม; ไม่เปลี่ยน fairSkips ตอนลงคอร์ต (reset ขยับไป startGame)
- Assign/start/stage/promote ไม่เพิ่ม gamesPlayed; finish เพิ่มหนึ่ง; cancel ไม่เพิ่มและไม่สร้าง Match

## ข้อจำกัดที่ต้องทราบ

- Guarantee มี capacity exception ตามที่อนุมัติ และหมายถึงสิทธิ์ถูกจัดลงคอร์ต ไม่ใช่รับประกันเกมเล่นจนจบ; Admin ยกเลิก/override ได้
- Skip state เริ่ม 0 สำหรับ session Player ใหม่; การ re-add รักษา relationship memory แต่ไม่กู้ skip ของ Player ที่ลบไป
- fair-v3 ไม่มี historical audit ของการเปลี่ยน fairSkips ที่ `startGame`: `fairLogs` เก็บเฉพาะ Fair decision (skipTransitions เป็น no-op) และไม่มี log จาก startGame; player doc เห็นได้แค่ค่า `fairSkips` **ปัจจุบัน** เท่านั้น ย้อน timeline การ +1 รายเกมของแต่ละคนไม่ได้ — ถ้าต้องการ audit ระดับนั้นต้องเพิ่ม logging ที่ startGame (อยู่นอก scope งานนี้)
- ถ้า Player ถูกลบไปก่อนใช้เวอร์ชันนี้และไม่มี alias/identity เหลือในข้อมูลเก่า จะระบุตัวตนย้อนหลังจาก ID ล้วนไม่ได้ การลบ Profile แล้วสร้าง Profile ใหม่ไม่ใช่การ re-add Profile เดิม
- ทุกอุปกรณ์ต้องใช้เวอร์ชันใหม่ การเขียนด้วยแอปเก่าหรือแก้ history ใน Console ระหว่าง Fair อาจไม่ปรับ revision ตาม protocol
- Fair transaction ป้องกัน stale Fair writes; manual assignment/staging แบบ blind write เดิมยังสามารถ override ภายหลังได้ ไม่ได้รื้อ concurrency policy ของ manual ใน scope นี้
- เวลา queuedAt/finishedAt ยังใช้นาฬิกา client ตาม baseline; timestamps ผิดลำดับอาจกระทบ recency/tie-break
- Payload log เป็นคะแนน/inputs ที่ client รายงาน ไม่ใช่ audit trail ที่ authenticate ผู้เขียน และไม่เก็บ raw match archive
- ปิดแท็บ/ขาดเครือข่ายหลัง assignment แต่ก่อน log write อาจทำให้ log หายได้ ไม่มี durable outbox/retry guarantee
- Rules/index config ยังไม่ได้ deploy; ภายใต้ rules เดิม log create จะถูกปฏิเสธ แต่ Fair ต้องยังสำเร็จ
- Index config เพิ่มเฉพาะการตั้งค่าสำหรับ fairLogs; ก่อนนำไป deploy ภายหลัง ต้องตรวจและรักษา indexes ที่มีอยู่บน server แต่ยังไม่ถูกบันทึกใน repo ด้วย
- Full history server reads + transaction revalidation เพิ่ม read cost/latency; ไม่มี pool truncation จึงยังมีงาน O(C(N,4)) เมื่อคิวใหญ่มาก และ log ต้องอยู่ภายในขนาดเอกสาร Firestore
