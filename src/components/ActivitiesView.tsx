import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import Map, { Marker, MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

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
  coordinates: [number, number];
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
    location: 'London Eye',
    coordinates: [-0.1195, 51.5033]
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
    location: 'Jubilee Gardens',
    coordinates: [-0.1170, 51.5030]
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
    location: 'South Bank',
    coordinates: [-0.1160, 51.5060]
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
    location: 'Waterloo Station',
    coordinates: [-0.1120, 51.5030]
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
    location: 'St Paul\'s Cathedral',
    coordinates: [-0.0980, 51.5138]
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
    location: 'Tate Modern',
    coordinates: [-0.0990, 51.5076]
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
    location: 'Hayward Gallery',
    coordinates: [-0.1150, 51.5055]
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
    location: 'Royal Festival Hall',
    coordinates: [-0.1165, 51.5045]
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
    location: 'Blackfriars Bridge',
    coordinates: [-0.1040, 51.5090]
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
    location: 'Sea Life London',
    coordinates: [-0.1185, 51.5015]
  }
];

interface ActivitiesViewProps {
  onSelectRun: (runId: string) => void;
}

const MAPBOX_TOKEN = 'pk.eyJ1Ijoia2lra29kZXJpc28iLCJhIjoiY21uYWszMTIxMGp3NzJzc2JraDhwbTU5ayJ9.-60pgYn_BXERAHA7AqVgqA';

export function ActivitiesView({ onSelectRun }: ActivitiesViewProps) {
  const [hoveredRunId, setHoveredRunId] = useState<string | null>(null);
  const mapRef = useRef<MapRef>(null);
  const animationRef = useRef<number>();

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  const handleRunClick = useCallback((run: Run) => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      
      stopAnimation();

      map.flyTo({
        center: run.coordinates,
        zoom: 16.5,
        pitch: 65,
        duration: 2000,
        essential: true
      });

      // Start rotation after flyTo completes
      setTimeout(() => {
        if (!mapRef.current) return;
        const currentMap = mapRef.current.getMap();
        
        let rotated = 0;
        const speed = 0.15; // Slower speed for smoother rotation
        
        const rotate = () => {
          rotated += speed;
          if (rotated >= 360) {
            return;
          }
          
          currentMap.setBearing(currentMap.getBearing() + speed);
          animationRef.current = requestAnimationFrame(rotate);
        };
        
        animationRef.current = requestAnimationFrame(rotate);
      }, 2000);
    }
    
    // onSelectRun(run.id); // Removed to allow rotation animation to play
  }, [stopAnimation]);

  const onMapLoad = useCallback(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      // Set the light preset to dusk to match the screenshot's lighting
      map.setConfigProperty('basemap', 'lightPreset', 'dusk');
      // Ensure 3D buildings and landmarks are shown
      map.setConfigProperty('basemap', 'showPointOfInterestLabels', true);
      map.setConfigProperty('basemap', 'showPlaceLabels', true);
      map.setConfigProperty('basemap', 'showRoadLabels', true);
      map.setConfigProperty('basemap', 'showTransitLabels', true);
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[#050505] overflow-hidden">
      {/* Header */}
      <header className="px-8 py-10 border-b border-white/5 shrink-0">
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

      {/* Split Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* List */}
        <div className="w-1/2 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-4">
            {MOCK_RUNS.map((run, index) => (
              <motion.div
                key={run.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleRunClick(run)}
                onMouseEnter={() => setHoveredRunId(run.id)}
                onMouseLeave={() => setHoveredRunId(null)}
                className={cn(
                  "w-full bg-[#0F172A]/40 backdrop-blur-xl border p-6 rounded-3xl flex items-center gap-6 transition-all group text-left cursor-pointer",
                  hoveredRunId === run.id ? "border-[#C0FF00]/50 shadow-[0_0_30px_rgba(192,255,0,0.1)]" : "border-white/5 hover:border-[#C0FF00]/30"
                )}
              >
                {/* Type Icon */}
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 shrink-0",
                  run.type === 'Tempo' ? "bg-blue-500/20 text-blue-400" :
                  run.type === 'Intervals' ? "bg-rose-500/20 text-rose-400" :
                  run.type === 'Long' ? "bg-amber-500/20 text-amber-400" :
                  "bg-emerald-500/20 text-emerald-400"
                )}>
                  {run.type === 'Tempo' ? <Zap className="w-6 h-6" /> :
                   run.type === 'Intervals' ? <TrendingUp className="w-6 h-6" /> :
                   run.type === 'Long' ? <Activity className="w-6 h-6" /> :
                   <Activity className="w-6 h-6" />}
                </div>

                {/* Main Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-black italic tracking-tight text-white group-hover:text-[#C0FF00] transition-colors truncate">
                      {run.title}
                    </h3>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shrink-0",
                      run.type === 'Tempo' ? "bg-blue-500/20 text-blue-400" :
                      run.type === 'Intervals' ? "bg-rose-500/20 text-rose-400" :
                      run.type === 'Long' ? "bg-amber-500/20 text-amber-400" :
                      "bg-emerald-500/20 text-emerald-400"
                    )}>
                      {run.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span className="truncate">{run.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{run.location}</span>
                    </div>
                  </div>
                </div>

                {/* Stats Grid - Simplified for split view */}
                <div className="flex gap-6 px-6 border-x border-white/5 shrink-0">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Dist</span>
                    <span className="text-base font-black italic text-white">{run.distance}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Pace</span>
                    <span className="text-base font-black italic text-emerald-400">{run.pace.split(' ')[0]}</span>
                  </div>
                </div>

                {/* Action */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRun(run.id);
                  }}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#C0FF00] group-hover:text-black transition-all shrink-0"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="w-1/2 relative border-l border-white/5">
          <Map
            ref={mapRef}
            onLoad={onMapLoad}
            onMouseDown={stopAnimation}
            onTouchStart={stopAnimation}
            onWheel={stopAnimation}
            mapboxAccessToken={MAPBOX_TOKEN}
            initialViewState={{
              longitude: -0.1150,
              latitude: 51.5045,
              zoom: 15,
              pitch: 60,
              bearing: -20
            }}
            mapStyle="mapbox://styles/mapbox/standard"
            className="w-full h-full"
          >
            {MOCK_RUNS.map(run => (
              <Marker
                key={run.id}
                longitude={run.coordinates[0]}
                latitude={run.coordinates[1]}
                anchor="bottom"
                onClick={e => {
                  e.originalEvent.stopPropagation();
                  handleRunClick(run);
                }}
              >
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRunClick(run);
                  }}
                  className={cn(
                    "flex flex-col items-center transition-all duration-300 cursor-pointer",
                    hoveredRunId === run.id ? "scale-125 z-10" : "scale-100 z-0 opacity-70"
                  )}
                >
                  <div className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap mb-1 shadow-lg transition-colors",
                    hoveredRunId === run.id ? "bg-[#C0FF00] text-black" : "bg-[#1E293B] text-white"
                  )}>
                    {run.distance}
                  </div>
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 shadow-lg transition-colors",
                    hoveredRunId === run.id ? "bg-[#C0FF00] border-black" : "bg-[#1E293B] border-[#C0FF00]"
                  )} />
                </div>
              </Marker>
            ))}
          </Map>
          
          {/* Map Overlay Gradient */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(5,5,5,0.8)]" />
        </div>
      </div>
    </div>
  );
}
