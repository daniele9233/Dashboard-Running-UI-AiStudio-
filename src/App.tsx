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

export default function App() {
  const [activeView, setActiveView] = useState("dashboard");

  return (
    <div className="w-full h-screen bg-bg-app flex overflow-hidden text-text-primary">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      
      {activeView === "dashboard" ? (
        <main className="flex-1 flex flex-col p-8 overflow-y-auto">
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
      ) : activeView === "training" ? (
        <TrainingView />
      ) : (
        <main className="flex-1 flex items-center justify-center text-text-muted">
          <p>This view is not implemented yet.</p>
        </main>
      )}
    </div>
  );
}



