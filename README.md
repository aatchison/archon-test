# archon-test

A Next.js todo/task manager used as a sandbox for testing [Archon](https://github.com/coleam00/Archon) AI development workflows. The app itself is simple — the real value is the documented conventions for AI-assisted development.

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

This project uses a set of Archon workflows (`.archon/workflows/`) that automate common development tasks. Run any workflow with `archon workflow run <name>`.

### Available Workflows

#### `recall-workflows`
**Intent:** Load the full project context at the start of any session. Reads all workflow descriptions, the memory index, and CLAUDE.md conventions — so nothing has to be rediscovered from scratch. Always run this first when starting a new task.

#### `opencode-task`
**Intent:** Delegate any mechanical coding task to the local Gemma model. This is the default for file creation, writing tests, fixing test failures, updating docs, and generating PR descriptions. Routes to Claude only when the task requires genuine judgment (architecture, multi-file debugging). Supports a `--devcontainer` flag for tasks that need project dependencies (bun, prisma, running tests).

#### `gemma-code-review`
**Intent:** Run 10 Gemma subagents in parallel, each acting as a different critical reviewer (security, performance, accessibility, testing, naming, type safety, API design, error handling, simplicity, maintainability). Produces a single consolidated report. Must be run before marking any PR ready for review.

#### `devcontainer`
**Intent:** Manage the devcontainer lifecycle — build, rebuild, stop, check status, or exec a command inside it. Validates prerequisites (Docker, SSH agent, gitconfig) before acting. The devcontainer is where all tests run and where Gemma tasks execute when they need project dependencies.

#### `run-tests`
**Intent:** Run the full test suite (unit + integration + TypeScript check) inside the devcontainer and report results. Must be run before every commit and before marking a PR ready. Fails fast if the container is not running.

#### `create-sub-issues`
**Intent:** Parse an implementation plan and create a GitHub sub-issue for each task, linked to the parent feature issue. Run this after writing the plan and before writing any code — the sequence is always: Plan → Sub-issues → Implementation.

#### `pre-implementation-check`
**Intent:** Verify that all prerequisites are in place before dispatching implementation subagents: the parent issue exists, sub-issues have been created for every plan task, and the feature branch is checked out. Prevents starting implementation on the wrong branch or without issue tracking.

#### `pre-merge-check`
**Intent:** Final gate before merging a PR. Verifies tests pass, the PR body references the parent feature issue (not just sub-tasks), and the issue hierarchy is correct. Prevents merging without closing the parent issue.

#### `update-pr-evidence`
**Intent:** Run the test suite and update the PR description with evidence — unit test counts, integration test results, TypeScript check status, and a token usage breakdown from `docs/token-usage.md`. Keeps the PR description factual and reviewable without manual copy-paste.

#### `watch-pr-review`
**Intent:** Poll a PR every 60 seconds for new review comments. For each unresolved comment: read the feedback, make the code change, reply explaining what was done, and resolve the thread. Start this as soon as a PR moves out of draft.

### Starting a New Feature

```bash
# 1. Create a GitHub issue first (required)
gh issue create --title \"feat: description\" --body \"...\"

# 2. Recall workflows to load context
archon workflow run recall-workflows

# 3. Run the pre-implementation check
archon workflow run pre-implementation-check

# 4. Create sub-issues for each implementation task
archon workflow run create-sub-issues --issue <parent-issue-number>

# 5. Start implementing (use Gemma for mechanical tasks)
archon workflow run opencode-task -- \"implement X following the spec in docs/...\"
```

### Issue and PR Conventions

- **Every feature needs a GitHub issue first.** Branches and PRs must reference an issue (`Closes #N` in the PR body).
- **Create sub-issues before starting implementation.** Sequence: Plan → Sub-issues → Implementation. Never start Task 1 without sub-issues.
- **Sub-issue title format:** Prefix with `SP<N> —` for traceability (e.g. `SP5 — Task 3: Search Server Actions`).
- **Never merge directly to main.** All changes go through a PR.
- **Close issues via PR body.** Use `Closes #N` for the parent feature issue — do not close sub-issues individually.

### PR Review Workflow

```bash
# 1. Run Gemma multi-perspective review before making PR ready
archon workflow run gemma-code-review

# 2. Fix any issues found, then mark PR ready
gh pr ready

# 3. Poll for reviewer comments
archon workflow run watch-pr-review

# 4. Address comments: reply, fix, resolve thread
# After each round of fixes, update the PR description with evidence
archon workflow run update-pr-evidence
```

## Local Model (Gemma) Usage

This project offloads mechanical tasks to a local Gemma model via [opencode](https://opencode.ai), saving Claude API tokens for coordination and review.

### When to Use Gemma

| Task type | Model |
|-----------|-------|
| File creation, scaffolding, config | **Gemma** |
| Writing tests from a spec | **Gemma** |
| Fixing failing tests | **Gemma** |
| Spec compliance review | **Gemma** |
| PR descriptions, doc updates | **Gemma** |
| 10-perspective code review | **Gemma** (parallel) |
| Architecture decisions | **Claude** |
| Multi-file debugging | **Claude** |
| Code quality review | **Claude** |
| Coordination / orchestration | **Claude** |

### Running Gemma Tasks

```bash
# Host (no project deps needed)
.archon/scripts/run-opencode.sh vllm-31b/google/gemma-4-31B-it 120 2 \"task description\"

# Devcontainer (needs bun, prisma, node_modules, or running tests)
.archon/scripts/run-opencode.sh --devcontainer vllm-31b/google/gemma-4-31B-it 120 2 \"task description\"
```

The script includes an activity watchdog: if output stalls for the timeout (seconds), it kills and retries up to the retry count.

### Devcontainer Prerequisites

For `--devcontainer` mode, the devcontainer must be running and the opencode config must be mounted. See `.devcontainer/devcontainer.json` — the config is bind-mounted from `~/.config/opencode` on the host.

### Parallel Dispatch

Independent tasks should be dispatched simultaneously:

```bash
# Dispatch two Gemma tasks in parallel (background &)
.archon/scripts/run-opencode.sh vllm-31b/google/gemma-4-31B-it 120 2 \"write unit tests for X\" &
.archon/scripts/run-opencode.sh vllm-31b/google/gemma-4-31B-it 120 2 \"write unit tests for Y\" &
wait
```

## Memory System

This project uses Claude Code persistent memory (`.claude/projects/*/memory/`) to retain conventions across sessions. Key remembered patterns:

- Always create a GitHub issue before starting work
- Run tests inside the devcontainer, not on the host
- Track token usage in `docs/token-usage.md` throughout every session
- Start polling for PR review comments as soon as a PR is marked ready
- Fix issues found in Gemma review rounds between rounds, not all at the end

See `docs/token-usage.md` for a full record of model usage across all sub-projects.
