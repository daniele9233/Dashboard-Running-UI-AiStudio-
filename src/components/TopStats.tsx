import { BarChart, Bar, AreaChart, Area, ResponsiveContainer, YAxis, Cell } from "recharts";
import { ChevronDown } from "lucide-react";

const distanceData = [
  { name: "Mon", value: 35, color: "#8B5CF6" },
  { name: "Tue", value: 12, color: "#3B82F6" },
  { name: "Wed", value: 20, color: "#14B8A6" },
  { name: "Thu", value: 9, color: "#F59E0B" },
  { name: "Fri", value: 24, color: "#F43F5E" },
];

const paceData = [
  { name: "Jan", value: 5.5 },
  { name: "Feb", value: 5.2 },
  { name: "Mar", value: 5.0 },
  { name: "Apr", value: 5.8 },
  { name: "May", value: 5.4 },
  { name: "Jun", value: 5.1 },
  { name: "Jul", value: 4.9 },
];

const elevationData = [
  { name: "Jan", value: 1200 },
  { name: "Feb", value: 1400 },
  { name: "Mar", value: 1100 },
  { name: "Apr", value: 1800 },
  { name: "May", value: 1600 },
  { name: "Jun", value: 2200 },
  { name: "Jul", value: 2500 },
];

export function TopStats() {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {/* Total Distance Card */}
      <div className="bg-bg-card border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xs text-text-muted font-semibold tracking-wider mb-1 uppercase">Total Distance</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-text-primary">42.8 km</span>
              <span className="text-xs text-[#F43F5E] bg-[#F43F5E]/10 px-1.5 py-0.5 rounded">-12%</span>
            </div>
          </div>
          <button className="text-xs text-text-secondary flex items-center gap-1 hover:text-text-primary">
            THIS WEEK <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        <div className="h-24 w-full mt-auto">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distanceData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {distanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-text-muted">
          {distanceData.map((d) => (
            <span key={d.name}>{d.name}</span>
          ))}
        </div>
      </div>

      {/* Avg Pace Card */}
      <div className="bg-bg-card border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xs text-text-muted font-semibold tracking-wider mb-1 uppercase">Avg Pace</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-text-primary">5:12 /km</span>
              <span className="text-xs text-[#14B8A6] bg-[#14B8A6]/10 px-1.5 py-0.5 rounded">-2%</span>
            </div>
          </div>
          <button className="text-xs text-text-secondary flex items-center gap-1 hover:text-text-primary">
            THIS YEAR <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        <div className="h-24 w-full mt-auto relative">
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-text-muted pb-6">
            <span>6:00</span>
            <span>5:00</span>
            <span>4:00</span>
          </div>
          <div className="ml-8 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={paceData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPace" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <YAxis domain={[4.0, 6.0]} hide />
                <Area type="monotone" dataKey="value" stroke="#F43F5E" strokeWidth={2} fillOpacity={1} fill="url(#colorPace)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="flex justify-between ml-8 mt-2 text-[10px] text-text-muted">
          {paceData.map((d) => (
            <span key={d.name}>{d.name.toUpperCase()}</span>
          ))}
        </div>
      </div>

      {/* Elevation Gain Card */}
      <div className="bg-bg-card border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xs text-text-muted font-semibold tracking-wider mb-1 uppercase">Elevation Gain</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-text-primary">1,215 m</span>
              <span className="text-xs text-[#14B8A6] bg-[#14B8A6]/10 px-1.5 py-0.5 rounded">+4%</span>
            </div>
          </div>
          <button className="text-xs text-text-secondary flex items-center gap-1 hover:text-text-primary">
            THIS YEAR <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        <div className="h-24 w-full mt-auto relative">
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-text-muted pb-6">
            <span>2.8K</span>
            <span>1.4K</span>
            <span>0</span>
          </div>
          <div className="ml-8 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={elevationData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorElevation" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <YAxis domain={[0, 3000]} hide />
                <Area type="monotone" dataKey="value" stroke="#14B8A6" strokeWidth={2} fillOpacity={1} fill="url(#colorElevation)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="flex justify-between ml-8 mt-2 text-[10px] text-text-muted">
          {elevationData.map((d) => (
            <span key={d.name}>{d.name.toUpperCase()}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
