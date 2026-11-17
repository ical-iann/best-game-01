// Nova Harvest — the staged scenes behind ?shot=menu|play|win|over|upgrade.
// Each one plays the real rules forward from a fresh world for a fixed number of
// steps, steered by an autopilot, so the frame is what a short game really looks
// like and the same seed always gives the same frame.
import { FIELD, SHOT_SECONDS, SKIFF } from './config.js';
import { EVENT_OVER, EVENT_WAVE, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './render.js';
import { rollUpgrades } from './upgrades.js';
import { createRandom } from './random.js';

const SAMPLE = 1 / 30;
const DANGER_RADIUS = 130;

/** The nearest active thing of a kind, or null. */
function nearest(state, list, x, y) {
  let found = null;
  let best = Infinity;
  for (const item of list) {
    if (!item.active) continue;
    const dx = item.x - x;
    const dy = item.y - y;
    const d = dx * dx + dy * dy;
    if (d < best) {
      best = d;
      found = item;
    }
  }
  return found;
}

/**
 * Steer the skiff: chase the nearest shard or cell, shy away from a mine or foe
 * that is close, and fire the pulse when a foe wanders into blast range. The
 * careless pilot chases shards blind and never pulses, so it is caught out in
 * the end.
 */
function autopilot(state, careful) {
  const player = state.player;
  let fx = 0;
  let fy = 0;
  const shard = nearest(state, state.shards, player.x, player.y);
  const cell = nearest(state, state.cells, player.x, player.y);
  const target = shard ?? cell;
  if (target) {
    fx += (target.x - player.x) / 300;
    fy += (target.y - player.y) / 300;
  } else {
    fx += (FIELD.width / 2 - player.x) / 400;
    fy += (FIELD.height / 2 - player.y) / 400;
  }
  if (careful) {
    for (const list of [state.mines, state.drones, state.darters, state.splitters, state.minis]) {
      const threat = nearest(state, list, player.x, player.y);
      if (threat) {
        const dx = player.x - threat.x;
        const dy = player.y - threat.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < DANGER_RADIUS) {
          const push = (DANGER_RADIUS - d) / DANGER_RADIUS * 2.2;
          fx += (dx / d) * push;
          fy += (dy / d) * push;
        }
      }
    }
    if (state.boss && state.boss.active) {
      const dx = player.x - state.boss.x;
      const dy = player.y - state.boss.y;
      const d = Math.hypot(dx, dy) || 1;
      // The Warden is slow: keep out of its touch but close enough to pulse it.
      if (d < 150) {
        const push = (150 - d) / 150 * 2.4;
        fx += (dx / d) * push;
        fy += (dy / d) * push;
      } else if (d < 260 && player.energy >= SKIFF.pulseCost) {
        fx += (-dx / d) * 0.8;
        fy += (-dy / d) * 0.8;
      }
    }
  }
  const len = Math.hypot(fx, fy);
  const thrust = len > 1 ? { x: fx / len, y: fy / len } : { x: fx, y: fy };
  let pulse = false;
  if (careful) {
    for (const list of [state.drones, state.darters, state.splitters, state.minis]) {
      for (const foe of list) {
        if (!foe.active) continue;
        const d = Math.hypot(foe.x - player.x, foe.y - player.y);
        if (d < SKIFF.pulseRadius && player.energy >= SKIFF.pulseCost) {
          pulse = true;
          break;
        }
      }
      if (pulse) break;
    }
    if (!pulse && state.boss && state.boss.active) {
      const d = Math.hypot(state.boss.x - player.x, state.boss.y - player.y);
      if (d < SKIFF.pulseRadius + 42 && player.energy >= SKIFF.pulseCost) pulse = true;
    }
  }
  return { thrust, pulse };
}

/**
 * Set `world` to the named scene and return the screen to draw over it, the
 * best score to show, and the upgrade choices when the scene is one.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name === 'menu' || name !== 'play' && name !== 'win' && name !== 'over' && name !== 'upgrade') {
    for (let index = 0; index < SHOT_SECONDS.menu / SAMPLE; index += 1) {
      world.step(SAMPLE, { x: 0, y: 0 }, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const careful = name !== 'over';
  // The win scene plays a careful run all the way to the Warden's fall; the
  // upgrade scene stops at the first cleared wave with its choices open.
  const maxSeconds = name === 'win' ? 900 : name === 'over' ? SHOT_SECONDS.over : 240;
  let choices = null;
  for (let index = 0; index < maxSeconds / SAMPLE; index += 1) {
    const { thrust, pulse } = autopilot(state, careful);
    if (pulse) world.firePulse();
    const events = world.step(SAMPLE, thrust, false);
    if (events & EVENT_WIN) {
      return { screen: SCREEN_WIN, best: state.score };
    }
    if (events & EVENT_WAVE) {
      if (name === 'upgrade') {
        choices = rollUpgrades(createRandom(7));
        return { screen: SCREEN_UPGRADE, best: state.score, choices };
      }
      // A wave cleared on the way to the win: keep flying.
    }
    if (events & EVENT_OVER) break;
    if (name === 'play' && state.time >= SHOT_SECONDS.play) break;
    if (name === 'over' && state.player.hull === 0) break;
  }
  const over = state.player.hull === 0;
  if (name === 'upgrade' && !choices) {
    // The pilot never cleared a wave: offer the choices over the field anyway.
    choices = rollUpgrades(createRandom(7));
    return { screen: SCREEN_UPGRADE, best: state.score, choices };
  }
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
}
