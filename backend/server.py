"""
Altrove Backend – FastAPI server for running training dashboard.
Handles Strava OAuth, run sync, profile, training plan, analytics, etc.
"""

import os, math, hashlib, datetime as dt
from typing import Optional
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, JSONResponse

import httpx
import motor.motor_asyncio as motor

load_dotenv()

# ── ENV ──────────────────────────────────────────────────────────────────────
MONGO_URL          = os.environ.get("MONGO_URL", "")
DB_NAME            = os.environ.get("DB_NAME", "DANIDB")
STRAVA_CLIENT_ID   = os.environ.get("STRAVA_CLIENT_ID", "")
STRAVA_CLIENT_SECRET = os.environ.get("STRAVA_CLIENT_SECRET", "")
FRONTEND_URL       = os.environ.get("FRONTEND_URL", "http://localhost:5173")

# Build the callback URL from the current host (set via Render env or default)
BACKEND_URL        = os.environ.get("BACKEND_URL", "https://dani-backend-ea0s.onrender.com")
STRAVA_REDIRECT_URI = f"{BACKEND_URL}/api/strava/callback"
STRAVA_SCOPE       = "read,activity:read_all"

# ── DB ───────────────────────────────────────────────────────────────────────
client: motor.AsyncIOMotorClient = None  # type: ignore
db = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global client, db
    client = motor.AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    yield
    client.close()

app = FastAPI(title="Altrove", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── HELPERS ──────────────────────────────────────────────────────────────────

def oid(doc):
    """Convert MongoDB _id to string 'id' field."""
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

def oids(docs):
    return [oid(d) for d in docs]


async def _get_athlete_id() -> Optional[int]:
    """Get the current athlete_id from the latest Strava token."""
    tok = await db.strava_tokens.find_one(sort=[("_id", -1)])
    return tok.get("athlete_id") if tok else None

# ── HEALTH ───────────────────────────────────────────────────────────────────

@app.get("/")
async def health():
    return {"status": "ok", "app": "Altrove"}

# ═══════════════════════════════════════════════════════════════════════════════
#  STRAVA OAUTH
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/strava/auth-url")
async def strava_auth_url():
    url = (
        f"https://www.strava.com/oauth/authorize"
        f"?client_id={STRAVA_CLIENT_ID}"
        f"&response_type=code"
        f"&redirect_uri={STRAVA_REDIRECT_URI}"
        f"&approval_prompt=force"
        f"&scope={STRAVA_SCOPE}"
    )
    return {"url": url, "redirect_uri": STRAVA_REDIRECT_URI}


@app.get("/api/strava/callback")
async def strava_callback(code: str = Query(None), error: str = Query(None)):
    """
    Strava redirects here after user authorizes.
    We redirect to the frontend with the code so the SPA can exchange it.
    """
    if error:
        return RedirectResponse(f"{FRONTEND_URL}?strava_error={error}")
    if not code:
        return RedirectResponse(f"{FRONTEND_URL}?strava_error=no_code")
    return RedirectResponse(f"{FRONTEND_URL}?strava_code={code}")


@app.post("/api/strava/exchange-code")
async def strava_exchange_code(request: Request):
    """Exchange the authorization code for access + refresh tokens."""
    body = await request.json()
    code = body.get("code", "")

    async with httpx.AsyncClient() as http:
        resp = await http.post("https://www.strava.com/oauth/token", data={
            "client_id": STRAVA_CLIENT_ID,
            "client_secret": STRAVA_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
        })

    if resp.status_code != 200:
        return JSONResponse({"error": "exchange_failed", "detail": resp.text}, status_code=400)

    data = resp.json()
    tokens = {
        "access_token": data.get("access_token"),
        "refresh_token": data.get("refresh_token"),
        "expires_at": data.get("expires_at"),
        "athlete_id": data.get("athlete", {}).get("id"),
    }

    # Upsert tokens in DB
    await db.strava_tokens.update_one(
        {"athlete_id": tokens["athlete_id"]},
        {"$set": tokens},
        upsert=True,
    )

    # Create / update profile from Strava athlete data
    athlete = data.get("athlete", {})
    athlete_id = tokens["athlete_id"]
    profile_patch = {
        "athlete_id": athlete_id,
        "name": f"{athlete.get('firstname', '')} {athlete.get('lastname', '')}".strip() or "Runner",
        "strava_profile_pic": athlete.get("profile"),
        "strava_city": athlete.get("city"),
        "strava_country": athlete.get("country"),
    }
    # Only set defaults — don't overwrite user-edited fields
    existing = await db.profile.find_one({"athlete_id": athlete_id})
    if not existing:
        profile_patch.update({
            "age": 0, "weight_kg": 0, "height_cm": 0, "max_hr": 190,
            "sex": "", "profile_pic": athlete.get("profile", ""),
            "started_running": "", "total_km": 0, "race_goal": "",
            "race_date": "", "target_pace": None, "target_time": "",
            "level": "", "max_weekly_km": None, "injury": None,
            "pbs": {}, "medals": {},
        })
        await db.profile.insert_one(profile_patch)
    else:
        await db.profile.update_one(
            {"athlete_id": athlete_id},
            {"$set": {"name": profile_patch["name"], "strava_profile_pic": profile_patch["strava_profile_pic"],
                      "strava_city": profile_patch["strava_city"], "strava_country": profile_patch["strava_country"]}},
        )

    return {"ok": True, "athlete_id": athlete_id}


async def _refresh_token_if_needed(tokens: dict) -> dict:
    """Refresh the Strava access token if expired."""
    import time
    if tokens.get("expires_at", 0) > time.time() + 60:
        return tokens

    async with httpx.AsyncClient() as http:
        resp = await http.post("https://www.strava.com/oauth/token", data={
            "client_id": STRAVA_CLIENT_ID,
            "client_secret": STRAVA_CLIENT_SECRET,
            "refresh_token": tokens["refresh_token"],
            "grant_type": "refresh_token",
        })

    if resp.status_code != 200:
        return tokens

    data = resp.json()
    tokens["access_token"] = data["access_token"]
    tokens["refresh_token"] = data["refresh_token"]
    tokens["expires_at"] = data["expires_at"]

    await db.strava_tokens.update_one(
        {"athlete_id": tokens["athlete_id"]},
        {"$set": tokens},
    )
    return tokens


async def _compute_fitness_freshness(athlete_id: str, max_hr_profile: int = 190, resting_hr: int = 50):
    """Calcola CTL/ATL/TSB da tutte le corse usando TRIMP metodo Lucia (2003).

    trimp = duration_min × hr_reserve × (0.64 × e^(1.92 × hr_reserve))
    CTL = EMA 42 giorni, ATL = EMA 7 giorni, TSB = CTL − ATL
    """
    from datetime import date, timedelta

    q = {"athlete_id": athlete_id} if athlete_id else {}
    runs = await db.runs.find(q, {"date": 1, "duration_minutes": 1, "avg_hr": 1}).sort("date", 1).to_list(None)
    if not runs:
        return

    # ── TRIMP giornaliero ──────────────────────────────────────────────────────
    daily_trimp: dict[str, float] = {}
    safe_max = max_hr_profile if max_hr_profile > resting_hr else 190
    safe_rest = resting_hr if resting_hr > 0 else 50

    for run in runs:
        date_str = str(run.get("date", ""))[:10]
        if not date_str:
            continue
        duration_min = float(run.get("duration_minutes") or 0)
        avg_hr = run.get("avg_hr")

        if avg_hr and avg_hr > 0:
            hr_res = (avg_hr - safe_rest) / (safe_max - safe_rest)
            hr_res = max(0.0, min(1.0, hr_res))
        else:
            hr_res = 0.55  # fallback senza HR

        trimp = duration_min * hr_res * (0.64 * math.exp(1.92 * hr_res))
        daily_trimp[date_str] = daily_trimp.get(date_str, 0.0) + trimp

    if not daily_trimp:
        return

    # ── EMA giornaliera: CTL (42gg) / ATL (7gg) ───────────────────────────────
    ALPHA_CTL = 2.0 / (42 + 1)
    ALPHA_ATL = 2.0 / (7 + 1)

    first_date = date.fromisoformat(min(daily_trimp.keys()))
    today = date.today()

    ctl = 0.0
    atl = 0.0
    docs = []
    current = first_date

    while current <= today:
        ds = current.isoformat()
        trimp_today = daily_trimp.get(ds, 0.0)
        ctl = ctl + ALPHA_CTL * (trimp_today - ctl)
        atl = atl + ALPHA_ATL * (trimp_today - atl)
        tsb = ctl - atl

        # Salva: giorni con corse + snapshot settimanali (ogni lunedì)
        if trimp_today > 0 or current.weekday() == 0:
            docs.append({
                "athlete_id": athlete_id,
                "date": ds,
                "trimp": round(trimp_today, 2),
                "ctl": round(ctl, 2),
                "atl": round(atl, 2),
                "tsb": round(tsb, 2),
            })
        current += timedelta(days=1)

    # ── Scrivi in MongoDB (sostituisci tutto) ──────────────────────────────────
    await db.fitness_freshness.delete_many(q)
    if docs:
        await db.fitness_freshness.insert_many(docs)


def _classify_run(run_data: dict) -> str:
    """Simple run-type classifier based on pace and duration."""
    distance = run_data.get("distance_km", 0)
    pace_parts = run_data.get("avg_pace", "6:00").split(":")
    try:
        pace_sec = int(pace_parts[0]) * 60 + int(pace_parts[1])
    except (ValueError, IndexError):
        pace_sec = 360

    if distance >= 18:
        return "long"
    if pace_sec < 270:  # faster than 4:30/km
        return "intervals"
    if pace_sec < 310:  # faster than 5:10/km
        return "tempo"
    if distance < 6 and pace_sec > 380:
        return "recovery"
    return "easy"


def _format_pace(speed_ms: float) -> str:
    """Convert m/s to min:sec/km pace string."""
    if speed_ms <= 0:
        return "0:00"
    pace_sec = 1000 / speed_ms
    m = int(pace_sec // 60)
    s = int(pace_sec % 60)
    return f"{m}:{s:02d}"


@app.post("/api/strava/sync")
async def strava_sync():
    """Fetch ALL activities from Strava (paginated) and upsert into DB."""
    tokens = await db.strava_tokens.find_one(sort=[("_id", -1)])
    if not tokens:
        return JSONResponse({"error": "not_connected"}, status_code=400)

    tokens = await _refresh_token_if_needed(tokens)
    athlete_id = tokens.get("athlete_id")
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    synced = 0

    async with httpx.AsyncClient(timeout=30.0) as http:
        # 1) Paginate through ALL activities
        all_activities = []
        page = 1
        while True:
            resp = await http.get(
                "https://www.strava.com/api/v3/athlete/activities",
                headers=headers,
                params={"per_page": 200, "page": page},
            )
            if resp.status_code != 200:
                break
            batch = resp.json()
            if not batch:
                break
            all_activities.extend(batch)
            page += 1

        # Get profile for HR % calculation
        prof_q = {"athlete_id": athlete_id} if athlete_id else {}
        profile = await db.profile.find_one(prof_q)
        max_hr_profile = profile.get("max_hr", 200) if profile else 200

        # 2) Process each run
        for act in all_activities:
            if act.get("type") != "Run":
                continue

            strava_id = act["id"]
            distance_km = round(act.get("distance", 0) / 1000, 2)
            duration_min = round(act.get("moving_time", 0) / 60, 2)
            avg_speed = act.get("average_speed", 0)
            avg_pace = _format_pace(avg_speed)
            avg_hr = act.get("average_heartrate")
            max_hr = act.get("max_heartrate")
            date_str = act.get("start_date_local", "")[:10]

            # Get summary polyline from the activity list data
            summary_polyline = act.get("map", {}).get("summary_polyline", "")
            start_latlng = act.get("start_latlng", [])

            # Fetch detailed activity for splits + full polyline + streams
            splits = []
            full_polyline = ""
            streams_data = None  # per-point streams for detailed chart

            try:
                detail_resp = await http.get(
                    f"https://www.strava.com/api/v3/activities/{strava_id}",
                    headers=headers,
                )
                if detail_resp.status_code == 200:
                    detail = detail_resp.json()
                    full_polyline = detail.get("map", {}).get("polyline", "") or summary_polyline

                    # Fetch full streams (per-point data)
                    try:
                        streams_resp = await http.get(
                            f"https://www.strava.com/api/v3/activities/{strava_id}/streams",
                            headers=headers,
                            params={
                                "keys": "distance,heartrate,cadence,altitude,velocity_smooth,latlng",
                                "key_type": "stream",
                            },
                        )
                        if streams_resp.status_code == 200:
                            raw = {s["type"]: s["data"] for s in streams_resp.json()}
                            dist = raw.get("distance", [])
                            hr = raw.get("heartrate", [])
                            cad = raw.get("cadence", [])
                            alt = raw.get("altitude", [])
                            vel = raw.get("velocity_smooth", [])
                            latlng = raw.get("latlng", [])
                            n = len(dist)

                            # Downsample to ~500 points for charts + best-effort precision
                            step = max(1, n // 500)
                            streams_data = []
                            for j in range(0, n, step):
                                pt = {"d": round(dist[j], 1)}
                                if j < len(hr): pt["hr"] = hr[j]
                                if j < len(cad): pt["cad"] = round(cad[j] * 2)  # spm
                                if j < len(alt): pt["alt"] = round(alt[j], 1)
                                if j < len(vel) and vel[j] > 0:
                                    pace_s = 1000 / vel[j]
                                    pt["pace"] = round(pace_s, 1)  # sec/km
                                if j < len(latlng): pt["ll"] = latlng[j]  # [lat, lng]
                                streams_data.append(pt)
                    except Exception:
                        pass

                    # Build cadence lookup from streams for splits
                    cadence_per_km: dict = {}
                    if streams_data:
                        km_cads: dict = {}
                        for pt in streams_data:
                            if "cad" in pt and "d" in pt:
                                km_idx = int(pt["d"] / 1000) + 1
                                km_cads.setdefault(km_idx, []).append(pt["cad"])
                        for km_idx, cads in km_cads.items():
                            cadence_per_km[km_idx] = round(sum(cads) / len(cads))

                    for i, sp in enumerate(detail.get("splits_metric", []), 1):
                        splits.append({
                            "km": i,
                            "pace": _format_pace(sp.get("average_speed", 0)),
                            "hr": sp.get("average_heartrate"),
                            "cadence": cadence_per_km.get(i) or (round(sp.get("average_cadence", 0) * 2) if sp.get("average_cadence") else None),
                            "distance": sp.get("distance", 0),
                            "elapsed_time": sp.get("elapsed_time", 0),
                            "elevation_difference": sp.get("elevation_difference", 0),
                        })
            except Exception:
                full_polyline = summary_polyline

            run_doc = {
                "athlete_id": athlete_id,
                "strava_id": strava_id,
                "date": date_str,
                "distance_km": distance_km,
                "duration_minutes": duration_min,
                "avg_pace": avg_pace,
                "avg_hr": round(avg_hr) if avg_hr else None,
                "max_hr": round(max_hr) if max_hr else None,
                "avg_hr_pct": round((avg_hr / max_hr_profile) * 100) if avg_hr else None,
                "max_hr_pct": round((max_hr / max_hr_profile) * 100) if max_hr else None,
                "run_type": _classify_run({"distance_km": distance_km, "avg_pace": avg_pace}),
                "notes": f"Importata da Strava: {act.get('name', '')}",
                "location": act.get("location_city") or act.get("timezone", "").split("/")[-1],
                "avg_cadence": act.get("average_cadence"),
                "elevation_gain": round(act.get("total_elevation_gain", 0), 1),
                "splits": splits,
                "streams": streams_data,  # per-point data: d, hr, cad, alt, pace, ll
                "polyline": full_polyline or summary_polyline,
                "start_latlng": start_latlng,
                "plan_feedback": None,
            }

            await db.runs.update_one(
                {"strava_id": strava_id},
                {"$set": run_doc},
                upsert=True,
            )
            synced += 1

    # Update total_km on the athlete's profile
    if athlete_id:
        pipeline = [
            {"$match": {"athlete_id": athlete_id}},
            {"$group": {"_id": None, "total": {"$sum": "$distance_km"}}},
        ]
        agg = await db.runs.aggregate(pipeline).to_list(1)
        total = round(agg[0]["total"], 1) if agg else 0
        await db.profile.update_one({"athlete_id": athlete_id}, {"$set": {"total_km": total}})

    # ── Ricalcola CTL/ATL/TSB dopo ogni sync ──────────────────────────────────
    if athlete_id:
        profile_doc = await db.profile.find_one({"athlete_id": athlete_id})
        max_hr_p = int(profile_doc.get("max_hr", 190)) if profile_doc else 190
        resting_hr_p = int(profile_doc.get("resting_hr", 50)) if profile_doc else 50
        await _compute_fitness_freshness(athlete_id, max_hr_p, resting_hr_p)

    return {"ok": True, "synced": synced}


# ═══════════════════════════════════════════════════════════════════════════════
#  PROFILE
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/profile")
async def get_profile():
    athlete_id = await _get_athlete_id()
    q = {"athlete_id": athlete_id} if athlete_id else {}
    doc = await db.profile.find_one(q)
    if not doc:
        return JSONResponse({"error": "no_profile"}, status_code=404)
    return oid(doc)


@app.patch("/api/profile")
async def update_profile(request: Request):
    body = await request.json()
    body.pop("id", None)
    body.pop("_id", None)
    athlete_id = await _get_athlete_id()
    q = {"athlete_id": athlete_id} if athlete_id else {}
    await db.profile.update_one(q, {"$set": body}, upsert=True)
    doc = await db.profile.find_one(q)
    return oid(doc)


# ═══════════════════════════════════════════════════════════════════════════════
#  RUNS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/runs")
async def get_runs():
    athlete_id = await _get_athlete_id()
    q = {"athlete_id": athlete_id} if athlete_id else {}
    # Exclude heavy fields (streams) from list endpoint to save memory
    projection = {"streams": 0}
    cursor = db.runs.find(q, projection).sort("date", -1)
    runs = await cursor.to_list(length=500)
    return {"runs": oids(runs)}


@app.get("/api/runs/{run_id}")
async def get_run(run_id: str):
    from bson import ObjectId
    try:
        doc = await db.runs.find_one({"_id": ObjectId(run_id)})
    except Exception:
        doc = await db.runs.find_one({"strava_id": int(run_id)}) if run_id.isdigit() else None
    if not doc:
        return JSONResponse({"error": "not_found"}, status_code=404)
    return oid(doc)


@app.get("/api/runs/{run_id}/splits")
async def get_run_splits(run_id: str):
    from bson import ObjectId
    try:
        doc = await db.runs.find_one({"_id": ObjectId(run_id)}, {"splits": 1})
    except Exception:
        doc = await db.runs.find_one({"strava_id": int(run_id)}, {"splits": 1}) if run_id.isdigit() else None
    if not doc:
        return JSONResponse({"error": "not_found"}, status_code=404)
    return {"splits": doc.get("splits", [])}


# ═══════════════════════════════════════════════════════════════════════════════
#  DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/dashboard")
async def get_dashboard():
    athlete_id = await _get_athlete_id()
    q = {"athlete_id": athlete_id} if athlete_id else {}
    profile = await db.profile.find_one(q)
    if not profile:
        profile = {}

    # Last run
    last_run = await db.runs.find_one(q, sort=[("date", -1)])

    # Current training week
    today = dt.date.today().isoformat()
    current_week = await db.training_plan.find_one(
        {"week_start": {"$lte": today}, "week_end": {"$gte": today}}
    )

    next_session = None
    week_progress = None
    if current_week:
        sessions = current_week.get("sessions", [])
        for s in sessions:
            if not s.get("completed"):
                next_session = s
                break
        done_km = sum(s.get("target_distance_km", 0) for s in sessions if s.get("completed"))
        target_km = current_week.get("target_km", 0)
        week_progress = {
            "done_km": round(done_km, 1),
            "target_km": target_km,
            "pct": round((done_km / target_km) * 100) if target_km > 0 else 0,
        }

    # Fitness / Freshness
    ff_docs = await db.fitness_freshness.find().sort("date", -1).to_list(90)
    current_ff = None
    if ff_docs:
        latest = ff_docs[0]
        current_ff = {
            "ctl": latest.get("ctl", 0),
            "atl": latest.get("atl", 0),
            "tsb": latest.get("tsb", 0),
            "status": "Fresh" if latest.get("tsb", 0) > 5 else "Tired" if latest.get("tsb", 0) < -10 else "Neutral",
        }

    # Recovery score
    checkin = await db.recovery_checkins.find_one(sort=[("_id", -1)])
    recovery_score = None
    if checkin:
        factors = [checkin.get(k, 3) for k in ["energy", "sleep_quality", "muscle_soreness", "mood"]]
        recovery_score = round(sum(factors) / len(factors) * 20)

    return {
        "profile": oid(profile) if profile.get("_id") else profile,
        "next_session": next_session,
        "week_progress": week_progress,
        "fitness_freshness": oids(list(reversed(ff_docs))),
        "current_ff": current_ff,
        "last_run": oid(last_run) if last_run else None,
        "recovery_score": recovery_score,
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  TRAINING PLAN
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/training-plan")
async def get_training_plan():
    cursor = db.training_plan.find().sort("week_number", 1)
    weeks = await cursor.to_list(length=100)
    return {"weeks": oids(weeks)}


@app.get("/api/training-plan/current")
async def get_current_week():
    today = dt.date.today().isoformat()
    doc = await db.training_plan.find_one(
        {"week_start": {"$lte": today}, "week_end": {"$gte": today}}
    )
    if not doc:
        # Fallback to latest week
        doc = await db.training_plan.find_one(sort=[("week_number", -1)])
    if not doc:
        return JSONResponse({"error": "no_plan"}, status_code=404)
    return oid(doc)


@app.patch("/api/training-plan/session/complete")
async def toggle_session_complete(request: Request):
    body = await request.json()
    week_id = body.get("week_id")
    session_index = body.get("session_index")
    completed = body.get("completed", False)

    from bson import ObjectId
    try:
        filter_q = {"_id": ObjectId(week_id)}
    except Exception:
        filter_q = {"id": week_id}

    doc = await db.training_plan.find_one(filter_q)
    if not doc:
        return JSONResponse({"error": "week_not_found"}, status_code=404)

    sessions = doc.get("sessions", [])
    if 0 <= session_index < len(sessions):
        sessions[session_index]["completed"] = completed
        await db.training_plan.update_one(filter_q, {"$set": {"sessions": sessions}})

    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
#  FITNESS & FRESHNESS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/fitness-freshness")
async def get_fitness_freshness():
    from datetime import date, timedelta
    athlete_id = await _get_athlete_id()
    q = {"athlete_id": athlete_id} if athlete_id else {}
    cursor = db.fitness_freshness.find(q).sort("date", 1)
    docs = await cursor.to_list(length=1000)

    current = None
    if docs:
        latest = docs[-1]
        ctl = round(latest.get("ctl", 0), 1)
        atl = round(latest.get("atl", 0), 1)
        tsb = round(latest.get("tsb", 0), 1)

        # Trend CTL vs 7 giorni fa
        target_date = (date.today() - timedelta(days=7)).isoformat()
        ctl_7d = ctl
        for doc in reversed(docs):
            if doc.get("date", "") <= target_date:
                ctl_7d = doc.get("ctl", ctl)
                break
        ctl_trend = round(ctl - ctl_7d, 1)

        if tsb > 10:
            form_status, form_color = "Fresco", "green"
        elif tsb > 0:
            form_status, form_color = "Neutro", "yellow"
        elif tsb > -10:
            form_status, form_color = "Affaticato", "orange"
        else:
            form_status, form_color = "Sovrallenamento", "red"

        current = {
            "ctl": ctl, "atl": atl, "tsb": tsb,
            "ctl_trend": ctl_trend,
            "form_status": form_status,
            "form_color": form_color,
        }

    return {"fitness_freshness": oids(docs), "current": current or {}}


@app.post("/api/fitness-freshness/recalculate")
async def recalculate_fitness_freshness():
    """Ricalcola CTL/ATL/TSB da zero per l'atleta corrente."""
    athlete_id = await _get_athlete_id()
    q = {"athlete_id": athlete_id} if athlete_id else {}
    profile_doc = await db.profile.find_one(q)
    max_hr_p = int(profile_doc.get("max_hr", 190)) if profile_doc else 190
    resting_hr_p = int(profile_doc.get("resting_hr", 50)) if profile_doc else 50
    await _compute_fitness_freshness(athlete_id, max_hr_p, resting_hr_p)
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
#  ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════════

def _calc_vdot(runs: list) -> Optional[float]:
    """Estimate VDOT from best recent run using Daniels' formula (simplified)."""
    if not runs:
        return None
    # Find best effort: shortest pace over significant distance
    best = None
    for r in runs:
        if r.get("distance_km", 0) >= 3:
            pace_parts = r.get("avg_pace", "99:99").split(":")
            try:
                pace_s = int(pace_parts[0]) * 60 + int(pace_parts[1])
            except (ValueError, IndexError):
                continue
            if best is None or pace_s < best[1]:
                best = (r, pace_s)
    if not best:
        return None

    run, pace_sec = best
    speed_mpm = 1000 / pace_sec  # meters per minute
    duration_min = run.get("duration_minutes", 30)
    # Simplified Daniels VO2 estimate
    vo2 = -4.60 + 0.182258 * speed_mpm + 0.000104 * speed_mpm ** 2
    pct_max = 0.8 + 0.1894393 * math.exp(-0.012778 * duration_min) + 0.2989558 * math.exp(-0.1932605 * duration_min)
    if pct_max > 0:
        return round(vo2 / pct_max, 1)
    return None


def _predict_race(vdot: float) -> dict:
    """Simplified race time predictions from VDOT."""
    if not vdot:
        return {}
    # Very rough predictions (minutes)
    preds = {
        "5K": 30 * (42 / vdot),
        "10K": 62 * (42 / vdot),
        "Half Marathon": 140 * (42 / vdot),
        "Marathon": 300 * (42 / vdot),
    }
    result = {}
    for dist, mins in preds.items():
        h = int(mins // 60)
        m = int(mins % 60)
        s = int((mins % 1) * 60)
        if h > 0:
            result[dist] = f"{h}:{m:02d}:{s:02d}"
        else:
            result[dist] = f"{m}:{s:02d}"
    return result


@app.get("/api/analytics")
async def get_analytics():
    athlete_id = await _get_athlete_id()
    q = {"athlete_id": athlete_id} if athlete_id else {}
    runs = await db.runs.find(q).sort("date", -1).to_list(500)
    vdot = _calc_vdot(runs)

    # Pace trend (last 20 runs)
    pace_trend = []
    for r in reversed(runs[:20]):
        pace_trend.append({"date": r.get("date"), "pace": r.get("avg_pace")})

    # Zone distribution (simplified from HR data)
    zone_dist = [
        {"zone": "Z1 Recovery", "pct": 15},
        {"zone": "Z2 Easy", "pct": 45},
        {"zone": "Z3 Tempo", "pct": 20},
        {"zone": "Z4 Threshold", "pct": 12},
        {"zone": "Z5 VO2max", "pct": 8},
    ]

    # Goal gap
    profile = await db.profile.find_one(q)
    goal_gap = None
    if profile and profile.get("target_time") and vdot:
        goal_gap = {
            "target": profile.get("target_time"),
            "race": profile.get("race_goal"),
            "predicted": _predict_race(vdot).get(profile.get("race_goal")),
        }

    return {
        "vdot": vdot,
        "race_predictions": _predict_race(vdot) if vdot else {},
        "pace_trend": pace_trend,
        "zone_distribution": zone_dist,
        "goal_gap": goal_gap,
    }


@app.get("/api/prediction-history")
async def get_prediction_history():
    # Return stored predictions or compute from run history
    docs = await db.prediction_history.find().sort("date", 1).to_list(100)
    return {"predictions": oids(docs)}


@app.get("/api/vdot/paces")
async def get_vdot_paces():
    athlete_id = await _get_athlete_id()
    q = {"athlete_id": athlete_id} if athlete_id else {}
    runs = await db.runs.find(q).sort("date", -1).to_list(500)
    vdot = _calc_vdot(runs)
    if not vdot:
        return {"vdot": None, "paces": {}}

    # Training paces from VDOT (simplified)
    base = 1000 / ((vdot + 4.60) / 0.182258)  # sec/km at VO2
    return {
        "vdot": vdot,
        "paces": {
            "easy": _format_pace(1000 / (base * 1.35)),
            "marathon": _format_pace(1000 / (base * 1.15)),
            "tempo": _format_pace(1000 / (base * 1.05)),
            "interval": _format_pace(1000 / base),
            "repetition": _format_pace(1000 / (base * 0.92)),
        },
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  RECOVERY & INJURY RISK
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/recovery-score")
async def get_recovery_score():
    checkin = await db.recovery_checkins.find_one(sort=[("_id", -1)])
    if not checkin:
        return {"score": 75, "label": "Good", "factors": {}, "checkin": None}

    factors = {
        "energy": checkin.get("energy", 3),
        "sleep_quality": checkin.get("sleep_quality", 3),
        "muscle_soreness": checkin.get("muscle_soreness", 3),
        "mood": checkin.get("mood", 3),
    }
    score = round(sum(factors.values()) / len(factors) * 20)
    label = "Excellent" if score >= 85 else "Good" if score >= 65 else "Fair" if score >= 45 else "Poor"
    return {"score": score, "label": label, "factors": factors, "checkin": oid(checkin)}


@app.get("/api/injury-risk")
async def get_injury_risk():
    athlete_id = await _get_athlete_id()
    q = {"athlete_id": athlete_id} if athlete_id else {}
    # ACWR = acute load / chronic load
    runs = await db.runs.find(q).sort("date", -1).to_list(60)
    today = dt.date.today()

    acute_km = 0
    chronic_km = 0
    for r in runs:
        try:
            rd = dt.date.fromisoformat(r.get("date", "2000-01-01"))
        except ValueError:
            continue
        days_ago = (today - rd).days
        km = r.get("distance_km", 0)
        if days_ago <= 7:
            acute_km += km
        if days_ago <= 28:
            chronic_km += km

    chronic_weekly = chronic_km / 4 if chronic_km > 0 else 1
    acwr = round(acute_km / chronic_weekly, 2) if chronic_weekly > 0 else 1.0

    if acwr > 1.5:
        risk_score, risk_label = 80, "High"
    elif acwr > 1.3:
        risk_score, risk_label = 55, "Moderate"
    elif acwr > 0.8:
        risk_score, risk_label = 25, "Low"
    else:
        risk_score, risk_label = 40, "Detraining"

    return {
        "risk_score": risk_score,
        "risk_label": risk_label,
        "acwr": acwr,
        "factors": {
            "acute_load_km": round(acute_km, 1),
            "chronic_load_km": round(chronic_km, 1),
            "acwr": acwr,
        },
    }


@app.post("/api/recovery-checkin")
async def post_recovery_checkin(request: Request):
    body = await request.json()
    body["date"] = dt.date.today().isoformat()
    await db.recovery_checkins.insert_one(body)
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════════════
#  SUPERCOMPENSATION
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/supercompensation")
async def get_supercompensation():
    athlete_id = await _get_athlete_id()
    q = {"athlete_id": athlete_id} if athlete_id else {}
    runs = await db.runs.find(q).sort("date", -1).to_list(30)

    investments = []
    for r in runs[:10]:
        investments.append({
            "date": r.get("date"),
            "load": round(r.get("distance_km", 0) * r.get("duration_minutes", 0) / 10, 1),
            "type": r.get("run_type"),
        })

    # Simple projection
    today = dt.date.today()
    projection = []
    base_fitness = 50
    for i in range(14):
        d = today + dt.timedelta(days=i)
        # Fitness decays slowly, supercompensation peaks 2-3 days after hard effort
        fitness = base_fitness + 5 * math.sin(i * 0.5) * math.exp(-i * 0.05)
        projection.append({"date": d.isoformat(), "fitness": round(fitness, 1)})

    golden_day = (today + dt.timedelta(days=3)).isoformat() if runs else None

    return {
        "investments": investments,
        "golden_day": golden_day,
        "days_to_golden": 3 if runs else None,
        "projection": projection,
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  BADGES
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/badges")
async def get_badges():
    athlete_id = await _get_athlete_id()
    q = {"athlete_id": athlete_id} if athlete_id else {}
    docs = await db.badges.find(q).to_list(100)
    if docs:
        return {"badges": oids(docs)}

    # Compute badges from run data
    runs = await db.runs.find(q).to_list(500)
    total_km = sum(r.get("distance_km", 0) for r in runs)
    total_runs = len(runs)

    badges = [
        {"id": "first_run", "cat": "milestones", "cat_label": "Milestones", "name": "First Steps",
         "desc": "Complete your first run", "icon": "footprints",
         "progress": min(total_runs, 1), "target": 1, "unlocked": total_runs >= 1, "unlocked_date": runs[-1].get("date") if runs else None},
        {"id": "km_100", "cat": "distance", "cat_label": "Distance", "name": "Centurion",
         "desc": "Run 100 km total", "icon": "map",
         "progress": round(min(total_km, 100), 1), "target": 100, "unlocked": total_km >= 100, "unlocked_date": None},
        {"id": "km_500", "cat": "distance", "cat_label": "Distance", "name": "Road Warrior",
         "desc": "Run 500 km total", "icon": "trophy",
         "progress": round(min(total_km, 500), 1), "target": 500, "unlocked": total_km >= 500, "unlocked_date": None},
        {"id": "runs_10", "cat": "consistency", "cat_label": "Consistency", "name": "Getting Hooked",
         "desc": "Complete 10 runs", "icon": "repeat",
         "progress": min(total_runs, 10), "target": 10, "unlocked": total_runs >= 10, "unlocked_date": None},
        {"id": "runs_50", "cat": "consistency", "cat_label": "Consistency", "name": "Dedicated",
         "desc": "Complete 50 runs", "icon": "flame",
         "progress": min(total_runs, 50), "target": 50, "unlocked": total_runs >= 50, "unlocked_date": None},
    ]
    return {"badges": badges}


# ═══════════════════════════════════════════════════════════════════════════════
#  WEEKLY REPORT
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/weekly-report")
async def get_weekly_report():
    athlete_id = await _get_athlete_id()
    today = dt.date.today()
    week_start = today - dt.timedelta(days=today.weekday())
    week_end = week_start + dt.timedelta(days=6)

    q: dict = {"date": {"$gte": week_start.isoformat(), "$lte": week_end.isoformat()}}
    if athlete_id:
        q["athlete_id"] = athlete_id
    runs = await db.runs.find(q).to_list(20)

    total_km = sum(r.get("distance_km", 0) for r in runs)
    total_min = sum(r.get("duration_minutes", 0) for r in runs)

    return {
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "total_runs": len(runs),
        "total_km": round(total_km, 1),
        "total_minutes": round(total_min, 1),
        "avg_pace": _format_pace(1000 / (total_km * 1000 / (total_min * 60))) if total_km > 0 and total_min > 0 else None,
    }


@app.get("/api/weekly-history")
async def get_weekly_history():
    docs = await db.weekly_reports.find().sort("week_start", -1).to_list(52)
    return {"reports": oids(docs)}


# ═══════════════════════════════════════════════════════════════════════════════
#  BEST EFFORTS & HEATMAP
# ═══════════════════════════════════════════════════════════════════════════════

def _secs_to_time(total_s: float) -> str:
    """Format seconds into H:MM:SS or M:SS string."""
    total_s = int(round(total_s))
    h = total_s // 3600
    m = (total_s % 3600) // 60
    s = total_s % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def _best_effort_from_streams(streams: list, target_m: float, actual_duration_s: float = 0) -> Optional[dict]:
    """
    Find the fastest contiguous segment of exactly `target_m` meters.
    Calibrates cumulative time against actual run duration to fix
    gaps from points with pace=None.
    """
    if not streams or len(streams) < 3:
        return None

    n = len(streams)
    dists = [s.get("d", 0) for s in streams]

    # Total distance must cover the target
    if dists[-1] - dists[0] < target_m * 0.95:
        return None

    # Build cumulative time from per-point pace
    cum_t = [0.0] * n
    for i in range(1, n):
        d_diff = dists[i] - dists[i - 1]
        p = streams[i].get("pace")  # sec/km
        if p and p > 0 and d_diff > 0:
            cum_t[i] = cum_t[i - 1] + (d_diff / 1000.0) * p
        else:
            cum_t[i] = cum_t[i - 1]

    # Calibrate: scale cumulative time so total matches actual run duration.
    # This fixes "missing time" from points where pace was None.
    if actual_duration_s > 0 and cum_t[-1] > 0:
        scale = actual_duration_s / cum_t[-1]
        cum_t = [t * scale for t in cum_t]

    best_time = None
    j = 0
    for i in range(n):
        while j < n - 1 and (dists[j] - dists[i]) < target_m:
            j += 1

        actual_dist = dists[j] - dists[i]
        if actual_dist < target_m * 0.95:
            break

        seg_time = cum_t[j] - cum_t[i]

        # Interpolate: subtract overshoot time proportionally
        if actual_dist > target_m and j > 0:
            overshoot = actual_dist - target_m
            d_last = dists[j] - dists[j - 1]
            t_last = cum_t[j] - cum_t[j - 1]
            if d_last > 0 and t_last > 0:
                seg_time -= overshoot * (t_last / d_last)

        if seg_time > 0 and (best_time is None or seg_time < best_time):
            best_time = seg_time

    if best_time is None:
        return None

    pace_s = best_time / (target_m / 1000.0)
    return {"time_s": best_time, "pace_s": pace_s}


def _best_effort_from_splits(splits: list, target_km: int) -> Optional[dict]:
    """
    Sliding window over per-km splits. Only considers full-distance
    splits (ignores the last partial-km split).
    """
    # Filter out partial splits (last split often < 1km)
    full_splits = [s for s in splits if s.get("distance", 0) > 900]
    if not full_splits or len(full_splits) < target_km:
        return None

    best_time = None
    for i in range(len(full_splits) - target_km + 1):
        window = full_splits[i : i + target_km]
        seg_time = sum(s.get("elapsed_time", 0) for s in window)
        if seg_time > 0 and (best_time is None or seg_time < best_time):
            best_time = seg_time

    if best_time is None:
        return None
    pace_s = best_time / target_km
    return {"time_s": best_time, "pace_s": pace_s}


@app.get("/api/best-efforts")
async def get_best_efforts():
    athlete_id = await _get_athlete_id()
    q = {"athlete_id": athlete_id} if athlete_id else {}

    # Target distances: (label, meters, min_run_km, splits_km or None)
    targets = [
        ("400m",            400,   0.3, None),
        ("1 km",           1000,   0.9,  1),
        ("4 km",           4000,   3.5,  4),
        ("5 km",           5000,   4.5,  5),
        ("10 km",         10000,   9.5, 10),
        ("15 km",         15000,  14.5, 15),
        ("Mezza Maratona",21097,  20.0, 21),
        ("Maratona",      42195,  40.0, 42),
    ]

    MIN_PACE_S = 175  # 2:55/km — anything faster is GPS glitch

    bests: dict = {t[0]: None for t in targets}

    # MEMORY FIX: do NOT load streams — only splits + metadata
    runs = await db.runs.find(
        q, {"_id": 1, "distance_km": 1, "duration_minutes": 1, "date": 1,
            "splits": 1}
    ).to_list(1000)

    for r in runs:
        km = r.get("distance_km", 0)
        splits = r.get("splits") or []
        date = r.get("date", "")
        run_id = str(r["_id"])
        actual_s = r.get("duration_minutes", 0) * 60

        for label, target_m, min_km, splits_km in targets:
            if km < min_km:
                continue

            effort = None

            # 1) Splits for whole-km distances (most reliable — times from Strava)
            if splits_km and len(splits) >= splits_km:
                effort = _best_effort_from_splits(splits, splits_km)

            # 2) Fallback: run distance within 10% of target → use total time
            if not effort and abs(km * 1000 - target_m) <= target_m * 0.10:
                if actual_s > 0:
                    pace_s = actual_s / km
                    effort = {"time_s": actual_s, "pace_s": pace_s}

            # Discard GPS glitch results (faster than 2:55/km is not human)
            if effort and effort["pace_s"] < MIN_PACE_S:
                effort = None

            if effort and (bests[label] is None or effort["pace_s"] < bests[label]["pace_s"]):
                bests[label] = {
                    "distance": label,
                    "time": _secs_to_time(effort["time_s"]),
                    "pace": _secs_to_time(effort["pace_s"]) + "/km",
                    "pace_s": effort["pace_s"],
                    "date": date,
                    "run_id": run_id,
                }

    result = [v for v in bests.values() if v is not None]
    order = [t[0] for t in targets]
    result.sort(key=lambda x: order.index(x["distance"]) if x["distance"] in order else 99)
    return {"efforts": [{k: v[k] for k in ("distance", "time", "pace", "date", "run_id")} for v in result]}


@app.get("/api/heatmap")
async def get_heatmap():
    athlete_id = await _get_athlete_id()
    q = {"athlete_id": athlete_id} if athlete_id else {}
    runs = await db.runs.find(q, {"date": 1, "distance_km": 1}).to_list(1000)
    heatmap = {}
    for r in runs:
        d = r.get("date", "")
        if d:
            heatmap[d] = heatmap.get(d, 0) + r.get("distance_km", 0)
    return {"heatmap": [{"date": k, "km": round(v, 1)} for k, v in sorted(heatmap.items())]}


# ═══════════════════════════════════════════════════════════════════════════════
#  AI ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/ai/analyze-run")
async def analyze_run(request: Request):
    body = await request.json()
    run_id = body.get("run_id", "")

    from bson import ObjectId
    try:
        run = await db.runs.find_one({"_id": ObjectId(run_id)})
    except Exception:
        run = None

    if not run:
        return JSONResponse({"error": "not_found"}, status_code=404)

    # Simple rule-based analysis (no external AI call needed)
    km = run.get("distance_km", 0)
    pace = run.get("avg_pace", "")
    hr = run.get("avg_hr")
    run_type = run.get("run_type", "easy")
    splits = run.get("splits", [])

    lines = [f"**{run_type.title()} Run** — {km:.1f} km at {pace}/km"]

    if hr:
        if hr > 170:
            lines.append(f"Heart rate was quite high ({hr} bpm). Consider slowing down on easy days.")
        elif hr < 140 and run_type == "easy":
            lines.append(f"Good heart rate control ({hr} bpm) for an easy run.")

    if splits and len(splits) > 2:
        first_pace = splits[0].get("elapsed_time", 0)
        last_pace = splits[-1].get("elapsed_time", 0)
        if first_pace and last_pace:
            if last_pace < first_pace * 0.95:
                lines.append("Nice negative split! You finished stronger than you started.")
            elif last_pace > first_pace * 1.1:
                lines.append("You slowed down significantly. Try starting more conservatively.")

    if km >= 18:
        lines.append("Great long run! This builds aerobic endurance for race day.")
    elif run_type == "intervals":
        lines.append("Interval sessions boost VO2max. Make sure to recover well before the next hard effort.")

    return {"analysis": "\n\n".join(lines)}
