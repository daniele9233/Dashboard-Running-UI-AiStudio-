# Istruzioni Agente — METIC LAB

Operi all'interno di un'architettura a 3 livelli che separa le responsabilita per massimizzare l'affidabilita. Gli LLM sono probabilistici, la logica di business e deterministica. Questo sistema risolve il problema.

## Progetto: METIC LAB

Dashboard web per runner con integrazione Strava, analisi scientifica e coaching AI.
**Multi-utente dal giorno zero** — ogni utente ha dati isolati tramite `athlete_id`.

### Stack Tecnologico (NON modificare)
| Layer | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Routing | React Router v6 |
| Mappe | MapLibre GL JS (open-source, no API key) |
| Grafici | SVG custom dentro componenti React |
| Backend | FastAPI (Python 3.11) + Motor (MongoDB async) |
| Database | MongoDB Atlas (M0 Free) |
| AI | Claude 4 Haiku (primario) + Google Gemini (fallback) |
| Auth | Strava OAuth 2.0 → athlete_id |
| Hosting | Render.com (backend), Vite dev server (frontend) |

---

## Architettura a 3 Livelli

**Livello 1: Direttive (Cosa fare)**
- SOP scritte in Markdown, nella root del progetto (`PRD.md`, `README.md`)
- Definiscono requisiti, input, output, casi limite
- Il PRD e la fonte di verita per ogni decisione di prodotto

**Livello 2: Orchestrazione (Decisioni)**
- Il tuo lavoro: routing intelligente
- Leggi le direttive, chiama gli strumenti di esecuzione nell'ordine giusto
- Gestisci errori, chiedi chiarimenti, aggiorna la documentazione
- NON implementare logica scientifica "a mano" — usa funzioni deterministiche

**Livello 3: Esecuzione (Fare il lavoro)**
- Codice deterministico: funzioni pure per formule scientifiche
- Backend: endpoint FastAPI in `backend/server.py`
- Frontend: componenti React in `src/components/`
- Affidabili, testabili, ben tipizzati

---

## Regole Inviolabili

### Multi-Utente
1. **OGNI** documento MongoDB DEVE avere il campo `athlete_id`
2. **OGNI** query MongoDB DEVE filtrare per `athlete_id`
3. **OGNI** endpoint API DEVE estrarre `athlete_id` dal token/sessione
4. **MAI** restituire dati senza filtro `athlete_id`
5. Helper: `_get_athlete_id()` estrae l'athlete_id dal token Strava in sessione

### MongoDB
1. **MAI** caricare il campo `streams` in endpoint lista (`/api/runs`, `/api/best-efforts`)
2. Usare sempre projection per escludere campi pesanti: `{"streams": 0}`
3. Limit massimo 1000 documenti per query lista
4. Indici pianificati su `athlete_id` + `date` per ogni collection
5. Usare Motor (async) per tutte le operazioni DB — mai PyMongo sincrono

### Memory (Render 512MB)
1. MAI caricare tutti gli streams in memoria
2. Calcoli su grandi dataset: processare in streaming o a batch
3. Best efforts: usare solo splits + metadata, mai streams
4. Profilare memory usage se si aggiungono nuovi endpoint pesanti

### Strava API
1. Rate limit: 100 richieste / 15 minuti per utente
2. Token refresh automatico quando scaduto
3. Streams scaricati solo per singola corsa (dettaglio), mai in batch
4. `athlete_id` viene dal profilo Strava al momento dell'OAuth
5. Ogni corsa sincronizzata: salvare `strava_id` per evitare duplicati

### Formule Scientifiche
Tutte le formule DEVONO essere implementate come **funzioni pure deterministiche**.
NON lasciarle inline nel codice — creare funzioni dedicate e testate.

| Formula | Funzione | File |
|---|---|---|
| VDOT (Daniels) | `calculate_vdot(distance_m, time_s)` | `backend/server.py` |
| Zone Daniels | `get_daniels_paces(vdot)` | `backend/server.py` |
| TRIMP (Lucia) | `calculate_trimp(duration_min, hr_avg, hr_max, hr_rest)` | `backend/server.py` |
| CTL/ATL/TSB (Banister) | `calculate_fitness_freshness(trimp_history)` | `backend/server.py` |
| Recovery Score | `calculate_recovery(objective_factors, checkin)` | `backend/server.py` |
| Injury Risk | `calculate_injury_risk(factors)` | `backend/server.py` |
| Supercompensazione | `calculate_supercompensation(run_type, date)` | `backend/server.py` |

### Frontend
1. Dark theme: sfondo `#121212`, card `#181818`, bordi `#2A2A2A`
2. Primary blue: `#3B82F6`, success green: `#10B981`
3. Grafici: SVG custom dentro componenti React — NO librerie esterne (no Recharts, no Chart.js)
4. Mappe: MapLibre GL con tiles `https://tiles.openfreemap.org/styles/dark`
5. Stato: `useApi` hook custom + `useState` — NO Redux, NO Zustand
6. Tipizzazione: interfacce in `src/types/api.ts`, mai `any`
7. Ogni componente pagina in `src/components/NomeView.tsx`

### API Design
1. Tutti gli endpoint sotto `/api/`
2. GET per lettura, POST per azioni, PATCH per aggiornamenti parziali
3. Risposta JSON con campi consistenti
4. Errori: `{"detail": "messaggio"}` con codice HTTP appropriato
5. Nessun endpoint senza autenticazione (tranne health check)

---

## Principi Operativi

### 1. Controlla prima cosa esiste
Prima di creare qualcosa, controlla `backend/server.py` e `src/components/`. Non duplicare logica.

### 2. Auto-correggiti
- Leggi il messaggio di errore e lo stack trace
- Correggi e testa
- Aggiorna la documentazione con cio che hai imparato
- Se tocchi token/crediti a pagamento: chiedi prima all'utente

### 3. Aggiorna la documentazione
PRD.md e README.md sono documenti vivi. Quando scopri vincoli, approcci migliori, errori comuni — aggiornali. Ma NON sovrascrivere senza chiedere.

### 4. Una cosa alla volta
- Implementa una feature completa (backend + frontend) prima di passare alla successiva
- Testa che funzioni end-to-end
- Committa con messaggio chiaro

### 5. Non inventare dati
- Se non ci sono dati, mostra uno stato vuoto appropriato
- Mai hardcodare dati fittizi in produzione
- I placeholder sono accettabili SOLO durante lo sviluppo

---

## Loop di Auto-Correzione

Quando qualcosa si rompe:
1. Leggi l'errore completo
2. Identifica la causa root (non il sintomo)
3. Correggi nel punto giusto
4. Testa che funzioni
5. Aggiorna la documentazione se hai scoperto un vincolo nuovo
6. Il sistema ora e piu forte

---

## Struttura Progetto

```
web-app/
├── backend/
│   └── server.py              # FastAPI — TUTTO il backend in un file
├── src/
│   ├── api/
│   │   ├── client.ts          # Axios client (base URL configurato)
│   │   └── index.ts           # Chiamate API tipizzate
│   ├── components/
│   │   ├── App.tsx             # Router principale
│   │   ├── Sidebar.tsx         # Navigazione
│   │   ├── DashboardView.tsx   # Dashboard
│   │   ├── ActivitiesView.tsx  # Lista corse
│   │   ├── ProfileView.tsx     # Profilo completo
│   │   ├── TrainingView.tsx    # Piano allenamento
│   │   ├── RoutesView.tsx      # Mappa percorsi
│   │   └── statistics/         # Sotto-pagine statistiche
│   ├── hooks/
│   │   └── useApi.ts           # Hook generico fetch
│   ├── types/
│   │   └── api.ts              # Interfacce TypeScript
│   └── main.tsx
├── PRD.md                      # Requisiti di prodotto (fonte di verita)
├── README.md                   # Documentazione tecnica
├── GEMINI.md                   # Queste istruzioni
└── .claude/launch.json         # Dev server config
```

---

## Checklist Fase Corrente

Consulta sempre il PRD.md per i requisiti dettagliati di ogni feature.
Implementa nell'ordine delle fasi definite nel README.md.
Dopo ogni feature completata: aggiorna README.md (sezione Changelog) e committa.

---

## Riepilogo

Ti posizioni tra intenzione umana (PRD + README) ed esecuzione deterministica (codice tipizzato).
Leggi i requisiti, prendi decisioni, implementa, testa, migliora continuamente.

Sii pragmatico. Sii affidabile. Auto-correggiti.
