import { useState } from "react";
import type { ReactNode } from "react";
import { Calculator, CircuitBoard, GitBranch, Plus, RefreshCw } from "lucide-react";
import { Link } from "wouter";
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

function BitToggle({ label, value, onChange }: { label: string; value: Bit; onChange: (value: Bit) => void }) {
  return <button type="button" className={`bit-toggle ${value ? "on" : ""}`} aria-pressed={value === 1} onClick={() => onChange(value ? 0 : 1)}><span>{label}</span><strong>{bitValue(value)}</strong></button>;
}

function Lamp({ label, value }: { label: string; value: Bit }) {
  return <div className={`output-lamp ${value ? "on" : ""}`}><span>{label}</span><strong>{bitValue(value)}</strong></div>;
}

function TruthTable({ headers, rows }: { headers: string[]; rows: { inputs: Bit[]; outputs: Bit[] }[] }) {
  return <div className="module-table-wrap"><table className="module-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.inputs.map((value, inputIndex) => <td key={`i-${inputIndex}`}>{bitValue(value)}</td>)}{row.outputs.map((value, outputIndex) => <td className="module-output-cell" key={`o-${outputIndex}`}>{bitValue(value)}</td>)}</tr>)}</tbody></table></div>;
}

function Gate({ x, y, label, kind = "logic" }: { x: number; y: number; label: string; kind?: "logic" | "adder" }) {
  return <g className={`module-gate ${kind}`}><rect x={x} y={y} width="82" height="40" rx="8" /><text x={x + 41} y={y + 25} textAnchor="middle">{label}</text></g>;
}

function Wire({ d, source = "derived" }: { d: string; source?: "a" | "b" | "c" | "derived" }) {
  return <path className={`module-wire wire-${source}`} d={d} />;
}

function CircuitFrame({ title, children }: { title: string; children: ReactNode }) {
  return <div className="module-circuit"><div className="module-circuit-head"><span><CircuitBoard size={15} /> {title}</span><small>LIVE SIGNAL GRAPH</small></div><svg viewBox="0 0 760 230" role="img" aria-label={`${title} logic gate diagram`}>{children}</svg></div>;
}

function HalfAdderCard() {
  const [[a, setA], [b, setB]] = [useState<Bit>(1), useState<Bit>(0)];
  const result = halfAdder(a, b);
  return <article className="module-card"><ModuleHeading eyebrow="01 / ADDER" title="Half Adder" description="Adds two single-bit inputs with an XOR sum and an AND carry." /><div className="formula-strip"><code>S = A ⊕ B</code><code>C = A · B</code></div><div className="module-content-grid"><div><TruthTable headers={["A", "B", "S", "C"]} rows={halfAdderTruthTable} /><div className="simulator-controls"><span className="module-label">TOGGLE INPUTS</span><div><BitToggle label="A" value={a} onChange={setA} /><BitToggle label="B" value={b} onChange={setB} /></div><div className="output-row"><Lamp label="S" value={result.sum} /><Lamp label="C" value={result.carry} /></div></div></div><CircuitFrame title="XOR + AND"><text className="module-terminal-label" x="28" y="68">A</text><text className="module-terminal-label" x="28" y="138">B</text><Wire source="a" d="M52 65 H140 V70 H210" /><Wire source="b" d="M52 135 H120 V130 H210" /><Wire source="a" d="M52 65 H108 V170 H210" /><Wire source="b" d="M52 135 H92 V190 H210" /><circle className="module-junction wire-a" cx="108" cy="65" r="4" /><circle className="module-junction wire-b" cx="92" cy="135" r="4" /><Gate x={210} y={50} label="XOR" kind="adder" /><Gate x={210} y={150} label="AND" kind="logic" /><Wire d="M292 70 H420" /><Wire d="M292 170 H420" /><text className="module-output-label" x="440" y="75">S = {result.sum}</text><text className="module-output-label" x="440" y="175">C = {result.carry}</text></CircuitFrame></div></article>;
}

function FullAdderCard() {
  const [[a, setA], [b, setB], [cin, setCin]] = [useState<Bit>(1), useState<Bit>(0), useState<Bit>(1)];
  const result = fullAdder(a, b, cin);
  return <article className="module-card"><ModuleHeading eyebrow="02 / ADDER" title="Full Adder" description="Adds A, B, and carry-in using two half adders followed by an OR gate." /><div className="formula-strip"><code>S = A ⊕ B ⊕ Cᵢₙ</code><code>Cₒᵤₜ = AB + Cᵢₙ(A ⊕ B)</code></div><div className="module-content-grid"><div><TruthTable headers={["A", "B", "Cᵢₙ", "S", "Cₒᵤₜ"]} rows={fullAdderTruthTable} /><div className="simulator-controls"><span className="module-label">TOGGLE INPUTS</span><div><BitToggle label="A" value={a} onChange={setA} /><BitToggle label="B" value={b} onChange={setB} /><BitToggle label="Cᵢₙ" value={cin} onChange={setCin} /></div><div className="output-row"><Lamp label="S" value={result.sum} /><Lamp label="Cₒᵤₜ" value={result.carry} /></div></div></div><CircuitFrame title="HALF ADDER 1 → HALF ADDER 2 → OR"><text className="module-terminal-label" x="24" y="40">A</text><text className="module-terminal-label" x="24" y="72">B</text><text className="module-terminal-label" x="24" y="175">Cᵢₙ</text><Wire source="a" d="M50 37 H100 V55 H155" /><Wire source="b" d="M50 69 H115 V75 H155" /><Wire source="a" d="M50 37 H88 V140 H155" /><Wire source="b" d="M50 69 H78 V158 H155" /><Gate x={155} y={45} label="XOR" kind="adder" /><Gate x={155} y={135} label="AND" /><Wire source="derived" d="M237 65 H300 V95 H345" /><Wire source="derived" d="M237 155 H300 V188 H490" /><Wire source="c" d="M50 172 H275 V115 H345" /><Gate x={345} y={95} label="XOR" kind="adder" /><Gate x={345} y={175} label="AND" /><Wire source="derived" d="M427 115 H555" /><Wire source="derived" d="M427 195 H510 V145 H555" /><Gate x={555} y={125} label="OR" kind="adder" /><Wire d="M637 145 H700" /><text className="module-output-label" x="705" y="128">S = {result.sum}</text><text className="module-output-label" x="705" y="168">Cₒᵤₜ = {result.carry}</text></CircuitFrame></div></article>;
}

function HalfSubtractorCard() {
  const [[a, setA], [b, setB]] = [useState<Bit>(1), useState<Bit>(1)];
  const result = halfSubtractor(a, b);
  return <article className="module-card"><ModuleHeading eyebrow="03 / SUBTRACTOR" title="Half Subtractor" description="Subtracts B from A with XOR difference and inverted-A borrow logic." /><div className="formula-strip"><code>D = A ⊕ B</code><code>Bᵣ = A' · B</code></div><div className="module-content-grid"><div><TruthTable headers={["A", "B", "D", "Bᵣ"]} rows={halfSubtractorTruthTable} /><div className="simulator-controls"><span className="module-label">TOGGLE INPUTS</span><div><BitToggle label="A" value={a} onChange={setA} /><BitToggle label="B" value={b} onChange={setB} /></div><div className="output-row"><Lamp label="D" value={result.difference} /><Lamp label="Bᵣ" value={result.borrow} /></div></div></div><CircuitFrame title="XOR + NOT + AND"><text className="module-terminal-label" x="28" y="68">A</text><text className="module-terminal-label" x="28" y="138">B</text><Wire source="a" d="M52 65 H120 V70 H210" /><Wire source="b" d="M52 135 H150 V130 H210" /><Wire source="a" d="M52 65 H90 V170 H210" /><Gate x={210} y={50} label="XOR" kind="adder" /><Gate x={210} y={150} label="NOT" kind="logic" /><Wire source="derived" d="M292 170 H330 V190 H380" /><Gate x={380} y={170} label="AND" /><Wire d="M292 70 H450" /><Wire d="M462 190 H520" /><text className="module-output-label" x="475" y="75">D = {result.difference}</text><text className="module-output-label" x="545" y="195">Bᵣ = {result.borrow}</text></CircuitFrame></div></article>;
}

function FullSubtractorCard() {
  const [[a, setA], [b, setB], [bin, setBin]] = [useState<Bit>(1), useState<Bit>(0), useState<Bit>(1)];
  const result = fullSubtractor(a, b, bin);
  return <article className="module-card"><ModuleHeading eyebrow="04 / SUBTRACTOR" title="Full Subtractor" description="Subtracts B and borrow-in from A using two half subtractors and an OR gate." /><div className="formula-strip"><code>D = A ⊕ B ⊕ Bᵢₙ</code><code>Bₒᵤₜ = A'B + Bᵢₙ(A ⊕ B)'</code></div><div className="module-content-grid"><div><TruthTable headers={["A", "B", "Bᵢₙ", "D", "Bₒᵤₜ"]} rows={fullSubtractorTruthTable} /><div className="simulator-controls"><span className="module-label">TOGGLE INPUTS</span><div><BitToggle label="A" value={a} onChange={setA} /><BitToggle label="B" value={b} onChange={setB} /><BitToggle label="Bᵢₙ" value={bin} onChange={setBin} /></div><div className="output-row"><Lamp label="D" value={result.difference} /><Lamp label="Bₒᵤₜ" value={result.borrow} /></div></div></div><CircuitFrame title="HALF SUBTRACTOR 1 → HALF SUBTRACTOR 2 → OR"><text className="module-terminal-label" x="24" y="40">A</text><text className="module-terminal-label" x="24" y="72">B</text><text className="module-terminal-label" x="24" y="175">Bᵢₙ</text><Wire source="a" d="M50 37 H100 V55 H155" /><Wire source="b" d="M50 69 H115 V75 H155" /><Wire source="a" d="M50 37 H88 V140 H155" /><Wire source="b" d="M50 69 H78 V158 H155" /><Gate x={155} y={45} label="XOR" kind="adder" /><Gate x={155} y={135} label="AND" /><Wire source="derived" d="M237 65 H300 V95 H345" /><Wire source="derived" d="M237 155 H300 V188 H490" /><Wire source="c" d="M50 172 H275 V115 H345" /><Gate x={345} y={95} label="XOR" kind="adder" /><Gate x={345} y={175} label="AND" /><Wire source="derived" d="M427 115 H555" /><Wire source="derived" d="M427 195 H510 V145 H555" /><Gate x={555} y={125} label="OR" kind="adder" /><Wire d="M637 145 H700" /><text className="module-output-label" x="705" y="128">D = {result.difference}</text><text className="module-output-label" x="705" y="168">Bₒᵤₜ = {result.borrow}</text></CircuitFrame></div></article>;
}

function MultiplierCard() {
  const [[a1, setA1], [a0, setA0], [b1, setB1], [b0, setB0]] = [useState<Bit>(1), useState<Bit>(0), useState<Bit>(1), useState<Bit>(1)];
  const result = multiplyTwoBitNumbers(a1, a0, b1, b0);
  return <article className="module-card multiplier-card"><ModuleHeading eyebrow="05 / ARITHMETIC" title="2-bit × 2-bit Multiplier" description="Generates four partial products with AND gates, then combines them with half-adder stages." /><div className="formula-strip"><code>P₀ = A₀B₀</code><code>P = A × B = P₃P₂P₁P₀</code></div><div className="module-content-grid"><div><TruthTable headers={["A₁", "A₀", "B₁", "B₀", "P₃", "P₂", "P₁", "P₀"]} rows={multiplierTruthTable} /><div className="simulator-controls"><span className="module-label">TOGGLE INPUTS</span><div><BitToggle label="A₁" value={a1} onChange={setA1} /><BitToggle label="A₀" value={a0} onChange={setA0} /><BitToggle label="B₁" value={b1} onChange={setB1} /><BitToggle label="B₀" value={b0} onChange={setB0} /></div><div className="output-row"><Lamp label="P" value={result.product[0]} /><code className="product-readout">{bitString(result.product)}₂ = {decimalFromBits(result.product)}₁₀</code></div></div></div><CircuitFrame title="PARTIAL PRODUCTS → ADDERS"><text className="module-terminal-label" x="20" y="35">A₀</text><text className="module-terminal-label" x="20" y="68">A₁</text><text className="module-terminal-label" x="20" y="140">B₀</text><text className="module-terminal-label" x="20" y="173">B₁</text><Wire source="a" d="M48 32 H100 V40 H145" /><Wire source="a" d="M48 65 H110 V75 H145" /><Wire source="b" d="M48 137 H120 V110 H145" /><Wire source="b" d="M48 170 H130 V145 H145" /><Gate x={145} y={22} label="AND" /><Gate x={145} y={62} label="AND" /><Gate x={145} y={102} label="AND" /><Gate x={145} y={142} label="AND" /><Wire d="M227 42 H285" /><Wire d="M227 82 H260 V95 H285" /><Wire d="M227 122 H260 V105 H285" /><Gate x={285} y={75} label="HA" kind="adder" /><Wire d="M367 95 H420" /><Wire d="M227 162 H410 V160 H475" /><Gate x={475} y={140} label="HA" kind="adder" /><Wire d="M557 160 H630" /><text className="module-output-label" x="635" y="45">P₀ = {result.product[3]}</text><text className="module-output-label" x="635" y="85">P₁ = {result.product[2]}</text><text className="module-output-label" x="635" y="125">P₂ = {result.product[1]}</text><text className="module-output-label" x="635" y="165">P₃ = {result.product[0]}</text></CircuitFrame></div></article>;
}

function ModuleHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="module-card-heading"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2><p>{description}</p></div><GitBranch size={20} /></header>;
}

export default function AdvancedModules() {
  return <div className="modules-page"><header className="modules-topbar"><Link className="brand" href="/"><svg className="brand-mark" viewBox="0 0 40 40" aria-hidden="true"><rect className="brand-mark-bg" x="1" y="1" width="38" height="38" rx="10" /><path className="brand-mark-trace" d="M7 12h9M7 20h9M7 28h9M16 12v16M16 20h7" /><circle className="brand-mark-node" cx="16" cy="20" r="2.2" /><path className="brand-mark-gate" d="M23 14h2.5a6 6 0 0 1 0 12H23z" /><path className="brand-mark-trace" d="M28 20h5" /><circle className="brand-mark-node" cx="33" cy="20" r="1.8" /></svg><span><b>BOOLEAN</b><em>CIRCUIT LAB</em></span></Link><nav className="modules-nav"><a href="#adders">Adders</a><a href="#subtractors">Subtractors</a><a href="#multiplier">Multiplier</a><Link href="/">Back to lab</Link></nav></header><main className="modules-main"><div className="modules-hero"><div className="eyebrow"><Plus size={14} /> CIRCUIT MODULES / INTERACTIVE LAB</div><h1>Arithmetic circuits,<br /><i>explained by signals.</i></h1><p>Toggle real input bits, read the truth table, and follow each gate-level signal path from inputs to outputs.</p></div><section id="adders" className="module-section"><div className="module-section-heading"><div><div className="eyebrow">01 / ADDERS</div><h2>Build the sum.</h2></div><span>SUM · CARRY · CARRY-IN</span></div><HalfAdderCard /><FullAdderCard /></section><section id="subtractors" className="module-section"><div className="module-section-heading"><div><div className="eyebrow">02 / SUBTRACTORS</div><h2>Trace the difference.</h2></div><span>DIFFERENCE · BORROW</span></div><HalfSubtractorCard /><FullSubtractorCard /></section><section id="multiplier" className="module-section"><div className="module-section-heading"><div><div className="eyebrow">03 / MULTIPLIER</div><h2>Multiply with partial products.</h2></div><span>AND ARRAY · HALF ADDERS · PRODUCT</span></div><MultiplierCard /></section><div className="modules-callout"><Calculator size={19} /><span>Every module is deterministic and live. Toggle any input to see the output bits update immediately.</span><RefreshCw size={17} /></div></main></div>;
}
