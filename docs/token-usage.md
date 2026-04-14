# Token Usage Tracking

Tracks Claude vs Gemma (opencode) token usage during todo app foundation implementation.

## Per-Task Breakdown

| Task | Model | Approx Tokens | Notes |
|------|-------|---------------|-------|
| Task 1: Scaffold Next.js | Gemma (vllm-31b) | ~5k | Worked but wiped CLAUDE.md, .gitignore; needed Claude fix |
| Task 1: Spec review | Claude (haiku) | ~2k | Verified scaffold files |
| Task 1: Code quality review | Claude (sonnet) | ~8k | Found 7 issues (CLAUDE.md, .gitignore, package name, globals.css) |
| Task 1: Fix commit | Claude (sonnet) | ~2k | Fixed all code review issues |
| Task 2: Prisma schema | Gemma (vllm-31b) | ~8k | Handled Prisma 7; replaced enums with strings (correct for SQLite) |
| Task 2: Fix commit | Claude (sonnet) | ~1k | Removed .env from git, added prisma.config.ts |
| Task 3: Jest config | Gemma (vllm-31b) | ~3k | Clean execution |
| Task 4: Auth.js config | Gemma (vllm-31b) | ~6k | openssl not found, used node crypto fallback |
| Task 5: Password tests | Gemma (vllm-31b) | ~2k | Clean execution, 4 tests pass |
| Task 6: Register + Login | Gemma (vllm-31b) | ~5k | Used zod (not installed); Claude rewrote actions/auth.ts |
| Task 6: Fix | Claude (sonnet) | ~1k | Rewrote to match spec (throw errors, not zod) |
| Task 7: App shell + sidebar | Gemma (vllm-31b) | ~4k | Clean execution via watchdog script |
| Task 8: List actions + tests | Gemma (vllm-31b) | ~12k | Got stuck retrying failing test (Prisma 7 mock issue) |
| Task 8: Fix tests | Claude (sonnet) | ~3k | Rewrote tests with bun:test mock.module pattern |
| Task 9: Lists UI | Gemma (vllm-31b) | ~4k | Clean execution |
| Task 10: ListCard tests | Claude (sonnet) | ~3k | Wrote tests, set up happy-dom preload, added cleanup |
| Task 11: Task actions + tests | Gemma (vllm-31b) | ~4k | Used wrong field name (userId vs ownerId) |
| Task 11: Fix + tests | Claude (sonnet) | ~4k | Rewrote actions/tasks.ts and wrote tests |
| Task 12: Task UI components | Gemma (vllm-31b) | ~5k | Clean execution |
| Task 13: TaskItem tests | Claude (sonnet) | ~4k | Wrote tests, fixed Prisma mock in preload |
| Task 14: Integration tests | Claude (sonnet) | ~8k | Prisma 7 libsql adapter setup, test infrastructure |
| Task 15: Build verification | Claude (sonnet) | ~6k | Fixed all TS errors in Gemma-generated pages |
| Sub-issue creation | Claude (sonnet) | ~3k | Created #13-#27, linked as sub-issues of #11 |
| Workflows + memory | Claude (sonnet) | ~2k | run-tests, update-pr-evidence, create-sub-issues workflows |

## Running Totals

| Model | Estimated Tokens | Task Count | Notes |
|-------|-----------------|------------|-------|
| Gemma (vllm-31b) | ~58k | 12 runs | Mechanical implementation, scaffolding |
| Claude (sonnet) | ~45k | 14 actions | Reviews, fixes, test design, coordination |
| Claude (haiku) | ~2k | 1 review | Spec compliance check |
| **Total** | **~105k** | **27 actions** | **55% Gemma, 43% Claude sonnet, 2% haiku** |

## Cost Observations

- Gemma handled 12 of 15 implementation tasks but needed Claude fixes on ~50% of them
- Common Gemma issues: wrong field names, importing non-existent functions, using wrong APIs (zod, vitest)
- Gemma excels at: file creation from clear specs, config, simple component implementation
- Claude essential for: test infrastructure, Prisma 7 adapter setup, fixing Gemma's field/import errors

## Sub-project 2: Core Task Management

| Task | Model | Approx Tokens | Notes |
|------|-------|---------------|-------|
| Task 1: Label Server Actions | Gemma (vllm-31b) | ~4k | Clean execution |
| Task 2: Label action tests | Claude (sonnet) | ~3k | Wrote bun:test mocks directly |
| Task 3: LabelBadge + tests | Gemma + Claude | ~4k | Gemma component, Claude tests |
| Task 4: ColorPicker + LabelForm + LabelPicker | Gemma (vllm-31b) | ~8k | 3 components in one batch, LSP fixes |
| Task 5: Labels page + sidebar | Gemma (vllm-31b) | ~5k | Clean execution |
| Task 6: LabelPicker | (included in Task 4) | — | Batched with Task 4 |
| Task 7: TaskEditForm | Gemma (vllm-31b) | ~5k | LSP label association warnings |
| Task 8: Update TaskItem | Gemma (vllm-31b) | ~6k | Accessibility fixes (button types, keyboard) |
| Task 9: Filter utilities | Gemma (vllm-31b) | ~3k | Clean execution |
| Sub-issue creation | Claude (sonnet) | ~2k | Created #29-#41, linked to #28 |

### Sub-project 2 Running Totals (so far)

| Model | Estimated Tokens | Tasks |
|-------|-----------------|-------|
| Gemma (vllm-31b) | ~35k | 8 runs |
| Claude (sonnet) | ~5k | 2 actions |
