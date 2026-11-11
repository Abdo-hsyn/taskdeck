# TaskDeck

A full-stack **task & project management app** — kanban boards, priorities, due dates, team members and comments — built with a React frontend and a Node/Express REST API backed by MySQL.

> Built as an internship portfolio project: live demo + public repo + authentication + database + REST APIs + clean, documented code.

## Live demo

- **Frontend:** https://taskdeck-client.vercel.app
- **API:** https://taskdeck-api.vercel.app · health check: `/api/health`
- **Demo login:** `demo@taskdeck.app` / `demo1234!`

## Tech stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 19, TypeScript, Vite, React Router |
| Backend   | Node.js, Express 5, TypeScript (ESM) |
| Database  | MySQL (TiDB Cloud Serverless) via Prisma 7 |
| Auth      | JWT in an HttpOnly cookie, bcrypt password hashing |
| Validation| Zod schemas on every request body |
| Tooling   | npm, Vitest + Supertest, ESLint, Prettier |

## Features

- **Auth** — register / login / logout / session restore; passwords hashed with bcrypt (12 rounds); JWT stored in an `HttpOnly` cookie (not readable from JS) — `SameSite=None; Secure` in production because the frontend and API live on different domains, `SameSite=Lax` in local dev.
- **Projects** — create, rename, delete; membership with `owner` / `member` roles; authorization enforced **server-side** on every route.
- **Kanban board** — `todo → doing → done` columns with status lamps, priority badges; **real drag & drop** (dnd-kit: mouse/touch/keyboard, drag overlay, drop-target highlight) with optimistic moves — one `PATCH` per drop, writes serialized, rollback + toast on failure.
- **Board toolbar** — live stats strip (total / per-column / completion %), search across title+description, priority and status filter chips with a "no matches" empty state.
- **Tasks** — title, description, priority (`low/medium/high`), due date, ordering; detail drawer with MOVE TO buttons and delete; toasts for create/delete/move failures.
- **Comments** — per task, with author and timestamps.
- **Team members** — owners invite existing users by email and manage roles.
- **Cross-cutting** — uniform error envelope `{error:{message,code}}`, rate limiting (100 req/15min general, 20/15min on auth), Helmet security headers, CORS restricted to configured origins, `/api/health`.

## Repository layout

```
├── client/          # React + Vite SPA
│   └── src/
│       ├── api/        # typed fetch wrapper (single request() helper)
│       ├── context/    # AuthContext (session state)
│       ├── pages/      # Login, Register, Projects, Board
│       └── styles.css  # design tokens (Console theme)
├── server/          # Express REST API
│   ├── prisma/         # schema.prisma + seed.ts
│   └── src/
│       ├── routes/     # HTTP layer only
│       ├── services/   # authorization rules
│       ├── middleware/ # auth, validation, rate limits, errors
│       └── lib/        # prisma client, AppError, helpers
├── docs/            # PLAN, API contract, architecture, decisions
└── design/          # design direction
```

## API

The full REST contract lives in [`docs/API.md`](docs/API.md). Summary:

```
POST   /api/auth/register      POST /api/auth/login       POST /api/auth/logout
GET    /api/auth/me

GET    /api/projects           POST /api/projects         GET/PATCH/DELETE /api/projects/:id
GET    /api/projects/:id/members   POST /api/projects/:id/members   DELETE .../members/:userId

GET    /api/projects/:id/tasks     POST /api/projects/:id/tasks
GET    /api/tasks/:id              PATCH/DELETE /api/tasks/:id
POST   /api/tasks/:id/comments     DELETE /api/comments/:id

GET    /api/health
```

## Getting started (local)

### Prerequisites

- Node.js 20+ and npm
- A MySQL-compatible database (TiDB Cloud Serverless free tier works — no credit card)

### 1. Server

```bash
cd server
npm install
cp .env.example .env          # then fill DATABASE_URL, JWT_SECRET, CLIENT_ORIGINS
npx prisma migrate dev        # create schema
npm run db:seed               # optional demo data
npm run dev                   # http://localhost:4000/api/health
```

### 2. Client

```bash
cd client
npm install
npm run dev                   # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:4000` (see `vite.config.ts`).

### Environment variables (`server/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | signing secret — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CLIENT_ORIGINS` | comma-separated allowed origins, e.g. `http://localhost:5173` |
| `PORT` | API port (default `4000`) |
| `NODE_ENV` | `development` / `production` / `test` |

The client reads `VITE_API_URL` (API origin, no trailing path) in production builds — locally it is unset and Vite proxies `/api` instead.

## Scripts

| Where | Command | What |
|---|---|---|
| server | `npm run dev` | watch-mode API |
| server | `npm run typecheck` | `tsc --noEmit` |
| server | `npm test` | Vitest + Supertest |
| server | `npm run db:migrate` | apply migrations (production) |
| client | `npm run dev` | Vite dev server |
| client | `npm run build` | typecheck + production bundle |
| client | `npm run lint` | oxlint |

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the layer diagram and [`docs/DECISIONS.md`](docs/DECISIONS.md) for the trade-offs (why an HttpOnly cookie, why roles, why Prisma + MySQL).

## License

MIT
