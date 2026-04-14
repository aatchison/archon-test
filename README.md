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

| Workflow | Purpose | When to Use |
|----------|---------|-------------|
| `recall-workflows` | Load all workflows, memory, and conventions into context | Start of every new task |
| `opencode-task` | Run a mechanical coding task via local model (Gemma) | Implementing specs, writing tests, scaffolding |
| `gemma-code-review` | 10-perspective code review via 10 parallel Gemma runs | Before marking any PR ready |
| `devcontainer` | Build, start, and manage the dev container | Setting up or rebuilding the devcontainer |
| `run-tests` | Run the full test suite inside the devcontainer | Before committing or creating PRs |
| `create-sub-issues` | Create GitHub sub-issues linked to a parent issue | After writing an implementation plan |
| `pre-implementation-check` | Verify issue exists and branch is correct before starting | Before writing any code |
| `pre-merge-check` | Final check before merging a PR | Before merging |
| `update-pr-evidence` | Update PR description with test results and token usage | After tests pass |
| `watch-pr-review` | Poll for PR review comments and surface them | After marking PR ready |

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
