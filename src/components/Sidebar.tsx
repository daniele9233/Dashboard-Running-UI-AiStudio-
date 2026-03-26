import {
  Activity,
  Calendar,
  Map,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  User,
  Footprints,
  BarChart2,
  LayoutDashboard
} from "lucide-react";
import { cn } from "../lib/utils";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const generalLinks = [
    { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
    { id: "activities", name: "Activities", icon: Activity },
    { id: "training", name: "Training", icon: Calendar },
    { id: "routes", name: "Routes", icon: Map },
    { id: "statistiche", name: "Statistiche", icon: BarChart2 },
  ];

  const personalLinks = [
    { id: "profile", name: "Profile", icon: User },
    { id: "messages", name: "Messages", icon: MessageSquare },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "settings", name: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-bg-app border-r border-[#1E293B] flex flex-col h-full py-6 px-4">
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-6 h-6 bg-text-primary rounded-sm flex items-center justify-center">
          <Footprints className="w-4 h-4 text-bg-app" />
        </div>
        <span className="font-bold text-lg tracking-wider">RUNMATE</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-text-muted mb-3 px-2 tracking-wider">GENERAL</h3>
          <ul className="space-y-1">
            {generalLinks.map((link) => (
              <li key={link.id}>
                <button
                  onClick={() => onViewChange(link.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors text-sm text-left",
                    activeView === link.id
                      ? "bg-bg-hover text-accent border-l-2 border-accent"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/50 border-l-2 border-transparent"
                  )}
                >
                  <link.icon className="w-4 h-4" />
                  {link.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-text-muted mb-3 px-2 tracking-wider">PERSONAL</h3>
          <ul className="space-y-1">
            {personalLinks.map((link) => (
              <li key={link.id}>
                <button
                  onClick={() => onViewChange(link.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors text-sm text-left",
                    activeView === link.id
                      ? "bg-bg-hover text-accent border-l-2 border-accent"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/50 border-l-2 border-transparent"
                  )}
                >
                  <link.icon className="w-4 h-4" />
                  {link.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <div className="bg-[#151E1C] rounded-lg p-4 mb-4 border border-[#1E293B]/50">
          <h4 className="text-xs text-text-muted mb-1">MONTHLY DISTANCE</h4>
          <div className="text-xl font-bold text-text-primary">142.5 km</div>
        </div>
        <button className="flex items-center gap-3 px-2 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors w-full">
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
