import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Map, { Source, Layer, Marker, useMap, Popup } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf';
import { Play, Pause, Activity, MapPin, Clock, Zap, Target, ChevronRight, RefreshCcw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { cn } from '../lib/utils';

// --- COMPONENTS ---

const GlassPanel = ({ children, className, title, icon: Icon }: any) => (
  <div className={cn(
    "bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl",
    className
  )}>
    {title && (
      <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
        {Icon && <Icon className="w-4 h-4 text-[#C0FF00]" />}
        <h3 className="text-xs font-black uppercase tracking-widest text-white/80">{title}</h3>
      </div>
    )}
    <div className="p-6">
      {children}
    </div>
  </div>
);

export function RoutesView({ mapboxToken }: { mapboxToken: string }) {
  const mapRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [mapMode, setMapMode] = useState<'pace' | 'hr' | 'elevation'>('pace');
  const [mapTooltip, setMapTooltip] = useState<any>(null);
  const [activeSplit, setActiveSplit] = useState<number | null>(null);
  const [showGhostRunner, setShowGhostRunner] = useState(true);
  const [currentBearing, setCurrentBearing] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  const [runData, setRunData] = useState<any[] | null>(null);
  const [splits, setSplits] = useState<any[]>([]);

  // Fetch real road-snapped route
  useEffect(() => {
    async function loadRealRoute() {
      try {
        // Waypoints for a loop around Rome (Colosseum -> Termini -> Piazza Venezia -> Colosseum)
        const waypoints = [
          "12.4905,41.8892", // Colosseum south
          "12.4965,41.8895", // Via Labicana
          "12.5050,41.8890", // Viale Manzoni
          "12.5010,41.9010", // Termini
          "12.4930,41.9000", // Via Nazionale
          "12.4830,41.8960", // Piazza Venezia
          "12.4905,41.8892"  // Back to Colosseum
        ].join(';');

        const url = `https://api.mapbox.com/directions/v5/mapbox/cycling/${waypoints}?geometries=geojson&access_token=${mapboxToken}`;
        const res = await fetch(url);
        const json = await res.json();

        if (!json.routes || json.routes.length === 0) {
          throw new Error("No route found");
        }

        const coords = json.routes[0].geometry.coordinates;
        const routeLine = turf.lineString(coords);
        const totalLengthKm = turf.length(routeLine, { units: 'kilometers' });
        
        const totalPoints = 1000;
        const points: any[] = [];

        for (let i = 0; i < totalPoints; i++) {
          const progress = i / (totalPoints - 1);
          const distanceAlong = progress * totalLengthKm;
          const pointAlong = turf.along(routeLine, distanceAlong, { units: 'kilometers' });
          const [lng, lat] = pointAlong.geometry.coordinates;
          
          let baseElev = 20;
          if (progress > 0.35 && progress < 0.65) {
              baseElev += Math.sin((progress - 0.35) * Math.PI / 0.3) * 40;
          }
          
          const elevation = baseElev + Math.random() * 2;
          const heartRate = 140 + (elevation > 30 ? 25 : 0) + Math.random() * 10;
          const pace = 4.5 + (elevation > 30 ? 1.0 : 0) + Math.random() * 0.5;
          const cadence = 175 + Math.random() * 10;
          const power = 250 + (elevation > 30 ? 50 : 0) + Math.random() * 20;
          
          points.push({
            id: i,
            coordinates: [lng, lat] as [number, number],
            elevation,
            heartRate,
            pace,
            cadence,
            power,
            distance: distanceAlong,
            timestamp: i * 30
          });
        }

        setRunData(points);

        // Generate Splits
        const newSplits = Array.from({ length: Math.ceil(points[points.length - 1].distance) }).map((_, i) => {
          const segment = points.filter(p => p.distance >= i && p.distance < i + 1);
          if (segment.length === 0) return null;
          const avgPace = segment.reduce((acc, p) => acc + p.pace, 0) / segment.length;
          const avgHR = segment.reduce((acc, p) => acc + p.heartRate, 0) / segment.length;
          const elevGain = Math.max(0, segment[segment.length - 1].elevation - segment[0].elevation);
          
          return {
            km: i + 1,
            pace: avgPace.toFixed(2),
            hr: Math.round(avgHR),
            elevation: `+${Math.round(elevGain)}m`,
            gap: (avgPace - (elevGain > 5 ? 0.2 : 0)).toFixed(2),
            intensity: avgHR > 165 ? 'high' : avgHR > 150 ? 'med' : 'low'
          };
        }).filter(Boolean) as any[];

        setSplits(newSplits);

      } catch (error) {
        console.error("Failed to load real route:", error);
      }
    }

    loadRealRoute();
  }, [mapboxToken]);

  // Calculate total distance for the progress bar
  const totalDistance = runData ? runData[runData.length - 1].distance : 0;
  const drawProgress = runData ? playbackIndex / (runData.length - 1) : 0;

  const playbackPoint = useMemo(() => {
    if (!runData || runData.length === 0) return null;
    
    // Handle NaN or invalid playbackIndex
    if (typeof playbackIndex !== 'number' || isNaN(playbackIndex)) {
      return runData[0];
    }

    const i = Math.floor(playbackIndex);
    const f = playbackIndex - i;
    
    if (i >= runData.length - 1) return runData[runData.length - 1];
    if (i < 0) return runData[0];
    
    const p1 = runData[i];
    const p2 = runData[i + 1];
    
    if (!p1 || !p2) return runData[0];
    
    return {
      ...p1,
      distance: p1.distance + (p2.distance - p1.distance) * f,
      pace: p1.pace + (p2.pace - p1.pace) * f,
      heartRate: p1.heartRate + (p2.heartRate - p1.heartRate) * f,
      coordinates: [
        p1.coordinates[0] + (p2.coordinates[0] - p1.coordinates[0]) * f,
        p1.coordinates[1] + (p2.coordinates[1] - p1.coordinates[1]) * f
      ]
    };
  }, [playbackIndex, runData]);

  const currentDistance = playbackPoint ? playbackPoint.distance : 0;

  // Map Load Configuration
  const onMapLoad = useCallback((e: any) => {
    const map = e.target;

    // Initial fit to bounds
    if (runData) {
      const coordinates = runData.map(p => p.coordinates);
      const bounds = coordinates.reduce((bounds, coord) => {
        return bounds.extend(coord as [number, number]);
      }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

      map.fitBounds(bounds, {
        padding: 50,
        pitch: 45,
        bearing: -20,
        duration: 2000
      });
    }
  }, [runData]);

  // Handle Play/Pause
  const togglePlayback = () => {
    if (!runData) return;
    if (playbackIndex >= runData.length - 1) {
      setPlaybackIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  // Stop playback on manual map interaction
  const handleMapInteraction = () => {
    if (isPlaying) setIsPlaying(false);
  };

  // Animation Loop
  useEffect(() => {
    let animationFrame: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      if (!isPlaying) return;

      const deltaTime = time - lastTime;
      lastTime = time;
      
      setPlaybackIndex(prev => {
        if (!runData) return prev;
        // Advance by 15 points per second for a nice speed
        const nextIndex = prev + (deltaTime / 1000) * 15 * playbackSpeed;
        return Math.min(nextIndex, runData.length - 1);
      });
      
      animationFrame = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      lastTime = performance.now();
      animationFrame = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, runData, playbackSpeed]);

  // Stop playback when reaching the end
  useEffect(() => {
    if (isPlaying && runData && playbackIndex >= runData.length - 1) {
      setIsPlaying(false);
    }
  }, [playbackIndex, runData, isPlaying]);

  // Camera Sync - Calculate Bearing
  useEffect(() => {
    if (isPlaying && runData && playbackPoint) {
      const i = Math.floor(playbackIndex);
      const next = runData[Math.min(i + 15, runData.length - 1)]; // Look further ahead for smoother bearing
      
      const targetBearing = turf.bearing(
        turf.point(playbackPoint.coordinates),
        turf.point(next.coordinates)
      );

      setCurrentBearing(prev => {
        // Smooth interpolation for bearing
        const delta = ((targetBearing - prev + 540) % 360) - 180;
        return prev + delta * 0.08; // Smoothing factor
      });
    }
  }, [playbackIndex, isPlaying, runData, playbackPoint]);

  // Camera Sync - Update Map
  useEffect(() => {
    if (isPlaying && mapRef.current && playbackPoint) {
      mapRef.current.jumpTo({
        center: playbackPoint.coordinates,
        bearing: currentBearing,
        pitch: 70, // Bird's-eye view angle
        zoom: 18 // Closer zoom for navigation feel
      });
    }
  }, [currentBearing, playbackPoint, isPlaying]);

  // GeoJSON Data
  const fullRouteGeoJSON: any = useMemo(() => {
    if (!runData) return null;
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: runData.map(p => p.coordinates)
      }
    };
  }, [runData]);

  const completedRouteGeoJSON: any = useMemo(() => {
    if (!runData) return null;
    const i = Math.floor(playbackIndex);
    const coords = runData.slice(0, i + 1).map(p => p.coordinates);
    if (playbackPoint) {
      coords.push(playbackPoint.coordinates);
    }
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coords
      }
    };
  }, [playbackIndex, runData, playbackPoint]);

  // Ghost Runner Data (slightly faster than current)
  const ghostIndex = runData ? Math.min(runData.length - 1, Math.floor(playbackIndex * 1.08)) : 0;
  const ghostPoint = runData ? runData[ghostIndex] : null;

  const handleMapHover = (e: any) => {
    if (e.features && e.features.length > 0 && runData) {
      const feature = e.features[0];
      const pointIndex = feature.properties.id;
      const point = runData[pointIndex];
      if (point) {
        setMapTooltip({
          lngLat: e.lngLat,
          data: point
        });
      }
    } else {
      setMapTooltip(null);
    }
  };

  if (!runData || splits.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-[#050505] text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#C0FF00] border-t-transparent rounded-full animate-spin" />
          <div className="text-sm font-black tracking-widest uppercase text-gray-400">Loading GPS Telemetry...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#050505] text-white overflow-hidden font-sans">
      
      {/* LEFT PANEL: List & Stats (50%) */}
      <div className="w-1/2 h-full flex flex-col border-r border-white/10 z-10 relative shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
        
        {/* Header */}
        <div className="p-8 pb-6 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#C0FF00] animate-pulse" />
            <span className="text-[10px] font-black tracking-[0.2em] text-[#C0FF00] uppercase">Live Telemetry</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter mb-2">Morning Trail Run</h1>
          <p className="text-gray-400 font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Rome, Italy • 10.0 km
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6 custom-scrollbar">
          
          {/* Main Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <GlassPanel className="p-0">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Distance</div>
              <div className="text-3xl font-black italic tracking-tight">{currentDistance.toFixed(2)}<span className="text-lg text-gray-500 ml-1">km</span></div>
            </GlassPanel>
            <GlassPanel className="p-0">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Pace</div>
              <div className="text-3xl font-black italic tracking-tight">{playbackPoint?.pace?.toFixed(2) || '0.00'}<span className="text-lg text-gray-500 ml-1">/km</span></div>
            </GlassPanel>
            <GlassPanel className="p-0">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Heart Rate</div>
              <div className="text-3xl font-black italic tracking-tight text-rose-500">{Math.round(playbackPoint?.heartRate || 0)}<span className="text-lg text-gray-500 ml-1">bpm</span></div>
            </GlassPanel>
          </div>

          {/* Playback Controls */}
          <GlassPanel className="flex items-center gap-6">
            <button 
              onClick={togglePlayback}
              className="w-16 h-16 rounded-full bg-[#C0FF00] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(192,255,0,0.3)] shrink-0"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
            </button>
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex bg-white/5 p-1 rounded-lg">
                  {[0.5, 1, 2, 4].map(speed => (
                    <button 
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all min-w-[36px]",
                        playbackSpeed === speed 
                          ? "bg-[#C0FF00] text-black shadow-sm" 
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  {Math.round(drawProgress * 100)}%
                </div>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (rect.width > 0) {
                  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  setPlaybackIndex(percent * (runData!.length - 1));
                }
              }}>
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-[#C0FF00] transition-all duration-100 ease-linear"
                  style={{ width: `${drawProgress * 100}%` }}
                />
              </div>
            </div>
          </GlassPanel>

          {/* Elevation & Pace Chart */}
          <GlassPanel title="Elevation & Pace Profile" icon={Activity} className="p-0">
            <div className="h-48 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={runData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorElev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#0F172A]/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl">
                            <div className="text-[10px] font-bold text-gray-400 mb-1">KM {data.distance.toFixed(1)}</div>
                            <div className="text-sm font-black text-white">{Math.round(data.elevation)}m Elev</div>
                            <div className="text-sm font-black text-[#C0FF00]">{data.pace.toFixed(2)} /km</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="elevation" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorElev)" 
                  />
                  {/* Sync line with playback */}
                  <ReferenceLine x={playbackIndex} stroke="#C0FF00" strokeWidth={2} strokeDasharray="3 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>

          {/* Splits List */}
          <GlassPanel title="Kilometer Splits" icon={Clock} className="p-0">
            <div className="divide-y divide-white/5">
              {splits.map((split, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer group",
                    activeSplit === i && "bg-white/5"
                  )}
                  onMouseEnter={() => {
                    setActiveSplit(i);
                    // Optional: Fly to split on map
                    const splitPoint = runData?.find(p => p.distance >= split.km);
                    if (splitPoint && mapRef.current && !isPlaying) {
                      mapRef.current.flyTo({
                        center: splitPoint.coordinates,
                        zoom: 15,
                        pitch: 45,
                        duration: 1000
                      });
                    }
                  }}
                  onMouseLeave={() => setActiveSplit(null)}
                  onClick={() => {
                    const splitIndex = runData?.findIndex(p => p.distance >= split.km);
                    if (splitIndex !== undefined && splitIndex !== -1) {
                      setPlaybackIndex(splitIndex);
                      setIsPlaying(true);
                    }
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-black text-gray-400 group-hover:text-white transition-colors">
                      {split.km}
                    </div>
                    <div>
                      <div className="font-black italic text-lg">{split.pace}</div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">GAP {split.gap}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <div className={cn(
                        "font-black italic text-lg",
                        split.intensity === 'high' ? 'text-rose-500' : split.intensity === 'med' ? 'text-amber-500' : 'text-emerald-500'
                      )}>
                        {split.hr}
                      </div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">BPM</div>
                    </div>
                    <div className="w-16">
                      <div className="font-black italic text-lg text-blue-400">{split.elevation}</div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">ELEV</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

        </div>
      </div>

      {/* RIGHT PANEL: Mapbox 3D (50%) */}
      <div className="w-1/2 h-full relative bg-[#1A1A1A]">
        <Map
          ref={mapRef}
          mapboxAccessToken={mapboxToken}
          initialViewState={{
            longitude: runData[0].coordinates[0],
            latitude: runData[0].coordinates[1],
            zoom: 14,
            pitch: 45,
            bearing: -20
          }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          onLoad={onMapLoad}
          onDragStart={handleMapInteraction}
          onZoomStart={handleMapInteraction}
          onPitchStart={handleMapInteraction}
          interactiveLayerIds={['completed-route-interaction']}
          onMouseMove={handleMapHover}
          onMouseLeave={() => setMapTooltip(null)}
        >
          {/* 3D Buildings */}
          <Layer
            id="3d-buildings"
            source="composite"
            source-layer="building"
            filter={['==', 'extrude', 'true']}
            type="fill-extrusion"
            minzoom={15}
            paint={{
              'fill-extrusion-color': '#1f2937',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.6
            }}
          />

          {/* Full Route (Faded background line) */}
          <Source id="full-route" type="geojson" data={fullRouteGeoJSON}>
            <Layer
              id="full-route-line"
              type="line"
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
              paint={{
                'line-color': '#ffffff',
                'line-width': 4,
                'line-opacity': 0.15,
                'line-dasharray': [2, 2]
              }}
            />
          </Source>

          {/* Completed Route (Progressive drawing) */}
          <Source id="completed-route" type="geojson" data={completedRouteGeoJSON} lineMetrics={true}>
            {/* Casing (Outline) */}
            <Layer
              id="completed-route-casing"
              type="line"
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
              paint={{
                'line-color': '#000000',
                'line-width': 12,
                'line-opacity': 0.5
              }}
            />
            {/* Main Gradient Line */}
            <Layer
              id="completed-route-line"
              type="line"
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
              paint={{
                'line-width': 8,
                'line-gradient': [
                  'interpolate',
                  ['linear'],
                  ['line-progress'],
                  0, '#00E5FF',   // Cyan start
                  0.5, '#2979FF', // Blue middle
                  1, '#FF9100'    // Orange tip
                ]
              }}
            />
            {/* Invisible thicker line for easier hovering */}
            <Layer
              id="completed-route-interaction"
              type="line"
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
              paint={{
                'line-color': 'transparent',
                'line-width': 20
              }}
            />
          </Source>

          {/* Current Position Marker */}
          {playbackPoint && (
            <Marker 
              longitude={playbackPoint.coordinates[0]} 
              latitude={playbackPoint.coordinates[1]}
              anchor="center"
              rotationAlignment="map"
              pitchAlignment="map"
              rotation={currentBearing}
              style={{ zIndex: 50 }}
            >
              <div className="relative flex items-center justify-center drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
                <svg width="56" height="56" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 8L40 38L24 32L8 38L24 8Z" fill="white" stroke="#1A1A1A" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M24 8L40 38L24 32V8Z" fill="#E2E8F0" />
                </svg>
              </div>
            </Marker>
          )}

          {/* Ghost Runner Dot */}
          {isPlaying && showGhostRunner && ghostPoint && (
            <Marker longitude={ghostPoint.coordinates[0]} latitude={ghostPoint.coordinates[1]}>
              <div className="relative opacity-40">
                <div className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center shadow-xl border border-white/50">
                  <Target className="w-2 h-2 text-white" />
                </div>
              </div>
            </Marker>
          )}

          {/* Map Tooltip */}
          {mapTooltip && mapTooltip.data && (
            <Popup
              longitude={mapTooltip.lngLat.lng}
              latitude={mapTooltip.lngLat.lat}
              closeButton={false}
              anchor="bottom"
              offset={15}
              className="pointer-events-none"
            >
              <div className="bg-[#0F172A]/95 backdrop-blur-xl border border-white/20 p-3 rounded-xl shadow-2xl min-w-[120px]">
                <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-1">Geospatial Intel</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-gray-400">PACE</span>
                    <span className="text-xs font-black italic text-emerald-400">{mapTooltip.data.pace?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-gray-400">GAP</span>
                    <span className="text-xs font-black italic text-blue-400">{((mapTooltip.data.pace || 0) - 0.15).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-gray-400">ELEV</span>
                    <span className="text-xs font-black italic text-amber-400">{Math.round(mapTooltip.data.elevation || 0)}m</span>
                  </div>
                </div>
              </div>
            </Popup>
          )}
        </Map>

        {/* Map Overlays (Top Right) */}
        <div className="absolute top-6 right-6 flex flex-col gap-2">
          <div className="bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-xl flex flex-col gap-3">
            <button 
              onClick={() => {
                if (runData && runData.length > 0) {
                  mapRef.current?.flyTo({
                    center: runData[0].coordinates,
                    zoom: 14,
                    pitch: 45,
                    bearing: -20,
                    duration: 2000
                  });
                }
                setPlaybackIndex(0);
                setIsPlaying(false);
              }}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"
              title="Reset View"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowGhostRunner(!showGhostRunner)}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                showGhostRunner ? "bg-[#C0FF00]/20 text-[#C0FF00]" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              )}
              title="Toggle Ghost Runner"
            >
              <Target className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
