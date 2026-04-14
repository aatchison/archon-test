import { describe, it, expect } from "bun:test";
import { db } from "@/lib/db";

if (process.env.INTEGRATION_TEST) {
  describe("Version conflict integration", () => {
    it("throws ConflictError on stale version", async () => {
      const list = await db.list.create({
        data: { name: "Test List", ownerId: "test-user" },
      });
      const task = await db.task.create({
        data: { title: "Test Task", listId: list.id },
      });

      await db.task.update({
        where: { id: task.id },
        data: { title: "Updated by other user", version: { increment: 1 } },
      });

      const result = await db.task.updateMany({
        where: { id: task.id, version: 0 },
        data: { done: true, version: { increment: 1 } },
      });

      expect(result.count).toBe(0);

      await db.list.delete({ where: { id: list.id } });
    });
  });
}
