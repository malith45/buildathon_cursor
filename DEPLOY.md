# Deploy MediAssist AI (Netlify + Render)

The **frontend** runs on [Netlify](https://www.netlify.com). The **API** runs on [Render](https://render.com) (free tier works for demos).

## 1. Push to GitHub

Commit and push this repo. Do **not** commit `backend/.env`, GCS JSON keys, or secrets.

## 2. Deploy the API (Render)

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect the GitHub repo — Render reads [`render.yaml`](render.yaml).
3. In the service **Environment** tab, set secrets Render could not guess:

   | Variable | Value |
   |----------|--------|
   | `OPENAI_API_KEY` | Your OpenAI key |
   | `GCS_BUCKET` | Your bucket name (no `gs://`) |
   | `GCS_PROJECT` | GCP project ID (optional) |
   | `GCS_CREDENTIALS_JSON` | **Recommended:** entire service-account JSON pasted as one env var |
   | `CORS_ORIGINS` | Optional — Netlify `*.netlify.app` is allowed automatically |

4. **GCS credentials on Render (pick one):**

   **Option A — env var (easiest):** In **Environment**, add `GCS_CREDENTIALS_JSON` and paste the **full** contents of your downloaded `*.json` key (starts with `{"type":"service_account",...}`). Leave `GOOGLE_APPLICATION_CREDENTIALS` empty.

   **Option B — secret file:** **Secret Files** → upload JSON → set `GOOGLE_APPLICATION_CREDENTIALS` to the mount path Render shows (e.g. `/etc/secrets/gcs-key.json`).

5. Deploy and copy the API URL, e.g. `https://mediassist-api.onrender.com`.

6. Verify: open `https://mediassist-api.onrender.com/api/health` — should return JSON.

7. Once (optional): `POST https://mediassist-api.onrender.com/api/health/init-storage` to seed the disease catalog (only if not blocked in production).

## 3. Deploy the frontend (Netlify)

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**.
2. Select the same repo. Netlify picks up [`netlify.toml`](netlify.toml) automatically:
   - Base directory: `frontend`
   - Build: `npm ci && npm run build`
   - Next.js plugin enabled
3. **Site configuration** → **Environment variables**:

   | Key | Value |
   |-----|--------|
   | `NEXT_PUBLIC_API_URL` | `https://mediassist-api.onrender.com` (your Render URL, no trailing slash) |

4. Deploy. Copy the site URL, e.g. `https://mediassist.netlify.app`.

## 4. Link frontend ↔ API

1. In **Render**, set `CORS_ORIGINS` to your Netlify URL (comma-separated if you use deploy previews).
2. Redeploy the API if you changed CORS.
3. In **Netlify**, trigger **Clear cache and deploy site** if you changed `NEXT_PUBLIC_API_URL`.

## 5. Smoke test

- Open the Netlify URL → send a symptom message → triage card appears.
- **References & trusted reading** at the bottom of the card.
- Sign up / login works only if GCS is configured on Render.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Network error / failed to fetch | Wrong `NEXT_PUBLIC_API_URL` or API asleep (Render free tier cold start ~30s). |
| CORS error in browser console | Redeploy API (allows `*.netlify.app`); optionally set `CORS_ORIGINS` too. |
| Render deploy crash on start | Set `OPENAI_API_KEY`, `AUTH_SECRET` (auto), and `GCS_CREDENTIALS_JSON` or fix GCS. |
| Triage works locally, not deployed | `NEXT_PUBLIC_API_URL` must be Render URL; wait ~30s for free tier cold start. |
| Auth / chats 503 | `STORAGE_ENABLED=true` and GCS credentials on Render. |
| Build fails on Netlify | Ensure `frontend/package.json` has no `file:..` parent dependency (removed in this repo). |

## CLI (optional)

```bash
cd frontend
npx netlify-cli login
npx netlify-cli init
npx netlify-cli env:set NEXT_PUBLIC_API_URL "https://your-api.onrender.com"
npx netlify-cli deploy --prod
```
