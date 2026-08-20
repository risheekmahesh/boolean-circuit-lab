import { describe, expect, it } from "vitest";
import { bitsFromNumber, decimalFromBits, multiplyThreeBitNumbers, rippleAdd, twosComplementSubtract } from "../client/src/lib/advancedCircuits";

describe("configurable arithmetic architectures", () => {
  it("adds 9 + 7 + 1 with a 4-bit ripple chain", () => {
    const result = rippleAdd(bitsFromNumber(9, 4), bitsFromNumber(7, 4), 1);
    expect(decimalFromBits(result.sum)).toBe(1);
    expect(result.carryOut).toBe(1);
    expect([...result.sum]).toEqual([0, 0, 0, 1]);
  });

  it("supports widths from 2 through 8 bits", () => {
    for (let width = 2; width <= 8; width += 1) {
      const a = 2 ** width - 2;
      const b = 1;
      const result = rippleAdd(bitsFromNumber(a, width), bitsFromNumber(b, width));
      expect(decimalFromBits(result.sum) + result.carryOut * 2 ** width).toBe(a + b);
    }
  });

  it("reports no-borrow when A is greater than or equal to B", () => {
    const result = twosComplementSubtract(bitsFromNumber(7, 4), bitsFromNumber(3, 4));
    expect(decimalFromBits(result.difference)).toBe(4);
    expect(result.carryOut).toBe(1);
    expect(result.noBorrow).toBe(1);
  });

  it("represents a negative difference in two’s complement", () => {
    const result = twosComplementSubtract(bitsFromNumber(2, 4), bitsFromNumber(5, 4));
    expect(decimalFromBits(result.difference)).toBe(13);
    expect(result.carryOut).toBe(0);
    expect(result.noBorrow).toBe(0);
  });

  it("keeps the 3×3 multiplier exhaustive across 0–7", () => {
    for (let a = 0; a < 8; a += 1) {
      for (let b = 0; b < 8; b += 1) {
        const aBits = bitsFromNumber(a, 3);
        const bBits = bitsFromNumber(b, 3);
        const result = multiplyThreeBitNumbers(aBits[0], aBits[1], aBits[2], bBits[0], bBits[1], bBits[2]);
        expect(decimalFromBits(result.product)).toBe(a * b);
      }
    }
  });
});
