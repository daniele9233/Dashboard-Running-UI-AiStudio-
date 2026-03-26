import { ChevronLeft, ChevronRight, ChevronDown, CheckCircle2, Circle, MessageSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const mileageData = [
  { name: 'Jan', value: 26 },
  { name: '', value: 32 },
  { name: '', value: 23 },
  { name: '', value: 36 },
  { name: 'Feb', value: 40 },
  { name: '', value: 26 },
  { name: '', value: 32 },
  { name: '', value: 18 },
  { name: 'Mar', value: 37 },
];

const weeklyMenu = [
  { date: "MON, 02 MAR", type: "Easy run", color: "#8B5CF6", status: "completed" },
  { date: "TUE, 03 MAR", type: "Interval Run", color: "#EF4444", status: "completed" },
  { date: "WED, 04 MAR", type: "Strength", color: "#EAB308", status: "completed" },
  { date: "THU, 05 MAR", type: "Rest Day", color: "transparent", status: "rest" },
  { date: "FRI, 06 MAR", type: "Easy run", color: "#8B5CF6", status: "pending" },
  { date: "SAT, 07 MAR", type: "Long Run", color: "#10B981", status: "pending" },
  { date: "SUN, 08 MAR", type: "Rest Day", color: "transparent", status: "rest" },
];

export function TrainingSidebar() {
  return (
    <div className="flex flex-col h-full bg-[#181818] border-l border-[#2A2A2A]">
      
      {/* Profile Card */}
      <div className="p-6 border-b border-[#2A2A2A]">
        <div className="relative h-48 rounded-xl overflow-hidden mb-4">
          {/* Placeholder for background image */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
            <img 
              src="https://images.unsplash.com/photo-1552674605-171d31fea3fa?auto=format&fit=crop&q=80&w=800" 
              alt="Runner" 
              className="w-full h-full object-cover opacity-60 mix-blend-overlay"
            />
          </div>
          
          <div className="absolute top-4 left-4">
            <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              No Injury
            </span>
          </div>
          
          <div className="absolute bottom-4 left-4">
            <h2 className="text-2xl font-bold text-white mb-1">Andrew Smith</h2>
            <p className="text-sm text-gray-300">33 years old</p>
          </div>
          
          <button className="absolute bottom-4 right-4 w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
            <MessageSquare className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Weekly Mileage Chart */}
      <div className="p-6 border-b border-[#2A2A2A]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase">Weekly Mileage</h3>
          <div className="flex gap-2">
            <button className="text-gray-500 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
            <button className="text-gray-500 hover:text-white"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mileageData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6B7280', fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6B7280', fontSize: 12 }} 
                domain={[0, 40]}
                ticks={[0, 10, 20, 30, 40]}
              />
              <Tooltip 
                cursor={{ fill: '#2A2A2A' }}
                contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: '8px', color: '#fff' }}
                formatter={(value: number) => [`${value} KM`, 'Mileage']}
                labelStyle={{ display: 'none' }}
              />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {mileageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 6 ? '#10B981' : '#10B981'} opacity={index === 6 ? 1 : 0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Menu List */}
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase">Weekly Menu</h3>
          <div className="flex gap-2">
            <button className="text-gray-500 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
            <button className="text-gray-500 hover:text-white"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="space-y-4">
          {weeklyMenu.map((item, idx) => (
            <div 
              key={idx} 
              className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${item.status === 'rest' ? 'opacity-50' : 'bg-[#121212]'}`}
              style={{ borderLeftColor: item.color }}
            >
              <div className="flex items-center gap-6">
                <span className="text-xs font-semibold text-gray-500 w-24">{item.date}</span>
                <span className={`text-sm font-medium ${item.status === 'rest' ? 'text-gray-500' : 'text-gray-200'}`}>
                  {item.type}
                </span>
              </div>
              
              {item.status !== 'rest' && (
                <div className="flex items-center gap-3">
                  {item.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-gray-600" />
                  )}
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
