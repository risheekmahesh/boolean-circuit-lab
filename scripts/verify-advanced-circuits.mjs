import assert from "node:assert/strict";
import {
  fullAdder,
  fullAdderTruthTable,
  fullSubtractor,
  fullSubtractorTruthTable,
  halfAdder,
  halfAdderTruthTable,
  halfSubtractor,
  halfSubtractorTruthTable,
  multiplyThreeBitNumbers,
  multiplyTwoBitNumbers,
  multiplierTruthTable,
  threeBitMultiplierTruthTable,
} from "../client/src/lib/advancedCircuits.ts";

assert.deepEqual(halfAdder(0, 0), { sum: 0, carry: 0 });
assert.deepEqual(halfAdder(1, 0), { sum: 1, carry: 0 });
assert.deepEqual(halfAdder(1, 1), { sum: 0, carry: 1 });
assert.equal(halfAdderTruthTable.length, 4);
assert.deepEqual(fullAdder(1, 1, 1), { sum: 1, carry: 1 });
assert.equal(fullAdderTruthTable.length, 8);

assert.deepEqual(halfSubtractor(0, 1), { difference: 1, borrow: 1 });
assert.deepEqual(halfSubtractor(1, 1), { difference: 0, borrow: 0 });
assert.equal(halfSubtractorTruthTable.length, 4);
assert.deepEqual(fullSubtractor(0, 1, 1), { difference: 0, borrow: 1 });
assert.equal(fullSubtractorTruthTable.length, 8);

assert.deepEqual(multiplyTwoBitNumbers(1, 1, 1, 1).product, [1, 0, 0, 1]);
assert.deepEqual(multiplyTwoBitNumbers(1, 0, 0, 1).product, [0, 0, 1, 0]);
assert.equal(multiplierTruthTable.length, 16);

assert.deepEqual(multiplyThreeBitNumbers(1, 0, 1, 1, 0, 1).product, [0, 0, 1, 1, 0, 0, 1]);
assert.deepEqual(multiplyThreeBitNumbers(1, 1, 1, 1, 1, 1).product, [0, 1, 1, 0, 0, 0, 1]);
assert.deepEqual(multiplyThreeBitNumbers(0, 0, 0, 1, 1, 1).product, [0, 0, 0, 0, 0, 0, 0]);
assert.equal(threeBitMultiplierTruthTable.length, 64);

for (const row of threeBitMultiplierTruthTable) {
  const [a2, a1, a0, b2, b1, b0] = row.inputs;
  const expected = (a2 * 4 + a1 * 2 + a0) * (b2 * 4 + b1 * 2 + b0);
  const actual = row.outputs.reduce((value, current) => value * 2 + current, 0);
  assert.equal(actual, expected, `3-bit multiplier row ${row.inputs.join("")}`);
}

console.log("Advanced circuit verification passed: adders, subtractors, 2-bit multiplier, and exhaustive 3-bit multiplier.");
