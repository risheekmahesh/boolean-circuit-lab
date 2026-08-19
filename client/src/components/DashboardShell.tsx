import { useState } from "react";
import { Bot, CheckCircle2, CircuitBoard, Home, Menu, Package, Search, Settings, X, Zap } from "lucide-react";
import { Link, useLocation } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Home", icon: Home, match: (path: string) => path === "/" },
  { href: "/lab", label: "Boolean Lab", icon: Zap, match: (path: string) => path.startsWith("/lab") },
  { href: "/modules", label: "Modules", icon: Package, match: (path: string) => path.startsWith("/modules") },
  { href: "/verify", label: "Verification", icon: CheckCircle2, match: (path: string) => path.startsWith("/verify") },
  { href: "/settings", label: "Settings", icon: Settings, match: (path: string) => path.startsWith("/settings") },
];

function Brand() {
  return <Link className="dashboard-brand" href="/" aria-label="Boolean Circuit Lab home"><svg className="brand-mark" viewBox="0 0 40 40" aria-hidden="true"><rect className="brand-mark-bg" x="1" y="1" width="38" height="38" rx="10" /><path className="brand-mark-trace" d="M7 12h9M7 20h9M7 28h9M16 12v16M16 20h7" /><circle className="brand-mark-node" cx="16" cy="20" r="2.2" /><path className="brand-mark-gate" d="M23 14h2.5a6 6 0 0 1 0 12H23z" /><path className="brand-mark-trace" d="M28 20h5" /><circle className="brand-mark-node" cx="33" cy="20" r="1.8" /></svg><span><b>BOOLEAN</b><em>CIRCUIT LAB</em></span></Link>;
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openAssistant = () => window.dispatchEvent(new CustomEvent("open-logic-assistant"));

  return <div className="dashboard-shell">
    <header className="dashboard-topbar">
      <div className="dashboard-topbar-left"><button type="button" className="dashboard-menu-button" aria-label="Open navigation" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><Menu size={21} /></button><Brand /></div>
      <label className="dashboard-search"><Search size={16} /><input aria-label="Search Boolean Circuit Lab" placeholder="Search tools, modules, signals…" /></label>
      <div className="dashboard-topbar-actions"><button type="button" className="dashboard-ai-button" onClick={openAssistant}><Bot size={16} /><span>Ask AI</span></button><ThemeToggle /></div>
    </header>
    <aside className={`dashboard-sidebar ${drawerOpen ? "is-open" : ""}`} aria-label="Primary navigation">
      <div className="dashboard-sidebar-heading"><span>WORKBENCH</span><button type="button" className="dashboard-drawer-close" aria-label="Close navigation" onClick={() => setDrawerOpen(false)}><X size={18} /></button></div>
      <nav className="dashboard-nav">{navItems.map(({ href, label, icon: Icon, match }) => <Link key={href} href={href} className={match(location) ? "is-active" : ""} onClick={() => setDrawerOpen(false)}><Icon size={17} /><span>{label}</span>{match(location) && <i />}</Link>)}</nav>
      <div className="dashboard-sidebar-note"><CircuitBoard size={17} /><div><strong>Signal Atlas</strong><span>Analyze, synthesize, verify.</span></div></div>
    </aside>
    {drawerOpen && <button type="button" className="dashboard-overlay" aria-label="Close navigation overlay" onClick={() => setDrawerOpen(false)} />}
    <main className="dashboard-content">{children}</main>
  </div>;
}
