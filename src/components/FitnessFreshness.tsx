import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Activity } from "lucide-react";
import type { FitnessFreshnessPoint } from "../types/api";

interface FitnessFreshnessProps {
  fitnessFreshness: FitnessFreshnessPoint[];
  currentFf: { ctl: number; atl: number; tsb: number; status: string } | null;
  prevCtl: number | null;
}

// ─── Utilities ──────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  fresh: "Fresco",
  neutral: "Neutro",
  tired: "Stanco",
  very_tired: "Molto stanco",
  optimal: "Ottimale",
};

function tsbStatus(tsb: number): string {
  if (tsb > 15) return "Fresco";
  if (tsb > 5) return "Ottimale";
  if (tsb > -10) return "Neutro";
  if (tsb > -25) return "Stanco";
  return "Molto stanco";
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FitnessFreshness({ fitnessFreshness, currentFf, prevCtl }: FitnessFreshnessProps) {
  const { chartData, yMax, yMin } = useMemo(() => {
    if (!fitnessFreshness || fitnessFreshness.length === 0) {
      return { chartData: [], yMax: 80, yMin: -40 };
    }

    let lastMonth = -1;
    const data = fitnessFreshness.map((p) => {
      const date = new Date(p.date);
      const month = date.getMonth();
      const monthLabel =
        month !== lastMonth
          ? date.toLocaleString("it", { month: "short" }).charAt(0).toUpperCase() +
            date.toLocaleString("it", { month: "short" }).slice(1)
          : "";
      lastMonth = month;
      return {
        month: monthLabel,
        fitness: parseFloat((p.ctl ?? 0).toFixed(1)),
        fatigue: parseFloat((p.atl ?? 0).toFixed(1)),
        form: parseFloat((p.tsb ?? 0).toFixed(1)),
      };
    });

    const allValues = data.flatMap((d) => [d.fitness, d.fatigue]);
    const formValues = data.map((d) => d.form);
    const maxFF = Math.max(...allValues, 10);
    const minForm = Math.min(...formValues, -5);

    return {
      chartData: data,
      yMax: Math.ceil(maxFF * 1.1 / 10) * 10,
      yMin: Math.floor(minForm * 1.1 / 10) * 10,
    };
  }, [fitnessFreshness]);

  const ctl = currentFf?.ctl ?? 0;
  const atl = currentFf?.atl ?? 0;
  const tsb = currentFf?.tsb ?? 0;
  const ctlDelta = prevCtl !== null ? parseFloat((ctl - prevCtl).toFixed(1)) : null;
  const statusLabel = currentFf?.status
    ? STATUS_LABEL[currentFf.status] ?? tsbStatus(tsb)
    : tsbStatus(tsb);

  return (
    <div className="bg-bg-card border border-[#1E293B] rounded-xl p-6 mt-6">
      <div className="flex items-center gap-2 mb-8">
        <Activity className="w-6 h-6 text-[#3B82F6]" />
        <h2 className="text-xl font-bold tracking-wider uppercase text-text-primary">
          Fitness & Freshness
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-8 mb-8">
        {/* CTL — Condizione Fisica */}
        <div>
          <div className="text-6xl font-bold text-[#3B82F6] mb-2">
            {ctl > 0 ? ctl.toFixed(1) : "--"}
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wider text-[#3B82F6] uppercase">
            <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
            Condizione Fisica
          </div>
          {ctlDelta !== null && ctlDelta !== 0 && (
            <div
              className={`text-base font-bold mt-1 ${
                ctlDelta >= 0 ? "text-[#14B8A6]" : "text-[#F43F5E]"
              }`}
            >
              {ctlDelta >= 0 ? "+" : ""}
              {ctlDelta}
            </div>
          )}
        </div>

        {/* ATL — Affaticamento */}
        <div>
          <div className="text-6xl font-bold text-[#F43F5E] mb-2">
            {atl > 0 ? atl.toFixed(1) : "--"}
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wider text-[#F43F5E] uppercase">
            <div className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]" />
            Affaticamento
          </div>
        </div>

        {/* TSB — Forma Fisica */}
        <div>
          <div className="text-6xl font-bold text-[#14B8A6] mb-2">
            {currentFf ? tsb.toFixed(1) : "--"}
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wider text-[#14B8A6] uppercase">
            <div className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]" />
            Forma Fisica
          </div>
          <div className="text-[#14B8A6] text-base font-bold mt-1 uppercase">{statusLabel}</div>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="formGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="30%" stopColor="#14B8A6" />
                  <stop offset="70%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748B", fontSize: 14 }}
                dy={10}
              />
              <YAxis
                yAxisId="left"
                domain={[0, yMax]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748B", fontSize: 14 }}
                dx={-10}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[yMin, Math.abs(yMin)]}
                hide
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1E293B",
                  borderColor: "#334155",
                  borderRadius: "8px",
                }}
                itemStyle={{ fontSize: "14px" }}
                labelStyle={{ color: "#94A3B8", marginBottom: "4px" }}
              />
              <ReferenceLine y={0} yAxisId="right" stroke="#334155" />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="fitness"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={false}
                name="Condizione fisica"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="fatigue"
                stroke="#F43F5E"
                strokeWidth={2}
                dot={false}
                name="Affaticamento"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="form"
                stroke="url(#formGradient)"
                strokeWidth={2}
                dot={false}
                name="Forma fisica"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-sm text-text-muted">
          Nessun dato disponibile — sincronizza le corse per vedere il grafico
        </div>
      )}

      <div className="flex gap-8 mt-8 justify-center text-sm font-semibold tracking-wider text-text-muted">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1.5 bg-[#3B82F6] rounded-full" />
          Condizione fisica
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1.5 bg-[#F43F5E] rounded-full" />
          Affaticamento
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1.5 bg-[#14B8A6] rounded-full" />
          Forma fisica
        </div>
      </div>
    </div>
  );
}
