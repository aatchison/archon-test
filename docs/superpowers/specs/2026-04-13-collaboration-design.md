# Todo App — Sub-project 3: Collaboration Design

**Date:** 2026-04-13
**Issue:** [aatchison/archon-test#43](https://github.com/aatchison/archon-test/issues/43)

## Overview

Sub-project 3 of 5 for the `archon-test` Next.js todo/task manager. Adds list sharing with role-based access control, member management, and an authorization refactor so all actions respect roles.

**Sub-project roadmap:**
1. Foundation (merged)
2. Core task management (merged)
3. **Collaboration** ← this spec
4. Real-time (live updates across tabs/users)
5. Search (full-text search, advanced filters)

## Stack (unchanged)

- Framework: Next.js 16 (App Router)
- Language: TypeScript
- Auth: Auth.js v5 with Prisma adapter
- Database: SQLite via Prisma 7 + libsql adapter
- Styling: Tailwind CSS
- Formatter: Biome
- Package manager: bun
- Testing: bun:test + happy-dom + @testing-library/react

---

## Section 1: Scope & Features

### In Scope

1. **Share lists** — owner can invite users by email to a list
2. **Role-based access** — OWNER (full control), EDITOR (add/edit/delete tasks), VIEWER (read-only)
3. **Immediate access** — adding a member immediately grants access (no pending/accept flow)
4. **Members management** — owner can view members, change roles, and remove members
5. **Authorization refactor** — replace `ownerId` checks with role-aware helpers
6. **Shared list visibility** — sidebar shows owned lists + lists shared with the user

### Out of Scope

- Invite links or invite codes
- Pending invitations requiring acceptance
- Email notifications (deferred to Sub-project 4)
- Transferring ownership
- Public/anonymous lists

### Design Decisions

- **Email-based invitations** — add by email, user must already have an account. If no account found, show error.
- **No pending flow** — YAGNI. Adding a member immediately grants access.
- **Owner cannot be removed** — only non-owner members can be removed from a list.
- **Role stored as string** — matches existing schema pattern (SQLite, no enums). Values: "OWNER", "EDITOR", "VIEWER".
- **No schema changes** — ListMember model already exists with listId, userId, role fields.

---

## Section 2: Architecture

### New Files

| File | Responsibility |
|------|---------------|
| `lib/authorization.ts` | `canView(listId)`, `canEdit(listId)`, `isOwner(listId)` helpers |
| `lib/authorization.test.ts` | Unit tests for authorization helpers |
| `actions/members.ts` | Server Actions: addMember, removeMember, updateMemberRole |
| `actions/members.test.ts` | Unit tests for member actions |
| `actions/members.integration.test.ts` | Integration tests: member CRUD round-trip |
| `app/(app)/lists/[id]/members/page.tsx` | Members management page |
| `components/member-list.tsx` | List of members with role badges and actions |
| `components/invite-form.tsx` | Add member by email + role selector form |
| `components/role-badge.tsx` | OWNER/EDITOR/VIEWER colored badge |
| `components/role-badge.test.tsx` | Unit tests for RoleBadge |

### Modified Files

| File | Change |
|------|--------|
| `actions/lists.ts` | Replace `ownerId` checks with `isOwner()` for rename/delete |
| `actions/tasks.ts` | Replace ownership checks with `canEdit()` for mutations |
| `actions/labels.ts` | Update task ownership checks to use `canEdit()` |
| `app/(app)/layout.tsx` | Query includes shared lists via ListMember join |
| `app/(app)/lists/[id]/page.tsx` | Use `canView()` instead of owner-only check |
| `app/(app)/lists/[id]/settings/page.tsx` | Add "Members" link, restrict to owner |
| `components/sidebar.tsx` | Show "Shared with me" section below owned lists |

---

## Section 3: Authorization Model

### Helpers (`lib/authorization.ts`)

```ts
canView(listId: string): Promise<boolean>
// Returns true if current user is the list owner OR has any ListMember role

canEdit(listId: string): Promise<boolean>
// Returns true if current user is the list owner OR has EDITOR role

isOwner(listId: string): Promise<boolean>
// Returns true if current user is list.ownerId

requireView(listId: string): Promise<void>
// Throws "Not found" if canView is false

requireEdit(listId: string): Promise<void>
// Throws "Not found" if canEdit is false

requireOwner(listId: string): Promise<void>
// Throws "Not found" if isOwner is false
```

Each helper calls `auth()` internally to get the current session. "Not found" is thrown instead of "Unauthorized" to avoid leaking list existence.

### Permission Matrix

| Action | Owner | Editor | Viewer | Non-member |
|--------|-------|--------|--------|------------|
| View list & tasks | ✓ | ✓ | ✓ | ✗ |
| Create/edit/delete tasks | ✓ | ✓ | ✗ | ✗ |
| Assign labels to tasks | ✓ | ✓ | ✗ | ✗ |
| Rename list | ✓ | ✗ | ✗ | ✗ |
| Delete list | ✓ | ✗ | ✗ | ✗ |
| Manage members | ✓ | ✗ | ✗ | ✗ |
| Add/remove labels (user's own) | ✓ | ✓ | ✓ | ✓ |

---

## Section 4: Server Actions

### `actions/members.ts`

```ts
addMember(listId: string, email: string, role: string): Promise<void>
// Requires: isOwner(listId)
// Validates: role is EDITOR or VIEWER (not OWNER)
// Looks up user by email, throws if not found
// Creates ListMember record
// Revalidates /lists/[id]/members

removeMember(listId: string, userId: string): Promise<void>
// Requires: isOwner(listId)
// Validates: target is not the owner
// Deletes ListMember record
// Revalidates /lists/[id]/members

updateMemberRole(listId: string, userId: string, role: string): Promise<void>
// Requires: isOwner(listId)
// Validates: role is EDITOR or VIEWER, target is not the owner
// Updates ListMember.role
// Revalidates /lists/[id]/members
```

---

## Section 5: UI

### Members Page (`/lists/[id]/members`)

- Requires owner access
- Shows InviteForm at top
- Below: MemberList showing all members (owner first, then alphabetical)
- Each member shows: name/email, RoleBadge, role change dropdown (for non-owners), remove button (for non-owners)

### InviteForm

- Email input + role select (Editor/Viewer) + "Invite" button
- Shows error if email not found or user already a member

### Sidebar Update

Two sections:
- **My Lists** — lists where user is owner (existing)
- **Shared with me** — lists where user is a ListMember but not owner (new)

Both sections show list names as links. Shared lists show a small "shared" indicator.

### Settings Page Update

- Add "Members" link (only visible to owner)

---

## Section 6: Testing

### Unit Tests

| File | What's tested |
|------|--------------|
| `lib/authorization.test.ts` | canView/canEdit/isOwner for owner, editor, viewer, non-member |
| `actions/members.test.ts` | addMember (validation, auth, duplicate), removeMember (ownership, self-removal), updateMemberRole |
| `components/role-badge.test.tsx` | Renders correct text and color for each role |

### Integration Tests

| File | What's tested |
|------|--------------|
| `actions/members.integration.test.ts` | Full round-trip: add member → verify ListMember → change role → verify → remove → verify removed |

### Existing Test Updates

All existing action tests must continue to pass after the authorization refactor. The mocks for `@/lib/auth` remain unchanged since authorization helpers call `auth()` internally.

---

## Success Criteria

- Owner can add members by email with Editor or Viewer role
- Editor can create/edit/delete tasks but cannot rename/delete list or manage members
- Viewer can see tasks but cannot modify anything
- Non-members cannot access the list at all
- Sidebar shows both "My Lists" and "Shared with me" sections
- Owner can change member roles and remove members
- All existing tests pass after authorization refactor
- `bunx tsc --noEmit` passes with no errors
