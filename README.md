# AI Health & Care Decision System

Monorepo with a **Next.js frontend** and **Python FastAPI backend**. All AI uses the **Google Gemini API** on the backend only.

## Features

- Symptom triage (urgency: self-care → emergency)
- Personalized care suggestions and health education
- User accounts (signup / login) with saved health profile
- Chat session history stored in the browser

## Project structure

```
frontend/     # Next.js UI (shadcn, auth, consult flow)
backend/      # FastAPI + Gemini (app/routers → services)
```

## Prerequisites

- Node.js 18+
- Python 3.11+
- [Gemini API key](https://aistudio.google.com/apikey)

## Setup

1. Install dependencies:

```bash
npm run install:all
```

2. Backend — copy `backend/.env.example` to `backend/.env`:

```
GEMINI_API_KEY=your_key_here
AUTH_SECRET=your-long-random-secret
PORT=4000
CORS_ORIGIN=http://localhost:3000

DATABASE_HOST=your-project.pooler.supabase.com
DATABASE_PORT=5432
DATABASE_NAME=postgres
DATABASE_USER=postgres.your_project_ref
DATABASE_PASSWORD=your_db_password
```

**Supabase connection failed on startup?**

1. In [Supabase](https://supabase.com/dashboard) → your project → **Database** → **Connect**, copy the **Session pooler** URI (port **5432**).
2. Add to `backend/.env` as one line (URL-encode special characters in the password):

```
DATABASE_URL=postgresql://postgres.YOUR_REF:YOUR_PASSWORD@aws-1-REGION.pooler.supabase.com:5432/postgres
```

3. Test: `cd backend && python scripts/test_db.py` — should print `Ping OK`.
4. Restart: `npm run dev`.

If your network blocks port 5432, try another network or confirm the project is not **paused**. To run without DB temporarily: `DATABASE_ENABLED=false` (auth and disease search will not work).

4. **Diseases table** — on first backend start the API creates `public.diseases` and seeds 120+ conditions. If the table is missing in Supabase, either:
   - Run `cd backend && npm run db:init`, or
   - Paste and run `backend/supabase/schema.sql` in **Supabase → SQL Editor**

3. Frontend — create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Run

Terminal 1 (backend):

```bash
cd backend
python -m uvicorn app.main:app --reload --port 4000
```

Or: `npm run dev` from `backend/` if you use the helper script.

Terminal 2 (frontend):

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Test backend

```bash
cd backend
pip install -r requirements.txt
python -m pytest tests -q
```

## Backend troubleshooting

| Issue | Fix |
|-------|-----|
| `Database schema init failed` / Supabase timeout | Set `DATABASE_ENABLED=false` for local dev, or fix pooler host/password in `.env` |
| `FutureWarning` for `google.generativeai` | Use `pip install -r requirements.txt` (uses `google-genai` SDK) |
| Port 4000 in use | Stop the other process or change `PORT` in `.env` |

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/health/decision` | Triage JSON `{ profile, messages }` |
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Log in |
| GET | `/api/auth/me` | Current user (Bearer token) |
| PATCH | `/api/auth/profile` | Update name / health profile |

## Disclaimer

This application is for **educational purposes only**. It does not provide medical diagnosis, prescriptions, or emergency services. Always consult qualified healthcare professionals. In an emergency, call your local emergency number.
