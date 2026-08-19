import { useEffect } from "react";
import { Activity, CheckCircle2, CircuitBoard, Layers3, Map, TableProperties } from "lucide-react";
import { useLocation } from "wouter";
import Home from "@/pages/Home";

const tabs = [
  { key: "truth-table", label: "Truth Table", icon: TableProperties, anchor: "truth-table" },
  { key: "kmap", label: "K-Map", icon: Map, anchor: "kmap" },
  { key: "gates", label: "Gate Circuits", icon: CircuitBoard, anchor: "gates" },
  { key: "transform", label: "Transform", icon: Layers3, anchor: "transform" },
  { key: "signal", label: "Signal Graph", icon: Activity, anchor: "gates" },
  { key: "verify", label: "Verification", icon: CheckCircle2, anchor: "verify" },
] as const;

function selectedTab(path: string) {
  if (path.startsWith("/signal")) return "signal";
  if (path.startsWith("/verify")) return "verify";
  const value = new URLSearchParams(path.split("?")[1] ?? "").get("tab");
  return tabs.some((tab) => tab.key === value) ? value! : "truth-table";
}

export default function LabPage() {
  const [location, navigate] = useLocation();
  const active = selectedTab(location);
  useEffect(() => {
    const tab = tabs.find((item) => item.key === active);
    if (!tab || active === "truth-table") return;
    window.setTimeout(() => document.getElementById(tab.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, [active]);
  return <div className="lab-page">
    <section className="dashboard-page-heading"><div><div className="eyebrow">BOOLEAN LAB / WORKSPACE</div><h1>Analyze and prove a function.</h1><p>Use the existing synthesis workbench, now organized around the evidence you need first.</p></div><div className="dashboard-page-badge"><CircuitBoard size={18} /><span>LIVE WORKSPACE</span></div></section>
    <nav className="lab-tabs" aria-label="Boolean lab sections">{tabs.map(({ key, label, icon: Icon }) => <button type="button" key={key} className={active === key ? "is-active" : ""} onClick={() => navigate(`/lab?tab=${key}`)}><Icon size={16} />{label}</button>)}</nav>
    <div className="lab-workbench"><Home embedded /></div>
  </div>;
}
