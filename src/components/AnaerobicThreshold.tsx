import { useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import type { Run } from "../types/api";

interface AnaerobicThresholdProps {
  runs: Run[];
  maxHr: number;
}

export function AnaerobicThreshold({ runs, maxHr }: AnaerobicThresholdProps) {
  const { monthData, currentThreshold, prevThreshold, delta, yMin, yMax } = useMemo(() => {
    const now = new Date();
    const safeMax = maxHr > 0 ? maxHr : 180;
    // stima soglia: 80% maxHr come riferimento
    const thresholdFloor = Math.round(safeMax * 0.78);
    const thresholdCeil = Math.round(safeMax * 0.92);

    const data: { name: string; value: number }[] = [];
    let curr = 0;
    let prev = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

      // Usa le corse di tipo soglia/tempo, oppure tutte le corse con avg_hr elevata
      const monthRuns = runs.filter((r) => {
        const rd = new Date(r.date);
        return (
          rd.getFullYear() === d.getFullYear() &&
          rd.getMonth() === d.getMonth() &&
          r.avg_hr !== null &&
          r.avg_hr > 0
        );
      });

      // Preferisci corse threshold/tempo, fallback su corse con avg_hr > 75% maxHr
      const threshRuns = monthRuns.filter((r) => {
        const t = (r.run_type || "").toLowerCase();
        return t.includes("tempo") || t.includes("threshold") || t.includes("soglia");
      });

      const targetRuns =
        threshRuns.length > 0
          ? threshRuns
          : monthRuns.filter((r) => (r.avg_hr ?? 0) > safeMax * 0.75);

      let value = 0;
      if (targetRuns.length > 0) {
        // avg_hr delle corse threshold come proxy soglia anaerobica
        const avgHr =
          targetRuns.reduce((sum, r) => sum + (r.avg_hr ?? 0), 0) / targetRuns.length;
        value = Math.round(avgHr);
      } else if (monthRuns.length > 0) {
        // fallback: 85% del max_hr delle corse del mese
        const avgMax =
          monthRuns
            .filter((r) => r.max_hr && r.max_hr > 0)
            .reduce((sum, r) => sum + (r.max_hr ?? 0), 0) /
          Math.max(1, monthRuns.filter((r) => r.max_hr && r.max_hr > 0).length);
        value = avgMax > 0 ? Math.round(avgMax * 0.88) : Math.round(safeMax * 0.85);
      } else {
        value = Math.round(safeMax * 0.85);
      }

      // Clamp al range fisiologico
      value = Math.max(thresholdFloor, Math.min(thresholdCeil, value));

      data.push({
        name: d.toLocaleString("en", { month: "short" }).toUpperCase(),
        value,
      });

      if (i === 0) curr = value;
      if (i === 1) prev = value;
    }

    const values = data.map((d) => d.value);
    const minV = Math.min(...values) - 5;
    const maxV = Math.max(...values) + 5;

    return {
      monthData: data,
      currentThreshold: curr,
      prevThreshold: prev,
      delta: curr - prev,
      yMin: minV,
      yMax: maxV,
    };
  }, [runs, maxHr]);

  const yLabels = [yMax, Math.round((yMin + yMax) / 2), yMin];

  return (
    <div className="bg-bg-card border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xs text-text-muted font-semibold tracking-wider mb-1 uppercase">
            Soglia Anaerobica
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-text-primary">{currentThreshold} bpm</span>
            {delta !== 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  delta >= 0 ? "text-[#8B5CF6] bg-[#8B5CF6]/10" : "text-[#F43F5E] bg-[#F43F5E]/10"
                }`}
              >
                {delta >= 0 ? "+" : ""}
                {delta} bpm
              </span>
            )}
          </div>
        </div>
        <span className="text-xs text-text-secondary">QUEST'ANNO</span>
      </div>

      <div className="h-24 w-full mt-auto relative">
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-text-muted pb-6">
          {yLabels.map((v, i) => (
            <span key={i}>{v}</span>
          ))}
        </div>
        <div className="ml-8 h-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorThreshold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={[yMin, yMax]} hide />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#8B5CF6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorThreshold)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex justify-between ml-8 mt-2 text-[10px] text-text-muted">
        {monthData.map((d) => (
          <span key={d.name}>{d.name}</span>
        ))}
      </div>
    </div>
  );
}
