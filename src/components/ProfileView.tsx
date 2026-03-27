import { MapPin, Award, Clock, Activity, Zap, Flame, Calendar, ChevronRight, Edit3, Share2 } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { getProfile } from "../api";
import type { Profile } from "../types/api";

function buildPRs(pbs: Profile['pbs']) {
  const labelMap: Record<string, string> = {
    '5km': '5K', '10km': '10K', '21.1km': 'Mezza Maratona', '42.2km': 'Maratona',
  };
  return Object.entries(pbs).map(([key, pb]) => ({
    distance: labelMap[key] ?? key,
    time: pb.time,
    pace: `${pb.pace}/km`,
    date: pb.date,
  }));
}

const shoes = [
  { name: "Nike Vaporfly 3", brand: "Nike", mileage: 120, max: 400, color: "bg-[#F43F5E]" },
  { name: "Saucony Endorphin Pro", brand: "Saucony", mileage: 350, max: 500, color: "bg-[#EAB308]" },
  { name: "Asics Novablast 4", brand: "Asics", mileage: 580, max: 600, color: "bg-[#EF4444]" },
];

const achievements = [
  { title: "Marathon Finisher", icon: Award, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  { title: "Early Bird", icon: Zap, color: "text-blue-400", bg: "bg-blue-400/10" },
  { title: "100k Month", icon: Flame, color: "text-orange-400", bg: "bg-orange-400/10" },
  { title: "Speed Demon", icon: Activity, color: "text-purple-400", bg: "bg-purple-400/10" },
];

// Deterministic pseudo-random based on seed (no Math.random())
const seededRng = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const generateHeatmap = () => {
  const weeks = 24;
  const days = 7;
  const grid = [];
  for (let i = 0; i < days; i++) {
    const row = [];
    for (let j = 0; j < weeks; j++) {
      const seed = i * 100 + j;
      const intensity = seededRng(seed) > 0.3 ? Math.floor(seededRng(seed + 50) * 4) + 1 : 0;
      row.push(intensity);
    }
    grid.push(row);
  }
  return grid;
};

const heatmapData = generateHeatmap();

const getHeatmapColor = (intensity: number) => {
  switch (intensity) {
    case 1: return "bg-[#10B981]/30";
    case 2: return "bg-[#10B981]/60";
    case 3: return "bg-[#10B981]/80";
    case 4: return "bg-[#10B981]";
    default: return "bg-[#2A2A2A]";
  }
};

export function ProfileView() {
  const { data: profile, loading } = useApi<Profile>(getProfile);

  const PRs = profile ? buildPRs(profile.pbs) : [];
  const displayName = profile?.name ?? '—';
  const totalKm = profile?.total_km ?? 0;
  const raceGoal = profile?.race_goal ?? '—';
  const level = profile?.level ?? '—';

  return (
    <div className="flex-1 overflow-y-auto bg-[#121212] text-white pb-12">
      {/* Hero Section */}
      <div className="relative h-72">
        {/* Cover Image */}
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1502224562085-639556652f33?auto=format&fit=crop&q=80&w=2000" 
            alt="Cover" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/60 to-transparent" />
        </div>

        {/* Profile Info */}
        <div className="absolute bottom-0 left-0 w-full px-8 translate-y-1/3 flex items-end justify-between">
          <div className="flex items-end gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-[#121212] overflow-hidden bg-[#1E1E1E] shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1552674605-171d31fea3fa?auto=format&fit=crop&q=80&w=400" 
                  alt="Andrew Smith" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-1 right-1 w-8 h-8 bg-[#3B82F6] rounded-full border-4 border-[#121212] flex items-center justify-center">
                <Award className="w-4 h-4 text-white" />
              </div>
            </div>
            
            <div className="mb-2">
              <h1 className="text-4xl font-bold text-white mb-1 tracking-tight">
                {loading ? <span className="animate-pulse bg-white/10 rounded w-40 h-9 inline-block" /> : displayName}
              </h1>
              <div className="flex items-center gap-4 text-gray-400 font-medium">
                <span className="flex items-center gap-1"><Activity className="w-4 h-4" /> {raceGoal}</span>
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {level}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mb-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1E1E1E] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-sm font-medium transition-colors">
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg text-sm font-medium transition-colors">
              <Edit3 className="w-4 h-4" /> Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 mt-24 grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column (Stats & Heatmap) */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Km Totali", value: totalKm > 0 ? totalKm.toFixed(0) : '—', unit: "km", icon: Activity, color: "text-[#3B82F6]" },
              { label: "Obiettivo", value: raceGoal, unit: "", icon: Clock, color: "text-[#10B981]" },
              { label: "Livello", value: level, unit: "", icon: Zap, color: "text-[#EAB308]" },
              { label: "PB Registrati", value: String(PRs.length), unit: "distanze", icon: Award, color: "text-[#F43F5E]" },
            ].map((stat, i) => (
              <div key={i} className="bg-[#181818] border border-[#2A2A2A] rounded-2xl p-5 hover:border-[#3A3A3A] transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</span>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{stat.value}</span>
                  <span className="text-sm font-medium text-gray-500">{stat.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Consistency Heatmap */}
          <div className="bg-[#181818] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Running Consistency</h2>
              <span className="text-sm text-gray-400">Last 6 months</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <div className="flex flex-col gap-2 justify-between text-xs text-gray-500 font-medium pr-2">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
                <span>Sun</span>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                {heatmapData.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    {row.map((intensity, j) => (
                      <div 
                        key={j} 
                        className={`w-4 h-4 rounded-sm ${getHeatmapColor(intensity)} transition-all hover:ring-2 hover:ring-white/50 cursor-pointer`}
                        title={`${intensity} activities`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-500 font-medium">
              <span>Less</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className={`w-3 h-3 rounded-sm ${getHeatmapColor(i)}`} />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>

          {/* Gear / Shoes */}
          <div className="bg-[#181818] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Current Gear</h2>
              <button className="text-sm text-[#3B82F6] hover:text-[#2563EB] font-medium flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {shoes.map((shoe, i) => {
                const percentage = (shoe.mileage / shoe.max) * 100;
                return (
                  <div key={i} className="bg-[#121212] border border-[#2A2A2A] rounded-xl p-4">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{shoe.brand}</div>
                    <div className="font-bold text-gray-200 mb-4 truncate">{shoe.name}</div>
                    
                    <div className="flex items-end justify-between mb-2">
                      <span className="text-xl font-bold text-white">{shoe.mileage} <span className="text-sm font-medium text-gray-500">km</span></span>
                      <span className="text-xs font-medium text-gray-500">Max {shoe.max}</span>
                    </div>
                    
                    <div className="h-2 w-full bg-[#1E1E1E] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${shoe.color}`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column (PRs & Achievements) */}
        <div className="space-y-8">
          
          {/* Personal Records */}
          <div className="bg-[#181818] border border-[#2A2A2A] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-6">Personal Records</h2>
            <div className="space-y-4">
              {PRs.map((pr, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-[#121212] border border-[#2A2A2A] rounded-xl hover:border-[#3A3A3A] transition-colors group cursor-pointer">
                  <div>
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">{pr.distance}</div>
                    <div className="text-xl font-bold text-white group-hover:text-[#3B82F6] transition-colors">{pr.time}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-300 mb-1">{pr.pace}</div>
                    <div className="text-xs text-gray-500">{pr.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-[#181818] border border-[#2A2A2A] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-6">Recent Achievements</h2>
            <div className="grid grid-cols-2 gap-4">
              {achievements.map((ach, i) => (
                <div key={i} className="flex flex-col items-center justify-center p-4 bg-[#121212] border border-[#2A2A2A] rounded-xl text-center">
                  <div className={`w-12 h-12 rounded-full ${ach.bg} flex items-center justify-center mb-3`}>
                    <ach.icon className={`w-6 h-6 ${ach.color}`} />
                  </div>
                  <span className="text-sm font-bold text-gray-200">{ach.title}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
