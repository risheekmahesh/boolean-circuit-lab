"""Unit tests for the standard-library Python Boolean Circuit Lab implementation."""

import unittest

from boolean_logic import (
    analyze_expression,
    analyze_terms,
    analyze_truth_table,
    evaluate_circuit,
    variable_names,
)


class BooleanLogicTests(unittest.TestCase):
    def test_expression_is_minimized_and_exhaustively_verified(self) -> None:
        analysis = analyze_expression("A'B + AB' + AC")
        self.assertEqual(analysis.variables, ["A", "B", "C"])
        self.assertTrue(analysis.verified)
        self.assertEqual(len(analysis.verification), 8)
        self.assertEqual(analysis.minterms, [2, 3, 4, 5, 7])

    def test_minterms_reduce_to_single_variable(self) -> None:
        analysis = analyze_terms(3, [1, 3, 5, 7], "minterms")
        self.assertEqual(analysis.simplified_sop, "C")
        self.assertTrue(analysis.verified)

    def test_maxterms_define_zero_rows(self) -> None:
        analysis = analyze_terms(2, [0, 3], "maxterms")
        self.assertEqual(analysis.values, [False, True, True, False])
        self.assertTrue(analysis.verified)

    def test_truth_table_input_route(self) -> None:
        analysis = analyze_truth_table(variable_names(2), [False, True, True, False])
        self.assertTrue(analysis.verified)
        self.assertEqual(analysis.minterms, [1, 2])

    def test_constant_functions_are_safe(self) -> None:
        one = analyze_truth_table(variable_names(2), [True, True, True, True], "1")
        zero = analyze_truth_table(variable_names(2), [False, False, False, False], "0")
        self.assertEqual(one.simplified_sop, "1")
        self.assertEqual(zero.simplified_sop, "0")
        self.assertTrue(one.verified)
        self.assertTrue(zero.verified)
        self.assertTrue(evaluate_circuit(one.nand_circuit, {"A": False, "B": True}))
        self.assertFalse(evaluate_circuit(zero.nor_circuit, {"A": True, "B": False}))


if __name__ == "__main__":
    unittest.main(verbosity=2)
