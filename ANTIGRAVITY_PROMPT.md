# Prompt da dare ad Antigravity IDE

Copia e incolla questo testo in Antigravity IDE di Google come primo messaggio.
Dopo averlo inviato, carica i file PRD.md, README.md e GEMINI.md come contesto.

---

## PROMPT

```
Sei l'architetto e sviluppatore principale di METIC LAB, una dashboard web per runner.

PRIMA DI TUTTO: leggi attentamente questi 3 file che definiscono il progetto:
1. GEMINI.md — Le tue istruzioni operative (architettura 3 livelli, regole inviolabili, stack)
2. PRD.md — I requisiti di prodotto completi (la fonte di verita)
3. README.md — Documentazione tecnica, stato attuale, roadmap

STACK OBBLIGATORIO (non cambiare):
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- Backend: FastAPI (Python 3.11) + Motor (MongoDB async)
- Database: MongoDB Atlas
- Auth: Strava OAuth 2.0
- AI: Claude 4 Haiku + Gemini fallback
- Hosting: Render.com

REGOLA FONDAMENTALE — MULTI-UTENTE:
Ogni documento MongoDB DEVE avere il campo "athlete_id".
Ogni query DEVE filtrare per "athlete_id".
Ogni endpoint DEVE estrarre athlete_id dal token Strava.
Questa regola non ha eccezioni.

STATO ATTUALE:
Il progetto ha gia queste feature funzionanti:
- Strava OAuth + Sync corse (445 corse sincronizzate)
- Profilo con foto, training zones, regola 80/20, hero map
- Running Consistency heatmap con dati reali
- Progressione del Passo con grafico SVG
- Personal Records con navigazione a dettaglio corsa
- Multi-utente base (athlete_id su tutti i documenti)

PROSSIMI STEP (in ordine):
1. Dashboard — collegare tutti i widget a dati reali
2. VDOT Dinamico — calcolo Jack Daniels con regola 2/3, cap +1/mesociclo, 5 zone
3. Training Plan — generatore piano personalizzato per utente (6 fasi periodizzazione)
4. Training Plan auto-adapt — 5 modelli scientifici (Impellizzeri, ACSM, Foster, Seiler, Mujika)
5. Dettaglio Corsa — splits, HR chart, confronto piano, analisi AI
6. Analytics — VO2max gauge, previsioni gara, Fitness & Freshness (Banister)

COME LAVORARE:
- Implementa UNA feature alla volta, completa (backend + frontend)
- Testa che funzioni end-to-end
- Formule scientifiche: SEMPRE come funzioni pure deterministiche
- Grafici: SVG custom in React, NO librerie esterne
- Aggiorna README.md dopo ogni feature completata
- Dark theme: sfondo #121212, card #181818, primary #3B82F6

Inizia dalla FASE 1.1: Dashboard con dati reali.
Leggi il backend attuale (backend/server.py) e il frontend (src/components/DashboardView.tsx) per capire cosa c'e gia, poi proponi le modifiche necessarie.
```

---

## COME USARE QUESTO PROMPT

1. Apri Antigravity IDE
2. Crea un nuovo progetto o importa il repo GitHub: https://github.com/daniele9233/Dashboard-Running-UI-AiStudio-.git
3. Carica come contesto i file: `GEMINI.md`, `PRD.md`, `README.md`
4. Incolla il prompt sopra
5. Antigravity leggera i 3 file e avra il contesto completo per lavorare
6. Procedi step by step — una feature alla volta

## NOTE IMPORTANTI

- Antigravity (Gemini) usa Next.js di default. Il prompt gli dice esplicitamente di usare React+Vite. Se propone Next.js, ricordagli lo stack.
- Se modifica file senza athlete_id, fermalo subito.
- Se propone librerie grafiche esterne (Recharts, Chart.js), digli di usare SVG custom.
- Dopo ogni feature, fai review del codice prima di committare.
