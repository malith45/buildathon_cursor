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
PORT=4000
CORS_ORIGIN=http://localhost:3000
AUTH_SECRET=your-long-random-secret
```

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
python -m pytest tests -q
```

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
