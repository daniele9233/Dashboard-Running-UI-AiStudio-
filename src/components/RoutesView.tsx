import React, { useState, useMemo, useRef, useEffect } from 'react';
import Map, { Source, Layer, NavigationControl, Marker, Popup, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  Activity, 
  Mountain, 
  Timer, 
  Zap, 
  Heart, 
  Wind, 
  AlertTriangle, 
  Play, 
  Pause, 
  RotateCcw, 
  Layers, 
  ChevronRight, 
  ChevronLeft,
  Info,
  Target,
  Gauge,
  TrendingUp,
  Map as MapIcon,
  Search,
  Calendar
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Line
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

// --- ADVANCED MOCK DATA GENERATOR ---

const generateRunData = () => {
  const points = [];
  const startLat = 45.4642;
  const startLng = 9.1900; // Milan Duomo area
  const totalPoints = 100;
  
  for (let i = 0; i < totalPoints; i++) {
    const progress = i / (totalPoints - 1);
    // Create a slightly wavy path
    const lat = startLat + Math.sin(progress * 10) * 0.005 + progress * 0.02;
    const lng = startLng + Math.cos(progress * 8) * 0.005 + progress * 0.01;
    
    // Performance metrics
    const elevation = 120 + Math.sin(progress * 15) * 20 + (progress * 10);
    const heartRate = 140 + Math.sin(progress * 20) * 15 + (progress > 0.7 ? 20 : 0);
    const pace = 4.5 + Math.cos(progress * 12) * 0.5 + (elevation > 135 ? 0.8 : 0);
    const cadence = 175 + Math.random() * 10;
    const power = 250 + Math.sin(progress * 25) * 50;
    
    points.push({
      id: i,
      coordinates: [lng, lat] as [number, number],
      elevation,
      heartRate,
      pace, // min/km
      cadence,
      power,
      distance: progress * 10, // 10km total
      timestamp: i * 30 // 30s intervals
    });
  }
  return points;
};

const RUN_DATA = generateRunData();

const SPLITS = Array.from({ length: 10 }).map((_, i) => {
  const segment = RUN_DATA.slice(i * 10, (i + 1) * 10);
  const avgPace = segment.reduce((acc, p) => acc + p.pace, 0) / segment.length;
  const avgHR = segment.reduce((acc, p) => acc + p.heartRate, 0) / segment.length;
  const elevGain = Math.max(0, segment[segment.length - 1].elevation - segment[0].elevation);
  
  return {
    km: i + 1,
    pace: avgPace.toFixed(2),
    hr: Math.round(avgHR),
    elevation: `+${Math.round(elevGain)}m`,
    gap: (avgPace - (elevGain > 5 ? 0.2 : 0)).toFixed(2), // Grade Adjusted Pace
    intensity: avgHR > 165 ? 'high' : avgHR > 150 ? 'med' : 'low'
  };
});

// --- COMPONENTS ---

const GlassPanel = ({ children, className, title, icon: Icon }: any) => (
  <div className={cn(
    "bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl",
    className
  )}>
    {title && (
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-4 h-4 text-[#C0FF00]" />}
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{title}</h3>
        </div>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#C0FF00]/50" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#C0FF00]/20" />
        </div>
      </div>
    )}
    <div className="p-6">
      {children}
    </div>
  </div>
);

export function RoutesView({ runId }: { runId?: string | null }) {
  const mapRef = useRef<MapRef>(null);
  const [activeSplit, setActiveSplit] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [mapMode, setMapMode] = useState<'pace' | 'hr' | 'elevation'>('pace');
  const [showInjuryRisk, setShowInjuryRisk] = useState(false);
  const [showGhostRunner, setShowGhostRunner] = useState(false);
  const [showVO2Max, setShowVO2Max] = useState(false);
  const [showAnaerobic, setShowAnaerobic] = useState(false);
  const [showCadenceHeatmap, setShowCadenceHeatmap] = useState(false);
  const [mapTooltip, setMapTooltip] = useState<any>(null);
  const [drawProgress, setDrawProgress] = useState(0);

  // Find run title if runId exists (mock)
  const runTitle = runId === '1' ? 'MORNING TEMPO 14K' : 
                 runId === '2' ? 'EASY RECOVERY LOOP' :
                 runId === '3' ? 'INTERVAL SESSION: 8X800M' :
                 'MORNING TEMPO 14K';

  // Progressive Reveal Animation
  useEffect(() => {
    const duration = 2000; // 2 seconds
    const start = performance.now();
    const animate = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      setDrawProgress(progress);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [runId]);

  // Replay Logic with Pace-adjusted speed
  useEffect(() => {
    let timeout: any;
    if (isPlaying) {
      const currentPoint = RUN_DATA[playbackIndex];
      // Faster pace (lower min/km) means shorter delay
      const delay = Math.max(50, currentPoint.pace * 20); 
      timeout = setTimeout(() => {
        setPlaybackIndex(prev => (prev + 1) % RUN_DATA.length);
      }, delay);
    }
    return () => clearTimeout(timeout);
  }, [isPlaying, playbackIndex]);

  // Sync map with playback
  useEffect(() => {
    if (isPlaying && mapRef.current) {
      const point = RUN_DATA[playbackIndex];
      mapRef.current.easeTo({
        center: point.coordinates,
        duration: 800,
        zoom: 15.5,
        pitch: 60,
        bearing: (playbackIndex * 2) % 360
      });
    }
  }, [playbackIndex, isPlaying]);

  const routeGeoJSON: any = useMemo(() => ({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: RUN_DATA.map(p => p.coordinates)
        },
        properties: {}
      }
    ]
  }), []);

  // Ghost Runner Data (slightly faster than current)
  const ghostIndex = Math.min(RUN_DATA.length - 1, Math.floor(playbackIndex * 1.08));
  const ghostPoint = RUN_DATA[ghostIndex];

  // Segmented lines for gradient effect and dynamic thickness
  const segmentedLines: any = useMemo(() => ({
    type: 'FeatureCollection',
    features: RUN_DATA.slice(0, Math.floor(RUN_DATA.length * drawProgress)).slice(0, -1).map((p, i) => {
      const next = RUN_DATA[i + 1];
      let color = '#3B82F6'; // Default blue
      
      if (mapMode === 'pace') {
        color = p.pace < 4.2 ? '#10B981' : p.pace < 4.8 ? '#3B82F6' : '#F59E0B';
      } else if (mapMode === 'hr') {
        color = p.heartRate > 170 ? '#EF4444' : p.heartRate > 155 ? '#F59E0B' : '#10B981';
      } else if (mapMode === 'elevation') {
        color = next.elevation > p.elevation ? '#EF4444' : '#10B981';
      }

      // Dynamic thickness based on cadence or heart rate
      const thickness = mapMode === 'hr' ? (p.heartRate - 130) / 4 : (p.cadence - 160) / 3;

      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [p.coordinates, next.coordinates]
        },
        properties: {
          color,
          width: Math.max(2, thickness),
          id: i,
          vo2: p.heartRate > 165 ? '#A855F7' : 'transparent',
          anaerobic: p.heartRate > 175 ? '#F43F5E' : 'transparent',
          cadenceHeat: `rgba(234, 179, 8, ${Math.max(0, (p.cadence - 170) / 20)})`,
          injuryRisk: (p.heartRate > 180 || p.pace < 3.5) ? '#EF4444' : 'transparent'
        }
      };
    })
  }), [mapMode, drawProgress]);

  const playbackPoint = RUN_DATA[playbackIndex];

  const handleMapHover = (e: any) => {
    if (e.features && e.features.length > 0) {
      const feature = e.features[0];
      const pointIndex = feature.properties.id;
      const point = RUN_DATA[pointIndex];
      setMapTooltip({
        lngLat: e.lngLat,
        data: point
      });
    } else {
      setMapTooltip(null);
    }
  };

  return (
    <main className="flex-1 relative h-full overflow-hidden bg-[#020202] font-sans">
      {/* PRIMARY UI LAYER: THE MAP */}
      <div className="absolute inset-0 z-0">
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: 9.195,
            latitude: 45.47,
            zoom: 13.5,
            pitch: 45
          }}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          style={{ width: '100%', height: '100%' }}
          terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
          interactiveLayerIds={['route-lines']}
          onMouseMove={handleMapHover}
          onMouseLeave={() => setMapTooltip(null)}
        >
          {/* Main Route Path */}
          <Source id="route-segments" type="geojson" data={segmentedLines}>
            <Layer
              id="route-lines"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': ['get', 'color'],
                'line-width': ['get', 'width'],
                'line-opacity': 0.9
              }}
            />
            {showVO2Max && (
              <Layer
                id="vo2-zones"
                type="line"
                paint={{
                  'line-color': ['get', 'vo2'],
                  'line-width': 15,
                  'line-blur': 12,
                  'line-opacity': 0.7
                }}
              />
            )}
            {showAnaerobic && (
              <Layer
                id="anaerobic-zones"
                type="line"
                paint={{
                  'line-color': ['get', 'anaerobic'],
                  'line-width': 18,
                  'line-blur': 15,
                  'line-opacity': 0.8
                }}
              />
            )}
            {showCadenceHeatmap && (
              <Layer
                id="cadence-heatmap"
                type="line"
                paint={{
                  'line-color': ['get', 'cadenceHeat'],
                  'line-width': 25,
                  'line-blur': 20,
                  'line-opacity': 0.5
                }}
              />
            )}
            {showInjuryRisk && (
              <Layer
                id="injury-risk-zones"
                type="line"
                paint={{
                  'line-color': ['get', 'injuryRisk'],
                  'line-width': 20,
                  'line-blur': 10,
                  'line-opacity': 0.6
                }}
              />
            )}
            <Layer
              id="route-glow"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': ['get', 'color'],
                'line-width': ['*', ['get', 'width'], 4],
                'line-blur': 15,
                'line-opacity': 0.3
              }}
            />
          </Source>

          {/* Ghost Runner Path */}
          {showGhostRunner && (
            <Source id="ghost-path" type="geojson" data={routeGeoJSON}>
              <Layer
                id="ghost-line"
                type="line"
                paint={{
                  'line-color': '#FFF',
                  'line-width': 1.5,
                  'line-dasharray': [4, 4],
                  'line-opacity': 0.2
                }}
              />
            </Source>
          )}

          {/* KM Markers */}
          {SPLITS.map((split, i) => {
            const point = RUN_DATA[i * 10];
            return (
              <Marker key={split.km} longitude={point.coordinates[0]} latitude={point.coordinates[1]}>
                <div className={cn(
                  "flex flex-col items-center transition-all duration-500",
                  activeSplit === split.km ? "scale-125" : "scale-100 opacity-60"
                )}>
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 px-2 py-1 rounded-md text-[8px] font-black text-white mb-1 shadow-xl">
                    {split.km} KM
                  </div>
                  <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                </div>
              </Marker>
            );
          })}

          {/* Start/End Markers */}
          <Marker longitude={RUN_DATA[0].coordinates[0]} latitude={RUN_DATA[0].coordinates[1]}>
            <div className="relative group">
              <div className="absolute inset-0 animate-ping bg-emerald-500 rounded-full opacity-20" />
              <div className="w-5 h-5 bg-emerald-500 rounded-full border-2 border-white shadow-2xl flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
          </Marker>
          <Marker longitude={RUN_DATA[RUN_DATA.length-1].coordinates[0]} latitude={RUN_DATA[RUN_DATA.length-1].coordinates[1]}>
            <div className="w-5 h-5 bg-rose-500 rounded-full border-2 border-white shadow-2xl flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
          </Marker>

          {/* Replay Dot */}
          {isPlaying && (
            <Marker longitude={playbackPoint.coordinates[0]} latitude={playbackPoint.coordinates[1]}>
              <div className="relative">
                <div className="absolute -inset-6 animate-pulse bg-blue-500/30 rounded-full" />
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.6)] border-2 border-blue-500">
                  <Activity className="w-4 h-4 text-blue-500" />
                </div>
              </div>
            </Marker>
          )}

          {/* Ghost Runner Dot */}
          {isPlaying && showGhostRunner && (
            <Marker longitude={ghostPoint.coordinates[0]} latitude={ghostPoint.coordinates[1]}>
              <div className="relative opacity-40">
                <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center shadow-xl border border-white/50">
                  <Target className="w-3 h-3 text-white" />
                </div>
              </div>
            </Marker>
          )}

          {/* Map Tooltip */}
          {mapTooltip && (
            <Popup
              longitude={mapTooltip.lngLat.lng}
              latitude={mapTooltip.lngLat.lat}
              closeButton={false}
              anchor="bottom"
              offset={15}
            >
              <div className="bg-[#0F172A]/95 backdrop-blur-xl border border-white/20 p-3 rounded-xl shadow-2xl min-w-[120px]">
                <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-1">Geospatial Intel</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-gray-400">PACE</span>
                    <span className="text-xs font-black italic text-emerald-400">{mapTooltip.data.pace.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-gray-400">GAP</span>
                    <span className="text-xs font-black italic text-blue-400">{(mapTooltip.data.pace - 0.15).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-gray-400">ELEV</span>
                    <span className="text-xs font-black italic text-amber-400">{Math.round(mapTooltip.data.elevation)}m</span>
                  </div>
                </div>
              </div>
            </Popup>
          )}

          {/* Active Split Highlight */}
          {activeSplit !== null && (
            <Source id="active-split" type="geojson" data={{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: RUN_DATA.slice((activeSplit-1)*10, activeSplit*10).map(p => p.coordinates)
              },
              properties: {}
            }}>
              <Layer
                id="split-highlight"
                type="line"
                paint={{
                  'line-color': '#FFF',
                  'line-width': 12,
                  'line-blur': 5,
                  'line-opacity': 0.4
                }}
              />
            </Source>
          )}
        </Map>
      </div>

      {/* OVERLAY: LEFT PANEL (SESSION ANALYTICS) */}
      <div className="absolute top-8 left-8 bottom-8 w-[340px] pointer-events-none flex flex-col gap-4">
        <GlassPanel title="SESSION ANALYTICS" icon={Gauge} className="pointer-events-auto flex-1 flex flex-col">
          <div className="mb-6">
            <h2 className="text-2xl font-black italic tracking-tighter text-white mb-1 uppercase">{runTitle}</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              <Calendar className="w-3 h-3" />
              <span>MARCH 26, 2026 • MILAN, ITALY</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="grid grid-cols-4 text-[8px] font-black uppercase tracking-[0.2em] text-gray-600 mb-4 px-2">
              <span className="col-span-1">KM</span>
              <span className="col-span-1">PACE</span>
              <span className="col-span-1">GAP</span>
              <span className="col-span-1 text-right">ELEV</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1">
              {SPLITS.map((split) => (
                <button
                  key={split.km}
                  onMouseEnter={() => setActiveSplit(split.km)}
                  onMouseLeave={() => setActiveSplit(null)}
                  className={cn(
                    "w-full grid grid-cols-4 items-center p-3 rounded-xl border transition-all group relative overflow-hidden",
                    activeSplit === split.km 
                      ? "bg-[#C0FF00]/10 border-[#C0FF00]/30" 
                      : "bg-white/5 border-transparent hover:border-white/10"
                  )}
                >
                  <span className="text-[10px] font-black text-gray-500">{split.km.toString().padStart(2, '0')}</span>
                  <span className="text-xs font-black italic text-white">{split.pace}</span>
                  <span className="text-xs font-black italic text-blue-400">{split.gap}</span>
                  <span className="text-xs font-black italic text-amber-400 text-right">{split.elevation}</span>
                </button>
              ))}
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* OVERLAY: RIGHT PANEL (TOGGLES) */}
      <div className="absolute top-8 right-8 w-[240px] pointer-events-none flex flex-col gap-4">
        <GlassPanel title="DATA OVERLAYS" icon={Layers} className="pointer-events-auto">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">VO2 MAX ZONES</span>
              <button 
                onClick={() => setShowVO2Max(!showVO2Max)}
                className={cn(
                  "w-10 h-5 rounded-full transition-all relative",
                  showVO2Max ? "bg-[#C0FF00]" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-3 h-3 rounded-full transition-all",
                  showVO2Max ? "right-1 bg-black" : "left-1 bg-gray-500"
                )} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">INJURY RISK</span>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">LOW</span>
                <button 
                  onClick={() => setShowInjuryRisk(!showInjuryRisk)}
                  className={cn(
                    "w-10 h-5 rounded-full transition-all relative",
                    showInjuryRisk ? "bg-rose-500" : "bg-white/10"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-3 h-3 rounded-full transition-all",
                    showInjuryRisk ? "right-1 bg-white" : "left-1 bg-gray-500"
                  )} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">GHOST RUNNER</span>
              <button 
                onClick={() => setShowGhostRunner(!showGhostRunner)}
                className={cn(
                  "w-10 h-5 rounded-full transition-all relative",
                  showGhostRunner ? "bg-blue-500" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-3 h-3 rounded-full transition-all",
                  showGhostRunner ? "right-1 bg-white" : "left-1 bg-gray-500"
                )} />
              </button>
            </div>
          </div>
        </GlassPanel>

        <div className="bg-[#0F172A]/90 backdrop-blur-2xl border border-white/10 p-5 rounded-3xl flex flex-col gap-3 shadow-2xl pointer-events-auto">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Route Health</span>
            <Activity className="w-3 h-3 text-[#C0FF00]" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-bold text-gray-500 uppercase">GPS Accuracy</span>
              <span className="text-[10px] font-black text-[#C0FF00]">98%</span>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="w-[98%] h-full bg-[#C0FF00]" />
            </div>
          </div>
        </div>
      </div>

      {/* OVERLAY: BOTTOM ANALYTICS */}
      <div className="absolute bottom-8 left-[380px] right-8 pointer-events-none">
        <GlassPanel className="pointer-events-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <button onClick={() => setPlaybackIndex(Math.max(0, playbackIndex - 5))} className="text-gray-500 hover:text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-12 h-12 rounded-full bg-[#C0FF00] flex items-center justify-center hover:bg-[#A8E600] transition-all shadow-[0_0_20px_rgba(192,255,0,0.3)] group"
                >
                  {isPlaying ? <Pause className="w-5 h-5 text-black" /> : <Play className="w-5 h-5 text-black ml-1" />}
                </button>
                <button onClick={() => setPlaybackIndex(Math.min(RUN_DATA.length - 1, playbackIndex + 5))} className="text-gray-500 hover:text-white transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <div className="h-10 w-[1px] bg-white/5 mx-2" />

              <div className="flex flex-col">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">ELEVATION PROFILE</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black italic text-white tracking-tighter">142m</span>
                  <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">TOTAL GAIN</span>
                </div>
              </div>

              <div className="flex flex-col ml-8">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">AVG GRADE</span>
                <span className="text-xl font-black italic text-[#C0FF00] tracking-tighter">2.4%</span>
              </div>
            </div>

            <div className="flex gap-10">
              <div className="text-right">
                <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">PACE</div>
                <div className="text-xl font-black italic text-white tracking-tight">{playbackPoint.pace.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">HEART RATE</div>
                <div className="text-xl font-black italic text-rose-500 tracking-tight">{Math.round(playbackPoint.heartRate)}</div>
              </div>
              <div className="text-right">
                <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">CADENCE</div>
                <div className="text-xl font-black italic text-amber-500 tracking-tight">{Math.round(playbackPoint.cadence)}</div>
              </div>
            </div>
          </div>

          <div className="h-20 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={RUN_DATA} onMouseMove={(e) => e.activeTooltipIndex !== undefined && setPlaybackIndex(e.activeTooltipIndex)}>
                <defs>
                  <linearGradient id="colorElev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C0FF00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#C0FF00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="distance" hide />
                <YAxis hide />
                <Tooltip content={() => null} cursor={{ stroke: '#C0FF00', strokeWidth: 1 }} />
                <Area 
                  type="monotone" 
                  dataKey="elevation" 
                  stroke="#C0FF00" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorElev)" 
                  animationDuration={1000}
                />
                <ReferenceLine x={RUN_DATA[playbackIndex].distance} stroke="#FFF" strokeWidth={1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
