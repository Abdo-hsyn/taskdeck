# TaskDeck — Project Plan

## Goal
A full-stack task/project management app built to satisfy internship requirements:
Live (public URL) + GitHub repo + Auth + Database + React frontend + Node backend +
REST APIs + clean code + README.

**Stack:** React 19 + Vite (client) · Express 5 + Prisma 7 + **MySQL / TiDB Cloud Serverless** (server) · npm workspaces-free layout (two folders, one repo).

## Scope (MVP, non-negotiable for the application)
1. **Auth** — register, login, logout, current session. JWT stored in an HttpOnly cookie, passwords bcrypt-hashed.
2. **Projects** — CRUD, membership with roles (owner / member) so authorization is visible.
3. **Tasks** — CRUD per project: title, description, status (todo/doing/done), priority (low/medium/high), due date, ordering.
4. **Comments** — per task.
5. **Cross-cutting** — Zod validation on every input, uniform error envelope, rate limiting on auth routes, helmet, CORS restricted to the client origin, `/api/health`.

## Out of scope (deliberate)
Realtime websockets, file uploads, email, OAuth, pagination beyond simple limits, i18n.

## Phases
- [x] P0 Scaffold (Vite client, Express+Prisma server, deps installed)
- [x] P1 Docs + API contract (`docs/API.md`) — single source of truth
- [x] P2 Server: Prisma schema, middleware, routes, seed, tests (8/8 passing)
- [x] P3 Design direction + UI previews (design gate) — `design/direction.md`, Console theme approved
- [x] P4 Client: auth flow, projects, board, task detail
- [x] P5 Integration verification (browser walkthrough: login → board → task move → comment → mobile 390px; console clean)
- [x] P6 README final ✅ · hosting **Vercel ×2** (`taskdeck-client` static + `taskdeck-api` Node backend; `render.yaml` + keep-alive workflow deleted — Render abandoned, DECISIONS #6) · live E2E verified in the browser: login (Set-Cookie `HttpOnly; Secure; SameSite=None`) → projects → board (5 tasks) → task move (PATCH, Todo 3→2 / Doing 1→2) → comment (POST 201, COMMENTS 3→4) → console clean (only the expected pre-login 401)
- [x] P7 Scope B polish ✅ — real drag & drop (dnd-kit: mouse/touch/keyboard sensors, DragOverlay, drop-target highlight, optimistic move + serialized writes), stats strip, search + priority/status filter chips, toasts, task drawer with MOVE TO / delete, new-task form, skeletons + staggered entrances (Console theme, DECISIONS #7–8). Verified on localhost: drag → PATCH 200 → DB positions dense; drawer MOVE TO; Escape close; create/delete toasts (MutationObserver); filters (8 chips, search, empty state); projects skeleton→stagger; zero console errors. Server: typecheck/lint/tests 8/8. Known env limits: keyboard-drag and screenshots not runtime-testable in the hidden browser window (library code reviewed instead).

## Verification bar
`typecheck` + `lint` + `test` pass on both packages; browser walkthrough of
register → login → create project → create task → move task → comment → logout,
with console clean, at 1440 and 390 widths.
