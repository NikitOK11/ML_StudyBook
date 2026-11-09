// Canonical Boolean XOR, without sampling or normalization.
export const xorExamples = Object.freeze([
  { input: Object.freeze([0, 0]), target: 0 },
  { input: Object.freeze([0, 1]), target: 1 },
  { input: Object.freeze([1, 0]), target: 1 },
  { input: Object.freeze([1, 1]), target: 0 }
].map(Object.freeze));
