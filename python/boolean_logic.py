"""Boolean Circuit Lab — readable Python implementation.

This module is deliberately standard-library-only so it can be reviewed and run
in a basic Python installation.  It accepts Boolean expressions, minterms,
maxterms, or truth-table outputs; finds an exact minimal SOP cover; derives a
minimal POS form; builds basic-gate, NAND-only, and NOR-only netlists; then
verifies every generated form for every input combination.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
import itertools
import re
from typing import Iterable, Literal


GateType = Literal["INPUT", "CONST", "NOT", "AND", "OR", "NAND", "NOR", "OUTPUT"]


@dataclass(frozen=True)
class LiteralTerm:
    """A variable in a product or sum term; ``negated=True`` means A' / NOT A."""

    variable: str
    negated: bool = False


ProductTerm = tuple[LiteralTerm, ...]


@dataclass(frozen=True)
class Gate:
    """One gate in a topologically ordered netlist."""

    name: str
    gate_type: GateType
    inputs: tuple[str, ...] = ()


@dataclass
class Circuit:
    """A named netlist with its primary variables and final output signal."""

    title: str
    variables: list[str]
    gates: list[Gate]
    output: str = "F"

    def gate_lines(self) -> list[str]:
        """Return a compact display of the circuit suitable for a lab record."""
        lines: list[str] = []
        for gate in self.gates:
            if gate.gate_type == "INPUT":
                continue
            if gate.gate_type == "CONST":
                lines.append(f"{gate.name} = {gate.name}")
            else:
                lines.append(f"{gate.name} = {gate.gate_type}({', '.join(gate.inputs)})")
        return lines


@dataclass
class VerificationRow:
    """One exhaustive comparison row."""

    index: int
    assignment: dict[str, bool]
    original: bool
    simplified_sop: bool
    nand_only: bool
    nor_only: bool

    @property
    def matches(self) -> bool:
        return self.original == self.simplified_sop == self.nand_only == self.nor_only


@dataclass
class Analysis:
    """Complete result returned by each accepted input route."""

    variables: list[str]
    values: list[bool]
    source: str
    simplified_sop: str
    simplified_pos: str
    minterms: list[int]
    maxterms: list[int]
    standard_circuit: Circuit
    nand_circuit: Circuit
    nor_circuit: Circuit
    verification: list[VerificationRow]

    @property
    def verified(self) -> bool:
        return all(row.matches for row in self.verification)

    def to_dict(self) -> dict:
        """Produce a JSON-serialisable report for a Python assignment or API."""
        return {
            "variables": self.variables,
            "source": self.source,
            "simplified_sop": self.simplified_sop,
            "simplified_pos": self.simplified_pos,
            "minterms": self.minterms,
            "maxterms": self.maxterms,
            "verified": self.verified,
            "circuits": {
                "standard": [asdict(gate) for gate in self.standard_circuit.gates],
                "nand_only": [asdict(gate) for gate in self.nand_circuit.gates],
                "nor_only": [asdict(gate) for gate in self.nor_circuit.gates],
            },
            "verification": [
                {
                    "index": row.index,
                    "assignment": row.assignment,
                    "original": row.original,
                    "simplified_sop": row.simplified_sop,
                    "nand_only": row.nand_only,
                    "nor_only": row.nor_only,
                    "matches": row.matches,
                }
                for row in self.verification
            ],
        }


Ast = tuple


def variable_names(count: int) -> list[str]:
    """Return the standard lab variable names A through F."""
    if not 1 <= count <= 6:
        raise ValueError("Use between 1 and 6 input variables.")
    return list("ABCDEF"[:count])


def all_assignments(variables: list[str]) -> list[dict[str, bool]]:
    """Generate rows in normal binary order (A is the most significant bit)."""
    return [dict(zip(variables, bits)) for bits in itertools.product((False, True), repeat=len(variables))]


def _is_identifier(token: str) -> bool:
    return bool(re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", token))


def tokenize(expression: str) -> list[str]:
    """Tokenise ordinary Boolean notation and insert implicit AND operators.

    Adjacent upper-case symbols are intentionally separate variables, so ``AB``
    means ``A AND B``.  Lowercase or numbered identifiers remain available for
    named variables such as ``enable`` or ``A1``.
    """
    pattern = re.compile(r"\s*([A-Z]|[a-z][A-Za-z0-9_]*|[A-Z][0-9_][A-Za-z0-9_]*|[01]|[()+*·&|!~'])")
    raw: list[str] = []
    position = 0
    while position < len(expression):
        match = pattern.match(expression, position)
        if not match:
            raise ValueError(f"Unexpected character near {expression[position:position + 8]!r}.")
        raw.append(match.group(1))
        position = match.end()

    def can_end(token: str) -> bool:
        return _is_identifier(token) or token in {"0", "1", ")", "'"}

    def can_start(token: str) -> bool:
        return _is_identifier(token) or token in {"0", "1", "(", "!", "~"}

    tokens: list[str] = []
    for index, token in enumerate(raw):
        if index and can_end(raw[index - 1]) and can_start(token):
            tokens.append("&")
        tokens.append(token)
    return tokens


class ExpressionParser:
    """Small recursive-descent parser for OR, AND, NOT, parentheses and constants."""

    def __init__(self, tokens: list[str]) -> None:
        if not tokens:
            raise ValueError("Enter a Boolean expression first.")
        self.tokens = tokens
        self.position = 0

    def parse(self) -> Ast:
        result = self._parse_or()
        if self.position != len(self.tokens):
            raise ValueError(f"Could not interpret {self.tokens[self.position]!r}.")
        return result

    def _peek(self) -> str | None:
        return self.tokens[self.position] if self.position < len(self.tokens) else None

    def _take(self) -> str:
        token = self._peek()
        if token is None:
            raise ValueError("The expression ends unexpectedly.")
        self.position += 1
        return token

    def _parse_or(self) -> Ast:
        result = self._parse_and()
        while self._peek() in {"+", "|"}:
            self._take()
            result = ("or", result, self._parse_and())
        return result

    def _parse_and(self) -> Ast:
        result = self._parse_unary()
        while self._peek() in {"*", "·", "&"}:
            self._take()
            result = ("and", result, self._parse_unary())
        return result

    def _parse_unary(self) -> Ast:
        if self._peek() in {"!", "~"}:
            self._take()
            return ("not", self._parse_unary())
        result = self._parse_primary()
        while self._peek() == "'":
            self._take()
            result = ("not", result)
        return result

    def _parse_primary(self) -> Ast:
        token = self._take()
        if token == "(":
            result = self._parse_or()
            if self._take() != ")":
                raise ValueError("A closing parenthesis is missing.")
            return result
        if token in {"0", "1"}:
            return ("const", token == "1")
        if _is_identifier(token):
            return ("var", token.upper())
        raise ValueError("Expected a variable, 0, 1, or an opening parenthesis.")


def _evaluate_ast(tree: Ast, assignment: dict[str, bool]) -> bool:
    kind = tree[0]
    if kind == "var":
        return assignment.get(tree[1], False)
    if kind == "const":
        return tree[1]
    if kind == "not":
        return not _evaluate_ast(tree[1], assignment)
    if kind == "and":
        return _evaluate_ast(tree[1], assignment) and _evaluate_ast(tree[2], assignment)
    if kind == "or":
        return _evaluate_ast(tree[1], assignment) or _evaluate_ast(tree[2], assignment)
    raise ValueError(f"Unknown syntax node: {kind}.")


def _variables_in(tree: Ast) -> set[str]:
    if tree[0] == "var":
        return {tree[1]}
    if tree[0] in {"const"}:
        return set()
    if tree[0] == "not":
        return _variables_in(tree[1])
    return _variables_in(tree[1]) | _variables_in(tree[2])


@dataclass(frozen=True)
class _Implicant:
    pattern: str
    covered: frozenset[int]

    @property
    def literals(self) -> int:
        return self.pattern.count("0") + self.pattern.count("1")


def _merge_patterns(left: str, right: str) -> str | None:
    differences = 0
    merged: list[str] = []
    for left_bit, right_bit in zip(left, right):
        if left_bit == right_bit:
            merged.append(left_bit)
        elif left_bit == "-" or right_bit == "-":
            return None
        else:
            differences += 1
            merged.append("-")
    return "".join(merged) if differences == 1 else None


def minimise_sop(variables: list[str], minterms: Iterable[int]) -> list[ProductTerm]:
    """Return an exact minimum sum-of-products cover via prime implicants.

    The selection step chooses the cover with the fewest product terms and then
    the fewest literals.  It is practical and transparent for the lab limit of
    at most six variables.
    """
    total_rows = 2 ** len(variables)
    terms = sorted(set(minterms))
    if any(term < 0 or term >= total_rows for term in terms):
        raise ValueError(f"Minterms must be between 0 and {total_rows - 1}.")
    if not terms:
        return []
    if len(terms) == total_rows:
        return [()]

    current = [_Implicant(f"{term:0{len(variables)}b}", frozenset({term})) for term in terms]
    prime_by_pattern: dict[str, _Implicant] = {}
    while current:
        combined: set[int] = set()
        next_by_pattern: dict[str, _Implicant] = {}
        for left_index, left in enumerate(current):
            for right_index in range(left_index + 1, len(current)):
                right = current[right_index]
                merged = _merge_patterns(left.pattern, right.pattern)
                if merged is None:
                    continue
                combined.update({left_index, right_index})
                existing = next_by_pattern.get(merged)
                coverage = left.covered | right.covered | (existing.covered if existing else frozenset())
                next_by_pattern[merged] = _Implicant(merged, coverage)
        for index, implicant in enumerate(current):
            if index not in combined:
                existing = prime_by_pattern.get(implicant.pattern)
                coverage = implicant.covered | (existing.covered if existing else frozenset())
                prime_by_pattern[implicant.pattern] = _Implicant(implicant.pattern, coverage)
        current = list(next_by_pattern.values())

    primes = list(prime_by_pattern.values())
    covering = {minterm: [index for index, prime in enumerate(primes) if minterm in prime.covered] for minterm in terms}
    essential = {choices[0] for choices in covering.values() if len(choices) == 1}

    best: tuple[int, ...] | None = None

    def score(choice: tuple[int, ...]) -> tuple[int, int, tuple[str, ...]]:
        return (len(choice), sum(primes[index].literals for index in choice), tuple(primes[index].pattern for index in choice))

    def covered_by(choice: set[int]) -> set[int]:
        return set().union(*(primes[index].covered for index in choice)) if choice else set()

    def search(choice: set[int]) -> None:
        nonlocal best
        uncovered = [term for term in terms if term not in covered_by(choice)]
        if not uncovered:
            candidate = tuple(sorted(choice))
            if best is None or score(candidate) < score(best):
                best = candidate
            return
        if best is not None and len(choice) >= len(best):
            return
        pivot = min(uncovered, key=lambda term: len(covering[term]))
        for prime_index in sorted(covering[pivot], key=lambda index: primes[index].literals):
            if prime_index not in choice:
                search(choice | {prime_index})

    search(essential)
    selected = best or tuple(sorted(essential))
    result: list[ProductTerm] = []
    for index in selected:
        pattern = primes[index].pattern
        result.append(tuple(LiteralTerm(variables[position], bit == "0") for position, bit in enumerate(pattern) if bit != "-"))
    return sorted(result, key=lambda term: "".join(literal.variable + ("'" if literal.negated else "") for literal in term))


def format_literal(literal: LiteralTerm) -> str:
    return literal.variable + ("'" if literal.negated else "")


def format_sop(terms: list[ProductTerm]) -> str:
    if not terms:
        return "0"
    if () in terms:
        return "1"
    return " + ".join("·".join(format_literal(literal) for literal in term) for term in terms)


def format_pos(factors: list[ProductTerm]) -> str:
    if not factors:
        return "1"
    if () in factors:
        return "0"
    return "·".join(f"({' + '.join(format_literal(literal) for literal in factor)})" for factor in factors)


def _evaluate_sop(terms: list[ProductTerm], assignment: dict[str, bool]) -> bool:
    return any(all((not assignment[literal.variable]) if literal.negated else assignment[literal.variable] for literal in term) for term in terms)


def _input_gates(variables: list[str]) -> list[Gate]:
    return [Gate(variable, "INPUT") for variable in variables]


def build_standard_circuit(variables: list[str], terms: list[ProductTerm]) -> Circuit:
    """Build the standard AND/OR/NOT implementation of a sum-of-products form."""
    gates = _input_gates(variables)
    if not terms or () in terms:
        gates.extend([Gate("K", "CONST"), Gate("F", "OUTPUT", ("K",))])
        return Circuit("AND · OR · NOT", variables, gates)

    inversions: dict[str, str] = {}

    def source(literal: LiteralTerm) -> str:
        if not literal.negated:
            return literal.variable
        if literal.variable not in inversions:
            name = f"not_{literal.variable}"
            gates.append(Gate(name, "NOT", (literal.variable,)))
            inversions[literal.variable] = name
        return inversions[literal.variable]

    product_sources: list[str] = []
    for index, term in enumerate(terms, start=1):
        inputs = tuple(source(literal) for literal in term)
        if len(inputs) == 1:
            product_sources.append(inputs[0])
        else:
            name = f"and_{index}"
            gates.append(Gate(name, "AND", inputs))
            product_sources.append(name)
    source_name = product_sources[0] if len(product_sources) == 1 else "or_final"
    if len(product_sources) > 1:
        gates.append(Gate(source_name, "OR", tuple(product_sources)))
    gates.append(Gate("F", "OUTPUT", (source_name,)))
    return Circuit("AND · OR · NOT", variables, gates)


def build_nand_circuit(variables: list[str], terms: list[ProductTerm]) -> Circuit:
    """Build a two-level NAND-only circuit from a sum-of-products form."""
    gates = _input_gates(variables)
    if not terms or () in terms:
        gates.extend([Gate("K", "CONST"), Gate("F", "OUTPUT", ("K",))])
        return Circuit("NAND-only", variables, gates)

    inversions: dict[str, str] = {}

    def source(literal: LiteralTerm) -> str:
        if not literal.negated:
            return literal.variable
        if literal.variable not in inversions:
            name = f"nand_not_{literal.variable}"
            gates.append(Gate(name, "NAND", (literal.variable, literal.variable)))
            inversions[literal.variable] = name
        return inversions[literal.variable]

    negated_products: list[str] = []
    for index, term in enumerate(terms, start=1):
        inputs = tuple(source(literal) for literal in term)
        if len(inputs) == 1:
            inputs = (inputs[0], inputs[0])
        name = f"nand_product_{index}"
        gates.append(Gate(name, "NAND", inputs))
        negated_products.append(name)
    final_inputs = tuple(negated_products) if len(negated_products) > 1 else (negated_products[0], negated_products[0])
    gates.extend([Gate("nand_final", "NAND", final_inputs), Gate("F", "OUTPUT", ("nand_final",))])
    return Circuit("NAND-only", variables, gates)


def build_nor_circuit(variables: list[str], factors: list[ProductTerm]) -> Circuit:
    """Build a two-level NOR-only circuit from a product-of-sums form."""
    gates = _input_gates(variables)
    if not factors or () in factors:
        gates.extend([Gate("K", "CONST"), Gate("F", "OUTPUT", ("K",))])
        return Circuit("NOR-only", variables, gates)

    inversions: dict[str, str] = {}

    def source(literal: LiteralTerm) -> str:
        if not literal.negated:
            return literal.variable
        if literal.variable not in inversions:
            name = f"nor_not_{literal.variable}"
            gates.append(Gate(name, "NOR", (literal.variable, literal.variable)))
            inversions[literal.variable] = name
        return inversions[literal.variable]

    negated_factors: list[str] = []
    for index, factor in enumerate(factors, start=1):
        inputs = tuple(source(literal) for literal in factor)
        if len(inputs) == 1:
            inputs = (inputs[0], inputs[0])
        name = f"nor_factor_{index}"
        gates.append(Gate(name, "NOR", inputs))
        negated_factors.append(name)
    final_inputs = tuple(negated_factors) if len(negated_factors) > 1 else (negated_factors[0], negated_factors[0])
    gates.extend([Gate("nor_final", "NOR", final_inputs), Gate("F", "OUTPUT", ("nor_final",))])
    return Circuit("NOR-only", variables, gates)


def _evaluate_regular_circuit(circuit: Circuit, assignment: dict[str, bool]) -> bool:
    """Evaluate an ordered netlist.  The gate list is arranged topologically."""
    values: dict[str, bool] = {}
    for gate in circuit.gates:
        inputs = [values[name] for name in gate.inputs]
        if gate.gate_type == "INPUT":
            values[gate.name] = assignment[gate.name]
        elif gate.gate_type == "CONST":
            values[gate.name] = bool(circuit.title != "" and gate.name == "K")
            # Constants are adjusted by analyse_from_values after construction.
        elif gate.gate_type == "NOT":
            values[gate.name] = not inputs[0]
        elif gate.gate_type == "AND":
            values[gate.name] = all(inputs)
        elif gate.gate_type == "OR":
            values[gate.name] = any(inputs)
        elif gate.gate_type == "NAND":
            values[gate.name] = not all(inputs)
        elif gate.gate_type == "NOR":
            values[gate.name] = not any(inputs)
        elif gate.gate_type == "OUTPUT":
            values[gate.name] = inputs[0]
        else:
            raise ValueError(f"Unsupported gate type {gate.gate_type}.")
    return values[circuit.output]


def _constant_circuit(variables: list[str], title: str, value: bool) -> Circuit:
    """Represent constants with an explicitly named CONST gate (K0/K1)."""
    return Circuit(title, variables, _input_gates(variables) + [Gate("K1" if value else "K0", "CONST"), Gate("F", "OUTPUT", ("K1" if value else "K0",))])


def _evaluate_circuit(circuit: Circuit, assignment: dict[str, bool]) -> bool:
    """Evaluate regular and constant circuits without relying on any library."""
    values: dict[str, bool] = {}
    for gate in circuit.gates:
        if gate.gate_type == "INPUT":
            values[gate.name] = assignment[gate.name]
            continue
        if gate.gate_type == "CONST":
            values[gate.name] = gate.name == "K1"
            continue
        inputs = [values[name] for name in gate.inputs]
        if gate.gate_type == "NOT":
            values[gate.name] = not inputs[0]
        elif gate.gate_type == "AND":
            values[gate.name] = all(inputs)
        elif gate.gate_type == "OR":
            values[gate.name] = any(inputs)
        elif gate.gate_type == "NAND":
            values[gate.name] = not all(inputs)
        elif gate.gate_type == "NOR":
            values[gate.name] = not any(inputs)
        elif gate.gate_type == "OUTPUT":
            values[gate.name] = inputs[0]
        else:
            raise ValueError(f"Unsupported gate type {gate.gate_type}.")
    return values[circuit.output]


def evaluate_circuit(circuit: Circuit, assignment: dict[str, bool]) -> bool:
    """Evaluate a circuit, including constant-zero and constant-one functions."""
    return _evaluate_circuit(circuit, assignment)


def analyze_truth_table(variables: list[str], outputs: Iterable[bool], source: str = "Truth table input") -> Analysis:
    """Analyse ordered truth-table output values and generate all implementation forms."""
    outputs = list(outputs)
    expected_rows = 2 ** len(variables)
    if len(outputs) != expected_rows:
        raise ValueError(f"{len(variables)} variables require exactly {expected_rows} truth-table outputs.")
    minterms = [index for index, output in enumerate(outputs) if output]
    maxterms = [index for index, output in enumerate(outputs) if not output]
    sop_terms = minimise_sop(variables, minterms)
    complement_terms = minimise_sop(variables, maxterms)
    pos_factors = [tuple(LiteralTerm(literal.variable, not literal.negated) for literal in term) for term in complement_terms]

    if not sop_terms or () in sop_terms:
        constant = bool(sop_terms)
        standard = _constant_circuit(variables, "AND · OR · NOT", constant)
        nand = _constant_circuit(variables, "NAND-only", constant)
        nor = _constant_circuit(variables, "NOR-only", constant)
    else:
        standard = build_standard_circuit(variables, sop_terms)
        nand = build_nand_circuit(variables, sop_terms)
        nor = build_nor_circuit(variables, pos_factors)

    rows: list[VerificationRow] = []
    for index, assignment in enumerate(all_assignments(variables)):
        rows.append(
            VerificationRow(
                index=index,
                assignment=assignment,
                original=outputs[index],
                simplified_sop=_evaluate_sop(sop_terms, assignment),
                nand_only=_evaluate_circuit(nand, assignment),
                nor_only=_evaluate_circuit(nor, assignment),
            )
        )
    return Analysis(
        variables=variables,
        values=outputs,
        source=source,
        simplified_sop=format_sop(sop_terms),
        simplified_pos=format_pos(pos_factors),
        minterms=minterms,
        maxterms=maxterms,
        standard_circuit=standard,
        nand_circuit=nand,
        nor_circuit=nor,
        verification=rows,
    )


def analyze_expression(expression: str) -> Analysis:
    """Parse and analyse an expression such as ``A'B + AB' + AC``."""
    tree = ExpressionParser(tokenize(expression)).parse()
    variables = sorted(_variables_in(tree))
    if not variables:
        raise ValueError("Use at least one named input variable.")
    if len(variables) > 6:
        raise ValueError("This lab supports up to 6 input variables.")
    outputs = [_evaluate_ast(tree, assignment) for assignment in all_assignments(variables)]
    return analyze_truth_table(variables, outputs, expression)


def analyze_terms(variable_count: int, indices: Iterable[int], kind: Literal["minterms", "maxterms"] = "minterms") -> Analysis:
    """Analyse Σm or ΠM notation using standard variable names A through F."""
    variables = variable_names(variable_count)
    selected = sorted(set(indices))
    total_rows = 2 ** variable_count
    if any(not isinstance(index, int) or index < 0 or index >= total_rows for index in selected):
        raise ValueError(f"Indices must be whole numbers between 0 and {total_rows - 1}.")
    selected_set = set(selected)
    outputs = [index in selected_set if kind == "minterms" else index not in selected_set for index in range(total_rows)]
    notation = f"Σm({', '.join(map(str, selected))})" if kind == "minterms" else f"ΠM({', '.join(map(str, selected))})"
    return analyze_truth_table(variables, outputs, notation)
