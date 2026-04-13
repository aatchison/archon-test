# Archon Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the first Archon configuration for the archon-test workspace — global config, CLAUDE.md, and workspace permissions.

**Architecture:** Three independent config files are created or modified: the global `~/.archon/config.yaml` activates the Claude assistant, a new `CLAUDE.md` at the repo root gives every workflow project context, and `.claude/settings.local.json` is expanded with explicit bun/git/gh allow-lists and destructive-op deny rules. A `.gitignore` ensures `.env` files are never committed.

**Tech Stack:** Archon CLI, Claude (sonnet), bun, Next.js (App Router), TypeScript, Prisma/SQLite, Tailwind CSS, Biome

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `~/.archon/config.yaml` | Activate Claude assistant + concurrency settings |
| Create | `CLAUDE.md` | Project context for all Archon workflows |
| Modify | `.claude/settings.local.json` | Workspace Bash permission allow/deny list |
| Create | `.gitignore` | Keep `.env` and secrets out of version control |

---

### Task 1: Configure global Archon config

**Files:**
- Modify: `~/.archon/config.yaml`

- [ ] **Step 1: Verify current state**

```bash
cat ~/.archon/config.yaml
```

Expected: file exists with all fields commented out.

- [ ] **Step 2: Write the updated config**

Replace the contents of `~/.archon/config.yaml` with:

```yaml
# Archon Global Configuration

botName: Archon

defaultAssistant: claude

assistants:
  claude:
    model: sonnet

# Streaming mode per platform (stream or batch)
# streaming:
#   telegram: stream
#   discord: batch
#   slack: batch

concurrency:
  maxConversations: 10
```

- [ ] **Step 3: Verify archon recognises the config**

```bash
archon workflow list 2>&1 | tail -5
```

Expected: exits with no errors, lists at least one workflow (e.g. `archon-assist`).

---

### Task 2: Create workspace CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Verify no CLAUDE.md exists yet**

```bash
ls CLAUDE.md 2>&1
```

Expected: `ls: cannot access 'CLAUDE.md': No such file or directory`

- [ ] **Step 2: Create CLAUDE.md**

Create `CLAUDE.md` at the repo root with:

```markdown
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
```

- [ ] **Step 3: Verify the file exists and is well-formed**

```bash
head -5 CLAUDE.md
```

Expected output:
```
# archon-test

Next.js todo/task manager — sandbox for testing Archon workflows.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with project context for Archon workflows"
```

---

### Task 3: Create .gitignore

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Verify no .gitignore exists**

```bash
ls .gitignore 2>&1
```

Expected: `ls: cannot access '.gitignore': No such file or directory`

- [ ] **Step 2: Create .gitignore**

Create `.gitignore` at the repo root:

```
# Environment / secrets — never commit these
.env
.env.*
!.env.example

# Dependencies
node_modules/
.bun/

# Next.js build output
.next/
out/

# Prisma generated client
prisma/generated/

# OS
.DS_Store
```

- [ ] **Step 3: Verify git no longer tracks .env files**

```bash
echo "TEST=secret" > .env.local
git status .env.local
```

Expected: `.env.local` does NOT appear as an untracked file (it is ignored).

```bash
rm .env.local
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore, keep .env files out of version control"
```

---

### Task 4: Expand workspace permissions

**Files:**
- Modify: `.claude/settings.local.json`

- [ ] **Step 1: Read current state**

```bash
cat .claude/settings.local.json
```

Expected:
```json
{
  "permissions": {
    "allow": [
      "Bash(gh issue:*)"
    ]
  }
}
```

- [ ] **Step 2: Write updated permissions**

Replace `.claude/settings.local.json` with:

```json
{
  "permissions": {
    "allow": [
      "Bash(gh issue:*)",
      "Bash(gh pr:*)",
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
      "Bash(git stash pop)",
      "Bash(git fetch *)"
    ],
    "deny": [
      "Bash(git push --force*)",
      "Bash(git reset --hard*)",
      "Bash(git clean -f*)"
    ]
  }
}
```

- [ ] **Step 3: Verify JSON is valid**

```bash
cat .claude/settings.local.json | python3 -m json.tool > /dev/null && echo "valid JSON"
```

Expected: `valid JSON`

- [ ] **Step 4: Commit**

```bash
git add .claude/settings.local.json
git commit -m "chore: expand workspace permissions for bun, git, and gh workflows"
```

---

### Task 5: Verify all success criteria

- [ ] **Step 1: archon workflow list exits cleanly with workflows**

```bash
archon workflow list 2>&1 | grep -E "archon-assist|archon-fix-github-issue"
```

Expected: both workflow names appear in output.

- [ ] **Step 2: CLAUDE.md is present and accurate**

```bash
grep -E "bun|Next.js|Prisma" CLAUDE.md
```

Expected: at least 3 matching lines covering the stack.

- [ ] **Step 3: .gitignore protects .env files**

```bash
git check-ignore -v .env
```

Expected: `.gitignore:3:.env	.env`

- [ ] **Step 4: settings.local.json is valid and contains deny rules**

```bash
grep "deny" .claude/settings.local.json
```

Expected: `"deny":` present in output.

- [ ] **Step 5: Push branch and open PR**

```bash
git push -u origin feat/implement-archon-config
gh pr create --title "feat: implement first archon configuration" \
  --body "Implements the archon configuration spec (resolves #1).

- Activates Claude (sonnet) in ~/.archon/config.yaml
- Adds CLAUDE.md with project context for all workflows
- Adds .gitignore protecting .env files
- Expands workspace permissions with bun/git allow-list and destructive-op deny rules" \
  --base main
```
