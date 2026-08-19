import { useState } from "react";
import { ArrowRight, CheckCircle2, CircuitBoard, FunctionSquare, GitBranch, Layers3, Map, Play, Plus, RefreshCw, Search, TableProperties, Zap } from "lucide-react";
import { Link, useLocation } from "wouter";

const featureGroups = [
  {
    eyebrow: "ANALYSIS TOOLS",
    title: "Shape the function.",
    accent: "teal",
    items: [
      { href: "/lab", icon: Zap, title: "Boolean Analyser", description: "Enter and parse Boolean expressions" },
      { href: "/lab?tab=truth", icon: TableProperties, title: "Truth Table", description: "Generate and inspect truth tables" },
      { href: "/lab?tab=kmap", icon: Map, title: "Karnaugh Map", description: "Visual K-map minimization" },
      { href: "/lab?tab=transform", icon: RefreshCw, title: "Function Transformation", description: "SOP, POS and canonical forms" },
    ],
  },
  {
    eyebrow: "CIRCUIT TOOLS",
    title: "Trace the signal.",
    accent: "copper",
    items: [
      { href: "/lab?tab=gates", icon: CircuitBoard, title: "Gate Synthesis", description: "Standard, NAND-only, NOR-only circuits" },
      { href: "/verify", icon: CheckCircle2, title: "Exhaustive Verification", description: "Verify all input states" },
    ],
  },
  {
    eyebrow: "ARITHMETIC MODULES",
    title: "Build the arithmetic.",
    accent: "purple",
    items: [
      { href: "/modules#adders", icon: Plus, title: "Adders", description: "Half Adder & Full Adder" },
      { href: "/modules#subtractors", icon: FunctionSquare, title: "Subtractors", description: "Half Subtractor & Full Subtractor" },
      { href: "/modules#multiplier", icon: Layers3, title: "Multiplier", description: "Binary multiplier circuit" },
    ],
  },
];

function FeatureCard({ href, icon: Icon, title, description, accent }: { href: string; icon: typeof Zap; title: string; description: string; accent: string }) {
  return <Link href={href} className={`dashboard-feature-card accent-${accent}`}><span className="dashboard-feature-icon"><Icon size={19} /></span><span className="dashboard-feature-copy"><strong>{title}</strong><small>{description}</small></span><ArrowRight size={16} className="dashboard-feature-arrow" /></Link>;
}

export default function Overview() {
  const [, navigate] = useLocation();
  const [expression, setExpression] = useState("A'B + AB' + AC");
  const startAnalysis = () => navigate(`/lab?expression=${encodeURIComponent(expression)}`);
  return <div className="overview-page">
    <section className="overview-hero"><div><div className="eyebrow"><span className="eyebrow-line" /> DIGITAL LOGIC WORKBENCH</div><h1>From a rule to <i>verified logic.</i></h1><p>Explore Boolean functions, circuit structures, and exhaustive proofs in one focused technical workspace.</p></div><div className="overview-hero-orbit"><div className="orbit-ring orbit-ring-one" /><div className="orbit-ring orbit-ring-two" /><span>01</span></div></section>
    <section className="quick-start-card"><div className="quick-start-copy"><div className="eyebrow">QUICK START</div><h2>Begin with a Boolean expression.</h2><p>Enter a rule and jump directly into the analyser workspace.</p></div><div className="quick-start-form"><label htmlFor="quick-expression"><FunctionSquare size={17} /><span>Expression</span></label><div><input id="quick-expression" value={expression} onChange={(event) => setExpression(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") startAnalysis(); }} spellCheck={false} /><button type="button" onClick={startAnalysis}><Play size={15} fill="currentColor" /> Analyze</button></div></div></section>
    <div className="overview-section-heading"><div><div className="eyebrow">FEATURE ATLAS</div><h2>Choose a path through the lab.</h2></div><span><Search size={15} /> Search above to find a tool</span></div>
    {featureGroups.map((group) => <section className="feature-group" key={group.eyebrow}><div className="feature-group-heading"><div><div className="eyebrow">{group.eyebrow}</div><h3>{group.title}</h3></div><span className={`feature-group-rule rule-${group.accent}`} /></div><div className="dashboard-feature-grid">{group.items.map((item) => <FeatureCard key={item.title} {...item} accent={group.accent} />)}</div></section>)}
    <section className="overview-footer-card"><div className="overview-footer-icon"><GitBranch size={21} /></div><div><div className="eyebrow">A VERIFIED WORKFLOW</div><h2>Define → minimize → implement → prove.</h2><p>Every route in the workbench connects to the same checked logic model.</p></div><Link href="/lab" className="overview-footer-action">Open Boolean Lab <ArrowRight size={16} /></Link></section>
  </div>;
}
