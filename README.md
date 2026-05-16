# MediAssist AI

Educational health triage assistant: symptom chat, urgency guidance, care steps, and health education. **All OpenAI calls run on the backend only** — the frontend never sees your API key.

**Stack:** Next.js 16 (React 19, Tailwind 4, shadcn/ui) + FastAPI (Python 3.11+) + Google Cloud Storage (`google-cloud-storage`) + OpenAI (`openai` SDK, `gpt-4o-mini` by default).

---

## Features

| Area | What it does |
|------|----------------|
| **Triage** | `POST /api/health/decision` — urgency (`self_care` → `emergency`), summary, care steps, education, red flags |
| **Accounts** | Sign up, log in, JWT auth, health profile stored per user (JSON blob in GCS) |
| **Chat history** | Logged-in users sync sessions to GCS; guests use browser `localStorage` |
| **Disease catalog** | Search 120+ conditions for profile multi-select (seeded once into GCS) |
| **System status** | UI panel + `GET /api/health?probe=true` for OpenAI / GCS checks |

**Not provided:** medical diagnosis, prescriptions, or emergency services.

---

## Architecture

```mermaid
flowchart LR
  subgraph client [Frontend :3000]
    UI[Next.js App]
    LS[localStorage]
  end
  subgraph api [Backend :4000]
    R[FastAPI routers]
    S[Services]
    O[OpenAI API]
    GCS[(Google Cloud Storage)]
  end
  UI -->|REST + Bearer JWT| R
  UI --> LS
  R --> S
  S --> O
  S --> GCS
```

**Backend layout** (`backend/app/`):

```
main.py              # FastAPI app, CORS, exception handlers
config.py            # Pydantic settings from .env (OpenAI + GCS)
routers/             # health, auth, chats, diseases
services/            # openai_service, health_decision, auth
storage/             # GCS client, users_store, chats_store, diseases_store
schemas/             # Pydantic request/response models
prompts/             # OpenAI system prompt
security/            # password hashing
```

**GCS bucket layout:**

```
{bucket}/
  users/{user_id}.json                  # full user record (password hash, profile)
  indexes/users_by_email.json           # { email -> user_id } for login lookup
  chats/{user_id}/{chat_id}.json        # one file per chat session
  diseases/catalog.json                 # seeded once from data/disease_names.py
```

**Frontend layout** (`frontend/src/`):

```
app/                 # /, /login, /signup, /profile
components/          # Chat, TriageCard, HealthProfileForm, SystemStatusPanel, auth, ui
contexts/            # AuthContext
lib/                 # apiClient, auth-api, chats-api, diseases-api, storage
```

---

## Prerequisites

- **Node.js** 18+
- **Python** 3.11+
- **OpenAI API key** — [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Google Cloud project + GCS bucket** (optional — needed for accounts, cloud chat sync, disease catalog)

---

## Quick start

### 1. Install dependencies

From the repo root:

```bash
npm run install:all
```

This installs frontend npm packages and Python packages from `backend/requirements.txt`.

### 2. Backend environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` — minimum for AI-only local dev (no accounts, no cloud chat history):

```env
OPENAI_API_KEY=sk-your-key-here
AUTH_SECRET=change-this-to-a-long-random-string
PORT=4000
CORS_ORIGIN=http://localhost:3000
STORAGE_ENABLED=false
```

For **full features** (auth, diseases, chat sync), configure GCS — see [Storage setup](#storage-setup-gcs) below — and set `STORAGE_ENABLED=true`.

### 3. Frontend environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 4. Run

**Terminal 1 — backend:**

```bash
cd backend
python -m uvicorn app.main:app --reload --port 4000
```

**Terminal 2 — frontend:**

```bash
cd frontend
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**.

---

## Storage setup (GCS)

### A. Create a bucket

Using `gcloud` CLI ([install](https://cloud.google.com/sdk/docs/install)):

```bash
# Pick any globally-unique name; the suffix can be anything
gcloud storage buckets create gs://mediassist-<your-suffix> --location=US
```

Or in the **GCP Console → Cloud Storage → Buckets → Create**:
- Name: `mediassist-<your-suffix>` (globally unique)
- Location type: Region (e.g. `us-central1`) for cheapest costs
- Default storage class: Standard
- Access control: Uniform
- Leave public access prevention **enabled**

### B. Set up authentication (pick ONE)

**Option 1 — Service-account JSON (recommended for Windows / no `gcloud`):**

1. **GCP Console → IAM & Admin → Service Accounts → Create**:
   - Name: `mediassist-backend`
   - Grant role: **Storage Object Admin** (scoped to the bucket above)
2. Click the new account → **Keys → Add key → Create new key → JSON**.
3. Save the downloaded JSON somewhere safe (NOT in this repo).
4. Put the absolute path in `backend/.env`:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=C:/Users/you/secrets/mediassist-sa.json
   ```

**Option 2 — Application Default Credentials (if you already use `gcloud`):**

```bash
gcloud auth application-default login
```

Then leave `GOOGLE_APPLICATION_CREDENTIALS` blank in `backend/.env`.

### C. Wire up `backend/.env`

```env
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o-mini

STORAGE_ENABLED=true
GCS_BUCKET=mediassist-<your-suffix>
GCS_PROJECT=                                  # optional; auto-detected from creds
GOOGLE_APPLICATION_CREDENTIALS=               # path to SA JSON, or blank for ADC
```

Restart the backend. You should see in the console:

```
📦  Storage:  ✅  Connected (gs://mediassist-<your-suffix>)
🤖  OpenAI:   🔑  API key set, model=gpt-4o-mini (live probe skipped)
```

On first startup the disease catalog is auto-seeded to `gs://<bucket>/diseases/catalog.json`.

### D. (Optional) Migrate your old Supabase user

If you previously used the Supabase-backed version and want to keep your account:

```bash
cd backend
python -m scripts.migrate_user_from_supabase --email you@example.com \
    --supabase-url "postgresql://postgres.xxx:pwd@aws-...pooler.supabase.com:5432/postgres?sslmode=require"
```

This is a one-off script. Once you've migrated, you can:

1. Remove `psycopg2-binary` from `backend/requirements.txt`
2. Delete `backend/scripts/migrate_user_from_supabase.py`

---

## Testing

### Backend (pytest)

```bash
cd backend
pip install -r requirements.txt
python -m pytest tests -q
```

The test suite does **not** call the live OpenAI API or hit GCS. Storage is disabled and OpenAI is mocked via `tests/conftest.py`.

### Manual smoke test

1. `GET http://localhost:4000/api/health` — `status: ok`, `aiConfigured`, `storageConnected`, `diseasesReady`
2. `GET http://localhost:4000/api/health?probe=true` — live OpenAI probe (~$0.00002)
3. Sign up at `/signup`, send a symptom in chat, confirm the triage panel updates (not fallback text)

---

## API reference

Base URL: `http://localhost:4000` (or `NEXT_PUBLIC_API_URL`).

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | No | Status, `aiConfigured`, `aiModel`, `storageConnected`, `storageBucket`, `diseasesReady` |
| `GET` | `/api/health?probe=true` | No | Above + live OpenAI probe |
| `POST` | `/api/health/decision` | No | Triage JSON (see below) |
| `POST` | `/api/health/init-storage` | No | Dev helper: verify bucket + seed diseases |

**Decision request:**

```json
{
  "profile": {
    "ageRange": "25-34",
    "sex": "female",
    "conditions": ["Asthma"],
    "allergies": [],
    "medications": "",
    "pregnant": false
  },
  "messages": [
    { "role": "user", "text": "Mild headache for 2 hours." }
  ]
}
```

**Decision response:**

```json
{
  "urgency": "self_care",
  "summary": "...",
  "careSteps": ["..."],
  "education": ["..."],
  "redFlags": ["..."],
  "disclaimer": "...",
  "fallback": false
}
```

`fallback: true` means OpenAI failed — check API key, credit balance, and `OPENAI_MODEL`.

### Auth (requires GCS)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/signup` | `{ email, password, name }` → `{ user, token }` |
| `POST` | `/api/auth/login` | `{ email, password }` → `{ user, token }` |
| `GET` | `/api/auth/me` | Bearer token → current user |
| `PATCH` | `/api/auth/profile` | Update `name` and/or `healthProfile` |

### Chats (Bearer token, requires GCS)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/chats` | List sessions for user |
| `PUT` | `/api/chats` | Sync `{ sessions: [...] }` (merge by id) |
| `DELETE` | `/api/chats` | Clear all sessions for user |

### Diseases (requires GCS)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/diseases?search=asthma&limit=20` | Search disease catalog |

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | OpenAI API key from [platform.openai.com](https://platform.openai.com/api-keys) |
| `OPENAI_MODEL` | `gpt-4o-mini` | Override with `gpt-4o`, `gpt-4.1-mini`, etc. |
| `OPENAI_DECISION_RETRIES` | `1` | Retries on non-quota failures |
| `OPENAI_PROBE_ON_STARTUP` | `false` | Live OpenAI ping on server boot |
| `OPENAI_TIMEOUT` | `30` | Hard request timeout in seconds |
| `AUTH_SECRET` | dev placeholder | JWT signing secret — change in production |
| `PORT` | `4000` | API port |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed frontend origin |
| `STORAGE_ENABLED` | `true` | `false` = no GCS (health/decision only) |
| `GCS_BUCKET` | — | Bucket name (no `gs://` prefix) |
| `GCS_PROJECT` | — | Optional explicit GCP project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | Path to service-account JSON (or blank for ADC) |
| `APP_ENV` | `development` | Environment label |
| `ALLOW_TEST_DATA_RESET` | `false` | Destructive test reset (keep `false`) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend base URL (default `http://localhost:4000`) |

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| Triage returns generic fallback | Set valid `OPENAI_API_KEY`; check usage at [platform.openai.com/usage](https://platform.openai.com/usage) |
| `503` OpenAI not configured | Add `OPENAI_API_KEY` to `backend/.env` and restart backend |
| `503` Storage unavailable | Fix `GCS_BUCKET` + credentials, or set `STORAGE_ENABLED=false` for AI-only mode |
| `Storage init failed` | Check service account has `Storage Object Admin` on the bucket and the bucket exists |
| `Could not reach GCS bucket` | Check network, bucket name typo, or run `gcloud auth application-default login` |
| Port 4000 in use | Stop other process or change `PORT` |
| Auth / diseases / chats fail | GCS required — complete [Storage setup](#storage-setup-gcs) |
| React hydration warning in Cursor browser | Often `data-cursor-ref` from embedded browser; test in Chrome/Edge |
| `429` / quota errors from OpenAI | Wait a few minutes; check usage; ensure credit balance > $0 |

---

## Production notes

- Set a strong `AUTH_SECRET` and real `OPENAI_API_KEY` via host secrets (never commit `.env`).
- Use a regional GCS bucket co-located with your backend for low latency.
- In production deploy with a managed service account (e.g. Cloud Run / GKE Workload Identity) instead of mounting a JSON key.
- Deploy frontend with `NEXT_PUBLIC_API_URL` pointing at your API.
- This app is for **education only** — not a medical device.

---

## Disclaimer

This application is for **educational purposes only**. It does not provide medical diagnosis, prescriptions, or emergency services. Always consult qualified healthcare professionals. In an emergency, call your local emergency number.
