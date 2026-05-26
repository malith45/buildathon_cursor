# MediAssist AI — Frontend

Next.js UI for **MediAssist AI**. Full product documentation lives in the **[root README](../README.md)**.

## Quick start

```bash
# From repository root
npm run install:all
cp backend/.env.example backend/.env   # configure API — see root README
```

`frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

```bash
npm run dev:backend   # terminal 1
npm run dev           # terminal 2 (this folder)
```

## Deploy

See **[DEPLOY.md](../DEPLOY.md)** — Vercel ([`vercel.json`](vercel.json)) + Railway ([`backend/railway.toml`](../backend/railway.toml)).
