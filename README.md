# DevOps Copilot

Help engineers triage CI/CD failures in minutes, not hours. DevOps Copilot ingests GitHub Actions logs, applies AI to explain the root cause and suggest fixes, and gives you a focused, minimal UI for fast investigation.

**Why I Built This**
- CI failures are noisy and time‑consuming to triage; logs are long, repetitive, and lack summary.
- Teams repeatedly fix the same issues (flaky tests, version bumps, misconfig) with tribal knowledge.
- Context is fragmented across logs, workflow config, and recent changes.

**What It Solves**
- Reduces MTTR by turning raw logs into clear “root cause + suggested fix”.
- Centralizes pipeline runs, status, and success rate for quick visibility.
- Makes search and navigation fast; adds agents to automate common RCA tasks.

**Features at a Glance**
- Ingestion API: POST logs from CI; stored in SQLite.
- Dashboard: Pipelines, status, last run, success rate.
- Pipeline View: Dark log viewer with search, pagination, copy, and a simple metrics chart.
- AI Analysis: One‑click RCA with confidence and fix suggestion (OpenAI).
- Agents (MVP): Create RCA/Triage tasks that run automatically and record results.
- Demo Data: Seed/reset synthetic pipelines to explore instantly.

**Tech Stack**
- Backend: FastAPI, Pydantic, stdlib sqlite3, requests
- Frontend: Next.js, React, TailwindCSS, Chart.js
- Infra: Docker, Docker Compose

---

## Demo In 60 Seconds

1) Start (Docker Desktop running):
- `cd infra && docker compose up --build`

2) Seed demo data:
- Open `http://localhost:3000/settings` → click “Seed Demo Data”

3) Explore and Analyze:
- Dashboard: `http://localhost:3000` → click a pipeline
- Click “Analyze” for instant AI root cause + fix suggestion

4) Agents (optional):
- Visit `http://localhost:3000/agents` → create an “RCA” task for `demo-1`

Optional (real AI): `echo "OPENAI_API_KEY=sk-..." > infra/.env && cd infra && docker compose up -d --build backend`

---

## Architecture (High‑Level)

```
┌────────────┐      POST /logs          ┌───────────────┐
│ GitHub CI  │ ───────────────────────▶ │  FastAPI API  │
│ (Actions)  │                          │   (Backend)   │
└────────────┘ ◀────── JSON RCA ─────── │  /analyze     │
                                       └──────┬────────┘
                                              │ sqlite3
                                        ┌─────▼──────┐
                                        │   SQLite   │
                                        │ pipelines  │
                                        │ logs       │
                                        │ analysis   │
                                        │ agent_*    │
                                        └─────┬──────┘
                                              │
                            ┌──────────────────▼─────────────────┐
                            │  Next.js Frontend (Dashboard, RCA) │
                            └─────────────────────────────────────┘
```

---

## Highlights

- Practical problem, end‑to‑end: ingestion → storage → AI analysis → clean UX → Dockerized.
- Thoughtful UX: minimal, responsive, accessible; clear empty states and onboarding.
- Robustness: JSON‑only AI responses, code‑fence tolerance, graceful fallbacks without a key.
- Extensible design: “Agents” layer for triage/RCA orchestration with stored actions and results.
- Portable: single Docker Compose spins up everything; SQLite for easy demoing.

---

## Quick Start (Docker Compose)
- Optional (real AI): set `OPENAI_API_KEY`
  - macOS/Linux: `export OPENAI_API_KEY=sk-...`
  - Or create `infra/.env` containing `OPENAI_API_KEY=sk-...`
- Start services
  - `cd infra`
  - `docker compose up --build`
- Open
  - Frontend: `http://localhost:3000`
  - API docs: `http://localhost:8000/docs`

## First-Time Walkthrough
- Seed demo data: open `http://localhost:3000/settings` → “Seed Demo Data”
- Explore dashboard: `http://localhost:3000` → click a pipeline
- Analyze: press “Analyze” on the pipeline page for AI RCA
- Try Agents: open `http://localhost:3000/agents`, create an RCA task for a pipeline

## Ingest Logs (Examples)
- Minimal
  - `curl -X POST http://localhost:8000/logs -H 'Content-Type: application/json' -d '{"pipeline_id":"demo-1","logs":"build started"}'`
- With metadata (updates status/success rate, records a run when status is success/failed)
  - `curl -X POST http://localhost:8000/logs -H 'Content-Type: application/json' -d '{"pipeline_id":"demo-1","name":"Demo Pipeline","status":"failed","logs":"Build failed: npm ERR!"}'`
- Fetch
  - `curl 'http://localhost:8000/logs/demo-1?limit=50&offset=0&q=timeout'`
- Pipelines
  - `curl http://localhost:8000/pipelines`

## Agents API (MVP)
- Create task (auto-runs)
  - `curl -X POST http://localhost:8000/agent/tasks -H 'Content-Type: application/json' -d '{"pipeline_id":"demo-1","type":"rca"}'`
- List tasks
  - `curl http://localhost:8000/agent/tasks`
- Rerun task
  - `curl -X POST http://localhost:8000/agent/tasks/1/run`

## Configuration
- Backend
  - `OPENAI_API_KEY` (required for real AI; otherwise a safe placeholder is returned)

---

 
  - `OPENAI_MODEL` (default `gpt-4o-mini`)
  - `OPENAI_BASE_URL` (default `https://api.openai.com/v1`)
  - `DB_PATH` (default internal; Compose maps it to `/data/app.db` for persistence)
- Frontend
  - `NEXT_PUBLIC_API_BASE` (default `http://localhost:8000`), set in Compose env for the frontend container

## Local Development (without Docker)
- Backend
  - `cd backend && python -m venv .venv && source .venv/bin/activate`
  - `pip install -r requirements.txt`
  - `uvicorn app.main:app --reload --port 8000`
- Frontend
  - `cd frontend && npm i`
  - `npm run dev` (uses `NEXT_PUBLIC_API_BASE=http://localhost:8000`)

## GitHub Actions Example
- `.github/workflows/ci.yml` posts logs back to the backend:
  - `curl -X POST http://localhost:8000/logs -H 'Content-Type: application/json' -d '{"pipeline_id":"${{ github.run_id }}","logs":"sample logs"}'`
- Replace `http://localhost:8000` with your public backend URL in real CI.

## Project Structure
- `backend/` FastAPI app (routes, models, services) + Dockerfile
- `frontend/` Next.js app (pages, components, styles) + Dockerfile
- `infra/` Docker Compose setup
- `.github/workflows/ci.yml` sample workflow

## Troubleshooting
- Docker daemon not running: start Docker Desktop (macOS) and retry `docker compose up`.
- Frontend shows red API dot: verify `curl http://localhost:8000/health` returns `{"status":"ok"}`.
- AI analysis returns placeholder: set `OPENAI_API_KEY` and rebuild backend: `cd infra && docker compose up -d --build backend`.

---

## Roadmap (Next Up)
- Run Compare + AI Delta RCA (latest fail vs last pass with diff summary)
- Failure fingerprinting and flaky test detection
- GitHub App for automatic ingestion and PR comments
- Auth (SSO/OIDC) and multi‑tenant projects
- Postgres + migrations; background workers for scale

## Security & Privacy
- No data leaves your machine unless you set `OPENAI_API_KEY`.
- Future: secret redaction, PII masking, and selectable redaction presets.

## License
- For demo and evaluation purposes. Add a license file to suit your needs.
<!-- meta: housekeeping note 2024-11-28T11:51:08-05:00 -->
