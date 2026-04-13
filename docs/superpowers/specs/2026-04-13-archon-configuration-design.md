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

Streaming section remains commented (CLI defaults are fine). No additional assistants needed — Claude uses global auth already configured in `.env`.

## 2. Workspace `CLAUDE.md`

A `CLAUDE.md` at the repo root provides every Archon workflow with project context.

**Contents:**
- Project purpose: Next.js todo/task manager, Archon sandbox
- Stack: Next.js (App Router), TypeScript, SQLite via Prisma, Tailwind CSS
- Conventions: API routes in `app/api/`, components in `app/components/`, Prisma schema in `prisma/`
- Testing: Jest + React Testing Library
- Dev commands: `npm run dev`, `npm run build`, `npm test`, `npx prisma migrate dev`

## 3. Workspace Permissions (`.claude/settings.local.json`)

Expand from the current `gh issue:*`-only allow list to cover commands Archon workflows need:

```json
{
  "permissions": {
    "allow": [
      "Bash(gh issue:*)",
      "Bash(npm run *)",
      "Bash(npx *)",
      "Bash(git *)"
    ]
  }
}
```

Keeps explicit allow-listing rather than opening all Bash — covers builds, tests, migrations, and git operations.

## Success Criteria

- `archon workflow list` shows 20 built-in workflows with no errors
- `archon chat "hello"` routes to Claude (sonnet) successfully
- `CLAUDE.md` is present and describes the stack accurately
- Archon workflows can run `npm`, `npx`, and `git` commands without permission prompts
