# Todo App — Sub-project 1: Foundation Design

**Date:** 2026-04-13

## Overview

This is sub-project 1 of 5 for the `archon-test` Next.js todo/task manager. The Foundation delivers a working, authenticated app where users can create lists and manage tasks. It establishes the scaffold, data model, and auth that all subsequent sub-projects build on.

**Sub-project roadmap:**
1. **Foundation** ← this spec
2. Core task management (labels, priorities, due dates, filters)
3. Collaboration (sharing lists, invitations, roles)
4. Real-time (live updates across tabs/users)
5. Search (full-text search, advanced filters)

## Stack

- Framework: Next.js 15 (App Router)
- Language: TypeScript
- Auth: Auth.js v5 with Prisma adapter
- Database: SQLite via Prisma
- Styling: Tailwind CSS + shadcn/ui
- Formatter: Biome
- Package manager: bun
- Testing: Jest + React Testing Library

---

## Section 1: Architecture & Scaffold

Scaffolded with `bunx create-next-app` (App Router, TypeScript, Tailwind). No `src/` directory.

### Directory Structure

```
app/
  (auth)/
    login/
      page.tsx         — email/password form + GitHub OAuth button
    register/
      page.tsx         — email/password registration form
  (app)/
    layout.tsx         — auth-gated shell with sidebar nav
    lists/
      page.tsx         — grid of user's lists
      [id]/
        page.tsx       — tasks within a list
        settings/
          page.tsx     — rename/delete list
  api/
    auth/
      [...nextauth]/
        route.ts       — Auth.js catch-all handler
actions/
  lists.ts             — Server Actions: createList, renameList, deleteList
  tasks.ts             — Server Actions: createTask, updateTask, deleteTask, toggleDone
components/
  sidebar.tsx          — list navigation + sign-out
  list-card.tsx        — list summary card (name, task count, due indicator)
  task-item.tsx        — single task row (checkbox, title, priority badge, due date)
  task-form.tsx        — create/edit task dialog
  list-form.tsx        — create list dialog
lib/
  auth.ts              — Auth.js config (providers, adapter, session strategy)
  db.ts                — Prisma client singleton
prisma/
  schema.prisma        — full data model
```

### UI Components (shadcn/ui)

Button, Input, Textarea, Dialog, Badge, Checkbox, Select

---

## Section 2: Data Model

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id          String       @id @default(cuid())
  name        String?
  email       String       @unique
  password    String?      // null for OAuth-only users
  image       String?
  createdAt   DateTime     @default(now())
  accounts    Account[]
  sessions    Session[]
  lists       List[]
  memberships ListMember[]
  tasks       Task[]
  labels      Label[]
}

// Required by Auth.js Prisma adapter
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

model List {
  id          String       @id @default(cuid())
  name        String
  description String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  ownerId     String
  owner       User         @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  members     ListMember[]
  tasks       Task[]
}

model ListMember {
  listId String
  userId String
  role   Role   @default(VIEWER)
  list   List   @relation(fields: [listId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([listId, userId])
}

model Task {
  id          String      @id @default(cuid())
  title       String
  description String?
  done        Boolean     @default(false)
  priority    Priority    @default(NONE)
  dueDate     DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  listId      String
  list        List        @relation(fields: [listId], references: [id], onDelete: Cascade)
  assigneeId  String?
  assignee    User?       @relation(fields: [assigneeId], references: [id])
  labels      TaskLabel[]
}

model Label {
  id     String      @id @default(cuid())
  name   String
  color  String      // hex color, e.g. "#ef4444"
  userId String
  user   User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks  TaskLabel[]
}

model TaskLabel {
  taskId  String
  labelId String
  task    Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  label   Label  @relation(fields: [labelId], references: [id], onDelete: Cascade)
  @@id([taskId, labelId])
}

enum Role {
  OWNER
  EDITOR
  VIEWER
}

enum Priority {
  HIGH
  MEDIUM
  LOW
  NONE
}
```

---

## Section 3: Auth

### Config (`lib/auth.ts`)

- **GitHub provider:** OAuth via `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`
- **Credentials provider:** email + bcrypt-hashed password on `User.password`
- **Prisma adapter:** sessions and accounts stored in SQLite
- **Session strategy:** database sessions (not JWT) — server-side revocable

### Pages

| Route | Purpose |
|-------|---------|
| `/login` | Email/password form + "Sign in with GitHub" button |
| `/register` | Email/password registration, creates `User` with hashed password |
| `/api/auth/[...nextauth]` | Auth.js OAuth callback handler |

### Auth Guards

- `(app)/layout.tsx` calls `auth()` server-side; redirects to `/login` if no session
- Every Server Action calls `auth()` at entry and throws `Error("Unauthorized")` if no session

### Required Env Vars

```
AUTH_SECRET=           # random string, required by Auth.js
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
DATABASE_URL=file:./dev.db
```

---

## Section 4: Core UI & Pages

### Layout

Two-column: fixed sidebar (left) + scrollable content (right).

**Sidebar:** user's list names (links to `/lists/[id]`), "New list" button at top, user avatar + sign-out at bottom. Active list highlighted.

### Pages

| Route | Content |
|-------|---------|
| `/` | Redirect to `/lists` |
| `/lists` | Card grid — list name, task count, count of tasks due within 3 days |
| `/lists/[id]` | Task list grouped: undone tasks first, done tasks below a divider. Sortable by priority / due date. "Add task" button opens Dialog. |
| `/lists/[id]/settings` | Rename list (Input + save), delete list (Button with confirmation Dialog) |

### Server Actions

**`actions/lists.ts`**
- `createList(name: string): Promise<List>`
- `renameList(id: string, name: string): Promise<List>`
- `deleteList(id: string): Promise<void>`

**`actions/tasks.ts`**
- `createTask(listId: string, data: TaskInput): Promise<Task>`
- `updateTask(id: string, data: Partial<TaskInput>): Promise<Task>`
- `deleteTask(id: string): Promise<void>`
- `toggleDone(id: string): Promise<Task>`

Where `TaskInput = { title: string; description?: string; priority?: Priority; dueDate?: Date }`.

No optimistic UI — Server Actions call `revalidatePath()` to trigger full revalidation. Optimistic updates arrive in sub-project 4.

---

## Section 5: Testing

### Setup

- `jest.config.ts` using `next/jest` transformer
- `lib/db.ts` exports Prisma client; tests inject a `DATABASE_URL=file:./test.db` override
- Integration test suites run `prisma migrate reset --force` in `beforeAll`

### Unit Tests

| File | What's tested |
|------|--------------|
| `actions/lists.test.ts` | createList/renameList/deleteList: validation, auth check, return shape |
| `actions/tasks.test.ts` | createTask/updateTask/deleteTask/toggleDone: validation, auth check |
| `lib/auth.test.ts` | Password hashing and verification |
| `components/task-item.test.tsx` | Renders title, priority badge, done checkbox correctly |
| `components/list-card.test.tsx` | Renders name, task count, due-soon indicator |

### Integration Tests

| File | What's tested |
|------|--------------|
| `actions/lists.integration.test.ts` | Full round-trip: create → rename → delete, verify DB state |
| `actions/tasks.integration.test.ts` | Full round-trip: create → toggle → update → delete |
| `auth.integration.test.ts` | Register with credentials, login, session retrieval |

### Out of Scope

- GitHub OAuth callback (requires live OAuth server — mock in unit tests only)
- Label management UI and task label assignment (sub-project 2)
- Real-time, sharing, search (later sub-projects)
- E2E browser tests (Playwright — future addition)

---

## Success Criteria

- `bun run dev` starts with no errors
- User can register with email/password, log in, and log out
- User can sign in with GitHub OAuth
- User can create, rename, and delete lists
- User can create, edit, mark done, and delete tasks within a list
- All unit and integration tests pass (`bun test`)
- `bun run build` succeeds with no TypeScript errors
