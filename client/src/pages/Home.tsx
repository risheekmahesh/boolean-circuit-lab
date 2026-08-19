/**
 * Circuit Atlas UI — Swiss-modern technical workbench with Signal Teal pathways,
 * drafting labels, monospaced Boolean notation, and a left-to-right evidence flow.
 */

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  CircuitBoard,
  Copy,
  FileSpreadsheet,
  FunctionSquare,
  GitBranch,
  Layers3,
  Play,
  RotateCcw,
  Sigma,
  TableProperties,
  XCircle,
} from "lucide-react";
import {
  AnalysisResult,
  CircuitGraph,
  CircuitNode,
  analyzeFromValues,
  createVariables,
  parseBooleanExpression,
  parseDontCareList,
  parseIndexList,
  valuesFromTerms,
} from "@/lib/booleanLogic";
import ThemeToggle from "@/components/ThemeToggle";

type InputMode = "expression" | "terms" | "truth";
type TermKind = "minterms" | "maxterms";

const HERO_ASSET = "/manus-storage/circuit-atlas-hero_7678a108.jpg";
const DETAIL_ASSET = "/manus-storage/circuit-atlas-diagram-detail_647595c6.jpg";
const DEFAULT_EXPRESSION = "A'B + AB' + AC";
const DEFAULT_TRUTH = [false, true, true, false, true, true, true, true];

function makeInitialAnalysis() {
  const parsed = parseBooleanExpression(DEFAULT_EXPRESSION);
  return analyzeFromValues(parsed.variables, parsed.values, DEFAULT_EXPRESSION);
}

function BooleanChip({ value, compact = false, dontCare = false }: { value: boolean; compact?: boolean; dontCare?: boolean }) {
  if (dontCare) return <span className={`boolean-chip is-dont-care ${compact ? "compact" : ""}`}>X</span>;
  return <span className={`boolean-chip ${value ? "is-high" : "is-low"} ${compact ? "compact" : ""}`}>{value ? "1" : "0"}</span>;
}

function GatePill({ gate }: { gate: string }) {
  return <span className={`gate-pill gate-${gate.toLowerCase()}`}>{gate}</span>;
}

function nodeDimensions(gate: CircuitNode["gate"]) {
  if (gate === "INPUT") return { width: 88, height: 36 };
  if (gate === "OUTPUT") return { width: 70, height: 42 };
  if (gate === "CONST") return { width: 72, height: 36 };
  return { width: 104, height: 64 };
}

function gatePath(gate: CircuitNode["gate"], width: number, height: number) {
  if (gate === "AND" || gate === "NAND") {
    return `M 8 8 H ${width - 46} A 27 24 0 0 1 ${width - 46} ${height - 8} H 8 Z`;
  }
  if (gate === "OR" || gate === "NOR") {
    return `M 8 8 Q 38 ${height / 2} 8 ${height - 8} Q ${width - 42} ${height - 5} ${width - 8} ${height / 2} Q ${width - 42} 5 8 8 Z`;
  }
  return `M 10 8 L ${width - 22} ${height / 2} L 10 ${height - 8} Z`;
}

function CircuitDiagram({ graph }: { graph: CircuitGraph }) {
  const layout = useMemo(() => {
    const grouped = new Map<number, CircuitNode[]>();
    graph.nodes.forEach((current) => grouped.set(current.column, [...(grouped.get(current.column) ?? []), current]));
    const maxColumn = Math.max(...graph.nodes.map((item) => item.column));
    const maxRows = Math.max(...Array.from(grouped.values()).map((items) => items.length));
    if (graph.title !== "NAND-only" && graph.title !== "NOR-only") {
      const height = Math.max(270, 80 + maxRows * 58);
      const columnX = new Map<number, number>();
      let nextX = 24;
      for (let column = 0; column <= maxColumn; column += 1) {
        columnX.set(column, nextX);
        const widest = Math.max(...(grouped.get(column) ?? []).map((item) => nodeDimensions(item.gate).width), 88);
        nextX += widest + 112;
      }
      const position = new Map<string, { x: number; y: number }>();
      grouped.forEach((items, column) => {
        const totalHeight = items.length * 42 + Math.max(0, items.length - 1) * 20;
        const startY = Math.max(26, (height - totalHeight) / 2);
        items.forEach((current, index) => position.set(current.id, { x: columnX.get(column) ?? 24, y: startY + index * 62 }));
      });
      return { width: Math.max(720, nextX - 16), height, position };
    }
    const height = Math.max(270, 80 + Math.max(maxRows, 3) * 58);
    const columnX = new Map<number, number>();
    let nextX = 24;
    const stageGap = 112;
    for (let column = 0; column <= maxColumn; column += 1) {
      columnX.set(column, nextX);
      const widest = Math.max(...(grouped.get(column) ?? []).map((item) => nodeDimensions(item.gate).width), 88);
      nextX += widest + stageGap;
    }
    const position = new Map<string, { x: number; y: number }>();
    const centerY = height / 2;
    const inputNodes = grouped.get(0) ?? [];
    const inputGap = inputNodes.length > 1 ? Math.min(64, (height - 72) / (inputNodes.length - 1)) : 0;
    const inputTop = (height - ((inputNodes.length - 1) * inputGap) - 36) / 2;
    inputNodes.forEach((current, index) => position.set(current.id, { x: columnX.get(0) ?? 24, y: inputTop + index * inputGap }));
    for (let column = 1; column <= maxColumn; column += 1) {
      const items = grouped.get(column) ?? [];
      if (column === 1) {
        items.forEach((current, index) => {
          const source = current.inputs[0] ? graph.nodes.find((node) => node.id === current.inputs[0]) : undefined;
          const sourcePosition = current.inputs[0] ? position.get(current.inputs[0]) : undefined;
          const sourceCenter = source && sourcePosition ? sourcePosition.y + nodeDimensions(source.gate).height / 2 : centerY + (index - (items.length - 1) / 2) * 58;
          const size = nodeDimensions(current.gate);
          position.set(current.id, { x: columnX.get(column) ?? 24, y: sourceCenter - size.height / 2 });
        });
      } else if (column === 2) {
        const gateGap = items.length > 1 ? Math.min(64, (height - 72) / (items.length - 1)) : 0;
        items.forEach((current, index) => {
          const size = nodeDimensions(current.gate);
          const gateCenter = centerY + (index - (items.length - 1) / 2) * gateGap;
          position.set(current.id, { x: columnX.get(column) ?? 24, y: gateCenter - size.height / 2 });
        });
      } else {
        items.forEach((current) => {
          const size = nodeDimensions(current.gate);
          position.set(current.id, { x: columnX.get(column) ?? 24, y: centerY - size.height / 2 });
        });
      }
    }
    return { width: Math.max(720, nextX - 16), height, position };
  }, [graph]);

  const idSuffix = graph.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const edges = graph.nodes.flatMap((target) => Array.from(new Set(target.inputs)).map((sourceId) => ({ target, sourceId })));
  const sourceEdges = new Map<string, typeof edges>();
  edges.forEach((edge) => sourceEdges.set(edge.sourceId, [...(sourceEdges.get(edge.sourceId) ?? []), edge]));
  const inputLane = new Map(graph.nodes.filter((node) => node.gate === "INPUT").map((node, index) => [node.id, index]));
  const laneFor = (sourceId: string) => inputLane.get(sourceId) ?? Math.max(0, graph.nodes.findIndex((node) => node.id === sourceId) % 3);
  const separatedInputLanes = graph.title === "NAND-only" || graph.title === "NOR-only" || graph.title === "AND · OR · NOT";
  const laneOffset = (sourceId: string) => separatedInputLanes && inputLane.has(sourceId) ? laneFor(sourceId) * 20 : 0;
  const portY = (point: { x: number; y: number }, size: { width: number; height: number }, gate: CircuitNode["gate"], inputIndex: number, inputCount: number) => {
    if (!["AND", "OR", "NAND", "NOR", "NOT"].includes(gate)) return point.y + size.height / 2;
    const spacing = inputCount > 2 ? 15 : 19;
    return point.y + size.height / 2 + (inputIndex - (inputCount - 1) / 2) * spacing;
  };
  const wireRoutes: { id: string; path: string; arrow: boolean; sourceId: string }[] = [];
  const junctions: { id: string; x: number; y: number; sourceId: string }[] = [];
  const wireSourceClass = (sourceId: string) => {
    const source = graph.nodes.find((node) => node.id === sourceId);
    if (source?.gate === "INPUT") return source.label.toLowerCase();
    return "derived";
  };
  sourceEdges.forEach((connections, sourceId) => {
    const source = graph.nodes.find((item) => item.id === sourceId);
    const sourcePosition = layout.position.get(sourceId);
    if (!source || !sourcePosition) return;
    const sourceSize = nodeDimensions(source.gate);
    const sourceOutputOffset = source.gate === "INPUT" ? sourceSize.width + 18 : source.gate === "NOT" ? sourceSize.width - 12 : ["NAND", "NOR"].includes(source.gate) ? sourceSize.width - 4 : ["AND", "OR"].includes(source.gate) ? sourceSize.width - 8 : sourceSize.width;
    const startX = sourcePosition.x + sourceOutputOffset;
    const startY = sourcePosition.y + sourceSize.height / 2;
    if (connections.length > 1) {
      const branchX = startX + 30 + laneOffset(sourceId);
      wireRoutes.push({ id: `${sourceId}-trunk`, path: `M ${startX} ${startY} H ${branchX}`, arrow: false, sourceId });
      junctions.push({ id: sourceId, x: branchX, y: startY, sourceId });
      connections.forEach(({ target, sourceId: targetSourceId }) => {
        const targetPosition = layout.position.get(target.id);
        if (!targetPosition) return;
        const targetSize = nodeDimensions(target.gate);
        const targetInputOffset = target.gate === "NOT" ? 10 : ["NAND", "NOR"].includes(target.gate) ? 6 : ["AND", "OR"].includes(target.gate) ? 8 : 0;
        const endX = targetPosition.x + targetInputOffset;
        const inputIndex = target.inputs.indexOf(targetSourceId);
        const endY = portY(targetPosition, targetSize, target.gate, inputIndex, target.inputs.length);
        wireRoutes.push({ id: `${sourceId}-${target.id}`, path: `M ${branchX} ${startY} V ${endY} H ${endX}`, arrow: true, sourceId });
      });
      return;
    }
    const onlyConnection = connections[0];
    const targetPosition = layout.position.get(onlyConnection.target.id);
    if (!targetPosition) return;
    const targetSize = nodeDimensions(onlyConnection.target.gate);
    const targetInputOffset = onlyConnection.target.gate === "NOT" ? 10 : ["NAND", "NOR"].includes(onlyConnection.target.gate) ? 6 : ["AND", "OR"].includes(onlyConnection.target.gate) ? 8 : 0;
    const endX = targetPosition.x + targetInputOffset;
    const inputIndex = onlyConnection.target.inputs.indexOf(sourceId);
    const endY = portY(targetPosition, targetSize, onlyConnection.target.gate, inputIndex, onlyConnection.target.inputs.length);
    const channelX = startX + 30 + laneOffset(sourceId);
    wireRoutes.push({ id: `${sourceId}-${onlyConnection.target.id}`, path: `M ${startX} ${startY} H ${channelX} V ${endY} H ${endX}`, arrow: true, sourceId });
  });

  return (
    <div className="diagram-frame" aria-label={`${graph.title} graphical circuit diagram`}>
      {(graph.title === "NAND-only" || graph.title === "NOR-only") && <div className="diagram-wire-legend" aria-label="Signal wire legend"><span className="wire-legend-item wire-source-a"><i />A</span><span className="wire-legend-item wire-source-b"><i />B</span><span className="wire-legend-item wire-source-c"><i />C</span><span className="wire-legend-item wire-source-derived"><i />Derived</span></div>}
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" preserveAspectRatio="xMinYMin meet">
        <defs>
          <pattern id={`draft-grid-${idSuffix}`} width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M 12 0 L 0 0 0 12" fill="none" stroke="rgba(25, 48, 50, 0.08)" strokeWidth="0.65" />
          </pattern>
          <marker id={`signal-arrow-${idSuffix}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#007C74" />
          </marker>
        </defs>
        <rect x="0" y="0" width={layout.width} height={layout.height} fill={`url(#draft-grid-${idSuffix})`} />
        {wireRoutes.map((route) => <path key={route.id} className={`diagram-wire wire-source-${wireSourceClass(route.sourceId)} ${route.arrow ? "has-arrow" : "wire-trunk"}`} d={route.path} markerEnd={route.arrow ? `url(#signal-arrow-${idSuffix})` : undefined} />)}
        {graph.nodes.map((current) => {
          const point = layout.position.get(current.id)!;
          const size = nodeDimensions(current.gate);
          const isLogicGate = ["AND", "OR", "NAND", "NOR", "NOT"].includes(current.gate);
          const bubble = current.gate === "NAND" || current.gate === "NOR" || current.gate === "NOT";
          const bubbleX = current.gate === "NOT" ? size.width - 17 : size.width - 7;
          return (
            <g key={current.id} transform={`translate(${point.x}, ${point.y})`}>
              {current.gate === "INPUT" && <><rect className="input-terminal" width={size.width} height={size.height} rx="17" /><text className="terminal-label" x="22" y="23" textAnchor="middle">{current.label}</text><path className="terminal-stub" d={`M ${size.width} ${size.height / 2} H ${size.width + 18}`} /></>}
              {current.gate === "OUTPUT" && <><path className="output-stub" d={`M 0 ${size.height / 2} H 12`} /><rect className="output-terminal" x="12" y="3" width={size.width - 12} height={size.height - 6} rx="12" /><text className="output-label" x={size.width / 2 + 6} y={size.height / 2 + 5} textAnchor="middle">{current.label}</text></>}
              {current.gate === "CONST" && <><rect className="const-terminal" width={size.width} height={size.height} rx="10" /><text className="const-label" x={size.width / 2} y={size.height / 2 + 4} textAnchor="middle">CONST {current.label}</text></>}
              {isLogicGate && <><path className={`logic-gate gate-shape-${current.gate.toLowerCase()}`} d={gatePath(current.gate, size.width, size.height)} /><text className="gate-name" x={current.gate === "NOT" ? 34 : 48} y={size.height / 2 + 4} textAnchor="middle">{current.label}</text>{bubble && <circle className="gate-bubble" cx={bubbleX} cy={size.height / 2} r="5" />}</>}
            </g>
          );
        })}
        {junctions.map((junction) => <circle key={`junction-${junction.id}`} className={`junction-dot wire-source-${wireSourceClass(junction.sourceId)}`} cx={junction.x} cy={junction.y} r="4" />)}
      </svg>
    </div>
  );
}

function CircuitCard({ graph, accent }: { graph: CircuitGraph; accent: string }) {
  const gateCount = graph.nodes.filter((node) => !["INPUT", "OUTPUT", "CONST"].includes(node.gate)).length;
  const heading = graph.title === "AND · OR · NOT" ? "AND–OR–NOT" : graph.title.toUpperCase();
  const subtitle = graph.title === "AND · OR · NOT" ? "Standard gate implementation" : graph.title === "NAND-only" ? "Universal NAND implementation" : "Universal NOR implementation";
  return (
    <article className={`circuit-card accent-${accent}`}>
      <div className="circuit-card-header">
        <div>
          <div className="eyebrow">GATE-LEVEL IMPLEMENTATION</div>
          <h3>{heading}</h3>
        </div>
        <div className="gate-summary"><CircuitBoard size={16} /><span>{gateCount} gates</span></div>
      </div>
      <p>{subtitle}. {graph.caption}</p>
      <div className="diagram-expression"><span>Derived form</span><code>{graph.expression}</code></div>
      <CircuitDiagram graph={graph} />
    </article>
  );
}

function InputModeTab({ active, label, helper, icon, onClick }: { active: boolean; label: string; helper: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" className={`mode-tab ${active ? "active" : ""}`} onClick={onClick}>
      <span className="mode-tab-icon">{icon}</span>
      <span><strong>{label}</strong><small>{helper}</small></span>
    </button>
  );
}

function VariableStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="stepper-control" aria-label="Input variable count">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} aria-label="Decrease variables">−</button>
      <strong>{value}</strong><span>variables</span>
      <button type="button" onClick={() => onChange(Math.min(6, value + 1))} aria-label="Increase variables">+</button>
    </div>
  );
}

function grayCodes(bits: number) {
  return Array.from({ length: 2 ** bits }, (_, value) => value ^ (value >> 1));
}

function KMap({ analysis }: { analysis: AnalysisResult }) {
  const rowBits = Math.floor(analysis.variables.length / 2);
  const columnBits = analysis.variables.length - rowBits;
  const rowCodes = grayCodes(rowBits);
  const columnCodes = grayCodes(columnBits);
  const rowVariables = analysis.variables.slice(0, rowBits);
  const columnVariables = analysis.variables.slice(rowBits);
  const rowLabel = rowVariables.length ? rowVariables.join("") : "—";
  const columnLabel = columnVariables.length ? columnVariables.join("") : "—";
  const rowsByIndex = new Map(analysis.verificationRows.map((row) => [row.index, row]));
  const bitsFor = (value: number, width: number) => value.toString(2).padStart(width, "0");

  return (
    <section className="kmap-card" id="kmap" aria-labelledby="kmap-title">
      <div className="section-heading">
        <div><div className="eyebrow">Karnaugh map</div><h3 id="kmap-title">Visual function map</h3></div>
        <div className="table-key"><span><i className="high-dot" /> 1 high</span><span><i className="dont-care-dot" /> X don't-care</span><span><i className="low-dot" /> 0 low</span></div>
      </div>
      <div className="kmap-scroll">
        <div className="kmap-axis-labels"><span>{rowLabel} rows</span><span>{columnLabel} columns</span></div>
        <div className="kmap-grid" style={{ gridTemplateColumns: `70px repeat(${columnCodes.length}, minmax(52px, 1fr))` }}>
          <div className="kmap-corner">{rowLabel} / {columnLabel}</div>
          {columnCodes.map((code) => <div className="kmap-header" key={`column-${code}`}>{bitsFor(code, columnBits)}</div>)}
          {rowCodes.flatMap((rowCode) => {
            const rowBitsText = bitsFor(rowCode, rowBits);
            return [
              <div className="kmap-header" key={`row-${rowCode}`}>{rowBitsText}</div>,
              ...columnCodes.map((columnCode) => {
                const index = (rowCode << columnBits) | columnCode;
                const row = rowsByIndex.get(index)!;
                const state = row.dontCare ? "X" : row.original ? "1" : "0";
                return <div className={`kmap-cell ${row.dontCare ? "is-dont-care" : row.original ? "is-high" : "is-low"}`} key={`cell-${index}`} title={`M${index}: ${row.dontCare ? "don't-care" : row.original ? "1" : "0"}`}>{state}</div>;
              }),
            ];
          })}
        </div>
      </div>
      <p className="kmap-note">Gray-code ordering keeps adjacent cells next to each other so X terms can help form larger simplification groups.</p>
    </section>
  );
}

export default function Home({ embedded = false }: { embedded?: boolean }) {
  const [mode, setMode] = useState<InputMode>("expression");
  const initialExpression = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("expression") || DEFAULT_EXPRESSION : DEFAULT_EXPRESSION;
  const [expression, setExpression] = useState(initialExpression);
  const [termKind, setTermKind] = useState<TermKind>("minterms");
  const [termInput, setTermInput] = useState("1, 2, 4, 5, 6, 7");
  const [dontCareInput, setDontCareInput] = useState("");
  const [variableCount, setVariableCount] = useState(3);
  const [truthValues, setTruthValues] = useState(DEFAULT_TRUTH);
  const [analysis, setAnalysis] = useState<AnalysisResult>(makeInitialAnalysis);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const tableVariables = createVariables(variableCount);
  const tableAssignments = useMemo(() => {
    return Array.from({ length: 2 ** variableCount }, (_, index) => {
      const assignment: Record<string, boolean> = {};
      tableVariables.forEach((name, bit) => { assignment[name] = Boolean((index >> (variableCount - bit - 1)) & 1); });
      return assignment;
    });
  }, [tableVariables, variableCount]);

  const updateVariableCount = (nextCount: number) => {
    setVariableCount(nextCount);
    setTruthValues((existing) => Array.from({ length: 2 ** nextCount }, (_, index) => existing[index] ?? false));
  };

  const handleAnalyze = () => {
    try {
      let next: AnalysisResult;
      if (mode === "expression") {
        const parsed = parseBooleanExpression(expression);
        const dontCares = parseDontCareList(dontCareInput, parsed.values.length);
        next = analyzeFromValues(parsed.variables, parsed.values, expression, dontCares);
      } else if (mode === "terms") {
        const selected = parseIndexList(termInput, 2 ** variableCount);
        const dontCares = parseDontCareList(dontCareInput, 2 ** variableCount);
        if (termKind === "maxterms" && dontCares.some((value) => selected.includes(value))) {
          throw new Error("Don't-care terms cannot overlap with the selected maxterms.");
        }
        const values = valuesFromTerms(variableCount, selected, termKind);
        const notation = termKind === "minterms" ? `Σm(${selected.join(", ")})` : `ΠM(${selected.join(", ")})`;
        const source = dontCares.length ? `${notation}, d(${dontCares.join(", ")})` : notation;
        next = analyzeFromValues(createVariables(variableCount), values, source, dontCares);
      } else {
        const dontCares = parseDontCareList(dontCareInput, 2 ** variableCount);
        next = analyzeFromValues(createVariables(variableCount), truthValues, "Truth table input", dontCares);
      }
      setError("");
      setAnalysis(next);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "The function could not be analysed.");
    }
  };

  const loadExample = () => {
    setMode("expression");
    setExpression(DEFAULT_EXPRESSION);
    setDontCareInput("");
    setError("");
    const parsed = parseBooleanExpression(DEFAULT_EXPRESSION);
    setAnalysis(analyzeFromValues(parsed.variables, parsed.values, DEFAULT_EXPRESSION));
  };

  const copySimplified = async () => {
    await navigator.clipboard?.writeText(analysis.simplifiedExpression);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className={`app-shell ${embedded ? "embedded-lab" : ""}`}>
      {!embedded && <header className="topbar">
        <a className="brand" href="#top" aria-label="Boolean Circuit Lab home">
          <svg className="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
            <rect className="brand-mark-bg" x="1" y="1" width="38" height="38" rx="10" />
            <path className="brand-mark-trace" d="M7 12h9M7 20h9M7 28h9M16 12v16M16 20h7" />
            <circle className="brand-mark-node" cx="16" cy="20" r="2.2" />
            <path className="brand-mark-gate" d="M23 14h2.5a6 6 0 0 1 0 12H23z" />
            <path className="brand-mark-trace" d="M28 20h5" />
            <circle className="brand-mark-node" cx="33" cy="20" r="1.8" />
          </svg>
          <span><b>BOOLEAN</b><em>CIRCUIT LAB</em></span>
        </a>
        <div className="topbar-actions">
          <a className="modules-link" href="/modules"><CircuitBoard size={16} /> Logic modules</a>
          <a className="help-link" href="#guide"><CircleHelp size={17} /> Input guide</a>
          <ThemeToggle />
        </div>
      </header>}

      <main id="top">
        <section className="hero-section" style={{ backgroundImage: `url(${HERO_ASSET})` }}>
          <div className="hero-content">
            <div className="eyebrow hero-eyebrow"><span /> Boolean synthesis workbench</div>
            <h1>From a rule<br />to <i>verified logic.</i></h1>
            <p>Describe a Boolean function once. Inspect the minimised expression, canonical truth table, and gate-level realizations — all checked against every input state.</p>
            <div className="hero-keyline"><GitBranch size={16} /><span>Expression → minimisation → implementation → proof</span></div>
          </div>
          <div className="hero-stamp"><span>MODE</span><strong>01</strong><small>ANALYZE</small></div>
        </section>

        <section className="workbench" aria-label="Boolean function analyser">
          <aside className="input-panel">
            <div className="panel-intro">
              <div className="eyebrow">01 / Define function</div>
              <h2>Choose your source.</h2>
              <p>All three routes lead to the same verified logic model.</p>
            </div>

            <div className="mode-tabs" role="tablist" aria-label="Input mode">
              <InputModeTab active={mode === "expression"} label="Expression" helper="A'B + AC" icon={<FunctionSquare size={17} />} onClick={() => setMode("expression")} />
              <InputModeTab active={mode === "terms"} label="Terms" helper="Σm / ΠM" icon={<Sigma size={18} />} onClick={() => setMode("terms")} />
              <InputModeTab active={mode === "truth"} label="Truth table" helper="state by state" icon={<TableProperties size={17} />} onClick={() => setMode("truth")} />
            </div>

            <div className="input-stage">
              {mode === "expression" && <>
                <label className="field-label" htmlFor="expression-input">Boolean expression</label>
                <textarea id="expression-input" value={expression} onChange={(event) => setExpression(event.target.value)} spellCheck={false} placeholder="A'B + AC" />
                <div className="syntax-help"><code>'</code> / <code>!</code> NOT <span>·</span> <code>*</code> AND <span>+</span> OR <span>Parentheses supported</span></div>
              </>}

              {mode === "terms" && <>
                <div className="field-row"><label className="field-label">Function notation</label><VariableStepper value={variableCount} onChange={updateVariableCount} /></div>
                <div className="segmented-control" aria-label="Term notation type">
                  <button type="button" className={termKind === "minterms" ? "selected" : ""} onClick={() => setTermKind("minterms")}>Σ minterms</button>
                  <button type="button" className={termKind === "maxterms" ? "selected" : ""} onClick={() => setTermKind("maxterms")}>Π maxterms</button>
                </div>
                <label className="field-label" htmlFor="term-input">{termKind === "minterms" ? "Output = 1 at indices" : "Output = 0 at indices"}</label>
                <input id="term-input" value={termInput} onChange={(event) => setTermInput(event.target.value)} spellCheck={false} placeholder="e.g. 1, 3, 5, 7" />
                <p className="field-hint">With {variableCount} variables, valid indices run from 0 to {2 ** variableCount - 1}.</p>
              </>}

              {mode === "truth" && <>
                <div className="field-row"><div><label className="field-label">Truth table states</label><p className="field-hint">Tap an output to switch it.</p></div><VariableStepper value={variableCount} onChange={updateVariableCount} /></div>
                <div className="truth-input-table">
                  <div className="truth-head" style={{ gridTemplateColumns: `repeat(${variableCount + 1}, 1fr)` }}>{tableVariables.map((variable) => <span key={variable}>{variable}</span>)}<span>F</span></div>
                  <div className="truth-scroll">
                    {tableAssignments.map((assignment, index) => <div className="truth-input-row" style={{ gridTemplateColumns: `repeat(${variableCount + 1}, 1fr)` }} key={index}>
                      {tableVariables.map((variable) => <span key={variable}>{assignment[variable] ? "1" : "0"}</span>)}
                      <button type="button" className={truthValues[index] ? "truth-output on" : "truth-output"} onClick={() => setTruthValues((current) => current.map((value, row) => row === index ? !value : value))}>{truthValues[index] ? "1" : "0"}</button>
                    </div>)}
                  </div>
                </div>
              </>}
            </div>

            <div className="dont-care-field">
              <label className="field-label" htmlFor="dont-care-input">Don't Care Variables (optional)</label>
              <input id="dont-care-input" value={dontCareInput} onChange={(event) => setDontCareInput(event.target.value)} spellCheck={false} placeholder="d(1,3,7) or 1,3,7" />
              <p className="field-hint">Example: 1, 3, 7 — These terms are treated as don't-care conditions (X) during simplification.</p>
            </div>

            {error && <div className="error-callout"><XCircle size={16} /><span>{error}</span></div>}
            <button type="button" className="analyze-button" onClick={handleAnalyze}><Play size={17} fill="currentColor" /> Analyze function <ArrowRight size={17} /></button>
            <button type="button" className="example-button" onClick={loadExample}><RotateCcw size={14} /> Load working example</button>

            <div className="input-footnote"><Activity size={15} /><span><b>Exhaustive verification</b><br />Every possible input row is tested.</span></div>
          </aside>

          <section className="results-canvas">
            <div className="canvas-heading">
              <div><div className="eyebrow">02 / Synthesise &amp; prove</div><h2>Result record</h2></div>
              <div className={`verification-pill ${analysis.isEquivalent ? "verified" : "failed"}`}>
                {analysis.isEquivalent ? <CheckCircle2 size={17} /> : <XCircle size={17} />} {analysis.isEquivalent ? "All states agree" : "Mismatch found"}
              </div>
            </div>

            <div className="summary-grid" id="transform">
              <article className="summary-card source-card"><div className="summary-label"><span>Source function</span><FileSpreadsheet size={15} /></div><code>{analysis.originalExpression}</code><p>{analysis.variables.length} inputs · {analysis.minterms.length} high states{analysis.dontCares.length ? ` · ${analysis.dontCares.length} don't-care states` : ""}</p></article>
              <article className="summary-card optimized-card"><div className="summary-label"><span>Minimized SOP</span><button type="button" aria-label="Copy simplified expression" onClick={copySimplified}>{copied ? <Check size={15} /> : <Copy size={15} />}</button></div><code>{analysis.simplifiedExpression}</code><p>Optimized with prime implicant coverage</p></article>
              <article className="summary-card pos-card"><div className="summary-label"><span>Minimized POS</span><Layers3 size={15} /></div><code>{analysis.posExpression}</code><p>Basis for the NOR-only realization</p></article>
            </div>

            <div className="signal-rule"><span>FUNCTION TRANSFORMATION</span><i /><span>INPUT → GATES → EQUIVALENCE</span></div>

            <section className="table-card" id="truth-table" aria-labelledby="truth-title">
              <div className="section-heading"><div><div className="eyebrow">Truth table</div><h3 id="truth-title">Canonical behavior</h3></div><div className="table-key"><span><i className="high-dot" /> 1 high</span><span><i className="dont-care-dot" /> X don't-care</span><span><i className="low-dot" /> 0 low</span></div></div>
              <div className="result-table-wrap"><table className="result-table"><thead><tr><th>#</th>{analysis.variables.map((variable) => <th key={variable}>{variable}</th>)}<th>F</th></tr></thead><tbody>{analysis.verificationRows.map((row) => <tr key={row.index}><td>{row.index}</td>{analysis.variables.map((variable) => <td key={variable}>{row.assignment[variable] ? "1" : "0"}</td>)}<td><BooleanChip value={row.original} dontCare={row.dontCare} compact /></td></tr>)}</tbody></table></div>
            </section>

            <KMap analysis={analysis} />

            <section className="implementation-section" id="gates">
              <div className="section-heading"><div><div className="eyebrow">Gate synthesis</div><h3>Three equivalent implementations</h3></div><p>Each diagram is an executable signal graph.</p></div>
              <div className="circuit-stack">
                <CircuitCard graph={analysis.circuits.standard} accent="graphite" />
                <CircuitCard graph={analysis.circuits.nand} accent="teal" />
                <CircuitCard graph={analysis.circuits.nor} accent="copper" />
              </div>
            </section>

            <section className="verification-card" id="verify">
              <div className="verification-title"><div className="verification-icon"><CheckCircle2 size={22} /></div><div><div className="eyebrow">03 / Verify</div><h3>Equivalence record</h3><p>The source model and all generated forms were evaluated across all {analysis.verificationRows.length} input combinations.</p></div></div>
              <div className="verification-grid">
                <div><span>Original</span><b>{analysis.verificationRows.filter((row) => row.original).length} high rows{analysis.dontCares.length ? ` · ${analysis.dontCares.length} X states` : ""}</b></div>
                <div><span>Simplified SOP</span><b>{analysis.simplifiedExpression}</b></div>
                <div><span>NAND-only</span><b>matches all rows</b></div>
                <div><span>NOR-only</span><b>matches all rows</b></div>
              </div>
              <details className="proof-details"><summary>Inspect row-by-row proof <ChevronRight size={16} /></summary><div className="proof-table-wrap"><table className="proof-table"><thead><tr><th>#</th>{analysis.variables.map((variable) => <th key={variable}>{variable}</th>)}<th>Input</th><th>SOP</th><th>NAND</th><th>NOR</th><th>Check</th></tr></thead><tbody>{analysis.verificationRows.map((row) => <tr key={row.index}><td>{row.index}</td>{analysis.variables.map((variable) => <td key={variable}>{row.assignment[variable] ? "1" : "0"}</td>)}<td><BooleanChip value={row.original} dontCare={row.dontCare} compact /></td><td><BooleanChip value={row.simplified} compact /></td><td><BooleanChip value={row.nand} compact /></td><td><BooleanChip value={row.nor} compact /></td><td><span className={row.matches ? "proof-pass" : "proof-fail"}>{row.matches ? "PASS" : "FAIL"}</span></td></tr>)}</tbody></table></div></details>
            </section>
          </section>
        </section>

        <section id="guide" className="guide-section" style={{ backgroundImage: `url(${DETAIL_ASSET})` }}>
          <div><div className="eyebrow">Input reference</div><h2>Notation that reads naturally.</h2></div>
          <div className="guide-grid"><p><b>Negation</b> <code>A'</code>, <code>!A</code>, or <code>~A</code></p><p><b>AND</b> <code>AB</code>, <code>A·B</code>, or <code>A*B</code></p><p><b>OR</b> <code>A+B</code> or <code>A|B</code></p><p><b>Grouping</b> <code>(A+B)C</code></p></div>
        </section>
      </main>

      <footer><span>BOOLEAN CIRCUIT LAB</span><i /> <span>CLIENT-SIDE · NO FUNCTION DATA IS STORED</span><i /> <span>UP TO 6 INPUT VARIABLES</span></footer>
    </div>
  );
}
