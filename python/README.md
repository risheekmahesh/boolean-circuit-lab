# Python Implementation — Boolean Circuit Lab

The existing **Boolean Circuit Lab** website is unchanged. This folder adds a standalone, readable Python implementation of the logic behind the website so that the Boolean work can be inspected and demonstrated in Python.

> The Python program has no third-party dependencies. It runs with the standard library in Python 3.11 or later.

## What the Python code demonstrates

| Website feature | Python location | Result |
|---|---|---|
| Boolean-expression input | `tokenize()` and `ExpressionParser` | Supports NOT (`'`, `!`, `~`), AND (`AB`, `·`, `*`), OR (`+`, `|`), and parentheses. |
| Minterms or maxterms | `analyze_terms()` | Converts Σm or ΠM indices into the full truth-table outputs. |
| Truth-table input | `analyze_truth_table()` | Accepts ordered Boolean outputs and derives both canonical state lists. |
| Exact simplification | `minimise_sop()` | Builds prime implicants and selects an exact minimum SOP cover. |
| Basic-gate circuit | `build_standard_circuit()` | Produces a NOT/AND/OR netlist. |
| NAND-only circuit | `build_nand_circuit()` | Uses NAND gates for both inversion and final logic. |
| NOR-only circuit | `build_nor_circuit()` | Uses a POS form and NOR gates for both inversion and final logic. |
| Output proof | `VerificationRow` and `Analysis.verified` | Checks the original function, simplified SOP, NAND netlist, and NOR netlist for every input row. |

## Run it

Run all commands from the project root (`boolean-circuit-lab`).

```bash
# 1. Boolean expression
python3 python/cli.py expression "A'B + AB' + AC"

# 2. Minterms: F(A,B,C) = Σm(1,3,5,7), which simplifies to C
python3 python/cli.py terms --variables 3 --minterms "1,3,5,7"

# 3. Maxterms: F(A,B) = ΠM(0,3)
python3 python/cli.py terms --variables 2 --maxterms "0,3"

# 4. Truth-table outputs in binary-counting order
python3 python/cli.py truth --variables 3 --outputs "0,0,1,1,1,1,0,1"

# 5. Machine-readable report for another Python program
python3 python/cli.py --json expression "A'B + AB' + AC"
```

Each regular report prints the simplified SOP and POS expressions, a full truth table, exhaustive PASS/FAIL verification rows, and the three gate netlists.

## Run the Python tests

```bash
python3 -m unittest discover -s python -p "test_*.py" -v
```

The tests cover expression parsing, minterms, maxterms, direct truth-table input, constant functions, and NAND/NOR equivalence.

## Suggested way to explain the project

Start with an input such as `A'B + AB' + AC`. The Python parser evaluates the expression for all binary assignments. The minimizer groups equivalent minterms into prime implicants, then chooses an exact minimum cover. From that result, the code writes a regular AND/OR/NOT netlist and a NAND-only netlist. It also minimises the complement to obtain a POS form, from which it writes a NOR-only netlist. Finally, it evaluates every representation for every input row and reports whether all outputs agree.

When more than one equally small simplified expression exists, the minimizer may select a different—but equivalent—minimum form. The row-by-row verification provides the proof of equivalence.
