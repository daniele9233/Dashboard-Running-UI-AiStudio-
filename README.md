# METIC LAB — Running Training Dashboard

Dashboard web completa per il monitoraggio e la pianificazione dell'allenamento running, con integrazione Strava e analisi AI.
Progettata fin dall'inizio per supportare **multi-utente** — ogni runner ha il suo profilo, le sue corse, statistiche e piano di allenamento personalizzato.

Basata sulla logica scientifica dell'app [CORRALEJO 2026](https://github.com/daniele9233/CORRALEJO-2026), adattata per il web e scalata per N utenti.

---

## Indice

- [Stack Tecnologico](#stack-tecnologico)
- [Repository](#repository)
- [Architettura](#architettura)
- [Architettura Multi-Utente](#architettura-multi-utente)
- [Backend](#backend)
- [Frontend](#frontend)
- [Pagine dell'App](#pagine-dellapp)
- [Funzionalita Implementate](#funzionalita-implementate)
- [Funzionalita Pianificate](#funzionalita-pianificate)
- [API Endpoints](#api-endpoints)
- [Sistema VDOT (Jack Daniels)](#sistema-vdot-jack-daniels)
- [Integrazione Strava](#integrazione-strava)
- [Piano di Allenamento Scientifico](#piano-di-allenamento-scientifico)
- [Recovery e Injury Risk](#recovery-e-injury-risk)
- [Supercompensazione](#supercompensazione)
- [Sistema Medaglie e Badge](#sistema-medaglie-e-badge)
- [AI Coach](#ai-coach)
- [Deploy](#deploy)
- [Variabili d'Ambiente](#variabili-dambiente)
- [Come Avviare in Locale](#come-avviare-in-locale)

---

## Stack Tecnologico

### Frontend
| Tecnologia | Ruolo |
|---|---|
| React 18 | UI library |
| TypeScript | Tipizzazione statica |
| Vite | Build tool e dev server |
| React Router | Client-side routing |
| Tailwind CSS | Utility-first styling |
| MapLibre GL | Mappe (hero map, heatmap) |
| Lucide React | Icone |
| SVG custom | Grafici (pace progression, fitness & freshness) |

### Backend
| Tecnologia | Ruolo |
|---|---|
| Python 3.11 | Runtime |
| FastAPI | Web framework async |
| Uvicorn | ASGI server |
| Motor 3.x | MongoDB async driver |
| httpx | HTTP client (Strava API) |
| Claude Sonnet 4.6 | AI Coach primario (Anthropic) |
| Google Gemini | AI Coach fallback (gratuito) |
| python-dotenv | Env variables |

### Database
| Tecnologia | Piano | Ruolo |
|---|---|---|
| MongoDB Atlas | M0 Free | Database cloud NoSQL |

### Hosting
| Servizio | Piano | Ruolo |
|---|---|---|
| Render.com | Free | Backend hosting |
| Vercel / Render Static | Free | Frontend hosting (futuro) |

---

## Repository

| Campo | Valore |
|---|---|
| **Repository** | https://github.com/daniele9233/Dashboard-Running-UI-AiStudio-.git |
| **Branch principale** | `main` |
| **Backend URL** | https://dani-backend-ea0s.onrender.com |
| **Frontend locale** | http://localhost:3000 |

### Struttura Repository
```
web-app/
├── backend/
│   └── server.py              # Server FastAPI (tutte le route)
├── src/
│   ├── api/
│   │   ├── client.ts          # Axios client configurato
│   │   └── index.ts           # Tutte le chiamate API tipizzate
│   ├── components/
│   │   ├── App.tsx             # Router principale
│   │   ├── Sidebar.tsx         # Navigazione laterale
│   │   ├── DashboardView.tsx   # Dashboard
│   │   ├── ActivitiesView.tsx  # Lista attivita
│   │   ├── ProfileView.tsx     # Profilo con heatmap, pace, zones, 80/20
│   │   ├── TrainingView.tsx    # Piano allenamento
│   │   ├── RoutesView.tsx      # Mappa percorsi
│   │   ├── statistics/
│   │   │   ├── StatisticsView.tsx  # Hub statistiche
│   │   │   ├── StatsProgress.tsx   # Progressi e previsioni
│   │   │   ├── StatsRisk.tsx       # Recovery e injury risk
│   │   │   └── StatsCalc.tsx       # Calcolatore passi
│   │   ├── FitnessFreshness.tsx    # Grafico Banister CTL/ATL/TSB
│   │   ├── AnaerobicThreshold.tsx  # Soglia anaerobica
│   │   └── TopStats.tsx            # Stats header
│   ├── hooks/
│   │   └── useApi.ts           # Hook generico per chiamate API
│   ├── types/
│   │   └── api.ts              # Interfacce TypeScript
│   ├── lib/
│   │   └── utils.ts            # Utility functions
│   ├── main.tsx                # Entry point React
│   └── index.css               # Tailwind + stili globali
├── .claude/
│   └── launch.json             # Config dev server per Claude Preview
├── index.html
├── vite.config.ts
├── tsconfig.json
└── README.md                   # Questo file
```

---

## Architettura

```
┌──────────────┐     HTTPS/JSON     ┌──────────────────┐     MongoDB Driver     ┌─────────────┐
│  Web App     │ <───────────────> │  FastAPI Backend  │ <───────────────────> │ MongoDB Atlas│
│  (React/Vite)│                    │  (Render.com)     │                       │  (M0 Free)  │
└──────────────┘                    └──────────────────┘                       └─────────────┘
                                            │
                                            │ httpx
                                            ▼
                                    ┌──────────────────┐
                                    │   Strava API v3  │
                                    │   Anthropic API  │
                                    │   Gemini API     │
                                    └──────────────────┘
```

- **Frontend** — SPA React con Vite, routing client-side, dark theme
- **Backend** — Single-file FastAPI (`server.py`), async, tutte le route sotto `/api`
- **Database** — MongoDB Atlas, ogni documento ha `athlete_id` per isolamento multi-utente
- **AI** — Claude Sonnet 4.6 (primario) + Google Gemini (fallback) per analisi corse
- **Strava** — OAuth 2.0 per sync attivita

---

## Architettura Multi-Utente

METIC LAB e progettato per scalare da 1 a 1000+ utenti. Ogni utente e isolato tramite `athlete_id` (dal profilo Strava).

### Principi di design

1. **Isolamento dati** — Ogni documento MongoDB (runs, profile, training_weeks, badges, ecc.) contiene il campo `athlete_id`. Tutte le query filtrano per `athlete_id`.

2. **Autenticazione** — Fase 1: Strava OAuth token (attuale). Fase 2: JWT con refresh token per sessioni sicure e persistenti.

3. **Personalizzazione completa** — Ogni utente avra:
   - Le sue corse (da Strava o manuali)
   - Il suo profilo (FC max, peso, eta, obiettivo gara)
   - Il suo VDOT calcolato dalle sue corse
   - Il suo piano di allenamento generato su misura
   - Le sue statistiche e previsioni
   - I suoi badge e medaglie
   - Il suo recovery score
   - Il suo weekly report AI personalizzato

4. **Performance a scala** — Previsti:
   - Indici MongoDB su `athlete_id` + `date`
   - Paginazione su tutti gli endpoint lista
   - Cache in-memory per calcoli pesanti (best-efforts, analytics, VDOT)
   - Rate limiting per utente

### Collezioni MongoDB (con `athlete_id`)
| Collezione | Descrizione |
|---|---|
| `profiles` | Profilo atleta (uno per utente): FC max, peso, eta, obiettivo, VDOT, PB |
| `runs` | Corse (Strava + manuali), ognuna con `athlete_id` |
| `training_weeks` | Piano allenamento per-utente, settimane con sessioni |
| `tests` | Test fisici (Cooper, 5K time trial, ecc.) |
| `vo2max_history` | Storico VDOT per-utente nel tempo |
| `adaptation_log` | Log decisioni auto-adattamento piano |
| `recovery_checkins` | Check-in mattutini (energia, sonno, dolori, umore) |
| `badges` | Badge/trofei sbloccati per-utente |
| `weekly_reports` | Report settimanali AI generati |

---

## Backend

### URL Produzione
```
https://dani-backend-ea0s.onrender.com
```

### Logica principale (da CORRALEJO, adattata multi-utente)

#### Generazione Piano di Allenamento (per utente)
- Piano personalizzato basato su: obiettivo gara, livello attuale, VDOT, settimane alla gara
- 6 fasi di periodizzazione: Ripresa > Base Aerobica > Sviluppo > Prep. Specifica > Picco > Tapering
- Settimane di recupero ogni 3-4 settimane (-30% volume)
- KM settimanali progressivi calibrati sul livello dell'utente
- Passi calcolati dalle formule di Jack Daniels (VDOT)

#### Calcolo VDOT Dinamico (Jack Daniels)
- Stima VO2max dai migliori risultati su distanze 4-21km
- Solo da **sforzi validati**: distanza >= 4km, FC >= 85% FCmax
- **Regola dei 2/3**: applica solo il 67% del miglioramento misurato
- **Cap +1 VDOT per mesociclo** (4 settimane)
- 5 zone di allenamento derivate: Easy, Marathon, Threshold, Interval, Repetition
- Ricalcolo automatico dopo ogni sync Strava

#### Auto-adattamento Piano (5 modelli peer-reviewed)
| Modello | Riferimento | Cosa controlla |
|---|---|---|
| **Spike Detection** | Impellizzeri et al. (2020) | Carico acuto e cronico monitorati separatamente. Spike >30% WoW > volume -15% |
| **Regola del 10%** | ACSM (2013) | Incremento settimanale max 10% |
| **Monotonia** | Foster (1998) | Monotonia >2.0 > volume -5% |
| **Polarizzazione 80/20** | Seiler (2010) | Se <75% corse facili > avviso |
| **Tapering** | Mujika & Padilla (2003) | Settimane finali: -20%/-40%/-55% volume |

#### Confronto Strava vs Piano
- Ogni corsa sincronizzata viene confrontata con la sessione pianificata
- Calcola deviazione passo e distanza
- Verdetto: perfetto / troppo_lento / troppo_veloce / ok / extra
- Auto-completa sessioni corrispondenti

#### Best Efforts (Personal Records)
- Algoritmo splits-based per distanze intere (1km, 4km, 5km, 10km, 15km, 21km, 42km)
- Fallback su tempo totale per sub-km (400m)
- Filtro GPS glitch: MIN_PACE_S = 175 (2:55/km)
- Navigazione click su PR > pagina dettaglio corsa

---

## Frontend

### Tema e Design
- **Dark theme** con sfondo `#121212`
- **Primary color**: Blue `#3B82F6`
- **Success**: Green `#10B981`
- **Card**: `#181818` con bordi `#2A2A2A`, rounded 2xl
- **Font**: System default
- **Gradients**: usati su heatmap, grafici e header cards
- **Glow effects**: subtle shadows colorate su elementi interattivi

---

## Pagine dell'App

### 1. Dashboard
Overview completa dell'atleta:
- Stats rapide (km totali, corse, passo medio, trend)
- Sessione del giorno (dalla training plan)
- Grafico KM ultime 12 settimane
- Corse recenti con passo e distanza
- Countdown alla prossima gara

### 2. Activities
Lista completa delle corse:
- Card per ogni corsa: data, luogo, distanza, passo, durata, FC
- Click > dettaglio con splits, zone HR, analisi AI
- Filtri e ordinamento

### 3. Training Plan
Piano di allenamento personalizzato:
- Barra fasi con 6 colori (Ripresa > Tapering)
- Vista settimanale con sessioni
- Toggle completamento per sessione
- Stato adattamento e suggerimenti

### 4. Profile
Pagina profilo completa:
- **Hero map**: MapLibre con polyline dell'ultima corsa
- **Photo upload**: canvas resize > base64 > MongoDB
- **Quick stats**: KM totali, corse, FC max, personal best
- **Running Consistency**: heatmap GitHub-style ultimi 6 mesi con:
  - Dati reali da corse (fallback da runs se API heatmap vuota)
  - Stats: streak, best streak, media/run, giorno top
  - Frequenza per giorno della settimana (barre)
- **Progressione del Passo**: grafico SVG con:
  - Linea gradiente blu>viola>rosa sulle ultime 20 corse
  - Punto giallo per il best pace
  - Linea media tratteggiata
  - Stats: best pace, media, ultime 5, trend
  - Distribuzione distanze (< 5km, 5-10km, 10-20km, 20+ km)
- **Training Zones** (valori fissi):
  - Z1 Recupero: < 117 bpm
  - Z2 Resistenza: 118-146 bpm
  - Z3 Ritmo: 147-160 bpm
  - Z4 Soglia: 161-175 bpm
  - Z5 Anaerobico: > 176 bpm
- **Regola 80/20**: Lente (Z1-Z2, HR <= 146) vs Veloci (Z3-Z5, HR > 146), barra con marker 80%, breakdown per corsa, periodi 7g/14g
- **Personal Records**: click naviga alla corsa su Strava
- **Strava**: bottoni Connect + Sync

### 5. Statistics
Analytics avanzate (in sviluppo):
- VO2max gauge con trend
- Previsioni gara (VDOT Daniels)
- Soglia anaerobica
- Fitness & Freshness (Banister CTL/ATL/TSB)
- Recovery Score + Injury Risk
- Calcolatore passi

### 6. Routes
Mappa con tutti i percorsi corsi (heatmap geografica)

---

## Funzionalita Implementate

| # | Feature | Stato |
|---|---|---|
| 1 | Strava OAuth + Sync corse | Fatto |
| 2 | Multi-utente base (athlete_id su tutti i documenti e endpoint) | Fatto |
| 3 | Personal Records (splits-based, filtro GPS glitch, nav a corsa) | Fatto |
| 4 | Memory fix Render (esclusi streams da endpoint lista) | Fatto |
| 5 | Profile: foto upload, training zones fisse, regola 80/20 | Fatto |
| 6 | Running Consistency: heatmap dati reali, stats, frequenza | Fatto |
| 7 | Progressione del Passo: grafico SVG, distribuzione distanze | Fatto |
| 8 | Hero Map: MapLibre con polyline ultima corsa | Fatto |
| 9 | Best Efforts con navigazione a pagina corsa | Fatto |

---

## Funzionalita Pianificate

Ogni feature sara implementata con logica multi-utente (dati isolati per `athlete_id`).

### Fase 1 — Core Features
| # | Feature | Descrizione |
|---|---|---|
| 1 | Dashboard dati reali | Collegare tutti i widget a dati reali |
| 2 | VDOT Dinamico | Calcolo automatico dai migliori risultati, 5 zone Daniels |
| 3 | Training Plan generatore | Piano personalizzato: obiettivo, livello, VDOT, periodizzazione 6 fasi |
| 4 | Training Plan auto-adapt | 5 modelli scientifici: spike, ACSM 10%, Foster, Seiler 80/20, Mujika tapering |
| 5 | Dettaglio Corsa | Splits, zone passo, HR chart, confronto piano, analisi AI |
| 6 | Analytics completa | VO2max gauge, previsioni gara VDOT, best efforts, volume zone |

### Fase 2 — Advanced Analytics
| # | Feature | Descrizione |
|---|---|---|
| 7 | Fitness & Freshness | Modello Banister: TRIMP Lucia, CTL 42gg, ATL 7gg, TSB, grafico interattivo |
| 8 | Soglia Anaerobica | Stima da corse threshold, trend storico |
| 9 | Recovery Score | 4 fattori oggettivi + check-in mattutino (energia, sonno, dolori, umore) |
| 10 | Injury Risk | 7 fattori ponderati: ACWR, WoW, intensita, recupero, Foster, ACSM 10% |
| 11 | Supercompensazione | Curva maturazione, proiezione 14gg, golden day, training ROI |
| 12 | Decoupling Cardiaco | Pa:Hr trend, efficienza aerobica settimanale |

### Fase 3 — Gamification & Reports
| # | Feature | Descrizione |
|---|---|---|
| 13 | Medaglie 6 livelli | Per distanza (5K, 10K, 15K, 21K): Warm-up > Bronzo > Argento > Oro > Platino > Elite |
| 14 | Badge 100+ | 8 categorie: milestone, costanza, miglioramenti, allenamento, mezza, scienza, velocita, fun |
| 15 | Weekly Report AI | Report settimanale: km, aderenza, analisi AI Claude, preview prossima settimana |
| 16 | DNA della Corsa | Heatmap annuale 52x7 con TRIMP, zona HR, streak, mutazioni |

### Fase 4 — Scalabilita
| # | Feature | Descrizione |
|---|---|---|
| 17 | JWT Auth | Sessioni sicure per N utenti con refresh token |
| 18 | Indici MongoDB | athlete_id + date su tutte le collection |
| 19 | Paginazione API | Tutte le liste con limit/offset |
| 20 | Rate Limiting | Per-utente per proteggere il backend |
| 21 | Onboarding Flow | Setup primo accesso: obiettivo, livello, FC max |
| 22 | Cache Layer | Redis/in-memory per calcoli pesanti |
| 23 | Mobile Responsive | Layout ottimizzato per smartphone |
| 24 | Upgrade Render | Piano a pagamento per produzione |

---

## API Endpoints

Base URL: `https://dani-backend-ea0s.onrender.com/api`

Tutti gli endpoint filtrano per `athlete_id` (dal token Strava in sessione).

### Attuali
| Metodo | Endpoint | Descrizione |
|---|---|---|
| GET | `/profile` | Profilo utente |
| PATCH | `/profile` | Aggiorna profilo |
| GET | `/dashboard` | Dati dashboard |
| GET | `/runs` | Tutte le corse (senza streams) |
| GET | `/runs/{id}` | Singola corsa |
| GET | `/runs/{id}/splits` | Splits per km |
| GET | `/training-plan` | Piano allenamento |
| GET | `/training-plan/current` | Settimana corrente |
| PATCH | `/training-plan/session/complete` | Segna sessione completata |
| GET | `/fitness-freshness` | Fitness & Freshness (Banister) |
| GET | `/analytics` | Statistiche avanzate |
| GET | `/prediction-history` | Storico previsioni |
| GET | `/vdot/paces` | VDOT + 5 passi Daniels |
| GET | `/recovery-score` | Recovery Score |
| POST | `/recovery-checkin` | Check-in mattutino |
| GET | `/injury-risk` | Injury Risk Score |
| GET | `/supercompensation` | Supercompensazione |
| GET | `/badges` | Badge e trofei |
| GET | `/best-efforts` | Personal Records |
| GET | `/heatmap` | Heatmap dati |
| GET | `/weekly-report` | Report settimanale |
| GET | `/weekly-history` | Storico settimane |
| GET | `/strava/auth-url` | URL OAuth Strava |
| POST | `/strava/exchange-code` | Scambia codice auth |
| POST | `/strava/sync` | Sync corse da Strava |
| POST | `/ai/analyze-run` | Analisi AI corsa |

### Pianificati
| Metodo | Endpoint | Descrizione |
|---|---|---|
| POST | `/training-plan/generate` | Genera piano personalizzato per utente |
| POST | `/training-plan/adapt` | Auto-adatta piano (5 modelli) |
| GET | `/training-plan/adaptation-status` | Metriche scientifiche |
| POST | `/training-plan/recalculate-paces` | Ricalcola passi da VDOT |
| GET | `/vo2max-history` | Storico VDOT |
| POST | `/vo2max-history/rebuild` | Ricostruisci storico |
| GET | `/cadence-history` | Storico cadenza |
| GET | `/decoupling-history` | Storico decoupling |
| GET | `/medals` | Medaglie per distanza |
| POST | `/runs` | Aggiungi corsa manuale |
| GET | `/weekly-report` | Report AI settimanale |

---

## Sistema VDOT (Jack Daniels)

Il VDOT viene calcolato automaticamente dai migliori risultati dell'atleta.

### Come funziona
1. **Input**: migliore prestazione su distanze 4-21km (da corse validate)
2. **Calcolo VO2**: `VO2 = -4.60 + 0.182258*v + 0.000104*v^2`
3. **% VO2max**: dalla formula del costo % in funzione del tempo
4. **VDOT** = VO2 / % (es. VDOT 48.7)

### Validazione sforzi
- Distanza >= 4km
- FC media >= 85% della FC Max dell'utente
- Passo tra 2:30 e 9:00/km
- Cap VDOT a 55 (runner amatoriale)

### Zone di allenamento
| Zona | % VO2max | Uso |
|---|---|---|
| Easy (E) | ~65% | Corsa lenta, lungo |
| Marathon (M) | ~79% | Ritmo gara maratona |
| Threshold (T) | ~88% | Progressivo, ripetute medie |
| Interval (I) | ~98% | Ripetute |
| Repetition (R) | ~105% | Sprint brevi |

---

## Integrazione Strava

### Flusso OAuth
1. Utente preme "Connetti Strava" nel Profilo
2. Frontend chiama `GET /strava/auth-url`
3. Redirect a pagina autorizzazione Strava
4. Strava redirect con `?code=XXX`
5. Frontend chiama `POST /strava/exchange-code` con il codice
6. Backend salva token e crea/aggiorna profilo con `athlete_id`

### Sync
1. Backend recupera attivita recenti da Strava API v3
2. Per ogni nuova Run: salva con `athlete_id`, calcola passo/splits
3. Confronta con sessione pianificata (se piano attivo)
4. Ricalcola VDOT se nuovi migliori risultati
5. Aggiorna best efforts

---

## Piano di Allenamento Scientifico

### Fasi di Periodizzazione
| # | Fase | Obiettivo |
|---|---|---|
| 1 | Ripresa | Ritorno graduale |
| 2 | Base Aerobica | Costruire base |
| 3 | Sviluppo | Aumentare volume e intensita |
| 4 | Prep. Specifica | Lavori specifici per la gara |
| 5 | Picco | Massima forma |
| 6 | Tapering | Scarico pre-gara |

### Tipi di Sessione
| Tipo | Zona Daniels | Descrizione |
|---|---|---|
| Corsa Lenta | Easy | Base aerobica |
| Lungo | Easy > Marathon | Corsa lunga progressiva |
| Ripetute | Interval | Intervalli ad alta intensita |
| Progressivo | Threshold | Dal passo Easy al Threshold |
| Rinforzo | — | Esercizi di forza |
| Riposo | — | Recupero completo |

---

## Recovery e Injury Risk

### Recovery Score (0-100)
- **4 fattori oggettivi** (dai dati corse):
  - Ore dall'ultimo allenamento
  - Carico 3gg vs media 21gg
  - TSB (Forma Fisica Banister)
  - Intensita ultimo allenamento (HR%)
- **Check-in mattutino** (4 input):
  - Energia (1-5), Sonno (1-5), Dolori (1-5), Umore (1-5)
- **Calcolo**: senza check-in = 100% oggettivo; con check-in = 40% oggettivo + 60% soggettivo

### Injury Risk (0-100)
7 fattori ponderati: ACWR, incremento WoW, storico infortuni, intensita, recupero, Foster Monotony, ACSM 10%

---

## Supercompensazione

Basata sul modello Fitness-Fatigue (impulso-risposta):
- **Curva maturazione**: Stimolo > Recupero > Supercompensazione
- 3 tipi di adattamento:
  - Neuromuscolare (3-7 giorni): sprint, salite
  - Metabolico (7-14 giorni): soglia, ripetute
  - Strutturale (14-21 giorni): lunghi, base aerobica
- **Proiezione 14 giorni**: grafico futuro con picco
- **Golden Day**: data ottimale per gara o test
- **Training ROI**: portafoglio biologico degli investimenti

---

## Sistema Medaglie e Badge

### Medaglie — 6 livelli per distanza
Per 5K, 10K, 15K, 21.1K:
Warm-up > Bronzo > Argento > Oro > Platino > Elite

### Badge — 100+ in 8 categorie
| Categoria | Esempi |
|---|---|
| Milestone distanza | 100km, 500km, 1000km, 5000km |
| Costanza | Streak 3/5 settimane, Mese d'oro, 365 giorni |
| Miglioramenti | VDOT +1/+2/+5, PB su distanze |
| Allenamento | Lungo 20+km, Volume sett 40/60/80km |
| Mezza maratona | 15km, 18km, 20km, Ritmo gara, Finisher |
| Scienza | 80/20, Cuore efficiente, Cadenza 180 |
| Velocita | Sprint su 200m, 400m, 1km, 5km, 10km |
| Fun | Primo passo, Il Ritorno, Maratona mensile |

---

## AI Coach

### Priorita
1. **Claude Sonnet 4.6** (Anthropic) — risposte personalizzate, temperature 0.9
2. **Google Gemini** — fallback gratuito
3. **Analisi algoritmica** — fallback offline

### Analisi Corsa (9 sezioni)
1. Intro personalizzata
2. Dati corsa
3. Classificazione tipo sforzo
4. Utilita per obiettivo
5. Aspetti positivi
6. Lacune e miglioramenti
7. Reality check con tempi stimati
8. Consigli tecnici con workout specifici
9. Voto /10

### Weekly Report AI
Report settimanale automatico con: verdetto, positivi, miglioramenti, focus prossima settimana, consiglio personalizzato.

---

## Deploy

### Backend (Render.com)
- **URL**: https://dani-backend-ea0s.onrender.com
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- **Auto-deploy**: su push a `main`

> Il piano Free va in sleep dopo 15 minuti. Prima richiesta ~50s.

---

## Variabili d'Ambiente

### Backend (Render.com)
| Variabile | Descrizione |
|---|---|
| `MONGO_URL` | Connection string MongoDB Atlas |
| `DB_NAME` | Nome database |
| `STRAVA_CLIENT_ID` | Client ID app Strava |
| `STRAVA_CLIENT_SECRET` | Client Secret app Strava |
| `ANTHROPIC_API_KEY` | API key Claude Sonnet 4.6 |
| `GEMINI_API_KEY` | API key Google Gemini |

---

## Come Avviare in Locale

### Frontend
```bash
cd web-app
npm install
npm run dev
# Apri http://localhost:3000
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# oppure: venv\Scripts\activate  # Windows

pip install -r requirements.txt

# Crea file .env con le variabili
uvicorn server:app --reload --port 8000
```

---

## Changelog

### v0.5.0 — Marzo 2026
- Profile redesign: Running Consistency heatmap, Progressione del Passo
- Rimossi placeholder (Variant B Calendar, Variant C Streak Rings)
- Dati reali su heatmap, pace chart, distribuzione distanze

### v0.4.0
- Multi-utente base: athlete_id su tutti i documenti
- Memory fix: esclusi streams da endpoint lista
- Best efforts: splits-based con filtro GPS glitch
- Profile: foto upload, training zones fisse, regola 80/20
