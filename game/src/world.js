// Nova Harvest — the simulation: one skiff, drifting shards, mines, hunter
// drones, darters, splitters and the Void Warden, plus shield and surge cells.
// The world advances in fixed steps and nothing here touches the screen or the
// sound; it reports what happened as event bits so the caller can announce and
// play them.
import { BOLT, BOSS, CELL, COLORS, DARTER, DEPTH, DIFFICULTY, DRONE, FIELD, MINE, MINI, RUSH, SHARD, SKIFF, SPLITTER, STINGER, WAVE } from './config.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WAVE = 4;
export const EVENT_WIN = 8;
export const EVENT_PULSE = 16;
export const EVENT_SHARD = 32;
export const EVENT_SHIELD = 64;
export const EVENT_BOSS = 128;
export const EVENT_CELL = 256;
export const EVENT_RUSH = 512; // the Nova Rush meter just filled
export const EVENT_SHOT = 1024; // a stinger just fired a plasma bolt

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

export function createWorld(random, difficultyId = 'standard') {
  let difficulty = DIFFICULTY[difficultyId] ?? DIFFICULTY.standard;
  const freshStats = () => ({ shards: 0, kills: 0, pulses: 0, hits: 0, wavesCleared: 0, bestCombo: 0 });
  const state = {
    time: 0,
    score: 0,
    wave: 1,
    difficulty: difficulty.id,
    stats: freshStats(),
    combo: 0,
    comboTimer: 0,
    multiplier: 1,
    foesLeft: 0, // foes spawned and still alive, plus those still to arrive
    shake: 0,
    player: {
      x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2,
      hull: SKIFF.hull, maxHull: SKIFF.hull, invuln: 0, shield: false,
      energy: SKIFF.energyMax, pulseAge: 9,
      pulseRadius: SKIFF.pulseRadius, pulseCost: SKIFF.pulseCost,
      energyRecharge: SKIFF.energyRecharge, thrustMul: 1, maxSpeed: SKIFF.maxSpeed,
      magnet: 0,
    },
    shards: [],
    mines: [],
    drones: [],
    darters: [],
    splitters: [],
    minis: [],
    stingers: [],
    bolts: [],
    rush: { charge: 0, active: 0 },
    boss: null,
    cells: [],
    particles: [],
    floats: [],
    stars: [],
    nebulae: [],
    asteroids: [],
  };
  let spawnQueue = [];
  let spawnTimer = 0;
  let shardTimer = 0;
  let cellTimer = CELL.spawnEvery;
  let cellKind = 0;
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

  // Every point the run pays runs through here: Nova Rush doubles it, and
  // endless depth adds 5% per wave past the win wave, so a deep endless run
  // is worth more than the same kills on wave 2.
  function scoreGain(base) {
    const rushMul = state.rush.active > 0 ? 2 : 1;
    const depthMul = state.wave > WAVE.winWave ? 1 + DEPTH.perWave * (state.wave - WAVE.winWave) : 1;
    return Math.round(base * rushMul * depthMul);
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

  function edgePoint() {
    // A point just inside the edge farthest from the skiff: foes slip in from
    // far away, so the player always has time to see them coming.
    const player = state.player;
    const edges = [
      { x: FIELD.width / 2, y: 36 },
      { x: FIELD.width / 2, y: FIELD.height - 36 },
      { x: 36, y: FIELD.height / 2 },
      { x: FIELD.width - 36, y: FIELD.height / 2 },
    ];
    let best = edges[0];
    let bestD = -1;
    for (const edge of edges) {
      const d = dist2(edge.x, edge.y, player.x, player.y);
      if (d > bestD) { bestD = d; best = edge; }
    }
    // Jitter along the chosen edge so arrivals never stack on one point.
    if (best.y === 36 || best.y === FIELD.height - 36) {
      return { x: random.range(60, FIELD.width - 60), y: best.y };
    }
    return { x: best.x, y: random.range(60, FIELD.height - 60) };
  }

  function spawnDrone(at) {
    const spot = at ?? edgePoint();
    state.drones.push({ x: spot.x, y: spot.y, vx: 0, vy: 0, active: true, phase: random.next() * TAU, grace: 1.5 });
  }

  function spawnDarter() {
    const spot = edgePoint();
    state.darters.push({ x: spot.x, y: spot.y, vx: 0, vy: 0, active: true, phase: random.next() * TAU, grace: 1.5 });
  }

  function spawnSplitter() {
    const spot = edgePoint();
    state.splitters.push({ x: spot.x, y: spot.y, vx: 0, vy: 0, active: true, phase: random.next() * TAU, grace: 1.5 });
  }

  function spawnStinger() {
    const spot = edgePoint();
    state.stingers.push({ x: spot.x, y: spot.y, vx: 0, vy: 0, active: true, phase: random.next() * TAU, grace: 1.5, age: 0, timer: random.range(1.5, 3), charging: 0 });
  }

  function spawnBolt(from) {
    const player = state.player;
    const dx = player.x - from.x;
    const dy = player.y - from.y;
    const d = Math.hypot(dx, dy) || 1;
    state.bolts.push({
      x: from.x, y: from.y,
      vx: (dx / d) * BOLT.speed,
      vy: (dy / d) * BOLT.speed,
      life: BOLT.life, active: true,
    });
  }

  function spawnMini(x, y) {
    const angle = random.next() * TAU;
    state.minis.push({
      x, y,
      vx: Math.cos(angle) * MINI.speed * 0.7,
      vy: Math.sin(angle) * MINI.speed * 0.7,
      active: true, phase: random.next() * TAU, grace: 1.0,
    });
  }

  function spawnBoss() {
    const spot = edgePoint();
    state.boss = {
      x: spot.x, y: spot.y, vx: 0, vy: 0, hp: difficulty.bossHits, maxHp: difficulty.bossHits,
      phase: random.next() * TAU, spawnTimer: 3, active: true,
    };
  }

  function spawnCell() {
    const at = farFromPlayer(random, state.player, 160);
    const kind = cellKind % 2 === 0 ? 'shield' : 'surge';
    cellKind += 1;
    const angle = random.next() * TAU;
    state.cells.push({
      x: at.x, y: at.y,
      vx: Math.cos(angle) * 10, vy: Math.sin(angle) * 10,
      kind, phase: random.next() * TAU, active: true,
    });
  }

  function startWave(wave) {
    const mines = Math.max(1, WAVE.mineBase + WAVE.minePerWave * (wave - 1) + difficulty.mineDelta);
    const drones = Math.max(2, WAVE.droneBase + WAVE.dronePerWave * (wave - 1) + difficulty.droneDelta);
    const darterWave = 2 + difficulty.darterDelay;
    const splitterWave = 3 + difficulty.splitterDelay;
    const stingerWave = 3 + difficulty.stingerDelay;
    const darters = wave >= darterWave ? WAVE.darterPerWave * (wave - darterWave + 1) : 0;
    const splitters = wave >= splitterWave ? WAVE.splitterPerWave * (wave - splitterWave + 1) : 0;
    const stingers = wave >= stingerWave ? WAVE.stingerPerWave * (wave - stingerWave + 1) : 0;
    const bossWave = wave % WAVE.winWave === 0;
    for (let index = 0; index < mines; index += 1) spawnMine();
    spawnQueue = [];
    for (let index = 0; index < drones; index += 1) spawnQueue.push('drone');
    for (let index = 0; index < darters; index += 1) spawnQueue.push('darter');
    for (let index = 0; index < splitters; index += 1) spawnQueue.push('splitter');
    for (let index = 0; index < stingers; index += 1) spawnQueue.push('stinger');
    // Shuffle the arrivals so the wave never comes in one kind at a time.
    for (let index = spawnQueue.length - 1; index > 0; index -= 1) {
      const other = random.int(0, index + 1);
      const held = spawnQueue[index];
      spawnQueue[index] = spawnQueue[other];
      spawnQueue[other] = held;
    }
    state.foesLeft = spawnQueue.length + (bossWave ? 1 : 0);
    if (bossWave) spawnBoss();
    spawnTimer = 0.8;
    floatText(FIELD.width / 2, 150, `WAVE ${wave}${bossWave ? ' — THE VOID WARDEN' : ''}`, COLORS.gold);
  }

  function buildSky() {
    state.stars = [];
    for (let index = 0; index < 220; index += 1) {
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
    state.asteroids = [];
    for (let index = 0; index < 9; index += 1) {
      const verts = [];
      const count = 7 + random.int(0, 3);
      for (let v = 0; v < count; v += 1) verts.push(random.range(0.7, 1.25));
      state.asteroids.push({
        x: random.range(0, FIELD.width),
        y: random.range(0, FIELD.height),
        radius: random.range(18, 46),
        rot: random.next() * TAU,
        rotSpeed: random.range(-0.12, 0.12),
        vx: random.range(-7, 7),
        vy: random.range(-5, 5),
        verts,
      });
    }
  }

  function reset() {
    state.time = 0;
    state.score = 0;
    state.wave = 1;
    state.difficulty = difficulty.id;
    state.stats = freshStats();
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
    state.foesLeft = 0;
    state.shake = 0;
    state.player = {
      x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2,
      hull: difficulty.hull, maxHull: difficulty.hull, invuln: 0, shield: false,
      energy: SKIFF.energyMax, pulseAge: 9,
      pulseRadius: SKIFF.pulseRadius, pulseCost: SKIFF.pulseCost,
      energyRecharge: SKIFF.energyRecharge * difficulty.energyRechargeMul, thrustMul: 1, maxSpeed: SKIFF.maxSpeed,
      magnet: 0,
    };
    state.shards = [];
    state.mines = [];
    state.drones = [];
    state.darters = [];
    state.splitters = [];
    state.minis = [];
    state.stingers = [];
    state.bolts = [];
    state.rush = { charge: 0, active: 0 };
    state.boss = null;
    state.cells = [];
    state.particles = [];
    state.floats = [];
    spawnQueue = [];
    spawnTimer = 0;
    shardTimer = 0;
    cellTimer = CELL.spawnEvery;
    cellKind = 0;
    wavePause = 0;
    buildSky();
    for (let index = 0; index < 4; index += 1) spawnShard();
    startWave(1);
  }

  /** Fire the pulse blast. Returns true when it went off, false when energy is short. */
  function firePulse() {
    const player = state.player;
    if (player.energy < player.pulseCost) return false;
    player.energy -= player.pulseCost;
    player.pulseAge = 0;
    state.stats.pulses += 1;
    let kills = 0;
    let events = 0;
    const radius = player.pulseRadius;
    for (const mine of state.mines) {
      if (!mine.active) continue;
      if (dist2(mine.x, mine.y, player.x, player.y) < (radius + MINE.radius) ** 2) {
        mine.active = false;
        burst(mine.x, mine.y, COLORS.mine, 10, 130);
      }
    }
    // The blast also burns incoming plasma bolts out of the air.
    for (const bolt of state.bolts) {
      if (!bolt.active) continue;
      if (dist2(bolt.x, bolt.y, player.x, player.y) < (radius + BOLT.radius) ** 2) {
        bolt.active = false;
        burst(bolt.x, bolt.y, COLORS.bolt, 6, 110);
      }
    }
    const pulseKill = (list, kindRadius, score, color, onKill) => {
      for (const foe of list) {
        if (!foe.active) continue;
        if (dist2(foe.x, foe.y, player.x, player.y) < (radius + kindRadius) ** 2) {
          foe.active = false;
          kills += 1;
          state.stats.kills += 1;
          const gained = scoreGain(score);
          state.score += gained;
          state.foesLeft -= 1;
          burst(foe.x, foe.y, color, 12, 150);
          floatText(foe.x, foe.y - 10, `+${gained}`, color);
          if (onKill) onKill(foe);
        }
      }
    };
    pulseKill(state.drones, DRONE.radius, DRONE.score, COLORS.drone);
    pulseKill(state.darters, DARTER.radius, DARTER.score, COLORS.darter);
    pulseKill(state.minis, MINI.radius, MINI.score, COLORS.mini);
    pulseKill(state.stingers, STINGER.radius, STINGER.score, COLORS.stinger);
    pulseKill(state.splitters, SPLITTER.radius, SPLITTER.score, COLORS.splitter, (foe) => {
      spawnMini(foe.x - 14, foe.y);
      spawnMini(foe.x + 14, foe.y);
      state.foesLeft += 2;
    });
    const boss = state.boss;
    if (boss && boss.active && dist2(boss.x, boss.y, player.x, player.y) < (radius + BOSS.radius) ** 2) {
      boss.hp -= 1;
      burst(boss.x, boss.y, COLORS.boss, 18, 200);
      state.shake = Math.max(state.shake, 8);
      if (boss.hp <= 0) {
        boss.active = false;
        state.boss = null;
        const gained = scoreGain(BOSS.score);
        state.score += gained;
        state.stats.kills += 1;
        state.foesLeft -= 1;
        burst(boss.x, boss.y, COLORS.boss, 40, 280);
        burst(boss.x, boss.y, COLORS.gold, 24, 220);
        floatText(boss.x, boss.y - 20, `WARDEN DOWN +${gained}`, COLORS.gold);
        events |= EVENT_BOSS;
      } else {
        floatText(boss.x, boss.y - 20, `WARDEN ${boss.hp}/${boss.maxHp}`, COLORS.boss);
      }
    }
    if (kills > 0) {
      burst(player.x, player.y, COLORS.pulse, 8, 90);
      events |= EVENT_PULSE;
    }
    return { fired: true, events };
  }

  function hurtPlayer(source) {
    const player = state.player;
    if (player.invuln > 0) return 0;
    if (player.shield) {
      player.shield = false;
      player.invuln = 1;
      burst(player.x, player.y, COLORS.shield, 20, 200);
      floatText(player.x, player.y - 30, 'SHIELD DOWN', COLORS.shield);
      return EVENT_SHIELD;
    }
    player.hull -= 1;
    player.invuln = SKIFF.invulnerableSeconds;
    state.stats.hits += 1;
    state.shake = 10;
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
    burst(player.x, player.y, COLORS.skiff, 22, 220);
    burst(source.x, source.y, COLORS.mine, 14, 180);
    if (player.hull <= 0) return EVENT_OVER;
    return EVENT_HIT;
  }

  /** Chase the skiff inside `chase`, drift otherwise; returns nothing.
   *  The last two foes of a wave smell blood: they hunt faster, from anywhere. */
  function chase(foe, speed, chaseRange, dt, attract, weave = 0) {
    const player = state.player;
    const frenzy = state.foesLeft <= 2 ? 1.6 : 1;
    const pace = speed * frenzy;
    const range = frenzy > 1 ? FIELD.width : chaseRange;
    const dx = player.x - foe.x;
    const dy = player.y - foe.y;
    const d = Math.hypot(dx, dy) || 1;
    if (!attract && d < range) {
      foe.vx += (dx / d) * pace * 1.6 * dt;
      foe.vy += (dy / d) * pace * 1.6 * dt;
      if (weave) {
        const side = Math.sin(foe.phase * DARTER.zigzag);
        foe.vx += (-dy / d) * side * pace * 1.2 * dt;
        foe.vy += (dx / d) * side * pace * 1.2 * dt;
      }
    } else {
      foe.vx += Math.cos(foe.phase * 0.7) * 24 * dt;
      foe.vy += Math.sin(foe.phase * 0.7) * 24 * dt;
    }
    const cap = attract ? 40 : pace;
    const v = Math.hypot(foe.vx, foe.vy);
    if (v > cap) {
      foe.vx = (foe.vx / v) * cap;
      foe.vy = (foe.vy / v) * cap;
    }
    foe.x += foe.vx * dt;
    foe.y += foe.vy * dt;
    if (foe.x < 20) { foe.x = 20; foe.vx = Math.abs(foe.vx); }
    if (foe.x > FIELD.width - 20) { foe.x = FIELD.width - 20; foe.vx = -Math.abs(foe.vx); }
    if (foe.y < 44) { foe.y = 44; foe.vy = Math.abs(foe.vy); }
    if (foe.y > FIELD.height - 20) { foe.y = FIELD.height - 20; foe.vy = -Math.abs(foe.vy); }
  }

  function touchFoe(foe, radius, dt) {
    // A foe that touches the skiff hurts it and dies with it.
    const player = state.player;
    const d = Math.hypot(player.x - foe.x, player.y - foe.y);
    if (d < radius + SKIFF.radius - 2) {
      foe.active = false;
      state.foesLeft -= 1;
      return hurtPlayer(foe);
    }
    return 0;
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
      player.vx += thrust.x * SKIFF.thrust * player.thrustMul * dt;
      player.vy += thrust.y * SKIFF.thrust * player.thrustMul * dt;
      const drag = Math.pow(SKIFF.drag, dt * 60);
      player.vx *= drag;
      player.vy *= drag;
      const speed = Math.hypot(player.vx, player.vy);
      if (speed > player.maxSpeed) {
        player.vx = (player.vx / speed) * player.maxSpeed;
        player.vy = (player.vy / speed) * player.maxSpeed;
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
    // Nova Rush doubles the pulse recharge while it burns, and ticks down.
    const rushOn = state.rush.active > 0;
    if (rushOn) state.rush.active -= dt;
    if (!attract) player.energy = Math.min(SKIFF.energyMax, player.energy + player.energyRecharge * (rushOn ? 2 : 1) * dt);

    // The combo chain lives only while pickups keep coming.
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        state.multiplier = 1;
      }
    }

    // Shards drift, sparkle, and get picked up; a magnet pulls them in.
    for (const shard of state.shards) {
      if (!shard.active) continue;
      shard.phase += dt * 3;
      if (!attract && player.magnet > 0) {
        const d = Math.hypot(player.x - shard.x, player.y - shard.y);
        const reach = 120 + 60 * player.magnet;
        if (d < reach && d > 1) {
          shard.vx += ((player.x - shard.x) / d) * 260 * dt;
          shard.vy += ((player.y - shard.y) / d) * 260 * dt;
        }
      }
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      if (shard.x < 20 || shard.x > FIELD.width - 20) shard.vx *= -1;
      if (shard.y < 44 || shard.y > FIELD.height - 20) shard.vy *= -1;
      if (!attract && dist2(shard.x, shard.y, player.x, player.y) < (SHARD.radius + SKIFF.radius) ** 2) {
        shard.active = false;
        state.combo += 1;
        state.stats.shards += 1;
        state.stats.bestCombo = Math.max(state.stats.bestCombo, state.combo);
        state.comboTimer = SHARD.comboWindow;
        state.multiplier = Math.min(SHARD.comboMax, 1 + Math.floor(state.combo / SHARD.comboStep));
        const gained = scoreGain(SHARD.score * state.multiplier);
        state.score += gained;
        burst(shard.x, shard.y, COLORS.shard, 8, 120);
        floatText(shard.x, shard.y - 12, `+${gained}`, COLORS.shard);
        events |= EVENT_SHARD;
        // Every shard feeds the rush meter; a full meter fires Nova Rush.
        if (state.rush.active <= 0) {
          state.rush.charge += 1;
          if (state.rush.charge >= RUSH.need) {
            state.rush.charge = 0;
            state.rush.active = RUSH.duration;
            floatText(player.x, player.y - 44, 'NOVA RUSH ×2', COLORS.rush);
            burst(player.x, player.y, COLORS.rush, 16, 180);
            events |= EVENT_RUSH;
          }
        }
      }
    }
    state.shards = state.shards.filter((shard) => shard.active);

    // Cells drift in rarely: a shield eats one hit, a surge refills the pulse.
    for (const cell of state.cells) {
      if (!cell.active) continue;
      cell.phase += dt * 2;
      cell.x += cell.vx * dt;
      cell.y += cell.vy * dt;
      if (cell.x < 20 || cell.x > FIELD.width - 20) cell.vx *= -1;
      if (cell.y < 44 || cell.y > FIELD.height - 20) cell.vy *= -1;
      if (!attract && dist2(cell.x, cell.y, player.x, player.y) < (CELL.radius + SKIFF.radius) ** 2) {
        cell.active = false;
        if (cell.kind === 'shield') {
          player.shield = true;
          floatText(player.x, player.y - 30, 'AEGIS SHIELD UP', COLORS.shield);
          burst(cell.x, cell.y, COLORS.shield, 12, 140);
        } else {
          player.energy = Math.min(SKIFF.energyMax, player.energy + CELL.surgeEnergy);
          floatText(player.x, player.y - 30, `SURGE +${CELL.surgeEnergy}`, COLORS.surge);
          burst(cell.x, cell.y, COLORS.surge, 12, 140);
        }
        events |= EVENT_CELL;
      }
    }
    state.cells = state.cells.filter((cell) => cell.active);

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

    // The hunters: drones chase, darters weave in fast, splitters lumber, minis swarm.
    // Each kind hunts harder the deeper the run goes — and faster on Expert,
    // slower on Relaxed (speedMul / chaseMul from the chosen difficulty).
    const wv = state.wave - 1;
    const speedMul = difficulty.speedMul;
    const chaseMul = difficulty.chaseMul;
    for (const drone of state.drones) {
      if (!drone.active) continue;
      drone.phase += dt * 2;
      if (drone.grace > 0) drone.grace -= dt;
      chase(drone, (DRONE.speed + DRONE.speedPerWave * wv) * speedMul, Math.min(700, (DRONE.chase + DRONE.chasePerWave * wv) * chaseMul), dt, attract || drone.grace > 0);
      if (!attract && player.invuln <= 0 && drone.grace <= 0) events |= touchFoe(drone, DRONE.radius, dt);
    }
    state.drones = state.drones.filter((drone) => drone.active);
    for (const darter of state.darters) {
      if (!darter.active) continue;
      darter.phase += dt * 2;
      if (darter.grace > 0) darter.grace -= dt;
      chase(darter, (DARTER.speed + DARTER.speedPerWave * wv) * speedMul, Math.min(700, (DARTER.chase + DARTER.chasePerWave * wv) * chaseMul), dt, attract || darter.grace > 0, 1);
      if (!attract && player.invuln <= 0 && darter.grace <= 0) events |= touchFoe(darter, DARTER.radius, dt);
    }
    state.darters = state.darters.filter((darter) => darter.active);
    for (const splitter of state.splitters) {
      if (!splitter.active) continue;
      splitter.phase += dt * 2;
      if (splitter.grace > 0) splitter.grace -= dt;
      chase(splitter, SPLITTER.speed * speedMul, SPLITTER.chase * chaseMul, dt, attract || splitter.grace > 0);
      if (!attract && player.invuln <= 0 && splitter.grace <= 0) events |= touchFoe(splitter, SPLITTER.radius, dt);
    }
    state.splitters = state.splitters.filter((splitter) => splitter.active);
    for (const mini of state.minis) {
      if (!mini.active) continue;
      mini.phase += dt * 2;
      if (mini.grace > 0) mini.grace -= dt;
      chase(mini, (MINI.speed + MINI.speedPerWave * wv) * speedMul, Math.min(700, (MINI.chase + MINI.chasePerWave * wv) * chaseMul), dt, attract || mini.grace > 0);
      if (!attract && player.invuln <= 0 && mini.grace <= 0) events |= touchFoe(mini, MINI.radius, dt);
    }
    state.minis = state.minis.filter((mini) => mini.active);

    // Stingers hold off at range and shoot: they drift to their hold distance,
    // strafe slowly, then telegraph a shot and fire a plasma bolt at where
    // the skiff was. The bolt is slower than the skiff, so it can be dodged —
    // and a pulse burns bolts out of the air.
    for (const stinger of state.stingers) {
      if (!stinger.active) continue;
      stinger.phase += dt * 2;
      stinger.age += dt;
      if (stinger.grace > 0) stinger.grace -= dt;
      const dx = player.x - stinger.x;
      const dy = player.y - stinger.y;
      const d = Math.hypot(dx, dy) || 1;
      // It holds its shooting distance — unless it is one of the last foes
      // left, when, like every other foe, it smells blood and closes in to
      // pulse range instead of kiting the wave to a standstill. Either way
      // the hold distance shrinks as the stinger ages, so a wave always ends.
      const hold = state.foesLeft <= 2 ? 110 : Math.max(160, STINGER.holdRange - stinger.age * STINGER.holdDecay);
      let mx = 0;
      let my = 0;
      if (d > hold + 50) { mx = dx / d; my = dy / d; }
      else if (d < hold - 50) { mx = -dx / d; my = -dy / d; }
      else {
        const side = Math.sin(stinger.phase * 0.9);
        mx = (-dy / d) * side;
        my = (dx / d) * side;
      }
      const pace = STINGER.speed * speedMul * (state.foesLeft <= 2 ? 1.6 : 1);
      stinger.vx += mx * pace * 1.6 * dt;
      stinger.vy += my * pace * 1.6 * dt;
      const v = Math.hypot(stinger.vx, stinger.vy);
      if (v > pace) {
        stinger.vx = (stinger.vx / v) * pace;
        stinger.vy = (stinger.vy / v) * pace;
      }
      stinger.x += stinger.vx * dt;
      stinger.y += stinger.vy * dt;
      if (stinger.x < 20) { stinger.x = 20; stinger.vx = Math.abs(stinger.vx); }
      if (stinger.x > FIELD.width - 20) { stinger.x = FIELD.width - 20; stinger.vx = -Math.abs(stinger.vx); }
      if (stinger.y < 44) { stinger.y = 44; stinger.vy = Math.abs(stinger.vy); }
      if (stinger.y > FIELD.height - 20) { stinger.y = FIELD.height - 20; stinger.vy = -Math.abs(stinger.vy); }
      if (!attract && stinger.grace <= 0) {
        if (stinger.charging > 0) {
          stinger.charging -= dt;
          if (stinger.charging <= 0) {
            spawnBolt(stinger);
            stinger.timer = STINGER.fireEvery;
            events |= EVENT_SHOT;
          }
        } else {
          stinger.timer -= dt;
          if (stinger.timer <= 0 && d < STINGER.chase && state.bolts.filter((b) => b.active).length < STINGER.maxBolts) {
            stinger.charging = STINGER.telegraph;
          }
        }
        if (player.invuln <= 0) events |= touchFoe(stinger, STINGER.radius, dt);
      }
    }
    state.stingers = state.stingers.filter((stinger) => stinger.active);

    // Plasma bolts fly straight, fizzle after a few seconds, and hurt on touch.
    for (const bolt of state.bolts) {
      if (!bolt.active) continue;
      bolt.life -= dt;
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      if (bolt.life <= 0 || bolt.x < 8 || bolt.x > FIELD.width - 8 || bolt.y < 36 || bolt.y > FIELD.height - 8) {
        bolt.active = false;
        continue;
      }
      if (!attract && player.invuln <= 0 && dist2(bolt.x, bolt.y, player.x, player.y) < (BOLT.radius + SKIFF.radius - 2) ** 2) {
        bolt.active = false;
        burst(bolt.x, bolt.y, COLORS.bolt, 10, 160);
        events |= hurtPlayer(bolt);
      }
    }
    state.bolts = state.bolts.filter((bolt) => bolt.active);

    // The Void Warden lumbers after the skiff and launches drones.
    const boss = state.boss;
    if (boss && boss.active) {
      boss.phase += dt * 2;
      chase(boss, BOSS.speed * speedMul, FIELD.width, dt, attract);
      boss.spawnTimer -= dt;
      if (!attract && boss.spawnTimer <= 0 && state.drones.filter((d) => d.active).length < BOSS.maxDrones) {
        spawnDrone({ x: boss.x, y: boss.y });
        state.foesLeft += 1;
        boss.spawnTimer = BOSS.spawnEvery;
        burst(boss.x, boss.y, COLORS.boss, 8, 120);
      }
      if (!attract && player.invuln <= 0) {
        const d = Math.hypot(player.x - boss.x, player.y - boss.y);
        if (d < BOSS.radius + SKIFF.radius - 2) events |= hurtPlayer(boss);
      }
    }

    // Asteroids drift behind everything, wrapping around the field.
    for (const rock of state.asteroids) {
      rock.x += rock.vx * dt;
      rock.y += rock.vy * dt;
      rock.rot += rock.rotSpeed * dt;
      if (rock.x < -60) rock.x = FIELD.width + 60;
      if (rock.x > FIELD.width + 60) rock.x = -60;
      if (rock.y < -60) rock.y = FIELD.height + 60;
      if (rock.y > FIELD.height + 60) rock.y = -60;
    }

    // Spawning: shards keep the field worth crossing; foes arrive in a trickle
    // that quickens with the wave; a cell drifts in now and then.
    if (!attract) {
      shardTimer -= dt;
      if (shardTimer <= 0 && state.shards.length < SHARD.maxAlive) {
        spawnShard();
        shardTimer = SHARD.spawnEvery;
      }
      cellTimer -= dt;
      if (cellTimer <= 0 && state.cells.length === 0) {
        spawnCell();
        cellTimer = CELL.spawnEvery;
      }
      if (wavePause > 0) {
        wavePause -= dt;
      } else if (spawnQueue.length > 0) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          const kind = spawnQueue.shift();
          if (kind === 'drone') spawnDrone();
          if (kind === 'darter') spawnDarter();
          if (kind === 'splitter') spawnSplitter();
          if (kind === 'stinger') spawnStinger();
          const gap = Math.max(0.55, (WAVE.spawnGap - WAVE.spawnGapPerWave * (state.wave - 1)) * difficulty.spawnGapMul);
          spawnTimer = gap;
        }
      } else if (state.foesLeft <= 0) {
        // The wave is clear: pay the bonus, open the next one, or win the run.
        // Only wave 5 wins: after continueEndless the run is past it, so later
        // boss waves just keep the run going.
        const bonus = scoreGain(WAVE.clearBonus + WAVE.clearBonusPerWave * state.wave);
        state.score += bonus;
        state.stats.wavesCleared += 1;
        floatText(player.x, player.y - 30, `WAVE ${state.wave} CLEAR +${bonus}`, COLORS.gold);
        if (state.wave === WAVE.winWave) {
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

  /** Switch difficulty; it takes effect on the next reset (the next run). */
  function setDifficulty(id) {
    if (DIFFICULTY[id]) {
      difficulty = DIFFICULTY[id];
      state.difficulty = difficulty.id;
    }
    return difficulty;
  }

  reset();
  return { state, step, reset, firePulse, continueEndless, setDifficulty };
}
