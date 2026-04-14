# archon-test

A sandbox for building and testing [Archon](https://github.com/coleam00/Archon) AI development workflows.

## Why These Workflows Exist

AI coding assistants are powerful but inconsistent. Left unguided, they rediscover conventions from scratch each session, skip steps under time pressure, and produce work that's hard to review or reproduce.

These workflows encode the decisions we've already made — how to structure issues, when to delegate to a local model, what to check before merging — so they run the same way every time, whether triggered from the CLI, a chat message, or a scheduled job.

The goal is not to automate away judgment, but to automate away repetition: the bookkeeping, the context-loading, the mechanical implementation, the multi-pass review. That frees Claude for the work that actually needs reasoning.

This project uses [Archon](https://github.com/coleam00/Archon) to define those workflows in YAML — mixing bash steps, AI prompt nodes, and human approval gates into reproducible sequences that run in isolated git worktrees.

---

## Stack

- Framework: Next.js 15 (App Router)
- Language: TypeScript
- Database: SQLite via Prisma
- Styling: Tailwind CSS
- Package manager: bun
- Formatter: Biome

## Dev Environment

Development runs inside a devcontainer. To start it:

```bash
# Requires: Archon CLI — https://github.com/coleam00/Archon
archon workflow run devcontainer build
```

SSH agent, `~/.gitconfig`, and `~/.aws` are mounted from the host automatically. The devcontainer includes bun, git, docker-in-docker, and the AWS CLI.

## Running the App

```bash
bun run dev       # Start dev server (port 3000)
bun test          # Run test suite
bun run build     # Production build
bun run lint      # Biome linter
bunx prisma migrate dev  # Apply migrations
```

## Archon Workflow Reference

Workflows live in `.archon/workflows/`. Run any workflow with `archon workflow run <name>`.

### Available Workflows

#### `recall-workflows`
Load the full project context at the start of any session. Reads all workflow descriptions, the memory index, and CLAUDE.md conventions so nothing has to be rediscovered from scratch. Run this first when starting a new task.

#### `opencode-task`
Delegate any mechanical coding task to the local Gemma model. This is the default for file creation, writing tests, fixing test failures, updating docs, and generating PR descriptions. Routes to Claude only when the task requires genuine judgment (architecture, multi-file debugging). Supports a `--devcontainer` flag for tasks that need project dependencies (bun, prisma, running tests).

#### `gemma-code-review`
Run 10 Gemma subagents in parallel, each acting as a different critical reviewer: security, performance, accessibility, testing, naming, type safety, API design, error handling, simplicity, and maintainability. Produces a single consolidated report. Run before marking any PR ready for review.

#### `devcontainer`
Manage the devcontainer lifecycle — build, rebuild, stop, check status, or exec a command inside it. Validates prerequisites (Docker, SSH agent, gitconfig) before acting. The devcontainer is where all tests run and where Gemma tasks execute when they need project dependencies.

#### `run-tests`
Run the full test suite (unit + integration + TypeScript check) inside the devcontainer and report results. Run before every commit and before marking a PR ready.

#### `create-sub-issues`
Parse an implementation plan and create a GitHub sub-issue for each task, linked to the parent feature issue. Run this after writing the plan and before writing any code — the sequence is always: Plan → Sub-issues → Implementation.

#### `pre-implementation-check`
Verify that all prerequisites are in place before dispatching implementation subagents: the parent issue exists, sub-issues have been created for every plan task, and the feature branch is checked out.

#### `pre-merge-check`
Final gate before merging a PR. Verifies tests pass, the PR body references the parent feature issue (not just sub-tasks), and the issue hierarchy is correct.

#### `update-pr-evidence`
Run the test suite and update the PR description with evidence — unit test counts, integration test results, TypeScript check status, and a token usage breakdown from `docs/token-usage.md`.

#### `watch-pr-review`
Poll a PR every 60 seconds for new review comments. For each unresolved comment: read the feedback, make the code change, reply explaining what was done, and resolve the thread. Start this as soon as a PR moves out of draft.

### Starting a New Feature

```bash
# 1. Create a GitHub issue first (required)
gh issue create --title "feat: description" --body "..."

# 2. Load context
archon workflow run recall-workflows

# 3. Verify prerequisites
archon workflow run pre-implementation-check

# 4. Create sub-issues from the implementation plan
archon workflow run create-sub-issues --issue <parent-issue-number>

# 5. Implement (delegate mechanical tasks to Gemma)
archon workflow run opencode-task -- "implement X following the spec in docs/..."
```

### Issue and PR Conventions

- **Every feature needs a GitHub issue first.** Branches and PRs must reference an issue (`Closes #N` in the PR body).
- **Create sub-issues before starting implementation.** Sequence: Plan → Sub-issues → Implementation.
- **Sub-issue title format:** Prefix with `SP<N> —` for traceability (e.g. `SP5 — Task 3: Search Server Actions`).
- **Never merge directly to main.** All changes go through a PR.
- **Close issues via PR body.** Use `Closes #N` for the parent feature issue — do not close sub-issues individually.

### PR Review Workflow

```bash
# 1. Run multi-perspective review before marking ready
archon workflow run gemma-code-review

# 2. Fix issues found, then mark PR ready
gh pr ready

# 3. Poll for reviewer comments
archon workflow run watch-pr-review

# 4. After addressing comments, update PR with test evidence
archon workflow run update-pr-evidence
```

## Local Model Usage

Mechanical tasks are delegated to a local Gemma model via [opencode](https://opencode.ai), keeping Claude focused on coordination and review.

### Division of Labor

| Task | Model |
|------|-------|
| File creation, scaffolding, config | Gemma |
| Writing tests from a spec | Gemma |
| Fixing failing tests | Gemma |
| Spec compliance review | Gemma |
| PR descriptions, doc updates | Gemma |
| 10-perspective code review | Gemma (parallel) |
| Architecture decisions | Claude |
| Multi-file debugging | Claude |
| Code quality review | Claude |
| Coordination / orchestration | Claude |

### Running Tasks

```bash
# On the host (no project deps needed)
.archon/scripts/run-opencode.sh vllm-31b/google/gemma-4-31B-it 120 2 "task description"

# Inside the devcontainer (needs bun, prisma, node_modules, or running tests)
.archon/scripts/run-opencode.sh --devcontainer vllm-31b/google/gemma-4-31B-it 120 2 "task description"
```

The script includes an activity watchdog: if output stalls, it kills and retries up to the configured retry count.

### Parallel Dispatch

Independent tasks run simultaneously:

```bash
.archon/scripts/run-opencode.sh vllm-31b/google/gemma-4-31B-it 120 2 "write unit tests for X" &
.archon/scripts/run-opencode.sh vllm-31b/google/gemma-4-31B-it 120 2 "write unit tests for Y" &
wait
```

## Memory System

Claude Code persistent memory (`.claude/projects/*/memory/`) retains conventions across sessions so they don't have to be re-established each time. Key patterns stored:

- Always create a GitHub issue before starting work
- Run tests inside the devcontainer, not on the host
- Track token usage in `docs/token-usage.md` throughout every session
- Start polling for PR review comments as soon as a PR is marked ready
- Fix Gemma review findings between rounds, not all at the end

See `docs/token-usage.md` for a full record of model usage across all sub-projects.
