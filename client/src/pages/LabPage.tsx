import { CheckCircle2, CircuitBoard, Layers3, Map, TableProperties } from "lucide-react";
import { useEffect } from "react";
import { useLocation, useSearchParams } from "wouter";
import Home, { type AnalyzerSection } from "@/pages/Home";

const tabs: Array<{ key: Exclude<AnalyzerSection, "all">; label: string; icon: typeof TableProperties; anchor: string }> = [
  { key: "truth", label: "Truth Table", icon: TableProperties, anchor: "truth-table" },
  { key: "kmap", label: "K-Map", icon: Map, anchor: "kmap" },
  { key: "gates", label: "Gate Circuits", icon: CircuitBoard, anchor: "gates" },
  { key: "transform", label: "Transform", icon: Layers3, anchor: "transform" },
  { key: "verification", label: "Verification", icon: CheckCircle2, anchor: "verify" },
];

const tabAliases: Record<string, Exclude<AnalyzerSection, "all">> = {
  truth: "truth",
  "truth-table": "truth",
  kmap: "kmap",
  gates: "gates",
  transform: "transform",
  verify: "verification",
  verification: "verification",
};

function selectedTab(path: string, searchParams: URLSearchParams): Exclude<AnalyzerSection, "all"> {
  if (path.startsWith("/verify")) return "verification";
  const requested = searchParams.get("tab") ?? "truth";
  return tabAliases[requested] ?? "truth";
}

export default function LabPage() {
  const [location, navigate] = useLocation();
  const [searchParams] = useSearchParams();
  const active = selectedTab(location, searchParams);

  useEffect(() => {
    const tab = tabs.find((item) => item.key === active);
    if (!tab || active === "truth") return;
    window.setTimeout(() => document.getElementById(tab.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, [active]);

  return <div className="lab-page">
    <section className="dashboard-page-heading"><div><div className="eyebrow">BOOLEAN LAB / WORKSPACE</div><h1>Analyze and prove a function.</h1><p>Use the existing synthesis workbench, now organized around the evidence you need first.</p></div><div className="dashboard-page-badge"><CircuitBoard size={18} /><span>LIVE WORKSPACE</span></div></section>
    <nav className="lab-tabs" aria-label="Boolean lab sections">{tabs.map(({ key, label, icon: Icon }) => <button type="button" key={key} className={active === key ? "is-active" : ""} onClick={() => navigate(`/lab?tab=${key}`)}><Icon size={16} />{label}</button>)}</nav>
    <div className="lab-workbench"><Home embedded visibleSection={active} /></div>
  </div>;
}
