// @ts-nocheck
import { mock, describe, it, expect, beforeAll, afterAll } from "bun:test";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { execFileSync } from "child_process";

const TEST_DB_URL = "file:test.db";
process.env.DATABASE_URL = TEST_DB_URL;

mock.module("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "int-user-3" } }),
}));
mock.module("next/cache", () => ({ revalidatePath: () => {} }));

const adapter = new PrismaLibSql({ url: TEST_DB_URL });
const testDb = new PrismaClient({ adapter });

mock.module("@/lib/db", () => ({ db: testDb }));

const { createLabel, deleteLabel, addLabelToTask, removeLabelFromTask } =
  await import("./labels");

beforeAll(async () => {
  execFileSync("bunx", ["prisma", "migrate", "reset", "--force"], {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
  });
  await testDb.user.create({
    data: { id: "int-user-3", email: "int3@example.com" },
  });
  await testDb.list.create({
    data: { id: "int-list-3", name: "Label Test List", ownerId: "int-user-3" },
  });
  await testDb.task.create({
    data: { id: "int-task-3", title: "Label Test Task", listId: "int-list-3" },
  });
});

afterAll(async () => {
  // Prisma 7 with driver adapters doesn't expose $disconnect
});

describe("label integration", () => {
  it("creates a label, assigns to task, removes, and deletes", async () => {
    // Create label
    await createLabel({ name: "Urgent", color: "#ef4444" });
    const labels = await testDb.label.findMany({
      where: { userId: "int-user-3" },
    });
    expect(labels.length).toBe(1);
    expect(labels[0].name).toBe("Urgent");

    // Assign to task
    await addLabelToTask("int-task-3", labels[0].id);
    const taskLabels = await testDb.taskLabel.findMany({
      where: { taskId: "int-task-3" },
    });
    expect(taskLabels.length).toBe(1);

    // Remove from task
    await removeLabelFromTask("int-task-3", labels[0].id);
    const afterRemove = await testDb.taskLabel.findMany({
      where: { taskId: "int-task-3" },
    });
    expect(afterRemove.length).toBe(0);

    // Delete label
    await deleteLabel(labels[0].id);
    expect(
      await testDb.label.findMany({ where: { userId: "int-user-3" } }),
    ).toHaveLength(0);
  });
});
