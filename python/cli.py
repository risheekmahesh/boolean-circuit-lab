"""Command-line entry point for the Python Boolean Circuit Lab implementation."""

from __future__ import annotations

import argparse
import json

from boolean_logic import Analysis, analyze_expression, analyze_terms, analyze_truth_table, variable_names


def parse_indices(text: str) -> list[int]:
    if not text.strip():
        return []
    return [int(value.strip()) for value in text.split(",") if value.strip()]


def parse_outputs(text: str) -> list[bool]:
    values = [value.strip() for value in text.split(",") if value.strip()]
    if any(value not in {"0", "1"} for value in values):
        raise ValueError("Truth-table outputs must be comma-separated 0 and 1 values.")
    return [value == "1" for value in values]


def print_report(analysis: Analysis) -> None:
    print("\nBOOLEAN CIRCUIT LAB — PYTHON REPORT")
    print("=" * 40)
    print(f"Variables:       {', '.join(analysis.variables)}")
    print(f"Source:          {analysis.source}")
    print(f"Minterms:        {analysis.minterms}")
    print(f"Maxterms:        {analysis.maxterms}")
    print(f"Simplified SOP:  {analysis.simplified_sop}")
    print(f"Simplified POS:  {analysis.simplified_pos}")
    print(f"Verification:    {'PASS' if analysis.verified else 'FAIL'} ({len(analysis.verification)} rows)\n")

    header = " | ".join(["#", *analysis.variables, "F", "SOP", "NAND", "NOR", "CHECK"])
    print(header)
    print("-" * len(header))
    for row in analysis.verification:
        bits = ["1" if row.assignment[variable] else "0" for variable in analysis.variables]
        results = [row.original, row.simplified_sop, row.nand_only, row.nor_only]
        print(" | ".join([str(row.index), *bits, *("1" if value else "0" for value in results), "PASS" if row.matches else "FAIL"]))

    for circuit in (analysis.standard_circuit, analysis.nand_circuit, analysis.nor_circuit):
        print(f"\n{circuit.title} NETLIST")
        for line in circuit.gate_lines():
            print(f"  {line}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Minimise and verify Boolean functions in Python.")
    parser.add_argument("--json", action="store_true", help="Print the full report as JSON.")
    modes = parser.add_subparsers(dest="mode", required=True)

    expression = modes.add_parser("expression", help="Analyse a Boolean expression.")
    expression.add_argument("formula", help="For example: A'B + AB' + AC")

    terms = modes.add_parser("terms", help="Analyse minterms or maxterms.")
    terms.add_argument("--variables", type=int, required=True, help="Number of input variables (1–6).")
    group = terms.add_mutually_exclusive_group(required=True)
    group.add_argument("--minterms", help="Comma-separated indices, e.g. 1,2,4,5,6,7")
    group.add_argument("--maxterms", help="Comma-separated indices, e.g. 0,3")

    truth = modes.add_parser("truth", help="Analyse truth-table output values.")
    truth.add_argument("--variables", type=int, required=True, help="Number of input variables (1–6).")
    truth.add_argument("--outputs", required=True, help="Comma-separated outputs, e.g. 0,1,1,0")
    return parser


def main() -> None:
    parser = build_parser()
    arguments = parser.parse_args()
    if arguments.mode == "expression":
        analysis = analyze_expression(arguments.formula)
    elif arguments.mode == "terms":
        kind = "minterms" if arguments.minterms is not None else "maxterms"
        selected = parse_indices(arguments.minterms if arguments.minterms is not None else arguments.maxterms)
        analysis = analyze_terms(arguments.variables, selected, kind)
    else:
        analysis = analyze_truth_table(variable_names(arguments.variables), parse_outputs(arguments.outputs), "Truth table input")

    if arguments.json:
        print(json.dumps(analysis.to_dict(), indent=2))
    else:
        print_report(analysis)


if __name__ == "__main__":
    main()

