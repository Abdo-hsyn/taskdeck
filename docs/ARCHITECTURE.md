# Architecture

```
Browser (React 19 + Vite, react-router, TanStack Query-less plain fetch layer)
   │  fetch('/api/...', { credentials:'include' })
   ▼
Express 5 API (TypeScript, ESM)
   ├─ middleware: helmet → cors(origin allowlist) → json → cookie-parser
   │              → rate-limit → requireAuth (JWT verify)
   ├─ routes: /auth /projects /tasks /comments /health
   ├─ validation: Zod schemas per route, 400 envelope on failure
   └─ Prisma Client ──► PostgreSQL (Neon)
```

## Layers (server)
- `src/app.ts` — builds the Express app (no `listen`), so tests import it directly.
- `src/index.ts` — reads env, starts listener, graceful shutdown.
- `src/routes/*` — HTTP only: parse, call service, shape response.
- `src/services/*` — business rules + authorization checks (who can do what).
- `src/middleware/*` — auth, rate limits, error envelope, not-found.
- `prisma/schema.prisma` — data model; `prisma/seed.ts` — demo data.

## Client
- `src/api/` — typed fetch wrappers per resource; single `request()` helper owns the error envelope.
- `src/context/AuthContext.tsx` — session state (calls `/auth/me` on boot).
- `src/pages/*` — route-level screens (Login, Register, Projects, Board, TaskDetail).
- `src/components/*` — presentational pieces (TaskCard, Modal, Field, ...).

## Error contract
Every failure: `{ error: { message, code } }` with correct HTTP status (400/401/403/404/409/429/500). Client shows `message` inline; unknown codes fall back to a generic toast.
