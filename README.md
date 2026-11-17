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
02:00 WITA). Built locally; **not submitted yet** (no repo, no submission).

## The game

Fly a salvage skiff through a neon asteroid field. Collect pulsing nova shards to
build a combo multiplier, dodge drifting void mines, and outrun hunter drones
that chase you once you come close. A pulse blast (Space) clears threats around
you but spends energy that recharges over time. Clear 5 waves to win the run;
after the win you can keep flying endless, or restart.

- **Goal:** clear wave 5 (then keep going endless if you want).
- **Score:** shards pay 10 × combo multiplier (up to ×6), a drone destroyed by
  a pulse pays 25, a cleared wave pays 100 + 25 per wave.
- **Lose:** the skiff has 3 hull. A mine or a drone costs 1 hull and breaks your
  combo. At 0 hull the run ends.
- **Controls:** WASD / arrows to fly (momentum + drag), Space for the pulse
  blast, P to pause, M to mute, R to restart, C to continue after a win.
- **Feedback:** every pickup pops its points, every wave pays a bonus on screen,
  hits shake the field, and all sounds are synthesized with WebAudio — no audio
  files, no network requests, no images. Everything is drawn on canvas.

## Files

- `game/` — the playable game, static ES modules, no build step. `game/index.html`
  opens in desktop Chrome and plays offline.
  - `game/src/` — one job each: `config.js` (every tuned number), `random.js`
    (seeded generator), `world.js` (simulation: skiff, shards, mines, drones,
    waves, combo), `input.js` (keyboard + pointer), `render.js` (canvas, HUD,
    five screens), `audio.js` (synthesized sounds), `shots.js` (staged
    screenshot scenes with an autopilot), `main.js` (boot + fixed-step loop).
- `main.ts` — Node 22, stdlib only: copies `game/` + `screenshots/` to `/output`
  and writes `dossier.json` with the kit's `vendor/makefun-game.ts`.
- `serve.ts` — tiny static server for local play: `node serve.ts`, then
  http://localhost:8080.
- `screenshots/` — 4 real renders, 1280×720: `1-menu.png` (title), `2-play.png`
  (mid-game), `3-action.png` (wave 2–3, pulse going off), `4-over.png`
  (game over). Staged with `?shot=menu|play|action|over&seed=7`.
- `vendor/makefun-game.ts` — the kit's copy, unchanged.
- `kit/` + `kit.tar.gz` — working material, not part of the entry.

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
