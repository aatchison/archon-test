# Token Usage Tracking

Tracks Claude vs Gemma (opencode) token usage during todo app foundation implementation.

| Task | Model | Approx Tokens | Notes |
|------|-------|---------------|-------|
| Task 1: Scaffold Next.js | Gemma (vllm-31b) | ~5k | Worked but wiped CLAUDE.md, .gitignore; needed Claude fix commit |
| Task 1: Spec review | Claude (haiku) | ~2k | Verified scaffold files |
| Task 1: Code quality review | Claude (sonnet) | ~8k | Found 7 issues (CLAUDE.md, .gitignore, package name, globals.css) |
| Task 1: Fix commit | Claude (sonnet) | ~2k | Fixed all code review issues |
| Task 2: Prisma schema | Gemma (vllm-31b) | ~8k | Handled Prisma 7 migration; replaced enums with strings (correct for SQLite) |
| Task 2: Fix commit | Claude (sonnet) | ~1k | Removed .env from git, added prisma.config.ts |
| Task 3: Jest config | Gemma (vllm-31b) | ~3k | Clean execution, no issues |
| Task 4: Auth.js config | Gemma (vllm-31b) | ~6k | Worked well; minor openssl not found, used node crypto fallback |
| Sub-issue creation | Claude (sonnet) | ~3k | Created #13-#27, linked as sub-issues of #11 |

## Running Totals

| Model | Estimated Tokens | Tasks |
|-------|-----------------|-------|
| Claude (sonnet) | ~14k | Reviews, fixes, coordination |
| Claude (haiku) | ~2k | Spec review |
| Gemma (vllm-31b) | ~22k | Tasks 1-4 implementation |
