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
build dir on 18 Nov 2026, ready for resubmission — see Verification below.

## The game

Fly a salvage skiff through a neon asteroid field. Collect pulsing nova shards to
build a combo multiplier, dodge drifting void mines, and outrun hunter drones
that chase you once you come close. A pulse blast (Space) clears threats around
you but spends energy that recharges over time. Darters weave in fast from wave
2, splitters crack into two minis from wave 3, and wave 5 ends with the Void
Warden — a three-hit boss that launches its own drones. Shield and surge cells
drift in to save or refuel you, and every cleared wave offers a choice of three
upgrades (plating, wide pulse, surge coil, thrusters, magnet, overcharge) that
shape the rest of the run. Clear 5 waves to win the run; after the win you can
keep flying endless, or restart.

- **Goal:** clear wave 5 and beat the Void Warden (then keep going endless if you want).
- **Score:** shards pay 10 × combo multiplier (up to ×6), a drone destroyed by
  a pulse pays 25, a darter 40, a splitter 30, a mini 15, the Warden 300, a
  cleared wave pays 100 + 25 per wave.
- **Lose:** the skiff has 3 hull. A mine or a foe costs 1 hull and breaks your
  combo — unless an aegis shield eats the hit. At 0 hull the run ends.
- **Controls:** WASD / arrows to fly (momentum + drag), Space for the pulse
  blast, 1 / 2 / 3 or click to pick an upgrade, P to pause, M to mute, R to
  restart, C to continue after a win.
- **Feedback:** every pickup pops its points, every wave pays a bonus on screen,
  hits shake the field, and all sounds are synthesized with WebAudio over a
  quiet generative bass line — no audio files, no network requests, no images.
  Everything is drawn on canvas.

## Files

- `game/` — the playable game, static ES modules, no build step. `game/index.html`
  opens in desktop Chrome and plays offline.
  - `game/src/` — one job each: `config.js` (every tuned number), `random.js`
    (seeded generator), `world.js` (simulation: skiff, shards, mines, drones,
    darters, splitters, minis, the Warden, cells, waves, combo, upgrades),
    `upgrades.js` (the six wave-clear upgrades), `input.js` (keyboard +
    pointer), `render.js` (canvas, HUD, six screens), `audio.js` (synthesized
    sounds and the generative music loop), `shots.js` (staged screenshot scenes
    with an autopilot), `main.js` (boot + fixed-step loop).
- `main.ts` — Node 22, stdlib only: copies `game/` + `screenshots/` to `/output`
  and writes `dossier.json` with the kit's `vendor/makefun-game.ts`.
- `serve.ts` — tiny static server for local play: `node serve.ts`, then
  http://localhost:8080.
- `screenshots/` — 4 real renders, 1280×720: `1-menu.png` (title), `2-play.png`
  (wave 2, drones + mines + asteroids), `3-win.png` (victory, score 2800),
  `4-over.png` (game over). Staged with `?shot=menu|play|win|over&seed=7`.
- `vendor/makefun-game.ts` — the kit's copy, unchanged.
- `kit/` + `kit.tar.gz` — working material, not part of the entry.

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
