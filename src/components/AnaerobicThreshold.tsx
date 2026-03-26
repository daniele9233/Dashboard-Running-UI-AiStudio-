import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import { ChevronDown } from "lucide-react";

const thresholdData = [
  { name: "Jan", value: 155 },
  { name: "Feb", value: 158 },
  { name: "Mar", value: 157 },
  { name: "Apr", value: 161 },
  { name: "May", value: 163 },
  { name: "Jun", value: 162 },
  { name: "Jul", value: 165 },
];

export function AnaerobicThreshold() {
  return (
    <div className="bg-bg-card border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xs text-text-muted font-semibold tracking-wider mb-1 uppercase">Soglia Anaerobica</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text-primary">165 bpm</span>
            <span className="text-xs text-[#8B5CF6] bg-[#8B5CF6]/10 px-1.5 py-0.5 rounded">+2 bpm</span>
          </div>
        </div>
        <button className="text-xs text-text-secondary flex items-center gap-1 hover:text-text-primary">
          THIS YEAR <ChevronDown className="w-3 h-3" />
        </button>
      </div>
      <div className="h-24 w-full mt-auto relative">
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-text-muted pb-6">
          <span>170</span>
          <span>160</span>
          <span>150</span>
        </div>
        <div className="ml-8 h-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={thresholdData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorThreshold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <YAxis domain={[140, 180]} hide />
              <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorThreshold)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex justify-between ml-8 mt-2 text-[10px] text-text-muted">
        {thresholdData.map((d) => (
          <span key={d.name}>{d.name.toUpperCase()}</span>
        ))}
      </div>
    </div>
  );
}
