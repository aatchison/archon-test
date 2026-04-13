# Core Task Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add label management, task editing (priority/due date/labels), and list-level filtering to the todo app foundation.

**Architecture:** New label Server Actions + UI components layered on existing foundation. Labels are user-scoped, task labels use the existing TaskLabel junction table. Filters use URL search params as source of truth, parsed server-side into Prisma where clauses. Inline task editing expands below each task row.

**Tech Stack:** Next.js 16, TypeScript, Prisma 7 + libsql, Tailwind CSS, Biome, bun, bun:test + happy-dom

> 🤖 = suitable for opencode/Gemma  |  🧠 = needs Claude

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `actions/labels.ts` | Server Actions: createLabel, updateLabel, deleteLabel, addLabelToTask, removeLabelFromTask |
| Create | `actions/labels.test.ts` | Unit tests for label actions |
| Create | `actions/labels.integration.test.ts` | Integration tests: label CRUD + task assignment |
| Create | `components/label-badge.tsx` | Colored label pill component |
| Create | `components/label-badge.test.tsx` | Unit tests for LabelBadge |
| Create | `components/color-picker.tsx` | Color palette selector |
| Create | `components/label-form.tsx` | Create/edit label inline form |
| Create | `components/label-picker.tsx` | Multi-select label picker for tasks |
| Create | `components/task-edit-form.tsx` | Inline task editor (title, description, priority, due date, labels) |
| Create | `components/task-filters.tsx` | Filter bar component |
| Create | `components/task-filters.test.tsx` | Unit tests for filter URL param logic |
| Create | `app/(app)/labels/page.tsx` | Label management page |
| Create | `lib/filters.ts` | Filter parsing + Prisma where clause builder |
| Modify | `actions/tasks.ts` | Extend createTask/updateTask with labelIds |
| Modify | `components/task-item.tsx` | Add label badges, improved display, click-to-edit |
| Modify | `components/sidebar.tsx` | Add "Labels" nav link |
| Modify | `app/(app)/lists/[id]/page.tsx` | Add filter bar, filtered query, search params |

---

### Task 1: Label Server Actions 🧠

**Files:**
- Create: `actions/labels.ts`

- [ ] **Step 1: Create actions/labels.ts**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}

export async function createLabel(data: { name: string; color: string }) {
  const session = await getSession();
  if (!data.name.trim()) throw new Error("Name is required");
  const label = await db.label.create({
    data: { name: data.name.trim(), color: data.color, userId: session.user.id },
  });
  revalidatePath("/labels");
  return label;
}

export async function updateLabel(id: string, data: { name?: string; color?: string }) {
  const session = await getSession();
  const label = await db.label.findUnique({ where: { id } });
  if (!label || label.userId !== session.user.id) throw new Error("Not found");
  if (data.name !== undefined && !data.name.trim()) throw new Error("Name is required");
  const updated = await db.label.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
    },
  });
  revalidatePath("/labels");
  return updated;
}

export async function deleteLabel(id: string) {
  const session = await getSession();
  const label = await db.label.findUnique({ where: { id } });
  if (!label || label.userId !== session.user.id) throw new Error("Not found");
  await db.label.delete({ where: { id } });
  revalidatePath("/labels");
}

export async function addLabelToTask(taskId: string, labelId: string) {
  const session = await getSession();
  const task = await db.task.findUnique({ where: { id: taskId }, include: { list: true } });
  if (!task || task.list.ownerId !== session.user.id) throw new Error("Not found");
  const label = await db.label.findUnique({ where: { id: labelId } });
  if (!label || label.userId !== session.user.id) throw new Error("Not found");
  await db.taskLabel.create({ data: { taskId, labelId } });
  revalidatePath(`/lists/${task.listId}`);
}

export async function removeLabelFromTask(taskId: string, labelId: string) {
  const session = await getSession();
  const task = await db.task.findUnique({ where: { id: taskId }, include: { list: true } });
  if (!task || task.list.ownerId !== session.user.id) throw new Error("Not found");
  await db.taskLabel.delete({ where: { taskId_labelId: { taskId, labelId } } });
  revalidatePath(`/lists/${task.listId}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/labels.ts
git commit -m "feat: add label Server Actions (CRUD + task assignment)"
```

---

### Task 2: Label action unit tests 🧠

**Files:**
- Create: `actions/labels.test.ts`

- [ ] **Step 1: Write tests**

```ts
// @ts-nocheck
import { mock, describe, it, expect, beforeEach, spyOn } from "bun:test";

mock.module("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "user-1" } }),
}));

const mockLabelCreate = spyOn({ fn: async () => ({}) }, "fn");
const mockLabelFindUnique = spyOn({ fn: async () => ({}) }, "fn");
const mockLabelUpdate = spyOn({ fn: async () => ({}) }, "fn");
const mockLabelDelete = spyOn({ fn: async () => ({}) }, "fn");
const mockTaskFindUnique = spyOn({ fn: async () => ({}) }, "fn");
const mockTaskLabelCreate = spyOn({ fn: async () => ({}) }, "fn");
const mockTaskLabelDelete = spyOn({ fn: async () => ({}) }, "fn");

mock.module("@/lib/db", () => ({
  db: {
    label: {
      create: (...args: unknown[]) => mockLabelCreate(...args),
      findUnique: (...args: unknown[]) => mockLabelFindUnique(...args),
      update: (...args: unknown[]) => mockLabelUpdate(...args),
      delete: (...args: unknown[]) => mockLabelDelete(...args),
    },
    task: {
      findUnique: (...args: unknown[]) => mockTaskFindUnique(...args),
    },
    taskLabel: {
      create: (...args: unknown[]) => mockTaskLabelCreate(...args),
      delete: (...args: unknown[]) => mockTaskLabelDelete(...args),
    },
  },
}));
mock.module("next/cache", () => ({ revalidatePath: () => {} }));

const { createLabel, updateLabel, deleteLabel, addLabelToTask, removeLabelFromTask } = await import("./labels");

const mockLabel = { id: "lb1", name: "Work", color: "#3b82f6", userId: "user-1" };
const mockTask = { id: "t1", listId: "l1", list: { id: "l1", ownerId: "user-1" } };

describe("createLabel", () => {
  beforeEach(() => { mockLabelCreate.mockReset(); });

  it("throws if name is empty", async () => {
    await expect(createLabel({ name: "", color: "#fff" })).rejects.toThrow("Name is required");
  });

  it("creates and returns a label", async () => {
    mockLabelCreate.mockResolvedValue(mockLabel);
    const result = await createLabel({ name: "Work", color: "#3b82f6" });
    expect(result.name).toBe("Work");
  });
});

describe("updateLabel", () => {
  beforeEach(() => { mockLabelFindUnique.mockReset(); mockLabelUpdate.mockReset(); });

  it("throws Not found if label belongs to another user", async () => {
    mockLabelFindUnique.mockResolvedValue({ ...mockLabel, userId: "other" });
    await expect(updateLabel("lb1", { name: "New" })).rejects.toThrow("Not found");
  });

  it("updates the label", async () => {
    mockLabelFindUnique.mockResolvedValue(mockLabel);
    mockLabelUpdate.mockResolvedValue({ ...mockLabel, name: "Personal" });
    const result = await updateLabel("lb1", { name: "Personal" });
    expect(result.name).toBe("Personal");
  });
});

describe("deleteLabel", () => {
  beforeEach(() => { mockLabelFindUnique.mockReset(); mockLabelDelete.mockReset(); });

  it("throws Not found if label belongs to another user", async () => {
    mockLabelFindUnique.mockResolvedValue({ ...mockLabel, userId: "other" });
    await expect(deleteLabel("lb1")).rejects.toThrow("Not found");
  });

  it("deletes the label", async () => {
    mockLabelFindUnique.mockResolvedValue(mockLabel);
    mockLabelDelete.mockResolvedValue({});
    await deleteLabel("lb1");
    expect(mockLabelDelete).toHaveBeenCalledWith({ where: { id: "lb1" } });
  });
});

describe("addLabelToTask", () => {
  beforeEach(() => { mockTaskFindUnique.mockReset(); mockLabelFindUnique.mockReset(); mockTaskLabelCreate.mockReset(); });

  it("throws Not found if task belongs to another user", async () => {
    mockTaskFindUnique.mockResolvedValue({ ...mockTask, list: { id: "l1", ownerId: "other" } });
    await expect(addLabelToTask("t1", "lb1")).rejects.toThrow("Not found");
  });

  it("creates the task-label association", async () => {
    mockTaskFindUnique.mockResolvedValue(mockTask);
    mockLabelFindUnique.mockResolvedValue(mockLabel);
    mockTaskLabelCreate.mockResolvedValue({});
    await addLabelToTask("t1", "lb1");
    expect(mockTaskLabelCreate).toHaveBeenCalledWith({ data: { taskId: "t1", labelId: "lb1" } });
  });
});

describe("removeLabelFromTask", () => {
  beforeEach(() => { mockTaskFindUnique.mockReset(); mockTaskLabelDelete.mockReset(); });

  it("removes the task-label association", async () => {
    mockTaskFindUnique.mockResolvedValue(mockTask);
    mockTaskLabelDelete.mockResolvedValue({});
    await removeLabelFromTask("t1", "lb1");
    expect(mockTaskLabelDelete).toHaveBeenCalledWith({ where: { taskId_labelId: { taskId: "t1", labelId: "lb1" } } });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
devcontainer exec --workspace-folder . bun test actions/labels.test.ts
```

Expected: PASS — 8 tests.

- [ ] **Step 3: Commit**

```bash
git add actions/labels.test.ts
git commit -m "test: add label Server Action unit tests"
```

---

### Task 3: LabelBadge component + tests 🤖

**Files:**
- Create: `components/label-badge.tsx`
- Create: `components/label-badge.test.tsx`

- [ ] **Step 1: Create components/label-badge.tsx**

```tsx
type Props = {
  name: string;
  color: string;
  onRemove?: () => void;
};

export function LabelBadge({ name, color, onRemove }: Props) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white font-medium"
      style={{ backgroundColor: color }}
    >
      {name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:opacity-70 ml-0.5"
          aria-label={`Remove ${name} label`}
        >
          ×
        </button>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Create components/label-badge.test.tsx**

```tsx
import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { LabelBadge } from "./label-badge";

afterEach(cleanup);

describe("LabelBadge", () => {
  it("renders the label name", () => {
    render(<LabelBadge name="Work" color="#3b82f6" />);
    expect(screen.getByText("Work")).toBeTruthy();
  });

  it("applies the color as background", () => {
    render(<LabelBadge name="Work" color="#3b82f6" />);
    const el = screen.getByText("Work").closest("span");
    expect(el?.style.backgroundColor).toBe("#3b82f6");
  });

  it("shows remove button when onRemove provided", () => {
    render(<LabelBadge name="Work" color="#3b82f6" onRemove={() => {}} />);
    expect(screen.getByLabelText("Remove Work label")).toBeTruthy();
  });

  it("hides remove button when no onRemove", () => {
    render(<LabelBadge name="Work" color="#3b82f6" />);
    expect(screen.queryByLabelText("Remove Work label")).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
devcontainer exec --workspace-folder . bun test components/label-badge.test.tsx
```

Expected: PASS — 4 tests.

- [ ] **Step 4: Commit**

```bash
git add components/label-badge.tsx components/label-badge.test.tsx
git commit -m "feat: add LabelBadge component with tests"
```

---

### Task 4: ColorPicker + LabelForm components 🤖

**Files:**
- Create: `components/color-picker.tsx`
- Create: `components/label-form.tsx`

- [ ] **Step 1: Create components/color-picker.tsx**

```tsx
"use client";

const COLORS = [
  { name: "Red", hex: "#ef4444" },
  { name: "Orange", hex: "#f97316" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Green", hex: "#22c55e" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Indigo", hex: "#6366f1" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Pink", hex: "#ec4899" },
];

export { COLORS };

export function ColorPicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (color: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {COLORS.map((c) => (
        <button
          key={c.hex}
          type="button"
          onClick={() => onSelect(c.hex)}
          className={`w-6 h-6 rounded-full border-2 ${
            selected === c.hex ? "border-gray-900 ring-2 ring-offset-1 ring-gray-400" : "border-transparent"
          }`}
          style={{ backgroundColor: c.hex }}
          aria-label={c.name}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create components/label-form.tsx**

```tsx
"use client";

import { useState } from "react";
import { createLabel, updateLabel } from "@/actions/labels";
import { ColorPicker, COLORS } from "./color-picker";

type Props = {
  label?: { id: string; name: string; color: string };
  onDone?: () => void;
};

export function LabelForm({ label, onDone }: Props) {
  const [name, setName] = useState(label?.name ?? "");
  const [color, setColor] = useState(label?.color ?? COLORS[6].hex);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    if (label) {
      await updateLabel(label.id, { name: name.trim(), color });
    } else {
      await createLabel({ name: name.trim(), color });
    }
    setName("");
    setColor(COLORS[6].hex);
    setLoading(false);
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Label name"
        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <ColorPicker selected={color} onSelect={setColor} />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving…" : label ? "Update" : "Create"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="text-sm text-gray-500 hover:text-gray-900">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/color-picker.tsx components/label-form.tsx
git commit -m "feat: add ColorPicker and LabelForm components"
```

---

### Task 5: Labels management page 🤖

**Files:**
- Create: `app/(app)/labels/page.tsx`
- Modify: `components/sidebar.tsx`

- [ ] **Step 1: Create app/(app)/labels/page.tsx**

Server component that fetches user's labels, renders a grid of label cards with edit/delete actions, and a "New label" button that shows the LabelForm.

The page should:
- Call auth(), redirect if no session
- Fetch labels via db.label.findMany({ where: { userId }, orderBy: { name: "asc" } })
- Include _count of tasks for each label (to show in delete confirmation)
- Render LabelForm for creating new labels
- Render each label as a card with LabelBadge, edit button, delete form

- [ ] **Step 2: Add "Labels" link to sidebar.tsx**

Add a Link to `/labels` in the sidebar nav, between "All lists" and the list items.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/labels/page.tsx" components/sidebar.tsx
git commit -m "feat: add labels management page and sidebar link"
```

---

### Task 6: LabelPicker component 🤖

**Files:**
- Create: `components/label-picker.tsx`

- [ ] **Step 1: Create components/label-picker.tsx**

Client component that:
- Takes props: `labels` (all user labels), `selectedIds` (currently selected label IDs), `onChange` (callback with new selectedIds array)
- Renders as a dropdown/popover with colored label badges
- Click a label to toggle its selection
- Shows selected labels as LabelBadge pills above the dropdown

```tsx
"use client";

import { useState } from "react";
import { LabelBadge } from "./label-badge";

type Label = { id: string; name: string; color: string };

type Props = {
  labels: Label[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function LabelPicker({ labels, selectedIds, onChange }: Props) {
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  const selected = labels.filter((l) => selectedIds.includes(l.id));

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 mb-1">
        {selected.map((l) => (
          <LabelBadge key={l.id} name={l.name} color={l.color} onRemove={() => toggle(l.id)} />
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-sm text-blue-600 hover:underline"
      >
        {open ? "Close" : selectedIds.length ? "Edit labels" : "Add labels"}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 bg-white border rounded-md shadow-lg p-2 w-48">
          {labels.length === 0 && <p className="text-xs text-gray-400">No labels created</p>}
          {labels.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => toggle(l.id)}
              className={`flex items-center gap-2 w-full px-2 py-1 rounded text-sm text-left hover:bg-gray-50 ${
                selectedIds.includes(l.id) ? "bg-gray-100" : ""
              }`}
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
              {l.name}
              {selectedIds.includes(l.id) && <span className="ml-auto text-blue-600">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/label-picker.tsx
git commit -m "feat: add LabelPicker multi-select component"
```

---

### Task 7: Task edit form 🧠

**Files:**
- Create: `components/task-edit-form.tsx`

- [ ] **Step 1: Create components/task-edit-form.tsx**

Client component for inline task editing. Takes the task data + user's labels. Fields: title input, description textarea, priority select, due date input, label picker. Calls updateTask + addLabelToTask/removeLabelFromTask on save.

```tsx
"use client";

import { useState } from "react";
import { updateTask } from "@/actions/tasks";
import { addLabelToTask, removeLabelFromTask } from "@/actions/labels";
import { LabelPicker } from "./label-picker";

type Label = { id: string; name: string; color: string };
type TaskData = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  listId: string;
  labels: { labelId: string }[];
};

type Props = {
  task: TaskData;
  allLabels: Label[];
  onClose: () => void;
};

export function TaskEditForm({ task, allLabels, onClose }: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [labelIds, setLabelIds] = useState(task.labels.map((l) => l.labelId));
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setLoading(true);

    await updateTask(task.id, {
      title: title.trim(),
      description: description || undefined,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    const currentLabelIds = task.labels.map((l) => l.labelId);
    const toAdd = labelIds.filter((id) => !currentLabelIds.includes(id));
    const toRemove = currentLabelIds.filter((id) => !labelIds.includes(id));
    for (const id of toAdd) await addLabelToTask(task.id, id);
    for (const id of toRemove) await removeLabelFromTask(task.id, id);

    setLoading(false);
    onClose();
  }

  return (
    <div className="p-3 bg-gray-50 border rounded-md mt-1 space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm"
          >
            <option value="NONE">None</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Labels</label>
        <LabelPicker labels={allLabels} selectedIds={labelIds} onChange={setLabelIds} />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading || !title.trim()}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save"}
        </button>
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-900">
          Cancel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/task-edit-form.tsx
git commit -m "feat: add TaskEditForm inline editor component"
```

---

### Task 8: Update TaskItem with labels, edit, and due date display 🧠

**Files:**
- Modify: `components/task-item.tsx`

- [ ] **Step 1: Rewrite components/task-item.tsx**

Update to:
- Accept labels and allLabels props
- Show LabelBadge for each assigned label
- Click title to toggle inline TaskEditForm
- Format due date as relative text (Today, Tomorrow, Overdue)
- Use client state for editing toggle

The component should import and render TaskEditForm when editing is active, and LabelBadge for each label.

- [ ] **Step 2: Commit**

```bash
git add components/task-item.tsx
git commit -m "feat: update TaskItem with labels, inline edit, and due date display"
```

---

### Task 9: Filter utilities 🧠

**Files:**
- Create: `lib/filters.ts`

- [ ] **Step 1: Create lib/filters.ts**

```ts
type FilterParams = {
  priority?: string;
  label?: string | string[];
  due?: string;
  status?: string;
};

export function buildTaskWhere(listId: string, params: FilterParams) {
  const where: Record<string, unknown> = { listId };

  if (params.priority && params.priority !== "any") {
    where.priority = params.priority;
  }

  if (params.status === "active") where.done = false;
  else if (params.status === "completed") where.done = true;

  if (params.due) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
    const endOfWeek = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (params.due === "overdue") where.dueDate = { lt: now, not: null };
    else if (params.due === "today") where.dueDate = { gte: startOfDay, lte: endOfDay };
    else if (params.due === "week") where.dueDate = { gte: startOfDay, lte: endOfWeek };
  }

  const labelIds = Array.isArray(params.label) ? params.label : params.label ? [params.label] : [];
  if (labelIds.length > 0) {
    where.labels = { some: { labelId: { in: labelIds } } };
  }

  return where;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/filters.ts
git commit -m "feat: add filter URL param parser and Prisma where builder"
```

---

### Task 10: TaskFilters component + tests 🧠

**Files:**
- Create: `components/task-filters.tsx`
- Create: `components/task-filters.test.tsx`

- [ ] **Step 1: Create components/task-filters.tsx**

Client component that reads current URL search params and renders filter controls. Updates URL via `useRouter().replace()` when filters change.

Controls: priority select, label multi-select, due date preset select, status toggle, clear filters link.

- [ ] **Step 2: Create components/task-filters.test.tsx**

Test that filter state changes produce correct URL search params.

- [ ] **Step 3: Run tests**

```bash
devcontainer exec --workspace-folder . bun test components/task-filters.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add components/task-filters.tsx components/task-filters.test.tsx
git commit -m "feat: add TaskFilters component with URL param management"
```

---

### Task 11: Update list page with filters 🧠

**Files:**
- Modify: `app/(app)/lists/[id]/page.tsx`

- [ ] **Step 1: Update list page**

Modify to:
- Accept `searchParams` prop
- Import and use `buildTaskWhere` from `lib/filters.ts`
- Fetch user's labels for filter bar and task edit forms
- Include task labels in the query (`include: { labels: { include: { label: true } } }`)
- Render `TaskFilters` above task list
- Pass labels to TaskItem components

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/lists/[id]/page.tsx"
git commit -m "feat: add filtering to list page with search params"
```

---

### Task 12: Label integration tests 🧠

**Files:**
- Create: `actions/labels.integration.test.ts`

- [ ] **Step 1: Write integration tests**

Test full round-trip against real test.db:
- Create label → verify in DB
- Assign label to task → verify TaskLabel join
- Remove label from task → verify removal
- Delete label → verify cascade removes TaskLabel records

Pattern: same as existing integration tests (INTEGRATION_TEST=1 flag, execFileSync prisma migrate reset, PrismaLibSql adapter).

- [ ] **Step 2: Run integration tests**

```bash
devcontainer exec --workspace-folder . bash -c 'INTEGRATION_TEST=1 DATABASE_URL=file:test.db bun test actions/labels.integration.test.ts'
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add actions/labels.integration.test.ts
git commit -m "test: add label integration tests"
```

---

### Task 13: Full test suite + build verification 🧠

- [ ] **Step 1: Run all unit tests**

```bash
devcontainer exec --workspace-folder . bun run test
```

Expected: All unit tests pass (existing 28 + new label/component tests).

- [ ] **Step 2: Run all integration tests**

```bash
devcontainer exec --workspace-folder . bun run test:integration
```

Expected: All integration tests pass (existing 2 + new label integration).

- [ ] **Step 3: TypeScript check**

```bash
devcontainer exec --workspace-folder . bunx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Update test script in package.json**

Add new test files to the unit test command.

- [ ] **Step 5: Push and update PR**

```bash
git push -u origin feat/core-task-management
gh pr create --title "feat: core task management (sub-project 2 of 5)" \
  --base main \
  --body "Implements core task management features.

- Labels: CRUD, color picker, assignment to tasks
- Task editing: inline edit form with priority, due date, labels, description
- Filtering: filter by priority, label, due date, status via URL params
- Tests: unit + integration tests for labels, components, filters

Closes #28"
```

