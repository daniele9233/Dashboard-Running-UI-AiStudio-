import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const data = [
  { name: "JAN", easy: 45, tempo: 20, intervals: 15, long: 30, race: 0 },
  { name: "FEB", easy: 40, tempo: 25, intervals: 10, long: 35, race: 0 },
  { name: "MAR", easy: 50, tempo: 30, intervals: 20, long: 40, race: 10 },
  { name: "APR", easy: 35, tempo: 20, intervals: 15, long: 25, race: 42 },
  { name: "MAY", easy: 60, tempo: 35, intervals: 25, long: 50, race: 0 },
  { name: "JUN", easy: 55, tempo: 30, intervals: 20, long: 45, race: 21 },
  { name: "JUL", easy: 45, tempo: 25, intervals: 15, long: 35, race: 0 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
    return (
      <div className="bg-[#1E293B] border border-[#334155] p-3 rounded-lg shadow-xl">
        <p className="text-xs text-text-muted mb-2 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-text-primary mb-2">Total: {total} km</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-text-secondary w-16">{entry.name}:</span>
            <span className="text-text-primary font-medium">{entry.value} km</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function MainChart() {
  return (
    <div className="bg-bg-card border border-[#1E293B] rounded-xl p-6 flex flex-col h-full">
      <div className="flex justify-between items-start mb-8">
        <div className="text-xl font-bold text-text-primary">142.5 km Run</div>
        <div className="flex gap-4 text-xs font-medium">
          <button className="text-text-secondary hover:text-text-primary transition-colors">Day</button>
          <button className="text-text-secondary hover:text-text-primary transition-colors">Week</button>
          <button className="text-text-secondary hover:text-text-primary transition-colors">Month</button>
          <button className="text-accent border-b-2 border-accent pb-1">Year</button>
        </div>
      </div>

      <div className="flex-1 min-h-[300px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }} barSize={12}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748B', fontSize: 10 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748B', fontSize: 10 }} 
              dx={-10}
            />
            <Tooltip cursor={{ fill: '#1E293B', opacity: 0.4 }} content={<CustomTooltip />} />
            <ReferenceLine 
              y={120} 
              stroke="#94A3B8" 
              strokeDasharray="3 3" 
              label={{ position: 'insideLeft', value: 'AVG 120 km', fill: '#E2E8F0', fontSize: 10, dy: -10 }} 
            />
            
            <Bar dataKey="easy" stackId="a" fill="#14B8A6" radius={[0, 0, 2, 2]} />
            <Bar dataKey="tempo" stackId="a" fill="#3B82F6" />
            <Bar dataKey="intervals" stackId="a" fill="#F59E0B" />
            <Bar dataKey="long" stackId="a" fill="#F43F5E" />
            <Bar dataKey="race" stackId="a" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-6 mt-6 pt-6 border-t border-[#1E293B] text-[10px] text-text-muted font-semibold tracking-wider justify-center">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" />
          EASY RUN
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
          TEMPO
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          INTERVALS
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#F43F5E]" />
          LONG RUN
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
          RACE
        </div>
      </div>
    </div>
  );
}
