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
  multiplyTwoBitNumbers,
  multiplierTruthTable,
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

console.log("Advanced circuit verification passed: half/full adders, half/full subtractors, and 2-bit multiplier.");
