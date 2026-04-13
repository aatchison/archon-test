# archon-test

Next.js todo/task manager — sandbox for testing Archon workflows.

## Stack

- Framework: Next.js 15 (App Router)
- Language: TypeScript
- Database: SQLite via Prisma
- Styling: Tailwind CSS
- Formatter: Biome
- Package manager: bun

## Project Structure

- `app/api/` — API route handlers
- `app/components/` — React components
- `prisma/` — Prisma schema and migrations
- `docs/` — specs, plans, and design documents

## Dev Commands

| Command | Purpose |
|---------|---------|
| `bun run dev` | Start Next.js dev server (port 3000) |
| `bun run build` | Production build |
| `bun test` | Run Jest test suite |
| `bun run lint` | Run Biome linter |
| `bunx prisma migrate dev` | Apply pending migrations |
| `bunx prisma studio` | Open Prisma data browser |

## Dev Environment

Development runs inside a devcontainer. To start it:

```bash
archon workflow run devcontainer build
```

SSH agent, `~/.gitconfig`, and `~/.aws` are mounted from the host automatically.

## Testing

Jest + React Testing Library. Tests live alongside source files in `__tests__/` directories or as `*.test.ts(x)` files.
