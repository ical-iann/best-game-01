// Nova Harvest — one place for every number the game tunes by.
// The field is a fixed 1280x720 logical arena; the canvas scales it to the window.
export const FIELD = { width: 1280, height: 720 };

// One fixed step; the loop catches up in whole steps, never in fractions.
export const STEP = 1 / 60;

// How long a real second of play takes to re-simulate in a screenshot scene.
export const SHOT_SECONDS = { menu: 6, play: 60, over: 600 };

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
  energyRecharge: 18, // per second
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
  speed: 95, // wave-1 speed; +8 per wave, so late waves hunt hard
  score: 25, // paid when a pulse blast destroys one
  chase: 420, // wave-1 chase range; +80 per wave, so late waves hunt hard
  speedPerWave: 8,
  chasePerWave: 80,
};

// Darters are fast zigzag hunters: hard to catch in a pulse, worth more.
export const DARTER = {
  radius: 11,
  speed: 175, // wave-2 speed; +8 per wave after that
  score: 40,
  chase: 520,
  speedPerWave: 8,
  chasePerWave: 60,
  zigzag: 3.1, // sideways weave, radians per second
};

// Splitters are slow armoured orbs: a pulse cracks one into two minis.
export const SPLITTER = {
  radius: 21,
  speed: 55,
  score: 30,
  chase: 500,
};

export const MINI = {
  radius: 9,
  speed: 135, // +8 per wave after the wave they split in
  score: 15,
  chase: 460,
  speedPerWave: 8,
  chasePerWave: 80,
};

// The Void Warden ends wave 5: three pulse hits to kill, and it launches drones.
// Stingers are long-range shooters: they hold off at ~300 px, telegraph a shot
// with a charging glow, then fire a slow plasma bolt at where the skiff was.
// The bolt is dodgeable, the pulse blast destroys bolts, and a stinger is
// worth more than a drone because it can hit from across the field.
export const STINGER = {
  radius: 13,
  speed: 70,
  score: 50,
  chase: 520,
  holdRange: 300, // it drifts to keep about this far from the skiff
  fireEvery: 5.0, // seconds between shots, while in range
  telegraph: 0.7, // seconds of charging glow before the bolt leaves
  maxBolts: 4, // bolts alive at once, across all stingers
  holdDecay: 5, // px per second the hold distance shrinks as a stinger ages
};

export const BOLT = {
  radius: 7,
  speed: 150, // slower than the skiff's top speed, so a bolt can be dodged
  life: 6, // seconds before a bolt fizzles out on its own
};

// Nova Rush: shard pickups fill the rush meter; a full meter fires 8 seconds
// of double score and double pulse recharge. It is the run's tempo — a
// careful pilot triggers it in wave 1 or 2 and rides it through the wave.
export const RUSH = {
  need: 8, // shards to fill the meter
  duration: 8, // seconds of double score once it fires
};

// Endless depth: past the wave-5 win, every wave pays a little more — the
// deeper the endless run, the more each point is worth, so staying in the
// field after the win is a scoring decision, not just a victory lap.
export const DEPTH = {
  perWave: 0.05, // +5% score per wave past the win wave
};

export const BOSS = {
  radius: 42,
  speed: 55,
  hits: 3,
  score: 300,
  spawnEvery: 7, // seconds between drone launches, while fewer than maxDrones
  maxDrones: 3,
};

// Cells drift in rarely: a shield that eats one hit, or a surge of pulse energy.
export const CELL = {
  radius: 13,
  spawnEvery: 24, // seconds between cell arrivals
  surgeEnergy: 50,
};

// Waves: wave n fields 3 + 2n drones and 2 + n mines, one at a time.
// Darters join from wave 2, splitters from wave 3; wave 5 is the Warden.
export const WAVE = {
  droneBase: 3,
  dronePerWave: 2,
  mineBase: 2,
  minePerWave: 1,
  darterPerWave: 1, // one per wave from wave 2
  splitterPerWave: 1, // one per wave from wave 3
  stingerPerWave: 1, // one per wave from wave 3 — the long-range shooter
  spawnGap: 1.4, // seconds between arrivals on wave 1
  spawnGapPerWave: 0.12, // arrivals quicken each wave
  spawnGapMin: 0.7,
  clearBonus: 100,
  clearBonusPerWave: 25,
  winWave: 5, // clearing this wave wins the run (endless play continues after)
};

// Difficulty: chosen on the title screen (1 / 2 / 3 or click), remembered
// between visits. Every field is a multiplier or delta on the Standard hunt,
// so the same seeds replay on every difficulty and the sim can measure the gap.
export const DIFFICULTY = {
  relaxed: {
    id: 'relaxed', label: 'Relaxed', blurb: 'Slower foes · 4 hull',
    speedMul: 0.8, chaseMul: 0.7, droneDelta: -1, mineDelta: -1,
    spawnGapMul: 1.25, hull: 4, energyRechargeMul: 1.25, bossHits: 2,
    darterDelay: 1, splitterDelay: 1, stingerDelay: 1, // stingers from wave 4
  },
  standard: {
    id: 'standard', label: 'Standard', blurb: 'The intended hunt',
    speedMul: 1, chaseMul: 1, droneDelta: 0, mineDelta: 0,
    spawnGapMul: 1, hull: 3, energyRechargeMul: 1, bossHits: 3,
    darterDelay: 0, splitterDelay: 0, stingerDelay: 0,
  },
  expert: {
    id: 'expert', label: 'Expert', blurb: 'Faster foes · more hunters',
    speedMul: 1.25, chaseMul: 1.3, droneDelta: 1, mineDelta: 1,
    spawnGapMul: 0.8, hull: 3, energyRechargeMul: 0.9, bossHits: 4,
    darterDelay: 0, splitterDelay: 0, stingerDelay: 0,
  },
};
export const DIFFICULTY_IDS = ['relaxed', 'standard', 'expert'];

// Presentation.
export const BEST_KEY = 'nova-harvest-best';
// Lifetime run stats (runs, wins, best wave, totals) — shown on the menu and
// the game-over screen so a returning player sees their record at a glance.
export const STATS_KEY = 'nova-harvest-stats';
// Remembered settings: difficulty plus the music and SFX toggles.
export const SETTINGS_KEY = 'nova-harvest-settings';
export const COLORS = {
  bg: '#070a18',
  star: '#cdd8ff',
  shard: '#3df2c8',
  shardCore: '#eafff7',
  mine: '#ff4d6d',
  mineCore: '#ffb3c0',
  drone: '#ff9f2e',
  droneCore: '#ffe1b3',
  darter: '#ff5df2',
  darterCore: '#ffd6fb',
  splitter: '#b78cff',
  splitterCore: '#efe6ff',
  stinger: '#ff2e88',
  stingerCore: '#ffc2dd',
  bolt: '#ff7ad9',
  boltCore: '#fff0fa',
  rush: '#ffd166',
  mini: '#ff9f2e',
  boss: '#ff2e63',
  bossCore: '#ffc2d1',
  shield: '#59d8ff',
  surge: '#ffd166',
  skiff: '#59c2ff',
  skiffCore: '#eaf6ff',
  pulse: '#7ef0ff',
  text: '#f2f6ff',
  muted: '#9fb0d8',
  gold: '#ffd166',
};
