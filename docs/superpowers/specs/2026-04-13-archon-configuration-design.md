# Archon Configuration Design

**Date:** 2026-04-13
**Issue:** [aatchison/archon-test#1](https://github.com/aatchison/archon-test/issues/1)

## Overview

This spec covers the first Archon configuration for the `archon-test` workspace. The repository is a sandbox for testing Archon workflows on a real software project: a Next.js todo/task manager app.

## Approach

Minimal config + Archon defaults. Configure the global assistant, add a `CLAUDE.md` for project context, and expand workspace permissions. No custom workflows upfront — discover what's needed through real use.

## 1. Global Archon Config (`~/.archon/config.yaml`)

Activate the following fields (currently all commented out):

```yaml
botName: Archon

defaultAssistant: claude

assistants:
  claude:
    model: sonnet

concurrency:
  maxConversations: 10
```

Streaming section remains commented (CLI defaults are fine). No additional assistants needed — Claude uses global auth. Authentication secrets (API keys, tokens) must be stored at the user/machine level outside version control — OS keychain, a CLI secret store, or per-user environment variables. Any local `.env` files used for development must be added to `.gitignore` and never committed.

## 2. Workspace `CLAUDE.md`

A `CLAUDE.md` at the repo root provides every Archon workflow with project context.

**Contents:**
- Project purpose: Next.js todo/task manager, Archon sandbox
- Stack: Next.js (App Router), TypeScript, SQLite via Prisma, Tailwind CSS, Biome (formatting)
- Package manager: `bun` (not npm)
- Conventions: API routes in `app/api/`, components in `app/components/`, Prisma schema in `prisma/`
- Testing: Jest + React Testing Library
- Dev commands: `bun run dev`, `bun run build`, `bun test`, `bunx prisma migrate dev`

## 3. Workspace Permissions (`.claude/settings.local.json`)

Expand from the current `gh issue:*`-only allow list to cover commands Archon workflows need:

```json
{
  "permissions": {
    "allow": [
      "Bash(gh issue:*)",
      "Bash(bun run *)",
      "Bash(bun add *)",
      "Bash(bun install)",
      "Bash(bunx prisma *)",
      "Bash(bunx create-next-app *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git push)",
      "Bash(git pull)",
      "Bash(git checkout *)",
      "Bash(git stash)",
      "Bash(git stash pop)"
    ],
    "deny": [
      "Bash(git push --force*)",
      "Bash(git reset --hard*)",
      "Bash(git clean -f*)"
    ]
  }
}
```

Enumerates specific subcommands rather than broad wildcards. Destructive git operations (`--force` push, `--hard` reset, `clean -f`) are explicitly denied.

## Success Criteria

- `archon workflow list` exits successfully with a non-empty list of workflows and no errors
- `archon chat "hello"` routes to Claude (sonnet) successfully
- `CLAUDE.md` is present and describes the stack accurately
- Archon workflows can run `bun`, `bunx`, and `git` commands without permission prompts
