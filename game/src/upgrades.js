// Nova Harvest — the wave-clear upgrades: after every cleared wave but the
// last, the run offers three of these and the player picks one. Each one tunes
// a number the skiff flies by, so the choice shapes the rest of the run.
export const UPGRADES = [
  {
    id: 'plating',
    name: 'Ablative Plating',
    blurb: 'Repair 1 hull and raise max hull by 1.',
    apply(state) {
      state.player.maxHull += 1;
      state.player.hull = Math.min(state.player.maxHull, state.player.hull + 1);
    },
  },
  {
    id: 'wide-pulse',
    name: 'Wide Pulse',
    blurb: 'Pulse blast radius +30%.',
    apply(state) {
      state.player.pulseRadius *= 1.3;
    },
  },
  {
    id: 'coil',
    name: 'Surge Coil',
    blurb: 'Pulse energy recharges 45% faster.',
    apply(state) {
      state.player.energyRecharge *= 1.45;
    },
  },
  {
    id: 'thrusters',
    name: 'Ion Thrusters',
    blurb: 'Thrust +18% and top speed +12%.',
    apply(state) {
      state.player.thrustMul *= 1.18;
      state.player.maxSpeed *= 1.12;
    },
  },
  {
    id: 'magnet',
    name: 'Shard Magnet',
    blurb: 'Shards drift toward the skiff from farther away.',
    apply(state) {
      state.player.magnet += 1;
    },
  },
  {
    id: 'overcharge',
    name: 'Overcharge',
    blurb: 'Pulse costs 10 less energy, down to 10.',
    apply(state) {
      state.player.pulseCost = Math.max(10, state.player.pulseCost - 10);
    },
  },
];

/** Pick three different upgrades at random. */
export function rollUpgrades(random) {
  const pool = [...UPGRADES];
  const picked = [];
  for (let index = 0; index < 3; index += 1) {
    const at = random.int(0, pool.length);
    picked.push(pool.splice(at, 1)[0]);
  }
  return picked;
}

/** Apply one upgrade, by id, to the world's state. */
export function applyUpgrade(state, id) {
  const found = UPGRADES.find((entry) => entry.id === id);
  if (found) found.apply(state);
}
