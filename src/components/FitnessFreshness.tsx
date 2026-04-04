import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity } from 'lucide-react';

const ffData = [
  { month: 'Feb', fitness: 10, fatigue: 5, form: 5 },
  { month: '', fitness: 12, fatigue: 15, form: -3 },
  { month: '', fitness: 15, fatigue: 20, form: -5 },
  { month: 'Mar', fitness: 14, fatigue: 10, form: 4 },
  { month: '', fitness: 18, fatigue: 25, form: -7 },
  { month: '', fitness: 22, fatigue: 35, form: -13 },
  { month: 'Apr', fitness: 25, fatigue: 30, form: -5 },
  { month: '', fitness: 24, fatigue: 15, form: 9 },
  { month: '', fitness: 28, fatigue: 40, form: -12 },
  { month: 'Mag', fitness: 32, fatigue: 45, form: -13 },
  { month: '', fitness: 35, fatigue: 38, form: -3 },
  { month: '', fitness: 34, fatigue: 20, form: 14 },
  { month: 'Giu', fitness: 38, fatigue: 50, form: -12 },
  { month: '', fitness: 42, fatigue: 60, form: -18 },
  { month: '', fitness: 45, fatigue: 55, form: -10 },
  { month: 'Lug', fitness: 48, fatigue: 45, form: 3 },
  { month: '', fitness: 46, fatigue: 30, form: 16 },
  { month: '', fitness: 50, fatigue: 65, form: -15 },
  { month: 'Ago', fitness: 55, fatigue: 75, form: -20 },
  { month: '', fitness: 58, fatigue: 70, form: -12 },
  { month: '', fitness: 60, fatigue: 60, form: 0 },
  { month: 'Set', fitness: 62, fatigue: 55, form: 7 },
  { month: '', fitness: 60, fatigue: 40, form: 20 },
  { month: '', fitness: 58, fatigue: 30, form: 28 },
  { month: 'Ott', fitness: 55, fatigue: 25, form: 30 },
  { month: '', fitness: 52, fatigue: 20, form: 32 },
  { month: '', fitness: 50, fatigue: 40, form: 10 },
  { month: 'Nov', fitness: 48, fatigue: 35, form: 13 },
  { month: '', fitness: 45, fatigue: 25, form: 20 },
  { month: '', fitness: 42, fatigue: 20, form: 22 },
  { month: 'Dic', fitness: 40, fatigue: 30, form: 10 },
  { month: '', fitness: 38, fatigue: 40, form: -2 },
  { month: '', fitness: 35, fatigue: 35, form: 0 },
  { month: 'Gen', fitness: 32, fatigue: 25, form: 7 },
  { month: '', fitness: 30, fatigue: 20, form: 10 },
  { month: '', fitness: 28, fatigue: 15, form: 13 },
  { month: 'Feb', fitness: 25, fatigue: 12, form: 13 },
  { month: '', fitness: 22, fatigue: 30, form: -8 },
  { month: '', fitness: 20, fatigue: 25, form: -5 },
  { month: '', fitness: 18.9, fatigue: 18.1, form: 0.8 },
];

export function FitnessFreshness() {
  return (
    <div className="bg-bg-card border border-[#1E293B] rounded-xl p-6 mt-6">
      <div className="flex items-center gap-2 mb-8">
        <Activity className="w-6 h-6 text-[#3B82F6]" />
        <h2 className="text-xl font-bold tracking-wider uppercase text-text-primary">Fitness & Freshness</h2>
      </div>

      <div className="grid grid-cols-3 gap-8 mb-8">
        <div>
          <div className="text-6xl font-bold text-[#3B82F6] mb-2">18.9</div>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wider text-[#3B82F6] uppercase">
            <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"></div>
            Condizione Fisica
          </div>
          <div className="text-[#14B8A6] text-base font-bold mt-1">+2.8</div>
        </div>
        <div>
          <div className="text-6xl font-bold text-[#F43F5E] mb-2">18.1</div>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wider text-[#F43F5E] uppercase">
            <div className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]"></div>
            Affaticamento
          </div>
        </div>
        <div>
          <div className="text-6xl font-bold text-[#14B8A6] mb-2">0.8</div>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wider text-[#14B8A6] uppercase">
            <div className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]"></div>
            Forma Fisica
          </div>
          <div className="text-[#14B8A6] text-base font-bold mt-1 uppercase">Neutro</div>
        </div>
      </div>

      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={ffData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="formGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="30%" stopColor="#14B8A6" />
                <stop offset="70%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 14 }} dy={10} />
            <YAxis yAxisId="left" domain={[0, 80]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 14 }} dx={-10} />
            <YAxis yAxisId="right" orientation="right" domain={[-40, 40]} hide />
            <Tooltip
              contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px' }}
              itemStyle={{ fontSize: '14px' }}
              labelStyle={{ color: '#94A3B8', marginBottom: '4px' }}
            />
            <ReferenceLine y={0} yAxisId="right" stroke="#334155" />
            
            <Line yAxisId="left" type="monotone" dataKey="fitness" stroke="#3B82F6" strokeWidth={3} dot={false} name="Condizione fisica" />
            <Line yAxisId="left" type="monotone" dataKey="fatigue" stroke="#F43F5E" strokeWidth={2} dot={false} name="Affaticamento" />
            <Line yAxisId="right" type="monotone" dataKey="form" stroke="url(#formGradient)" strokeWidth={2} dot={false} name="Forma fisica" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex gap-8 mt-8 justify-center text-sm font-semibold tracking-wider text-text-muted">
         <div className="flex items-center gap-2"><div className="w-4 h-1.5 bg-[#3B82F6] rounded-full"></div> Condizione fisica</div>
         <div className="flex items-center gap-2"><div className="w-4 h-1.5 bg-[#F43F5E] rounded-full"></div> Affaticamento</div>
         <div className="flex items-center gap-2"><div className="w-4 h-1.5 bg-[#14B8A6] rounded-full"></div> Forma fisica</div>
      </div>
    </div>
  );
}
