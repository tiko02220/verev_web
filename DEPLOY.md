# Deploying OneBonus Web

This repo owns the public web edge. Before this split, the landing page lived in
`OneBonusBackend/site/` and the backend's own Caddy container served it. Now the
web container is the TLS edge: it serves the built React site and reverse-proxies
every non-static request to the backend `app` container over a shared docker network.

```
Internet ──443──> onebonus-web (Caddy)
                    ├─ /            -> static React build (/srv/site)
                    ├─ /assets/*    -> static build assets + logo
                    └─ everything   -> reverse_proxy app:8080  (OneBonusBackend)
```

## Topology change vs. the old setup

| | Before | After |
|---|---|---|
| TLS edge (80/443) | backend `caddy` service | this repo's `web` service |
| Static site source | `OneBonusBackend/site/` | this repo (`dist/`, built in Docker) |
| Backend `app` | reached by backend caddy as `app:8080` | reached by web edge as `app:8080` over external network `onebonus-net` |

The backend's `caddy` service and `site/` directory are removed (see the matching
change in OneBonusBackend's `docker-compose.tls.yml`). The backend keeps its
`127.0.0.1:4444:8080` publish for local debugging.

## One-time server setup

```bash
# Shared network the web edge and the backend app both attach to.
docker network create onebonus-net
```

## Cutover (run on the server)

1. **Backend** — pull the updated OneBonusBackend with `caddy` removed and `app`
   attached to `onebonus-net`, then bring the backend up so `app` joins the network:
   ```bash
   cd OneBonusBackend
   docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.tls.yml up -d
   ```
   This stops the old `verev-caddy` (frees 80/443 for the web edge).

2. **Web** — set env and start the edge:
   ```bash
   cd OneBonusWeb
   cp .env.example .env       # then edit DOMAIN / ACME_EMAIL
   docker compose up -d --build
   ```
   Caddy re-issues the Let's Encrypt cert for `DOMAIN` on first boot (ports 80 + 443
   must be open and DNS A record must point at the VM).

3. Verify:
   ```bash
   curl -I https://onebonus.am/                  # static landing (200)
   curl -I https://onebonus.am/swagger-ui/index.html   # proxied to app
   ```

## CI/CD (GitHub Actions)

Same convention as OneBonusBackend:

- **`ci.yml`** — on every push to `main`/`master` and on PRs: `npm ci` → `npm run build` → `npm run lint`.
- **`deploy-hetzner.yml`** — on a push to any branch whose **commit message contains `Deploy`** (e.g. `git commit -m "Deploy web"`): rsyncs the source to the server over SSH, creates `onebonus-net` if missing, runs `docker compose up -d --build`, and health-checks the edge on `http://localhost/`.

One-time setup so the pipeline works (mirrors the backend's):

1. **Repo secret** — add `HETZNER_DEPLOY_KEY` to the `verev_web` repo (Settings → Secrets and variables → Actions). Use the **same** base64-encoded CI deploy private key already configured on `verev_backend`; its public half is already in the server's `authorized_keys`.
2. **Server `.env`** — one time on the box: `cd /root/OneBonusWeb && cp .env.example .env` and set `DOMAIN` / `ACME_EMAIL`. The deploy preserves it (rsync excludes `.env`).

After that, shipping the site is a normal push with `Deploy` in the message.

## Updating the site manually

```bash
cd OneBonusWeb && git pull && docker compose up -d --build
```

## When the site grows past one route

The Caddyfile serves only `/` and `/assets/*` statically and proxies everything
else to the backend (mirroring the original single-page setup). When client-side
routes are added (e.g. `/card/:id`), add their path prefixes to a static `handle`
block with a `try_files {path} /index.html` fallback, keeping the backend API
paths on the final catch-all `handle`. The backend API is served at the root (not
under an `/api` prefix), so the static fallback must stay path-scoped, never a
global SPA catch-all.
