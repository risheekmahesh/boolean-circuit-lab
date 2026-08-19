export type Bit = 0 | 1;

export type HalfAdderResult = {
  sum: Bit;
  carry: Bit;
};

export type FullAdderResult = {
  sum: Bit;
  carry: Bit;
};

export type HalfSubtractorResult = {
  difference: Bit;
  borrow: Bit;
};

export type FullSubtractorResult = {
  difference: Bit;
  borrow: Bit;
};

export type MultiplierResult = {
  product: [Bit, Bit, Bit, Bit];
  partialProducts: [Bit, Bit, Bit, Bit];
  sums: [Bit, Bit];
  carries: [Bit, Bit];
};

export type TruthRow = {
  inputs: Bit[];
  outputs: Bit[];
};

const bit = (value: number): Bit => (value ? 1 : 0);

export function halfAdder(a: Bit, b: Bit): HalfAdderResult {
  return { sum: bit(a ^ b), carry: bit(a & b) };
}

export function fullAdder(a: Bit, b: Bit, cin: Bit): FullAdderResult {
  const first = halfAdder(a, b);
  const second = halfAdder(first.sum, cin);
  return { sum: second.sum, carry: bit(first.carry | second.carry) };
}

export function halfSubtractor(a: Bit, b: Bit): HalfSubtractorResult {
  return { difference: bit(a ^ b), borrow: bit((a ^ 1) & b) };
}

export function fullSubtractor(a: Bit, b: Bit, bin: Bit): FullSubtractorResult {
  const first = halfSubtractor(a, b);
  const second = halfSubtractor(first.difference, bin);
  return { difference: second.difference, borrow: bit(first.borrow | second.borrow) };
}

export function multiplyTwoBitNumbers(a1: Bit, a0: Bit, b1: Bit, b0: Bit): MultiplierResult {
  const p0 = bit(a0 & b0);
  const p1 = bit(a1 & b0);
  const p2 = bit(a0 & b1);
  const p3 = bit(a1 & b1);
  const s1 = bit(p1 ^ p2);
  const c1 = bit(p1 & p2);
  const s2 = bit(p3 ^ c1);
  const c2 = bit(p3 & c1);
  return {
    product: [c2, s2, s1, p0],
    partialProducts: [p0, p1, p2, p3],
    sums: [s1, s2],
    carries: [c1, c2],
  };
}

const rows = (inputCount: number, output: (inputs: Bit[]) => Bit[]): TruthRow[] =>
  Array.from({ length: 2 ** inputCount }, (_, index) => {
    const inputs = Array.from({ length: inputCount }, (_, bitIndex) => bit((index >> (inputCount - bitIndex - 1)) & 1));
    return { inputs, outputs: output(inputs) };
  });

export const halfAdderTruthTable = rows(2, ([a, b]) => {
  const result = halfAdder(a, b);
  return [result.sum, result.carry];
});

export const fullAdderTruthTable = rows(3, ([a, b, cin]) => {
  const result = fullAdder(a, b, cin);
  return [result.sum, result.carry];
});

export const halfSubtractorTruthTable = rows(2, ([a, b]) => {
  const result = halfSubtractor(a, b);
  return [result.difference, result.borrow];
});

export const fullSubtractorTruthTable = rows(3, ([a, b, bin]) => {
  const result = fullSubtractor(a, b, bin);
  return [result.difference, result.borrow];
});

export const multiplierTruthTable = rows(4, ([a1, a0, b1, b0]) => {
  const result = multiplyTwoBitNumbers(a1, a0, b1, b0);
  return result.product;
});

export const bitString = (bits: Bit[]) => bits.join("");

export const decimalFromBits = (bits: Bit[]) => parseInt(bitString(bits), 2);
