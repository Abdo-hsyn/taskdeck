# TaskDeck — Project Plan

## Goal
A full-stack task/project management app built to satisfy internship requirements:
Live (public URL) + GitHub repo + Auth + Database + React frontend + Node backend +
REST APIs + clean code + README.

**Stack:** React 19 + Vite (client) · Express 5 + Prisma 7 + PostgreSQL (server) · npm workspaces-free layout (two folders, one repo).

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
- [ ] P2 Server: Prisma schema, middleware, routes, seed, tests
- [ ] P3 Design direction + UI previews (design gate)
- [ ] P4 Client: auth flow, projects, board, task detail
- [ ] P5 Integration verification (run both, exercise flows in browser, screenshots)
- [ ] P6 README, deploy config (Vercel client / Render server / Neon DB), final review

## Verification bar
`typecheck` + `lint` + `test` pass on both packages; browser walkthrough of
register → login → create project → create task → move task → comment → logout,
with console clean, at 1440 and 390 widths.
