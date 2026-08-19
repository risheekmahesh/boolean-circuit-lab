import {
  analyzeFromValues,
  createVariables,
  parseBooleanExpression,
  parseDontCareList,
  valuesFromTerms,
} from "../client/src/lib/booleanLogic.ts";

function require(condition, message) {
  if (!condition) throw new Error(message);
}

const expression = parseBooleanExpression("A'B + AB' + AC");
const expressionAnalysis = analyzeFromValues(expression.variables, expression.values, "A'B + AB' + AC");
require(expression.variables.join(",") === "A,B,C", "Expression variables were not inferred correctly.");
require(expressionAnalysis.isEquivalent, "Expression circuits did not pass exhaustive verification.");

const cMinterms = valuesFromTerms(3, [1, 3, 5, 7], "minterms");
const cAnalysis = analyzeFromValues(createVariables(3), cMinterms, "Σm(1,3,5,7)");
require(cAnalysis.simplifiedExpression === "C", `Expected C, received ${cAnalysis.simplifiedExpression}.`);
require(cAnalysis.isEquivalent, "Minterm-derived circuits did not pass exhaustive verification.");

const maxtermValues = valuesFromTerms(2, [0, 3], "maxterms");
const maxtermAnalysis = analyzeFromValues(createVariables(2), maxtermValues, "ΠM(0,3)");
require(maxtermAnalysis.values.join(",") === "false,true,true,false", "Maxterm conversion is incorrect.");
require(maxtermAnalysis.isEquivalent, "Maxterm-derived circuits did not pass exhaustive verification.");

const constantOne = analyzeFromValues(createVariables(2), [true, true, true, true], "1");
const constantZero = analyzeFromValues(createVariables(2), [false, false, false, false], "0");
require(constantOne.simplifiedExpression === "1" && constantOne.isEquivalent, "Constant-one handling failed.");
require(constantZero.simplifiedExpression === "0" && constantZero.isEquivalent, "Constant-zero handling failed.");

const parsedDontCares = parseDontCareList("d(1, 3, 3, 7)", 8);
require(parsedDontCares.join(",") === "1,3,7", "Don't-care parsing or duplicate removal failed.");
require(parseDontCareList("", 8).length === 0, "Empty don't-care input should be optional.");
let rejectedOverlap = false;
try {
  analyzeFromValues(createVariables(3), valuesFromTerms(3, [1, 3], "minterms"), "Σm(1,3)", [3]);
} catch {
  rejectedOverlap = true;
}
require(rejectedOverlap, "Don't-care overlap with required minterms should be rejected.");
let rejectedInvalid = false;
try {
  parseDontCareList("d(1,-2)", 8);
} catch {
  rejectedInvalid = true;
}
require(rejectedInvalid, "Invalid don't-care input should be rejected.");
const dontCareAnalysis = analyzeFromValues(createVariables(4), valuesFromTerms(4, [1, 3, 7, 11, 15], "minterms"), "Σm(1,3,7,11,15), d(0,2,5)", [0, 2, 5]);
require(dontCareAnalysis.dontCares.join(",") === "0,2,5", "Don't-care states were not retained.");
require(dontCareAnalysis.verificationRows.filter((row) => row.dontCare).length === 3, "Don't-care rows were not marked.");
require(dontCareAnalysis.isEquivalent, "Don't-care simplification circuits did not pass required-row verification.");
require(new Set(dontCareAnalysis.simplifiedExpression.split(" + ")).size === 2 && new Set(dontCareAnalysis.simplifiedExpression.split(" + ")).has("A'·D") && new Set(dontCareAnalysis.simplifiedExpression.split(" + ")).has("C·D"), `Don't-care simplification did not use X cells: ${dontCareAnalysis.simplifiedExpression}`);

[2, 3, 4, 5, 6].forEach((count) => {
  const limit = 2 ** count;
  const analysis = analyzeFromValues(createVariables(count), valuesFromTerms(count, [limit - 1], "minterms"), `Σm(${limit - 1}), d(0)`, [0]);
  require(analysis.dontCares.join(",") === "0", `${count}-variable don't-care state was not retained.`);
  require(analysis.isEquivalent, `${count}-variable don't-care circuits did not verify.`);
});

console.log("Boolean logic verification passed: expression, minterms, maxterms, constants, don't-cares, NAND, and NOR equivalence.");
