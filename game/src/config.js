// Nova Harvest — one place for every number the game tunes by.
// The field is a fixed 1280x720 logical arena; the canvas scales it to the window.
export const FIELD = { width: 1280, height: 720 };

// One fixed step; the loop catches up in whole steps, never in fractions.
export const STEP = 1 / 60;

// How long a real second of play takes to re-simulate in a screenshot scene.
export const SHOT_SECONDS = { menu: 6, play: 22, action: 34, over: 600 };

// The skiff the player flies.
export const SKIFF = {
  radius: 14,
  thrust: 620,
  drag: 0.86, // velocity kept each step after thrust (per second, applied as pow)
  maxSpeed: 340,
  hull: 3,
  invulnerableSeconds: 2,
  pulseRadius: 140,
  pulseCost: 30,
  energyMax: 100,
  energyRecharge: 14, // per second
  fireCooldown: 0.0, // pulse has no cooldown beyond its energy cost
};

// What drifts in the field.
export const SHARD = {
  radius: 11,
  score: 10,
  maxAlive: 7,
  spawnEvery: 1.6, // seconds between spawns while below the cap
  drift: 14,
  comboWindow: 3.0, // seconds a chain stays alive between pickups
  comboStep: 4, // pickups per +1 multiplier
  comboMax: 6,
};

export const MINE = {
  radius: 16,
  drift: 26,
  score: 0,
};

export const DRONE = {
  radius: 15,
  speed: 95,
  score: 25, // paid when a pulse blast destroys one
  chase: 420, // starts chasing inside this range
};

// Waves: wave n fields 3 + 2n drones and 2 + n mines, one at a time.
export const WAVE = {
  droneBase: 3,
  dronePerWave: 2,
  mineBase: 2,
  minePerWave: 1,
  spawnGap: 1.4, // seconds between drone arrivals
  clearBonus: 100,
  clearBonusPerWave: 25,
  winWave: 5, // clearing this wave wins the run (endless play continues after)
};

// Presentation.
export const BEST_KEY = 'nova-harvest-best';
export const COLORS = {
  bg: '#070a18',
  star: '#cdd8ff',
  shard: '#3df2c8',
  shardCore: '#eafff7',
  mine: '#ff4d6d',
  mineCore: '#ffb3c0',
  drone: '#ff9f2e',
  droneCore: '#ffe1b3',
  skiff: '#59c2ff',
  skiffCore: '#eaf6ff',
  pulse: '#7ef0ff',
  text: '#f2f6ff',
  muted: '#9fb0d8',
  gold: '#ffd166',
};
