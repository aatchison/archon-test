# Todo App — Sub-project 2: Core Task Management Design

**Date:** 2026-04-13
**Issue:** [aatchison/archon-test#28](https://github.com/aatchison/archon-test/issues/28)

## Overview

Sub-project 2 of 5 for the `archon-test` Next.js todo/task manager. Builds on the Foundation (Sub-project 1) to add label management, task editing with priority/due date/labels, and list-level filtering.

**Sub-project roadmap:**
1. Foundation (merged)
2. **Core task management** ← this spec
3. Collaboration (sharing lists, invitations, roles)
4. Real-time (live updates across tabs/users)
5. Search (full-text search, advanced filters)

## Stack (unchanged from Foundation)

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

1. **Label CRUD** — create, edit, delete user-scoped labels (name + hex color)
2. **Task label assignment** — attach/detach labels to tasks via TaskLabel junction table
3. **Priority picker** — set HIGH/MEDIUM/LOW/NONE when creating/editing tasks
4. **Due date picker** — set due dates on tasks
5. **Task editing** — inline edit panel expanding below task row (title, description, priority, due date, labels)
6. **Filtering** — filter tasks within a list by label, priority, due date range, and completion status
7. **Labels settings page** — dedicated `/labels` page to manage all labels

### Out of Scope

- Cross-list views or global task views
- Bulk operations (multi-select tasks)
- Drag-and-drop reordering
- Label-based sorting across lists
- Real-time updates (Sub-project 4)

### Design Decisions

- **User-scoped labels** — each user creates their own labels, usable across all their lists. Matches existing `Label.userId` schema.
- **Predefined color palette** — 10 colors (red, orange, amber, yellow, green, teal, blue, indigo, purple, pink). No free-form hex picker.
- **Filters via URL search params** — shareable, back-button friendly. URL is source of truth for filter state.
- **No schema changes** — Foundation schema already has Label, TaskLabel, priority (string), dueDate fields.

---

## Section 2: Architecture

### New Files

| File | Responsibility |
|------|---------------|
| `actions/labels.ts` | Server Actions: createLabel, updateLabel, deleteLabel, addLabelToTask, removeLabelFromTask |
| `actions/labels.test.ts` | Unit tests for label actions |
| `actions/labels.integration.test.ts` | Integration tests: label CRUD + task assignment round-trip |
| `app/(app)/labels/page.tsx` | Label management page |
| `components/label-badge.tsx` | Colored label pill component |
| `components/label-badge.test.tsx` | Unit tests for LabelBadge |
| `components/label-picker.tsx` | Client: multi-select label picker for task editing |
| `components/task-edit-form.tsx` | Client: expanded inline task editor (title, description, priority, due date, labels) |
| `components/task-filters.tsx` | Client: filter bar (label, priority, due date, status) |
| `components/task-filters.test.tsx` | Unit tests for filter state/URL param management |
| `components/color-picker.tsx` | Simple color palette selector |
| `components/label-form.tsx` | Create/edit label inline form |

### Modified Files

| File | Change |
|------|--------|
| `components/task-item.tsx` | Show label badges, improved priority/due date display, click title to expand edit form |
| `components/sidebar.tsx` | Add "Labels" nav link |
| `app/(app)/lists/[id]/page.tsx` | Add filter bar, parse search params, construct filtered Prisma query |
| `actions/tasks.ts` | Extend `createTask`/`updateTask` to accept `labelIds` array, create/sync TaskLabel records |

---

## Section 3: Server Actions

### `actions/labels.ts`

```ts
createLabel(data: { name: string; color: string }): Promise<Label>
updateLabel(id: string, data: { name?: string; color?: string }): Promise<Label>
deleteLabel(id: string): Promise<void>
addLabelToTask(taskId: string, labelId: string): Promise<void>
removeLabelFromTask(taskId: string, labelId: string): Promise<void>
```

All actions validate auth via `getSession()` and verify ownership (label belongs to user, task belongs to user's list).

`deleteLabel` cascades via the schema — TaskLabel records are automatically removed.

### `actions/tasks.ts` (modified)

Extend `TaskInput` type:

```ts
type TaskInput = {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: Date;
  labelIds?: string[];  // NEW
};
```

`createTask` and `updateTask` handle `labelIds` by:
1. Validating each label belongs to the current user
2. For create: creating TaskLabel records for each labelId
3. For update: diffing current labels vs new labelIds, creating/deleting TaskLabel records as needed

---

## Section 4: UI Components

### Task Item (`task-item.tsx` — modified)

Displays:
- Checkbox (toggleDone)
- Title (click to expand edit form)
- Label badges (colored pills)
- Priority badge (HIGH=red, MEDIUM=amber, LOW=blue, NONE=hidden)
- Due date with relative display: "Today", "Tomorrow", "Overdue" (red text), or formatted date
- Delete button (on hover)

### Task Edit Form (`task-edit-form.tsx` — new)

Inline panel that expands below a task row when clicked. Fields:
- Title input
- Description textarea
- Priority select (NONE / LOW / MEDIUM / HIGH)
- Due date input (native `type="date"`)
- Label picker (multi-select)
- Save / Cancel buttons

Calls `updateTask` on save with all fields including `labelIds`.

### Label Picker (`label-picker.tsx` — new)

Client component. Fetches user's labels, renders as a dropdown of colored badges. Click to toggle selection. Selected labels shown as badges.

### Filter Bar (`task-filters.tsx` — new)

Horizontal bar above task list. Controls:
- **Priority:** select dropdown — Any / HIGH / MEDIUM / LOW
- **Labels:** multi-select dropdown — filter by one or more labels
- **Due date:** select — Any / Overdue / Due today / Due this week
- **Status:** toggle — All / Active / Completed
- **Clear filters** link (visible when any filter active)

Updates URL search params: `?priority=HIGH&label=abc&label=def&due=overdue&status=active`

### Label Management Page (`/labels`)

Grid of label cards. Each card: colored dot + name + edit/delete buttons. "New label" button opens inline form. Delete shows confirmation if label is assigned to tasks.

### Color Picker (`color-picker.tsx` — new)

10 colored circles in a row. Click to select. Selected circle gets a ring indicator.

Colors: `#ef4444` (red), `#f97316` (orange), `#f59e0b` (amber), `#eab308` (yellow), `#22c55e` (green), `#14b8a6` (teal), `#3b82f6` (blue), `#6366f1` (indigo), `#a855f7` (purple), `#ec4899` (pink).

---

## Section 5: Filtering Data Flow

1. User interacts with `TaskFilters` component
2. Component updates URL search params via `useRouter().replace()`
3. Page server component reads `searchParams`
4. Constructs Prisma `where` clause:

```ts
const where: Prisma.TaskWhereInput = { listId: id };

if (priority) where.priority = priority;
if (status === "active") where.done = false;
if (status === "completed") where.done = true;
if (due === "overdue") where.dueDate = { lt: new Date() };
if (due === "today") where.dueDate = { gte: startOfDay, lte: endOfDay };
if (due === "week") where.dueDate = { gte: today, lte: endOfWeek };
if (labelIds.length) where.labels = { some: { labelId: { in: labelIds } } };
```

5. Filtered tasks rendered by existing TaskItem components

---

## Section 6: Testing

### Unit Tests

| File | What's tested |
|------|--------------|
| `actions/labels.test.ts` | createLabel (validation, auth), updateLabel, deleteLabel, addLabelToTask (ownership check), removeLabelFromTask |
| `components/label-badge.test.tsx` | Renders name, applies correct background color |
| `components/task-filters.test.tsx` | Filter changes produce correct URL search params |

### Integration Tests

| File | What's tested |
|------|--------------|
| `actions/labels.integration.test.ts` | Full round-trip: create label → assign to task → verify join → remove from task → delete label |

### Existing Tests

All 30 existing tests (28 unit + 2 integration) must continue to pass. The `TaskInput` type change is backward-compatible (`labelIds` is optional).

---

## Success Criteria

- User can create, edit, and delete labels from `/labels` page
- User can assign/remove labels on tasks via inline edit form
- User can set priority and due date when editing tasks
- Task list shows label badges, priority badge, and formatted due dates
- User can filter tasks by priority, label, due date, and completion status
- Filters persist in URL (shareable, back-button works)
- All existing tests pass + new tests for labels and filters
- `bunx tsc --noEmit` passes with no errors
