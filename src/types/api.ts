// ─── PROFILE ────────────────────────────────────────────────────────────────

export interface PB {
  time: string;
  pace: string;
  date: string;
}

export interface Profile {
  id: string;
  name: string;
  age: number;
  weight_kg: number;
  height_cm: number;
  max_hr: number;
  started_running: string;
  total_km: number;
  race_goal: string;
  race_date: string;
  target_pace: string | null;
  target_time: string;
  level: string;
  max_weekly_km: number | null;
  injury: string | null;
  pbs: Record<string, PB>;
  medals: Record<string, unknown>;
}

// ─── RUNS ────────────────────────────────────────────────────────────────────

export interface Split {
  km: number;
  pace: string;
  hr: number | null;
  cadence: number | null;
  distance: number;
  elapsed_time: number;
  elevation_difference: number;
}

export interface PlanFeedback {
  matched: boolean;
  matched_type: string;
  verdict: string;
  week_id: string | null;
  session_index: number | null;
}

export interface Run {
  id: string;
  date: string;
  distance_km: number;
  duration_minutes: number;
  avg_pace: string;
  avg_hr: number | null;
  max_hr: number | null;
  avg_hr_pct: number | null;
  max_hr_pct: number | null;
  run_type: string;
  notes: string | null;
  location: string | null;
  strava_id: number | null;
  avg_cadence: number | null;
  elevation_gain: number;
  splits: Split[];
  polyline: string | null;
  start_latlng: [number, number] | null;
  plan_feedback: PlanFeedback | null;
}

export interface RunsResponse {
  runs: Run[];
}

// ─── TRAINING PLAN ───────────────────────────────────────────────────────────

export interface Session {
  day: string;
  date: string;
  type: string;
  title: string;
  description: string;
  target_distance_km: number;
  target_pace: string | null;
  target_duration_min: number | null;
  completed: boolean;
  run_id: string | null;
}

export interface TrainingWeek {
  id: string;
  week_number: number;
  week_start: string;
  week_end: string;
  phase: string;
  phase_description: string;
  target_km: number;
  is_recovery_week: boolean;
  sessions: Session[];
}

export interface TrainingPlanResponse {
  weeks: TrainingWeek[];
}

// ─── FITNESS & FRESHNESS ─────────────────────────────────────────────────────

export interface FitnessFreshnessPoint {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  trimp: number;
}

export interface FitnessFreshnessResponse {
  fitness_freshness: FitnessFreshnessPoint[];
  current: {
    ctl?: number;
    atl?: number;
    tsb?: number;
    status?: string;
  };
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

export interface DashboardResponse {
  profile: Profile;
  next_session: Session | null;
  week_progress: {
    done_km: number;
    target_km: number;
    pct: number;
  } | null;
  fitness_freshness: FitnessFreshnessPoint[];
  current_ff: {
    ctl: number;
    atl: number;
    tsb: number;
    status: string;
  } | null;
  last_run: Run | null;
  recovery_score: number | null;
}

// ─── BADGES ──────────────────────────────────────────────────────────────────

export interface Badge {
  id: string;
  cat: string;
  cat_label: string;
  name: string;
  desc: string;
  icon: string;
  progress: number;
  target: number;
  unlocked: boolean;
  unlocked_date: string | null;
}

export interface BadgesResponse {
  badges: Badge[];
}

// ─── RECOVERY ────────────────────────────────────────────────────────────────

export interface RecoveryScoreResponse {
  score: number;
  label: string;
  factors: Record<string, number>;
  checkin: unknown | null;
}

// ─── INJURY RISK ─────────────────────────────────────────────────────────────

export interface InjuryRiskResponse {
  risk_score: number;
  risk_label: string;
  acwr: number;
  factors: Record<string, number>;
}

// ─── SUPERCOMPENSATION ───────────────────────────────────────────────────────

export interface SupercompensationResponse {
  investments: unknown[];
  golden_day: string | null;
  days_to_golden: number | null;
  projection: unknown[];
}

// ─── BEST EFFORTS ────────────────────────────────────────────────────────────

export interface BestEffort {
  distance: string;
  time: string;
  pace: string;
  date: string;
  run_id: string;
}

export interface BestEffortsResponse {
  efforts: BestEffort[];
}

// ─── HEATMAP ─────────────────────────────────────────────────────────────────

export interface HeatmapPoint {
  date: string;
  km: number;
}

export interface HeatmapResponse {
  heatmap: HeatmapPoint[];
}

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

export interface AnalyticsResponse {
  vdot: number | null;
  race_predictions: Record<string, string>;
  pace_trend: unknown[];
  zone_distribution: unknown[];
  goal_gap: unknown | null;
}
