// Nova Harvest — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast one),
// and the renderer paints what is there. The game moves between six screens:
// title, play, paused, upgrade, game over and victory.
//
// ?seed=N fixes the spawn pattern. ?shot=menu|play|win|over|upgrade (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.
import { BEST_KEY, DIFFICULTY, DIFFICULTY_IDS, SETTINGS_KEY, SKIFF, STATS_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createWorld, EVENT_BOSS, EVENT_CELL, EVENT_HIT, EVENT_OVER, EVENT_PULSE, EVENT_RUSH, EVENT_SHARD, EVENT_SHIELD, EVENT_SHOT, EVENT_WAVE, EVENT_WIN } from './world.js';
import { ACTION_CHOICE_1, ACTION_CHOICE_2, ACTION_CHOICE_3, ACTION_CONFIRM, ACTION_CONTINUE, ACTION_MUTE, ACTION_PAUSE, ACTION_PULSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, DIFFICULTY_BUTTONS, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN, SETTINGS_BUTTONS, UPGRADE_CARDS } from './render.js';
import { applyUpgrade, rollUpgrades } from './upgrades.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

// Lifetime run stats: every finished run folds its per-run numbers into these,
// and the menu and game-over screens show them back.
function freshStats() {
  return { runs: 0, wins: 0, bestWave: 0, totalScore: 0, totalShards: 0, totalKills: 0 };
}

function readStats() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STATS_KEY) ?? 'null');
    if (!parsed || typeof parsed !== 'object') return freshStats();
    const stats = freshStats();
    for (const key of Object.keys(stats)) {
      if (Number.isFinite(parsed[key]) && parsed[key] >= 0) stats[key] = Math.floor(parsed[key]);
    }
    return stats;
  } catch {
    return freshStats();
  }
}

function saveStats(stats) {
  try {
    window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Same as the best score: without storage the stats last this visit only.
  }
}

// Remembered settings: the difficulty and the two sound toggles.
function readSettings() {
  const settings = { difficulty: 'standard', music: true, sfx: true };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? 'null');
    if (!parsed || typeof parsed !== 'object') return settings;
    if (DIFFICULTY_IDS.includes(parsed.difficulty)) settings.difficulty = parsed.difficulty;
    if (typeof parsed.music === 'boolean') settings.music = parsed.music;
    if (typeof parsed.sfx === 'boolean') settings.sfx = parsed.sfx;
  } catch {
    // Corrupt settings fall back to the defaults above.
  }
  return settings;
}

function saveSettings(settings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Without storage the settings last this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, scene.choices ?? null, { difficulty: 'standard', stats: null, musicOn: true, sfxOn: true });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  // The upgrade rolls draw from their own stream, so a seed replays one run.
  const upgradeRandom = createRandom((seed ^ 0x9e3779b9) >>> 0);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let stats = readStats();
  let settings = readSettings();
  let difficulty = settings.difficulty;
  world.setDifficulty(difficulty);
  audio.setMusicMuted(!settings.music);
  audio.setSfxMuted(!settings.sfx);
  let choices = null;
  let accumulator = 0;
  let last = performance.now();

  // The debug handle the play-tests read: the live screen and score, the foes
  // still to clear, and the upgrade choices on offer, nothing else. It also
  // carries the nearest shard and threat so a test can steer the skiff, plus
  // the stinger / bolt / rush counts the play-tests assert on.
  window.__game = { screen, score: 0, wave: 1, hull: SKIFF.hull, combo: 0, foesLeft: 0, upgrades: null, difficulty, musicOn: audio.musicOn, sfxOn: audio.sfxOn, best, runs: stats.runs, wins: stats.wins, px: 640, py: 360, shard: null, threat: null, stingers: 0, bolts: 0, rushCharge: 0, rushActive: false };
  function nearestDebug(list, x, y) {
    let found = null;
    let bestD = Infinity;
    for (const item of list) {
      if (!item.active) continue;
      const dx = item.x - x;
      const dy = item.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; found = item; }
    }
    return found;
  }
  function syncDebug() {
    const player = world.state.player;
    const shard = nearestDebug(world.state.shards, player.x, player.y);
    const threats = [
      ...world.state.mines, ...world.state.drones, ...world.state.darters,
      ...world.state.splitters, ...world.state.minis, ...world.state.stingers,
    ];
    const threat = nearestDebug(threats, player.x, player.y);
    const bolt = nearestDebug(world.state.bolts, player.x, player.y);
    const nearestThreat = [threat, bolt].filter(Boolean).sort((a, b) => {
      const da = (a.x - player.x) ** 2 + (a.y - player.y) ** 2;
      const db = (b.x - player.x) ** 2 + (b.y - player.y) ** 2;
      return da - db;
    })[0] ?? null;
    window.__game.screen = screen;
    window.__game.score = world.state.score;
    window.__game.wave = world.state.wave;
    window.__game.hull = world.state.player.hull;
    window.__game.combo = world.state.combo;
    window.__game.foesLeft = world.state.foesLeft;
    window.__game.upgrades = choices ? choices.map((choice) => choice.id) : null;
    window.__game.difficulty = difficulty;
    window.__game.musicOn = audio.musicOn;
    window.__game.sfxOn = audio.sfxOn;
    window.__game.best = best;
    window.__game.runs = stats.runs;
    window.__game.wins = stats.wins;
    window.__game.px = player.x;
    window.__game.py = player.y;
    window.__game.shard = shard ? { x: shard.x, y: shard.y } : null;
    window.__game.threat = nearestThreat ? { x: nearestThreat.x, y: nearestThreat.y } : null;
    window.__game.stingers = world.state.stingers.filter((s) => s.active).length;
    window.__game.bolts = world.state.bolts.filter((b) => b.active).length;
    window.__game.rushCharge = world.state.rush.charge;
    window.__game.rushActive = world.state.rush.active > 0;
  }

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function drawExtra() {
    return { difficulty, stats, musicOn: audio.musicOn, sfxOn: audio.sfxOn };
  }

  function selectDifficulty(id) {
    if (!DIFFICULTY_IDS.includes(id)) return;
    difficulty = id;
    settings.difficulty = id;
    saveSettings(settings);
    world.setDifficulty(id);
    announce(`Difficulty: ${DIFFICULTY[id].label}. ${DIFFICULTY[id].blurb}. Press Space to start.`);
    syncDebug();
  }

  function toggleSetting(id) {
    if (id === 'music') {
      audio.toggleMusic();
      settings.music = !audio.musicMuted;
    } else if (id === 'sfx') {
      audio.toggleSfx();
      settings.sfx = !audio.sfxMuted;
    } else {
      return;
    }
    saveSettings(settings);
    announce(id === 'music' ? (settings.music ? 'Music on.' : 'Music off.') : (settings.sfx ? 'Sound effects on.' : 'Sound effects off.'));
    syncDebug();
  }

  function recordRun(won) {
    stats.runs += 1;
    if (won) stats.wins += 1;
    stats.bestWave = Math.max(stats.bestWave, world.state.wave);
    stats.totalScore += world.state.score;
    stats.totalShards += world.state.stats.shards;
    stats.totalKills += world.state.stats.kills;
    saveStats(stats);
  }

  function startGame() {
    audio.unlock();
    world.setDifficulty(difficulty);
    world.reset();
    accumulator = 0;
    choices = null;
    screen = SCREEN_PLAY;
    announce(`Playing on ${DIFFICULTY[difficulty].label}. ${world.state.player.maxHull} hull. Collect shards, dodge mines, clear 5 waves.`);
    syncDebug();
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    recordRun(false);
    audio.over();
    announce(`Game over. Score ${world.state.score}. Best ${best}.`);
    syncDebug();
  }

  function winGame() {
    screen = SCREEN_WIN;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    recordRun(true);
    audio.win();
    announce(`Field harvested. Score ${world.state.score}. Best ${best}.`);
    syncDebug();
  }

  function openUpgrades() {
    choices = rollUpgrades(upgradeRandom);
    screen = SCREEN_UPGRADE;
    audio.wave();
    announce(`Wave ${world.state.wave - 1} clear. Choose an upgrade: ${choices.map((choice, index) => `${index + 1}, ${choice.name}`).join('; ')}.`);
    syncDebug();
  }

  function pickUpgrade(index) {
    if (!choices || index < 0 || index >= choices.length) return;
    const picked = choices[index];
    applyUpgrade(world.state, picked.id);
    choices = null;
    screen = SCREEN_PLAY;
    audio.upgrade();
    announce(`Upgrade taken: ${picked.name}. Wave ${world.state.wave} incoming.`);
    syncDebug();
  }

  function handleActions() {
    const actions = input.takeActions();
    const pointer = input.takePointer();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
      syncDebug();
    }
    if (screen === SCREEN_UPGRADE) {
      if (actions & ACTION_CHOICE_1) { pickUpgrade(0); return; }
      if (actions & ACTION_CHOICE_2) { pickUpgrade(1); return; }
      if (actions & ACTION_CHOICE_3) { pickUpgrade(2); return; }
      if (pointer) {
        const hit = UPGRADE_CARDS.findIndex((card) => (
          pointer.x >= card.x && pointer.x <= card.x + card.w
          && pointer.y >= card.y && pointer.y <= card.y + card.h
        ));
        if (hit >= 0) { pickUpgrade(hit); return; }
      }
      return;
    }
    if (screen === SCREEN_TITLE) {
      // Clicks on the difficulty buttons or the music / SFX pills change a
      // setting instead of starting the run (a click also raises CONFIRM,
      // so these must be checked before the start below).
      if (pointer) {
        const diffHit = DIFFICULTY_BUTTONS.findIndex((button) => (
          pointer.x >= button.x && pointer.x <= button.x + button.w
          && pointer.y >= button.y && pointer.y <= button.y + button.h
        ));
        if (diffHit >= 0) { selectDifficulty(DIFFICULTY_IDS[diffHit]); return; }
        const setHit = SETTINGS_BUTTONS.findIndex((button) => (
          pointer.x >= button.x && pointer.x <= button.x + button.w
          && pointer.y >= button.y && pointer.y <= button.y + button.h
        ));
        if (setHit >= 0) { toggleSetting(SETTINGS_BUTTONS[setHit].id); return; }
      }
      if (actions & ACTION_CHOICE_1) { selectDifficulty('relaxed'); return; }
      if (actions & ACTION_CHOICE_2) { selectDifficulty('standard'); return; }
      if (actions & ACTION_CHOICE_3) { selectDifficulty('expert'); return; }
      if (actions & ACTION_CONFIRM) {
        startGame();
        return;
      }
      return;
    }
    if (screen === SCREEN_OVER && (actions & (ACTION_CONFIRM | ACTION_RESTART))) {
      startGame();
      return;
    }
    if (screen === SCREEN_WIN) {
      if (actions & ACTION_CONTINUE) {
        world.continueEndless();
        screen = SCREEN_PLAY;
        announce('Endless flight. The field keeps coming.');
        syncDebug();
        return;
      }
      if (actions & (ACTION_CONFIRM | ACTION_RESTART)) {
        startGame();
        return;
      }
    }
    if (screen === SCREEN_PAUSED) {
      // The music / SFX pills work here too; any other click resumes.
      if (pointer) {
        const setHit = SETTINGS_BUTTONS.findIndex((button) => (
          pointer.x >= button.x && pointer.x <= button.x + button.w
          && pointer.y >= button.y && pointer.y <= button.y + button.h
        ));
        if (setHit >= 0) { toggleSetting(SETTINGS_BUTTONS[setHit].id); return; }
      }
      if (actions & ACTION_RESTART) {
        startGame();
        return;
      }
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
        syncDebug();
        return;
      }
      return;
    }
    if (screen === SCREEN_PLAY && (actions & ACTION_PAUSE)) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      syncDebug();
      return;
    }
    if (screen === SCREEN_PLAY && (actions & ACTION_PULSE)) {
      const result = world.firePulse();
      if (result) {
        audio.pulse();
        if (result.events & EVENT_PULSE) audio.droneDown();
        if (result.events & EVENT_BOSS) audio.bossDown();
      } else {
        audio.denied();
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, true);
      return;
    }
    const events = world.step(STEP, input.direction(), false);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_WIN) winGame();
    else {
      if (events & EVENT_HIT) {
        audio.hit();
        announce(world.state.player.hull === 1 ? 'Hit. 1 hull left.' : `Hit. ${world.state.player.hull} hull left.`);
      }
      if (events & EVENT_SHIELD) {
        audio.shield();
        announce('Shield absorbed the hit.');
      }
      if (events & EVENT_SHARD) audio.collect(world.state.combo);
      if (events & EVENT_CELL) audio.cell();
      if (events & EVENT_RUSH) audio.rush();
      if (events & EVENT_SHOT) audio.shot();
      if (events & EVENT_WAVE) openUpgrades();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, choices, drawExtra());
    syncDebug();
  }

  // Leaving the tab pauses a running game rather than letting drones hunt unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      syncDebug();
    }
  });

  announce('Nova Harvest. Press Space or click to start.');
  syncDebug();
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
