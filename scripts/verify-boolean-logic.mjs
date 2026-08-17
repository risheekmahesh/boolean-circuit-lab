import {
  analyzeFromValues,
  createVariables,
  parseBooleanExpression,
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

console.log("Boolean logic verification passed: expression, minterms, maxterms, constants, NAND, and NOR equivalence.");
