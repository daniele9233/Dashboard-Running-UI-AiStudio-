import React, { useState, useMemo, useRef, useEffect } from 'react';
import Map, { Source, Layer, NavigationControl, Marker, Popup, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Activity, Mountain, Timer, Zap, Heart, Wind, AlertTriangle,
  Play, Pause, RotateCcw, Layers, ChevronRight, ChevronLeft,
  Info, Target, Gauge, TrendingUp, Map as MapIcon, Search, Calendar
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ComposedChart, Line
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useApi } from '../hooks/useApi';
import { getRun, getRunSplits } from '../api';
import type { Run, Split } from '../types/api';

// ── Polyline decoder (Google algorithm) ──────────────────────────────────────
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte: number;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push([lng / 1e5, lat / 1e5]); // [lng, lat] for maplibre
  }
  return points;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).toUpperCase();
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  const s = Math.round((minutes % 1) * 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function paceToSeconds(pace: string): number {
  const parts = pace.split(':');
  return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
}

// ── Components ───────────────────────────────────────────────────────────────

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
    <div className="p-6">{children}</div>
  </div>
);

// ── Main View ────────────────────────────────────────────────────────────────

export function RoutesView({ runId }: { runId?: string | null }) {
  const mapRef = useRef<MapRef>(null);
  const [activeSplit, setActiveSplit] = useState<number | null>(null);
  const [mapMode, setMapMode] = useState<'pace' | 'hr' | 'elevation'>('pace');
  const [drawProgress, setDrawProgress] = useState(0);

  // Fetch real run data
  const { data: run, loading, error } = useApi<Run>(() => getRun(runId ?? ''));

  // Decode polyline
  const routeCoords = useMemo(() => {
    if (!run) return [];
    const poly = (run as any).polyline;
    if (poly) return decodePolyline(poly);
    return [];
  }, [run]);

  const splits: Split[] = run?.splits ?? [];

  // Calculate map center from route
  const center = useMemo(() => {
    if (routeCoords.length === 0) {
      const sl = (run as any)?.start_latlng;
      if (sl && sl.length === 2) return { lng: sl[1], lat: sl[0] };
      return { lng: 9.19, lat: 45.46 };
    }
    const mid = routeCoords[Math.floor(routeCoords.length / 2)];
    return { lng: mid[0], lat: mid[1] };
  }, [routeCoords, run]);

  // Calculate bounds
  const bounds = useMemo(() => {
    if (routeCoords.length < 2) return null;
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const [lng, lat] of routeCoords) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return { minLng, maxLng, minLat, maxLat };
  }, [routeCoords]);

  // Animate route drawing
  useEffect(() => {
    const duration = 2000;
    const start = performance.now();
    const animate = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      setDrawProgress(progress);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [runId, routeCoords]);

  // Fit map to route bounds
  useEffect(() => {
    if (bounds && mapRef.current && routeCoords.length > 0) {
      const pad = 0.002;
      mapRef.current.fitBounds(
        [[bounds.minLng - pad, bounds.minLat - pad], [bounds.maxLng + pad, bounds.maxLat + pad]],
        { padding: { top: 80, bottom: 120, left: 380, right: 280 }, pitch: 45, duration: 1500 }
      );
    }
  }, [bounds, routeCoords]);

  // Build GeoJSON for the route
  const visibleCoords = routeCoords.slice(0, Math.floor(routeCoords.length * drawProgress));

  const segmentedLines: any = useMemo(() => {
    if (visibleCoords.length < 2) return { type: 'FeatureCollection', features: [] };

    // Distribute splits across route points
    const totalSplits = splits.length || 1;

    return {
      type: 'FeatureCollection',
      features: visibleCoords.slice(0, -1).map((coord, i) => {
        const next = visibleCoords[i + 1];
        const splitIdx = Math.min(Math.floor((i / visibleCoords.length) * totalSplits), totalSplits - 1);
        const split = splits[splitIdx];

        let color = '#3B82F6';
        if (split) {
          const paceSec = paceToSeconds(split.pace);
          if (mapMode === 'pace') {
            color = paceSec < 270 ? '#10B981' : paceSec < 330 ? '#3B82F6' : '#F59E0B';
          } else if (mapMode === 'hr') {
            const hr = split.hr ?? 150;
            color = hr > 170 ? '#EF4444' : hr > 155 ? '#F59E0B' : '#10B981';
          } else if (mapMode === 'elevation') {
            const elDiff = split.elevation_difference ?? 0;
            color = elDiff > 0 ? '#EF4444' : '#10B981';
          }
        }

        return {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [coord, next] },
          properties: { color, width: 4, id: i },
        };
      }),
    };
  }, [visibleCoords, splits, mapMode]);

  // Run title from notes
  const runTitle = run?.notes
    ? run.notes.replace('Importata da Strava: ', '').replace(/(\s*\[Strava:[^\]]*\])+/g, '').trim() || `Run ${run.distance_km?.toFixed(1)} km`
    : `Run ${run?.distance_km?.toFixed(1) ?? '—'} km`;

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center bg-[#020202]">
        <div className="text-gray-500 text-sm font-black uppercase tracking-widest animate-pulse">Loading run data...</div>
      </main>
    );
  }

  if (error || !run) {
    return (
      <main className="flex-1 flex items-center justify-center bg-[#020202]">
        <div className="text-rose-400 text-sm font-bold">Errore nel caricamento della corsa</div>
      </main>
    );
  }

  return (
    <main className="flex-1 relative h-full overflow-hidden bg-[#020202] font-sans">
      {/* PRIMARY UI LAYER: THE MAP */}
      <div className="absolute inset-0 z-0">
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: center.lng,
            latitude: center.lat,
            zoom: 14,
            pitch: 45,
          }}
          mapStyle="https://tiles.openfreemap.org/styles/dark"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Route segments */}
          <Source id="route-segments" type="geojson" data={segmentedLines}>
            <Layer
              id="route-lines"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': ['get', 'color'],
                'line-width': ['get', 'width'],
                'line-opacity': 0.9,
              }}
            />
            <Layer
              id="route-glow"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': ['get', 'color'],
                'line-width': ['*', ['get', 'width'], 4],
                'line-blur': 15,
                'line-opacity': 0.3,
              }}
            />
          </Source>

          {/* KM Markers */}
          {splits.length > 0 && routeCoords.length > 0 && splits.map((split) => {
            const ptIdx = Math.min(
              Math.floor((split.km / (run.distance_km || 1)) * routeCoords.length),
              routeCoords.length - 1
            );
            const pt = routeCoords[ptIdx];
            if (!pt) return null;
            return (
              <Marker key={split.km} longitude={pt[0]} latitude={pt[1]}>
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

          {/* Start Marker */}
          {routeCoords.length > 0 && (
            <Marker longitude={routeCoords[0][0]} latitude={routeCoords[0][1]}>
              <div className="relative group">
                <div className="absolute inset-0 animate-ping bg-emerald-500 rounded-full opacity-20" />
                <div className="w-5 h-5 bg-emerald-500 rounded-full border-2 border-white shadow-2xl flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              </div>
            </Marker>
          )}

          {/* End Marker */}
          {routeCoords.length > 1 && (
            <Marker longitude={routeCoords[routeCoords.length - 1][0]} latitude={routeCoords[routeCoords.length - 1][1]}>
              <div className="w-5 h-5 bg-rose-500 rounded-full border-2 border-white shadow-2xl flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </Marker>
          )}

          {/* Active split highlight */}
          {activeSplit !== null && routeCoords.length > 0 && (
            <Source id="active-split" type="geojson" data={{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: routeCoords.slice(
                  Math.floor(((activeSplit - 1) / (run.distance_km || 1)) * routeCoords.length),
                  Math.floor((activeSplit / (run.distance_km || 1)) * routeCoords.length)
                ),
              },
              properties: {},
            }}>
              <Layer id="split-highlight" type="line" paint={{
                'line-color': '#FFF', 'line-width': 12, 'line-blur': 5, 'line-opacity': 0.4,
              }} />
            </Source>
          )}

          <NavigationControl position="top-right" />
        </Map>
      </div>

      {/* OVERLAY: LEFT PANEL (SESSION ANALYTICS) */}
      <div className="absolute top-8 left-8 bottom-8 w-[340px] pointer-events-none flex flex-col gap-4">
        <GlassPanel title="SESSION ANALYTICS" icon={Gauge} className="pointer-events-auto flex-1 flex flex-col">
          <div className="mb-6">
            <h2 className="text-2xl font-black italic tracking-tighter text-white mb-1 uppercase">{runTitle}</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              <Calendar className="w-3 h-3" />
              <span>{run.date ? formatDate(run.date) : '—'}</span>
              {run.location && <><span>•</span><span>{run.location}</span></>}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Distance</div>
              <div className="text-lg font-black italic text-white">{run.distance_km?.toFixed(2)}</div>
              <div className="text-[8px] font-black text-gray-600">KM</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Time</div>
              <div className="text-lg font-black italic text-white">{formatDuration(run.duration_minutes)}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Avg Pace</div>
              <div className="text-lg font-black italic text-emerald-400">{run.avg_pace}</div>
              <div className="text-[8px] font-black text-gray-600">/KM</div>
            </div>
          </div>

          {/* Extra stats row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Avg HR</div>
              <div className="text-lg font-black italic text-rose-500">{run.avg_hr ?? '—'}</div>
              <div className="text-[8px] font-black text-gray-600">BPM</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Max HR</div>
              <div className="text-lg font-black italic text-rose-400">{run.max_hr ?? '—'}</div>
              <div className="text-[8px] font-black text-gray-600">BPM</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Elevation</div>
              <div className="text-lg font-black italic text-amber-400">{run.elevation_gain?.toFixed(0) ?? '—'}</div>
              <div className="text-[8px] font-black text-gray-600">M</div>
            </div>
          </div>

          {/* Splits table */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="grid grid-cols-4 text-[8px] font-black uppercase tracking-[0.2em] text-gray-600 mb-4 px-2">
              <span>KM</span>
              <span>PACE</span>
              <span>HR</span>
              <span className="text-right">ELEV</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1">
              {splits.map((split) => (
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
                  <span className="text-[10px] font-black text-gray-500">{String(split.km).padStart(2, '0')}</span>
                  <span className="text-xs font-black italic text-white">{split.pace}</span>
                  <span className="text-xs font-black italic text-rose-400">{split.hr ?? '—'}</span>
                  <span className="text-xs font-black italic text-amber-400 text-right">
                    {split.elevation_difference != null ? `${split.elevation_difference > 0 ? '+' : ''}${split.elevation_difference.toFixed(0)}m` : '—'}
                  </span>
                </button>
              ))}
              {splits.length === 0 && (
                <div className="text-center text-gray-600 text-xs font-bold py-8">No split data</div>
              )}
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* OVERLAY: RIGHT PANEL */}
      <div className="absolute top-8 right-8 w-[240px] pointer-events-none flex flex-col gap-4">
        {/* Map mode selector */}
        <GlassPanel title="ROUTE COLOR" icon={Layers} className="pointer-events-auto">
          <div className="space-y-3">
            {([['pace', 'PACE', '#3B82F6'], ['hr', 'HEART RATE', '#EF4444'], ['elevation', 'ELEVATION', '#F59E0B']] as const).map(([mode, label, clr]) => (
              <button
                key={mode}
                onClick={() => setMapMode(mode as any)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest",
                  mapMode === mode ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
                )}
              >
                <span>{label}</span>
                <div className={cn("w-3 h-3 rounded-full", mapMode === mode ? "opacity-100" : "opacity-30")} style={{ backgroundColor: clr }} />
              </button>
            ))}
          </div>
        </GlassPanel>

        {/* Run info card */}
        <div className="bg-[#0F172A]/90 backdrop-blur-2xl border border-white/10 p-5 rounded-3xl flex flex-col gap-3 shadow-2xl pointer-events-auto">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Run Info</span>
            <Activity className="w-3 h-3 text-[#C0FF00]" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-bold text-gray-500 uppercase">Type</span>
              <span className="text-[10px] font-black text-[#C0FF00] uppercase">{run.run_type}</span>
            </div>
            {run.avg_cadence && (
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-bold text-gray-500 uppercase">Cadence</span>
                <span className="text-[10px] font-black text-amber-400">{Math.round(run.avg_cadence * 2)} spm</span>
              </div>
            )}
            {run.avg_hr_pct && (
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-bold text-gray-500 uppercase">Avg HR %</span>
                <span className="text-[10px] font-black text-rose-400">{run.avg_hr_pct}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* OVERLAY: BOTTOM — Multi-metric chart */}
      {splits.length > 0 && (
        <div className="absolute bottom-8 left-[380px] right-8 pointer-events-none">
          <GlassPanel className="pointer-events-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">PERFORMANCE CHART</span>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-[2px] bg-emerald-400 rounded-full" />
                      <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Pace</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-[2px] bg-rose-500 rounded-full" />
                      <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Heart Rate</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-[2px] bg-amber-400 rounded-full" />
                      <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Cadence</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-8">
                <div className="text-right">
                  <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">AVG PACE</div>
                  <div className="text-lg font-black italic text-emerald-400 tracking-tight">{run.avg_pace}/km</div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">AVG HR</div>
                  <div className="text-lg font-black italic text-rose-500 tracking-tight">{run.avg_hr ?? '—'} bpm</div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">ELEVATION</div>
                  <div className="text-lg font-black italic text-amber-400 tracking-tight">{run.elevation_gain?.toFixed(0) ?? '—'}m</div>
                </div>
              </div>
            </div>

            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={splits.map((s) => ({
                    km: `${s.km}`,
                    pace: paceToSeconds(s.pace),
                    hr: s.hr ?? null,
                    cadence: s.cadence ?? null,
                  }))}
                >
                  <defs>
                    <linearGradient id="paceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="km"
                    tick={{ fontSize: 9, fill: '#4B5563', fontWeight: 700 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                    tickLine={false}
                  />
                  <YAxis yAxisId="pace" orientation="left" hide domain={['auto', 'auto']} reversed />
                  <YAxis yAxisId="hr" orientation="right" hide domain={['auto', 'auto']} />
                  <YAxis yAxisId="cadence" hide domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15,23,42,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      backdropFilter: 'blur(12px)',
                      padding: '10px 14px',
                    }}
                    labelStyle={{ color: '#6B7280', fontSize: 9, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}
                    itemStyle={{ fontSize: 11, fontWeight: 900 }}
                    formatter={(value: number, name: string) => {
                      if (name === 'pace') {
                        const m = Math.floor(value / 60);
                        const s = value % 60;
                        return [`${m}:${String(s).padStart(2, '0')}/km`, 'Pace'];
                      }
                      if (name === 'hr') return [`${value} bpm`, 'Heart Rate'];
                      if (name === 'cadence') return [`${value} spm`, 'Cadence'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `KM ${label}`}
                    cursor={{ stroke: 'rgba(192,255,0,0.3)', strokeWidth: 1 }}
                  />
                  <Area
                    yAxisId="pace"
                    type="monotone"
                    dataKey="pace"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fill="url(#paceGrad)"
                    dot={false}
                    animationDuration={1200}
                  />
                  <Line
                    yAxisId="hr"
                    type="monotone"
                    dataKey="hr"
                    stroke="#F43F5E"
                    strokeWidth={2}
                    dot={false}
                    animationDuration={1400}
                    connectNulls
                  />
                  <Line
                    yAxisId="cadence"
                    type="monotone"
                    dataKey="cadence"
                    stroke="#F59E0B"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                    animationDuration={1600}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>
        </div>
      )}
    </main>
  );
}
