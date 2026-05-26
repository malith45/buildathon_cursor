# Deploy MediAssist AI

Recommended stack: **API on [Railway](https://railway.com)** + **frontend on [Vercel](https://vercel.com)**.

Also supported: [Render](render.yaml) + [Netlify](netlify.toml) — see [Alternative hosts](#alternative-render--netlify) below.

## 1. Push to GitHub

Commit and push this repo. Do **not** commit `backend/.env`, GCS JSON keys, or secrets.

---

## 2. Deploy the API (Railway)

1. [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo**.
2. Add a service for this repo, then open **Settings** (all three matter):

   | Setting | Value |
   |---------|--------|
   | **Root Directory** | `backend` |
   | **Config file path** | `/backend/railway.toml` |
   | **Watch paths** | `/backend/**` |

   If **Root Directory** is empty, Railway builds the whole repo as **Node** and fails with `pip: not found`.

   Build uses [`backend/railpack.json`](backend/railpack.json) (Python) and [`backend/railway.toml`](backend/railway.toml).

3. **Variables** tab — set:

   | Variable | Value |
   |----------|--------|
   | `OPENAI_API_KEY` | Your OpenAI key |
   | `AUTH_SECRET` | Long random string (required when `APP_ENV=production`) |
   | `GCS_BUCKET` | Bucket name only (no `gs://`) |
   | `GCS_PROJECT` | GCP project ID (optional) |
   | `GCS_CREDENTIALS_JSON` | **Full** service-account JSON pasted as one value |
   | `CORS_ORIGINS` | Optional — your Vercel **custom** domain if not `*.vercel.app` |

4. **GCS on Railway (no credentials file on disk):**
   - Paste the entire downloaded service-account JSON into `GCS_CREDENTIALS_JSON`.
   - Leave `GOOGLE_APPLICATION_CREDENTIALS` empty.
   - The API writes a temp key file at startup (see `config.py`).

5. **Networking** → generate a **public domain**, e.g. `https://mediassist-api-production.up.railway.app`.

6. Verify: `GET https://YOUR-RAILWAY-URL/api/health` → JSON with `storageConnected: true` when GCS is correct.

Disease catalog seeds automatically on first boot (`init_storage()`). `POST /api/health/init-storage` is disabled in production.

---

## 3. Deploy the frontend (Vercel)

**Option A — root directory `frontend` (recommended)**

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import the GitHub repo.
2. **Root Directory:** `frontend` (Vercel uses [`frontend/vercel.json`](frontend/vercel.json)).
3. **Environment Variables:**

   | Key | Value |
   |-----|--------|
   | `NEXT_PUBLIC_API_URL` | Your Railway URL, e.g. `https://mediassist-api-production.up.railway.app` — **no trailing slash** |

4. Deploy. Copy the site URL, e.g. `https://mediassist.vercel.app`.

**Option B — repo root**

- Import from repo root; Vercel uses the root [`vercel.json`](vercel.json) which builds `frontend/`.

---

## 4. Link frontend ↔ API

1. `*.vercel.app` is already allowed by the API CORS regex.
2. If you use a **custom domain** on Vercel, add it to Railway `CORS_ORIGINS` (comma-separated), e.g.  
   `https://mediassist.example.com`
3. Redeploy the Railway service after changing CORS.
4. On Vercel, **Redeploy** after changing `NEXT_PUBLIC_API_URL`.

---

## 5. Smoke test

- Open the Vercel URL → send a symptom message → guidance card appears.
- Sign up / login works when GCS is configured on Railway.
- Browser DevTools: no CORS errors, no requests to `localhost:4000`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Network error / failed to fetch | Wrong `NEXT_PUBLIC_API_URL`; redeploy Vercel. |
| Banner: “calling localhost:4000” | Set `NEXT_PUBLIC_API_URL` on Vercel and redeploy. |
| CORS error | Add custom domain to `CORS_ORIGINS` on Railway; redeploy API. |
| Railway crash on start | Set `OPENAI_API_KEY`, `AUTH_SECRET`, valid `GCS_CREDENTIALS_JSON`. |
| Auth / chats 503 | `STORAGE_ENABLED=true`, correct bucket + credentials. |
| Build fails on Vercel | Root directory must be `frontend` (or use root `vercel.json`). |
| `pip: not found` on Railway | Set **Root Directory** to `backend` and redeploy; do not build from repo root. |
| Railway detects Node / `npm install` | Same — root `package.json` is for local dev only; API service must use `backend/`. |

---

## Alternative: Render + Netlify

<details>
<summary>Click to expand Render / Netlify steps</summary>

### API (Render)

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint** → [`render.yaml`](render.yaml).
2. Set `OPENAI_API_KEY`, `GCS_BUCKET`, `GCS_CREDENTIALS_JSON`, etc.
3. Copy API URL, e.g. `https://mediassist-api.onrender.com`.

### Frontend (Netlify)

1. [app.netlify.com](https://app.netlify.com) → import repo → [`netlify.toml`](netlify.toml) (base `frontend`).
2. `NEXT_PUBLIC_API_URL` = your Render URL.

`*.netlify.app` is allowed by the same CORS regex as Vercel.

</details>

---

## Environment reference

| Where | Variable | Purpose |
|-------|----------|---------|
| Railway | `OPENAI_API_KEY` | Triage |
| Railway | `AUTH_SECRET` | JWT / sessions |
| Railway | `GCS_CREDENTIALS_JSON` | GCS without mounting a file |
| Railway | `GCS_BUCKET` | Bucket name |
| Railway | `APP_ENV` | `production` (set in `railway.toml`) |
| Railway | `CORS_ORIGINS` | Custom frontend domains only |
| Vercel | `NEXT_PUBLIC_API_URL` | Railway API base URL |
