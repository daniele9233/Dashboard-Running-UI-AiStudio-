import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Award, Clock, Activity, Zap, Flame, Calendar, ChevronRight, Edit3, Share2, RefreshCw, Link2, X, Check, Heart } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { getProfile, updateProfile, getStravaAuthUrl, syncStrava, getBestEfforts, getHeatmap } from "../api";
import type { Profile, BestEffort } from "../types/api";

// ─── TRAINING ZONES ──────────────────────────────────────────────────────────

function getZones(maxHr: number) {
  return [
    { zone: "Z1", label: "Recovery",       pct: "50–60%", min: Math.round(maxHr * 0.50), max: Math.round(maxHr * 0.60), color: "bg-blue-500",   bar: "from-blue-500/60 to-blue-500" },
    { zone: "Z2", label: "Aerobic Base",   pct: "60–70%", min: Math.round(maxHr * 0.60), max: Math.round(maxHr * 0.70), color: "bg-green-500",  bar: "from-green-500/60 to-green-500" },
    { zone: "Z3", label: "Aerobic Power",  pct: "70–80%", min: Math.round(maxHr * 0.70), max: Math.round(maxHr * 0.80), color: "bg-yellow-400", bar: "from-yellow-400/60 to-yellow-400" },
    { zone: "Z4", label: "Threshold",      pct: "80–90%", min: Math.round(maxHr * 0.80), max: Math.round(maxHr * 0.90), color: "bg-orange-500", bar: "from-orange-500/60 to-orange-500" },
    { zone: "Z5", label: "VO₂ Max",        pct: "90–100%",min: Math.round(maxHr * 0.90), max: maxHr,                    color: "bg-red-500",   bar: "from-red-500/60 to-red-500" },
  ];
}

// ─── HEATMAP ─────────────────────────────────────────────────────────────────

function buildHeatmapGrid(
  data: { date: string; km: number }[],
  weeksBack = 24
): { date: string; km: number }[][] {
  const today = new Date();
  // Align to current week's Sunday
  const dayOfWeek = today.getDay(); // 0=Sun
  const latestSun = new Date(today);
  latestSun.setDate(today.getDate() - dayOfWeek);

  const map: Record<string, number> = {};
  for (const d of data) map[d.date] = d.km;

  // grid[col][row] — col = week (0=oldest), row = day (0=Sun)
  const grid: { date: string; km: number }[][] = [];
  for (let w = weeksBack - 1; w >= 0; w--) {
    const week: { date: string; km: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(latestSun);
      dt.setDate(latestSun.getDate() - w * 7 + d);
      const iso = dt.toISOString().slice(0, 10);
      week.push({ date: iso, km: map[iso] ?? 0 });
    }
    grid.push(week);
  }
  return grid;
}

function heatmapColor(km: number) {
  if (km === 0) return "bg-[#2A2A2A]";
  if (km < 5)  return "bg-[#10B981]/30";
  if (km < 10) return "bg-[#10B981]/60";
  if (km < 20) return "bg-[#10B981]/80";
  return "bg-[#10B981]";
}

// ─── EDIT MODAL ──────────────────────────────────────────────────────────────

interface EditModalProps {
  profile: Profile;
  onClose: () => void;
  onSaved: (updated: Profile) => void;
}

function EditModal({ profile, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState({
    name: profile.name ?? "",
    age: String(profile.age ?? ""),
    weight_kg: String(profile.weight_kg ?? ""),
    height_cm: String(profile.height_cm ?? ""),
    max_hr: String(profile.max_hr ?? ""),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const patch: Record<string, string | number> = { name: form.name };
      if (form.age)       patch.age       = parseInt(form.age);
      if (form.weight_kg) patch.weight_kg = parseFloat(form.weight_kg);
      if (form.height_cm) patch.height_cm = parseFloat(form.height_cm);
      if (form.max_hr)    patch.max_hr    = parseInt(form.max_hr);
      const updated = await updateProfile(patch as Partial<Profile>);
      onSaved(updated);
    } catch {
      setError("Errore nel salvataggio. Riprova.");
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof typeof form, placeholder: string, unit?: string) => (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className="flex-1 bg-[#121212] border border-[#3A3A3A] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#3B82F6] transition-colors"
        />
        {unit && <span className="text-sm text-gray-500 w-8">{unit}</span>}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#181818] border border-[#2A2A2A] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Edit Profile</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[#2A2A2A] flex items-center justify-center hover:bg-[#3A3A3A] transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {field("Nome", "name", "Il tuo nome")}
          {field("Età", "age", "28", "anni")}
          {field("Peso", "weight_kg", "70", "kg")}
          {field("Altezza", "height_cm", "175", "cm")}
          {field("FC Massima", "max_hr", "190", "bpm")}
        </div>

        {error && <p className="mt-4 text-xs text-rose-400 text-center">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-sm font-medium text-gray-300 transition-colors">
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 rounded-xl text-sm font-bold text-white transition-colors"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function ProfileView() {
  const navigate = useNavigate();
  const { data: profileData, loading } = useApi<Profile>(getProfile);
  const { data: effortsData } = useApi<{ efforts: BestEffort[] }>(getBestEfforts);
  const { data: heatmapData } = useApi<{ heatmap: { date: string; km: number }[] }>(getHeatmap);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Use live state if edited, else fall back to fetched data
  const activeProfile = profile ?? profileData;

  const displayName = activeProfile?.name ?? "—";
  const totalKm = activeProfile?.total_km ?? 0;
  const raceGoal = activeProfile?.race_goal ?? "—";
  const level = activeProfile?.level ?? "—";
  const maxHr = activeProfile?.max_hr ?? 190;
  const efforts = effortsData?.efforts ?? [];

  const heatmapGrid = useMemo(
    () => buildHeatmapGrid(heatmapData?.heatmap ?? [], 24),
    [heatmapData]
  );

  const zones = useMemo(() => getZones(maxHr), [maxHr]);

  const handleStravaConnect = async () => {
    try {
      const data = await getStravaAuthUrl();
      window.location.href = data.url;
    } catch (err) {
      console.error("Failed to get Strava auth URL:", err);
    }
  };

  const handleStravaSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncStrava() as { synced?: number };
      setSyncResult(`${res.synced ?? 0} corse sincronizzate!`);
    } catch {
      setSyncResult("Errore nella sincronizzazione. Connetti prima Strava.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#121212] text-white pb-12">
      {editOpen && activeProfile && (
        <EditModal
          profile={activeProfile}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => { setProfile(updated); setEditOpen(false); }}
        />
      )}

      {/* Hero Section */}
      <div className="relative h-72">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1502224562085-639556652f33?auto=format&fit=crop&q=80&w=2000"
            alt="Cover"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/60 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 w-full px-8 translate-y-1/3 flex items-end justify-between">
          <div className="flex items-end gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-[#121212] overflow-hidden bg-[#1E1E1E] shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1552674605-171d31fea3fa?auto=format&fit=crop&q=80&w=400"
                  alt={displayName}
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
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg text-sm font-medium transition-colors"
            >
              <Edit3 className="w-4 h-4" /> Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 mt-24 grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Left Column */}
        <div className="xl:col-span-2 space-y-8">

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Km Totali",    value: totalKm > 0 ? totalKm.toFixed(0) : "—", unit: "km",       icon: Activity, color: "text-[#3B82F6]" },
              { label: "Obiettivo",    value: raceGoal,                                 unit: "",         icon: Clock,    color: "text-[#10B981]" },
              { label: "Livello",      value: level,                                    unit: "",         icon: Zap,      color: "text-[#EAB308]" },
              { label: "Personal Best",value: String(efforts.length),                   unit: "distanze", icon: Award,    color: "text-[#F43F5E]" },
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
            <div className="flex gap-1.5 overflow-x-auto pb-2">
              <div className="flex flex-col gap-1.5 justify-between text-xs text-gray-500 font-medium pr-2 pt-0.5">
                <span>Sun</span>
                <span>Tue</span>
                <span>Thu</span>
                <span>Sat</span>
              </div>
              <div className="flex gap-1.5">
                {heatmapGrid.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1.5">
                    {week.map((day, di) => (
                      <div
                        key={di}
                        className={`w-3.5 h-3.5 rounded-sm ${heatmapColor(day.km)} transition-all hover:ring-2 hover:ring-white/50 cursor-pointer`}
                        title={day.km > 0 ? `${day.date}: ${day.km.toFixed(1)} km` : day.date}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-500 font-medium">
              <span>Less</span>
              <div className="flex gap-1">
                {[0, 3, 7, 12, 25].map((km, i) => (
                  <div key={i} className={`w-3 h-3 rounded-sm ${heatmapColor(km)}`} />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>

          {/* Training Zones */}
          <div className="bg-[#181818] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Training Zones</h2>
                <p className="text-xs text-gray-500 mt-0.5">Basate su FC Max: <span className="text-white font-medium">{maxHr} bpm</span></p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <div className="space-y-3">
              {zones.map((z, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-6 text-center">
                    <span className="text-xs font-bold text-gray-500">{z.zone}</span>
                  </div>
                  <div className="w-32 flex-shrink-0">
                    <div className="text-sm font-bold text-gray-200">{z.label}</div>
                    <div className="text-xs text-gray-500">{z.min}–{z.max} bpm</div>
                  </div>
                  <div className="flex-1 h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${z.bar}`}
                      style={{ width: `${20 * (i + 1)}%` }}
                    />
                  </div>
                  <div className="w-12 text-right text-xs font-medium text-gray-500">{z.pct}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[#2A2A2A] grid grid-cols-3 gap-4 text-center">
              {[
                { label: "Età",    value: activeProfile?.age ? `${activeProfile.age} anni` : "—" },
                { label: "Peso",   value: activeProfile?.weight_kg ? `${activeProfile.weight_kg} kg` : "—" },
                { label: "Altezza",value: activeProfile?.height_cm ? `${activeProfile.height_cm} cm` : "—" },
              ].map((s, i) => (
                <div key={i} className="bg-[#121212] rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                  <div className="text-base font-bold text-white">{s.value}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-8">

          {/* Strava Integration */}
          <div className="bg-[#181818] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#FC4C02]/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#FC4C02]" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white">Strava</h2>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleStravaConnect}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#FC4C02] hover:bg-[#E34402] rounded-xl text-sm font-bold text-white transition-colors"
              >
                <Link2 className="w-4 h-4" />
                Connetti Strava
              </button>
              <button
                onClick={handleStravaSync}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1E1E1E] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-xl text-sm font-bold text-gray-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Sincronizzazione..." : "Sincronizza Corse"}
              </button>
              {syncResult && (
                <p className={`text-xs font-medium text-center ${syncResult.includes("Errore") ? "text-rose-400" : "text-emerald-400"}`}>
                  {syncResult}
                </p>
              )}
            </div>
          </div>

          {/* Personal Records */}
          <div className="bg-[#181818] border border-[#2A2A2A] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-6">Personal Records</h2>
            {efforts.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                <Award className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Sincronizza le tue corse per vedere i Personal Record
              </div>
            ) : (
              <div className="space-y-3">
                {efforts.map((pr, i) => (
                  <div
                    key={i}
                    onClick={() => pr.run_id && navigate(`/activities/${pr.run_id}`)}
                    className="flex items-center justify-between p-3.5 bg-[#121212] border border-[#2A2A2A] rounded-xl hover:border-[#3A3A3A] transition-colors group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">{pr.distance}</div>
                      <div className="text-lg font-bold text-white group-hover:text-[#3B82F6] transition-colors">{pr.time}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-300 mb-0.5">{pr.pace}</div>
                      <div className="text-xs text-gray-500">{pr.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
