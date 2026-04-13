# Todo App Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a Next.js 15 todo app with Auth.js v5 (credentials + GitHub OAuth), Prisma/SQLite, and core list/task CRUD — the foundation for 4 subsequent sub-projects.

**Architecture:** App Router with route groups: `(auth)` for login/register, `(app)` for the auth-gated shell. Auth.js v5 with Prisma adapter stores sessions in SQLite. All mutations use Server Actions + `revalidatePath()`. No optimistic UI in this sub-project.

**Tech Stack:** Next.js 15, TypeScript, Auth.js v5 (`next-auth@beta`), `@auth/prisma-adapter`, Prisma 6, SQLite, Tailwind CSS, Biome, bun, Jest, React Testing Library, `bcryptjs`

> 🤖 = suitable for `opencode run -m vllm-31b/google/gemma-4-31B-it`  |  🧠 = needs Claude (auth logic, test design, judgment)

---

## File Map

| File | Responsibility |
|------|---------------|
| `prisma/schema.prisma` | Full data model for all 5 sub-projects |
| `lib/db.ts` | Prisma client singleton |
| `lib/auth.ts` | Auth.js v5 config: providers, adapter, callbacks |
| `lib/password.ts` | bcrypt hash + verify |
| `lib/session.ts` | `getCurrentUser()` typed server helper |
| `types/next-auth.d.ts` | Session type augmentation (adds `user.id`) |
| `app/layout.tsx` | Root HTML shell |
| `app/page.tsx` | Root → `/lists` redirect |
| `app/(auth)/login/page.tsx` | Login form: credentials + GitHub |
| `app/(auth)/register/page.tsx` | Register form |
| `app/api/auth/[...nextauth]/route.ts` | Auth.js catch-all handler |
| `actions/auth.ts` | `register()` Server Action |
| `actions/lists.ts` | `createList`, `renameList`, `deleteList` |
| `actions/tasks.ts` | `createTask`, `updateTask`, `deleteTask`, `toggleDone` |
| `app/(app)/layout.tsx` | Auth guard + sidebar shell |
| `components/sidebar.tsx` | List nav + sign-out |
| `app/(app)/lists/page.tsx` | Lists grid |
| `components/list-card.tsx` | List summary card |
| `components/list-form.tsx` | Create list inline form |
| `app/(app)/lists/[id]/page.tsx` | Tasks in a list |
| `app/(app)/lists/[id]/settings/page.tsx` | Rename / delete list |
| `components/task-item.tsx` | Task row (checkbox, title, priority, due) |
| `components/task-form.tsx` | Add task inline form |
| `jest.config.ts` | Jest + next/jest config |
| `jest.integration.config.ts` | Jest config for integration tests (node env) |
| `jest.setup.ts` | RTL matchers |
| `lib/password.test.ts` | Unit: bcrypt helpers |
| `actions/lists.test.ts` | Unit: list actions (Prisma mocked) |
| `actions/tasks.test.ts` | Unit: task actions (Prisma mocked) |
| `components/list-card.test.tsx` | Render: ListCard |
| `components/task-item.test.tsx` | Render: TaskItem |
| `actions/lists.integration.test.ts` | Integration: list CRUD vs real test.db |
| `actions/tasks.integration.test.ts` | Integration: task CRUD vs real test.db |

---

### Task 1: Scaffold Next.js project 🤖

**Files:** `package.json`, `next.config.ts`, `tsconfig.json`, `biome.json`, `.env.example`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`

- [ ] **Step 1: Run create-next-app**

```bash
cd /home/aatchison/.archon/workspaces/archon-test
bunx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --no-eslint --yes
```

Expected: Next.js project files created.

- [ ] **Step 2: Replace app/page.tsx**

```tsx
import { redirect } from "next/navigation";
export default function Home() {
  redirect("/lists");
}
```

- [ ] **Step 3: Replace app/layout.tsx**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Archon Todo",
  description: "Task manager built with Archon workflows",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Install and configure Biome**

```bash
bun add -D @biomejs/biome
bunx biome init
```

Replace `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 },
  "javascript": { "formatter": { "quoteStyle": "double", "semicolons": "always" } }
}
```

Add to `package.json` scripts: `"lint": "biome check .", "format": "biome format --write ."`

- [ ] **Step 5: Create .env.example**

```
AUTH_SECRET=your-random-secret-here
AUTH_GITHUB_ID=your-github-oauth-app-id
AUTH_GITHUB_SECRET=your-github-oauth-app-secret
DATABASE_URL=file:./dev.db
```

- [ ] **Step 6: Verify dev server starts**

```bash
bun run dev &
sleep 3 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
kill %1
```

Expected: `200` or `307`.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: scaffold Next.js 15 app with Biome"
```

---

### Task 2: Prisma schema + migration 🤖

**Files:** `prisma/schema.prisma`, `lib/db.ts`

- [ ] **Step 1: Install and init Prisma**

```bash
bun add prisma @prisma/client
bunx prisma init --datasource-provider sqlite
```

- [ ] **Step 2: Write schema.prisma**

Replace `prisma/schema.prisma`:

```prisma
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
  password    String?
  image       String?
  createdAt   DateTime     @default(now())
  accounts    Account[]
  sessions    Session[]
  lists       List[]
  memberships ListMember[]
  tasks       Task[]
  labels      Label[]
}

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
  color  String
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

enum Role     { OWNER EDITOR VIEWER }
enum Priority { HIGH MEDIUM LOW NONE }
```

- [ ] **Step 3: Run migration**

```bash
bunx prisma migrate dev --name init
```

Expected: `dev.db` created, migration applied, Prisma client generated.

- [ ] **Step 4: Create lib/db.ts**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 5: Commit**

```bash
git add prisma/ lib/db.ts .env
git commit -m "feat: add Prisma schema and SQLite migration"
```

---

### Task 3: Jest configuration 🤖

**Files:** `jest.config.ts`, `jest.integration.config.ts`, `jest.setup.ts`

- [ ] **Step 1: Install Jest dependencies**

```bash
bun add -D jest @types/jest jest-environment-jsdom \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event ts-jest
```

- [ ] **Step 2: Create jest.config.ts**

```ts
import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterFramework: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "integration.test"],
};

export default createJestConfig(config);
```

- [ ] **Step 3: Create jest.integration.config.ts**

```ts
import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  testMatch: ["**/*.integration.test.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
};

export default config;
```

- [ ] **Step 4: Create jest.setup.ts**

```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 5: Add scripts to package.json**

```json
"test": "jest",
"test:watch": "jest --watch",
"test:integration": "jest --config jest.integration.config.ts"
```

- [ ] **Step 6: Smoke test**

```bash
echo 'describe("smoke",()=>{it("ok",()=>expect(1).toBe(1))})' > /tmp/smoke.test.ts
bun test /tmp/smoke.test.ts
```

Expected: `PASS` — 1 test.

- [ ] **Step 7: Commit**

```bash
git add jest.config.ts jest.integration.config.ts jest.setup.ts package.json
git commit -m "feat: configure Jest with RTL and integration test config"
```

---

### Task 4: Auth.js configuration 🧠

**Files:** `lib/auth.ts`, `lib/password.ts`, `lib/session.ts`, `types/next-auth.d.ts`, `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Install auth packages**

```bash
bun add next-auth@beta @auth/prisma-adapter bcryptjs
bun add -D @types/bcryptjs
```

- [ ] **Step 2: Create lib/password.ts**

```ts
import bcrypt from "bcryptjs";

const ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 3: Create lib/auth.ts**

```ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { db } from "./db";
import { verifyPassword } from "./password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  providers: [
    GitHub,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user?.password) return null;
        const valid = await verifyPassword(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;
        return user;
      },
    }),
  ],
  pages: { signIn: "/login" },
});
```

- [ ] **Step 4: Create types/next-auth.d.ts**

```ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
```

- [ ] **Step 5: Create app/api/auth/[...nextauth]/route.ts**

```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 6: Create lib/session.ts**

```ts
import { redirect } from "next/navigation";
import { auth } from "./auth";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user as {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}
```

- [ ] **Step 7: Populate .env**

```bash
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> .env
echo "AUTH_GITHUB_ID=placeholder" >> .env
echo "AUTH_GITHUB_SECRET=placeholder" >> .env
echo "DATABASE_URL=file:./dev.db" >> .env
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add lib/auth.ts lib/password.ts lib/session.ts types/ app/api/
git commit -m "feat: add Auth.js v5 with Prisma adapter (credentials + GitHub OAuth)"
```

---

### Task 5: Password unit tests 🧠

**Files:** `lib/password.test.ts`

- [ ] **Step 1: Write tests**

Create `lib/password.test.ts`:

```ts
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword", () => {
  it("returns a bcrypt hash", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash).not.toBe("secret123");
  });

  it("produces different hashes for same input (salting)", async () => {
    const a = await hashPassword("secret123");
    const b = await hashPassword("secret123");
    expect(a).not.toBe(b);
  });
});

describe("verifyPassword", () => {
  it("returns true for correct password", async () => {
    const hash = await hashPassword("correct");
    expect(await verifyPassword("correct", hash)).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const hash = await hashPassword("correct");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
bun test lib/password.test.ts
```

Expected: `PASS` — 4 tests.

- [ ] **Step 3: Commit**

```bash
git add lib/password.test.ts
git commit -m "test: add password helper unit tests"
```

---

### Task 6: Register + Login pages 🧠

**Files:** `actions/auth.ts`, `app/(auth)/register/page.tsx`, `app/(auth)/login/page.tsx`

- [ ] **Step 1: Create actions/auth.ts**

```ts
"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export async function register(formData: FormData) {
  const name = formData.get("name") as string | null;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email?.trim() || !password) throw new Error("Email and password are required");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  const existing = await db.user.findUnique({ where: { email: email.trim() } });
  if (existing) throw new Error("Email already in use");

  await db.user.create({
    data: {
      name: name?.trim() || null,
      email: email.trim(),
      password: await hashPassword(password),
    },
  });

  redirect("/login");
}
```

- [ ] **Step 2: Create app/(auth)/register/page.tsx**

```tsx
import Link from "next/link";
import { register } from "@/actions/auth";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-semibold text-center">Create account</h1>
        <form action={register} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name (optional)</label>
            <input id="name" name="name" type="text"
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input id="email" name="email" type="email" required
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input id="password" name="password" type="password" required minLength={8}
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700">
            Create account
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create app/(auth)/login/page.tsx**

```tsx
import Link from "next/link";
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-semibold text-center">Sign in</h1>
        <form
          action={async (formData: FormData) => {
            "use server";
            await signIn("credentials", {
              email: formData.get("email"),
              password: formData.get("password"),
              redirectTo: "/lists",
            });
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input id="email" name="email" type="email" required
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input id="password" name="password" type="password" required
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700">
            Sign in
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/lists" });
          }}
        >
          <button type="submit"
            className="w-full bg-gray-900 text-white py-2 rounded-md text-sm font-medium hover:bg-gray-800 mt-2">
            Sign in with GitHub
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-blue-600 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add actions/auth.ts "app/(auth)/"
git commit -m "feat: add register and login pages"
```

---

### Task 7: App shell + sidebar 🤖

**Files:** `app/(app)/layout.tsx`, `components/sidebar.tsx`

- [ ] **Step 1: Create app/(app)/layout.tsx**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const lists = await db.list.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar lists={lists} user={session.user} />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Create components/sidebar.tsx**

```tsx
import Link from "next/link";
import { signOut } from "@/lib/auth";

type Props = {
  lists: { id: string; name: string }[];
  user: { name?: string | null; email?: string | null };
};

export function Sidebar({ lists, user }: Props) {
  return (
    <aside className="w-64 bg-white border-r flex flex-col h-screen flex-shrink-0">
      <div className="p-4 border-b font-semibold text-gray-900">Archon Todo</div>
      <nav className="flex-1 overflow-auto p-2">
        <Link href="/lists"
          className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 font-medium mb-1">
          All lists
        </Link>
        <div className="border-t my-2" />
        {lists.map((list) => (
          <Link key={list.id} href={`/lists/${list.id}`}
            className="block px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 truncate">
            {list.name}
          </Link>
        ))}
        {lists.length === 0 && (
          <p className="text-xs text-gray-400 px-3 py-2">No lists yet</p>
        )}
      </nav>
      <div className="p-4 border-t flex items-center justify-between">
        <p className="text-sm text-gray-700 truncate">{user.name ?? user.email}</p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="text-xs text-gray-400 hover:text-gray-900">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/layout.tsx" components/sidebar.tsx
git commit -m "feat: add auth-gated app shell with sidebar"
```

---

### Task 8: List Server Actions + unit tests 🧠

**Files:** `actions/lists.ts`, `actions/lists.test.ts`

- [ ] **Step 1: Write failing unit tests**

Create `actions/lists.test.ts`:

```ts
jest.mock("@/lib/auth", () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));
jest.mock("@/lib/db", () => ({
  db: {
    list: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { createList, renameList, deleteList } from "./lists";
import { db } from "@/lib/db";

describe("createList", () => {
  it("throws if name is empty", async () => {
    await expect(createList("")).rejects.toThrow("Name is required");
    await expect(createList("   ")).rejects.toThrow("Name is required");
  });

  it("creates and returns the list", async () => {
    const mock = { id: "l1", name: "Work", ownerId: "user-1" };
    (db.list.create as jest.Mock).mockResolvedValue(mock);
    const result = await createList("Work");
    expect(result).toEqual(mock);
    expect(db.list.create).toHaveBeenCalledWith({
      data: { name: "Work", ownerId: "user-1" },
    });
  });
});

describe("renameList", () => {
  it("throws Not found if list belongs to another user", async () => {
    (db.list.findUnique as jest.Mock).mockResolvedValue({ id: "l1", ownerId: "other" });
    await expect(renameList("l1", "New")).rejects.toThrow("Not found");
  });

  it("renames the list", async () => {
    (db.list.findUnique as jest.Mock).mockResolvedValue({ id: "l1", ownerId: "user-1" });
    (db.list.update as jest.Mock).mockResolvedValue({ id: "l1", name: "New", ownerId: "user-1" });
    const result = await renameList("l1", "New");
    expect(result.name).toBe("New");
  });
});

describe("deleteList", () => {
  it("throws Not found if list belongs to another user", async () => {
    (db.list.findUnique as jest.Mock).mockResolvedValue({ id: "l1", ownerId: "other" });
    await expect(deleteList("l1")).rejects.toThrow("Not found");
  });

  it("deletes the list", async () => {
    (db.list.findUnique as jest.Mock).mockResolvedValue({ id: "l1", ownerId: "user-1" });
    (db.list.delete as jest.Mock).mockResolvedValue({});
    await deleteList("l1");
    expect(db.list.delete).toHaveBeenCalledWith({ where: { id: "l1" } });
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (module not found)**

```bash
bun test actions/lists.test.ts 2>&1 | head -5
```

Expected: `FAIL` — `Cannot find module './lists'`.

- [ ] **Step 3: Create actions/lists.ts**

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

export async function createList(name: string) {
  const session = await getSession();
  if (!name.trim()) throw new Error("Name is required");
  const list = await db.list.create({
    data: { name: name.trim(), ownerId: session.user.id! },
  });
  revalidatePath("/lists");
  return list;
}

export async function renameList(id: string, name: string) {
  const session = await getSession();
  if (!name.trim()) throw new Error("Name is required");
  const list = await db.list.findUnique({ where: { id } });
  if (!list || list.ownerId !== session.user.id) throw new Error("Not found");
  const updated = await db.list.update({ where: { id }, data: { name: name.trim() } });
  revalidatePath("/lists");
  revalidatePath(`/lists/${id}`);
  return updated;
}

export async function deleteList(id: string) {
  const session = await getSession();
  const list = await db.list.findUnique({ where: { id } });
  if (!list || list.ownerId !== session.user.id) throw new Error("Not found");
  await db.list.delete({ where: { id } });
  revalidatePath("/lists");
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
bun test actions/lists.test.ts
```

Expected: `PASS` — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add actions/lists.ts actions/lists.test.ts
git commit -m "feat: add list Server Actions with unit tests"
```

---

### Task 9: Lists UI 🤖

**Files:** `components/list-card.tsx`, `components/list-form.tsx`, `app/(app)/lists/page.tsx`

- [ ] **Step 1: Create components/list-card.tsx**

```tsx
import Link from "next/link";

type Props = { id: string; name: string; taskCount: number; dueSoonCount: number };

export function ListCard({ id, name, taskCount, dueSoonCount }: Props) {
  return (
    <Link href={`/lists/${id}`}
      className="block p-5 bg-white rounded-lg border hover:shadow-md transition-shadow">
      <h2 className="font-medium text-gray-900 truncate mb-2">{name}</h2>
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>{taskCount} task{taskCount !== 1 ? "s" : ""}</span>
        {dueSoonCount > 0 && (
          <span className="text-amber-600 font-medium">{dueSoonCount} due soon</span>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Create components/list-form.tsx**

```tsx
"use client";

import { useState } from "react";
import { createList } from "@/actions/lists";

export function ListForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await createList(name.trim());
    setName("");
    setOpen(false);
    setLoading(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
        New list
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
        placeholder="List name"
        className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <button type="submit" disabled={loading || !name.trim()}
        className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm disabled:opacity-50">
        {loading ? "Creating…" : "Create"}
      </button>
      <button type="button" onClick={() => setOpen(false)}
        className="text-sm text-gray-500 hover:text-gray-900">Cancel</button>
    </form>
  );
}
```

- [ ] **Step 3: Create app/(app)/lists/page.tsx**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ListCard } from "@/components/list-card";
import { ListForm } from "@/components/list-form";

export default async function ListsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const lists = await db.list.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { tasks: { where: { done: false } } } },
      tasks: { where: { done: false, dueDate: { lte: threeDaysFromNow } }, select: { id: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">My Lists</h1>
        <ListForm />
      </div>
      {lists.length === 0 ? (
        <p className="text-gray-400 text-sm">No lists yet. Create one to get started.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <ListCard key={list.id} id={list.id} name={list.name}
              taskCount={list._count.tasks} dueSoonCount={list.tasks.length} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/list-card.tsx components/list-form.tsx "app/(app)/lists/page.tsx"
git commit -m "feat: add lists page with ListCard and ListForm components"
```

---

### Task 10: ListCard unit tests 🧠

**Files:** `components/list-card.test.tsx`

- [ ] **Step 1: Write tests**

Create `components/list-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { ListCard } from "./list-card";

describe("ListCard", () => {
  it("renders list name", () => {
    render(<ListCard id="1" name="Shopping" taskCount={3} dueSoonCount={0} />);
    expect(screen.getByText("Shopping")).toBeInTheDocument();
  });

  it("uses plural tasks for count > 1", () => {
    render(<ListCard id="1" name="Work" taskCount={5} dueSoonCount={0} />);
    expect(screen.getByText("5 tasks")).toBeInTheDocument();
  });

  it("uses singular task for count of 1", () => {
    render(<ListCard id="1" name="Work" taskCount={1} dueSoonCount={0} />);
    expect(screen.getByText("1 task")).toBeInTheDocument();
  });

  it("shows due soon count when > 0", () => {
    render(<ListCard id="1" name="Work" taskCount={5} dueSoonCount={2} />);
    expect(screen.getByText("2 due soon")).toBeInTheDocument();
  });

  it("hides due soon text when count is 0", () => {
    render(<ListCard id="1" name="Work" taskCount={3} dueSoonCount={0} />);
    expect(screen.queryByText(/due soon/)).not.toBeInTheDocument();
  });

  it("links to the correct list URL", () => {
    render(<ListCard id="abc123" name="Work" taskCount={0} dueSoonCount={0} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/lists/abc123");
  });
});
```

- [ ] **Step 2: Run tests**

```bash
bun test components/list-card.test.tsx
```

Expected: `PASS` — 6 tests.

- [ ] **Step 3: Commit**

```bash
git add components/list-card.test.tsx
git commit -m "test: add ListCard unit tests"
```

---

### Task 11: Task Server Actions + unit tests 🧠

**Files:** `actions/tasks.ts`, `actions/tasks.test.ts`

- [ ] **Step 1: Write failing unit tests**

Create `actions/tasks.test.ts`:

```ts
jest.mock("@/lib/auth", () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));
jest.mock("@/lib/db", () => ({
  db: {
    list: { findUnique: jest.fn() },
    task: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { createTask, updateTask, deleteTask, toggleDone } from "./tasks";
import { db } from "@/lib/db";

const mockList = { id: "l1", ownerId: "user-1" };
const mockTask = { id: "t1", title: "Test", done: false, listId: "l1", list: mockList };

describe("createTask", () => {
  it("throws if title is empty", async () => {
    (db.list.findUnique as jest.Mock).mockResolvedValue(mockList);
    await expect(createTask("l1", { title: "" })).rejects.toThrow("Title is required");
  });

  it("throws Not found if list belongs to another user", async () => {
    (db.list.findUnique as jest.Mock).mockResolvedValue({ id: "l1", ownerId: "other" });
    await expect(createTask("l1", { title: "hi" })).rejects.toThrow("Not found");
  });

  it("creates and returns the task", async () => {
    (db.list.findUnique as jest.Mock).mockResolvedValue(mockList);
    (db.task.create as jest.Mock).mockResolvedValue(mockTask);
    const result = await createTask("l1", { title: "Test" });
    expect(result.title).toBe("Test");
  });
});

describe("toggleDone", () => {
  it("flips done false → true", async () => {
    (db.task.findUnique as jest.Mock).mockResolvedValue({ ...mockTask, done: false });
    (db.task.update as jest.Mock).mockResolvedValue({ ...mockTask, done: true });
    const result = await toggleDone("t1");
    expect(db.task.update).toHaveBeenCalledWith({ where: { id: "t1" }, data: { done: true } });
    expect(result.done).toBe(true);
  });

  it("flips done true → false", async () => {
    (db.task.findUnique as jest.Mock).mockResolvedValue({ ...mockTask, done: true });
    (db.task.update as jest.Mock).mockResolvedValue({ ...mockTask, done: false });
    expect((await toggleDone("t1")).done).toBe(false);
  });
});

describe("deleteTask", () => {
  it("throws Not found if task belongs to another user's list", async () => {
    (db.task.findUnique as jest.Mock).mockResolvedValue(
      { ...mockTask, list: { id: "l1", ownerId: "other" } }
    );
    await expect(deleteTask("t1")).rejects.toThrow("Not found");
  });

  it("deletes the task", async () => {
    (db.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
    (db.task.delete as jest.Mock).mockResolvedValue({});
    await deleteTask("t1");
    expect(db.task.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
bun test actions/tasks.test.ts 2>&1 | head -5
```

- [ ] **Step 3: Create actions/tasks.ts**

```ts
"use server";

import { revalidatePath } from "next/cache";
import type { Priority } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}

type TaskInput = {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: Date;
};

export async function createTask(listId: string, data: TaskInput) {
  const session = await getSession();
  if (!data.title.trim()) throw new Error("Title is required");
  const list = await db.list.findUnique({ where: { id: listId } });
  if (!list || list.ownerId !== session.user.id) throw new Error("Not found");
  const task = await db.task.create({
    data: { ...data, title: data.title.trim(), listId },
  });
  revalidatePath(`/lists/${listId}`);
  return task;
}

export async function updateTask(id: string, data: Partial<TaskInput>) {
  const session = await getSession();
  const task = await db.task.findUnique({ where: { id }, include: { list: true } });
  if (!task || task.list.ownerId !== session.user.id) throw new Error("Not found");
  const updated = await db.task.update({ where: { id }, data });
  revalidatePath(`/lists/${task.listId}`);
  return updated;
}

export async function deleteTask(id: string) {
  const session = await getSession();
  const task = await db.task.findUnique({ where: { id }, include: { list: true } });
  if (!task || task.list.ownerId !== session.user.id) throw new Error("Not found");
  await db.task.delete({ where: { id } });
  revalidatePath(`/lists/${task.listId}`);
}

export async function toggleDone(id: string) {
  const session = await getSession();
  const task = await db.task.findUnique({ where: { id }, include: { list: true } });
  if (!task || task.list.ownerId !== session.user.id) throw new Error("Not found");
  const updated = await db.task.update({ where: { id }, data: { done: !task.done } });
  revalidatePath(`/lists/${task.listId}`);
  return updated;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
bun test actions/tasks.test.ts
```

Expected: `PASS` — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add actions/tasks.ts actions/tasks.test.ts
git commit -m "feat: add task Server Actions with unit tests"
```

---

### Task 12: Task list page + components 🤖

**Files:** `components/task-item.tsx`, `components/task-form.tsx`, `app/(app)/lists/[id]/page.tsx`, `app/(app)/lists/[id]/settings/page.tsx`

- [ ] **Step 1: Create components/task-item.tsx**

```tsx
"use client";

import type { Task, Priority } from "@prisma/client";
import { toggleDone, deleteTask } from "@/actions/tasks";

const priorityColors: Record<Priority, string> = {
  HIGH: "text-red-600",
  MEDIUM: "text-amber-600",
  LOW: "text-blue-600",
  NONE: "text-transparent",
};

export function TaskItem({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-gray-50 group">
      <button
        onClick={() => toggleDone(task.id)}
        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-white text-xs ${
          task.done ? "bg-blue-600 border-blue-600" : "border-gray-300"
        }`}
        aria-label={task.done ? "Mark undone" : "Mark done"}
      >
        {task.done && "✓"}
      </button>
      <span className={`flex-1 text-sm ${task.done ? "line-through text-gray-400" : "text-gray-900"}`}>
        {task.title}
      </span>
      {task.priority !== "NONE" && (
        <span className={`text-xs font-medium ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
      )}
      {task.dueDate && (
        <span className="text-xs text-gray-400">
          {new Date(task.dueDate).toLocaleDateString()}
        </span>
      )}
      <button
        onClick={() => deleteTask(task.id)}
        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs ml-1"
        aria-label="Delete task"
      >
        ✕
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create components/task-form.tsx**

```tsx
"use client";

import { useState } from "react";
import { createTask } from "@/actions/tasks";

export function TaskForm({ listId }: { listId: string }) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    await createTask(listId, { title: title.trim() });
    setTitle("");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task…"
        className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <button type="submit" disabled={!title.trim() || loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
        {loading ? "Adding…" : "Add"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create app/(app)/lists/[id]/page.tsx**

```tsx
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { TaskItem } from "@/components/task-item";
import { TaskForm } from "@/components/task-form";

export default async function ListPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const list = await db.list.findUnique({
    where: { id: params.id },
    include: {
      tasks: { orderBy: [{ done: "asc" }, { priority: "desc" }, { createdAt: "asc" }] },
    },
  });

  if (!list || list.ownerId !== session.user.id) notFound();

  const pending = list.tasks.filter((t) => !t.done);
  const done = list.tasks.filter((t) => t.done);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{list.name}</h1>
        <Link href={`/lists/${list.id}/settings`}
          className="text-sm text-gray-400 hover:text-gray-900">Settings</Link>
      </div>
      <TaskForm listId={list.id} />
      <div className="mt-4 space-y-1">
        {pending.map((task) => <TaskItem key={task.id} task={task} />)}
        {done.length > 0 && (
          <>
            <div className="border-t my-4" />
            <p className="text-xs text-gray-400 mb-2 px-3">Completed</p>
            {done.map((task) => <TaskItem key={task.id} task={task} />)}
          </>
        )}
        {list.tasks.length === 0 && (
          <p className="text-gray-400 text-sm mt-4 px-3">No tasks yet.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create app/(app)/lists/[id]/settings/page.tsx**

```tsx
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { renameList, deleteList } from "@/actions/lists";
import Link from "next/link";

export default async function ListSettingsPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const list = await db.list.findUnique({ where: { id: params.id } });
  if (!list || list.ownerId !== session.user.id) notFound();

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/lists/${list.id}`} className="text-sm text-gray-400 hover:text-gray-900">← Back</Link>
        <h1 className="text-xl font-semibold">List settings</h1>
      </div>
      <div className="bg-white rounded-lg border divide-y">
        <div className="p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Rename list</h2>
          <form
            action={async (formData: FormData) => {
              "use server";
              await renameList(list.id, formData.get("name") as string);
              redirect(`/lists/${list.id}`);
            }}
            className="flex gap-2"
          >
            <input name="name" defaultValue={list.name}
              className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
              Save
            </button>
          </form>
        </div>
        <div className="p-6">
          <h2 className="text-sm font-medium text-red-600 mb-3">Delete list</h2>
          <p className="text-sm text-gray-500 mb-3">Permanently deletes this list and all its tasks.</p>
          <form
            action={async () => {
              "use server";
              await deleteList(list.id);
              redirect("/lists");
            }}
          >
            <button type="submit"
              className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700">
              Delete list
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/task-item.tsx components/task-form.tsx "app/(app)/lists/"
git commit -m "feat: add task list page, settings page, TaskItem, and TaskForm"
```

---

### Task 13: TaskItem unit tests 🧠

**Files:** `components/task-item.test.tsx`

- [ ] **Step 1: Write tests**

Create `components/task-item.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { TaskItem } from "./task-item";
import type { Task } from "@prisma/client";

jest.mock("@/actions/tasks", () => ({
  toggleDone: jest.fn(),
  deleteTask: jest.fn(),
}));

const base: Task = {
  id: "t1", title: "Write tests", description: null, done: false,
  priority: "NONE", dueDate: null, createdAt: new Date(), updatedAt: new Date(),
  listId: "l1", assigneeId: null,
};

describe("TaskItem", () => {
  it("renders the task title", () => {
    render(<TaskItem task={base} />);
    expect(screen.getByText("Write tests")).toBeInTheDocument();
  });

  it("shows HIGH priority badge", () => {
    render(<TaskItem task={{ ...base, priority: "HIGH" }} />);
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("does not render NONE priority as text", () => {
    render(<TaskItem task={base} />);
    expect(screen.queryByText("NONE")).not.toBeInTheDocument();
  });

  it("applies line-through when done", () => {
    render(<TaskItem task={{ ...base, done: true }} />);
    expect(screen.getByText("Write tests").className).toContain("line-through");
  });

  it("renders delete button", () => {
    render(<TaskItem task={base} />);
    expect(screen.getByLabelText("Delete task")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
bun test components/task-item.test.tsx
```

Expected: `PASS` — 5 tests.

- [ ] **Step 3: Commit**

```bash
git add components/task-item.test.tsx
git commit -m "test: add TaskItem unit tests"
```

---

### Task 14: Integration tests 🧠

**Files:** `actions/lists.integration.test.ts`, `actions/tasks.integration.test.ts`

- [ ] **Step 1: Create actions/lists.integration.test.ts**

```ts
process.env.DATABASE_URL = "file:./test.db";

import { PrismaClient } from "@prisma/client";
import { spawnSync } from "child_process";

const testDb = new PrismaClient({ datasources: { db: { url: "file:./test.db" } } });

jest.mock("@/lib/auth", () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: "int-user-1" } }),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

beforeAll(async () => {
  spawnSync("bunx", ["prisma", "migrate", "reset", "--force", "--skip-seed"], {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
  });
  await testDb.user.create({ data: { id: "int-user-1", email: "int@example.com" } });
});

afterAll(() => testDb.$disconnect());

describe("list CRUD integration", () => {
  it("creates, renames, and deletes a list", async () => {
    const { createList, renameList, deleteList } = await import("./lists");

    const list = await createList("Shopping");
    expect(list.name).toBe("Shopping");
    expect(list.ownerId).toBe("int-user-1");

    const renamed = await renameList(list.id, "Groceries");
    expect(renamed.name).toBe("Groceries");

    const fromDb = await testDb.list.findUnique({ where: { id: list.id } });
    expect(fromDb?.name).toBe("Groceries");

    await deleteList(list.id);
    expect(await testDb.list.findUnique({ where: { id: list.id } })).toBeNull();
  });
});
```

- [ ] **Step 2: Create actions/tasks.integration.test.ts**

```ts
process.env.DATABASE_URL = "file:./test.db";

import { PrismaClient } from "@prisma/client";
import { spawnSync } from "child_process";

const testDb = new PrismaClient({ datasources: { db: { url: "file:./test.db" } } });

jest.mock("@/lib/auth", () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: "int-user-2" } }),
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

beforeAll(async () => {
  spawnSync("bunx", ["prisma", "migrate", "reset", "--force", "--skip-seed"], {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
  });
  await testDb.user.create({ data: { id: "int-user-2", email: "int2@example.com" } });
  await testDb.list.create({ data: { id: "int-list-1", name: "Test List", ownerId: "int-user-2" } });
});

afterAll(() => testDb.$disconnect());

describe("task CRUD integration", () => {
  it("creates, toggles, updates, and deletes a task", async () => {
    const { createTask, toggleDone, updateTask, deleteTask } = await import("./tasks");

    const task = await createTask("int-list-1", { title: "Buy milk" });
    expect(task.title).toBe("Buy milk");
    expect(task.done).toBe(false);

    const toggled = await toggleDone(task.id);
    expect(toggled.done).toBe(true);

    const updated = await updateTask(task.id, { title: "Buy oat milk" });
    expect(updated.title).toBe("Buy oat milk");

    await deleteTask(task.id);
    expect(await testDb.task.findUnique({ where: { id: task.id } })).toBeNull();
  });
});
```

- [ ] **Step 3: Run integration tests**

```bash
bun run test:integration
```

Expected: `PASS` — 2 test suites, 2 tests.

- [ ] **Step 4: Commit**

```bash
git add actions/*.integration.test.ts
git commit -m "test: add list and task integration tests against real SQLite DB"
```

---

### Task 15: Build verification + PR 🧠

- [ ] **Step 1: Run all unit tests**

```bash
bun test
```

Expected: All test files pass (password, lists, tasks, list-card, task-item).

- [ ] **Step 2: TypeScript check**

```bash
bunx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Production build**

```bash
bun run build
```

Expected: Build completes. Ignore any `AUTH_GITHUB_ID` env var warnings — runtime-only.

- [ ] **Step 4: Push and open PR**

```bash
git push -u origin feat/todo-app-foundation
gh pr create \
  --title "feat: todo app foundation (sub-project 1 of 5)" \
  --base main \
  --body "Implements the Next.js todo app foundation.

- Scaffold: Next.js 15 App Router, Biome, bun
- Auth: Auth.js v5 with credentials + GitHub OAuth, Prisma adapter, database sessions
- Schema: full Prisma/SQLite model for all 5 sub-projects (User, List, Task, Label, ListMember)
- CRUD: lists and tasks via Server Actions + revalidatePath
- UI: sidebar shell, lists grid, task list, settings page
- Tests: unit tests for actions and components, integration tests against real test.db

Closes #11"
```
