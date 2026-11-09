// Only these versioned architecture settings are persisted.
export const defaultConfig = Object.freeze({ version: 2, hidden: Object.freeze([2]), activation: 'relu', example: 1 });
export function validateConfig(input) {
  const c = input && typeof input === 'object' && !Array.isArray(input) && input.version === 2 ? input : {};
  return {
    version: 2,
    hidden: Array.isArray(c.hidden) && c.hidden.length <= 2 && c.hidden.every(n => Number.isInteger(n) && n >= 1 && n <= 4) ? [...c.hidden] : [...defaultConfig.hidden],
    activation: ['relu', 'identity'].includes(c.activation) ? c.activation : defaultConfig.activation,
    example: Number.isInteger(c.example) && c.example >= 0 && c.example < 4 ? c.example : defaultConfig.example
  };
}

// Retained for the independently tested numerical helpers, unused by the lesson.
export function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function normalRandom(rng) {
  return Math.sqrt(-2 * Math.log(Math.max(Number.MIN_VALUE, rng()))) * Math.cos(2 * Math.PI * rng());
}
