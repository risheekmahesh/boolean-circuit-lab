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

export type ThreeBitMultiplierResult = {
  product: [Bit, Bit, Bit, Bit, Bit, Bit, Bit];
  partialProducts: [Bit, Bit, Bit, Bit, Bit, Bit, Bit, Bit, Bit];
  adderSums: [Bit, Bit, Bit, Bit, Bit, Bit, Bit, Bit];
  adderCarries: [Bit, Bit, Bit, Bit, Bit, Bit, Bit, Bit];
};

export type RippleAdderResult = {
  sum: Bit[];
  carryOut: Bit;
  carries: Bit[];
  stages: FullAdderResult[];
};

export type TwosComplementSubtractorResult = {
  difference: Bit[];
  carryOut: Bit;
  noBorrow: Bit;
  complementedB: Bit[];
  carries: Bit[];
  stages: FullAdderResult[];
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

export function rippleAdd(aBits: Bit[], bBits: Bit[], cin: Bit = 0): RippleAdderResult {
  if (aBits.length !== bBits.length || aBits.length < 2 || aBits.length > 8) {
    throw new Error("Ripple adders support matching vectors from 2 to 8 bits.");
  }
  let carry = cin;
  const sum = Array.from({ length: aBits.length }, () => 0 as Bit);
  const carries = Array.from({ length: aBits.length }, () => 0 as Bit);
  const stages: FullAdderResult[] = [];
  for (let index = aBits.length - 1; index >= 0; index -= 1) {
    const stage = fullAdder(aBits[index], bBits[index], carry);
    sum[index] = stage.sum;
    carries[index] = stage.carry;
    stages[index] = stage;
    carry = stage.carry;
  }
  return { sum, carryOut: carry, carries, stages };
}

export function twosComplementSubtract(aBits: Bit[], bBits: Bit[]): TwosComplementSubtractorResult {
  if (aBits.length !== bBits.length || aBits.length < 2 || aBits.length > 8) {
    throw new Error("Two’s complement subtractors support matching vectors from 2 to 8 bits.");
  }
  const complementedB = bBits.map((value) => (value ? 0 : 1) as Bit);
  const result = rippleAdd(aBits, complementedB, 1);
  return { difference: result.sum, carryOut: result.carryOut, noBorrow: result.carryOut, complementedB, carries: result.carries, stages: result.stages };
}

export function bitsFromNumber(value: number, width: number): Bit[] {
  return Array.from({ length: width }, (_, index) => bit(value >> (width - index - 1) & 1));
}

export function numberFromBits(bits: Bit[]): number {
  return bits.reduce<number>((value, current) => value * 2 + current, 0);
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

export function multiplyThreeBitNumbers(
  a2: Bit,
  a1: Bit,
  a0: Bit,
  b2: Bit,
  b1: Bit,
  b0: Bit,
): ThreeBitMultiplierResult {
  const partialProducts = [
    bit(a0 & b0),
    bit(a1 & b0),
    bit(a2 & b0),
    bit(a0 & b1),
    bit(a1 & b1),
    bit(a2 & b1),
    bit(a0 & b2),
    bit(a1 & b2),
    bit(a2 & b2),
  ] as ThreeBitMultiplierResult["partialProducts"];
  const [p00, p10, p20, p01, p11, p21, p02, p12, p22] = partialProducts;
  const stage1 = halfAdder(p10, p01);
  const stage2 = fullAdder(p20, p11, p02);
  const stage3 = halfAdder(stage2.sum, stage1.carry);
  const stage4 = fullAdder(p21, p12, stage2.carry);
  const stage5 = halfAdder(stage4.sum, stage3.carry);
  const stage6 = halfAdder(p22, stage4.carry);
  const stage7 = halfAdder(stage6.sum, stage5.carry);
  const stage8 = halfAdder(stage6.carry, stage7.carry);
  const product: ThreeBitMultiplierResult["product"] = [stage8.carry, stage8.sum, stage7.sum, stage5.sum, stage3.sum, stage1.sum, p00];
  return {
    product,
    partialProducts,
    adderSums: [stage1.sum, stage2.sum, stage3.sum, stage4.sum, stage5.sum, stage6.sum, stage7.sum, stage8.sum],
    adderCarries: [stage1.carry, stage2.carry, stage3.carry, stage4.carry, stage5.carry, stage6.carry, stage7.carry, stage8.carry],
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

export const threeBitMultiplierTruthTable = rows(6, ([a2, a1, a0, b2, b1, b0]) => {
  const result = multiplyThreeBitNumbers(a2, a1, a0, b2, b1, b0);
  return result.product;
});

export const bitString = (bits: Bit[]) => bits.join("");

export const decimalFromBits = (bits: Bit[]) => parseInt(bitString(bits), 2);
