import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import AdvancedModules from "@/pages/AdvancedModules";
import AIChatWidget from "@/components/AIChatWidget";
import DashboardShell from "@/components/DashboardShell";
import LabPage from "@/pages/LabPage";
import Overview from "@/pages/Overview";
import Settings from "@/pages/Settings";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return <DashboardShell><Switch><Route path="/" component={Overview} /><Route path="/lab" component={LabPage} /><Route path="/modules" component={AdvancedModules} /><Route path="/signal" component={LabPage} /><Route path="/verify" component={LabPage} /><Route path="/settings" component={Settings} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch></DashboardShell>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light" switchable><TooltipProvider><Toaster /><Router /><AIChatWidget /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
