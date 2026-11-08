# TaskDeck — API Contract (source of truth)

Base URL: `/api`. All request/response bodies are JSON unless noted.
Auth = JWT in `HttpOnly; SameSite=Lax` cookie named `taskdeck_token`.
Errors use one envelope: `{ "error": { "message": string, "code": string } }`.

## Auth
| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/auth/register` | `{name,email,password}` (password ≥ 8) | 201 `{user}` + cookie | 409 `EMAIL_TAKEN`, 400 `VALIDATION` |
| POST | `/auth/login` | `{email,password}` | 200 `{user}` + cookie | 401 `INVALID_CREDENTIALS`, 400 |
| POST | `/auth/logout` | — | 204 | — |
| GET | `/auth/me` | — | 200 `{user}` | 401 `UNAUTHENTICATED` |

`user` = `{id,name,email,createdAt}` (never the password hash).

## Projects (all require auth; membership checked server-side)
| Method | Path | Body / notes | Success | Errors |
|---|---|---|---|---|
| GET | `/projects` | projects the caller owns or is a member of, with `role` | 200 `{projects:[{id,name,description,role,createdAt,taskCount}]}` | 401 |
| POST | `/projects` | `{name,description?}` | 201 `{project}` | 400, 401 |
| GET | `/projects/:id` | includes `members` + `tasks` (ordered) | 200 `{project}` | 401, 403 `FORBIDDEN`, 404 `NOT_FOUND` |
| PATCH | `/projects/:id` | `{name?,description?}` — owner only | 200 `{project}` | 403, 404 |
| DELETE | `/projects/:id` | owner only (cascades tasks/comments/members) | 204 | 403, 404 |
| GET | `/projects/:id/members` | — | 200 `{members:[{userId,name,email,role}]}` | 403, 404 |
| POST | `/projects/:id/members` | `{email,role:"owner"\|"member"}` — owner only | 201 `{member}` | 404 `USER_NOT_FOUND`, 403, 409 |
| DELETE | `/projects/:id/members/:userId` | owner only; owner cannot remove self | 204 | 403, 404 |

## Tasks (member can read; member can write; only owner can delete another member's task — keep simple: any member can CRUD, delete requires owner-or-author)
| Method | Path | Body / notes | Success | Errors |
|---|---|---|---|---|
| GET | `/projects/:id/tasks` | `?status=todo\|doing\|done` optional | 200 `{tasks:[...]}` | 403, 404 |
| POST | `/projects/:id/tasks` | `{title,description?,priority?,status?,dueDate?}` | 201 `{task}` | 400, 403, 404 |
| GET | `/tasks/:id` | includes `comments` + `project.name` | 200 `{task}` | 403, 404 |
| PATCH | `/tasks/:id` | any of `{title,description,priority,status,dueDate,position}` | 200 `{task}` | 400, 403, 404 |
| DELETE | `/tasks/:id` | project owner or task creator | 204 | 403, 404 |

`task` = `{id,projectId,title,description,status,priority,dueDate,position,createdById,createdAt,updatedAt}`.

## Comments
| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/tasks/:id/comments` | `{body}` | 201 `{comment}` | 400, 403, 404 |
| DELETE | `/comments/:id` | author or project owner | 204 | 403, 404 |

## Misc
- `GET /health` → 200 `{status:"ok",uptime}` (no auth).
- Rate limit: 100 req / 15 min general; 20 req / 15 min on `/auth/*` (per IP).
- Validation: Zod on every body; unknown fields stripped; 400 with field messages.
- Enums: `status = todo|doing|done`, `priority = low|medium|high`, `role = owner|member`.
