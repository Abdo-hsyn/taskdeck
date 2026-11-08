# Conventions

- **Language:** TypeScript strict everywhere; ESM (`"type":"module"`) in both packages.
- **Naming:** files `kebab-or-camel` per existing folder; routes plural nouns; route params `:id`.
- **API:** only what `docs/API.md` defines — change the contract there first, then code.
- **Validation:** every request body goes through Zod before touching the service layer.
- **Auth:** no route reads `req.user` without `requireAuth`; authorization lives in the service layer, never in routes or the client.
- **Errors:** throw `AppError(message, status, code)`; the error middleware renders the envelope. Never `res.status(500).json(...)` inside handlers.
- **React:** function components, co-located styles in `index.css` design tokens, no inline style objects, loading/error/empty states for every data fetch.
- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`, `docs:`).
- **Secrets:** only via `.env` (gitignored); `.env.example` documents them.
