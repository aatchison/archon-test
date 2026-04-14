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

## Conventions

- **Create a GitHub issue for every feature before starting work.** All branches and PRs must reference an issue (e.g. `Closes #N` in the PR body). This ensures every piece of work is tracked and discoverable.
- **Create sub-issues for each task under the parent feature issue.** When a feature has an implementation plan with multiple tasks, create a sub-issue for each task referencing the parent (e.g. "Sub-task of #N" in the body). Close sub-issues as tasks complete.
- **Never merge directly to main.** All changes must go through a pull request, even small ones. Main is protected.
- **Branch protection is enabled on main.** PRs require passing status checks before merging. Do not bypass with `--force` or admin overrides.
- **Branches are deleted automatically after merge.** Do not reuse merged branches — always create a fresh branch for new work.
- **Create sub-issues BEFORE starting implementation.** Sequence: Plan → Sub-issues → Implementation. Never start Task 1 without sub-issues.
- **Analyze parallel execution in plans.** Add an "Execution Order" section showing task dependency graph and parallel waves. Launch independent tasks as concurrent Gemma runs.
- **Use Gemma for mechanical tasks.** Default to `run-opencode.sh` for implementation and spec reviews. Claude only for coordination, code quality reviews, and architecture. Gemma can run inside the devcontainer with `--devcontainer` flag.
