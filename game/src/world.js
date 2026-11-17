// Nova Harvest — the simulation: one skiff, drifting shards, mines and hunter drones.
// The world advances in fixed steps and nothing here touches the screen or the sound;
// it reports what happened as event bits so the caller can announce and play them.
import { COLORS, DRONE, FIELD, MINE, SHARD, SKIFF, WAVE } from './config.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WAVE = 4;
export const EVENT_WIN = 8;
export const EVENT_PULSE = 16;
export const EVENT_SHARD = 32;

const TAU = Math.PI * 2;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function farFromPlayer(random, player, minDist) {
  for (let tries = 0; tries < 12; tries += 1) {
    const x = random.range(50, FIELD.width - 50);
    const y = random.range(70, FIELD.height - 50);
    if (dist2(x, y, player.x, player.y) > minDist * minDist) return { x, y };
  }
  return { x: random.range(50, FIELD.width - 50), y: random.range(70, FIELD.height - 50) };
}

export function createWorld(random) {
  const state = {
    time: 0,
    score: 0,
    wave: 1,
    combo: 0,
    comboTimer: 0,
    multiplier: 1,
    dronesLeft: 0, // spawned and still alive, plus those still to arrive
    shake: 0,
    player: { x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2, hull: SKIFF.hull, invuln: 0, energy: SKIFF.energyMax, pulseAge: 9 },
    shards: [],
    mines: [],
    drones: [],
    particles: [],
    floats: [],
    stars: [],
    nebulae: [],
  };
  let dronesToSpawn = 0;
  let droneTimer = 0;
  let shardTimer = 0;
  let wavePause = 0;

  function burst(x, y, color, count, speed) {
    for (let index = 0; index < count; index += 1) {
      const angle = random.next() * TAU;
      const vel = random.range(speed * 0.3, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        life: random.range(0.35, 0.8),
        maxLife: 0.8,
        color,
        size: random.range(2, 4.5),
      });
    }
  }

  function floatText(x, y, text, color) {
    state.floats.push({ x, y, text, life: 1.1, color });
  }

  function spawnShard() {
    const at = farFromPlayer(random, state.player, 140);
    const angle = random.next() * TAU;
    state.shards.push({
      x: at.x, y: at.y,
      vx: Math.cos(angle) * SHARD.drift,
      vy: Math.sin(angle) * SHARD.drift,
      phase: random.next() * TAU,
      active: true,
    });
  }

  function spawnMine() {
    const at = farFromPlayer(random, state.player, 190);
    const angle = random.next() * TAU;
    state.mines.push({
      x: at.x, y: at.y,
      vx: Math.cos(angle) * MINE.drift,
      vy: Math.sin(angle) * MINE.drift,
      phase: random.next() * TAU,
      active: true,
    });
  }

  function spawnDrone() {
    // Drones slip in from the edge farthest from the skiff.
    const edge = random.int(0, 4);
    let x = 40;
    let y = 40;
    if (edge === 0) { x = random.range(60, FIELD.width - 60); y = 36; }
    if (edge === 1) { x = random.range(60, FIELD.width - 60); y = FIELD.height - 36; }
    if (edge === 2) { x = 36; y = random.range(60, FIELD.height - 60); }
    if (edge === 3) { x = FIELD.width - 36; y = random.range(60, FIELD.height - 60); }
    state.drones.push({ x, y, vx: 0, vy: 0, active: true, phase: random.next() * TAU });
  }

  function startWave(wave) {
    const mines = WAVE.mineBase + WAVE.minePerWave * (wave - 1);
    const drones = WAVE.droneBase + WAVE.dronePerWave * (wave - 1);
    for (let index = 0; index < mines; index += 1) spawnMine();
    dronesToSpawn = drones;
    state.dronesLeft = drones;
    droneTimer = 0.8;
  }

  function buildSky() {
    state.stars = [];
    for (let index = 0; index < 130; index += 1) {
      state.stars.push({
        x: random.range(0, FIELD.width),
        y: random.range(0, FIELD.height),
        size: random.range(0.6, 2.2),
        twinkle: random.range(0.4, 1.6),
        phase: random.next() * TAU,
      });
    }
    state.nebulae = [
      { x: 210, y: 150, radius: 260, color: 'rgba(64, 40, 140, 0.20)' },
      { x: 1060, y: 560, radius: 300, color: 'rgba(16, 90, 110, 0.20)' },
      { x: 640, y: 380, radius: 200, color: 'rgba(120, 30, 90, 0.13)' },
    ];
  }

  function reset() {
    state.time = 0;
    state.score = 0;
    state.wave = 1;
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
    state.dronesLeft = 0;
    state.shake = 0;
    state.player = { x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2, hull: SKIFF.hull, invuln: 0, energy: SKIFF.energyMax, pulseAge: 9 };
    state.shards = [];
    state.mines = [];
    state.drones = [];
    state.particles = [];
    state.floats = [];
    dronesToSpawn = 0;
    droneTimer = 0;
    shardTimer = 0;
    wavePause = 0;
    buildSky();
    for (let index = 0; index < 4; index += 1) spawnShard();
    startWave(1);
  }

  /** Fire the pulse blast. Returns true when it went off, false when energy is short. */
  function firePulse() {
    const player = state.player;
    if (player.energy < SKIFF.pulseCost) return false;
    player.energy -= SKIFF.pulseCost;
    player.pulseAge = 0;
    let kills = 0;
    for (const mine of state.mines) {
      if (!mine.active) continue;
      if (dist2(mine.x, mine.y, player.x, player.y) < (SKIFF.pulseRadius + MINE.radius) ** 2) {
        mine.active = false;
        burst(mine.x, mine.y, COLORS.mine, 10, 130);
      }
    }
    for (const drone of state.drones) {
      if (!drone.active) continue;
      if (dist2(drone.x, drone.y, player.x, player.y) < (SKIFF.pulseRadius + DRONE.radius) ** 2) {
        drone.active = false;
        kills += 1;
        state.score += DRONE.score;
        state.dronesLeft -= 1;
        burst(drone.x, drone.y, COLORS.drone, 12, 150);
        floatText(drone.x, drone.y - 10, `+${DRONE.score}`, COLORS.drone);
      }
    }
    if (kills > 0) burst(player.x, player.y, COLORS.pulse, 8, 90);
    return true;
  }

  function hurtPlayer(source) {
    const player = state.player;
    if (player.invuln > 0) return 0;
    player.hull -= 1;
    player.invuln = SKIFF.invulnerableSeconds;
    state.shake = 10;
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
    burst(player.x, player.y, COLORS.skiff, 22, 220);
    burst(source.x, source.y, COLORS.mine, 14, 180);
    if (player.hull <= 0) return EVENT_OVER;
    return EVENT_HIT;
  }

  function step(dt, thrust, attract) {
    const player = state.player;
    state.time += dt;
    let events = 0;

    // The skiff flies on momentum: thrust adds speed, drag bleeds it, walls bounce it.
    if (attract) {
      const cx = FIELD.width / 2;
      const cy = FIELD.height / 2;
      const angle = state.time * 0.25;
      const tx = cx + Math.cos(angle) * 190;
      const ty = cy + Math.sin(angle) * 110;
      player.vx += (tx - player.x) * 0.9 * dt;
      player.vy += (ty - player.y) * 0.9 * dt;
      player.vx *= Math.pow(0.4, dt);
      player.vy *= Math.pow(0.4, dt);
    } else {
      player.vx += thrust.x * SKIFF.thrust * dt;
      player.vy += thrust.y * SKIFF.thrust * dt;
      const drag = Math.pow(SKIFF.drag, dt * 60);
      player.vx *= drag;
      player.vy *= drag;
      const speed = Math.hypot(player.vx, player.vy);
      if (speed > SKIFF.maxSpeed) {
        player.vx = (player.vx / speed) * SKIFF.maxSpeed;
        player.vy = (player.vy / speed) * SKIFF.maxSpeed;
      }
    }
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    if (Math.hypot(player.vx, player.vy) > 12) player.angle = Math.atan2(player.vy, player.vx);
    if (player.x < SKIFF.radius) { player.x = SKIFF.radius; player.vx = Math.abs(player.vx) * 0.5; }
    if (player.x > FIELD.width - SKIFF.radius) { player.x = FIELD.width - SKIFF.radius; player.vx = -Math.abs(player.vx) * 0.5; }
    if (player.y < SKIFF.radius + 24) { player.y = SKIFF.radius + 24; player.vy = Math.abs(player.vy) * 0.5; }
    if (player.y > FIELD.height - SKIFF.radius) { player.y = FIELD.height - SKIFF.radius; player.vy = -Math.abs(player.vy) * 0.5; }
    if (player.invuln > 0) player.invuln -= dt;
    if (player.pulseAge < 9) player.pulseAge += dt;
    if (!attract) player.energy = Math.min(SKIFF.energyMax, player.energy + SKIFF.energyRecharge * dt);

    // The combo chain lives only while pickups keep coming.
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        state.multiplier = 1;
      }
    }

    // Shards drift, sparkle, and get picked up.
    for (const shard of state.shards) {
      if (!shard.active) continue;
      shard.phase += dt * 3;
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      if (shard.x < 20 || shard.x > FIELD.width - 20) shard.vx *= -1;
      if (shard.y < 44 || shard.y > FIELD.height - 20) shard.vy *= -1;
      if (!attract && dist2(shard.x, shard.y, player.x, player.y) < (SHARD.radius + SKIFF.radius) ** 2) {
        shard.active = false;
        state.combo += 1;
        state.comboTimer = SHARD.comboWindow;
        state.multiplier = Math.min(SHARD.comboMax, 1 + Math.floor(state.combo / SHARD.comboStep));
        const gained = SHARD.score * state.multiplier;
        state.score += gained;
        burst(shard.x, shard.y, COLORS.shard, 8, 120);
        floatText(shard.x, shard.y - 12, `+${gained}`, COLORS.shard);
        events |= EVENT_SHARD;
      }
    }
    state.shards = state.shards.filter((shard) => shard.active);

    // Mines drift and punish a touch.
    for (const mine of state.mines) {
      if (!mine.active) continue;
      mine.phase += dt * 2;
      mine.x += mine.vx * dt;
      mine.y += mine.vy * dt;
      if (mine.x < 20 || mine.x > FIELD.width - 20) mine.vx *= -1;
      if (mine.y < 44 || mine.y > FIELD.height - 20) mine.vy *= -1;
      if (!attract && player.invuln <= 0 && dist2(mine.x, mine.y, player.x, player.y) < (MINE.radius + SKIFF.radius - 4) ** 2) {
        mine.active = false;
        events |= hurtPlayer(mine);
      }
    }
    state.mines = state.mines.filter((mine) => mine.active);

    // Drones hunt the skiff once it comes close, and punish a touch.
    for (const drone of state.drones) {
      if (!drone.active) continue;
      drone.phase += dt * 2;
      const dx = player.x - drone.x;
      const dy = player.y - drone.y;
      const d = Math.hypot(dx, dy) || 1;
      if (!attract && d < DRONE.chase) {
        drone.vx += (dx / d) * DRONE.speed * 1.6 * dt;
        drone.vy += (dy / d) * DRONE.speed * 1.6 * dt;
      } else {
        drone.vx += Math.cos(drone.phase * 0.7) * 24 * dt;
        drone.vy += Math.sin(drone.phase * 0.7) * 24 * dt;
      }
      const speed = Math.hypot(drone.vx, drone.vy);
      const cap = attract ? 40 : DRONE.speed;
      if (speed > cap) {
        drone.vx = (drone.vx / speed) * cap;
        drone.vy = (drone.vy / speed) * cap;
      }
      drone.x += drone.vx * dt;
      drone.y += drone.vy * dt;
      if (drone.x < 20) { drone.x = 20; drone.vx = Math.abs(drone.vx); }
      if (drone.x > FIELD.width - 20) { drone.x = FIELD.width - 20; drone.vx = -Math.abs(drone.vx); }
      if (drone.y < 44) { drone.y = 44; drone.vy = Math.abs(drone.vy); }
      if (drone.y > FIELD.height - 20) { drone.y = FIELD.height - 20; drone.vy = -Math.abs(drone.vy); }
      if (!attract && player.invuln <= 0 && d < DRONE.radius + SKIFF.radius - 2) {
        drone.active = false;
        state.dronesLeft -= 1;
        events |= hurtPlayer(drone);
      }
    }
    state.drones = state.drones.filter((drone) => drone.active);

    // Spawning: shards keep the field worth crossing; drones arrive in a trickle.
    if (!attract) {
      shardTimer -= dt;
      if (shardTimer <= 0 && state.shards.length < SHARD.maxAlive) {
        spawnShard();
        shardTimer = SHARD.spawnEvery;
      }
      if (wavePause > 0) {
        wavePause -= dt;
      } else if (dronesToSpawn > 0) {
        droneTimer -= dt;
        if (droneTimer <= 0) {
          spawnDrone();
          dronesToSpawn -= 1;
          droneTimer = WAVE.spawnGap;
        }
      } else if (state.dronesLeft <= 0) {
        // The wave is clear: pay the bonus, open the next one, or win the run.
        const bonus = WAVE.clearBonus + WAVE.clearBonusPerWave * state.wave;
        state.score += bonus;
        floatText(player.x, player.y - 30, `WAVE ${state.wave} CLEAR +${bonus}`, COLORS.gold);
        if (state.wave >= WAVE.winWave) {
          events |= EVENT_WIN;
        } else {
          state.wave += 1;
          wavePause = 1.6;
          startWave(state.wave);
          events |= EVENT_WAVE;
        }
      }
    }

    // Sparks and score popups age out; the shake settles.
    for (const particle of state.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.2, dt);
      particle.vy *= Math.pow(0.2, dt);
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);
    for (const float of state.floats) {
      float.life -= dt;
      float.y -= 26 * dt;
    }
    state.floats = state.floats.filter((float) => float.life > 0);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);

    return events;
  }

  /** After the win screen, keep flying: open the next wave as an endless one. */
  function continueEndless() {
    state.wave += 1;
    wavePause = 1.2;
    startWave(state.wave);
  }

  reset();
  return { state, step, reset, firePulse, continueEndless };
}
