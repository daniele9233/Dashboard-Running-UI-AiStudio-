import React from 'react';
import { 
  Activity, 
  Calendar, 
  Clock, 
  ChevronRight, 
  MapPin, 
  TrendingUp,
  Zap,
  Timer,
  Heart
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface Run {
  id: string;
  title: string;
  date: string;
  distance: string;
  duration: string;
  pace: string;
  calories: string;
  heartRate: string;
  type: 'Easy' | 'Tempo' | 'Intervals' | 'Long' | 'Recovery';
  location: string;
}

const MOCK_RUNS: Run[] = [
  {
    id: '1',
    title: 'Morning Tempo 14K',
    date: 'Mar 26, 2026',
    distance: '14.2 km',
    duration: '1:04:12',
    pace: '4:31 min/km',
    calories: '942 kcal',
    heartRate: '158 bpm',
    type: 'Tempo',
    location: 'Milan, Italy'
  },
  {
    id: '2',
    title: 'Easy Recovery Loop',
    date: 'Mar 24, 2026',
    distance: '6.5 km',
    duration: '35:20',
    pace: '5:26 min/km',
    calories: '420 kcal',
    heartRate: '132 bpm',
    type: 'Recovery',
    location: 'Sempione Park'
  },
  {
    id: '3',
    title: 'Interval Session: 8x800m',
    date: 'Mar 22, 2026',
    distance: '10.8 km',
    duration: '52:15',
    pace: '4:50 min/km',
    calories: '780 kcal',
    heartRate: '165 bpm',
    type: 'Intervals',
    location: 'Arena Civica'
  },
  {
    id: '4',
    title: 'Sunday Long Run',
    date: 'Mar 19, 2026',
    distance: '22.4 km',
    duration: '1:58:30',
    pace: '5:17 min/km',
    calories: '1,540 kcal',
    heartRate: '145 bpm',
    type: 'Long',
    location: 'Navigli Canal'
  },
  {
    id: '5',
    title: 'City Center Exploration',
    date: 'Mar 17, 2026',
    distance: '8.2 km',
    duration: '42:10',
    pace: '5:08 min/km',
    calories: '560 kcal',
    heartRate: '140 bpm',
    type: 'Easy',
    location: 'Duomo Area'
  },
  {
    id: '6',
    title: 'Evening Threshold Run',
    date: 'Mar 15, 2026',
    distance: '12.0 km',
    duration: '54:20',
    pace: '4:32 min/km',
    calories: '820 kcal',
    heartRate: '162 bpm',
    type: 'Tempo',
    location: 'CityLife District'
  },
  {
    id: '7',
    title: 'Hill Repeats x10',
    date: 'Mar 13, 2026',
    distance: '7.5 km',
    duration: '45:00',
    pace: '6:00 min/km',
    calories: '610 kcal',
    heartRate: '168 bpm',
    type: 'Intervals',
    location: 'Monte Stella'
  },
  {
    id: '8',
    title: 'Quick Lunch Run',
    date: 'Mar 11, 2026',
    distance: '5.0 km',
    duration: '24:15',
    pace: '4:51 min/km',
    calories: '340 kcal',
    heartRate: '148 bpm',
    type: 'Easy',
    location: 'Porta Nuova'
  },
  {
    id: '9',
    title: 'Morning Base Miles',
    date: 'Mar 09, 2026',
    distance: '10.2 km',
    duration: '52:40',
    pace: '5:10 min/km',
    calories: '690 kcal',
    heartRate: '142 bpm',
    type: 'Easy',
    location: 'Indro Montanelli'
  },
  {
    id: '10',
    title: 'Endurance Test',
    date: 'Mar 07, 2026',
    distance: '18.0 km',
    duration: '1:35:00',
    pace: '5:16 min/km',
    calories: '1,250 kcal',
    heartRate: '146 bpm',
    type: 'Long',
    location: 'Lambro Park'
  }
];

interface ActivitiesViewProps {
  onSelectRun: (runId: string) => void;
}

export function ActivitiesView({ onSelectRun }: ActivitiesViewProps) {
  return (
    <div className="flex-1 flex flex-col bg-[#050505] overflow-hidden">
      {/* Header */}
      <header className="px-8 py-10 border-b border-white/5">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">Activities</h1>
          <div className="flex items-center gap-4">
            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
              <Calendar className="w-4 h-4 text-[#C0FF00]" />
              <span className="text-xs font-bold text-gray-400">Last 30 Days</span>
            </div>
            <button className="bg-[#C0FF00] text-black px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#A8E600] transition-colors">
              Export Data
            </button>
          </div>
        </div>
        <p className="text-gray-500 text-sm font-medium">Review your historical performance and geospatial narratives.</p>
      </header>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-4">
          {MOCK_RUNS.map((run, index) => (
            <motion.button
              key={run.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectRun(run.id)}
              className="w-full bg-[#0F172A]/40 backdrop-blur-xl border border-white/5 hover:border-[#C0FF00]/30 p-6 rounded-3xl flex items-center gap-8 transition-all group text-left"
            >
              {/* Type Icon */}
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110",
                run.type === 'Tempo' ? "bg-blue-500/20 text-blue-400" :
                run.type === 'Intervals' ? "bg-rose-500/20 text-rose-400" :
                run.type === 'Long' ? "bg-amber-500/20 text-amber-400" :
                "bg-emerald-500/20 text-emerald-400"
              )}>
                {run.type === 'Tempo' ? <Zap className="w-8 h-8" /> :
                 run.type === 'Intervals' ? <TrendingUp className="w-8 h-8" /> :
                 run.type === 'Long' ? <Activity className="w-8 h-8" /> :
                 <Activity className="w-8 h-8" />}
              </div>

              {/* Main Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-black italic tracking-tight text-white group-hover:text-[#C0FF00] transition-colors">
                    {run.title}
                  </h3>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                    run.type === 'Tempo' ? "bg-blue-500/20 text-blue-400" :
                    run.type === 'Intervals' ? "bg-rose-500/20 text-rose-400" :
                    run.type === 'Long' ? "bg-amber-500/20 text-amber-400" :
                    "bg-emerald-500/20 text-emerald-400"
                  )}>
                    {run.type}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-gray-500 text-xs font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {run.date}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    {run.location}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-8 px-8 border-x border-white/5">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Distance</span>
                  <span className="text-lg font-black italic text-white">{run.distance}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Time</span>
                  <span className="text-lg font-black italic text-white">{run.duration}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Avg Pace</span>
                  <span className="text-lg font-black italic text-emerald-400">{run.pace}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Avg HR</span>
                  <span className="text-lg font-black italic text-rose-500">{run.heartRate}</span>
                </div>
              </div>

              {/* Action */}
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#C0FF00] group-hover:text-black transition-all">
                <ChevronRight className="w-6 h-6" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
