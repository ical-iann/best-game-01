// Nova Harvest — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast one),
// and the renderer paints what is there. The game moves between six screens:
// title, play, paused, upgrade, game over and victory.
//
// ?seed=N fixes the spawn pattern. ?shot=menu|play|win|over|upgrade (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.
import { BEST_KEY, SKIFF, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createWorld, EVENT_BOSS, EVENT_CELL, EVENT_HIT, EVENT_OVER, EVENT_PULSE, EVENT_SHARD, EVENT_SHIELD, EVENT_WAVE, EVENT_WIN } from './world.js';
import { ACTION_CHOICE_1, ACTION_CHOICE_2, ACTION_CHOICE_3, ACTION_CONFIRM, ACTION_CONTINUE, ACTION_MUTE, ACTION_PAUSE, ACTION_PULSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN, UPGRADE_CARDS } from './render.js';
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

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, scene.choices ?? null);
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
  let choices = null;
  let accumulator = 0;
  let last = performance.now();

  // The debug handle the play-tests read: the live screen and score, the foes
  // still to clear, and the upgrade choices on offer, nothing else.
  window.__game = { screen, score: 0, wave: 1, hull: SKIFF.hull, combo: 0, foesLeft: 0, upgrades: null };
  function syncDebug() {
    window.__game.screen = screen;
    window.__game.score = world.state.score;
    window.__game.wave = world.state.wave;
    window.__game.hull = world.state.player.hull;
    window.__game.combo = world.state.combo;
    window.__game.foesLeft = world.state.foesLeft;
    window.__game.upgrades = choices ? choices.map((choice) => choice.id) : null;
  }

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    choices = null;
    screen = SCREEN_PLAY;
    announce(`Playing. ${SKIFF.hull} hull. Collect shards, dodge mines, clear 5 waves.`);
    syncDebug();
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
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
    if (screen === SCREEN_TITLE && (actions & ACTION_CONFIRM)) {
      startGame();
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
    if (screen === SCREEN_PLAY && (actions & ACTION_PAUSE)) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      syncDebug();
      return;
    }
    if (screen === SCREEN_PAUSED && (actions & (ACTION_PAUSE | ACTION_CONFIRM))) {
      screen = SCREEN_PLAY;
      announce('Playing.');
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
    renderer.draw(world.state, screen, best, choices);
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
