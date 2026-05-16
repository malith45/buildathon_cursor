# AI Health & Care Decision System

Monorepo with a **Next.js frontend** and **Express (MVC) backend**. All AI uses the **Google Gemini API** on the backend only.

## Features

- Symptom triage (urgency: self-care → emergency)
- Personalized care suggestions and health education
- Health profile stored in browser localStorage
- Chat session history stored locally

## Project structure

```
frontend/     # Next.js UI (components, app, lib)
backend/      # Express MVC + Gemini (routes → controllers → services)
```

## Prerequisites

- Node.js 18+
- [Gemini API key](https://aistudio.google.com/apikey)

## Setup

1. Install dependencies:

```bash
npm run install:all
```

2. Configure backend — copy `backend/.env.example` to `backend/.env`:

```
GEMINI_API_KEY=your_key_here
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

3. Configure frontend — copy `frontend/.env.example` to `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Run

Terminal 1 (backend):

```bash
cd backend
npm run dev
```

Terminal 2 (frontend):

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API

- `GET /api/health` — backend health check
- `POST /api/health/decision` — body: `{ profile, messages }` → triage JSON

## Disclaimer

This application is for **educational purposes only**. It does not provide medical diagnosis, prescriptions, or emergency services. Always consult qualified healthcare professionals. In an emergency, call your local emergency number.
