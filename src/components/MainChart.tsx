import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { Run } from "../types/api";

interface MainChartProps {
  runs: Run[];
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function getRunCategory(runType: string): "easy" | "tempo" | "intervals" | "long" | "race" {
  const t = (runType || "").toLowerCase();
  if (t.includes("race") || t.includes("gara") || t.includes("compet")) return "race";
  if (t.includes("long") || t.includes("lun") || t.includes("fondo lungo")) return "long";
  if (t.includes("interval") || t.includes("speed") || t.includes("fartlek") || t.includes("ripetute"))
    return "intervals";
  if (t.includes("tempo") || t.includes("threshold") || t.includes("soglia")) return "tempo";
  return "easy";
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

interface WeekEntry {
  name: string;
  easy: number;
  tempo: number;
  intervals: number;
  long: number;
  race: number;
  total: number;
}

// ─── Tooltip personalizzato ──────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, e: any) => sum + e.value, 0);
    return (
      <div className="bg-[#1E293B] border border-[#334155] p-3 rounded-lg shadow-xl">
        <p className="text-xs text-text-muted mb-2 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-bold text-text-primary mb-2">
          Totale: {total.toFixed(1)} km
        </p>
        {payload
          .filter((e: any) => e.value > 0)
          .map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-text-secondary w-16 capitalize">{entry.name}:</span>
              <span className="text-text-primary font-medium">{entry.value.toFixed(1)} km</span>
            </div>
          ))}
      </div>
    );
  }
  return null;
};

// ─── Component ──────────────────────────────────────────────────────────────

export function MainChart({ runs }: MainChartProps) {
  const { weeklyData, totalYearKm, avgWeekKm } = useMemo(() => {
    const now = new Date();
    const currentWeekStart = getWeekStart(now);
    const weeks: WeekEntry[] = [];

    for (let i = 11; i >= 0; i--) {
      const ws = new Date(currentWeekStart);
      ws.setDate(currentWeekStart.getDate() - i * 7);
      const we = new Date(ws);
      we.setDate(ws.getDate() + 7);

      const weekRuns = runs.filter((r) => {
        const d = new Date(r.date);
        return d >= ws && d < we;
      });

      const label =
        ws.toLocaleString("it", { month: "short" }).toUpperCase() +
        " " +
        ws.getDate();

      const entry: WeekEntry = { name: label, easy: 0, tempo: 0, intervals: 0, long: 0, race: 0, total: 0 };
      for (const r of weekRuns) {
        const km = parseFloat(r.distance_km.toFixed(1));
        const cat = getRunCategory(r.run_type);
        entry[cat] += km;
        entry.total += km;
      }
      // arrotonda
      (["easy", "tempo", "intervals", "long", "race"] as const).forEach((k) => {
        entry[k] = parseFloat(entry[k].toFixed(1));
      });
      entry.total = parseFloat(entry.total.toFixed(1));

      weeks.push(entry);
    }

    const thisYear = now.getFullYear();
    const yearKm = runs
      .filter((r) => new Date(r.date).getFullYear() === thisYear)
      .reduce((sum, r) => sum + (r.distance_km || 0), 0);

    const weeksWithRuns = weeks.filter((w) => w.total > 0);
    const avg =
      weeksWithRuns.length > 0
        ? parseFloat(
            (weeksWithRuns.reduce((s, w) => s + w.total, 0) / weeksWithRuns.length).toFixed(1)
          )
        : 0;

    return {
      weeklyData: weeks,
      totalYearKm: parseFloat(yearKm.toFixed(1)),
      avgWeekKm: avg,
    };
  }, [runs]);

  const maxKm = useMemo(
    () => Math.max(...weeklyData.map((w) => w.total), 10),
    [weeklyData]
  );

  return (
    <div className="bg-bg-card border border-[#1E293B] rounded-xl p-6 flex flex-col h-full">
      <div className="flex justify-between items-start mb-8">
        <div className="text-xl font-bold text-text-primary">
          {totalYearKm > 0 ? `${totalYearKm.toLocaleString("it")} km Run` : "Nessuna corsa"}
        </div>
        <div className="text-xs text-text-secondary">ULTIME 12 SETTIMANE</div>
      </div>

      <div className="flex-1 min-h-[300px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={weeklyData}
            margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
            barSize={14}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748B", fontSize: 9 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748B", fontSize: 10 }}
              dx={-10}
              domain={[0, Math.ceil(maxKm * 1.15)]}
            />
            <Tooltip
              cursor={{ fill: "#1E293B", opacity: 0.4 }}
              content={<CustomTooltip />}
            />
            {avgWeekKm > 0 && (
              <ReferenceLine
                y={avgWeekKm}
                stroke="#94A3B8"
                strokeDasharray="3 3"
                label={{
                  position: "insideLeft",
                  value: `AVG ${avgWeekKm} km`,
                  fill: "#E2E8F0",
                  fontSize: 10,
                  dy: -10,
                }}
              />
            )}

            <Bar dataKey="easy" stackId="a" fill="#14B8A6" radius={[0, 0, 2, 2]} />
            <Bar dataKey="tempo" stackId="a" fill="#3B82F6" />
            <Bar dataKey="intervals" stackId="a" fill="#F59E0B" />
            <Bar dataKey="long" stackId="a" fill="#F43F5E" />
            <Bar dataKey="race" stackId="a" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-6 mt-6 pt-6 border-t border-[#1E293B] text-[10px] text-text-muted font-semibold tracking-wider justify-center">
        {[
          { color: "#14B8A6", label: "EASY RUN" },
          { color: "#3B82F6", label: "TEMPO" },
          { color: "#F59E0B", label: "INTERVALS" },
          { color: "#F43F5E", label: "LONG RUN" },
          { color: "#8B5CF6", label: "RACE" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
