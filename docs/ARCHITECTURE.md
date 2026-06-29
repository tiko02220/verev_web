# OneBonusWeb — Navigation Codemap

> **What this is:** a "where does it live / what does it mean" map for fast navigation, so no task has to re-discover the layout.
> **What this is NOT:** the rules. Visual/UX direction runs through the `ui-ux-pro-max` skill; the workspace root `CLAUDE.md` holds the binding rules. This file only says *where* things are.
> **Keep it true:** update this file in the same change that moves/renames code. A stale map is worse than none.

Vite · React 18 + TypeScript · React Router · TanStack Query · Tailwind (via `index.css`) · Framer Motion (`motion`) · Three.js (`@react-three/fiber`/`drei`/`postprocessing`) + Spline for the hero. Two surfaces in one app: the **public landing page** and the **platform super-admin console**.

- **Entry:** `src/main.tsx` → `src/App.tsx`. Routing in `App.tsx`: `/` → `LandingPage`, `/admin/*` → `AdminApp`. Global CSS/tokens: `src/index.css`, `src/styles/`.
- **Run:** `npm i && npm run dev` (Vite) · build `npm run build` · lint `npm run lint`.
- **Deploy:** decoupled Caddy edge — `Caddyfile`, `Dockerfile`, `docker-compose.yml`, `DEPLOY.md`. Not bundled with the backend.

## Landing surface (`src/pages/`)
| Path | Owns |
|---|---|
| `LandingPage.tsx` | the single landing route — composes the hero + sections. |
| `landing/` | hero animation pieces: `MergeScene.tsx` / `ThreeMergeScene.tsx` / `SplineMergeScene.tsx` / `MergeWalletScene.tsx` (the card-merge hero — keep the chaos+flip merge, fix overlap surgically, never redesign), `AddCustomerScene.tsx`, `OneBonusCard.tsx` / `MerchantCard.tsx` / `WalletPass.tsx` / `Phone.tsx` / `Chip.tsx` / `QrCode.tsx` (card + device props). |

## Admin console (`src/admin/`) — platform super-admin
| Path | Owns |
|---|---|
| `AdminApp.tsx` | admin router (mounted at `/admin/*`), wraps pages in `AdminAuthProvider` + `AdminShell`. |
| `auth/` | `AdminAuthContext.tsx`, `AdminAuthProvider.tsx`, `ProtectedRoute.tsx`, `permissions.ts` — admin session + route gating. |
| `pages/` | one file per console screen: `LoginPage`, `DashboardPage`, `MerchantsPage` + `MerchantDetailPage`, `CustomersPage` + `CustomerDetailPage`, `AdminsPage`, `ModerationPage`, `AuditPage`, `NotificationsPage`, `AppUpdatesPage`. |
| `pages/merchant/` | merchant-detail editing: `MerchantDataTabs.tsx`, `MerchantDataForms.tsx`, `programForm.ts`. |
| `api/` | typed backend calls: `platform.ts`, `merchants.ts`, `customers.ts` — hit `OneBonusBackend` `modules/platformadmin`. |
| `lib/` | `apiClient.ts` (fetch wrapper + auth header), `queryClient.ts` (TanStack Query), `format.ts`, `useDebounce.ts`. |
| `types/api.ts` | admin wire types (mirror the backend platform-admin DTOs). |
| `components/` | `AdminShell.tsx` (nav chrome) + `components/ui/` (shared admin primitives — grep here before adding a control). |

## Contract note
The admin console talks to the **real** `OneBonusBackend` `modules/platformadmin` endpoints (not the Figma Supabase prototype). When a platform-admin backend DTO changes, `src/admin/types/api.ts` and the matching `src/admin/api/*.ts` caller are the files to update.
