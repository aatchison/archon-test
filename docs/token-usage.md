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

### Sub-project 2 Running Totals

| Model | Estimated Tokens | Tasks |
|-------|-----------------|-------|
| Gemma (vllm-31b) | ~35k | 8 runs |
| Claude (sonnet) | ~5k | 2 actions |

## Sub-project 3: Collaboration

| Task | Model | Approx Tokens | Time | Notes |
|------|-------|---------------|------|-------|
| Task 1: Authorization helpers | Claude (sonnet) | ~6k | ~3min | lib/authorization.ts — 6 functions |
| Task 2: Authorization tests | Claude (sonnet) | ~4k | ~2min | 19 unit tests, INTEGRATION_TEST flag |
| Task 3: Refactor lists actions | Claude (sonnet) | ~2k | ~1min | requireOwner for rename/delete |
| Task 4: Refactor tasks actions | Claude (sonnet) | ~3k | ~2min | requireEdit for all mutations |
| Task 5: Refactor labels actions | Claude (sonnet) | ~2k | ~1min | requireEdit for label-task ops |
| Task 6: Lists/tasks test updates | Claude (sonnet) | ~3k | ~2min | Mock authorization in tests |
| Task 7: Member actions | Claude (sonnet) | ~4k | ~2min | addMember, removeMember, updateRole |
| Task 8: Member action tests | Claude (sonnet) | ~4k | ~2min | 10 unit tests |
| Task 9: Member integration test | Claude (sonnet) | ~3k | ~2min | 1 integration test |
| Task 10: RoleBadge + tests | Claude (sonnet) | ~2k | ~1min | Component + 3 tests |
| Task 11: InviteForm | Claude (sonnet) | ~2k | ~1min | Email + role form |
| Task 12: MemberList | Claude (sonnet) | ~3k | ~1min | List with role management |
| Task 13: Members page | Claude (sonnet) | ~3k | ~2min | Owner-only page |
| Task 14: Sidebar + list page | Claude (sonnet) | ~3k | ~2min | Shared lists, canEdit/canView |
| Sub-issue creation | Claude (sonnet) | ~2k | ~1min | Created sub-issues for #57 |
| Gemma review round 1 | Gemma (vllm-31b) | ~50k | ~3min | 10 perspectives, 6 actionable issues |
| Round 1 fixes | Claude (sonnet) | ~3k | ~2min | aria-label, userId validation, dedup |
| Gemma review round 2 | Gemma (vllm-31b) | ~50k | ~4min | 10 perspectives, 2 actionable issues |
| Round 2 fixes | Claude (sonnet) | ~2k | ~1min | Error feedback, type assertions |
| Gemma review round 3+ | Gemma (vllm-31b) | ~20k+ | ongoing | Convergence check |

### Sub-project 3 Running Totals (so far)

| Model | Estimated Tokens | Tasks |
|-------|-----------------|-------|
| Gemma (vllm-31b) | ~120k+ | 22+ review runs |
| Claude (sonnet) | ~49k | 17 actions |

## Workflow Improvements (between SP3 and SP4)

| Task | Model | Approx Tokens | Time | Notes |
|------|-------|---------------|------|-------|
| Workflow/script audit + improvements | Claude (opus) | ~15k | ~5min | Fix gemma-code-review YAML, add resolve-pr-threads.sh, recall-workflows, pre-merge-check |
| Gemma review of workflow changes | Gemma (vllm-31b) | ~50k | ~3min | 10 perspectives, found glob collision, quoting, hardcoded paths |
| Fix Gemma findings on workflows | Claude (opus) | ~5k | ~2min | mktemp, quoting, pwd-based paths |
| Memory consolidation | Claude (opus) | ~3k | ~2min | 9 files → 3 consolidated |
| Close SP3 sub-issues | Claude (opus) | ~2k | ~1min | 13 sub-issues left open after merge |

### Workflow Improvements Running Totals

| Model | Estimated Tokens | Tasks |
|-------|-----------------|-------|
| Gemma (vllm-31b) | ~50k | 10 review runs |
| Claude (opus) | ~25k | 5 actions |

## Sub-project 4: Real-time (Design Phase)

| Task | Model | Approx Tokens | Time | Notes |
|------|-------|---------------|------|-------|
| Codebase exploration for SP4 | Claude (opus) | ~8k | ~3min | Current patterns, missing real-time infra |
| Research: real-time approaches | Gemma (vllm-31b) | ~5k | ~2min | SSE vs WebSocket vs polling comparison |
| Research: useOptimistic patterns | Gemma (vllm-31b) | ~5k | ~2min | React 19 hook usage, rollback, gotchas |
| Approach comparison draft | Gemma (vllm-31b) | ~5k | ~2min | A/B/C trade-off table |
| Client architecture review | Gemma (vllm-31b) | ~5k | ~2min | Found leader election, router.refresh, echo issues |
| Testing strategy review | Gemma (vllm-31b) | ~3k | ~1min | Found missing race condition and auth tests |
| Spec writing | Claude (opus) | ~10k | ~5min | Full design spec with all sections |
| 10-perspective Gemma spec review | Gemma (vllm-31b) | ~50k | ~3min | Security, simplicity, performance, a11y, etc. |
| Spec updates from Gemma review | Claude (opus) | ~5k | ~3min | 8 findings incorporated |
| Implementation plan writing | Claude (opus) | ~15k | ~8min | 15 tasks, 2300+ lines, full TDD code |
| EventHub test code draft | Gemma (vllm-31b) | ~3k | ~1min | 93 lines of test code |
| Plan self-review | Claude (opus) | ~5k | ~3min | Spec coverage, placeholder scan, type consistency |
| 6-perspective Gemma plan review | Gemma (vllm-31b) | ~30k | ~3min | Correctness, testing, architecture, security, DX, performance |
| Plan fixes from Gemma review | Claude (opus) | ~8k | ~5min | 6 issues fixed: stale presence, rate limit, BC misuse, auto-hide, maxListeners |

### Sub-project 4 Implementation

| Task | Model | Approx Tokens | Time | Notes |
|------|-------|---------------|------|-------|
| Tasks 1-3 (Wave 1) | Gemma (vllm-31b) | ~15k | ~5min | Types, config, migration, EventHub — sequential |
| Tasks 4-7 (Wave 2) | Gemma (vllm-31b) | ~20k | ~5min | Server actions, SSE route, transport — parallel pairs |
| Task 4 test-preload fix | Claude (opus) | ~3k | ~1min | Added event-hub + ConflictError mocks |
| Task 5 renameList test fix | Claude (opus) | ~2k | ~1min | findUnique mock for updated list |
| Tasks 8-10 (Wave 3) | Gemma (vllm-31b) | ~15k | ~5min | useEventSource, usePresence, useTaskList, UI components |
| Task 9 .tsx rename | Gemma (vllm-31b) | ~2k | ~1min | git mv use-task-list.ts → .tsx |
| Task 11: TaskItem optimistic UI | Gemma (vllm-31b) | ~5k | ~2min | Clean execution, 5/5 tests pass |
| Task 11 spec review | Gemma (vllm-31b) | ~3k | ~1min | PASS |
| Task 11 code review | Gemma (vllm-31b) | ~3k | ~1min | Found 4 issues: a11y, memo, type safety |
| Task 11 a11y fix | Claude (opus) | ~1k | ~30s | Added aria-label to Delete button |
| Task 12: Wire Up List Page | Claude (opus) | ~5k | ~2min | Gemma timed out (prompt too long), done directly |
| Task 12 spec review | Gemma (vllm-31b) | ~3k | ~1min | PASS |
| Task 12 code review | Gemma (vllm-31b) | ~3k | ~1min | Found 4 issues: perf, a11y, type safety |

| Task 12 review fixes | Claude (opus) | ~2k | ~1min | useMemo, Link, token usage update |
| Task 13: Test Infrastructure | Gemma (vllm-31b) | ~5k | ~2min | realtime-config mock, test script update |
| Task 14: Integration Tests | Gemma (vllm-31b) | ~5k | ~2min | Version conflict test (overwrote existing — fixed) |
| Task 14 fix: restore tests | Claude (opus) | ~3k | ~1min | Restored CRUD tests, appended conflict test |
| Task 15: Build Verification | Claude (opus) | ~5k | ~3min | Test fix (INTEGRATION_TEST=1 for event-hub), tsc, build |

### Sub-project 4 Running Totals (Design + Implementation)

| Model | Estimated Tokens | Tasks |
|-------|-----------------|-------|
| Gemma (vllm-31b) | ~185k | 37 runs |
| Claude (opus) | ~72k | 17 actions |

## Sub-project 4: Real-time

| Task | Model | Approx Tokens | Notes |
|------|-------|---------------|-------|
| Tasks 1-10 (prior session) | Gemma + Claude | ~200k | EventHub, SSE, hooks, components |
| Tasks 11-15 | Gemma + Claude | ~27k | TaskItem, ListClient, tests, build |
| Gemma review R1-R4 (40 perspectives) | Gemma (vllm-31b) | ~115k | 4 rounds to convergence |
| Review fixes | Gemma + Claude | ~20k | Labels, conflict dialog, presence, getUserId |
| CodeRabbit review responses | Claude (opus) | ~3k | 28 comments replied and resolved |

### Sub-project 4 Running Totals

| Model | Estimated Tokens | Tasks |
|-------|-----------------|-------|
| Gemma (vllm-31b) | ~335k | 50+ runs |
| Claude (opus) | ~30k | 8 actions |

## Sub-project 5: Search

| Task | Model | Approx Tokens | Notes |
|------|-------|---------------|-------|
| FTS5 research | Gemma (vllm-31b) | ~5k | SQLite FTS5 + Prisma patterns |
| Design brainstorming + spec | Claude (sonnet) | ~23k | FTS5 approach, filters, UI layout, full spec |
| Gemma design review | Gemma (vllm-31b) | ~5k | Reviewed design sections |
| Plan writing | Claude (sonnet) | ~12k | 13-task plan with full code |
| Task 1: FTS5 migration | Gemma (vllm-31b) | ~3k | Virtual table + triggers |
| Task 2: Search module | Gemma (vllm-31b) | ~4k | lib/search.ts — sanitizeQuery, searchTasks |
| Task 3: Server actions | Gemma (vllm-31b) | ~3k | actions/search.ts |
| Task 4: Action tests | Claude (sonnet) subagent | ~15k | actions/search.test.ts |
| Task 5: Module tests | Claude (sonnet) subagent | ~16k | lib/search.test.ts |
| Task 6: SearchResult component | Gemma (vllm-31b) | ~3k | Snippet sanitization |
| Task 7: SearchResult tests | Claude (sonnet) subagent | ~15k | 9 component tests |
| Task 8: SearchBar + sidebar | Claude (sonnet) | ~5k | Debounced input, keyboard nav |
| Task 10: Search page | Claude (sonnet) | ~3k | Server component with pagination |
| Task 12: Integration tests | Claude (sonnet) | ~8k | 16 integration tests |
| Test fixes (mock contamination, auth ordering) | Claude (sonnet) | ~30k | Multiple rounds of bun mock.module fixes |
| FTS trigger fix (integration test) | Claude (sonnet) | ~2k | rebuildSearchIndex in beforeAll |
| Workflow fixes | Claude (sonnet) | ~10k | devcontainer mount, run-opencode.sh hardening |
| Gemma code review (6 perspectives) | Gemma (vllm-31b) | ~18k | Security, simplicity, testing, performance, error handling, type safety |

### Sub-project 5 Running Totals

| Model | Estimated Tokens | Tasks |
|-------|-----------------|-------|
| Gemma (vllm-31b) | ~41k | 8 runs |
| Claude (sonnet) | ~139k | 14 actions + 3 subagents |

## Grand Totals (All Sub-projects)

| Model | Estimated Tokens | Task Count | Notes |
|-------|-----------------|------------|-------|
| Gemma (vllm-31b) | ~589k+ | 100+ runs | Reviews, mechanical implementation |
| Claude (opus) | ~30k | 8 actions | Coordination, PR management |
| Claude (sonnet) | ~238k | 47 actions | Reviews, fixes, SP5 lead |
| Claude (haiku) | ~2k | 1 review | Spec compliance check |
| **Total** | **~859k+** | **156+ actions** | **69% Gemma, 28% Claude sonnet, 3% Claude opus** |
