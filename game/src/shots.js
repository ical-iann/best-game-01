// Nova Harvest — the staged scenes behind ?shot=menu|play|action|over.
// Each one plays the real rules forward from a fresh world for a fixed number of
// steps, steered by an autopilot, so the frame is what a short game really looks
// like and the same seed always gives the same frame.
import { DRONE, FIELD, MINE, SHARD, SHOT_SECONDS, SKIFF } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

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
 * Steer the skiff: chase the nearest shard, shy away from a mine or drone that is
 * close, and fire the pulse when a drone wanders into blast range. The careless
 * pilot chases shards blind and never pulses, so it is caught out in the end.
 */
function autopilot(state, careful) {
  const player = state.player;
  let fx = 0;
  let fy = 0;
  const shard = nearest(state, state.shards, player.x, player.y);
  if (shard) {
    fx += (shard.x - player.x) / 300;
    fy += (shard.y - player.y) / 300;
  } else {
    fx += (FIELD.width / 2 - player.x) / 400;
    fy += (FIELD.height / 2 - player.y) / 400;
  }
  if (careful) {
    for (const list of [state.mines, state.drones]) {
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
  }
  const len = Math.hypot(fx, fy);
  const thrust = len > 1 ? { x: fx / len, y: fy / len } : { x: fx, y: fy };
  let pulse = false;
  if (careful) {
    for (const drone of state.drones) {
      if (!drone.active) continue;
      const d = Math.hypot(drone.x - player.x, drone.y - player.y);
      if (d < SKIFF.pulseRadius && player.energy >= SKIFF.pulseCost) {
        pulse = true;
        break;
      }
    }
  }
  return { thrust, pulse };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the
 * best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'action' && name !== 'over') {
    for (let index = 0; index < SHOT_SECONDS.menu / SAMPLE; index += 1) {
      world.step(SAMPLE, { x: 0, y: 0 }, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const seconds = name === 'over' ? SHOT_SECONDS.over : name === 'action' ? SHOT_SECONDS.action : SHOT_SECONDS.play;
  const careful = name !== 'over';
  for (let index = 0; index < seconds / SAMPLE; index += 1) {
    const { thrust, pulse } = autopilot(state, careful);
    if (pulse) world.firePulse();
    if (world.step(SAMPLE, thrust, false) & EVENT_OVER) break;
  }
  if (name === 'action') {
    // End the action scene mid-blast so the pulse ring is in the frame.
    state.player.energy = SKIFF.energyMax;
    world.firePulse();
    for (let index = 0; index < 3; index += 1) world.step(SAMPLE, { x: 0, y: 0 }, false);
  }
  const over = state.player.hull === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
}
