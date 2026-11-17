// Nova Harvest — a small seeded generator so one seed always replays one field.
// mulberry32: short, fast, and good enough for spawn patterns and starfields.
export function createRandom(seed) {
  let state = seed >>> 0;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    /** A float in [min, max). */
    range(min, max) {
      return min + next() * (max - min);
    },
    /** An integer in [min, max). */
    int(min, max) {
      return Math.floor(this.range(min, max));
    },
    /** One of the given values. */
    pick(values) {
      return values[Math.floor(next() * values.length)];
    },
  };
}
