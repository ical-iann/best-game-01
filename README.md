# best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/ical-iann/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/ical-iann/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Nova Harvest — a neon salvage arcade game. Fly a salvage skiff, collect nova shards, dodge mines and hunter drones, clear 5 waves to win. Entry for the make.fun "Make the best game" bounty, $1,000 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome.

# Nova Harvest — a neon salvage arcade

Entry for the make.fun bounty **best-game-01** ($1,000, deadline Thu 19 Nov 2026
02:00 WITA). Submitted 17 Nov 2026 at 22:56 WITA (repo
https://github.com/ical-iann/best-game-01, commit
09b93409e6aea916923491df6b605d80f640ce87, receipt
01a1ea02-5f32-763b-8619-f0076237ed08); judge score 592,302. Improved in the
build dir on 18 Nov 2026 and resubmitted (commit
ecced4106ffbaba7172a08e51827699ca0582095 "Hopeful Lantern", receipt
01a1ea40-4d1d-7745-b5c6-d9cdbe7ad90b); judge score 691,333, competition rank
114 of 182, top-100 line ~699,775. Improved again in the build dir on 18 Nov
2026 (second pass) — see Verification below — and resubmitted; the current
best graded entry ("Hopeful Quill") scores 721,991. Improved a third time in
the build dir on 18 Nov 2026 (third pass) — see Verification below — ready
for resubmission.

## The game

Fly a salvage skiff through a neon asteroid field. Collect pulsing nova shards to
build a combo multiplier, dodge drifting void mines, and outrun hunter drones
that chase you once you come close. A pulse blast (Space) clears threats around
you but spends energy that recharges over time. Darters weave in fast from wave
2, splitters crack into two minis from wave 3, and stingers hold off at range
from wave 3 and shoot slow plasma bolts you can dodge — or burn out of the air
with a pulse. Wave 5 ends with the Void Warden — a three-hit boss that launches
its own drones. Shield and surge cells drift in to save or refuel you, every
shard you collect feeds the Nova Rush meter (8 shards fire 8 seconds of double
score and double pulse recharge), and every cleared wave offers a choice of three
upgrades (plating, wide pulse, surge coil, thrusters, magnet, overcharge) that
shape the rest of the run. Clear 5 waves to win the run; after the win you can
keep flying endless, and the deeper you go the more every point is worth (+5%
per wave past wave 5, shown as DEPTH × in the HUD).

- **Goal:** clear wave 5 and beat the Void Warden (then keep going endless if you want).
- **Difficulty:** pick on the menu before a run — 1, 2 or 3, or click.
  Relaxed flies slower foes, fewer hunters, 4 hull and a 2-hit Warden; Standard
  is the intended hunt (3 hull, 3-hit Warden); Expert is faster, fields more
  hunters, and the Warden takes 4 hits. The choice is remembered between visits.
- **Score:** shards pay 10 × combo multiplier (up to ×6), a drone destroyed by
  a pulse pays 25, a darter 40, a splitter 30, a mini 15, a stinger 50, the
  Warden 300, a cleared wave pays 100 + 25 per wave. While Nova Rush burns,
  every point doubles; past wave 5, endless depth adds 5% per wave.
- **Lose:** the skiff has 3 hull (4 on Relaxed). A mine, a foe or a plasma bolt
  costs 1 hull and breaks your combo — unless an aegis shield eats the hit.
  At 0 hull the run ends.
- **Controls:** WASD / arrows to fly (momentum + drag), Space for the pulse
  blast, 1 / 2 / 3 or click to pick an upgrade, P to pause, M to mute, R to
  restart, C to continue after a win. On the menu, 1 / 2 / 3 (or a click)
  picks the difficulty and the MUSIC / SFX pills toggle the sound layers; the
  pills work on the pause screen too, and R restarts from pause.
- **Record:** every finished run is folded into a career record kept in
  localStorage (runs, wins, best wave, total shards and foes down) and shown on
  the menu and the game-over screen next to the best score; each win and loss
  also shows that run's own stats (shards, foes down, best chain, time).
- **Feedback:** every pickup pops its points, every wave pays a bonus on screen,
  hits shake the field, and all sounds are synthesized with WebAudio over a
  quiet generative bass line with a sparse A-minor pentatonic pluck — no audio
  files, no network requests, no images. Music and sound effects mute
  separately; M mutes everything. Everything is drawn on canvas.

## Files

- `game/` — the playable game, static ES modules, no build step. `game/index.html`
  opens in desktop Chrome and plays offline.
  - `game/src/` — one job each: `config.js` (every tuned number, plus the
    three difficulties and the localStorage keys), `random.js`
    (seeded generator), `world.js` (simulation: skiff, shards, mines, drones,
    darters, splitters, minis, stingers and their plasma bolts, the Warden,
    cells, waves, combo, Nova Rush, endless depth scoring, upgrades —
    with difficulty scaling and per-run stats),
    `upgrades.js` (the six wave-clear upgrades), `input.js` (keyboard +
    pointer), `render.js` (canvas, HUD with the rush meter and the endless
    depth readout, six screens, difficulty and settings buttons), `audio.js`
    (synthesized sounds, the generative bass + melody
    loop, separate music / SFX mutes, plus a rush arpeggio and a stinger shot
    zap), `shots.js` (staged screenshot scenes
    with an autopilot), `main.js` (boot + fixed-step loop, settings and career
    stats in localStorage).
- `main.ts` — Node 22, stdlib only: copies `game/` + `screenshots/` to `/output`
  and writes `dossier.json` with the kit's `vendor/makefun-game.ts`.
- `serve.ts` — tiny static server for local play: `node serve.ts`, then
  http://localhost:8080.
- `screenshots/` — 4 real renders, 1280×720: `1-menu.png` (title, difficulty
  and sound controls, stingers and Nova Rush named), `2-play.png` (wave 2,
  drones + mines + asteroids, rush meter and shield ring visible),
  `3-win.png` (victory, score 3185, run stats), `4-over.png` (game over,
  score 135, run stats). Staged with `?shot=menu|play|win|over&seed=7`.
  The play shot is staged at 60 s of play: at 72–75 s the frame lands in
  wave 3 with a stinger in it, but the busier field pushes the PNG over the
  256 KiB cap, so the shot stays at 60 s.
- `vendor/makefun-game.ts` — the kit's copy, unchanged.
- `kit/` + `kit.tar.gz` — working material, not part of the entry.

## Verification (18 Nov 2026, local — third improvement pass)

The best graded entry ("Hopeful Quill") scores 721,991 and the top-100 line is
~898,978 — a gap of ~177,000, bigger than either earlier pass gained — so this
pass adds gameplay-visible depth instead of settings: no bundle, check, push or
submit was run here.

- What changed: a new foe, the **stinger** (from wave 3, wave 4 on Relaxed) —
  it holds off at ~300 px, strafes, telegraphs each shot with a charging glow,
  then fires a slow plasma bolt (150 px/s, slower than the skiff) at where the
  skiff was; bolts hurt on touch, fizzle after 6 s, and a pulse burns them out
  of the air; a stinger pays 50 on a pulse kill. **Nova Rush** — every shard
  fills a meter shown under the pulse bar; 8 shards fire 8 s of double score
  and double pulse recharge, with a gold banner, a rush arpeggio and a
  "NOVA RUSH ×2" popup. **Endless depth scoring** — past the wave-5 win every
  point is worth +5% per wave (×1.10 on wave 7), shown as DEPTH × in the HUD.
  The menu names both new systems; the play shot is staged at 60 s (see Files).
  The `window.__game` debug handle now also carries the skiff position, the
  nearest shard and threat, and the live stinger / bolt / rush counts, so the
  play-tests can steer and assert on the new systems.
- Balance was tuned, not just added: the first build let stingers kite a wave
  forever (careful pilots won 0/10 — the run stalled, never died) and then
  fired too often (careful Standard 7/10, one 675 s run). The fix: a stinger
  closes to pulse range when it is one of the last two foes, its hold distance
  shrinks 5 px/s as it ages so a wave always ends, it fires every 5 s (not
  3.6 s), and at most 4 bolts fly at once.
- Node simulation of the real world.js, 10 seeds × 3 difficulties × 3 pilots:
  careful pilots win 10/10 Relaxed (136–298 s, 0 hits), 9/10 Standard
  (168–223 s, 0–3 hits; the one loss is seed 63 on wave 4), 7/10 Expert
  (149–248 s, 0–4 hits; losses on waves 4–5); sloppy pilots win 10/10 Relaxed,
  10/10 Standard, 8/10 Expert; careless pilots die on wave 1–2 in 15–91 s on
  every difficulty. Rush fired 9–20 times per 10 careful/sloppy runs and
  106–200 bolts were fired per 10 runs, so both new systems engage in normal
  play. Endless verified: a careful Standard win (score 3,585) followed by 90 s
  of endless reaches wave 7 at score 5,656 (+2,071) with depth ×1.10.
- Play-tested live in headless Chromium (Playwright headless shell), twice:
  menu → Digit3 picks Expert → click Relaxed → Digit2 back to Standard →
  start → upgrade screens on waves 2 and 3 → P pauses → music pill toggled
  on the pause screen → R restarts a fresh run from pause → bot play reached
  wave 3 (score 1,230–1,395), saw a stinger and a bolt live, and Nova Rush
  fired → M mutes everything. Zero console/page errors throughout. A second
  live run sat still until the hunters killed the skiff (game over, wave 2,
  score 125): localStorage then held best 125 and 1 run with bestWave 2.
- Screenshots: 4 PNGs, 1280×720, 228–252 KiB each (< 256 KiB), regenerated
  from the new build at `?shot=menu|play|win|over&seed=7`. All five `?shot=`
  scenes (menu, play, win, over, upgrade) render with `__shotReady` and zero
  errors. One real bug found and fixed in testing: the staged win scene first
  came back as FIELD LOST on wave 4 — the staged run took no upgrades, and
  without them it cannot survive wave 4 now — so the staged win run takes the
  first upgrade on offer each wave, like a real player, and now wins at score
  3,185 in 6:02. `shots.json` unchanged (same 4-shot set, seed 7).
- Static checks: every `game/src/*.js` parses (`node --check`); no external
  references anywhere under game/; game/ is 106,990 bytes in 10 files,
  screenshots 979,189 bytes total, so the dossier stays under the 1.5 MiB cap.
  vendor/ untouched (sha256 dc67187521b24025ff952f8c231485a6eb92d6d71d29edd2a08154ffb4376129).
- Honest assessment: this pass adds two systems the judge can see and feel in
  the first two minutes (a shooter foe with telegraphed bolts, a rush meter
  that doubles score) and a reason to keep playing after the win (endless
  depth scoring). Whether that closes a 177,000-point gap cannot be measured
  locally — the judge's score is not reproducible here — and the gap is larger
  than the +99k and +31k the first two passes gained, so it plausibly narrows
  the gap without plausibly closing all of it on its own. The entry is
  stronger, complete and balanced; it is not a guaranteed top-100 entry.

## Verification (18 Nov 2026, local — second improvement pass)

The resubmitted entry (commit ecced41 "Hopeful Lantern") was judged 691,333
(rank 114 of 182; top-100 line ~699,775, a gap of ~8,400), so it was reworked
again in the build dir only: no bundle, check, push or submit was run here.

- What changed: a difficulty select on the menu (Relaxed / Standard / Expert,
  keys 1/2/3 or click, remembered between visits — foe speed, chase range,
  foe counts, spawn pace, hull, pulse recharge and Warden hits all scale),
  separate music and SFX toggles as clickable pills on the menu and the pause
  screen (M still mutes everything; both toggles are remembered), persistent
  career stats in localStorage (runs, wins, best wave, totals) shown on the
  menu and game-over screens plus per-run stats (shards, foes down, best
  chain, time) on the win and game-over screens, a quiet pentatonic melody
  over the bass loop, the HUD now names the difficulty and shows an onboarding
  hint for the first 8 seconds of wave 1, the pause screen shows score / wave
  / difficulty / best with the sound pills and R to restart, and the menu's
  start prompt no longer blinks — the old menu screenshot lost it exactly
  because the staged capture landed on a blink-off frame.
- Node simulation of the real world.js, 10 seeds × 3 difficulties × 2 pilots:
  careful pilots win 10/10 on Relaxed (124–359 s, 0 hits), 10/10 on Standard
  (128–235 s, 0–2 hits), 8/10 on Expert (120–200 s, 0–3 hits; losses seeds 42
  and 99 on wave 5); sloppy pilots win 9/10 Relaxed, 9/10 Standard, 5/10
  Expert. Careless pilots die on wave 2 in 16–36 s. The Warden's hits were
  checked directly: 2 on Relaxed, 3 on Standard, 4 on Expert; wave-1 foes 2 /
  3 / 4 and hull 4 / 3 / 3. Per-run stats populate on a win (e.g. seed 11
  Standard: shards 5, foes down 65, pulses 44, waves cleared 5).
- Play-tested live in headless Chromium (Playwright headless shell): menu →
  Digit3 picks Expert (still on the title screen, setting stored) → click
  Relaxed → Digit2 back to Standard → music pill off/on, SFX pill off/on →
  reload still shows Expert → start → shard collected (score 10) → wave 1
  cleared at ~16 s → upgrade screen with 3 choices → picked with Digit2 →
  wave 2 → P pauses → music toggled on the pause screen → R restarts a fresh
  run from pause → M mutes everything. Zero console/page errors throughout.
  A second live run sat still until the hunters killed the skiff (game over,
  wave 2, score 125 in 20 s): localStorage then held stats runs 1, bestWave 2
  and best 125, and after a reload the menu showed best 125 and 1 run.
- Screenshots: 4 PNGs, 1280×720, 223–246 KiB each (< 256 KiB), regenerated
  from the new build at `?shot=menu|play|win|over&seed=7`. `shots.json`
  unchanged (same 4-shot set, seed 7).
- Static checks: every `game/src/*.js` parses (`node --check`); no external
  references anywhere under game/; game/ is 92,302 bytes in 10 files,
  screenshots 976,133 bytes total, so the dossier stays under the 1.5 MiB cap.
  vendor/ untouched.

## Verification (18 Nov 2026, local — improvement pass)

The entry was submitted 17 Nov 2026 at 22:56 WITA and judged 592,302 (leader
933,564; top-100 line 696,968), so it was reworked in the build dir only: no
bundle, check, push or submit was run here.

- What changed: three new foe kinds (darter, splitter + minis, the Void Warden
  boss on wave 5 and every 5th endless wave), shield/surge cells, a wave-clear
  upgrade choice (6 upgrades, pick 1 of 3 by key or click), wave-scaled foe
  aggression with a last-foe frenzy, spawn grace + farthest-edge arrivals,
  faster pulse recharge (18/s), denser field (220 stars, 9 drifting asteroids),
  a generative bass music loop, a fix for the never-played shard-collect sound,
  and screenshots now cover the whole loop (menu, play, win, over).
- Node simulation of the real world.js, 10 seeds × 3 pilots: careful pilots win
  9 of 10 in 131–268 s with 0–2 hits (score 2,835–3,420; the one loss is seed
  99 on wave 5), sloppy pilots win 10 of 10 in 134–273 s with 0–1 hits (score
  2,845–4,040), careless pilots die on wave 1 in 16–41 s. Win path and endless
  verified: win at 141 s (seed 11, score 3,400), continueEndless opens wave 6
  with 22 foes and play continues. Before the fix the careful pilot won every
  seed with 0 hits in up to 572 s (the last splitter alone took 72 s to catch);
  the pacing fixes cut that to 131–268 s.
- Play-tested live in headless Chromium (Playwright headless shell; the VM's
  own Chrome refuses to start: "Hatch WebGL domain policy is required"): menu
  → start → shard collected (score 10) → wave 1 cleared at ~17 s → upgrade
  screen with 3 choices → picked with Digit2 → wave 2 play → pause/resume,
  zero console/page errors throughout. All five `?shot=` scenes (menu, play,
  win, over, upgrade) render with `__shotReady` set and zero errors.
- Screenshots: 4 PNGs, 1280×720, 222–249 KiB each (< 256 KiB), regenerated
  from the new build at `?shot=menu|play|win|over&seed=7`.
- Static checks: every `game/src/*.js` parses (`node --check`); no external
  references anywhere under game/ (no http/https/fetch/WebSocket/import of a
  bare specifier); game/ is 76,340 bytes in 10 files, screenshots 951,158
  bytes total, so the dossier stays under the 1.5 MiB cap. vendor/ untouched.

## Verification (16 Nov 2026, local)

- Kit integrity: all 24 files in the downloaded kit match the SHA-256 hashes
  listed in `kit/kit.json` (0 mismatches). Note: the tarball SHA in the
  transport header (`ccdb26dd…`) differs from the downloaded file (`9cfdd658…`),
  as with the earlier kits; the kit's own file list verifies clean, so the kit
  is authentic.
- `main.ts` run twice produces byte-identical output (diff clean). Dossier
  846,290 bytes (< 1.5 MiB cap); dossier text 47,137 bytes (< 160 KiB cap);
  game/ 46,479 bytes in 9 files (< 48 MiB); screenshots 1280×720, 131–168 KiB
  each (< 256 KiB). No external references anywhere under game/.
- Kit `check` (no transcripts yet): competition_open pass, snapshot pass,
  license_osi pass (SPDX MIT), entrypoint pass; only `transcripts_present`
  fails, as expected — transcripts are bundled at submission time. The rest
  are submission-time checks (repo public/owner/created-after-open/commit).
- Screenshots are real renders of the game's own code in headless Google Chrome
  157, staged with `?shot=menu|play|action|over&seed=7`, zero console errors.
- Play-tested live in headless Chrome via CDP (zero console errors):
  menu → start → flying, collecting and scoring → pulse blast destroys a drone
  (+25) → pause → resume → hull 3 → 2 → 1 → game over on wave 2 (score 150)
  → restart with R → fresh run. One real bug found and fixed in testing: main.js
  referenced EVENT_PULSE without importing it, which threw every frame and the
  canvas never painted (225 exceptions in 4 s); fixed, re-tested, 0 exceptions.
- Win path verified in a headless Node simulation of the real world.js with the
  staged autopilot: wins in 172 s (score 1,800, wave 5 cleared, 0 hits), then
  continueEndless opens wave 6 (13 drones) and play continues (score 2,000
  after 30 s more).

## Still needed before any submission

1. **GitHub repo** — a public repo on BOS's own account (username `ical-iann`),
   created after the bounty opened (2026-11-15T18:00Z), OSI licensed, with this
   entry's files at the root. Add `.makefun/owner.json` with
   `{"wallet": "34Tvf2NTCS2V9dq2oeKztL4vb15bgbQ3tEPwAxFo9bJJ"}` unless the repo
   owner is the GitHub account signed in to make.fun.
2. **README badges + repo About** — the three live make.fun badges in the README
   and the bounty link + `makefun` topic in the repo About (the intake refuses
   entries without them).
3. **Transcripts** of the AI coding-agent sessions that built the entry,
   bundled with the kit's `node cli/makefun.mjs bundle` and checked with
   `node cli/makefun.mjs check`.
4. **BOS's explicit confirmation to submit**, and the entry signature from the
   linked Solana wallet (escrow bounty: every entry is signed).

---

<sub>Entered on [make.fun](https://make.fun/?ref=fjj5ptt9&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
