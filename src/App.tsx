/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopStats } from "./components/TopStats";
import { RecentActivities } from "./components/RecentActivities";
import { MainChart } from "./components/MainChart";
import { AnaerobicThreshold } from "./components/AnaerobicThreshold";
import { FitnessFreshness } from "./components/FitnessFreshness";
import { TrainingView } from "./components/TrainingView";
import { ProfileView } from "./components/ProfileView";
import { StatisticsView } from "./components/statistics/StatisticsView";
import { RoutesView } from "./components/RoutesView";
import { ActivitiesView } from "./components/ActivitiesView";
import { Search, Bell, Settings, User } from "lucide-react";

export default function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const handleSelectRun = (runId: string) => {
    setSelectedRunId(runId);
    setActiveView("routes");
  };

  const navItems = [
    { id: "dashboard", label: "DASHBOARD" },
    { id: "training", label: "TRAINING" },
    { id: "recovery", label: "RECOVERY" },
    { id: "biometrics", label: "BIOMETRICS" },
    { id: "insights", label: "INSIGHTS" },
  ];

  return (
    <div className="w-full h-screen bg-[#050505] flex overflow-hidden text-white font-sans">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#0A0A0A] z-40">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black italic tracking-tighter text-[#C0FF00]">METIC LAB</span>
            </div>
            <nav className="flex items-center gap-8">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`text-[10px] font-black tracking-[0.2em] transition-colors ${
                    activeView === item.id ? "text-[#C0FF00]" : "text-gray-500 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#C0FF00] transition-colors" />
              <input 
                type="text" 
                placeholder="Analyze specific route..." 
                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-[#C0FF00]/50 w-64 transition-all"
              />
            </div>
            <div className="flex items-center gap-4">
              <button className="text-gray-500 hover:text-white transition-colors relative">
                <Bell className="w-5 h-5" />
                <div className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#0A0A0A]" />
              </button>
              <button className="text-gray-500 hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border border-white/20 flex items-center justify-center overflow-hidden">
                <img src="https://picsum.photos/seed/user/100/100" alt="Profile" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {activeView === "dashboard" ? (
            <main className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar">
              <TopStats />
              <div className="grid grid-cols-[350px_1fr] gap-6 mb-6">
                <div className="flex flex-col gap-6 h-[674px]">
                  <div className="flex-1 min-h-0">
                    <RecentActivities />
                  </div>
                  <div className="h-[200px]">
                    <AnaerobicThreshold />
                  </div>
                </div>
                <div className="h-[674px]">
                  <MainChart />
                </div>
              </div>
              <FitnessFreshness />
            </main>
          ) : activeView === "activities" ? (
            <ActivitiesView onSelectRun={handleSelectRun} />
          ) : activeView === "training" ? (
            <TrainingView />
          ) : activeView === "profile" ? (
            <ProfileView />
          ) : activeView === "routes" ? (
            <RoutesView runId={selectedRunId} />
          ) : activeView === "statistiche" ? (
            <StatisticsView />
          ) : (
            <main className="flex-1 flex items-center justify-center text-gray-500">
              <p className="text-sm font-black uppercase tracking-widest">This view is not implemented yet.</p>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}



