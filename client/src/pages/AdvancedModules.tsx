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
  multiplyThreeBitNumbers,
  multiplyTwoBitNumbers,
  multiplierTruthTable,
  threeBitMultiplierTruthTable,
} from "@/lib/advancedCircuits";

const bitValue = (value: Bit) => (value ? "1" : "0");

type GateKind = "AND" | "OR" | "XOR" | "NOT";
type SignalSource = "a" | "b" | "c" | "a0" | "a1" | "a2" | "b0" | "b1" | "b2" | "derived";
type TruthRow = { inputs: Bit[]; outputs: Bit[] };

type TerminalProps = {
  x: number;
  y: number;
  label: string;
  value: Bit;
  kind?: "input" | "output";
  source?: SignalSource;
};

function Terminal({ x, y, label, value, kind = "input", source }: TerminalProps) {
  const width = kind === "output" ? 118 : 76;
  return <g className={`module-terminal terminal-${kind} ${source ? `terminal-source-${source}` : ""}`}>
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
  if (gate === "NOT") return `M 0 8 L ${width - 18} ${mid} L 0 ${height - 8} Z`;
  return `M 0 8 Q 22 ${mid} 0 ${height - 8} Q ${width - 35} ${height - 4} ${width - 4} ${mid} Q ${width - 35} 4 0 8 Z`;
}

function Gate({ x, y, label, active = 0, inputs = 2 }: { x: number; y: number; label: GateKind; active?: Bit; inputs?: 1 | 2 | 3 }) {
  const isXor = label === "XOR";
  const isNot = label === "NOT";
  const inputYs = inputs === 1 ? [28] : inputs === 3 ? [14, 28, 42] : [20, 36];
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

function Wire({ d, source = "derived", value }: { d: string; source?: SignalSource; value?: Bit }) {
  return <path className={`module-wire wire-${source} ${value ? "is-high" : "is-low"}`} d={d} />;
}

function CircuitFrame({ title, scale, onScaleChange, children, width = 1000, height = 360 }: { title: string; scale: number; onScaleChange: (value: number) => void; children: ReactNode; width?: number; height?: number }) {
  const id = `module-grid-${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;
  return <div className="module-circuit">
    <div className="module-circuit-head"><span><CircuitBoard size={16} /> CIRCUIT DIAGRAM</span><div className="module-circuit-status"><small>{title}</small><ScaleControl scale={scale} onChange={onScaleChange} /></div></div>
    <div className="module-circuit-canvas"><svg viewBox={`0 0 ${width} ${height}`} style={{ width: `${width * scale}px`, height: `${height * scale}px` }} role="img" aria-label={`${title} logic gate diagram`}>
      <defs><pattern id={id} width="18" height="18" patternUnits="userSpaceOnUse"><path d="M 18 0 L 0 0 0 18" fill="none" stroke="rgba(25, 48, 50, 0.07)" strokeWidth="0.7" /></pattern></defs>
      <rect x="0" y="0" width={width} height={height} fill={`url(#${id})`} />{children}
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
    <FormulaStrip formulas={["S = X ⊕ Y", "CO = X · Y"]} />
    <div className="module-content-grid">
      <div className="module-data-column"><div className="module-section-label">TRUTH TABLE</div><TruthTable headers={["X", "Y", "S", "CO"]} rows={halfAdderTruthTable} activeInputs={[a, b]} /><SimulatorPanel inputs={<><BitToggle label="X" value={a} onChange={setA} /><BitToggle label="Y" value={b} onChange={setB} /></>} outputs={<><Lamp label="S" value={result.sum} /><Lamp label="CO" value={result.carry} /></>} /></div>
      <CircuitFrame title="XOR + AND" scale={scale} onScaleChange={setScale}>
        <text className="module-stage-label" x="390" y="28">SUM PATH</text><text className="module-stage-label" x="390" y="198">CARRY PATH</text>
        <Terminal x={20} y={70} label="X" value={a} source="a" /><Terminal x={20} y={280} label="Y" value={b} source="b" />
        <Wire source="a" value={a} d="M96 70 H220 V78 H390" /><Wire source="a" value={a} d="M96 70 H180 V230 H390" />
        <Wire source="b" value={b} d="M96 280 H250 V94 H390" /><Wire source="b" value={b} d="M96 280 H200 V246 H390" />
        <circle className="module-junction junction-a" cx="180" cy="70" r="4" /><circle className="module-junction junction-b" cx="200" cy="280" r="4" />
        <Gate x={390} y={58} label="XOR" active={result.sum} /><Gate x={390} y={210} label="AND" active={result.carry} />
        <Wire value={result.sum} d="M488 86 H820" /><Wire value={result.carry} d="M488 238 H820" />
        <Terminal x={820} y={86} label="S / SUM" value={result.sum} kind="output" /><Terminal x={820} y={238} label="CO / CARRY" value={result.carry} kind="output" />
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
    <ModuleHeading eyebrow="02 / ADDER" title="Full Adder" description="Adds X, Y, and carry-in through two half-adder stages and an OR carry merge." meta="3 INPUTS · 2 OUTPUTS" />
    <FormulaStrip formulas={["S = X ⊕ Y ⊕ CIN", "COUT = XY + CIN(X ⊕ Y)"]} />
    <div className="module-content-grid">
      <div className="module-data-column"><div className="module-section-label">TRUTH TABLE</div><TruthTable headers={["X", "Y", "CIN", "S", "COUT"]} rows={fullAdderTruthTable} activeInputs={[a, b, cin]} /><SimulatorPanel inputs={<><BitToggle label="X" value={a} onChange={setA} /><BitToggle label="Y" value={b} onChange={setB} /><BitToggle label="CIN" value={cin} onChange={setCin} /></>} outputs={<><Lamp label="S" value={result.sum} /><Lamp label="COUT" value={result.carry} /></>} /></div>
      <CircuitFrame title="TWO HALF ADDERS + OR" scale={scale} onScaleChange={setScale}>
        <text className="module-stage-label" x="370" y="28">HALF ADDER 1</text><text className="module-stage-label" x="580" y="28">HALF ADDER 2</text><text className="module-stage-label" x="680" y="166">CARRY MERGE</text>
        <Terminal x={20} y={50} label="X" value={a} source="a" /><Terminal x={20} y={130} label="Y" value={b} source="b" /><Terminal x={20} y={300} label="CIN" value={cin} source="c" />
        <Wire source="a" value={a} d="M96 50 H180 V78 H380" /><Wire source="a" value={a} d="M96 50 H140 V220 H380" />
        <Wire source="b" value={b} d="M96 130 H220 V94 H380" /><Wire source="b" value={b} d="M96 130 H160 V236 H380" />
        <circle className="module-junction junction-a" cx="140" cy="50" r="4" /><circle className="module-junction junction-b" cx="160" cy="130" r="4" />
        <Gate x={380} y={58} label="XOR" active={first.sum} /><Gate x={380} y={200} label="AND" active={first.carry} />
        <Wire source="derived" value={first.sum} d="M478 86 H530 V78 H590" /><Wire source="derived" value={first.sum} d="M478 86 H520 V220 H590" /><circle className="module-junction junction-derived" cx="520" cy="86" r="4" />
        <Wire source="derived" value={first.carry} d="M478 228 H620 V190 H680" />
        <Wire source="c" value={cin} d="M96 300 H550 V94 H590" /><Wire source="c" value={cin} d="M96 300 H540 V236 H590" /><circle className="module-junction junction-c" cx="540" cy="300" r="4" />
        <Gate x={590} y={58} label="XOR" active={second.sum} /><Gate x={590} y={200} label="AND" active={second.carry} /><Gate x={680} y={170} label="OR" active={result.carry} />
        <Wire value={second.sum} d="M688 86 H900" /><Wire value={second.carry} d="M688 228 H640 V206 H680" />
        <Wire value={result.carry} d="M778 198 H900" /><Terminal x={900} y={86} label="S / SUM" value={result.sum} kind="output" /><Terminal x={900} y={198} label="COUT / CARRY" value={result.carry} kind="output" />
      </CircuitFrame>
    </div>
    <ModuleInfoBanner>Two half adders calculate the intermediate and final sums; the OR gate combines their carry signals into COUT.</ModuleInfoBanner>
  </article>;
}

function HalfSubtractorCard() {
  const [[a, setA], [b, setB]] = [useState<Bit>(1), useState<Bit>(1)];
  const [scale, setScale] = useState(1);
  const result = halfSubtractor(a, b);
  const notA = (a ? 0 : 1) as Bit;
  return <article className="module-card" id="half-subtractor">
    <ModuleHeading eyebrow="03 / SUBTRACTOR" title="Half Subtractor" description="Subtracts Y from X with an XOR difference path and X̅Y borrow detection." meta="2 INPUTS · 2 OUTPUTS" />
    <FormulaStrip formulas={["D = X ⊕ Y", "Borrow = X̅ · Y"]} />
    <div className="module-content-grid">
      <div className="module-data-column"><div className="module-section-label">TRUTH TABLE</div><TruthTable headers={["X", "Y", "D", "Borrow"]} rows={halfSubtractorTruthTable} activeInputs={[a, b]} /><SimulatorPanel inputs={<><BitToggle label="X" value={a} onChange={setA} /><BitToggle label="Y" value={b} onChange={setB} /></>} outputs={<><Lamp label="D" value={result.difference} /><Lamp label="Borrow" value={result.borrow} /></>} /></div>
      <CircuitFrame title="XOR + NOT + AND" scale={scale} onScaleChange={setScale}>
        <text className="module-stage-label" x="390" y="58">DIFFERENCE PATH</text><text className="module-stage-label" x="390" y="216">BORROW PATH</text>
        <Terminal x={20} y={55} label="X" value={a} source="a" /><Terminal x={20} y={285} label="Y" value={b} source="b" />
        <Wire source="a" value={a} d="M96 55 H230 V110 H380" /><Wire source="a" value={a} d="M96 55 H160 V258 H380" />
        <Wire source="b" value={b} d="M96 285 H260 V126 H380" /><Wire source="b" value={b} d="M96 285 H520 V256 H600" />
        <circle className="module-junction junction-a" cx="160" cy="55" r="4" /><circle className="module-junction junction-b" cx="520" cy="285" r="4" />
        <Gate x={380} y={90} label="XOR" active={result.difference} /><Gate x={380} y={230} label="NOT" inputs={1} active={notA} /><Gate x={600} y={220} label="AND" active={result.borrow} />
        <Wire source="derived" value={notA} d="M460 258 H540 V240 H600" />
        <Wire value={result.difference} d="M478 118 H900" /><Wire value={result.borrow} d="M698 248 H900" />
        <Terminal x={900} y={118} label="D / DIFFERENCE" value={result.difference} kind="output" /><Terminal x={900} y={248} label="Borrow" value={result.borrow} kind="output" />
      </CircuitFrame>
    </div>
    <ModuleInfoBanner>The XOR gate forms the difference. Only X is inverted, and that NOT output feeds the borrow AND gate with Y.</ModuleInfoBanner>
  </article>;
}

function FullSubtractorCard() {
  const [[a, setA], [b, setB], [bin, setBin]] = [useState<Bit>(1), useState<Bit>(0), useState<Bit>(1)];
  const [scale, setScale] = useState(1);
  const first = halfSubtractor(a, b);
  const result = fullSubtractor(a, b, bin);
  const notA = (a ? 0 : 1) as Bit;
  const borrowXY = (notA & b) as Bit;
  const borrowXBin = (notA & bin) as Bit;
  const borrowYBin = (b & bin) as Bit;
  return <article className="module-card" id="full-subtractor">
    <ModuleHeading eyebrow="04 / SUBTRACTOR" title="Full Subtractor" description="Subtracts Y and borrow-in from X with a two-XOR difference path and a three-term borrow merge." meta="3 INPUTS · 2 OUTPUTS" />
    <FormulaStrip formulas={["D = X ⊕ Y ⊕ BIN", "BOUT = X̅Y + X̅BIN + YBIN"]} />
    <div className="module-content-grid">
      <div className="module-data-column"><div className="module-section-label">TRUTH TABLE</div><TruthTable headers={["X", "Y", "BIN", "D", "BOUT"]} rows={fullSubtractorTruthTable} activeInputs={[a, b, bin]} /><SimulatorPanel inputs={<><BitToggle label="X" value={a} onChange={setA} /><BitToggle label="Y" value={b} onChange={setB} /><BitToggle label="BIN" value={bin} onChange={setBin} /></>} outputs={<><Lamp label="D" value={result.difference} /><Lamp label="BOUT" value={result.borrow} /></>} /></div>
      <CircuitFrame title="TWO-XOR DIFFERENCE + THREE-TERM BORROW" scale={scale} onScaleChange={setScale}>
        <text className="module-stage-label" x="240" y="22">DIFFERENCE CASCADE</text><text className="module-stage-label" x="520" y="22">BORROW GENERATION</text><text className="module-stage-label" x="760" y="126">BORROW MERGE</text>
        <Terminal x={20} y={50} label="X" value={a} source="a" /><Terminal x={20} y={120} label="Y" value={b} source="b" /><Terminal x={20} y={310} label="BIN" value={bin} source="c" />
        <Wire source="a" value={a} d="M96 50 H150 V50 H240" /><Wire source="a" value={a} d="M150 50 V178 H240" />
        <Wire source="b" value={b} d="M96 120 H190 V66 H240" /><Wire source="b" value={b} d="M96 120 H200 V138 H400 V178 H420" /><Wire source="b" value={b} d="M96 120 H250 V276 H580" />
        <Wire source="c" value={bin} d="M96 310 H450 V66 H520" /><Wire source="c" value={bin} d="M96 310 H560 V228 H580" /><Wire source="c" value={bin} d="M96 310 H560 V292 H580" />
        <circle className="module-junction junction-a" cx="150" cy="50" r="4" /><circle className="module-junction junction-b" cx="200" cy="120" r="4" /><circle className="module-junction junction-c" cx="560" cy="310" r="4" />
        <Gate x={240} y={30} label="XOR" active={first.difference} /><Gate x={240} y={150} label="NOT" inputs={1} active={notA} />
        <Wire source="derived" value={first.difference} d="M338 58 H430 V50 H520" />
        <Wire source="derived" value={notA} d="M320 178 H360 V162 H420" /><Wire source="derived" value={notA} d="M320 178 H380 V212 H580" /><circle className="module-junction junction-derived" cx="360" cy="178" r="4" />
        <Gate x={420} y={142} label="AND" active={borrowXY} /><Gate x={580} y={192} label="AND" active={borrowXBin} /><Gate x={580} y={256} label="AND" active={borrowYBin} />
        <Gate x={520} y={30} label="XOR" active={result.difference} />
        <Wire source="derived" value={borrowXY} d="M518 170 H700 V184 H760" /><Wire source="derived" value={borrowXBin} d="M678 220 H720 V198 H760" /><Wire source="derived" value={borrowYBin} d="M678 284 H740 V212 H760" />
        <Gate x={760} y={170} label="OR" inputs={3} active={result.borrow} />
        <Wire value={result.difference} d="M618 58 H900" /><Wire value={result.borrow} d="M858 198 H900" />
        <Terminal x={900} y={58} label="D / DIFFERENCE" value={result.difference} kind="output" /><Terminal x={900} y={198} label="BOUT / BORROW" value={result.borrow} kind="output" />
        <text className="module-stage-label" x="650" y="158">X̅Y = {bitValue(borrowXY)}</text><text className="module-stage-label" x="650" y="234">X̅BIN = {bitValue(borrowXBin)}</text><text className="module-stage-label" x="650" y="302">YBIN = {bitValue(borrowYBin)}</text>
      </CircuitFrame>
    </div>
    <ModuleInfoBanner>Only X is complemented. The three borrow terms X̅Y, X̅BIN, and YBIN feed the three-input OR gate, while the difference uses the two-XOR cascade.</ModuleInfoBanner>
  </article>;
}

function MultiplierCard() {
  const [[a1, setA1], [a0, setA0], [b1, setB1], [b0, setB0]] = [useState<Bit>(1), useState<Bit>(0), useState<Bit>(1), useState<Bit>(1)];
  const [scale, setScale] = useState(1);
  const result = multiplyTwoBitNumbers(a1, a0, b1, b0);
  const [p0, p1, p2, p3] = result.partialProducts;
  return <article className="module-card multiplier-card" id="multiplier-2bit">
    <ModuleHeading eyebrow="05 / MULTIPLIER" title="2-bit × 2-bit Multiplier" description="Generates four diagonal partial products, then combines them with a two-stage half-adder cascade." meta="4 INPUTS · 4 OUTPUTS" />
    <FormulaStrip formulas={["P₀ = A₀B₀", "P = A × B = P₃P₂P₁P₀"]} />
    <div className="module-content-grid">
      <div className="module-data-column"><div className="module-section-label">TRUTH TABLE</div><TruthTable headers={["A₁", "A₀", "B₁", "B₀", "P₃", "P₂", "P₁", "P₀"]} rows={multiplierTruthTable} activeInputs={[a1, a0, b1, b0]} /><SimulatorPanel inputs={<><BitToggle label="A₁" value={a1} onChange={setA1} /><BitToggle label="A₀" value={a0} onChange={setA0} /><BitToggle label="B₁" value={b1} onChange={setB1} /><BitToggle label="B₀" value={b0} onChange={setB0} /></>} outputs={<><Lamp label="P₃" value={result.product[0]} /><Lamp label="P₂" value={result.product[1]} /><Lamp label="P₁" value={result.product[2]} /><Lamp label="P₀" value={result.product[3]} /><code className="product-readout">{bitString(result.product)}₂ = {decimalFromBits(result.product)}₁₀</code></>} /></div>
      <CircuitFrame title="PARTIAL PRODUCTS + DIAGONAL ADDERS" scale={scale} onScaleChange={setScale}>
        <text className="module-stage-label" x="210" y="22">PARTIAL PRODUCTS &amp; GENERATION</text><text className="module-stage-label" x="420" y="22">SUMMATION STAGES</text>
        <Terminal x={20} y={42} label="A₀" value={a0} source="a0" /><Terminal x={20} y={90} label="A₁" value={a1} source="a1" /><Terminal x={20} y={230} label="B₀" value={b0} source="b0" /><Terminal x={20} y={278} label="B₁" value={b1} source="b1" />
        <Wire source="a0" value={a0} d="M96 42 H130 V40 H220" /><Wire source="a0" value={a0} d="M130 42 V180 H220" /><Wire source="a1" value={a1} d="M96 90 H160 V110 H220" /><Wire source="a1" value={a1} d="M160 90 V250 H220" /><Wire source="b0" value={b0} d="M96 230 H180 V56 H220" /><Wire source="b0" value={b0} d="M180 230 V126 H220" /><Wire source="b1" value={b1} d="M96 278 H200 V196 H220" /><Wire source="b1" value={b1} d="M200 278 V266 H220" />
        <circle className="module-junction junction-a0" cx="130" cy="42" r="4" /><circle className="module-junction junction-a1" cx="160" cy="90" r="4" /><circle className="module-junction junction-b0" cx="180" cy="230" r="4" /><circle className="module-junction junction-b1" cx="200" cy="278" r="4" />
        <Gate x={220} y={12} label="AND" active={p0} /><Gate x={220} y={82} label="AND" active={p1} /><Gate x={220} y={152} label="AND" active={p2} /><Gate x={220} y={222} label="AND" active={p3} />
        <Wire value={p0} d="M318 40 H890" />
        <Wire source="derived" value={p1} d="M318 110 H380 V112 H450" /><Wire source="derived" value={p2} d="M318 180 H400 V128 H450" />
        <Wire source="derived" value={p1} d="M318 110 H360 V202 H450" /><Wire source="derived" value={p2} d="M318 180 H380 V218 H450" />
        <Gate x={450} y={92} label="XOR" active={result.sums[0]} /><Gate x={450} y={182} label="AND" active={result.carries[0]} />
        <Wire source="derived" value={result.sums[0]} d="M548 120 H620 V112 H660" /><Wire source="derived" value={result.carries[0]} d="M548 210 H620 V218 H660" /><Wire source="derived" value={p3} d="M318 250 H600 V128 H660" /><Wire source="derived" value={p3} d="M318 250 H620 V234 H660" />
        <Gate x={660} y={92} label="XOR" active={result.sums[1]} /><Gate x={660} y={198} label="AND" active={result.carries[1]} />
        <Wire value={result.sums[1]} d="M758 120 H820 V170 H890" /><Wire value={result.carries[1]} d="M758 226 H820 V250 H890" />
        <Terminal x={890} y={40} label="P₀" value={result.product[3]} kind="output" /><Terminal x={890} y={120} label="P₁" value={result.product[2]} kind="output" /><Terminal x={890} y={170} label="P₂" value={result.product[1]} kind="output" /><Terminal x={890} y={250} label="P₃" value={result.product[0]} kind="output" />
      </CircuitFrame>
    </div>
    <ModuleInfoBanner>The four AND gates form a staircase of partial products. Two half-adder stages cascade diagonally to produce P₁, P₂, and P₃.</ModuleInfoBanner>
  </article>;
}

function ThreeBitMultiplierCard() {
  const [[a2, setA2], [a1, setA1], [a0, setA0], [b2, setB2], [b1, setB1], [b0, setB0]] = [useState<Bit>(1), useState<Bit>(0), useState<Bit>(1), useState<Bit>(1), useState<Bit>(0), useState<Bit>(1)];
  const [scale, setScale] = useState(0.75);
  const result = multiplyThreeBitNumbers(a2, a1, a0, b2, b1, b0);
  const [p00, p10, p20, p01, p11, p21, p02, p12, p22] = result.partialProducts;
  const [p6, p5, p4, p3, p2, p1, p0] = result.product;
  const [sum1, sum2, sum3, sum4, sum5] = result.adderSums;
  const [carry1, carry2, carry3, carry4] = result.adderCarries;
  return <article className="module-card multiplier-card" id="multiplier-3bit">
    <ModuleHeading eyebrow="06 / MULTIPLIER" title="3-bit × 3-bit Multiplier" description="Generates nine staircase partial products and combines them through a diagonal ripple array." meta="6 INPUTS · 7 OUTPUTS" />
    <FormulaStrip formulas={["Pᵢⱼ = AᵢBⱼ", "P = A × B = P₆P₅P₄P₃P₂P₁P₀"]} />
    <div className="module-content-grid">
      <div className="module-data-column"><div className="module-section-label">TRUTH TABLE</div><TruthTable headers={["A₂", "A₁", "A₀", "B₂", "B₁", "B₀", "P₆", "P₅", "P₄", "P₃", "P₂", "P₁", "P₀"]} rows={threeBitMultiplierTruthTable} activeInputs={[a2, a1, a0, b2, b1, b0]} /><SimulatorPanel inputs={<><BitToggle label="A₂" value={a2} onChange={setA2} /><BitToggle label="A₁" value={a1} onChange={setA1} /><BitToggle label="A₀" value={a0} onChange={setA0} /><BitToggle label="B₂" value={b2} onChange={setB2} /><BitToggle label="B₁" value={b1} onChange={setB1} /><BitToggle label="B₀" value={b0} onChange={setB0} /></>} outputs={<><Lamp label="P₆" value={p6} /><Lamp label="P₅" value={p5} /><Lamp label="P₄" value={p4} /><Lamp label="P₃" value={p3} /><Lamp label="P₂" value={p2} /><Lamp label="P₁" value={p1} /><Lamp label="P₀" value={p0} /><code className="product-readout">{bitString(result.product)}₂ = {decimalFromBits(result.product)}₁₀</code></>} /></div>
      <CircuitFrame title="DIAGONAL ARRAY + RIPPLE SUMMATION" scale={scale} onScaleChange={setScale} width={1500} height={620}>
        <text className="module-stage-label" x="220" y="18">PARTIAL PRODUCTS &amp; GENERATION</text><text className="module-stage-label" x="520" y="18">DIAGONAL SUMMATION STAGES</text><text className="module-stage-label" x="1180" y="18">PRODUCT EDGE</text>
        <Terminal x={20} y={55} label="A₀" value={a0} source="a0" /><Terminal x={20} y={95} label="A₁" value={a1} source="a1" /><Terminal x={20} y={135} label="A₂" value={a2} source="a2" /><Terminal x={20} y={465} label="B₀" value={b0} source="b0" /><Terminal x={20} y={505} label="B₁" value={b1} source="b1" /><Terminal x={20} y={545} label="B₂" value={b2} source="b2" />
        <Wire source="a0" value={a0} d="M96 55 H130 V40 H220" /><Wire source="a0" value={a0} d="M130 55 V210 H220" /><Wire source="a0" value={a0} d="M130 55 H180 V380 H220" />
        <Wire source="a1" value={a1} d="M96 95 H150 V100 H220" /><Wire source="a1" value={a1} d="M150 95 V270 H220" /><Wire source="a1" value={a1} d="M150 95 V440 H220" />
        <Wire source="a2" value={a2} d="M96 135 H170 V160 H220" /><Wire source="a2" value={a2} d="M170 135 V330 H220" /><Wire source="a2" value={a2} d="M170 135 V500 H220" />
        <Wire source="b0" value={b0} d="M96 465 H180 V56 H220" /><Wire source="b0" value={b0} d="M180 465 V116 H220" /><Wire source="b0" value={b0} d="M180 465 V176 H220" />
        <Wire source="b1" value={b1} d="M96 505 H190 V226 H220" /><Wire source="b1" value={b1} d="M190 505 V286 H220" /><Wire source="b1" value={b1} d="M190 505 V346 H220" />
        <Wire source="b2" value={b2} d="M96 545 H200 V396 H220" /><Wire source="b2" value={b2} d="M200 545 V456 H220" /><Wire source="b2" value={b2} d="M200 545 V516 H220" />
        <circle className="module-junction junction-a0" cx="130" cy="55" r="4" /><circle className="module-junction junction-a1" cx="150" cy="95" r="4" /><circle className="module-junction junction-a2" cx="170" cy="135" r="4" /><circle className="module-junction junction-b0" cx="180" cy="465" r="4" /><circle className="module-junction junction-b1" cx="190" cy="505" r="4" /><circle className="module-junction junction-b2" cx="200" cy="545" r="4" />
        <Gate x={220} y={12} label="AND" active={p00} /><Gate x={220} y={72} label="AND" active={p10} /><Gate x={220} y={132} label="AND" active={p20} /><Gate x={220} y={202} label="AND" active={p01} /><Gate x={220} y={262} label="AND" active={p11} /><Gate x={220} y={322} label="AND" active={p21} /><Gate x={220} y={372} label="AND" active={p02} /><Gate x={220} y={432} label="AND" active={p12} /><Gate x={220} y={492} label="AND" active={p22} />
        <text className="module-stage-label" x="330" y="48">P₀₀</text><text className="module-stage-label" x="330" y="108">P₁₀</text><text className="module-stage-label" x="330" y="168">P₂₀</text><text className="module-stage-label" x="330" y="238">P₀₁</text><text className="module-stage-label" x="330" y="298">P₁₁</text><text className="module-stage-label" x="330" y="358">P₂₁</text><text className="module-stage-label" x="330" y="408">P₀₂</text><text className="module-stage-label" x="330" y="468">P₁₂</text><text className="module-stage-label" x="330" y="528">P₂₂</text>
        <Wire value={p00} d="M318 40 H1320" />
        <Wire source="derived" value={p10} d="M318 100 H390 V70 H480" /><Wire source="derived" value={p01} d="M318 230 H420 V86 H480" />
        <Gate x={480} y={42} label="XOR" active={sum1} /><Gate x={480} y={132} label="AND" active={carry1} /><Wire source="derived" value={sum1} d="M578 70 H650 V70 H720" /><Wire source="derived" value={carry1} d="M578 160 H670 V136 H720" />
        <Wire source="derived" value={p20} d="M318 160 H620 V86 H720" /><Wire source="derived" value={p11} d="M318 290 H650 V102 H720" /><Gate x={720} y={58} label="XOR" active={sum2} /><Gate x={720} y={148} label="AND" active={carry2} />
        <Wire source="derived" value={sum2} d="M818 86 H880 V86 H960" /><Wire source="derived" value={carry2} d="M818 176 H900 V152 H960" /><Wire source="derived" value={p02} d="M318 400 H850 V102 H960" /><Gate x={960} y={58} label="XOR" active={sum3} /><Gate x={960} y={148} label="AND" active={carry3} />
        <Wire source="derived" value={sum3} d="M1058 86 H1120 V86 H1180" /><Wire source="derived" value={carry3} d="M1058 176 H1140 V152 H1180" /><Gate x={1180} y={58} label="XOR" active={sum4} /><Gate x={1180} y={148} label="AND" active={carry4} />
        <Wire source="derived" value={p12} d="M318 460 H1060 V102 H1180" /><Wire source="derived" value={p21} d="M318 350 H1140 V136 H1180" /><Wire source="derived" value={p22} d="M318 520 H1140 V212 H1180" />
        <Wire source="derived" value={p1} d="M578 70 H620 V340 H1320 V86" /><Wire source="derived" value={p2} d="M818 86 H840 V360 H1320 V132" /><Wire source="derived" value={p3} d="M1058 86 H1080 V380 H1320 V178" /><Wire source="derived" value={p4} d="M1278 86 H1320 V224" /><Wire source="derived" value={p5} d="M1278 176 H1320 V270" /><Wire source="derived" value={p6} d="M1278 270 H1320 V316" />
        <Terminal x={1320} y={40} label="P₀" value={p0} kind="output" /><Terminal x={1320} y={86} label="P₁" value={p1} kind="output" /><Terminal x={1320} y={132} label="P₂" value={p2} kind="output" /><Terminal x={1320} y={178} label="P₃" value={p3} kind="output" /><Terminal x={1320} y={224} label="P₄" value={p4} kind="output" /><Terminal x={1320} y={270} label="P₅" value={p5} kind="output" /><Terminal x={1320} y={316} label="P₆" value={p6} kind="output" />
        <text className="module-stage-label" x="480" y="232">CARRY DIAGONALS →</text><text className="module-stage-label" x="720" y="232">CARRY DIAGONALS →</text><text className="module-stage-label" x="960" y="232">RIPPLE EDGE →</text>
      </CircuitFrame>
    </div>
    <ModuleInfoBanner>The 3×3 array generates nine AND partial products in three shifted rows. The staggered XOR/AND stages carry each diagonal column into the next, with the final ripple edge exposing P₀ through P₆.</ModuleInfoBanner>
  </article>;
}

export default function AdvancedModules() {
  const [filter, setFilter] = useState<"all" | "adders" | "subtractors" | "multiplier">("all");
  return <div className="modules-page"><main className="modules-main">
    <div className="modules-hero"><div className="eyebrow"><Plus size={14} /> CIRCUIT MODULES / INTERACTIVE LAB</div><h1>Arithmetic circuits,<br /><i>explained by signals.</i></h1><p>Toggle real input switches, read the highlighted truth-table row, scale the gate-level canvas, and follow every signal from input to output.</p></div>
    <nav className="module-filter-bar" aria-label="Filter arithmetic modules">{([['all', 'All'], ['adders', 'Adders'], ['subtractors', 'Subtractors'], ['multiplier', 'Multiplier']] as const).map(([value, label]) => <button type="button" key={value} className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{label}</button>)}</nav>
    {filter === "all" || filter === "adders" ? <section id="adders" className="module-section"><div className="module-section-heading"><div><div className="eyebrow">01 / ADDERS</div><h2>Build the sum.</h2></div><span>SUM · CARRY · CARRY-IN</span></div><HalfAdderCard /><FullAdderCard /></section> : null}
    {filter === "all" || filter === "subtractors" ? <section id="subtractors" className="module-section"><div className="module-section-heading"><div><div className="eyebrow">02 / SUBTRACTORS</div><h2>Trace the difference.</h2></div><span>DIFFERENCE · BORROW</span></div><HalfSubtractorCard /><FullSubtractorCard /></section> : null}
    {filter === "all" || filter === "multiplier" ? <section id="multiplier" className="module-section"><div className="module-section-heading"><div><div className="eyebrow">03 / MULTIPLIER</div><h2>Multiply with partial products.</h2></div><span>DIAGONAL ARRAY · ADDERS · PRODUCT</span></div><MultiplierCard /><ThreeBitMultiplierCard /></section> : null}
    <div className="modules-callout"><Calculator size={19} /><span>Every module is deterministic and live. Toggle any input or adjust the circuit scale to inspect the same logic at a comfortable size.</span><RefreshCw size={17} /></div>
  </main></div>;
}
