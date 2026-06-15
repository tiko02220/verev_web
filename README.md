# OneBonus Web

The public web surface for One Bonus — marketing landing page today, room to grow into customer-facing web flows (loyalty web wallet, link landings) tomorrow.

Stack: Vite + React + TypeScript + Tailwind CSS v4.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build locally
```

## Structure

```
index.html                 Vite entry — <head> meta, mounts React
src/main.tsx               React root (imports Tailwind + landing styles)
src/App.tsx                App shell
src/pages/LandingPage.tsx  Marketing landing page
src/styles/landing.css     Bespoke landing styles (single source of truth for the page's look)
src/index.css              Tailwind entry (@import "tailwindcss")
public/assets/logo.png     Brand logo, served at /assets/logo.png
```

The landing keeps its own hand-authored CSS in `landing.css` — Tailwind is wired up for future pages. Class names there must not collide with Tailwind utility names (e.g. `h-1` is the Tailwind height utility, so the display-type classes are `title-hero` / `title-1` / `title-2`).

## Deploy

The container is the public TLS edge: it serves the built site and reverse-proxies everything else to the backend `app`. See [DEPLOY.md](DEPLOY.md).
