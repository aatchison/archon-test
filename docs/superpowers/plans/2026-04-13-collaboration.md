# Collaboration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add list sharing with role-based access control (Owner/Editor/Viewer), member management, and refactor all actions to use authorization helpers instead of direct ownerId checks.

**Architecture:** New `lib/authorization.ts` provides `requireView`, `requireEdit`, `requireOwner` helpers that check both list ownership and ListMember roles. All existing Server Actions are refactored to use these. New `actions/members.ts` handles adding/removing/updating members. Sidebar updated to show shared lists.

**Tech Stack:** Next.js 16, TypeScript, Prisma 7 + libsql, Tailwind CSS, Biome, bun, bun:test + happy-dom

> 🤖 = suitable for opencode/Gemma  |  🧠 = needs Claude

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `lib/authorization.ts` | canView, canEdit, isOwner, requireView, requireEdit, requireOwner |
| Create | `lib/authorization.test.ts` | Unit tests for authorization helpers |
| Create | `actions/members.ts` | addMember, removeMember, updateMemberRole |
| Create | `actions/members.test.ts` | Unit tests for member actions |
| Create | `actions/members.integration.test.ts` | Integration tests |
| Create | `components/role-badge.tsx` | OWNER/EDITOR/VIEWER colored badge |
| Create | `components/role-badge.test.tsx` | Unit tests for RoleBadge |
| Create | `components/invite-form.tsx` | Add member by email form |
| Create | `components/member-list.tsx` | List of members with actions |
| Create | `app/(app)/lists/[id]/members/page.tsx` | Members management page |
| Modify | `actions/lists.ts` | Use requireOwner for rename/delete, requireEdit for create |
| Modify | `actions/tasks.ts` | Use requireEdit for mutations |
| Modify | `actions/labels.ts` | Use requireEdit for task-label mutations |
| Modify | `app/(app)/layout.tsx` | Query shared lists for sidebar |
| Modify | `app/(app)/lists/[id]/page.tsx` | Use canView, pass role info |
| Modify | `app/(app)/lists/[id]/settings/page.tsx` | Add members link, restrict to owner |
| Modify | `components/sidebar.tsx` | Show "Shared with me" section |

---

### Task 1: Authorization helpers 🧠

**Files:**
- Create: `lib/authorization.ts`

- [ ] **Step 1: Create lib/authorization.ts**

```ts
import { auth } from "./auth";
import { db } from "./db";

async function getCurrentUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function isOwner(listId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  const list = await db.list.findUnique({ where: { id: listId }, select: { ownerId: true } });
  return list?.ownerId === userId;
}

export async function canEdit(listId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  const list = await db.list.findUnique({ where: { id: listId }, select: { ownerId: true } });
  if (list?.ownerId === userId) return true;
  const member = await db.listMember.findUnique({
    where: { listId_userId: { listId, userId } },
  });
  return member?.role === "EDITOR";
}

export async function canView(listId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  const list = await db.list.findUnique({ where: { id: listId }, select: { ownerId: true } });
  if (list?.ownerId === userId) return true;
  const member = await db.listMember.findUnique({
    where: { listId_userId: { listId, userId } },
  });
  return member !== null;
}

export async function requireOwner(listId: string): Promise<string> {
  const userId = await getCurrentUserId();
  const list = await db.list.findUnique({ where: { id: listId }, select: { ownerId: true } });
  if (list?.ownerId !== userId) throw new Error("Not found");
  return userId;
}

export async function requireEdit(listId: string): Promise<string> {
  const allowed = await canEdit(listId);
  if (!allowed) throw new Error("Not found");
  return await getCurrentUserId();
}

export async function requireView(listId: string): Promise<string> {
  const allowed = await canView(listId);
  if (!allowed) throw new Error("Not found");
  return await getCurrentUserId();
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/authorization.ts
git commit -m "feat: add role-based authorization helpers"
```

---

### Task 2: Authorization unit tests 🧠

**Files:**
- Create: `lib/authorization.test.ts`

- [ ] **Step 1: Write tests**

Test all 6 functions for 4 scenarios each: owner, editor member, viewer member, non-member.

Mock `@/lib/auth` to return a test user, mock `@/lib/db` with list.findUnique and listMember.findUnique returning appropriate data for each scenario.

Tests:
- isOwner: true for owner, false for editor/viewer/non-member
- canEdit: true for owner and editor, false for viewer and non-member
- canView: true for owner/editor/viewer, false for non-member
- requireOwner: resolves for owner, throws for others
- requireEdit: resolves for owner/editor, throws for viewer/non-member
- requireView: resolves for owner/editor/viewer, throws for non-member

- [ ] **Step 2: Run tests**

```bash
devcontainer exec --workspace-folder . bun test lib/authorization.test.ts
```

Expected: PASS — 12+ tests.

- [ ] **Step 3: Commit**

```bash
git add lib/authorization.test.ts
git commit -m "test: add authorization helper unit tests"
```

---

### Task 3: Refactor lists actions 🧠

**Files:**
- Modify: `actions/lists.ts`

- [ ] **Step 1: Refactor actions/lists.ts**

Replace the local `getSession` function and `ownerId` checks:

- `createList`: keep getSession (needs userId for ownerId field), no authorization change needed
- `renameList`: replace `getSession` + `findUnique` + `ownerId` check with `await requireOwner(id)`
- `deleteList`: replace `getSession` + `findUnique` + `ownerId` check with `await requireOwner(id)`

Import `requireOwner` from `@/lib/authorization`.

Keep the local `getSession` only for `createList` which needs `session.user.id` to set ownerId.

- [ ] **Step 2: Run existing tests**

```bash
devcontainer exec --workspace-folder . bun test actions/lists.test.ts
```

Expected: PASS — all 6 existing tests still pass (mocks cover the new imports).

- [ ] **Step 3: Commit**

```bash
git add actions/lists.ts
git commit -m "refactor: use requireOwner in list actions"
```

---

### Task 4: Refactor tasks actions 🧠

**Files:**
- Modify: `actions/tasks.ts`

- [ ] **Step 1: Refactor actions/tasks.ts**

Replace ownership checks with authorization helpers:

- `createTask`: replace `getSession` + list ownership check with `await requireEdit(listId)`
- `updateTask`: replace `getSession` + task.list.ownerId check with `await requireEdit(task.listId)` (still need to fetch task first for listId)
- `deleteTask`: same pattern as updateTask
- `toggleDone`: same pattern as updateTask

Import `requireEdit` from `@/lib/authorization`.

Remove the local `getSession` function (no longer needed).

- [ ] **Step 2: Run existing tests**

```bash
devcontainer exec --workspace-folder . bun test actions/tasks.test.ts
```

Expected: PASS — all 7 existing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add actions/tasks.ts
git commit -m "refactor: use requireEdit in task actions"
```

---

### Task 5: Refactor labels actions 🧠

**Files:**
- Modify: `actions/labels.ts`

- [ ] **Step 1: Refactor actions/labels.ts**

For task-label mutations (`addLabelToTask`, `removeLabelFromTask`):
- Replace `getSession` + task.list.ownerId check with `await requireEdit(task.listId)`
- Still need to fetch task first to get listId
- Still check label ownership separately (labels are user-scoped, not list-scoped)

Keep `getSession` for label CRUD (createLabel, updateLabel, deleteLabel) since those check `label.userId`.

Import `requireEdit` from `@/lib/authorization`.

- [ ] **Step 2: Run existing tests**

```bash
devcontainer exec --workspace-folder . bun test actions/labels.test.ts
```

Expected: PASS — all 9 existing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add actions/labels.ts
git commit -m "refactor: use requireEdit in label-task actions"
```

---

### Task 6: Member Server Actions 🧠

**Files:**
- Create: `actions/members.ts`

- [ ] **Step 1: Create actions/members.ts**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/authorization";

export async function addMember(listId: string, email: string, role: string) {
  await requireOwner(listId);
  if (!email?.trim()) throw new Error("Email is required");
  if (role !== "EDITOR" && role !== "VIEWER") throw new Error("Invalid role");

  const targetUser = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!targetUser) throw new Error("User not found");

  const existing = await db.listMember.findUnique({
    where: { listId_userId: { listId, userId: targetUser.id } },
  });
  if (existing) throw new Error("User is already a member");

  const list = await db.list.findUnique({ where: { id: listId }, select: { ownerId: true } });
  if (list?.ownerId === targetUser.id) throw new Error("Cannot add owner as member");

  await db.listMember.create({ data: { listId, userId: targetUser.id, role } });
  revalidatePath(`/lists/${listId}/members`);
}

export async function removeMember(listId: string, userId: string) {
  await requireOwner(listId);
  const list = await db.list.findUnique({ where: { id: listId }, select: { ownerId: true } });
  if (list?.ownerId === userId) throw new Error("Cannot remove owner");

  await db.listMember.delete({ where: { listId_userId: { listId, userId } } });
  revalidatePath(`/lists/${listId}/members`);
}

export async function updateMemberRole(listId: string, userId: string, role: string) {
  await requireOwner(listId);
  if (role !== "EDITOR" && role !== "VIEWER") throw new Error("Invalid role");

  const list = await db.list.findUnique({ where: { id: listId }, select: { ownerId: true } });
  if (list?.ownerId === userId) throw new Error("Cannot change owner role");

  await db.listMember.update({
    where: { listId_userId: { listId, userId } },
    data: { role },
  });
  revalidatePath(`/lists/${listId}/members`);
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/members.ts
git commit -m "feat: add member Server Actions (add, remove, update role)"
```

---

### Task 7: Member action unit tests 🧠

**Files:**
- Create: `actions/members.test.ts`

- [ ] **Step 1: Write tests**

Test addMember, removeMember, updateMemberRole with mocked auth, db, and authorization.

Tests:
- addMember: throws if email empty, throws if invalid role, throws if user not found, throws if already member, throws if target is owner, creates member
- removeMember: throws if target is owner, deletes member
- updateMemberRole: throws if invalid role, throws if target is owner, updates role

- [ ] **Step 2: Run tests**

```bash
devcontainer exec --workspace-folder . bun test actions/members.test.ts
```

Expected: PASS — 9+ tests.

- [ ] **Step 3: Commit**

```bash
git add actions/members.test.ts
git commit -m "test: add member Server Action unit tests"
```

---

### Task 8: RoleBadge component + tests 🤖

**Files:**
- Create: `components/role-badge.tsx`
- Create: `components/role-badge.test.tsx`

- [ ] **Step 1: Create components/role-badge.tsx**

Simple component that renders a colored badge for OWNER (purple), EDITOR (blue), VIEWER (gray).

- [ ] **Step 2: Create components/role-badge.test.tsx**

3 tests: renders correct text and color for each role.

- [ ] **Step 3: Run tests**

```bash
devcontainer exec --workspace-folder . bun test components/role-badge.test.tsx
```

Expected: PASS — 3 tests.

- [ ] **Step 4: Commit**

```bash
git add components/role-badge.tsx components/role-badge.test.tsx
git commit -m "feat: add RoleBadge component with tests"
```

---

### Task 9: InviteForm + MemberList components 🤖

**Files:**
- Create: `components/invite-form.tsx`
- Create: `components/member-list.tsx`

- [ ] **Step 1: Create components/invite-form.tsx**

Client component with email input, role select (Editor/Viewer), and Invite button. Calls addMember from @/actions/members on submit.

- [ ] **Step 2: Create components/member-list.tsx**

Component that renders a list of members. Each member shows: name/email, RoleBadge, and for non-owners: role change dropdown + remove button. Owner is listed first with no actions.

Props: members array, listId, isOwner boolean.

- [ ] **Step 3: Commit**

```bash
git add components/invite-form.tsx components/member-list.tsx
git commit -m "feat: add InviteForm and MemberList components"
```

---

### Task 10: Members management page 🤖

**Files:**
- Create: `app/(app)/lists/[id]/members/page.tsx`
- Modify: `app/(app)/lists/[id]/settings/page.tsx`

- [ ] **Step 1: Create members page**

Server component at app/(app)/lists/[id]/members/page.tsx:
- Call auth(), check isOwner (only owner can access this page)
- Fetch list with members (include user data: name, email)
- Render InviteForm + MemberList
- Include the owner as first "member" in the display

- [ ] **Step 2: Add members link to settings page**

Add a Link to `/lists/[id]/members` in the settings page, visible only to owner.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/lists/[id]/members/page.tsx" "app/(app)/lists/[id]/settings/page.tsx"
git commit -m "feat: add members management page and settings link"
```

---

### Task 11: Update sidebar for shared lists 🧠

**Files:**
- Modify: `app/(app)/layout.tsx`
- Modify: `components/sidebar.tsx`

- [ ] **Step 1: Update layout query**

In app/(app)/layout.tsx, add a second query for shared lists:
```ts
const sharedLists = await db.listMember.findMany({
  where: { userId: session.user.id },
  include: { list: { select: { id: true, name: true } } },
  orderBy: { list: { createdAt: "desc" } },
});
```

Pass both `lists` (owned) and `sharedLists` to Sidebar.

- [ ] **Step 2: Update sidebar**

Add "Shared with me" section below owned lists. Show each shared list as a link with a small indicator.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/layout.tsx" components/sidebar.tsx
git commit -m "feat: show shared lists in sidebar"
```

---

### Task 12: Update list page for role-aware access 🧠

**Files:**
- Modify: `app/(app)/lists/[id]/page.tsx`

- [ ] **Step 1: Update list page**

Replace the owner-only check with canView:
- Import canView, canEdit from @/lib/authorization
- Check canView before rendering (throw notFound if false)
- Check canEdit to conditionally show/hide the TaskForm and edit controls
- Pass `canEditList` boolean to TaskItem to show/hide edit and delete buttons

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/lists/[id]/page.tsx"
git commit -m "feat: role-aware list page access"
```

---

### Task 13: Member integration tests 🧠

**Files:**
- Create: `actions/members.integration.test.ts`

- [ ] **Step 1: Write integration tests**

Test full round-trip against real test.db:
- Create two users (owner + invitee)
- Owner creates a list
- Owner adds invitee as EDITOR
- Verify ListMember exists with EDITOR role
- Owner changes role to VIEWER
- Verify role updated
- Owner removes member
- Verify ListMember deleted

- [ ] **Step 2: Run integration tests**

```bash
devcontainer exec --workspace-folder . bash -c 'INTEGRATION_TEST=1 DATABASE_URL=file:test.db bun test actions/members.integration.test.ts'
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add actions/members.integration.test.ts
git commit -m "test: add member management integration tests"
```

---

### Task 14: Build verification + PR 🧠

- [ ] **Step 1: Run all unit tests**

```bash
devcontainer exec --workspace-folder . bun run test
```

- [ ] **Step 2: Run all integration tests**

```bash
devcontainer exec --workspace-folder . bun run test:integration
```

- [ ] **Step 3: TypeScript check**

```bash
devcontainer exec --workspace-folder . bunx tsc --noEmit
```

- [ ] **Step 4: Dev server + build**

```bash
devcontainer exec --workspace-folder . bash -c 'timeout 15 bun run dev 2>&1 | head -10'
devcontainer exec --workspace-folder . bun run build
```

- [ ] **Step 5: Update test script and token usage**

Add new test files to package.json test command. Update docs/token-usage.md.

- [ ] **Step 6: Run 10 rounds of Gemma reviews (fix between rounds)**

Run Gemma 10-perspective review, fix findings, repeat until convergence.

- [ ] **Step 7: Push and open PR**

```bash
git push -u origin feat/collaboration
gh pr create --title "feat: collaboration — sharing, roles, members (sub-project 3 of 5)" \
  --base main \
  --body "..." 
```

- [ ] **Step 8: Mark ready, watch for comments, address and reply**

