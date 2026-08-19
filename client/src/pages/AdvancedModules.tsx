import { useState } from "react";
import type { ReactNode } from "react";
import { Calculator, CircuitBoard, GitBranch, Plus, RefreshCw } from "lucide-react";
import {
  Bit,
  bitString,
  decimalFromBits,
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
} from "@/lib/advancedCircuits";

const bitValue = (value: Bit) => (value ? "1" : "0");

type GateKind = "AND" | "OR" | "XOR" | "NOT" | "HA";

type TruthRow = { inputs: Bit[]; outputs: Bit[] };

function BitToggle({ label, value, onChange }: { label: string; value: Bit; onChange: (value: Bit) => void }) {
  return (
    <button type="button" className={`bit-toggle ${value ? "on" : ""}`} aria-pressed={value === 1} onClick={() => onChange(value ? 0 : 1)}>
      <span>{label}</span>
      <strong>{bitValue(value)}</strong>
    </button>
  );
}

function Lamp({ label, value }: { label: string; value: Bit }) {
  return <div className={`output-lamp ${value ? "on" : ""}`}><span>{label}</span><strong>{bitValue(value)}</strong></div>;
}

function TruthTable({ headers, rows, activeInputs }: { headers: string[]; rows: TruthRow[]; activeInputs?: Bit[] }) {
  return (
    <div className="module-table-wrap">
      <table className="module-table">
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, index) => {
            const isCurrent = Boolean(activeInputs && row.inputs.every((value, inputIndex) => value === activeInputs[inputIndex]));
            return <tr className={isCurrent ? "is-current" : ""} key={index}>
              {row.inputs.map((value, inputIndex) => <td key={`i-${inputIndex}`}>{bitValue(value)}</td>)}
              {row.outputs.map((value, outputIndex) => <td className="module-output-cell" key={`o-${outputIndex}`}>{bitValue(value)}</td>)}
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}

function ScaleControl({ scale, onChange }: { scale: number; onChange: (value: number) => void }) {
  const update = (value: number) => onChange(Math.min(2, Math.max(0.5, Math.round(value * 4) / 4)));
  return (
    <div className="circuit-scale-control" aria-label="Circuit scale control">
      <span>CIRCUIT SCALE</span>
      <button type="button" onClick={() => update(scale - 0.25)} aria-label="Decrease circuit scale">−</button>
      <input aria-label="Circuit scale" type="range" min="0.5" max="2" step="0.25" value={scale} onChange={(event) => update(Number(event.target.value))} />
      <button type="button" onClick={() => update(scale + 0.25)} aria-label="Increase circuit scale">+</button>
      <output>{Math.round(scale * 100)}%</output>
    </div>
  );
}

function gatePath(gate: GateKind, width = 82, height = 40) {
  if (gate === "AND" || gate === "HA") return `M 0 7 H ${width - 40} A 24 20 0 0 1 ${width - 40} ${height - 7} H 0 Z`;
  if (gate === "NOT") return `M 0 7 L ${width - 16} ${height / 2} L 0 ${height - 7} Z`;
  return `M 0 7 Q 25 ${height / 2} 0 ${height - 7} Q ${width - 33} ${height - 4} ${width - 4} ${height / 2} Q ${width - 33} 4 0 7 Z`;
}

function Gate({ x, y, label, kind = "logic", active = 0 }: { x: number; y: number; label: GateKind; kind?: "logic" | "adder"; active?: Bit }) {
  const isXor = label === "XOR";
  const isNot = label === "NOT";
  const isAdder = label === "HA" || kind === "adder";
  return (
    <g className={`module-gate gate-${label.toLowerCase()} ${isAdder ? "adder" : kind} ${active ? "is-active" : ""}`} transform={`translate(${x}, ${y})`}>
      {isXor && <path className="module-gate-xor-line" d="M -8 7 Q 17 20 -8 33" />}
      <path className="module-gate-body" d={gatePath(label)} />
      {isNot && <circle className="module-gate-bubble" cx="74" cy="20" r="5" />}
      <text x="41" y="24" textAnchor="middle">{label}</text>
      <circle className="module-gate-input-pin" cx="0" cy="12" r="2" />
      <circle className="module-gate-input-pin" cx="0" cy="28" r="2" />
      <circle className="module-gate-output-pin" cx="82" cy="20" r="2" />
    </g>
  );
}

function Wire({ d, source = "derived", value }: { d: string; source?: "a" | "b" | "c" | "derived"; value?: Bit }) {
  return <path className={`module-wire wire-${source} ${value ? "is-high" : "is-low"}`} d={d} />;
}

function CircuitFrame({ title, scale, onScaleChange, children }: { title: string; scale: number; onScaleChange: (value: number) => void; children: ReactNode }) {
  return (
    <div className="module-circuit">
      <div className="module-circuit-head">
        <span><CircuitBoard size={15} /> {title}</span>
        <div className="module-circuit-status"><small>LIVE SIGNAL GRAPH</small><ScaleControl scale={scale} onChange={onScaleChange} /></div>
      </div>
      <div className="module-circuit-canvas">
        <svg viewBox="0 0 760 230" style={{ width: `${760 * scale}px`, height: `${230 * scale}px` }} role="img" aria-label={`${title} logic gate diagram`}>
          <defs><pattern id={`module-grid-${title.replace(/[^a-z0-9]/gi, "-")}`} width="12" height="12" patternUnits="userSpaceOnUse"><path d="M 12 0 L 0 0 0 12" fill="none" stroke="rgba(25, 48, 50, 0.08)" strokeWidth="0.65" /></pattern></defs>
          <rect x="0" y="0" width="760" height="230" fill={`url(#module-grid-${title.replace(/[^a-z0-9]/gi, "-")})`} />
          {children}
        </svg>
      </div>
    </div>
  );
}

function ModuleHeading({ eyebrow, title, description, meta }: { eyebrow: string; title: string; description: string; meta: string }) {
  return (
    <header className="module-card-heading">
      <div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2><p>{description}</p></div>
      <div className="module-card-meta"><GitBranch size={19} /><span>{meta}</span></div>
    </header>
  );
}

function HalfAdderCard() {
  const [[a, setA], [b, setB]] = [useState<Bit>(1), useState<Bit>(0)];
  const [scale, setScale] = useState(1);
  const result = halfAdder(a, b);
  return <article className="module-card">
    <ModuleHeading eyebrow="01 / ADDER" title="Half Adder" description="Adds two single-bit inputs with parallel XOR and AND paths." meta="2 INPUTS · 2 OUTPUTS" />
    <div className="formula-strip"><code>S = A ⊕ B</code><code>C = A · B</code></div>
    <div className="module-content-grid">
      <div><TruthTable headers={["A", "B", "S", "C"]} rows={halfAdderTruthTable} activeInputs={[a, b]} /><div className="simulator-controls"><span className="module-label">TOGGLE INPUT SWITCHES</span><div><BitToggle label="A" value={a} onChange={setA} /><BitToggle label="B" value={b} onChange={setB} /></div><div className="output-row"><Lamp label="S" value={result.sum} /><Lamp label="C" value={result.carry} /></div></div></div>
      <CircuitFrame title="XOR + AND" scale={scale} onScaleChange={setScale}>
        <text className="module-terminal-label" x="28" y="68">A</text><text className="module-terminal-label" x="28" y="138">B</text>
        <Wire source="a" value={a} d="M52 65 H140 V70 H210" /><Wire source="b" value={b} d="M52 135 H120 V78 H210" />
        <Wire source="a" value={a} d="M52 65 H108 V170 H210" /><Wire source="b" value={b} d="M52 135 H92 V178 H210" />
        <circle className="module-junction wire-a" cx="108" cy="65" r="4" /><circle className="module-junction wire-b" cx="92" cy="135" r="4" />
        <Gate x={210} y={50} label="XOR" kind="adder" active={result.sum} /><Gate x={210} y={150} label="AND" active={result.carry} />
        <Wire value={result.sum} d="M292 70 H420" /><Wire value={result.carry} d="M292 170 H420" />
        <text className="module-output-label" x="440" y="75">S = {result.sum}</text><text className="module-output-label" x="440" y="175">C = {result.carry}</text>
      </CircuitFrame>
    </div>
  </article>;
}

function FullAdderCard() {
  const [[a, setA], [b, setB], [cin, setCin]] = [useState<Bit>(1), useState<Bit>(0), useState<Bit>(1)];
  const [scale, setScale] = useState(1);
  const first = halfAdder(a, b);
  const second = halfAdder(first.sum, cin);
  const result = fullAdder(a, b, cin);
  return <article className="module-card">
    <ModuleHeading eyebrow="02 / ADDER" title="Full Adder" description="Adds A, B, and carry-in through two half-adder stages and an OR carry merge." meta="3 INPUTS · 2 OUTPUTS" />
    <div className="formula-strip"><code>S = A ⊕ B ⊕ Cᵢₙ</code><code>Cₒᵤₜ = AB + Cᵢₙ(A ⊕ B)</code></div>
    <div className="module-content-grid">
      <div><TruthTable headers={["A", "B", "Cᵢₙ", "S", "Cₒᵤₜ"]} rows={fullAdderTruthTable} activeInputs={[a, b, cin]} /><div className="simulator-controls"><span className="module-label">TOGGLE INPUT SWITCHES</span><div><BitToggle label="A" value={a} onChange={setA} /><BitToggle label="B" value={b} onChange={setB} /><BitToggle label="Cᵢₙ" value={cin} onChange={setCin} /></div><div className="output-row"><Lamp label="S" value={result.sum} /><Lamp label="Cₒᵤₜ" value={result.carry} /></div></div></div>
      <CircuitFrame title="HA 1 → HA 2 → OR" scale={scale} onScaleChange={setScale}>
        <text className="module-terminal-label" x="24" y="40">A</text><text className="module-terminal-label" x="24" y="72">B</text><text className="module-terminal-label" x="24" y="175">Cᵢₙ</text>
        <Wire source="a" value={a} d="M50 37 H100 V57 H155" /><Wire source="b" value={b} d="M50 69 H115 V73 H155" /><Wire source="a" value={a} d="M50 37 H88 V147 H155" /><Wire source="b" value={b} d="M50 69 H78 V163 H155" />
        <Gate x={155} y={45} label="XOR" kind="adder" active={first.sum} /><Gate x={155} y={135} label="AND" active={first.carry} />
        <Wire value={first.sum} d="M237 65 H300 V107 H345" /><Wire value={first.carry} d="M237 155 H300 V187 H490" /><Wire source="c" value={cin} d="M50 172 H275 V123 H345" />
        <Gate x={345} y={95} label="XOR" kind="adder" active={second.sum} /><Gate x={345} y={175} label="AND" active={second.carry} />
        <Wire value={second.sum} d="M427 115 H555" /><Wire value={second.carry} d="M427 195 H510 V145 H555" /><Gate x={555} y={125} label="OR" kind="adder" active={result.carry} />
        <Wire value={result.carry} d="M637 145 H700" /><text className="module-output-label" x="650" y="112">S = {result.sum}</text><text className="module-output-label" x="650" y="178">Cₒᵤₜ = {result.carry}</text>
      </CircuitFrame>
    </div>
  </article>;
}

function HalfSubtractorCard() {
  const [[a, setA], [b, setB]] = [useState<Bit>(1), useState<Bit>(1)];
  const [scale, setScale] = useState(1);
  const result = halfSubtractor(a, b);
  const notA = (a ? 0 : 1) as Bit;
  return <article className="module-card">
    <ModuleHeading eyebrow="03 / SUBTRACTOR" title="Half Subtractor" description="Subtracts B from A with an XOR difference path and A̅B borrow detection." meta="2 INPUTS · 2 OUTPUTS" />
    <div className="formula-strip"><code>D = A ⊕ B</code><code>Bᵣ = A̅ · B</code></div>
    <div className="module-content-grid">
      <div><TruthTable headers={["A", "B", "D", "Bᵣ"]} rows={halfSubtractorTruthTable} activeInputs={[a, b]} /><div className="simulator-controls"><span className="module-label">TOGGLE INPUT SWITCHES</span><div><BitToggle label="A" value={a} onChange={setA} /><BitToggle label="B" value={b} onChange={setB} /></div><div className="output-row"><Lamp label="D" value={result.difference} /><Lamp label="Bᵣ" value={result.borrow} /></div></div></div>
      <CircuitFrame title="XOR + NOT + AND" scale={scale} onScaleChange={setScale}>
        <text className="module-terminal-label" x="28" y="68">A</text><text className="module-terminal-label" x="28" y="138">B</text>
        <Wire source="a" value={a} d="M52 65 H120 V70 H210" /><Wire source="b" value={b} d="M52 135 H150 V78 H210" /><Wire source="a" value={a} d="M52 65 H90 V170 H210" />
        <Gate x={210} y={50} label="XOR" kind="adder" active={result.difference} /><Gate x={210} y={150} label="NOT" active={notA} />
        <Wire value={notA} d="M292 170 H330 V190 H380" /><Wire source="b" value={b} d="M52 135 H150 V218 H380" /><Gate x={380} y={170} label="AND" active={result.borrow} />
        <Wire value={result.difference} d="M292 70 H450" /><Wire value={result.borrow} d="M462 190 H520" />
        <text className="module-output-label" x="475" y="75">D = {result.difference}</text><text className="module-output-label" x="545" y="195">Bᵣ = {result.borrow}</text>
      </CircuitFrame>
    </div>
  </article>;
}

function FullSubtractorCard() {
  const [[a, setA], [b, setB], [bin, setBin]] = [useState<Bit>(1), useState<Bit>(0), useState<Bit>(1)];
  const [scale, setScale] = useState(1);
  const first = halfSubtractor(a, b);
  const second = halfSubtractor(first.difference, bin);
  const result = fullSubtractor(a, b, bin);
  const notA = (a ? 0 : 1) as Bit;
  const notFirstDifference = (first.difference ? 0 : 1) as Bit;
  return <article className="module-card">
    <ModuleHeading eyebrow="04 / SUBTRACTOR" title="Full Subtractor" description="Subtracts B and borrow-in from A with two half-subtractor stages and an OR merge." meta="3 INPUTS · 2 OUTPUTS" />
    <div className="formula-strip"><code>D = A ⊕ B ⊕ Bᵢₙ</code><code>Bₒᵤₜ = A̅B + Bᵢₙ(A ⊕ B)̅</code></div>
    <div className="module-content-grid">
      <div><TruthTable headers={["A", "B", "Bᵢₙ", "D", "Bₒᵤₜ"]} rows={fullSubtractorTruthTable} activeInputs={[a, b, bin]} /><div className="simulator-controls"><span className="module-label">TOGGLE INPUT SWITCHES</span><div><BitToggle label="A" value={a} onChange={setA} /><BitToggle label="B" value={b} onChange={setB} /><BitToggle label="Bᵢₙ" value={bin} onChange={setBin} /></div><div className="output-row"><Lamp label="D" value={result.difference} /><Lamp label="Bₒᵤₜ" value={result.borrow} /></div></div></div>
      <CircuitFrame title="HS 1 → HS 2 → OR" scale={scale} onScaleChange={setScale}>
        <text className="module-terminal-label" x="24" y="40">A</text><text className="module-terminal-label" x="24" y="72">B</text><text className="module-terminal-label" x="24" y="175">Bᵢₙ</text>
        <Wire source="a" value={a} d="M50 37 H100 V57 H155" /><Wire source="b" value={b} d="M50 69 H115 V73 H155" /><Wire source="a" value={a} d="M50 37 H88 V147 H155" /><Wire source="b" value={b} d="M50 69 H78 V163 H155" />
        <Gate x={155} y={45} label="XOR" kind="adder" active={first.difference} /><Gate x={155} y={135} label="NOT" active={notA} /><Gate x={155} y={178} label="AND" active={first.borrow} />
        <Wire value={first.difference} d="M237 65 H300 V107 H345" /><Wire value={notA} d="M237 155 H300 V187 H490" /><Wire value={first.borrow} d="M237 198 H490 V187 H490" /><Wire source="c" value={bin} d="M50 172 H275 V123 H345" />
        <Gate x={345} y={95} label="XOR" kind="adder" active={second.difference} /><Gate x={345} y={175} label="NOT" active={notFirstDifference} /><Gate x={490} y={178} label="AND" active={second.borrow} />
        <Wire value={second.difference} d="M427 115 H555" /><Wire value={notFirstDifference} d="M427 195 H460 V218 H490" /><Wire source="c" value={bin} d="M50 172 H275 V218 H490" /><Wire value={first.borrow} d="M237 198 H470 V145 H555" /><Wire value={second.borrow} d="M572 198 H600 V145 H555" />
        <Gate x={555} y={125} label="OR" kind="adder" active={result.borrow} /><Wire value={result.borrow} d="M637 145 H700" />
        <text className="module-output-label" x="650" y="112">D = {result.difference}</text><text className="module-output-label" x="650" y="178">Bₒᵤₜ = {result.borrow}</text>
      </CircuitFrame>
    </div>
  </article>;
}

function MultiplierCard() {
  const [[a1, setA1], [a0, setA0], [b1, setB1], [b0, setB0]] = [useState<Bit>(1), useState<Bit>(0), useState<Bit>(1), useState<Bit>(1)];
  const [scale, setScale] = useState(1);
  const result = multiplyTwoBitNumbers(a1, a0, b1, b0);
  const [p0, p1, p2, p3] = result.partialProducts;
  return <article className="module-card multiplier-card">
    <ModuleHeading eyebrow="05 / ARITHMETIC" title="2-bit × 2-bit Multiplier" description="Generates four partial products with AND gates, then combines them with two half-adder stages." meta="4 INPUTS · 4 OUTPUTS" />
    <div className="formula-strip"><code>P₀ = A₀B₀</code><code>P = A × B = P₃P₂P₁P₀</code></div>
    <div className="module-content-grid">
      <div><TruthTable headers={["A₁", "A₀", "B₁", "B₀", "P₃", "P₂", "P₁", "P₀"]} rows={multiplierTruthTable} activeInputs={[a1, a0, b1, b0]} /><div className="simulator-controls"><span className="module-label">TOGGLE INPUT SWITCHES</span><div><BitToggle label="A₁" value={a1} onChange={setA1} /><BitToggle label="A₀" value={a0} onChange={setA0} /><BitToggle label="B₁" value={b1} onChange={setB1} /><BitToggle label="B₀" value={b0} onChange={setB0} /></div><div className="output-row"><Lamp label="P₃" value={result.product[0]} /><Lamp label="P₂" value={result.product[1]} /><Lamp label="P₁" value={result.product[2]} /><Lamp label="P₀" value={result.product[3]} /><code className="product-readout">{bitString(result.product)}₂ = {decimalFromBits(result.product)}₁₀</code></div></div></div>
      <CircuitFrame title="AND ARRAY → HALF ADDERS" scale={scale} onScaleChange={setScale}>
        <text className="module-terminal-label" x="20" y="30">A₀</text><text className="module-terminal-label" x="20" y="62">A₁</text><text className="module-terminal-label" x="20" y="140">B₀</text><text className="module-terminal-label" x="20" y="172">B₁</text>
        <Wire source="a" value={a0} d="M48 27 H80 V27 H145" /><Wire source="a" value={a1} d="M48 59 H95 V67 H145" /><Wire source="b" value={b0} d="M48 137 H105 V43 H145" /><Wire source="b" value={b1} d="M48 169 H120 V83 H145" />
        <Wire source="a" value={a0} d="M48 27 H70 V107 H145" /><Wire source="a" value={a1} d="M48 59 H60 V147 H145" /><Wire source="b" value={b1} d="M48 169 H130 V123 H145" /><Wire source="b" value={b0} d="M48 137 H115 V163 H145" />
        <Gate x={145} y={7} label="AND" active={p0} /><Gate x={145} y={47} label="AND" active={p1} /><Gate x={145} y={87} label="AND" active={p2} /><Gate x={145} y={127} label="AND" active={p3} />
        <Wire value={p0} d="M227 27 H620" /><Wire value={p1} d="M227 67 H285 V92 H320" /><Wire value={p2} d="M227 107 H285 V108 H320" /><Gate x={320} y={80} label="HA" kind="adder" active={result.sums[0]} />
        <Wire value={result.sums[0]} d="M402 100 H455 V145 H490" /><Wire value={p3} d="M227 147 H455 V165 H490" /><Gate x={490} y={145} label="HA" kind="adder" active={result.sums[1]} />
        <Wire value={result.product[3]} d="M620 27 H675" /><Wire value={result.product[2]} d="M402 100 H650 V67 H675" /><Wire value={result.product[1]} d="M572 165 H650 V107 H675" /><Wire value={result.product[0]} d="M572 165 H635 V147 H675" />
        <text className="module-output-label" x="685" y="31">P₀ = {result.product[3]}</text><text className="module-output-label" x="685" y="71">P₁ = {result.product[2]}</text><text className="module-output-label" x="685" y="111">P₂ = {result.product[1]}</text><text className="module-output-label" x="685" y="151">P₃ = {result.product[0]}</text>
      </CircuitFrame>
    </div>
  </article>;
}

export default function AdvancedModules() {
  const [filter, setFilter] = useState<"all" | "adders" | "subtractors" | "multiplier">("all");
  return <div className="modules-page">
    <main className="modules-main">
      <div className="modules-hero"><div className="eyebrow"><Plus size={14} /> CIRCUIT MODULES / INTERACTIVE LAB</div><h1>Arithmetic circuits,<br /><i>explained by signals.</i></h1><p>Toggle real input switches, read the highlighted truth-table row, scale the gate-level canvas, and follow every signal from input to output.</p></div>
      <nav className="module-filter-bar" aria-label="Filter arithmetic modules">{([['all', 'All'], ['adders', 'Adders'], ['subtractors', 'Subtractors'], ['multiplier', 'Multiplier']] as const).map(([value, label]) => <button type="button" key={value} className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{label}</button>)}</nav>
      {filter === "all" || filter === "adders" ? <section id="adders" className="module-section"><div className="module-section-heading"><div><div className="eyebrow">01 / ADDERS</div><h2>Build the sum.</h2></div><span>SUM · CARRY · CARRY-IN</span></div><HalfAdderCard /><FullAdderCard /></section> : null}
      {filter === "all" || filter === "subtractors" ? <section id="subtractors" className="module-section"><div className="module-section-heading"><div><div className="eyebrow">02 / SUBTRACTORS</div><h2>Trace the difference.</h2></div><span>DIFFERENCE · BORROW</span></div><HalfSubtractorCard /><FullSubtractorCard /></section> : null}
      {filter === "all" || filter === "multiplier" ? <section id="multiplier" className="module-section"><div className="module-section-heading"><div><div className="eyebrow">03 / MULTIPLIER</div><h2>Multiply with partial products.</h2></div><span>AND ARRAY · HALF ADDERS · PRODUCT</span></div><MultiplierCard /></section> : null}
      <div className="modules-callout"><Calculator size={19} /><span>Every module is deterministic and live. Toggle any input or adjust the circuit scale to inspect the same logic at a comfortable size.</span><RefreshCw size={17} /></div>
    </main>
  </div>;
}
