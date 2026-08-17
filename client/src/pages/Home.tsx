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
  parseIndexList,
  valuesFromTerms,
} from "@/lib/booleanLogic";

type InputMode = "expression" | "terms" | "truth";
type TermKind = "minterms" | "maxterms";

const HERO_ASSET = "/manus-storage/circuit-atlas-hero_7678a108.jpg";
const DETAIL_ASSET = "/manus-storage/circuit-atlas-diagram-detail_647595c6.jpg";
const LOGO_ASSET = "/manus-storage/circuit-atlas-logo_fb4a06f0.png";

const DEFAULT_EXPRESSION = "A'B + AB' + AC";
const DEFAULT_TRUTH = [false, true, true, false, true, true, true, true];

function makeInitialAnalysis() {
  const parsed = parseBooleanExpression(DEFAULT_EXPRESSION);
  return analyzeFromValues(parsed.variables, parsed.values, DEFAULT_EXPRESSION);
}

function BooleanChip({ value, compact = false }: { value: boolean; compact?: boolean }) {
  return <span className={`boolean-chip ${value ? "is-high" : "is-low"} ${compact ? "compact" : ""}`}>{value ? "1" : "0"}</span>;
}

function GatePill({ gate }: { gate: string }) {
  return <span className={`gate-pill gate-${gate.toLowerCase()}`}>{gate}</span>;
}

function nodeDimensions(gate: CircuitNode["gate"]) {
  if (gate === "INPUT") return { width: 52, height: 30 };
  if (gate === "OUTPUT") return { width: 46, height: 34 };
  if (gate === "CONST") return { width: 52, height: 36 };
  return { width: 82, height: 42 };
}

function CircuitDiagram({ graph }: { graph: CircuitGraph }) {
  const layout = useMemo(() => {
    const grouped = new Map<number, CircuitNode[]>();
    graph.nodes.forEach((current) => {
      grouped.set(current.column, [...(grouped.get(current.column) ?? []), current]);
    });
    const maxColumn = Math.max(...graph.nodes.map((item) => item.column));
    const maxRows = Math.max(...Array.from(grouped.values()).map((items) => items.length));
    const width = Math.max(760, 130 + maxColumn * 170 + 120);
    const height = Math.max(310, 74 + maxRows * 70);
    const position = new Map<string, { x: number; y: number }>();
    grouped.forEach((items, column) => {
      const spacing = Math.max(64, (height - 86) / Math.max(items.length, 1));
      items.forEach((current, index) => {
        position.set(current.id, { x: 40 + column * 170, y: 42 + index * spacing });
      });
    });
    return { width, height, position };
  }, [graph]);

  return (
    <div className="diagram-frame" aria-label={`${graph.title} graphical circuit diagram`}>
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" preserveAspectRatio="xMinYMin meet">
        <defs>
          <pattern id="draft-grid" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M 12 0 L 0 0 0 12" fill="none" stroke="rgba(25, 48, 50, 0.08)" strokeWidth="0.65" />
          </pattern>
          <marker id="signal-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#007C74" />
          </marker>
        </defs>
        <rect x="0" y="0" width={layout.width} height={layout.height} fill="url(#draft-grid)" />
        {graph.nodes.flatMap((target) => Array.from(new Set(target.inputs)).map((sourceId) => ({ target, sourceId }))).map(({ target, sourceId }) => {
          const source = graph.nodes.find((item) => item.id === sourceId);
          const sourcePosition = layout.position.get(sourceId);
          const targetPosition = layout.position.get(target.id);
          if (!source || !sourcePosition || !targetPosition) return null;
          const sourceSize = nodeDimensions(source.gate);
          const targetSize = nodeDimensions(target.gate);
          const startX = sourcePosition.x + sourceSize.width;
          const startY = sourcePosition.y + sourceSize.height / 2;
          const endX = targetPosition.x;
          const endY = targetPosition.y + targetSize.height / 2;
          const midpoint = startX + (endX - startX) * 0.48;
          return <path key={`${sourceId}-${target.id}`} className="diagram-wire" d={`M ${startX} ${startY} H ${midpoint} V ${endY} H ${endX - 5}`} markerEnd="url(#signal-arrow)" />;
        })}
        {graph.nodes.map((current) => {
          const point = layout.position.get(current.id)!;
          const size = nodeDimensions(current.gate);
          const isLogicGate = !["INPUT", "OUTPUT", "CONST"].includes(current.gate);
          return (
            <g key={current.id} transform={`translate(${point.x}, ${point.y})`}>
              {current.gate === "INPUT" && <circle className="signal-dot" cx="0" cy={size.height / 2} r="4.5" />}
              <rect className={`circuit-node gate-shape-${current.gate.toLowerCase()}`} width={size.width} height={size.height} rx={current.gate === "INPUT" ? 15 : 5} />
              {isLogicGate && <path className="gate-arc" d={`M 6 7 Q 21 ${size.height / 2} 6 ${size.height - 7}`} />}
              <text className={`circuit-node-label label-${current.gate.toLowerCase()}`} x={size.width / 2} y={size.height / 2 + 4} textAnchor="middle">{current.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function CircuitCard({ graph, accent }: { graph: CircuitGraph; accent: string }) {
  const gateCount = graph.nodes.filter((node) => !["INPUT", "OUTPUT", "CONST"].includes(node.gate)).length;
  return (
    <article className={`circuit-card accent-${accent}`}>
      <div className="circuit-card-header">
        <div>
          <div className="eyebrow">Circuit implementation</div>
          <h3>{graph.title}</h3>
        </div>
        <div className="gate-summary"><CircuitBoard size={16} /><span>{gateCount} gates</span></div>
      </div>
      <p>{graph.caption}</p>
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

export default function Home() {
  const [mode, setMode] = useState<InputMode>("expression");
  const [expression, setExpression] = useState(DEFAULT_EXPRESSION);
  const [termKind, setTermKind] = useState<TermKind>("minterms");
  const [termInput, setTermInput] = useState("1, 2, 4, 5, 6, 7");
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
        next = analyzeFromValues(parsed.variables, parsed.values, expression);
      } else if (mode === "terms") {
        const selected = parseIndexList(termInput, 2 ** variableCount);
        const values = valuesFromTerms(variableCount, selected, termKind);
        const notation = termKind === "minterms" ? `Σm(${selected.join(", ")})` : `ΠM(${selected.join(", ")})`;
        next = analyzeFromValues(createVariables(variableCount), values, notation);
      } else {
        next = analyzeFromValues(createVariables(variableCount), truthValues, "Truth table input");
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
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Boolean Circuit Lab home">
          <img src={LOGO_ASSET} alt="" />
          <span><b>BOOLEAN</b><em>CIRCUIT LAB</em></span>
        </a>
        <div className="topbar-center"><span className="live-indicator" /> Interactive logic workbench</div>
        <a className="help-link" href="#guide"><CircleHelp size={17} /> Input guide</a>
      </header>

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

            <div className="summary-grid">
              <article className="summary-card source-card"><div className="summary-label"><span>Source function</span><FileSpreadsheet size={15} /></div><code>{analysis.originalExpression}</code><p>{analysis.variables.length} inputs · {analysis.minterms.length} high states</p></article>
              <article className="summary-card optimized-card"><div className="summary-label"><span>Minimized SOP</span><button type="button" aria-label="Copy simplified expression" onClick={copySimplified}>{copied ? <Check size={15} /> : <Copy size={15} />}</button></div><code>{analysis.simplifiedExpression}</code><p>Optimized with prime implicant coverage</p></article>
              <article className="summary-card pos-card"><div className="summary-label"><span>Minimized POS</span><Layers3 size={15} /></div><code>{analysis.posExpression}</code><p>Basis for the NOR-only realization</p></article>
            </div>

            <div className="signal-rule"><span>FUNCTION TRANSFORMATION</span><i /><span>INPUT → GATES → EQUIVALENCE</span></div>

            <section className="table-card" aria-labelledby="truth-title">
              <div className="section-heading"><div><div className="eyebrow">Truth table</div><h3 id="truth-title">Canonical behavior</h3></div><div className="table-key"><span><i className="high-dot" /> high</span><span><i className="low-dot" /> low</span></div></div>
              <div className="result-table-wrap"><table className="result-table"><thead><tr><th>#</th>{analysis.variables.map((variable) => <th key={variable}>{variable}</th>)}<th>F</th></tr></thead><tbody>{analysis.verificationRows.map((row) => <tr key={row.index}><td>{row.index}</td>{analysis.variables.map((variable) => <td key={variable}>{row.assignment[variable] ? "1" : "0"}</td>)}<td><BooleanChip value={row.original} compact /></td></tr>)}</tbody></table></div>
            </section>

            <section className="implementation-section">
              <div className="section-heading"><div><div className="eyebrow">Gate synthesis</div><h3>Three equivalent implementations</h3></div><p>Each diagram is an executable signal graph.</p></div>
              <div className="circuit-stack">
                <CircuitCard graph={analysis.circuits.standard} accent="graphite" />
                <CircuitCard graph={analysis.circuits.nand} accent="teal" />
                <CircuitCard graph={analysis.circuits.nor} accent="copper" />
              </div>
            </section>

            <section className="verification-card">
              <div className="verification-title"><div className="verification-icon"><CheckCircle2 size={22} /></div><div><div className="eyebrow">03 / Verify</div><h3>Equivalence record</h3><p>The source model and all generated forms were evaluated across all {analysis.verificationRows.length} input combinations.</p></div></div>
              <div className="verification-grid">
                <div><span>Original</span><b>{analysis.verificationRows.filter((row) => row.original).length} high rows</b></div>
                <div><span>Simplified SOP</span><b>{analysis.simplifiedExpression}</b></div>
                <div><span>NAND-only</span><b>matches all rows</b></div>
                <div><span>NOR-only</span><b>matches all rows</b></div>
              </div>
              <details className="proof-details"><summary>Inspect row-by-row proof <ChevronRight size={16} /></summary><div className="proof-table-wrap"><table className="proof-table"><thead><tr><th>#</th>{analysis.variables.map((variable) => <th key={variable}>{variable}</th>)}<th>Input</th><th>SOP</th><th>NAND</th><th>NOR</th><th>Check</th></tr></thead><tbody>{analysis.verificationRows.map((row) => <tr key={row.index}><td>{row.index}</td>{analysis.variables.map((variable) => <td key={variable}>{row.assignment[variable] ? "1" : "0"}</td>)}<td><BooleanChip value={row.original} compact /></td><td><BooleanChip value={row.simplified} compact /></td><td><BooleanChip value={row.nand} compact /></td><td><BooleanChip value={row.nor} compact /></td><td><span className={row.matches ? "proof-pass" : "proof-fail"}>{row.matches ? "PASS" : "FAIL"}</span></td></tr>)}</tbody></table></div></details>
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
