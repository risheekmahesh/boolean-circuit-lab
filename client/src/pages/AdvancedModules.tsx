import { useState } from "react";
import type { ReactNode } from "react";
import { Calculator, CircuitBoard, GitBranch, Info, Plus, RefreshCw } from "lucide-react";
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

type TerminalProps = {
  x: number;
  y: number;
  label: string;
  value: Bit;
  kind?: "input" | "output";
};

function Terminal({ x, y, label, value, kind = "input" }: TerminalProps) {
  const width = kind === "output" ? 118 : 76;
  return <g className={`module-terminal terminal-${kind}`}>
    <rect x={x} y={y - 17} width={width} height={34} rx="7" />
    <text className="module-terminal-key" x={x + 14} y={y + 4}>{label}</text>
    <text className="module-terminal-value" x={x + width - 14} y={y + 4} textAnchor="end">{bitValue(value)}</text>
  </g>;
}

function BitToggle({ label, value, onChange }: { label: string; value: Bit; onChange: (value: Bit) => void }) {
  return <button type="button" className={`bit-toggle ${value ? "on" : ""}`} aria-pressed={value === 1} onClick={() => onChange(value ? 0 : 1)}>
    <span>{label}</span><strong>{bitValue(value)}</strong>
  </button>;
}

function Lamp({ label, value }: { label: string; value: Bit }) {
  return <div className={`output-lamp ${value ? "on" : ""}`}><span>{label}</span><strong>{bitValue(value)}</strong></div>;
}

function TruthTable({ headers, rows, activeInputs }: { headers: string[]; rows: TruthRow[]; activeInputs?: Bit[] }) {
  return <div className="module-table-wrap">
    <table className="module-table">
      <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => {
        const isCurrent = Boolean(activeInputs && row.inputs.every((value, inputIndex) => value === activeInputs[inputIndex]));
        return <tr className={isCurrent ? "is-current" : ""} key={index}>
          {row.inputs.map((value, inputIndex) => <td key={`i-${inputIndex}`}>{bitValue(value)}</td>)}
          {row.outputs.map((value, outputIndex) => <td className="module-output-cell" key={`o-${outputIndex}`}>{bitValue(value)}</td>)}
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

function ScaleControl({ scale, onChange }: { scale: number; onChange: (value: number) => void }) {
  const update = (value: number) => onChange(Math.min(2, Math.max(0.5, Math.round(value * 4) / 4)));
  return <div className="circuit-scale-control" aria-label="Circuit scale control">
    <span>CIRCUIT SCALE</span><button type="button" onClick={() => update(scale - 0.25)} aria-label="Decrease circuit scale">−</button>
    <input aria-label="Circuit scale" type="range" min="0.5" max="2" step="0.25" value={scale} onChange={(event) => update(Number(event.target.value))} />
    <button type="button" onClick={() => update(scale + 0.25)} aria-label="Increase circuit scale">+</button><output>{Math.round(scale * 100)}%</output>
  </div>;
}

function gatePath(gate: GateKind, width = 98, height = 56) {
  const mid = height / 2;
  if (gate === "AND") return `M 0 8 H ${width - 45} A 28 ${mid - 2} 0 0 1 ${width - 45} ${height - 8} H 0 Z`;
  if (gate === "HA") return `M 5 6 H ${width - 5} V ${height - 6} H 5 Z`;
  if (gate === "NOT") return `M 0 8 L ${width - 18} ${mid} L 0 ${height - 8} Z`;
  return `M 0 8 Q 22 ${mid} 0 ${height - 8} Q ${width - 35} ${height - 4} ${width - 4} ${mid} Q ${width - 35} 4 0 8 Z`;
}

function Gate({ x, y, label, active = 0, inputs = 2 }: { x: number; y: number; label: GateKind; active?: Bit; inputs?: 1 | 2 }) {
  const isXor = label === "XOR";
  const isNot = label === "NOT";
  const inputYs = inputs === 1 ? [28] : [20, 36];
  const outputX = isNot ? 80 : 98;
  return <g className={`module-gate gate-${label.toLowerCase()} ${active ? "is-active" : ""}`} transform={`translate(${x}, ${y})`}>
    {isXor && <path className="module-gate-xor-line" d="M -9 8 Q 14 28 -9 48" />}
    <path className="module-gate-body" d={gatePath(label)} />
    {isNot && <circle className="module-gate-bubble" cx="80" cy="28" r="6" />}
    <text x={label === "NOT" ? 35 : 49} y="33" textAnchor="middle">{label}</text>
    {inputYs.map((inputY) => <circle className="module-gate-input-pin" key={inputY} cx="0" cy={inputY} r="3" />)}
    <circle className="module-gate-output-pin" cx={outputX} cy="28" r="3" />
  </g>;
}

function Wire({ d, source = "derived", value }: { d: string; source?: "a" | "b" | "c" | "derived"; value?: Bit }) {
  return <path className={`module-wire wire-${source} ${value ? "is-high" : "is-low"}`} d={d} />;
}

function CircuitFrame({ title, scale, onScaleChange, children }: { title: string; scale: number; onScaleChange: (value: number) => void; children: ReactNode }) {
  const id = `module-grid-${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;
  return <div className="module-circuit">
    <div className="module-circuit-head"><span><CircuitBoard size={16} /> CIRCUIT DIAGRAM</span><div className="module-circuit-status"><small>{title}</small><ScaleControl scale={scale} onChange={onScaleChange} /></div></div>
    <div className="module-circuit-canvas"><svg viewBox="0 0 1000 360" style={{ width: `${1000 * scale}px`, height: `${360 * scale}px` }} role="img" aria-label={`${title} logic gate diagram`}>
      <defs><pattern id={id} width="18" height="18" patternUnits="userSpaceOnUse"><path d="M 18 0 L 0 0 0 18" fill="none" stroke="rgba(25, 48, 50, 0.07)" strokeWidth="0.7" /></pattern></defs>
      <rect x="0" y="0" width="1000" height="360" fill={`url(#${id})`} />{children}
    </svg></div>
  </div>;
}

function ModuleHeading({ eyebrow, title, description, meta }: { eyebrow: string; title: string; description: string; meta: string }) {
  return <header className="module-card-heading"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2><p>{description}</p></div><div className="module-card-meta"><GitBranch size={19} /><span>{meta}</span></div></header>;
}

function FormulaStrip({ formulas }: { formulas: string[] }) {
  return <div className="formula-strip">{formulas.map((formula) => <code key={formula}>{formula}</code>)}</div>;
}

function SimulatorPanel({ inputs, outputs }: { inputs: ReactNode; outputs: ReactNode }) {
  return <div className="simulator-controls"><span className="module-label">INPUTS / LIVE SIMULATION</span><div>{inputs}</div><div className="output-row"><span className="module-label output-panel-label">OUTPUTS</span>{outputs}</div></div>;
}

function ModuleInfoBanner({ children }: { children: ReactNode }) {
  return <div className="module-info-banner"><Info size={17} /><span>{children}</span></div>;
}

function HalfAdderCard() {
  const [[a, setA], [b, setB]] = [useState<Bit>(1), useState<Bit>(0)];
  const [scale, setScale] = useState(1);
  const result = halfAdder(a, b);
  return <article className="module-card" id="half-adder">
    <ModuleHeading eyebrow="01 / ADDER" title="Half Adder" description="Adds two single-bit inputs with parallel XOR and AND paths." meta="2 INPUTS · 2 OUTPUTS" />
    <FormulaStrip formulas={["S = A ⊕ B", "C = A · B"]} />
    <div className="module-content-grid">
      <div className="module-data-column"><div className="module-section-label">TRUTH TABLE</div><TruthTable headers={["A", "B", "S", "C"]} rows={halfAdderTruthTable} activeInputs={[a, b]} /><SimulatorPanel inputs={<><BitToggle label="A" value={a} onChange={setA} /><BitToggle label="B" value={b} onChange={setB} /></>} outputs={<><Lamp label="S" value={result.sum} /><Lamp label="C" value={result.carry} /></>} /></div>
      <CircuitFrame title="XOR + AND" scale={scale} onScaleChange={setScale}>
        <Terminal x={20} y={112} label="A" value={a} /><Terminal x={20} y={232} label="B" value={b} />
        <Wire source="a" value={a} d="M96 112 H150 V110 H200" /><Wire source="b" value={b} d="M96 232 H130 V126 H200" />
        <Wire source="a" value={a} d="M96 112 H112 V230 H200" /><Wire source="b" value={b} d="M96 232 H90 V246 H200" />
        <circle className="module-junction" cx="112" cy="112" r="4" /><circle className="module-junction" cx="90" cy="232" r="4" />
        <Gate x={200} y={82} label="XOR" active={result.sum} /><Gate x={200} y={202} label="AND" active={result.carry} />
        <Wire value={result.sum} d="M298 110 H760" /><Wire value={result.carry} d="M298 230 H760" />
        <Terminal x={760} y={110} label="S" value={result.sum} kind="output" /><Terminal x={760} y={230} label="C" value={result.carry} kind="output" />
      </CircuitFrame>
    </div>
    <ModuleInfoBanner>The XOR gate reports the sum bit when the inputs differ, while the AND gate reports a carry only when both inputs are HIGH.</ModuleInfoBanner>
  </article>;
}

function FullAdderCard() {
  const [[a, setA], [b, setB], [cin, setCin]] = [useState<Bit>(1), useState<Bit>(0), useState<Bit>(1)];
  const [scale, setScale] = useState(1);
  const first = halfAdder(a, b);
  const second = halfAdder(first.sum, cin);
  const result = fullAdder(a, b, cin);
  return <article className="module-card" id="full-adder">
    <ModuleHeading eyebrow="02 / ADDER" title="Full Adder" description="Adds A, B, and carry-in through two half-adder stages and an OR carry merge." meta="3 INPUTS · 2 OUTPUTS" />
    <FormulaStrip formulas={["S = A ⊕ B ⊕ Cᵢₙ", "Cₒᵤₜ = AB + Cᵢₙ(A ⊕ B)"]} />
    <div className="module-content-grid">
      <div className="module-data-column"><div className="module-section-label">TRUTH TABLE</div><TruthTable headers={["A", "B", "Cᵢₙ", "S", "Cₒᵤₜ"]} rows={fullAdderTruthTable} activeInputs={[a, b, cin]} /><SimulatorPanel inputs={<><BitToggle label="A" value={a} onChange={setA} /><BitToggle label="B" value={b} onChange={setB} /><BitToggle label="Cᵢₙ" value={cin} onChange={setCin} /></>} outputs={<><Lamp label="S" value={result.sum} /><Lamp label="Cₒᵤₜ" value={result.carry} /></>} /></div>
      <CircuitFrame title="TWO HALF ADDERS + OR" scale={scale} onScaleChange={setScale}>
        <Terminal x={20} y={70} label="A" value={a} /><Terminal x={20} y={120} label="B" value={b} /><Terminal x={20} y={285} label="Cᵢₙ" value={cin} />
        <Wire source="a" value={a} d="M96 70 H125 V65 H180" /><Wire source="b" value={b} d="M96 120 H145 V81 H180" />
        <Wire source="a" value={a} d="M96 70 H110 V185 H180" /><Wire source="b" value={b} d="M96 120 H96 V201 H180" />
        <circle className="module-junction" cx="110" cy="70" r="4" /><circle className="module-junction" cx="96" cy="120" r="4" />
        <Gate x={180} y={45} label="XOR" active={first.sum} /><Gate x={180} y={165} label="AND" active={first.carry} />
        <Wire value={first.sum} d="M278 73 H350 V95 H430" /><Wire value={first.sum} d="M278 73 H330 V230 H430" /><circle className="module-junction" cx="330" cy="73" r="4" />
        <Wire value={first.carry} d="M278 193 H580 V210 H680" />
        <Wire source="c" value={cin} d="M96 285 H390 V111 H430" /><Wire source="c" value={cin} d="M96 285 H380 V246 H430" /><circle className="module-junction wire-c" cx="380" cy="285" r="4" />
        <Gate x={430} y={75} label="XOR" active={second.sum} /><Gate x={430} y={210} label="AND" active={second.carry} /><Gate x={680} y={190} label="OR" active={result.carry} />
        <Wire value={second.sum} d="M528 103 H850" /><Wire value={second.carry} d="M528 238 H620 V226 H680" />
        <Wire value={result.carry} d="M778 218 H850" /><Terminal x={850} y={103} label="S" value={result.sum} kind="output" /><Terminal x={850} y={218} label="Cₒᵤₜ" value={result.carry} kind="output" />
      </CircuitFrame>
    </div>
    <ModuleInfoBanner>Two half adders calculate the intermediate and final sums; the OR gate combines their carry signals into the carry-out.</ModuleInfoBanner>
  </article>;
}

function HalfSubtractorCard() {
  const [[a, setA], [b, setB]] = [useState<Bit>(1), useState<Bit>(1)];
  const [scale, setScale] = useState(1);
  const result = halfSubtractor(a, b);
  const notA = (a ? 0 : 1) as Bit;
  return <article className="module-card" id="half-subtractor">
    <ModuleHeading eyebrow="03 / SUBTRACTOR" title="Half Subtractor" description="Subtracts B from A with an XOR difference path and A̅B borrow detection." meta="2 INPUTS · 2 OUTPUTS" />
    <FormulaStrip formulas={["D = A ⊕ B", "Bᵣ = A̅ · B"]} />
    <div className="module-content-grid">
      <div className="module-data-column"><div className="module-section-label">TRUTH TABLE</div><TruthTable headers={["A", "B", "D", "Bᵣ"]} rows={halfSubtractorTruthTable} activeInputs={[a, b]} /><SimulatorPanel inputs={<><BitToggle label="A" value={a} onChange={setA} /><BitToggle label="B" value={b} onChange={setB} /></>} outputs={<><Lamp label="D" value={result.difference} /><Lamp label="Bᵣ" value={result.borrow} /></>} /></div>
      <CircuitFrame title="XOR + NOT + AND" scale={scale} onScaleChange={setScale}>
        <Terminal x={20} y={70} label="A" value={a} /><Terminal x={20} y={220} label="B" value={b} />
        <Wire source="a" value={a} d="M96 70 H150 V120 H200" /><Wire source="b" value={b} d="M96 220 H165 V136 H200" /><Wire source="a" value={a} d="M96 70 H125 V248 H500" />
        <circle className="module-junction" cx="125" cy="70" r="4" />
        <Gate x={200} y={92} label="XOR" active={result.difference} /><Gate x={200} y={220} label="NOT" inputs={1} active={notA} /><Gate x={500} y={220} label="AND" active={result.borrow} />
        <Wire value={notA} d="M280 248 H400 V240 H500" /><Wire source="b" value={b} d="M96 220 H180 V256 H500" />
        <Wire value={result.difference} d="M298 120 H850" /><Wire value={result.borrow} d="M598 248 H850" />
        <Terminal x={850} y={120} label="D" value={result.difference} kind="output" /><Terminal x={850} y={248} label="Bᵣ" value={result.borrow} kind="output" />
      </CircuitFrame>
    </div>
    <ModuleInfoBanner>The XOR gate forms the difference, while NOT A and B feed the AND gate to detect when the subtraction needs a borrow.</ModuleInfoBanner>
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
  return <article className="module-card" id="full-subtractor">
    <ModuleHeading eyebrow="04 / SUBTRACTOR" title="Full Subtractor" description="Subtracts B and borrow-in from A with two half-subtractor stages and an OR merge." meta="3 INPUTS · 2 OUTPUTS" />
    <FormulaStrip formulas={["D = A ⊕ B ⊕ Bᵢₙ", "Bₒᵤₜ = A̅B + Bᵢₙ(A ⊕ B)̅"]} />
    <div className="module-content-grid">
      <div className="module-data-column"><div className="module-section-label">TRUTH TABLE</div><TruthTable headers={["A", "B", "Bᵢₙ", "D", "Bₒᵤₜ"]} rows={fullSubtractorTruthTable} activeInputs={[a, b, bin]} /><SimulatorPanel inputs={<><BitToggle label="A" value={a} onChange={setA} /><BitToggle label="B" value={b} onChange={setB} /><BitToggle label="Bᵢₙ" value={bin} onChange={setBin} /></>} outputs={<><Lamp label="D" value={result.difference} /><Lamp label="Bₒᵤₜ" value={result.borrow} /></>} /></div>
      <CircuitFrame title="TWO HALF SUBTRACTORS + OR" scale={scale} onScaleChange={setScale}>
        <Terminal x={20} y={60} label="A" value={a} /><Terminal x={20} y={112} label="B" value={b} /><Terminal x={20} y={285} label="Bᵢₙ" value={bin} />
        <Wire source="a" value={a} d="M96 60 H125 V60 H170" /><Wire source="b" value={b} d="M96 112 H140 V76 H170" />
        <Wire source="a" value={a} d="M96 60 H115 V275 H170" /><Wire source="b" value={b} d="M96 112 H100 V291 H170" />
        <circle className="module-junction" cx="115" cy="60" r="4" /><circle className="module-junction" cx="100" cy="112" r="4" />
        <Gate x={170} y={40} label="XOR" active={first.difference} /><Gate x={170} y={155} label="NOT" inputs={1} active={notA} /><Gate x={170} y={255} label="AND" active={first.borrow} />
        <Wire value={first.difference} d="M268 68 H330 V95 H390" /><Wire value={first.difference} d="M268 68 H310 V183 H390" /><circle className="module-junction" cx="310" cy="68" r="4" />
        <Wire value={notA} d="M250 183 H260 V275 H500" /><Wire value={first.borrow} d="M268 283 H580 V250 H680" />
        <Wire source="c" value={bin} d="M96 285 H360 V111 H390" /><Wire source="c" value={bin} d="M96 285 H380 V236 H500" /><circle className="module-junction wire-c" cx="360" cy="285" r="4" />
        <Gate x={390} y={75} label="XOR" active={second.difference} /><Gate x={390} y={155} label="NOT" inputs={1} active={notFirstDifference} /><Gate x={500} y={200} label="AND" active={second.borrow} /><Gate x={680} y={220} label="OR" active={result.borrow} />
        <Wire value={second.difference} d="M488 103 H850" /><Wire value={notFirstDifference} d="M470 183 H500 V220" /><Wire value={second.borrow} d="M598 228 H630 V266 H680" /><Wire value={result.borrow} d="M778 248 H850" />
        <Terminal x={850} y={103} label="D" value={result.difference} kind="output" /><Terminal x={850} y={248} label="Bₒᵤₜ" value={result.borrow} kind="output" />
      </CircuitFrame>
    </div>
    <ModuleInfoBanner>Two half subtractors calculate the difference and borrow-in path; the OR gate combines the borrow generated at either stage.</ModuleInfoBanner>
  </article>;
}

function MultiplierCard() {
  const [[a1, setA1], [a0, setA0], [b1, setB1], [b0, setB0]] = [useState<Bit>(1), useState<Bit>(0), useState<Bit>(1), useState<Bit>(1)];
  const [scale, setScale] = useState(1);
  const result = multiplyTwoBitNumbers(a1, a0, b1, b0);
  const [p0, p1, p2, p3] = result.partialProducts;
  return <article className="module-card multiplier-card" id="multiplier">
    <ModuleHeading eyebrow="05 / MULTIPLIER" title="2-bit × 2-bit Multiplier" description="Generates four partial products with AND gates, then combines them with two half-adder stages." meta="4 INPUTS · 4 OUTPUTS" />
    <FormulaStrip formulas={["P₀ = A₀B₀", "P = A × B = P₃P₂P₁P₀"]} />
    <div className="module-content-grid">
      <div className="module-data-column"><div className="module-section-label">TRUTH TABLE</div><TruthTable headers={["A₁", "A₀", "B₁", "B₀", "P₃", "P₂", "P₁", "P₀"]} rows={multiplierTruthTable} activeInputs={[a1, a0, b1, b0]} /><SimulatorPanel inputs={<><BitToggle label="A₁" value={a1} onChange={setA1} /><BitToggle label="A₀" value={a0} onChange={setA0} /><BitToggle label="B₁" value={b1} onChange={setB1} /><BitToggle label="B₀" value={b0} onChange={setB0} /></>} outputs={<><Lamp label="P₃" value={result.product[0]} /><Lamp label="P₂" value={result.product[1]} /><Lamp label="P₁" value={result.product[2]} /><Lamp label="P₀" value={result.product[3]} /><code className="product-readout">{bitString(result.product)}₂ = {decimalFromBits(result.product)}₁₀</code></>} /></div>
      <CircuitFrame title="PARTIAL PRODUCTS + ADDER STAGES" scale={scale} onScaleChange={setScale}>
        <text className="module-stage-label" x="210" y="22">PARTIAL PRODUCT GENERATION</text><text className="module-stage-label" x="420" y="22">SUMMATION STAGES</text>
        <Terminal x={20} y={60} label="A₀" value={a0} /><Terminal x={20} y={112} label="A₁" value={a1} /><Terminal x={20} y={215} label="B₀" value={b0} /><Terminal x={20} y={267} label="B₁" value={b1} />
        <Wire source="a" value={a0} d="M96 60 H120 V40 H220" /><Wire source="a" value={a0} d="M96 60 H135 V180 H220" />
        <Wire source="a" value={a1} d="M96 112 H150 V110 H220" /><Wire source="a" value={a1} d="M96 112 H145 V250 H220" />
        <Wire source="b" value={b0} d="M96 215 H175 V56 H220" /><Wire source="b" value={b0} d="M96 215 H190 V126 H220" />
        <Wire source="b" value={b1} d="M96 267 H205 V196 H220" /><Wire source="b" value={b1} d="M96 267 H220 V266 H220" />
        <circle className="module-junction" cx="120" cy="60" r="4" /><circle className="module-junction" cx="150" cy="112" r="4" /><circle className="module-junction" cx="175" cy="215" r="4" /><circle className="module-junction" cx="205" cy="267" r="4" />
        <Gate x={220} y={12} label="AND" active={p0} /><Gate x={220} y={82} label="AND" active={p1} /><Gate x={220} y={152} label="AND" active={p2} /><Gate x={220} y={222} label="AND" active={p3} />
        <text className="module-stage-label" x="326" y="46">p₀</text><text className="module-stage-label" x="326" y="116">p₁</text><text className="module-stage-label" x="326" y="186">p₂</text><text className="module-stage-label" x="326" y="256">p₃</text>
        <Wire value={p0} d="M318 40 H850" />
        <Wire value={p1} d="M318 110 H350 V100 H430" /><Wire value={p1} d="M318 110 H370 V210 H430" />
        <Wire value={p2} d="M318 180 H390 V116 H430" /><Wire value={p2} d="M318 180 H390 V226 H430" />
        <Gate x={430} y={72} label="XOR" active={result.sums[0]} /><Gate x={430} y={182} label="AND" active={result.carries[0]} />
        <Wire value={result.sums[0]} d="M528 100 H590 V100 H650" /><Wire value={result.carries[0]} d="M528 210 H560 V226 H650" />
        <Wire value={p3} d="M318 250 H600 V100 H650" /><Wire value={p3} d="M318 250 H620 V210 H650" />
        <Gate x={650} y={72} label="XOR" active={result.sums[1]} /><Gate x={650} y={182} label="AND" active={result.carries[1]} />
        <Wire value={result.sums[1]} d="M748 100 H850" /><Wire value={result.carries[1]} d="M748 210 H800 V250 H850" />
        <Terminal x={850} y={40} label="P₀" value={result.product[3]} kind="output" /><Terminal x={850} y={100} label="P₁" value={result.product[2]} kind="output" /><Terminal x={850} y={160} label="P₂" value={result.product[1]} kind="output" /><Terminal x={850} y={250} label="P₃" value={result.product[0]} kind="output" />
      </CircuitFrame>
    </div>
    <ModuleInfoBanner>The AND array creates four partial products; two XOR/AND summation stages combine them into the four-bit product.</ModuleInfoBanner>
  </article>;
}

export default function AdvancedModules() {
  const [filter, setFilter] = useState<"all" | "adders" | "subtractors" | "multiplier">("all");
  return <div className="modules-page"><main className="modules-main">
    <div className="modules-hero"><div className="eyebrow"><Plus size={14} /> CIRCUIT MODULES / INTERACTIVE LAB</div><h1>Arithmetic circuits,<br /><i>explained by signals.</i></h1><p>Toggle real input switches, read the highlighted truth-table row, scale the gate-level canvas, and follow every signal from input to output.</p></div>
    <nav className="module-filter-bar" aria-label="Filter arithmetic modules">{([['all', 'All'], ['adders', 'Adders'], ['subtractors', 'Subtractors'], ['multiplier', 'Multiplier']] as const).map(([value, label]) => <button type="button" key={value} className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{label}</button>)}</nav>
    {filter === "all" || filter === "adders" ? <section id="adders" className="module-section"><div className="module-section-heading"><div><div className="eyebrow">01 / ADDERS</div><h2>Build the sum.</h2></div><span>SUM · CARRY · CARRY-IN</span></div><HalfAdderCard /><FullAdderCard /></section> : null}
    {filter === "all" || filter === "subtractors" ? <section id="subtractors" className="module-section"><div className="module-section-heading"><div><div className="eyebrow">02 / SUBTRACTORS</div><h2>Trace the difference.</h2></div><span>DIFFERENCE · BORROW</span></div><HalfSubtractorCard /><FullSubtractorCard /></section> : null}
    {filter === "all" || filter === "multiplier" ? <section id="multiplier" className="module-section"><div className="module-section-heading"><div><div className="eyebrow">03 / MULTIPLIER</div><h2>Multiply with partial products.</h2></div><span>AND ARRAY · HALF ADDERS · PRODUCT</span></div><MultiplierCard /></section> : null}
    <div className="modules-callout"><Calculator size={19} /><span>Every module is deterministic and live. Toggle any input or adjust the circuit scale to inspect the same logic at a comfortable size.</span><RefreshCw size={17} /></div>
  </main></div>;
}
